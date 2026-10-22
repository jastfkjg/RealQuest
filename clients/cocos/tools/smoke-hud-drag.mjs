import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {browserConfig,launchBrowser,closeBrowser} from '../../../tools/cocos-browser-config.mjs';
import {auditPanelText} from './ui-layout-audit.mjs';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const test=await browserConfig('hud-drag');await test.assertDatabase();
const browser=await launchBrowser(chromium,{headless:true}),contexts=[],checks=[],errors=[],captures=[];let page;
const read=p=>p.evaluate(()=>JSON.parse(window.render_game_to_text()));
async function wait(p,predicate){await p.waitForFunction(predicate=>{const s=JSON.parse(window.render_game_to_text());return new Function('s','return ('+predicate+')(s)')(s);},predicate.toString());return read(p);}
async function click(p,id){const s=await wait(p,s=>!s.busy),c=s.controls.find(c=>c.id===id);assert(c&&!c.disabled,id);await p.mouse.click(c.x,c.y);await p.waitForTimeout(140);}
async function load(p){await p.goto(test.baseURL);await p.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).loaded);await click(p,'start');await wait(p,s=>s.mode==='world'&&!s.busy&&s.connection==='ready');}
async function inventory(p){await p.keyboard.press('i');await wait(p,s=>s.mode==='inventory');}
async function shot(p,name){await p.waitForTimeout(180);const s=await read(p);for(const c of s.controls){assert(c.x-c.w/2>=0&&c.y-c.h/2>=0&&c.x+c.w/2<=s.camera.width&&c.y+c.h/2<=s.camera.height,c.id+' bounds');assert(c.w>=44&&c.h>=44,c.id+' touch target');}assert.deepEqual(await auditPanelText(p),[],name+' text');await p.screenshot({path:path.join(test.directory,name+'.png')});await fs.writeFile(path.join(test.directory,name+'.json'),JSON.stringify(s,null,2));captures.push(name);}
async function drag(p,id,target,name){const c=(await read(p)).controls.find(c=>c.id===id);assert(c,id);await p.mouse.move(c.x,c.y);await p.mouse.down();await p.mouse.move(c.x+12,c.y+8,{steps:3});await p.mouse.move(target.x,target.y,{steps:12});await p.waitForTimeout(1100);if(name)await p.screenshot({path:path.join(test.directory,name+'.png')});await p.mouse.up();await p.waitForTimeout(180);}
const cell=(s,i)=>{const r=s.uiRegions.find(r=>r.id==='inventory-cell-'+i);assert(r,'cell '+i);return {x:r.x+r.w/2,y:r.y+r.h/2};};
const control=(s,id)=>{const c=s.controls.find(c=>c.id===id);assert(c,id);return {x:c.x,y:c.y};};
const check=text=>{checks.push(text);console.log('PASS '+text);};
async function api(p){const a=await p.evaluate(()=>JSON.parse(localStorage.getItem('realquest-session-v2')));const r=await p.request.get(test.baseURL+'/api/export',{headers:{Authorization:'Bearer '+a.token}});assert(r.ok());return r.json();}
try{
 const context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:path.join(test.directory,'video')}});contexts.push(context);page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errors.push(m.text());});await load(page);await shot(page,'world-1440');
 const save=(await read(page)).saveId;await page.goto('about:blank');
 execFileSync('backend/.venv/bin/python',['-c',`import sqlite3,json,sys
sys.path.insert(0,'clients/cocos/tools');from test_guard import assert_fixture
p,key=sys.argv[1:];assert_fixture(p);c=sqlite3.connect(p);s=json.loads(c.execute('select state from players where id=?',(key,)).fetchone()[0]);s['inventory']['wood']=3;s['revision']+=1;c.execute('update players set state=? where id=?',(json.dumps(s),key));c.commit();c.close()`,test.database,save]);
 await load(page);const before=(await api(page)).state.inventory;await inventory(page);await shot(page,'inventory-1440');
 let s=await read(page);await drag(page,'item-seed',cell(s,5),'drag-ghost');s=await read(page);assert.equal(s.inventoryUi.inventoryTray[5],'seed');assert.equal(s.inventoryUi.inventoryView,'main');
 await drag(page,'item-wood',cell(s,5));s=await read(page);assert.equal(s.inventoryUi.inventoryTray[0],'seed');assert.equal(s.inventoryUi.inventoryTray[5],'wood');check('actual pointer drag places into empty cells and swaps occupied cells without a click action, even across a clock tick');
 await drag(page,'item-seed',control(s,'quick-2'));s=await read(page);assert.equal(s.quick[2],'seed');assert.equal(s.quick[0],null);
 await drag(page,'item-wood',control(s,'quick-1'));s=await read(page);assert.equal(s.quick[1],'wood');await drag(page,'quick-2',control(s,'quick-1'));s=await read(page);assert.deepEqual(s.quick,[null,'seed','wood',null]);
 await drag(page,'quick-2',cell(s,3));s=await read(page);assert.equal(s.quick[2],null);assert.equal(s.inventoryUi.inventoryTray[3],'wood');check('item-to-pocket binding, pocket swaps and pocket-to-tray removal preserve server possessions');
 const tray=JSON.stringify(s.inventoryUi.inventoryTray);await drag(page,'item-seed',{x:20,y:20});assert.equal(JSON.stringify((await read(page)).inventoryUi.inventoryTray),tray);
 const handle=control(await read(page),'inventory-move');await drag(page,'inventory-move',{x:handle.x+90,y:handle.y-48});s=await read(page);assert.deepEqual(s.inventoryUi.inventoryOffset,{x:90,y:-48});assert.equal(s.inventoryUi.inventoryView,'main');await shot(page,'moved-inventory');
 await page.reload();await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).loaded);await click(page,'start');await wait(page,s=>s.mode==='world'&&!s.busy);await inventory(page);s=await read(page);assert.deepEqual(s.inventoryUi.inventoryOffset,{x:90,y:-48});assert.equal(JSON.stringify(s.inventoryUi.inventoryTray),tray);assert.deepEqual((await api(page)).state.inventory,before);check('invalid drops cancel, bag position and tray persist through reload, authoritative counts are unchanged');
 const c=control(s,'item-seed');await page.mouse.move(c.x,c.y);await page.mouse.down();await page.mouse.move(c.x+60,c.y+50,{steps:8});await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.mouse.up();await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await wait(page,s=>!s.busy);assert.equal(JSON.stringify((await read(page)).inventoryUi.inventoryTray),tray);check('window blur cancels an in-flight drag without a late drop');
 await click(page,'inventory-move');await click(page,'bag-center');await click(page,'tag-back');await click(page,'item-pockets');await click(page,'pocket-sort');await click(page,'item-next');await page.keyboard.press('Escape');await shot(page,'click-arrangement');check('single-pointer and keyboard-accessible arrangement alternatives remain available');
 for(const size of [{width:1920,height:1080},{width:1024,height:768},{width:844,height:390},{width:740,height:360}]){await page.keyboard.press('i');await wait(page,s=>s.mode==='world');await page.setViewportSize(size);await wait(page,s=>s.camera.width===window.innerWidth);await shot(page,'world-'+size.width);await inventory(page);await shot(page,'inventory-'+size.width);}
 check('HUD/navigation and satchel fit desktop and short-landscape viewports with readable native text and44px controls');
 const touch=await browser.newContext({viewport:{width:844,height:390},hasTouch:true,deviceScaleFactor:2,reducedMotion:'reduce'});contexts.push(touch);const p=await touch.newPage();await load(p);await inventory(p);s=await read(p);const start=control(s,'item-seed'),end=control(s,'quick-3'),cdp=await touch.newCDPSession(p);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[start]});for(let i=1;i<=10;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start.x+(end.x-start.x)*i/10,y:start.y+(end.y-start.y)*i/10}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(200);assert.equal((await read(p)).quick[3],'seed');await shot(p,'touch-drop');await cdp.detach();check('emulated touch drag atDPR2 and reduced motion assigns the exact pocket');
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(test.directory,'result.json'),JSON.stringify({checks,captures,errors,fixtures:[{saveId:save,note:'Only this suite own guest receives wood3 for a two-item drag fixture.'}]},null,2));
}catch(e){if(page&&!page.isClosed()){await page.screenshot({path:path.join(test.directory,'failure.png')});await fs.writeFile(path.join(test.directory,'failure.json'),JSON.stringify(await read(page),null,2));}throw e;}
finally{try{for(const c of contexts)await c.close();}finally{await closeBrowser(browser);}}
