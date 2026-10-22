import {browserConfig,launchBrowser,closeBrowser} from '../../../tools/cocos-browser-config.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
const require=createRequire(new URL('../../../package.json',import.meta.url)),{chromium}=require('playwright');
const test=await browserConfig('landscape');const base=test.baseURL,out=test.directory,db=test.database;
const browser=await launchBrowser(chromium,{headless:true});let page,save,video;
const errors=[],expectedErrors=[],checks=[],shots=[];let expected422=0;
const read=p=>p.evaluate(()=>JSON.parse(window.render_game_to_text()));
async function until(p,predicate,label='condition',timeout=15000){for(const start=Date.now();Date.now()-start<timeout;){const s=await read(p);if(predicate(s))return s;await p.waitForTimeout(65);}throw Error(label+': '+JSON.stringify(await read(p)));}
async function readDialogue(p){for(let i=0;i<100;i++){const s=await read(p);if(s.mode!=='dialogue'||s.features.npcTab!=='talk'||s.features.dialogue.choices){await p.waitForTimeout(100);return;}if(!s.busy)await p.keyboard.press('e');await p.waitForTimeout(80);}throw Error('dialogue did not finish');}
async function click(p,id,disabled=false){if(['neighbor-topics','tab-contracts','tab-shop','tab-quests'].includes(id))await readDialogue(p);if(id.startsWith('select-'))for(let i=0;i<16;i++){const r=await read(p);if(r.controls.some(c=>c.id===id)||!r.controls.some(c=>c.id==='list-next'))break;await click(p,'list-next');}const s=await until(p,s=>s.controls.some(c=>c.id===id&&(disabled||!c.disabled)),'control '+id),c=s.controls.find(c=>c.id===id);await p.mouse.click(c.x,c.y);await p.waitForTimeout(100);}
async function field(p,id,value,commit=true){const s=await until(p,s=>s.controls.some(c=>c.id===id)),c=s.controls.find(c=>c.id===id);await p.mouse.click(c.x,c.y);await p.keyboard.press('ControlOrMeta+A');await p.keyboard.insertText(value);if(commit){await p.keyboard.press('Tab');await p.waitForTimeout(100);}}
async function load(){await page.goto(base);await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).loaded);await click(page,'start');return until(page,s=>s.mode==='world'&&!s.busy&&s.connection==='ready');}
async function go(x,y,timeout=20000){const s=await read(page),c=s.camera,px=c.width/2+c.x+x*c.zoom,py=c.height/2-c.y+y*c.zoom;assert(px>=0&&px<c.width&&py>=0&&py<c.height,`visible target ${x},${y}`);await page.mouse.click(px,py);await until(page,s=>Math.hypot(s.savedPosition.x-x,s.savedPosition.y-y)<20,'walking',timeout);await page.waitForTimeout(250);}
async function use(id){await until(page,s=>s.nearby?.id===id,'nearby '+id);await click(page,'interact');await until(page,s=>!s.busy);}
async function shot(name){await page.waitForTimeout(250);await page.screenshot({path:`${out}/${name}.png`});shots.push(name);}
function check(name){checks.push(name);console.log('PASS '+name);}
async function seed(patch,transform=''){
 await page.goto('about:blank');
 execFileSync('backend/.venv/bin/python',['-c',`import sqlite3,json,sys,time
p,key,patch=sys.argv[1:];sys.path.insert(0,'clients/cocos/tools');from test_guard import assert_fixture;assert_fixture(p)
c=sqlite3.connect(p);s=json.loads(c.execute('select state from players where id=?',(key,)).fetchone()[0]);s.update(json.loads(patch));s['revision']+=1
s['world_clock'].update(updated_at=time.time(),running_until=0)
${transform}
c.execute('update players set state=? where id=?',(json.dumps(s),key));c.commit();c.close()`,db,save,JSON.stringify(patch)]);
 await load();
}
async function apiState(){const session=await page.evaluate(()=>JSON.parse(localStorage.getItem('realquest-session-v2')));return(await(await page.request.get(base+'/api/state',{headers:{Authorization:'Bearer '+session.token}})).json()).state;}
async function closeWorld(){for(let i=0;i<8&&(await read(page)).mode!=='world';i++){await page.keyboard.press('Escape');await page.waitForTimeout(180);}await until(page,s=>s.mode==='world'&&!s.busy);}
async function audit(name){
 const s=await read(page);for(const c of s.controls){assert(c.x-c.w/2>=0&&c.x+c.w/2<=s.camera.width,`${name} ${c.id} horizontal`);assert(c.y-c.h/2>=0&&c.y+c.h/2<=s.camera.height,`${name} ${c.id} vertical`);}
 for(let i=0;i<s.controls.length;i++)for(let j=i+1;j<s.controls.length;j++){const a=s.controls[i],b=s.controls[j];assert(Math.abs(a.x-b.x)>=(a.w+b.w)/2-2||Math.abs(a.y-b.y)>=(a.h+b.h)/2-2,`${name}: overlapped ${a.id}/${b.id}`);}
 await shot(name);
}
try{
 const context=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:2,hasTouch:true,isMobile:true,reducedMotion:'reduce'});page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 let s=await load();save=s.saveId;await seed({location:'home',position:{x:240,y:294}});await audit('touch-world');const cdp=await context.newCDPSession(page),controls=(await read(page)).controls,right=controls.find(c=>c.id==='right'),up=controls.find(c=>c.id==='up');
 const r={id:1,x:right.x,y:right.y},u={id:2,x:up.x,y:up.y};const initial={...(await read(page)).player};
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[r]});await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[r,u]});await page.waitForTimeout(220);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[u]});await page.waitForTimeout(100);const afterUp={...(await read(page)).player};await page.waitForTimeout(220);const afterRight={...(await read(page)).player};assert(afterRight.x>afterUp.x+10);assert(Math.abs(afterRight.y-afterUp.y)<2);assert(afterUp.x>initial.x&&afterUp.y<initial.y);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(300);const released={...(await read(page)).player};await page.waitForTimeout(250);assert.deepEqual((await read(page)).player,released);await cdp.detach();check('DPR2 actual multi-touch keeps the remaining held direction across UI redraw and releases cleanly');
 await click(page,'life');await click(page,'study-new');await audit('touch-study-form');await field(page,'study-title','横屏也能写中文');await field(page,'study-minutes','15');await field(page,'study-title','横屏也能写中文',false);const pos={...(await read(page)).savedPosition};await page.keyboard.press('d');assert.deepEqual((await read(page)).savedPosition,pos);await page.keyboard.press('Tab');await click(page,'save-study');await until(page,s=>s.studyTasks.length===1&&!s.busy);await audit('touch-life');await closeWorld();await click(page,'inventory');await audit('touch-inventory');await audit('touch-loot');await closeWorld();
 for(const mode of ['journal','growth','equipment','map']){await click(page,'menu');await click(page,'menu-'+mode);await audit('touch-'+mode);await closeWorld();}
 await page.setViewportSize({width:740,height:360});await seed({location:'workshop',position:{x:336,y:280}});await use('armory_counter');await audit('compact-armory');await click(page,'tab-sell');await audit('compact-armory-sell');
 await seed({location:'home',position:{x:360,y:208}});await use('home_chest');for(let i=0;i<4;i++){await audit('compact-storage-'+i);const next=(await read(page)).controls.find(c=>c.id==='storage-next');if(!next||next.disabled)break;await click(page,'storage-next');}
 await seed({location:'shop',position:{x:240,y:220}});await use('mira');await audit('compact-mira');await click(page,'tab-shop');await audit('compact-shop');await click(page,'tab-orders');await audit('compact-orders');
 await seed({location:'library',position:{x:112,y:248}});await use('spell_desk');await audit('compact-spell');
 await seed({location:'overworld',position:{x:304,y:1136}},"s['inventory'].update(glow_staff=1,soup=1);s['village_combat'].update(equipped='glow_staff',spark_learned=True)");await use('cave_entry');await audit('compact-cave');await click(page,'cave-enter');await until(page,s=>s.location==='cave_1'&&s.mode==='world');await audit('compact-combat');await go(208,344);const enemyHp=(await read(page)).combat.enemies[0].hp;
 const attack=(await until(page,s=>s.controls.some(c=>c.id==='attack'&&!c.disabled))).controls.find(c=>c.id==='attack'),touch=await context.newCDPSession(page);
 await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:7,x:attack.x,y:attack.y}]});await page.waitForTimeout(350);await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await until(page,s=>s.combat.enemies[0].hp<enemyHp,'touch attack committed before release');
 const spark=(await until(page,s=>s.controls.some(c=>c.id==='spark'&&!c.disabled))).controls.find(c=>c.id==='spark');await page.touchscreen.tap(spark.x,spark.y);await until(page,s=>s.inventory.gel===1,'touch spark reward');assert((await read(page)).controls.find(c=>c.id==='spark').disabled);await shot('touch-spark-cooldown');
 const soup=(await until(page,s=>s.controls.some(c=>c.id==='soup'&&!c.disabled))).controls.find(c=>c.id==='soup');await page.touchscreen.tap(soup.x,soup.y);await until(page,s=>s.inventory.soup===0,'touch soup recovery');assert((await read(page)).controls.find(c=>c.id==='soup').disabled);await touch.detach();check('native touch press survives combat HUD receipts; attack/spark/soup reconcile damage, cooldown, loot and consumption');const time=(await read(page)).combat.time;await click(page,'life');await page.waitForTimeout(300);const pause=(await read(page)).combat.time;await page.waitForTimeout(400);assert.equal((await read(page)).combat.time,pause);assert(pause>=time);await audit('compact-life-pauses-combat');
 check('landscape panel/control captures fit without overlapping controls, and Life pauses combat');assert.deepEqual(errors,[]);await fs.writeFile(`${out}/landscape-result.json`,JSON.stringify({checks,shots,errors},null,2));await context.close();console.log(JSON.stringify({checks,shots,errors}));
}catch(e){if(page&&!page.isClosed()){await page.screenshot({path:`${out}/landscape-failure.png`});await fs.writeFile(`${out}/landscape-failure-state.json`,JSON.stringify(await read(page),null,2));}throw e;}finally{await closeBrowser(browser);}
