import {openSession} from './ui-navigation.mjs';
import {browserConfig,launchBrowser,closeBrowser} from '../../../tools/cocos-browser-config.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../../../package.json',import.meta.url));const {chromium}=require('playwright');
const test=await browserConfig('session');const base=test.baseURL,out=test.directory,checks=[],errors=[],expected=[],feedbackLayouts=[],refreshReleases=[];let expected401=0;
const browser=await launchBrowser(chromium,{headless:true});let p;
const read=p=>p.evaluate(()=>JSON.parse(window.render_game_to_text()));
async function until(p,fn,label='condition'){for(let i=0;i<200;i++){const s=await read(p);if(fn(s))return s;await p.waitForTimeout(60);}throw Error(label+JSON.stringify(await read(p)));}
async function click(p,id){if(id==='session'&&(await read(p)).mode==='world')return openSession(p);const s=await until(p,s=>s.controls.some(c=>c.id===id&&!c.disabled),id),c=s.controls.find(c=>c.id===id);await p.mouse.click(c.x,c.y);}
async function load(p){await p.goto(base);await p.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).loaded&&JSON.parse(window.render_game_to_text()).controls.some(c=>c.id==='start'&&!c.disabled));}
async function loadWithPendingArt(p){
 let release;const gate=new Promise(resolve=>release=resolve),pattern=/\/assets\/resources\/native\/.*\.png(?:\?|$)/;
 await p.route(pattern,async route=>{await gate;await route.continue();});
 try{
  await p.goto(base);await p.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).controls.some(c=>c.id==='traveler-name'));
  const s=await read(p);assert.equal(s.loaded,false);assert(s.controls.find(c=>c.id==='start').disabled);const field=s.controls.find(c=>c.id==='traveler-name');assert(field.disabled);
  await p.mouse.click(field.x,field.y);await p.keyboard.insertText('未就绪输入');
  assert.equal(await p.evaluate(()=>['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)),false);
  await p.screenshot({path:`${out}/registration-assets-pending.png`});
 }finally{release();await p.unrouteAll({behavior:'wait'});}
 await until(p,s=>s.loaded&&s.controls.some(c=>c.id==='start'&&!c.disabled)&&s.controls.some(c=>c.id==='traveler-name'&&!c.disabled),'asset-ready welcome');
 checks.push('pending artwork cannot acquire native text focus; readiness enables name and start without a blur or second click');
}
async function download(p,id){const d=p.waitForEvent('download');await click(p,id);const stream=await(await d).createReadStream(),chunks=[];for await(const c of stream)chunks.push(c);await until(p,s=>!s.busy);const file=JSON.parse(Buffer.concat(chunks).toString());if(id==='backup-before-restore'){assert((await read(p)).controls.find(c=>c.id==='confirm-restore').disabled);await click(p,'backup-saved');}return file;}
async function choose(p,file){const c=p.waitForEvent('filechooser');await click(p,'choose-recovery');await(await c).setFiles({name:'recovery.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(file))});await until(p,s=>s.controls.some(c=>c.id==='confirm-restore'));}
async function data(p){const token=await p.evaluate(()=>JSON.parse(localStorage.getItem('realquest-session-v2')).token);const response=await p.request.get(base+'/api/export',{headers:{Authorization:'Bearer '+token}});assert.equal(response.status(),200);return response.json();}
async function feedbackClear(s,phase){
 const f=s.feedback;feedbackLayouts.push({phase,viewport:s.camera,feedback:f,controls:s.controls,hudRegions:s.hudRegions});await fs.writeFile(`${out}/feedback-layout.json`,JSON.stringify(feedbackLayouts,null,2));
 assert(f&&f.text===(s.error||s.notice),'visible feedback matches the actual message');
 assert(f.x-f.w/2>=0&&f.x+f.w/2<=s.camera.width&&f.y-f.h/2>=0&&f.y+f.h/2<=s.camera.height,'feedback is inside the CSS viewport');
 for(const c of [...s.controls,...s.hudRegions])assert(!(Math.abs(c.x-f.x)<(c.w+f.w)/2-1&&Math.abs(c.y-f.y)<(c.h+f.h)/2-1),'feedback overlaps visible HUD '+c.id+' at '+s.camera.width);
}
try{
 const context=await browser.newContext({viewport:{width:1440,height:900}});p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()===401&&r.request().headers().authorization==='Bearer '+'x'.repeat(43)&&['/api/client-session','/api/state'].includes(new URL(r.url()).pathname)){expected401++;expected.push({fixture:'expired credential',url:r.url(),status:r.status()});}});p.on('console',e=>{if(e.type()==='error'){if(expected401&&/401/.test(e.text())){expected401--;expected.push(e.text());}else if(!/net::ERR_FAILED/.test(e.text()))errors.push(e.text());}});
 await loadWithPendingArt(p);await click(p,'traveler-name');await p.keyboard.insertText('会话旅人');let name='';p.on('request',r=>{if(r.url().endsWith('/api/command')){const b=r.postDataJSON();if(b.action==='create')name=b.data.name;}});await click(p,'start');const original=await until(p,s=>s.mode==='world'&&!s.busy&&s.connection==='ready');assert.equal(name,'会话旅人');
 const other=await(await p.request.post(base+'/api/client-session')).json(),headers={Authorization:'Bearer '+other.session_token};await p.request.post(base+'/api/command',{headers,data:{request_id:'session-other-create',save_id:other.save_id,action:'create',data:{name:'另一段旅程'}}});const otherFile=await(await p.request.post(base+'/api/recovery-file',{headers})).json();
 await click(p,'session');await choose(p,otherFile);let s=await read(p);assert(s.controls.find(c=>c.id==='confirm-restore').disabled);await p.screenshot({path:`${out}/backup-before-switch.png`});const originalFile=await download(p,'backup-before-restore');
 const second=await context.newPage();await load(second);await click(second,'start');await until(second,s=>s.mode==='world'&&!s.busy);await p.bringToFront();await until(second,s=>s.connection==='ready'&&!s.pendingAction);await until(p,s=>!s.busy&&s.connection==='ready'&&!s.pendingAction);await click(p,'confirm-restore');await until(p,s=>s.mode==='world'&&s.saveId===other.save_id&&!s.busy);assert.equal((await read(p)).inventory.gold,20);checks.push('native Chinese creation and different-save switching require a current recovery export and explicit saved acknowledgement');
 await second.bringToFront();await until(second,s=>s.connection==='unauthorized');const at=(await read(second)).player;await second.keyboard.down('d');await second.waitForTimeout(300);await second.keyboard.up('d');assert.deepEqual((await read(second)).player,at);await second.screenshot({path:`${out}/other-tab-session-guard.png`});await second.close();checks.push('another tab save switch blocks old page input and mutations');
 await p.bringToFront();await p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('realquest-session-v2'));s.token='x'.repeat(43);localStorage.setItem('realquest-session-v2',JSON.stringify(s));});await load(p);await click(p,'start');await until(p,s=>s.connection==='unauthorized'&&!s.busy);assert.equal((await read(p)).saveId,other.save_id);await click(p,'import-save');await choose(p,otherFile);await click(p,'confirm-restore');await until(p,s=>s.mode==='world'&&s.saveId===other.save_id&&!s.busy);checks.push('expired local credential stays bound to its save and recovers without a new guest');
 await click(p,'session');await choose(p,originalFile);assert((await read(p)).controls.find(c=>c.id==='confirm-restore').disabled);await download(p,'backup-before-restore');await click(p,'confirm-restore');await until(p,s=>s.mode==='world'&&s.saveId===original.saveId&&!s.busy);
 for(const [index,size] of [{width:740,height:360},{width:844,height:390},{width:1024,height:768},{width:1440,height:900},{width:1920,height:1080}].entries()){
  await p.setViewportSize(size);await until(p,s=>s.camera.width===size.width);
  const beforeMove=await data(p);let loss=0,replayed=false,holding=false,releaseRefresh;const attempts=[],refreshGate=new Promise(resolve=>releaseRefresh=resolve);refreshReleases.push(releaseRefresh);
  await p.route('**/api/state',async route=>{if(replayed&&!holding){holding=true;await refreshGate;}return route.continue();});
  await p.route('**/api/command',async route=>{
   const body=route.request().postDataJSON();
   if(body.action==='move'){attempts.push(body);if(loss<2){if(loss++===0)await route.fetch();return route.abort('failed');}replayed=true;}
   return route.continue();
  });
  const direction=index%2?'a':'d';await p.keyboard.down(direction);await p.waitForTimeout(300);await p.keyboard.up(direction);
  let uncertain=await until(p,s=>s.connection==='uncertain'&&s.controls.some(c=>c.id==='reconnect'&&!c.disabled),'rendered pending-save reconnect');
  const retry=uncertain.controls.find(c=>c.id==='reconnect'&&!c.disabled);assert(retry);
  for(const c of uncertain.controls.filter(c=>!c.disabled&&c.id!=='reconnect'))assert(!(Math.abs(c.x-retry.x)<(c.w+retry.w)/2-1&&Math.abs(c.y-retry.y)<(c.h+retry.h)/2-1),'reconnect overlaps '+c.id);
  assert(!uncertain.controls.some(c=>['tracker-open','tracker-toggle','return-open'].includes(c.id)));
  await p.screenshot({path:`${out}/network-feedback-${size.width}.png`});
  await feedbackClear(await until(p,s=>!!s.error&&s.feedback?.text===s.error,'visible pending-save error'),'uncertain');
  // Read-only navigation must retain a pointer route back to the recovery action.
  await p.keyboard.press('m');await until(p,s=>s.mode==='map'&&s.controls.some(c=>c.id==='close'));
  assert(!(await read(p)).controls.find(c=>c.id==='close').disabled);
  await p.screenshot({path:`${out}/network-panel-return-${size.width}.png`});
  await click(p,'close');await until(p,s=>s.mode==='world'&&s.connection==='uncertain');
  await click(p,'reconnect');for(let n=0;n<300&&!holding;n++)await p.waitForTimeout(10);assert(holding,'real post-replay authoritative refresh is held');await p.waitForTimeout(350);const duringRefresh=await read(p);assert(duringRefresh.busy);releaseRefresh();await until(p,s=>s.connection==='ready'&&!s.busy&&s.mode==='world'&&!s.pendingAction);
  const afterMove=await data(p);await fs.writeFile(`${out}/reconnect-refresh-${size.width}.json`,JSON.stringify({attempts,duringRefresh,after:await read(p),beforeMoves:beforeMove.ledger.filter(r=>r.action==='move').length,afterMoves:afterMove.ledger.filter(r=>r.action==='move').length},null,2));
  assert.equal(attempts.length,3);assert.deepEqual(attempts[0],attempts[1]);assert.deepEqual(attempts[1],attempts[2]);
  assert.equal(afterMove.ledger.filter(r=>r.action==='move').length,beforeMove.ledger.filter(r=>r.action==='move').length+1);assert(Math.abs(afterMove.state.position.x-attempts[0].data.x)<.02&&Math.abs(afterMove.state.position.y-attempts[0].data.y)<.02,'reconnection retains the acknowledged move position');assert.deepEqual(afterMove.state.inventory,beforeMove.state.inventory);for(const k of ['knowledge_points','health_points','skill_points'])assert.equal(afterMove.state[k],beforeMove.state[k]);
  await p.unroute('**/api/command');await p.unroute('**/api/state');await until(p,s=>s.feedback?.text===s.notice&&!s.error,'visible confirmed recovery');await p.screenshot({path:`${out}/network-recovered-${size.width}.png`});await feedbackClear(await read(p),'recovered');
 }
 checks.push('all five viewports retain reconnect/feedback usability; held post-replay state refresh emits no extra move, settles the identical request once and preserves its position/resources');
 await p.waitForTimeout(3500);await until(p,s=>!s.feedback,'confirmed notice expires after its existing display interval');
 const touchContext=await browser.newContext({viewport:{width:740,height:360},hasTouch:true,isMobile:true,deviceScaleFactor:2,reducedMotion:'reduce',storageState:await context.storageState()}),touch=await touchContext.newPage();
 touch.on('pageerror',e=>errors.push(e.message));touch.on('console',e=>{if(e.type()==='error'&&!/net::ERR_FAILED/.test(e.text()))errors.push(e.text());});
 const cdp=await touchContext.newCDPSession(touch);
 try{
  await load(touch);await click(touch,'start');await until(touch,s=>s.mode==='world'&&s.connection==='ready'&&!s.busy&&s.saveId===original.saveId);
  for(const [index,size] of [{width:740,height:360},{width:844,height:390}].entries()){
   await touch.setViewportSize(size);const before=await until(touch,s=>s.camera.width===size.width&&!s.pendingAction),id=index?'left':'right',pad=before.controls.find(c=>c.id===id&&!c.disabled);assert(pad);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:pad.x,y:pad.y}]});await touch.waitForTimeout(420);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   const after=await until(touch,s=>!s.pendingAction&&Math.abs(s.savedPosition.x-before.savedPosition.x)>4,'touch movement is saved');assert(index?after.savedPosition.x<before.savedPosition.x:after.savedPosition.x>before.savedPosition.x);
   await touch.waitForTimeout(250);const stopped=(await read(touch)).player;await touch.waitForTimeout(250);assert.deepEqual((await read(touch)).player,stopped,'release stops held touch');
   await touch.keyboard.press('m');await until(touch,s=>s.mode==='map');assert(!(await read(touch)).controls.some(c=>['up','left','down','right'].includes(c.id)));
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:pad.x,y:pad.y}]});await touch.waitForTimeout(180);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.deepEqual((await read(touch)).player,stopped,'map owns old pad coordinates');
   await touch.keyboard.press('Escape');await until(touch,s=>s.mode==='world'&&!s.busy);await touch.screenshot({path:`${out}/touch-pad-${size.width}-dpr2.png`});
  }
 }catch(error){await touch.screenshot({path:`${out}/touch-pad-failure.png`});throw error;}finally{await cdp.detach();await touchContext.close();}
 checks.push('repeated confirmed notices expire; DPR2 touch hold/release saves movement at both landscape sizes and map owns hidden pad input');
 assert.deepEqual(errors,[]);assert.equal(expected401,0);await fs.writeFile(`${out}/session-result.json`,JSON.stringify({checks,errors,expected},null,2));console.log(JSON.stringify({checks,errors,expected}));await context.close();
}catch(e){if(p&&!p.isClosed())await p.screenshot({path:`${out}/session-failure.png`});throw e;}finally{for(const release of refreshReleases)release();await closeBrowser(browser);}
