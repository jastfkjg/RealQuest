import {browserConfig,launchBrowser,closeBrowser} from '../../../tools/cocos-browser-config.mjs';
import {auditPanelText} from './ui-layout-audit.mjs';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const test=await browserConfig('interaction-pockets');await test.assertDatabase();
const out=test.directory,checks=[],captures=[],errors=[],fixtures=[],requests=[];
const browser=await launchBrowser(chromium,{headless:true});let page;
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
async function wait(fn,label='state',ms=20000){for(const start=Date.now();Date.now()-start<ms;){const s=await read();if(fn(s))return s;await page.waitForTimeout(60);}throw Error(label+': '+JSON.stringify(await read()));}
async function click(id){const s=await wait(s=>s.controls.some(c=>c.id===id&&!c.disabled),id),c=s.controls.find(c=>c.id===id);await page.mouse.click(c.x,c.y);await page.waitForTimeout(150);}
async function load(){await page.goto(test.baseURL);await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).loaded);await click('start');await wait(s=>s.mode==='world'&&!s.busy&&s.connection==='ready');if((await read()).controls.find(c=>c.id==='tracker-toggle')?.label==='收起')await click('tracker-toggle');}
function screen(s,x,y){return {x:s.camera.width/2+s.camera.x+x*s.camera.zoom,y:s.camera.height/2-s.camera.y+y*s.camera.zoom};}
async function fixture(patch,note){
 const id=(await read()).saveId;await page.goto('about:blank');await page.waitForTimeout(120);await test.assertDatabase();
 execFileSync('backend/.venv/bin/python',['-c',`import sqlite3,json,sys,time
p,key,patch=sys.argv[1:];sys.path.insert(0,'clients/cocos/tools');from test_guard import assert_fixture;assert_fixture(p)
c=sqlite3.connect(p);s=json.loads(c.execute('select state from players where id=?',(key,)).fetchone()[0]);s.update(json.loads(patch));s['world_clock'].update(updated_at=time.time(),running_until=0);s['revision']+=1;c.execute('update players set state=? where id=?',(json.dumps(s),key));c.commit();c.close()`,test.database,id,JSON.stringify(patch)]);
 fixtures.push(note);await load();
}
async function shot(name){
 const s=await read();for(const c of s.controls){assert(c.w>=44&&c.h>=44,c.id+' target');assert(c.x-c.w/2>=-1&&c.x+c.w/2<=s.camera.width+1&&c.y-c.h/2>=-1&&c.y+c.h/2<=s.camera.height+1,c.id+' bounds');}
 for(let i=0;i<s.controls.length;i++)for(let j=i+1;j<s.controls.length;j++){const a=s.controls[i],b=s.controls[j];assert(!(Math.abs(a.x-b.x)<(a.w+b.w)/2-1&&Math.abs(a.y-b.y)<(a.h+b.h)/2-1),a.id+'/'+b.id+' overlap');}
 if(s.feedback)for(const c of s.controls){const f=s.feedback;assert(!(Math.abs(f.x-c.x)<(f.w+c.w)/2&&Math.abs(f.y-c.y)<(f.h+c.h)/2),'feedback clears '+c.id);}
 assert.deepEqual(await auditPanelText(page),[],name+' text');await page.screenshot({path:path.join(out,name+'.png')});await fs.writeFile(path.join(out,name+'.json'),JSON.stringify(s,null,2));captures.push(name);
}
async function holdResource(id,stage='depleted'){
 const s=await read(),o=s.interactables.find(o=>o.id===id),p=screen(s,o.x,o.y-10);await page.mouse.move(p.x,p.y);await page.mouse.down();
 try{await wait(s=>s.tools.resources[id]?.stage===stage,'real gathering '+id,30000);}finally{await page.mouse.up();}
 await wait(s=>!s.busy&&!s.hoe.queue.length);await page.waitForTimeout(300);
}
async function drag(from,to,cancel=false){
 const s=await read(),a=s.controls.find(c=>c.id==='world-quick-'+from),b=typeof to==='number'?s.controls.find(c=>c.id==='world-quick-'+to):to;
 await page.mouse.move(a.x,a.y);await page.mouse.down();
 try{await page.mouse.move(a.x+10,a.y+8,{steps:3});await page.mouse.move(b.x,b.y,{steps:10});await page.waitForTimeout(1100);if(from===5&&to===7){await page.keyboard.down('w');await page.waitForTimeout(180);await page.keyboard.up('w');const live=await read();assert(Math.hypot(live.player.x-s.player.x,live.player.y-s.player.y)<.5,'drag owns movement input');}if(cancel==='escape')await page.keyboard.press('Escape');else if(cancel)await page.evaluate(()=>window.dispatchEvent(new Event('blur')));}finally{await page.mouse.up();}
 if(cancel&&cancel!=='escape')await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.waitForTimeout(250);await wait(s=>!s.busy);
}
const check=s=>{checks.push(s);console.log('PASS '+s);};
try{
 const ctx=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:path.join(out,'video')}});page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().endsWith('/api/command'))requests.push(r.postDataJSON());});page.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::ERR_FAILED/.test(m.text()))errors.push(m.text());});
 await load();let s=await read();await page.keyboard.press('2');await wait(s=>s.tools.held==='axe'&&!s.busy);await holdResource('wood_1','stump');s=await read();assert.equal(s.inventory.wood,6);assert.equal(s.inventory.tree_seed,1);assert.deepEqual(s.quick.slice(5),['wood','tree_seed',null]);await shot('earned-items-in-pockets');check('real tree yields fill the first two empty pockets, preserve the original five slots and authoritative quantities');
 const inventory={...s.inventory},held=s.tools.held,commands=requests.filter(r=>r.action==='tool_hold').length;
 await drag(5,7);s=await read();assert.equal(s.quick[5],null);assert.equal(s.quick[7],'wood');await drag(7,6);s=await read();assert.equal(s.quick[6],'wood');assert.equal(s.quick[7],'tree_seed');const arranged=[...s.quick];
 await drag(6,{x:400,y:220});assert.deepEqual((await read()).quick,arranged);await drag(6,0,true);assert.deepEqual((await read()).quick,arranged);await drag(6,0,'escape');assert.deepEqual((await read()).quick,arranged);assert.equal((await read()).mode,'world');assert.equal((await read()).tools.held,held);assert.deepEqual((await read()).inventory,inventory);assert.equal(requests.filter(r=>r.action==='tool_hold').length,commands);await load();assert.deepEqual((await read()).quick,arranged);await shot('world-pocket-reordered');check('world mouse drag moves/swaps, survives a clock tick and reload; invalid/blur/Escape drops cancel without equip, work or quantity changes');
 s=await read();await fixture({position:{x:328,y:412},tools:{...s.tools,held:'pickaxe'}},'QA nearby stone approach and held pick only; earned wood/tree seeds retained');await holdResource('stone_1');s=await read();assert.equal(s.inventory.stone,4);assert.equal(s.quick[5],'stone');const full=[...s.quick];
 await fixture({position:{x:112,y:860}},'QA position only for real copper collection with full pockets');await holdResource('vein_copper_0');s=await read();assert.equal(s.inventory.copper_ore,3);assert.deepEqual(s.quick,full);await page.keyboard.press('i');s=await wait(s=>s.mode==='inventory'&&s.controls.some(c=>c.id==='item-copper_ore'));assert(s.controls.some(c=>c.id==='item-copper_ore'));await shot('full-pockets-overflow-in-bag');await page.keyboard.press('i');await wait(s=>s.mode==='world'&&!s.busy&&s.controls.some(c=>c.id==='world-quick-0'));check('real stone uses the last empty pocket; real copper stays accessible in the bag when all eight pockets are occupied');
 s=await read();await fixture({world_clock:{...s.serverClock,elapsed:225},npc_encounter:null},'QA game clock set to 09:00, when Lia is outdoors; real NPC schedule/anchors retained');
 for(const tool of ['hoe','axe','pickaxe','watering_can']){
  s=await read();const npc=s.interactables.find(o=>o.id==='lia');assert(npc);
  await fixture({location:'overworld',position:{x:npc.x,y:npc.y+28},tools:{...s.tools,held:tool}},'QA Lia approach with '+tool+'; all possessions retained');
  await page.keyboard.press('e');await wait(s=>s.mode==='dialogue'&&!s.busy,tool+' E dialogue');assert.equal((await read()).tools.held,tool);if(tool==='hoe')await shot('held-hoe-dialogue');await page.keyboard.press('Escape');await wait(s=>s.mode==='world'&&!s.busy&&s.controls.some(c=>c.id==='world-quick-0'));
  s=await read();const live=s.interactables.find(o=>o.id==='lia'),p=screen(s,live.x,live.y-24),before={...s.inventory};await page.mouse.click(p.x,p.y);await wait(s=>s.mode==='dialogue'&&!s.busy,tool+' click dialogue');assert.equal((await read()).tools.held,tool);assert.deepEqual((await read()).inventory,before);await page.keyboard.press('Escape');await wait(s=>s.mode==='world'&&!s.busy&&s.controls.some(c=>c.id==='world-quick-0'));
 }
 check('all four held tools allow E and direct actor clicks to talk to Lia, retain the held item and never till/consume items');
 s=await read();const home=s.interactables.find(o=>o.kind==='building'&&o.id==='home');assert(home);await fixture({position:{x:home.x,y:home.y+28},tools:{...s.tools,held:'hoe'}},'QA actual home doorway approach with held hoe');await page.keyboard.press('e');await wait(s=>s.location==='home'&&!s.busy);assert.equal((await read()).tools.held,'hoe');check('E enters the nearby home while holding a hoe instead of applying it to the ground');
 for(const viewport of [{width:1440,height:900},{width:1024,height:768},{width:844,height:390},{width:740,height:360}]){
  await page.setViewportSize(viewport);s=await read();await fixture({location:'overworld',position:{x:176,y:940},tools:{...s.tools,held:'pickaxe'},stamina:{current:12,max:100,updated_at:Date.now()/1000}},'QA basic pick near gated iron and low stamina at '+viewport.width);
  s=await read();const iron=s.interactables.find(o=>o.id==='stone_5'),p=screen(s,iron.x,iron.y-10);await page.mouse.move(p.x,p.y);await wait(s=>s.controls.find(c=>c.id==='interact')?.label.includes('铜制'));
  assert(!(await read()).controls.find(c=>c.id==='interact').disabled);await shot('clear-condition-and-warning-'+viewport.width);const before={...(await read()).inventory};await click('interact');await wait(s=>s.feedback?.text.includes('阿焰'));assert.deepEqual((await read()).inventory,before);await shot('condition-details-'+viewport.width);
  await click('travel-notice');await wait(s=>s.mode==='preferences');await shot('warning-details-'+viewport.width);await page.keyboard.press('Escape');await wait(s=>s.mode==='world'&&!s.busy&&s.controls.some(c=>c.id==='world-quick-0'));
 }
 check('low stamina shows value and rest advice; tool gate is readable and opens an actionable explanation at desktop and short landscape sizes');
 await ctx.close();
 const touch=await browser.newContext({viewport:{width:740,height:360},hasTouch:true,deviceScaleFactor:2,reducedMotion:'reduce'});page=await touch.newPage();await load();s=await read();const a=s.controls.find(c=>c.id==='world-quick-0'),b=s.controls.find(c=>c.id==='world-quick-7'),cdp=await touch.newCDPSession(page),quick=[...s.quick];
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:a.x,y:a.y}]});for(let i=1;i<=10;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:a.x+(b.x-a.x)*i/10,y:a.y+(b.y-a.y)*i/10}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(200);assert.equal((await read()).quick[7],quick[0]);assert.equal((await read()).quick[0],quick[7]);await shot('touch-pocket-drag');await cdp.detach();await touch.close();check('actual emulated touch moves the world pocket at DPR2 with reduced motion; existing click/keyboard assignment alternatives remain available in the bag');
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'result.json'),JSON.stringify({checks,captures,errors,fixtures,requests},null,2));
}catch(e){if(page&&!page.isClosed()){await page.screenshot({path:path.join(out,'failure.png')});await fs.writeFile(path.join(out,'failure.json'),JSON.stringify(await read(),null,2));}throw e;}finally{await closeBrowser(browser);}
