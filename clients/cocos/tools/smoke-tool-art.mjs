import {browserConfig,launchBrowser,closeBrowser} from '../../../tools/cocos-browser-config.mjs';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const test=await browserConfig('tool-art'),out=test.directory;
await test.assertDatabase();const browser=await launchBrowser(chromium,{headless:true});let page;
const checks=[],captures=[],errors=[],fixtures=[],tools=['hoe','axe','pickaxe','watering_can'];
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
async function wait(fn,label,ms=15000){for(let start=Date.now();Date.now()-start<ms;){const s=await read();if(fn(s))return s;await page.waitForTimeout(40);}const s=await read();throw Error(label+': '+JSON.stringify({mode:s.mode,busy:s.busy,error:s.error,p:s.toolPresentation}));}
async function click(id){const s=await wait(s=>s.controls.some(c=>c.id===id&&!c.disabled),id),c=s.controls.find(c=>c.id===id);await page.mouse.click(c.x,c.y);}
async function load(){await page.goto(test.baseURL);await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).loaded);await click('start');await wait(s=>s.mode==='world'&&!s.busy&&s.connection==='ready','ready');}
async function fixture(appearance,tier){
 const s=await read();await page.goto('about:blank');await page.waitForTimeout(80);
 execFileSync('backend/.venv/bin/python',['-c',`import json,sqlite3,sys,time
p,key,appearance,tier=sys.argv[1:];sys.path.insert(0,'clients/cocos/tools');from test_guard import assert_fixture;assert_fixture(p)
c=sqlite3.connect(p);s=json.loads(c.execute('select state from players where id=?',(key,)).fetchone()[0]);s.update(location='overworld',position=dict(x=136,y=584));s['character']['appearance']=int(appearance);s['tools']['held']=None;s['tools']['levels']={k:int(tier) for k in ['hoe','axe','pickaxe','watering_can']};s['world_clock'].update(updated_at=time.time(),running_until=0);s['revision']+=1;c.execute('update players set state=? where id=?',(json.dumps(s),key));c.commit();c.close()`,test.database,s.saveId,String(appearance),String(tier)]);
 fixtures.push({appearance,tier,note:'QA appearance/tier/clear-ground approach only; all tool selection and walking via actual input; no work, currency or inventory injection'});await load();
}
async function face(dir){const key=['s','w','a','d'][dir];await page.keyboard.down(key);await page.waitForTimeout(110);await page.keyboard.up(key);await wait(s=>s.toolPresentation.direction===dir&&!s.busy&&!s.toolPresentation.moving,'facing '+dir);}
async function geometry(){return page.evaluate(async()=>{const cc=await System.import('cc');const state=JSON.parse(window.render_game_to_text());const find=(n,name)=>n.name===name?n:n.children.map(c=>find(c,name)).find(Boolean);const scene=cc.director.getScene(),actor=find(scene,'Player'),g=actor.getComponent(cc.UITransform),sf=actor.getComponent(cc.Sprite).spriteFrame;return {state,size:[g.width,g.height],anchor:[g.anchorPoint.x,g.anchorPoint.y],rect:[sf.rect.x,sf.rect.y,sf.rect.width,sf.rect.height],texture:[sf.texture.width,sf.texture.height],actor:[actor.position.x,actor.position.y],scaleX:actor.scale.x,oldToolLayer:!!find(scene,'CurrentHandArt'),oldHandLayer:!!find(scene,'ToolHandOverlay'),seedVisible:find(scene,'CarriedSeedArt')?.activeInHierarchy};});}
async function shot(name,full=false){
 const g=await geometry(),s=g.state,v=page.viewportSize(),x=v.width/2+s.camera.x+s.player.x*s.camera.zoom,y=v.height/2-s.camera.y+s.player.y*s.camera.zoom;
 const clip={x:Math.max(0,Math.min(v.width-180,x-90)),y:Math.max(0,Math.min(v.height-180,y-130)),width:180,height:180};
 assert(s.toolActor.active&&s.toolPresentation.integrated,'actual player uses dedicated full-body tool artwork');assert.deepEqual(g.size,[224/3,224/3]);assert.equal(g.scaleX,s.toolActor.flipX?-1:1);assert.deepEqual(g.texture,[672,448]);assert.deepEqual(g.rect,[s.toolActor.frame*112,s.toolActor.sourceDirection*112,112,112]);assert(Math.abs(g.actor[0]-s.player.x)<.001&&Math.abs(g.actor[1]+s.player.y)<.001,'one common actor foot anchor');assert(!g.oldToolLayer&&!g.oldHandLayer&&!g.seedVisible,'no duplicate empty-handed arm or prop overlay');
 await page.screenshot({path:path.join(out,name+'.png'),...(full?{}:{clip})});await fs.writeFile(path.join(out,name+'.json'),JSON.stringify({state:s,geometry:g},null,2));captures.push(name);
}
const check=t=>{checks.push(t);console.log('PASS '+t);};
try{
 const ctx=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:path.join(out,'video')}});page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));await load();
 for(let appearance=0;appearance<6;appearance++){
  await fixture(appearance,0);
  for(let i=0;i<4;i++){
   await page.keyboard.press(String(i+1));await wait(s=>s.tools.held===tools[i]&&!s.busy,'select '+tools[i]);
   for(let dir=0;dir<4;dir++){await face(dir);assert.equal((await read()).toolActor.sheet,`tool-actors/${tools[i]}-${appearance}`);await shot(`appearance${appearance}-${tools[i]}-dir${dir}`);}
  }
 }
 check('all six identities use each of four dedicated integrated tool actors in all four directions, with correct common foot anchor and no duplicate prop/arms');
 for(let tier=1;tier<4;tier++){await fixture(0,tier);for(let i=0;i<4;i++){await page.keyboard.press(String(i+1));await wait(s=>s.tools.held===tools[i]&&!s.busy,'tier tool');assert.equal((await read()).toolActor.tier,tier);await shot(tools[i]+'-tier'+tier);}}
 check('all upgrade tiers retain correct saved tool identity while using the new whole-body poses');
 await fixture(0,0);await page.keyboard.press('2');await wait(s=>s.tools.held==='axe'&&!s.busy,'walking axe');await page.keyboard.down('d');try{await wait(s=>s.toolActor.frame===4,'walk key A');await shot('axe-walk-A');await wait(s=>s.toolActor.frame===5,'walk key B');await shot('axe-walk-B');}finally{await page.keyboard.up('d');}await wait(s=>!s.toolPresentation.moving,'walking ended');assert.equal((await read()).toolActor.frame,0);await shot('axe-rest-after-walk');check('actual movement uses distinct painted opposite-stride keys and immediately restores the painted held-ready key on release');
 await click('current-hand');await wait(s=>!s.tools.held&&!s.busy&&!s.toolActor.active,'put tool away');let g=await geometry();assert.deepEqual(g.size,[32,128/3]);assert.deepEqual(g.rect.slice(2),[48,64]);await page.keyboard.press('5');await wait(s=>s.tools.held==='seed'&&!s.busy,'hold seeds');g=await geometry();assert(!(await read()).toolActor.active);assert(g.seedVisible,'seed packets retain their separate existing carried-item presentation');await page.keyboard.press('2');await wait(s=>s.tools.held==='axe'&&!s.busy,'restore axe');check('putting tools away restores the original unarmed actor; seed packets and subsequent tool selection do not duplicate arms or props');
 await page.setViewportSize({width:740,height:360});await wait(s=>s.camera.width===740,'landscape');await shot('landscape-axe',true);await ctx.close();
 const reduced=await browser.newContext({viewport:{width:740,height:360},hasTouch:true,reducedMotion:'reduce'});page=await reduced.newPage();page.on('pageerror',e=>errors.push(e.message));await load();await click('world-quick-2');await wait(s=>s.tools.held==='pickaxe'&&!s.busy,'reduced-motion pickaxe');await face(3);assert.equal((await read()).toolPresentation.lean,0);await shot('reduced-motion-pickaxe',true);await reduced.close();check('short landscape and reduced-motion selection retain a static full-body tool pose and usable existing controls');
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'result.json'),JSON.stringify({checks,captures,errors,fixtures},null,2));
}catch(e){if(page&&!page.isClosed()){await page.screenshot({path:path.join(out,'failure.png')});await fs.writeFile(path.join(out,'failure.json'),JSON.stringify(await read(),null,2));}throw e;}finally{await closeBrowser(browser);}
