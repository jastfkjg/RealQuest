import {browserConfig,launchBrowser,closeBrowser} from '../../../tools/cocos-browser-config.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
process.chdir(fileURLToPath(new URL('../../../',import.meta.url)));
const require=createRequire(new URL('../../../package.json',import.meta.url)),{chromium}=require('playwright');
const test=await browserConfig('dialogue');const base=test.baseURL,out=test.directory,db=test.database;
await test.assertDatabase();
const browser=await launchBrowser(chromium,{headless:true}),contexts=[],errors=[],checks=[],captures=[];let page;
const read=p=>p.evaluate(()=>JSON.parse(window.render_game_to_text()));
async function wait(p,test,label='state'){for(const start=Date.now();Date.now()-start<20000;){const s=await read(p);if(test(s))return s;await p.waitForTimeout(50);}throw Error(label);}
async function click(p,id,touch=false){const s=await wait(p,s=>s.controls.some(c=>c.id===id&&!c.disabled),id),c=s.controls.find(c=>c.id===id);if(touch)await p.touchscreen.tap(c.x,c.y);else await p.mouse.click(c.x,c.y);await p.waitForTimeout(80);}
async function finish(p,touch=false){for(let i=0;i<60;i++){const s=await read(p);if(s.features.dialogue.choices){await p.waitForTimeout(90);return;}if(touch)await click(p,'dialogue-next',true);else await p.keyboard.press('Space');await p.waitForTimeout(60);}throw Error('finish');}
async function shot(p,name){await p.screenshot({path:path.join(out,'reader-'+name+'.png')});await fs.writeFile(path.join(out,'reader-'+name+'.json'),JSON.stringify(await read(p),null,2));captures.push(name);}
async function context(options={}){const c=await browser.newContext({viewport:{width:1440,height:900},...options});contexts.push(c);const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});return p;}
async function load(p){await p.goto(base);await p.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).loaded);await click(p,'start');await wait(p,s=>s.mode==='world'&&!s.busy);}
async function fixture(p){
 const id=(await read(p)).saveId;await p.goto('about:blank');
 execFileSync('backend/.venv/bin/python',['-c',`import sqlite3,json,sys,time
sys.path.insert(0,'backend')
from app.residents import resident_position
p,key=sys.argv[1:];sys.path.insert(0,'clients/cocos/tools');from test_guard import assert_fixture;assert_fixture(p);c=sqlite3.connect(p);s=json.loads(c.execute('select state from players where id=?',(key,)).fetchone()[0]);assert s['character'];s['world_clock'].update(elapsed=0,updated_at=time.time(),running_until=0);s['npc_encounter']=None
n=resident_position(s,'lia',time.time());s['location']=n['location'];s['position']={'x':n['x'],'y':n['y']+32};s['revision']+=1;c.execute('update players set state=? where id=?',(json.dumps(s),key));c.commit();c.close()`,db,id]);
 await load(p);await click(p,'find-neighbor');await click(p,'find-go');return wait(p,s=>s.mode==='dialogue'&&!s.busy&&s.controls.some(c=>c.id==='dialogue-next'));
}
async function api(p){const auth=await p.evaluate(()=>JSON.parse(localStorage.getItem('realquest-session-v2')));const r=await p.request.get(base+'/api/export',{headers:{Authorization:'Bearer '+auth.token}});assert(r.ok());return (await r.json()).state;}
const assets=s=>({inventory:s.inventory,xp:s.xp,relationships:s.relationships,position:s.position});
const check=x=>{checks.push(x);console.log('PASS '+x);};
try{
 page=await context();await load(page);let s=await fixture(page);const before=assets(await api(page));assert(!s.features.dialogue.choices);assert(!s.controls.some(c=>c.id==='neighbor-topics'));await shot(page,'typing');
 await page.keyboard.down('e');await page.waitForTimeout(40);const once=(await read(page)).features.dialogue;await page.keyboard.down('e');await page.waitForTimeout(80);const held=(await read(page)).features.dialogue;assert.equal(held.page,once.page);assert.equal(held.choices,once.choices);await page.keyboard.up('e');await shot(page,'skip');
 await page.keyboard.press('Tab');await page.keyboard.press('Tab');assert.equal((await read(page)).focusId,'dialogue-read');await page.keyboard.press('Space');await page.waitForTimeout(80);assert.equal((await read(page)).mode,'dialogue','focused read advances text without activating a response');assert.deepEqual(assets(await api(page)),before);
 await finish(page);await shot(page,'choices');assert.deepEqual(assets(await api(page)),before);check('gradual native text, E repeat guard, focused Space and explicit replies preserve authoritative values');
 for(const size of [{width:1920,height:1080},{width:740,height:360},{width:1440,height:900}]){await page.setViewportSize(size);await wait(page,s=>s.camera.width===size.width);await page.waitForTimeout(700);s=await read(page);assert(s.features.dialogue.choices);const top=size.height-(size.height<500?168:200)-16;for(const c of s.controls.filter(c=>['neighbor-topics','tab-quests','tab-contracts','tab-shop','close'].includes(c.id)))assert(c.y-c.h/2>=top&&c.y+c.h/2<=size.height-16,'answers stay inside attached bottom speech surface');const npc=s.interactables.find(o=>o.id==='lia');for(const p of [s.player,npc]){const x=size.width/2+s.camera.x+p.x*s.camera.zoom,y=size.height/2-s.camera.y+p.y*s.camera.zoom;assert(x>40&&x<size.width-40,'actor visible horizontally');assert(y>70&&y<size.height-155,'actor above speech');const box={x,y:y-128/3*s.camera.zoom/2,w:32*s.camera.zoom,h:128/3*s.camera.zoom};for(const c of s.controls.filter(c=>['neighbor-topics','tab-quests','tab-contracts','tab-shop','close'].includes(c.id)))assert(!(Math.abs(box.x-c.x)<(box.w+c.w)/2&&Math.abs(box.y-c.y)<(box.h+c.h)/2),'reply must not hide either actor');}await shot(page,'choices-'+size.width);}
 await click(page,'neighbor-about');await page.keyboard.press('Escape');await wait(page,s=>s.mode==='dialogue');assert((await read(page)).features.dialogue.choices);await page.keyboard.press('Escape');await wait(page,s=>s.mode==='world'&&s.controls.some(c=>c.id==='find-neighbor'));await page.waitForTimeout(300);s=await read(page);assert(s.camera.zoom<2.9);assert.deepEqual(s.savedPosition,before.position);await shot(page,'camera-restored');
 await page.keyboard.down('d');await page.waitForTimeout(220);await page.keyboard.up('d');await page.waitForTimeout(350);const moved=(await read(page)).savedPosition;assert(moved.x>before.position.x);await page.waitForTimeout(400);assert.deepEqual((await read(page)).savedPosition,moved);check('resize preserves reading, real actors remain in frame, detail return preserves replies, exit restores camera and held movement clears');
 const touch=await context({viewport:{width:740,height:360},hasTouch:true,deviceScaleFactor:2,reducedMotion:'reduce'});await load(touch);s=await fixture(touch);assert(!s.features.dialogue.typing);assert(!s.features.dialogue.choices);await shot(touch,'reduced-touch');await finish(touch,true);await shot(touch,'reduced-touch-choices');await click(touch,'neighbor-topics',true);assert.equal((await read(touch)).mode,'neighbor-topics');check('reduced motion reveals immediately, actual DPR2 touch still explicitly continues and selects a topic');
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'reader-result.json'),JSON.stringify({checks,captures,errors,fixture:'Own fresh test guests only. Fixture places guest32 units below real morning Lia; no inventory, rewards or deadlines changed. Natural walking is tested separately.'},null,2));
}catch(e){if(page&&!page.isClosed()){await shot(page,'failure');await fs.writeFile(path.join(out,'reader-failure.json'),JSON.stringify(await read(page),null,2));}throw e;}finally{for(const c of contexts)await c.close();await closeBrowser(browser);}
