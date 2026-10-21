import {chromium} from 'playwright';
import {transform} from 'esbuild';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {browserConfig,launchBrowser,closeBrowser} from '../../../tools/cocos-browser-config.mjs';
const root=new URL('../../../',import.meta.url).pathname,test=await browserConfig('combat-framing');
const code=await transform(await fs.readFile(path.join(root,'shared/game/caveArt.ts'),'utf8'),{loader:'ts',format:'esm'});
const {monsterArt}=await import('data:text/javascript;base64,'+Buffer.from(code.code).toString('base64'));
const report={checks:[],captures:[],errors:[],observations:[],complete:false,fixture:'Independent deterministic combat positions/long telegraph, not a natural boss encounter or balance test.'};
const read=p=>p.evaluate(()=>JSON.parse(render_game_to_text()));
let browser,context,page,save;
function watch(){page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});}
async function until(predicate,label){for(let t=Date.now();Date.now()-t<30000;){const s=await read(page);if(predicate(s))return s;await page.waitForTimeout(80);}throw Error(label);}
async function action(id){await until(s=>s.controls.some(c=>c.id===id&&!c.disabled),id);await page.locator('[data-realquest-control="'+id+'"]').focus();await page.keyboard.press('Enter');await page.waitForTimeout(150);}
async function load(){await page.goto(test.baseURL);await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(render_game_to_text()).loaded&&!document.getElementById('rq-boot'),null,{timeout:45000});await action('start');await until(s=>s.mode==='world'&&s.connection==='ready'&&!s.busy&&!s.pendingAction,'world');}
async function seed(player,enemy){
 await page.goto('about:blank');
 execFileSync(path.join(root,'backend/.venv/bin/python'),['-c',`import json,sqlite3,sys,time,uuid
sys.path.insert(0,'clients/cocos/tools');from test_guard import assert_fixture
p,key,player,enemy=sys.argv[1:];assert_fixture(p);c=sqlite3.connect(p)
s=json.loads(c.execute('select state from players where id=?',(key,)).fetchone()[0]);s['location']='cave_5';s['position']=json.loads(player);s['revision']+=1
s['inventory']['glow_staff']=1
s['village_combat'].update(equipped='glow_staff',spark_learned=True,encounter=str(uuid.uuid4()),input_seq=0,time=0,last_tick=0,cast=None,effects=[],projectiles=[],floors={'5':[dict(id='5-0',kind='boss',**json.loads(enemy),hp=100,phase='windup',until=1000,ready=1000,tx=s['position']['x'],ty=s['position']['y'],move=2,style='sweep')]})
s['world_clock'].update(updated_at=time.time(),running_until=0)
sys.path.insert(0,'backend');from app.daynight import clock_view
s['village_combat']['day']=clock_view(s,time.time())['day']
c.execute('update players set state=? where id=?',(json.dumps(s),key));c.commit();c.close()`,test.database,save,JSON.stringify(player),JSON.stringify(enemy)],{cwd:root});
 await load();await page.keyboard.press('t');await until(s=>s.combatTarget==='5-0','native target selection');await page.waitForTimeout(500);
}
function actorRects(s){
 const z=s.camera.zoom,screen=(x,y,w,h)=>({x:s.camera.width/2+s.camera.x+x*z,y:s.camera.height/2-s.camera.y+y*z,w:w*z,h:h*z});
 const player=screen(s.player.x-16,s.player.y-128/3,32,128/3),enemy=s.combat.enemies.find(e=>e.id==='5-0');
 const points=monsterArt(enemy,s.combat.time,true).flatMap(m=>m.kind==='rect'?[{x:m.x,y:m.y},{x:m.x+m.w,y:m.y+m.h}]:m.kind==='ellipse'?[{x:m.x-m.w/2,y:m.y-m.h/2},{x:m.x+m.w/2,y:m.y+m.h/2}]:m.points);
 const minX=Math.min(...points.map(p=>p.x)),maxX=Math.max(...points.map(p=>p.x)),minY=Math.min(...points.map(p=>p.y)),maxY=Math.max(...points.map(p=>p.y));
 return {player,boss:screen(enemy.x+minX,enemy.y+minY,maxX-minX,maxY-minY)};
}
function geometry(s){
 const boxes=[...s.hudRegions,...s.controls].map(c=>({...c,x:c.x-c.w/2,y:c.y-c.h/2}));
 const actors=actorRects(s),issues=[];
 if(!['x','y','zoom'].every(key=>Number.isFinite(s.camera[key])))issues.push('nonfinite camera');
 const mapLeft=s.camera.width/2+s.camera.x,mapRight=mapLeft+s.map.width*s.camera.zoom;
 const expectedSide=Math.max(0,(s.camera.width-s.map.width*s.camera.zoom)/2);
 if(mapLeft>expectedSide+.01||s.camera.width-mapRight>expectedSide+.01)issues.push('asymmetric horizontal void outside the authored room');
 for(const [name,a] of Object.entries(actors)){
  if(a.x<0||a.y<0||a.x+a.w>s.camera.width||a.y+a.h>s.camera.height)issues.push(name+' clipped by viewport');
  for(const box of boxes)if(a.x<box.x+box.w&&a.x+a.w>box.x&&a.y<box.y+box.h&&a.y+a.h>box.y)issues.push(name+' obscured by '+box.id);
 }
 return {actors,issues,mapFrame:{left:mapLeft,right:mapRight,expectedSide}};
}
async function capture(label){const s=await read(page),g=geometry(s);await page.screenshot({path:path.join(test.directory,label+'.png')});await fs.writeFile(path.join(test.directory,label+'.json'),JSON.stringify({state:s,...g},null,2));report.captures.push(label+'.png');report.observations.push({label,camera:s.camera,...g});return {s,g};}
try{
 browser=await launchBrowser(chromium,{headless:true});context=await browser.newContext({viewport:{width:740,height:360},reducedMotion:'reduce'});page=await context.newPage();
 watch();
 await load();save=(await read(page)).saveId;
 for(const [label,p,e] of [['north',{x:320,y:300},{x:400,y:224}],['south',{x:320,y:180},{x:400,y:256}],['west',{x:400,y:256},{x:304,y:240}],['edge',{x:576,y:352},{x:512,y:304}]]){
  await seed(p,e);const original=await read(page);
  for(const size of [{width:740,height:360},{width:844,height:390},{width:1024,height:768},{width:1440,height:900},{width:1920,height:1080}]){
   await page.setViewportSize(size);await page.waitForTimeout(500);const {s,g}=await capture(label+'-'+size.width);
   assert.deepEqual(g.issues,[],label+' '+size.width+': '+g.issues.join(', '));assert.equal(s.saveId,save);assert.deepEqual(s.savedPosition,original.savedPosition);assert.deepEqual(s.inventory,original.inventory);assert.deepEqual(s.points,original.points);assert.equal(s.combat.enemies[0].hp,100);
   if(size.width>=1000)assert.equal(s.camera.zoom,2.15,'desktop retains ordinary camera scale');
  }
  report.checks.push(label+': actual player/guardian art and HP remain inside viewport and clear of all native controls/status panels across five sizes; selection/resize preserve save, position, possessions, points and enemy HP');
 }
 await page.setViewportSize({width:740,height:360});await seed({x:320,y:300},{x:400,y:224});
 const selected=await read(page),enemy=selected.combat.enemies[0];
 await page.mouse.click(370+selected.camera.x+enemy.x*selected.camera.zoom,180-selected.camera.y+(enemy.y-10)*selected.camera.zoom);await page.waitForTimeout(300);
 let observed=await capture('mouse-selected');assert.deepEqual(observed.g.issues,[]);assert.equal(observed.s.combatTarget,enemy.id);assert.equal(observed.s.route.length,0);assert.deepEqual(observed.s.player,selected.player);assert.equal(observed.s.combat.enemies[0].hp,100);
 report.checks.push('Native mouse selection after actual camera fit hits the original guardian, creates no walk route or attack and preserves world position');
 const beforeMove=await read(page);await page.keyboard.down('a');
 try{for(let i=0;i<3;i++){await page.waitForTimeout(100);observed=await capture('native-moving-'+i);assert.deepEqual(observed.g.issues,[]);}}
 finally{await page.keyboard.up('a');}
 await page.waitForTimeout(400);const stopped=await read(page);assert(stopped.player.x<beforeMove.player.x-5);await page.waitForTimeout(200);assert(Math.abs((await read(page)).player.x-stopped.player.x)<.5);
 await action('life');await until(s=>s.mode==='life'&&!s.pendingAction&&!s.busy,'Life owns input');const paused=await read(page);
 await page.keyboard.down('d');try{await page.waitForTimeout(200);}finally{await page.keyboard.up('d');}assert.deepEqual((await read(page)).player,paused.player);
 await page.screenshot({path:path.join(test.directory,'life-paused.png')});report.captures.push('life-paused.png');
 await page.keyboard.press('Escape');await until(s=>s.mode==='world'&&!s.pendingAction&&!s.busy,'return from Life');await page.waitForTimeout(400);observed=await capture('camera-returned');assert.deepEqual(observed.g.issues,[]);assert.equal(observed.s.saveId,save);assert.deepEqual(observed.s.inventory,beforeMove.inventory);assert.deepEqual(observed.s.points,beforeMove.points);assert.equal(observed.s.combat.enemies[0].hp,100);
 report.checks.push('Native movement remains framed, key release stops, direct Life owns world keys and Escape restores the same framed battle without spending resources');
 // Optional supplied skill client, adapted only to reuse this owned page/browser.
 // The normal Cocos/CI suite has no dependency on a developer skill installation.
 if(process.env.REALQUEST_FRAME_CLIENT){
  const source=await fs.readFile(process.env.REALQUEST_FRAME_CLIENT,'utf8'),digest=b=>crypto.createHash('sha256').update(b).digest('hex');
  const start=source.indexOf('  const browser = await chromium.launch({'),end=source.indexOf('  const consoleErrors =',start);
  const navigation=source.indexOf('  await page.addInitScript({ content: makeVirtualTimeShim() });'),canvas=source.indexOf('  let canvas =',navigation),tail=source.indexOf('main().catch((err) => {');
  assert(start>=0&&end>start&&navigation>end&&canvas>navigation&&tail>canvas);
  let adapted=source.slice(0,start)+'  const {browser,page}=globalThis.__rqFrameClient;\n'+source.slice(end,navigation)+source.slice(canvas,tail)+'export {main};\n';
  assert.equal(adapted.split('  await browser.close();').length,2);adapted=adapted.replace('  await browser.close();','  // The owning regression finally closes the browser.');
  const directory=path.join(test.directory,'frame-client');await fs.mkdir(directory);const worker=path.join(directory,'supplied-client.mjs');await fs.writeFile(worker,adapted);
  const args=process.argv;globalThis.__rqFrameClient={browser,page};
  try{process.argv=[process.execPath,worker,'--url',test.baseURL,'--iterations','2','--pause-ms','250','--screenshot-dir',directory,'--actions-json',JSON.stringify({steps:[{buttons:['left'],frames:6},{buttons:[],frames:4}]})];await (await import(pathToFileURL(worker))).main();}
  finally{process.argv=args;delete globalThis.__rqFrameClient;}
  assert.equal(digest(await fs.readFile(process.env.REALQUEST_FRAME_CLIENT,'utf8')),digest(source));assert(!(await fs.readdir(directory)).some(n=>n.startsWith('errors-')));
  report.frameClient={sourceSHA256:digest(source),adaptedSHA256:digest(adapted),adaptations:'Reuse owned browser/page; keep current seeded world; outer finally owns cleanup. Supplied choreography/capture/text/error logic unchanged; existing real-time advanceTime used.'};
  assert((await read(page)).player.x<observed.s.player.x-2);report.checks.push('Optional supplied web-game client executes two actual keyboard bursts and retains screenshots/text without unexpected errors on the owned isolated page');
 }
 const credential=await page.evaluate(()=>localStorage.getItem('realquest-session-v2'));await context.close();
 context=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:2,hasTouch:true,isMobile:true,reducedMotion:'reduce'});page=await context.newPage();watch();
 await page.addInitScript(({value,origin})=>{if(location.origin===origin)localStorage.setItem('realquest-session-v2',value);},{value:credential,origin:test.baseURL});await load();assert.equal((await read(page)).saveId,save);await seed({x:320,y:300},{x:400,y:224});
 const touch=await read(page),foe=touch.combat.enemies[0];await page.touchscreen.tap(422+touch.camera.x+foe.x*touch.camera.zoom,195-touch.camera.y+(foe.y-10)*touch.camera.zoom);await page.waitForTimeout(200);assert.deepEqual((await read(page)).player,touch.player);assert.equal((await read(page)).route.length,0);assert.equal((await read(page)).combat.enemies[0].hp,100);
 const cdp=await context.newCDPSession(page),right=(await read(page)).controls.find(c=>c.id==='right');
 try{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:81,x:right.x,y:right.y,radiusX:8,radiusY:8,force:1}]});await page.waitForTimeout(300);}
 finally{await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
 await page.waitForTimeout(400);observed=await capture('touch-framed');assert.deepEqual(observed.g.issues,[]);assert(observed.s.player.x>touch.player.x+5);const atRest=observed.s.player.x;await page.waitForTimeout(200);assert(Math.abs((await read(page)).player.x-atRest)<.5);assert.deepEqual(observed.s.inventory,touch.inventory);assert.deepEqual(observed.s.points,touch.points);assert.equal(observed.s.combat.enemies[0].hp,100);
 await page.setViewportSize({width:740,height:360});await page.waitForTimeout(500);assert.deepEqual((await capture('touch-740')).g.issues,[]);
 report.checks.push('Actual DPR2 touch selects without moving/attacking; held direction and release remain framed at both landscapes, preserve quantities and retain the same save');
 assert.deepEqual(report.errors,[]);report.complete=true;
}catch(e){report.error=String(e);process.exitCode=1;if(page&&!page.isClosed())try{await capture('failure');}catch{}}
finally{
 const closed=await Promise.allSettled([context?.close()]);
 try{if(browser)await closeBrowser(browser);}catch(e){closed.push({status:'rejected',reason:e});}
 report.cleanupErrors=closed.filter(r=>r.status==='rejected').map(r=>String(r.reason));
 if(report.cleanupErrors.length){report.complete=false;process.exitCode=1;}
 await fs.writeFile(path.join(test.directory,'result.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({complete:report.complete,checks:report.checks.length,error:report.error}));
}
