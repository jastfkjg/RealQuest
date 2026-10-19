import {browserConfig,launchBrowser,closeBrowser} from '../../../tools/cocos-browser-config.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
const require=createRequire(new URL('../../../package.json',import.meta.url));
const {chromium}=require('playwright');
const test=await browserConfig('world');const base=test.baseURL,out=test.directory,db=test.database;
const browser=await launchBrowser(chromium,{headless:true});
const errors=[],checks=[],metrics={motion:[],gatherRequests:[]};let expected422=0;
const read=p=>p.evaluate(()=>JSON.parse(window.render_game_to_text()));
async function until(p,predicate,timeout=12000){const start=Date.now();while(Date.now()-start<timeout){const s=await read(p);if(predicate(s))return s;await p.waitForTimeout(80);}throw Error('Timed out: '+JSON.stringify(await read(p)));}
async function click(p,id){const s=await until(p,s=>s.controls.some(b=>b.id===id&&!b.disabled)),b=s.controls.find(b=>b.id===id);assert.ok(b&&!b.disabled,`Enabled control ${id}`);await p.mouse.click(b.x,b.y);}
async function go(p,x,y){const s=await read(p),c=s.camera;await p.mouse.click(c.width/2+c.x+x*c.zoom,c.height/2-c.y+y*c.zoom);await until(p,s=>Math.hypot(s.player.x-x,s.player.y-y)<20,15000);await p.waitForTimeout(300);}
try{
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  page.on('request',r=>{if(r.url().endsWith('/api/command')){const b=r.postDataJSON();if(b?.action==='move')metrics.motion.push({requestId:b.request_id,data:b.data});if(b?.action==='gather')metrics.gatherRequests.push(b);}});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',e=>{if(e.type()==='error'){if(expected422&&/422/.test(e.text()))expected422--;else if(!/net::ERR_FAILED/.test(e.text()))errors.push(e.text());}});
  const bootStart=Date.now();await page.goto(base);await page.waitForFunction(()=>typeof window.render_game_to_text==='function');await until(page,s=>s.loaded);metrics.localHeadlessBootMs=Date.now()-bootStart;
  await page.screenshot({path:`${out}/welcome-desktop.png`});
  await click(page,'start');let s=await until(page,s=>s.mode==='world'&&!s.busy);
  const save=s.saveId;assert.equal(s.inventory.seed,6);assert.equal(s.inventory.gold,20);checks.push('new guest uses authoritative starter inventory');
  let rejectedId='',lost=false,attempts=[];metrics.injectedGather=attempts;
  // Faults belong to durable command identities, not a race-prone arrival count.
  await page.route('**/api/command',async route=>{const body=route.request().postDataJSON();if(body.action!=='gather')return route.continue();attempts.push(body);
    rejectedId ||= body.request_id;
    if(body.request_id===rejectedId){expected422++;return route.fulfill({status:422,contentType:'application/json',body:JSON.stringify({detail:'测试：采集暂未提交，请重试'})});}
    if(!lost){lost=true;await route.fetch();return route.abort('failed');}return route.continue();});
  assert.equal(s.inventory.wood,0);
  await page.keyboard.down('d');await page.waitForTimeout(620);await page.keyboard.up('d');
  await until(page,s=>s.connection==='ready'&&!s.pendingAction&&!s.busy&&Math.hypot(s.player.x-s.savedPosition.x,s.player.y-s.savedPosition.y)<.5);
  assert.equal(metrics.gatherRequests.length,0,'movement alone must not gather');
  await page.keyboard.press('e');await until(page,s=>s.error.includes('暂未提交'));assert.equal((await read(page)).inventory.wood,0);
  assert(attempts.length>=1);assert(attempts.every(b=>b.request_id===rejectedId));
  await page.keyboard.press('e');s=await until(page,s=>s.inventory.wood===3&&!s.busy);assert.equal(s.stamina.current,96);
  const replay=attempts.filter(b=>b.request_id!==rejectedId);assert.equal(replay.length,2);assert.deepEqual(replay[0],replay[1]);checks.push('rejected gather preserves inventory; explicit new retry and identical lost-response replay consume stamina once');
  await page.screenshot({path:`${out}/world-desktop.png`});
  metrics.localHeadlessRafFps=await page.evaluate(()=>new Promise(resolve=>{let first=0,count=0;function sample(t){if(!first)first=t;if(++count===31)resolve(Math.round(30000/(t-first)));else requestAnimationFrame(sample);}requestAnimationFrame(sample);}));
  await page.keyboard.press('i');await until(page,s=>s.mode==='inventory');await click(page,'item-wood');await click(page,'item-pockets');await click(page,'pocket-select-0');await click(page,'pocket-bind');await click(page,'tag-back');s=await read(page);assert.equal(s.quick[0],'wood');assert.equal(s.inventory.wood,3);
  const position={...s.player};await page.keyboard.down('d');await page.waitForTimeout(300);await page.keyboard.up('d');assert.deepEqual((await read(page)).player,position);
  await page.screenshot({path:`${out}/inventory-desktop.png`});checks.push('selection and quick assignment do not consume items; modal owns keyboard');
  await page.keyboard.press('Escape');await page.keyboard.press('l');await until(page,s=>s.mode==='life');await page.screenshot({path:`${out}/life-desktop.png`});await page.keyboard.press('Escape');
  await go(page,136,408);await page.keyboard.press('e');s=await until(page,s=>s.inventory.seed===5&&!s.busy&&s.plotPresentation.plot_0==='growing');assert.ok(s.plots.plot_0);await page.screenshot({path:`${out}/planted-desktop.png`});checks.push('real planting decrements one seed, persists a server crop and displays its seedling');
  await page.reload();await page.waitForFunction(()=>typeof window.render_game_to_text==='function');await until(page,s=>s.loaded);await click(page,'start');s=await until(page,s=>s.mode==='world'&&!s.busy);assert.equal(s.saveId,save);assert.equal(s.inventory.seed,5);assert.equal(s.inventory.wood,3);assert.ok(s.plots.plot_0);assert.equal(s.quick[0],'wood');checks.push('reload restores the same server save and local quick bindings');
  // Deterministic NPC-time fixture is limited to this task's isolated database.
  const fixture=spawnSync('backend/.venv/bin/python',['-c',`import os,copy,time,sys\nsys.path.insert(0,'clients/cocos/tools');from test_guard import assert_fixture;assert_fixture(sys.argv[1])\nfrom sqlalchemy import select\nfrom app.db import Session\nfrom app.models import Player\nwith Session.begin() as db:\n p=db.get(Player,'${save}');s=copy.deepcopy(p.state);s['world_clock'].update(elapsed=187.5,updated_at=time.time(),running_until=0);p.state=s`,db],{env:{...process.env,PYTHONPATH:'backend',DATABASE_URL:`sqlite:///${db}`},encoding:'utf8'});
  assert.equal(fixture.status,0,fixture.stderr);await page.waitForTimeout(5500);await go(page,576,440);await page.keyboard.press('e');await until(page,s=>s.mode==='dialogue'&&s.controls.length>0);await page.screenshot({path:`${out}/dialogue-desktop.png`});checks.push('actual NPC greeting at a deterministic isolated 08:30 fixture');await page.keyboard.press('Escape');
  await page.setViewportSize({width:844,height:390});await page.waitForTimeout(800);await page.keyboard.press('i');await until(page,s=>s.mode==='inventory');await page.screenshot({path:`${out}/inventory-landscape.png`});
  for(const b of (await read(page)).controls.filter(b=>['close','item-pockets'].includes(b.id)||b.id.startsWith('item-')||b.id.startsWith('quick-'))){assert.ok(b.x-b.w/2>=0&&b.x+b.w/2<=844&&b.y-b.h/2>=0&&b.y+b.h/2<=390,`Visible ${b.id}`);}
  checks.push('844×390 landscape inventory controls stay in bounds');
  await page.keyboard.press('Escape');await until(page,s=>s.mode==='world');await page.keyboard.down('d');await page.waitForTimeout(120);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.waitForTimeout(200);
  const blurred={...(await read(page)).player};await page.waitForTimeout(300);assert.deepEqual((await read(page)).player,blurred);await page.keyboard.up('d');await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.waitForTimeout(350);
  const focused={...(await read(page)).player};await page.waitForTimeout(300);assert.deepEqual((await read(page)).player,focused);checks.push('injected blur clears held movement; focus refresh does not resume stale keys');
  const touchContext=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:2,hasTouch:true,isMobile:true,reducedMotion:'reduce'});
  try {
    const touch=await touchContext.newPage();touch.on('pageerror',e=>errors.push(e.message));
    await touch.goto(base);await touch.waitForFunction(()=>typeof window.render_game_to_text==='function');await until(touch,s=>s.loaded);
    const tap=async id=>{const s=await until(touch,s=>s.controls.some(b=>b.id===id&&!b.disabled)),b=s.controls.find(b=>b.id===id);assert.ok(b&&!b.disabled);await touch.touchscreen.tap(b.x,b.y);};
    await tap('start');await until(touch,s=>s.mode==='world'&&!s.busy);
    const before=(await read(touch)).player.x;
    const right=(await read(touch)).controls.find(b=>b.id==='right');
    const cdp=await touchContext.newCDPSession(touch);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:right.x,y:right.y}]});await touch.waitForTimeout(300);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await until(touch,s=>s.player.x>before+10);
    await touch.screenshot({path:`${out}/world-landscape-touch.png`});
    await tap('inventory');await until(touch,s=>s.mode==='inventory');await tap('item-seed');await tap('item-pockets');await tap('pocket-select-0');await tap('pocket-bind');await tap('tag-back');assert.equal((await read(touch)).inventory.seed,6);
    await touch.screenshot({path:`${out}/inventory-landscape-touch.png`});await tap('close');await until(touch,s=>s.mode==='world');
    checks.push('DPR2 real touch events move, release, open inventory, assign without consumption and return');
  } finally { await touchContext.close(); }
  assert.deepEqual(errors,[]);assert.equal(expected422,0);await fs.writeFile(`${out}/smoke-result.json`,JSON.stringify({checks,errors,metrics,measurementScope:'Local headless Chromium only; not a physical-device performance claim.',final:await read(page)},null,2));console.log(JSON.stringify({checks,errors,metrics}));
}catch(error){await fs.writeFile(`${out}/failure-motion.json`,JSON.stringify({checks,metrics,error:String(error)},null,2));throw error;}finally{await closeBrowser(browser);}
