import {browserConfig,launchBrowser,closeBrowser} from '../../../tools/cocos-browser-config.mjs';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const test=await browserConfig('world-feedback');await test.assertDatabase();
const out=test.directory,checks=[],captures=[],errors=[],fixtures=[];
const browser=await launchBrowser(chromium,{headless:true});let page;
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
async function wait(fn,label='state',ms=15000){for(const start=Date.now();Date.now()-start<ms;){const s=await read();if(fn(s))return s;await page.waitForTimeout(50);}throw Error(label+': '+JSON.stringify(await read()));}
async function click(id){const s=await wait(s=>s.controls.some(c=>c.id===id&&!c.disabled),id),c=s.controls.find(c=>c.id===id);await page.mouse.click(c.x,c.y);}
async function load(){await page.goto(test.baseURL);await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).loaded);await click('start');await wait(s=>s.mode==='world'&&!s.busy&&s.connection==='ready');await page.waitForTimeout(150);}
function screen(s,x,y){return {x:s.camera.width/2+s.camera.x+x*s.camera.zoom,y:s.camera.height/2-s.camera.y+y*s.camera.zoom};}
async function resourceClick(touch=false){const p=screen(await read(),328,342);if(touch)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);}
async function fixture(patch,note){
 const id=(await read()).saveId;await page.goto('about:blank');await page.waitForTimeout(100);await test.assertDatabase();
 execFileSync('backend/.venv/bin/python',['-c',`import sqlite3,json,sys,time
p,key,patch=sys.argv[1:];sys.path.insert(0,'clients/cocos/tools');from test_guard import assert_fixture;assert_fixture(p)
c=sqlite3.connect(p);s=json.loads(c.execute('select state from players where id=?',(key,)).fetchone()[0]);s.update(json.loads(patch));s['world_clock'].update(updated_at=time.time(),running_until=0);s['revision']+=1;c.execute('update players set state=? where id=?',(json.dumps(s),key));c.commit();c.close()`,test.database,id,JSON.stringify(patch)]);
 fixtures.push(note);await load();
}
const overlaps=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
async function shot(name){
 const s=await read(),f=s.feedback?{...s.feedback,x:s.feedback.x-s.feedback.w/2,y:s.feedback.y-s.feedback.h/2}:null;
 if(f){
  assert(f.w<=340&&f.h<100,'feedback sizes to its content');assert(f.x>=0&&f.y>=0&&f.x+f.w<=s.camera.width&&f.y+f.h<=s.camera.height);
  for(const c of s.controls)assert(!overlaps(f,{x:c.x-c.w/2,y:c.y-c.h/2,w:c.w,h:c.h}),'feedback clears '+c.id);
  const p=screen(s,s.player.x,s.player.y);assert(!overlaps(f,{x:p.x-22*s.camera.zoom,y:p.y-52*s.camera.zoom,w:44*s.camera.zoom,h:58*s.camera.zoom}),'feedback clears actor');
 }
 await page.screenshot({path:path.join(out,name+'.png')});await fs.writeFile(path.join(out,name+'.json'),JSON.stringify(s,null,2));captures.push(name);
}
const check=s=>{checks.push(s);console.log('PASS '+s);};
try{
 const context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:path.join(out,'video')}});page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::ERR_FAILED/.test(m.text()))errors.push(m.text());});
 await load();let s=await read();
 await fixture({location:'overworld',position:{x:328,y:392},tools:{...s.tools,held:'axe'}},'QA position and held axe only; actual starter inventory retained');
 let p=screen(await read(),328,352);await page.mouse.move(p.x,p.y-30);await page.waitForTimeout(150);assert.deepEqual((await read()).hoe.previewCells,[]);await shot('tree-no-frame');
 const wood=(await read()).inventory.wood;await page.mouse.click(p.x,p.y-10);await wait(s=>!s.busy&&s.tools.resources.wood_1?.work===1,'real chop');assert.equal((await read()).inventory.wood,wood);await shot('confirmed-work');check('axe targets a real tree without a frame; actual server strike and work progress remain usable');
 s=await read();const depleted={...s.tools.resources,wood_1:{stage:'depleted',work:0,version:9}};
 await fixture({tools:{...s.tools,held:'axe',resources:depleted}},'QA depleted wood_1 to inspect exhausted-resource copy; no earned yield claimed');
 const before=(await read()).stamina.current;await resourceClick();await wait(s=>s.feedback?.text==='已采完','depleted hint');s=await read();assert.equal(s.feedback.kind,'hint');const anchor=screen(s,328,352);assert(Math.hypot(s.feedback.x-anchor.x,s.feedback.y-anchor.y)<220,'resource hint remains beside its target');assert.equal(s.stamina.current,before);const until=s.feedback.until;await shot('depleted-local-hint');
 for(let i=0;i<3;i++){await resourceClick();await page.waitForTimeout(100);}assert.equal((await read()).feedback.until,until,'repeat does not extend hint');await wait(s=>!s.feedback,'hint expires');check('depleted resources give a local neutral hint, no charge, duplicate stack or extended lifetime');
 s=await read();await fixture({tools:{...s.tools,resources:{...s.tools.resources,wood_1:{stage:'sapling',work:0,version:10,ready_tick:999999}}}},'QA sapling growth stage only');await resourceClick();await wait(s=>s.feedback?.text==='幼树生长中');await shot('sapling-local-hint');check('sapling and depleted copy describe the actual separate stage');
 await fixture({location:'home',position:{x:240,y:294}},'QA interior doorway position only');await shot('interior-no-corners');
 const error=(await read()).error;const blocked=screen(await read(),240,72);await page.mouse.click(blocked.x,blocked.y);await page.waitForTimeout(120);assert.equal((await read()).error,error);assert.equal((await read()).feedback,null);await shot('blocked-ground-no-banner');await page.waitForTimeout(450);assert.equal((await read()).feedback,null);check('nearby indoor furniture has no corner frame; blocked floor clicks have no banner');
 s=await read();await fixture({location:'overworld',position:{x:136,y:584},tools:{...s.tools,held:'hoe'}},'QA valid farm approach; normal geometry and rules retained');p=screen(await read(),136,536);await page.mouse.move(p.x,p.y);await wait(s=>s.hoe.previewCells.includes('field_1_2'),'valid hoe preview');await shot('valid-farm-preview');p=screen(await read(),280,440);await page.mouse.move(p.x,p.y);await wait(s=>!s.hoe.previewCells.length,'road preview hidden');await shot('invalid-ground-no-frame');check('only valid farming ground retains a subtle footprint; paths and invalid ground have no target frame');
 for(const viewport of [{width:1920,height:1080},{width:1024,height:768},{width:844,height:390},{width:740,height:360}]){
  await page.setViewportSize(viewport);s=await read();await fixture({position:{x:680,y:476},tools:{...s.tools,held:'axe'},stamina:{current:1,max:100,updated_at:Date.now()/1000}},'QA exhaustion and viewport '+viewport.width);p=screen(await read(),680,422);await page.mouse.click(p.x,p.y);await wait(s=>s.feedback?.text.includes('体力')&&!s.busy);assert.equal((await read()).feedback.kind,'error');await shot('necessary-failure-'+viewport.width);await wait(s=>!s.feedback,'failure auto-dismiss',7000);
 }
 check('necessary stamina failure stays readable, clears player/controls and expires at four desktop/landscape sizes');
 await context.close();
 const touch=await browser.newContext({viewport:{width:740,height:360},hasTouch:true,deviceScaleFactor:2,reducedMotion:'reduce'});page=await touch.newPage();page.on('pageerror',e=>errors.push(e.message));await load();s=await read();await fixture({location:'overworld',position:{x:328,y:392},tools:{...s.tools,held:'axe',resources:{wood_1:{stage:'depleted',work:0,version:1}}}},'Independent touch/reduced-motion depleted QA target');
 await resourceClick(true);await wait(s=>s.feedback?.text==='已采完');await shot('reduced-motion-local-hint');await wait(s=>!s.feedback);await touch.close();check('DPR2 touch layout and reduced motion keep concise feedback readable and transient');
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'result.json'),JSON.stringify({checks,captures,errors,fixtures},null,2));
}catch(e){if(page&&!page.isClosed()){await page.screenshot({path:path.join(out,'failure.png')});await fs.writeFile(path.join(out,'failure.json'),JSON.stringify(await read(),null,2));}throw e;}finally{await closeBrowser(browser);}
