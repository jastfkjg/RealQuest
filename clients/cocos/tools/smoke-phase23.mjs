import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
const require=createRequire(new URL('../../../frontend/package.json',import.meta.url));
const {chromium}=require('playwright');
const base='http://127.0.0.1:5422',old='http://127.0.0.1:5423',out='output/cocos-phase23';
const db=`${process.cwd()}/${out}/test.db`;
const browser=await chromium.launch({headless:true});
const checks=[],errors=[],shots=[],expectedErrors=[];let expected422=0;let save,page,oldPage,video;
const read=p=>p.evaluate(()=>JSON.parse(window.render_game_to_text()));
async function until(p,check,label='condition',timeout=15000){const start=Date.now();while(Date.now()-start<timeout){const s=await read(p);if(check(s))return s;await p.waitForTimeout(65);}throw Error(label+': '+JSON.stringify(await read(p)));}
async function click(p,id){const s=await until(p,s=>s.controls.some(b=>b.id===id&&!b.disabled),`control ${id}`),b=s.controls.find(b=>b.id===id);await p.mouse.click(b.x,b.y);}
async function load(p){await p.goto(base);await p.waitForFunction(()=>typeof window.render_game_to_text==='function');await until(p,s=>s.loaded);}
async function start(p){await click(p,'start');return until(p,s=>s.mode==='world'&&!s.busy&&s.connection==='ready','world');}
async function shot(p,name){await p.waitForTimeout(300);await p.screenshot({path:`${out}/${name}.png`});shots.push(name);}
function check(name){checks.push(name);console.log('PASS '+name);}
async function seed(patch){
 await page.goto('about:blank');
 execFileSync('backend/.venv/bin/python',['-c',`import sqlite3,json,sys,time
p,key,patch=sys.argv[1:];assert p.endswith('/output/cocos-phase23/test.db')
c=sqlite3.connect(p);s=json.loads(c.execute('select state from players where id=?',(key,)).fetchone()[0]);s.update(json.loads(patch));s['revision']+=1
s['world_clock'].update(updated_at=time.time(),running_until=0)
c.execute('update players set state=? where id=?',(json.dumps(s),key));c.commit();c.close()`,db,save,JSON.stringify(patch)]);
 await load(page);await start(page);
}
async function go(p,x,y){const s=await read(p),c=s.camera;const px=c.width/2+c.x+x*c.zoom,py=c.height/2-c.y+y*c.zoom;assert(px>=0&&px<=c.width&&py>=0&&py<=c.height,`visible world target ${x},${y} ->${px},${py}`);await p.mouse.click(px,py);await until(p,s=>Math.hypot(s.player.x-x,s.player.y-y)<20,'walk',20000);await until(p,s=>Math.hypot(s.savedPosition.x-s.player.x,s.savedPosition.y-s.player.y)<2,'saved walk');}
async function use(id){await until(page,s=>s.nearby?.id===id,'nearest '+id);await click(page,'interact');await page.waitForTimeout(300);}
async function importFile(file){const chooser=page.waitForEvent('filechooser');await click(page,'choose-recovery');await (await chooser).setFiles({name:'realquest-recovery.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(file))});await until(page,s=>s.controls.some(b=>b.id==='confirm-restore'),'recovery preview');}
try{
 const context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:`${out}/recordings`,size:{width:1440,height:900}}});
 page=await context.newPage();video=page.video();page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error'){if(expected422&&/422/.test(e.text())){expected422--;expectedErrors.push(e.text());}else if(!/net::ERR_FAILED/.test(e.text()))errors.push(e.text());}});
 // Create an actual original-Web character through its unchanged native form.
 const oldContext=await browser.newContext({viewport:{width:1440,height:900}});oldPage=await oldContext.newPage();oldPage.on('pageerror',e=>errors.push(e.message));
 await oldPage.goto(old);await oldPage.getByLabel('你的名字').fill('跨版本旅人');await oldPage.getByRole('button',{name:'外观 5',exact:true}).click();await oldPage.locator('#start-btn').click();await oldPage.locator('canvas').waitFor();
 const original=await (await oldPage.request.get(old+'/api/state')).json();save=original.save_id;
 // Historical indoor state fixture belongs only to this new test guest.
 execFileSync('backend/.venv/bin/python',['-c',`import sqlite3,json,sys
p,key=sys.argv[1:];assert p.endswith('/output/cocos-phase23/test.db')
c=sqlite3.connect(p);s=json.loads(c.execute('select state from players where id=?',(key,)).fetchone()[0]);s['location']='home';s['position']={'x':360,'y':208};s['inventory']['wood']=6;s['world_clock'].update(elapsed=187.5,running_until=0);s['revision']+=1;c.execute('update players set state=? where id=?',(json.dumps(s),key));c.commit();c.close()`,db,save]);
 await oldPage.goto('about:blank'); // Stop its world owner before Cocos takes over.
 const file=await (await oldPage.request.post(old+'/api/recovery-file')).json();
 await load(page);await click(page,'import-save');await importFile(file);await shot(page,'recovery-preview-desktop');assert.equal((await read(page)).saveId,'');
 await click(page,'cancel-restore');assert.equal((await read(page)).saveId,'');await importFile(file);await click(page,'confirm-restore');let s=await until(page,s=>s.mode==='world'&&s.sceneId==='home'&&!s.busy);assert.equal(s.saveId,save);assert.equal(s.inventory.wood,6);assert.equal(s.appearance,4);await shot(page,'home-desktop');check('original Web native creation, credential preview/cancel/confirm and indoor save + appearance compatibility');
 await use('home_chest');await until(page,s=>s.mode==='storage');await click(page,'store-wood');await until(page,s=>s.inventory.wood===5&&!s.busy);await shot(page,'storage-desktop');
 let oldView=await (await oldPage.request.get(old+'/api/state')).json();assert.equal(oldView.state.storage.wood,1);await click(page,'withdraw-wood');await until(page,s=>s.inventory.wood===6&&!s.busy);await page.keyboard.press('Escape');
 await go(page,240,294);await use('home_exit');s=await until(page,s=>s.location==='overworld'&&s.sceneId==='overworld');assert(Math.hypot(s.player.x-160,s.player.y-244)<1);check('real storage/withdraw is visible to original Web; authoritative exit preserves doorway position');
 // Real mouse walk around the unchanged facade collision, then enter again.
 await go(page,160,272);await use('home');await until(page,s=>s.location==='home');await shot(page,'home-reentered');
 await go(page,280,136);await use('home_bed');await until(page,s=>s.mode==='sleep');const dayBefore=(await(await oldPage.request.get(old+'/api/state')).json()).state.world_clock.elapsed;await click(page,'short-rest');await until(page,s=>!s.busy&&s.notice.includes('小憩'));await shot(page,'rest-desktop');await click(page,'sleep-night');await until(page,s=>!s.busy&&s.location==='home');const after=(await(await oldPage.request.get(old+'/api/state')).json()).state;assert(after.world_clock.elapsed>dayBefore);check('home navigation, bed short rest and overnight use server day/time rules');
 await page.keyboard.press('Escape');await click(page,'session');const downloadPromise=page.waitForEvent('download');await click(page,'export-recovery');const download=await downloadPromise;const stream=await download.createReadStream(),chunks=[];for await(const c of stream)chunks.push(c);const newFile=JSON.parse(Buffer.concat(chunks).toString());assert.equal(newFile.format,'realquest-recovery');
 const returnContext=await browser.newContext();const returnPage=await returnContext.newPage();await returnPage.goto(old);await returnPage.getByRole('button',{name:'已有旅程凭证？找回存档'}).click();await returnPage.getByLabel('选择旅程凭证文件').setInputFiles({name:'return.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(newFile))});await returnPage.getByRole('button',{name:'恢复这段旅程',exact:true}).click();await returnPage.locator('canvas').waitFor();assert.equal((await(await returnPage.request.get(old+'/api/state')).json()).save_id,save);await shot(returnPage,'original-web-return');await returnContext.close();await click(page,'session-close');check('Cocos credential download restores the same journey through original Web native recovery UI');
 // All five building doors use genuine enter/exit, no fake local teleport.
 for(const id of ['workshop','library','guild','shop']){
   const doors={workshop:[352,252],library:[704,252],guild:[1088,572],shop:[832,708]};const [x,y]=doors[id];await seed({location:'overworld',position:{x,y}});await use(id);await until(page,s=>s.sceneId===id);await shot(page,'room-'+id);await go(page,240,294);await use(id+'_exit');await until(page,s=>s.sceneId==='overworld');
 }
 check('five original interiors load and leave through actual server anchors');
 // A repeated unknown outcome is durable across a reload, never a new plant/gather ID.
 await seed({location:'overworld',position:{x:320,y:352},gathered:{},world_clock:{...after.world_clock,elapsed:187.5,running_until:0}});
 const initialWood=(await read(page)).inventory.wood,attempts=[];let lost=true;
 await page.route('**/api/command',async route=>{const b=route.request().postDataJSON();if(b.action!=='gather'||!lost)return route.continue();attempts.push(b);if(attempts.length===1)await route.fetch();return route.abort('failed');});
 await use('wood_1');await until(page,s=>s.connection==='uncertain'&&!s.busy);assert.equal((await read(page)).inventory.wood,initialWood);assert.equal(attempts.length,2);assert.equal(attempts[0].request_id,attempts[1].request_id);await shot(page,'network-uncertain');
 lost=false;await page.reload();await page.waitForFunction(()=>typeof window.render_game_to_text==='function');await until(page,s=>s.loaded);await start(page);s=await read(page);assert.equal(s.inventory.wood,initialWood+3);assert.equal(s.pendingAction,null);check('commit + two lost replies survive reload and replay exactly once');
 // Failed mutation followed by same-session retry and lifecycle ownership.
 let rejected=false;await page.route('**/api/command',async route=>{const b=route.request().postDataJSON();if(b.action==='plant'&&!rejected){rejected=true;expected422++;return route.fulfill({status:422,contentType:'application/json',body:JSON.stringify({detail:'测试：本次播种未提交'})});}return route.fallback();});
 await go(page,136,440);const seeds=(await read(page)).inventory.seed;await use('plot_0');await until(page,s=>s.error.includes('未提交'));assert.equal((await read(page)).inventory.seed,seeds);await use('plot_0');await until(page,s=>s.inventory.seed===seeds-1);await shot(page,'planted');
 await click(page,'inventory');const before=(await read(page)).player;await page.keyboard.down('d');await page.waitForTimeout(250);await page.keyboard.up('d');assert.deepEqual((await read(page)).player,before);await page.keyboard.press('Tab');await page.keyboard.press('Enter');await page.keyboard.press('Escape');
 await page.keyboard.down('d');await page.waitForTimeout(100);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));const blurred=(await read(page)).player;await page.waitForTimeout(250);assert.deepEqual((await read(page)).player,blurred);await page.keyboard.up('d');await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.waitForTimeout(500);check('rejected planting preserves resources; retry, modal keyboard, focus and blur keep ownership');
 // Existing travel save, valid costs and authoritative region transitions.
 const latest=(await(await oldPage.request.get(old+'/api/state')).json()).state;
 await seed({location:'crossing',position:{x:352,y:340},inventory:{...latest.inventory,gold:20},stamina:{...latest.stamina,current:100},world_clock:{...latest.world_clock,elapsed:187.5,running_until:0}});
 await use('adu');await until(page,s=>s.mode==='travel');await shot(page,'travel-desktop');await click(page,'travel-ferry');await until(page,s=>s.location==='mountain'&&s.mode==='world');assert.equal((await read(page)).inventory.gold,14);await shot(page,'mountain-desktop');
 await seed({location:'mountain',position:{x:96,y:472}});await use('to_crossing');await click(page,'travel-cross_back');await until(page,s=>s.location==='crossing'&&s.mode==='world');assert.equal((await read(page)).inventory.gold,8);
 await seed({location:'city',position:{x:352,y:264}});await use('to_inn');await click(page,'travel-enter_inn');await until(page,s=>s.sceneId==='inn');await shot(page,'inn-desktop');await go(page,240,294);await use('inn_exit');await click(page,'travel-exit_inn');await until(page,s=>s.sceneId==='city');check('quoted ferry costs, return fare, city/inn transitions preserve old journey state');
 // Locked travel is descriptive, no forced unlock or new progression rules.
 await seed({location:'overworld',position:{x:1816,y:368}});await use('village_departure');await until(page,s=>s.mode==='travel');assert((await read(page)).controls.find(c=>c.id==='travel-depart').disabled);await shot(page,'departure-locked');check('locked departure stays disabled with original server requirements');
 for(const [width,height] of [[844,390],[740,360]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(400);await shot(page,`travel-${width}`);for(const c of (await read(page)).controls)assert(c.x-c.w/2>=0&&c.x+c.w/2<=width+1&&c.y-c.h/2>=0&&c.y+c.h/2<=height+1,`viewport ${width} ${c.id}`);
  await page.keyboard.press('Escape');await click(page,'session');await shot(page,`session-${width}`);await click(page,'session-close');await click(page,'inventory');await shot(page,`inventory-${width}`);await page.keyboard.press('Escape');await use('village_departure');
 }
 check('844 and 740 landscape world/session/inventory/travel render within viewport');
 // True touch input at DPR2 uses the same world/client flow.
 const touchContext=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:2,hasTouch:true,isMobile:true,reducedMotion:'reduce'});
 const touch=await touchContext.newPage();touch.on('pageerror',e=>errors.push(e.message));await load(touch);await start(touch);
 const beforeTouch=(await read(touch)).player.x,right=(await read(touch)).controls.find(c=>c.id==='right'),cdp=await touchContext.newCDPSession(touch);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:right.x,y:right.y}]});await touch.waitForTimeout(400);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await until(touch,s=>s.player.x>beforeTouch+10);await touch.waitForTimeout(250);const released=(await read(touch)).player;await touch.waitForTimeout(250);assert.deepEqual((await read(touch)).player,released);await shot(touch,'touch-world');
 const inv=(await read(touch)).controls.find(c=>c.id==='inventory');await touch.touchscreen.tap(inv.x,inv.y);await until(touch,s=>s.mode==='inventory');await shot(touch,'touch-inventory');await touchContext.close();check('DPR2 real touch movement/release and inventory work without stuck input');
 // A pre-existing cave save remains accessible without enabling unfinished combat.
 await page.setViewportSize({width:1440,height:900});await seed({location:'cave_1',position:{x:64,y:352}});await use('cave_exit');await click(page,'cave-retreat');await until(page,s=>s.sceneId==='overworld');check('existing cave save can safely retreat through authoritative server command');
 assert.deepEqual(errors,[]);await fs.writeFile(`${out}/smoke-result.json`,JSON.stringify({checks,shots,errors,expectedErrors,saveId:save},null,2));
 await context.close();await video.saveAs(`${out}/interaction.webm`);await oldContext.close();
 console.log(JSON.stringify({checks,shots,errors,expectedErrors}));
}catch(e){await fs.writeFile(`${out}/partial-result.json`,JSON.stringify({checks,errors,expectedErrors,error:String(e)},null,2));if(page&&!page.isClosed()){try{await page.screenshot({path:`${out}/failure.png`});}catch{}}throw e;}finally{await browser.close();}
