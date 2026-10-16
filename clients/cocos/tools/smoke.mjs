import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
const require=createRequire(new URL('../../../frontend/package.json',import.meta.url));
const {chromium}=require('playwright');
const base='http://127.0.0.1:5420',out='output/cocos-migration';
const browser=await chromium.launch({headless:true});
const errors=[],checks=[],metrics={};
const read=p=>p.evaluate(()=>JSON.parse(window.render_game_to_text()));
async function until(p,predicate,timeout=12000){const start=Date.now();while(Date.now()-start<timeout){const s=await read(p);if(predicate(s))return s;await p.waitForTimeout(80);}throw Error('Timed out: '+JSON.stringify(await read(p)));}
async function click(p,id){const s=await until(p,s=>s.controls.some(b=>b.id===id&&!b.disabled)),b=s.controls.find(b=>b.id===id);assert.ok(b&&!b.disabled,`Enabled control ${id}`);await p.mouse.click(b.x,b.y);}
async function go(p,x,y){const s=await read(p),c=s.camera;await p.mouse.click(c.width/2+c.x+x*c.zoom,c.height/2-c.y+y*c.zoom);await until(p,s=>Math.hypot(s.player.x-x,s.player.y-y)<20,15000);await p.waitForTimeout(300);}
try{
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',e=>{if(e.type()==='error'&&!/503|net::ERR_FAILED/.test(e.text()))errors.push(e.text());});
  const bootStart=Date.now();await page.goto(base);await page.waitForFunction(()=>typeof window.render_game_to_text==='function');await until(page,s=>s.loaded);metrics.localHeadlessBootMs=Date.now()-bootStart;
  await page.screenshot({path:`${out}/welcome-desktop.png`});
  await click(page,'start');let s=await until(page,s=>s.mode==='world'&&!s.busy);
  const save=s.saveId;assert.equal(s.inventory.seed,6);assert.equal(s.inventory.gold,20);checks.push('new guest uses authoritative starter inventory');
  await page.keyboard.down('d');await page.waitForTimeout(620);await page.keyboard.up('d');await page.waitForTimeout(350);
  let phase='reject',attempts=[];
  await page.route('**/api/command',async route=>{const b=route.request().postDataJSON();if(b.action!=='gather')return route.continue();attempts.push(b);
    if(phase==='reject'){phase='lose';return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({detail:'测试：采集暂未提交，请重试'})});}
    if(phase==='lose'){phase='normal';await route.fetch();return route.abort('failed');}return route.continue();});
  await page.keyboard.press('e');await until(page,s=>s.error.includes('暂未提交'));assert.equal((await read(page)).inventory.wood,0);
  await page.keyboard.press('e');s=await until(page,s=>s.inventory.wood===3&&!s.busy);assert.equal(s.stamina.current,96);
  assert.equal(attempts.length,3);assert.equal(attempts[1].request_id,attempts[2].request_id);checks.push('rejected gather preserves inventory; lost response replay consumes stamina once');
  await page.screenshot({path:`${out}/world-desktop.png`});
  metrics.localHeadlessRafFps=await page.evaluate(()=>new Promise(resolve=>{let first=0,count=0;function sample(t){if(!first)first=t;if(++count===31)resolve(Math.round(30000/(t-first)));else requestAnimationFrame(sample);}requestAnimationFrame(sample);}));
  await page.keyboard.press('i');await until(page,s=>s.mode==='inventory');await click(page,'item-wood');await click(page,'assign');s=await read(page);assert.equal(s.quick[0],'wood');assert.equal(s.inventory.wood,3);
  const position={...s.player};await page.keyboard.down('d');await page.waitForTimeout(300);await page.keyboard.up('d');assert.deepEqual((await read(page)).player,position);
  await page.screenshot({path:`${out}/inventory-desktop.png`});checks.push('selection and quick assignment do not consume items; modal owns keyboard');
  await page.keyboard.press('Escape');await page.keyboard.press('l');await until(page,s=>s.mode==='life');await page.screenshot({path:`${out}/life-desktop.png`});await page.keyboard.press('Escape');
  await go(page,136,440);await page.keyboard.press('e');s=await until(page,s=>s.inventory.seed===5&&!s.busy&&s.plotPresentation.plot_0==='growing');assert.ok(s.plots.plot_0);await page.screenshot({path:`${out}/planted-desktop.png`});checks.push('real planting decrements one seed, persists a server crop and displays its seedling');
  await page.reload();await page.waitForFunction(()=>typeof window.render_game_to_text==='function');await until(page,s=>s.loaded);await click(page,'start');s=await until(page,s=>s.mode==='world'&&!s.busy);assert.equal(s.saveId,save);assert.equal(s.inventory.seed,5);assert.equal(s.inventory.wood,3);assert.ok(s.plots.plot_0);assert.equal(s.quick[0],'wood');checks.push('reload restores the same server save and local quick bindings');
  // Deterministic NPC-time fixture is limited to this task's isolated database.
  const fixture=spawnSync('backend/.venv/bin/python',['-c',`import os,copy,time\nfrom sqlalchemy import select\nfrom app.db import Session\nfrom app.models import Player\nassert os.environ['DATABASE_URL'].endswith('/output/cocos-migration/preview.db')\nwith Session.begin() as db:\n p=db.get(Player,'${save}');s=copy.deepcopy(p.state);s['world_clock'].update(elapsed=187.5,updated_at=time.time(),running_until=0);p.state=s`],{env:{...process.env,PYTHONPATH:'backend',DATABASE_URL:`sqlite:///${process.cwd()}/output/cocos-migration/preview.db`},encoding:'utf8'});
  assert.equal(fixture.status,0,fixture.stderr);await page.waitForTimeout(5500);await go(page,576,384);await page.keyboard.press('e');await until(page,s=>s.mode==='dialogue');await page.screenshot({path:`${out}/dialogue-desktop.png`});checks.push('actual NPC greeting at a deterministic isolated 08:30 fixture');await page.keyboard.press('Escape');
  await page.setViewportSize({width:844,height:390});await page.waitForTimeout(800);await page.keyboard.press('i');await until(page,s=>s.mode==='inventory');await page.screenshot({path:`${out}/inventory-landscape.png`});
  for(const b of (await read(page)).controls.filter(b=>['close','assign'].includes(b.id)||b.id.startsWith('item-')||b.id.startsWith('quick-'))){assert.ok(b.x-b.w/2>=0&&b.x+b.w/2<=844&&b.y-b.h/2>=0&&b.y+b.h/2<=390,`Visible ${b.id}`);}
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
    await tap('inventory');await until(touch,s=>s.mode==='inventory');await tap('item-seed');await tap('assign');assert.equal((await read(touch)).inventory.seed,6);
    await touch.screenshot({path:`${out}/inventory-landscape-touch.png`});await tap('close');await until(touch,s=>s.mode==='world');
    checks.push('DPR2 real touch events move, release, open inventory, assign without consumption and return');
  } finally { await touchContext.close(); }
  assert.deepEqual(errors,[]);await fs.writeFile(`${out}/smoke-result.json`,JSON.stringify({checks,errors,metrics,measurementScope:'Local headless Chromium only; not a physical-device performance claim.',final:await read(page)},null,2));console.log(JSON.stringify({checks,errors,metrics}));
}finally{await browser.close();}
