import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {openSync,closeSync} from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {verifyRelease,renderNginx} from './cocos-release.mjs';
import {runOwned} from './cocos-child.mjs';
import {browserConfig,launchBrowser,closeBrowser} from './cocos-browser-config.mjs';
import {currentBuildSource} from './cocos-build-info.mjs';
import {createShaper,calibrateShaper,validateFirefoxNetworkBrowser,evaluateFirefoxNetworkRun} from './cocos-network-proxy.mjs';
import {networkOptions,validateNetworkBrowser,validateNetworkBudget,evaluateNetworkRun} from './cocos-network-budget.mjs';

const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
if(Number(process.versions.node.split('.')[0])!==22)throw Error('Use Node22.');
const options=networkOptions(process.argv.slice(2)),isFirefox=options.browser==='firefox';
const firefoxExecutable=isFirefox?process.env.REALQUEST_FIREFOX_EXECUTABLE:undefined;
if(isFirefox){if(!firefoxExecutable)throw Error('Set REALQUEST_FIREFOX_EXECUTABLE to the native Firefox binary.');await fs.access(firefoxExecutable);assert((await fs.stat(firefoxExecutable)).isFile());}
const release=await verifyRelease(options.artifact);
const nginx=process.env.REALQUEST_NGINX||'nginx';
const probe=spawn(nginx,['-V']);let flags='';for(const stream of [probe.stdout,probe.stderr])stream.on('data',b=>flags+=b);await new Promise((resolve,reject)=>{probe.once('error',reject);probe.once('close',code=>code===0?resolve():reject(Error('Nginx -V failed')));});
const confPath=flags.match(/--conf-path=([^\s]+)/)?.[1];if(!confPath)throw Error('Cannot locate installed Nginx mime.types.');
const mime=path.join(path.dirname(confPath),'mime.types');await fs.access(mime);
const parent=path.join(root,'output/cocos-regression');await fs.mkdir(parent,{recursive:true});
const runDirectory=await fs.mkdtemp(path.join(parent,'run-')),directory=path.join(runDirectory,'suites/network');await fs.mkdir(directory,{recursive:true});
console.log('Network run: '+runDirectory);
const runId=crypto.randomUUID(),nonce=crypto.randomBytes(16).toString('hex'),controller=new AbortController();
const stop=()=>{controller.abort();if(browser)void closeBrowser(browser).catch(e=>errors.push('cancel cleanup: '+e.message));};
process.on('SIGINT',stop);process.on('SIGTERM',stop);process.on('SIGHUP',stop);
const services=[],checks=[],errors=[],captures=[],report={kind:isFirefox?'native-firefox-calibrated-proxy-network-profile':'native-nginx-network-profile',started:new Date().toISOString(),runId,runDirectory,directory,artifact:release.directory,artifactSHA256:release.artifactSHA256,active:release.active,nginx:flags.split('\n')[0],checks,captures,errors,complete:false};
const alive=pid=>{try{process.kill(-pid,0);return true;}catch(e){if(e.code==='ESRCH')return false;if(e.code==='EPERM')return true;throw e;}};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function service(command,args,env,name){
 const fd=openSync(path.join(directory,name+'.log'),'wx',0o600);
 const child=spawn(command,args,{cwd:root,env,detached:true,stdio:['ignore',fd,fd]});closeSync(fd);
 const item={pid:child.pid,name,started:new Date().toISOString(),child};services.push(item);child.on('error',e=>errors.push(name+': '+e.message));
 return child;
}
async function cleanup(){
 for(const item of services)if(item.pid&&alive(item.pid))process.kill(-item.pid,'SIGTERM');
 for(let i=0;i<70&&services.some(x=>x.pid&&alive(x.pid));i++)await sleep(50);
 for(const item of services)if(item.pid&&alive(item.pid))process.kill(-item.pid,'SIGKILL');
 for(let i=0;i<40&&services.some(x=>x.pid&&alive(x.pid));i++)await sleep(50);
 report.services=services.map(({child,...item})=>({...item,exitCode:child.exitCode,signal:child.signalCode,groupExited:!!item.pid&&!alive(item.pid)}));
 assert(report.services.every(x=>x.groupExited),'Owned API/Nginx process group survived cleanup');
}
async function port(){const server=net.createServer();await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});const n=server.address().port;await new Promise(r=>server.close(r));return n;}
async function wait(url,predicate=()=>true){for(let i=0;i<400;i++){if(controller.signal.aborted)throw Error('Delivery check cancelled');if(services.some(x=>x.child.exitCode!==null||x.child.signalCode!==null))throw Error('Owned service exited');try{const r=await fetch(url,{signal:AbortSignal.timeout(1000),redirect:'manual'});if(r.ok||r.status===302){if(await predicate(r))return r;}}catch(e){if(!/fetch failed|timeout|aborted/i.test(e.message))throw e;}await sleep(75);}throw Error('Service/selector readiness timeout: '+url);}
function check(name,evidence={}){checks.push({name,passed:true,...evidence});console.log('PASS '+name);}
let browser,context,page,shaper;
const budgetFile=path.join(root,isFirefox?'tools/cocos-firefox-network-budget-v1.json':'tools/cocos-network-budget-v1.json');
const budgetBytes=await fs.readFile(budgetFile),budget=validateNetworkBudget(JSON.parse(budgetBytes));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const results=[],budgetFailures=[];
report.budget=budget;report.budgetSHA256=hash(budgetBytes);report.results=results;report.budgetFailures=budgetFailures;
const frozenFiles=['tools/cocos-network-proxy.mjs','tools/cocos-firefox-network-budget-v1.json','tools/test-cocos-network.mjs','tools/cocos-network-budget-v1.json','tools/cocos-network-budget.mjs','tools/cocos-build-info.mjs','docs/migration/cocos-source-inventory.json','tools/cocos-release.mjs','tools/cocos-browser-config.mjs','tools/cocos-child.mjs','package.json','package-lock.json','backend/requirements.lock.txt'];
async function addBackend(folder){for(const e of await fs.readdir(path.join(root,folder),{withFileTypes:true})){const file=folder+'/'+e.name;if(e.isDirectory()&&!e.name.startsWith('__'))await addBackend(file);else if(e.isFile()&&file.endsWith('.py'))frozenFiles.push(file);}}
await addBackend('backend/app');await addBackend('backend/migrations');
async function freeze(){return Promise.all(frozenFiles.sort().map(async file=>({file,sha256:hash(await fs.readFile(path.join(root,file)))})));}
const originalInputs=await freeze();report.frozenInputs=originalInputs;
const build=release.releases.find(r=>r.id===release.active).build;
assert.equal((await currentBuildSource(build.identity)).sha256,build.sourceFingerprint,'Artifact must match current runtime sources');report.build=build;
report.scope=isFirefox?budget.scope:'Actual browser/version below; thresholds calibrated in task70 on Chrome155. Fixed desktop CDP limits over loopback, not physical devices, production SLA, TLS/DNS/packetloss or a p95 estimate.';
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
async function until(predicate,label,timeout=30000){for(const start=Date.now();Date.now()-start<timeout;){if(controller.signal.aborted)throw Error('Cancelled');const s=await read();if(predicate(s))return s;await page.waitForTimeout(90);}throw Error(label+': '+JSON.stringify(await read()));}
async function action(id){await until(s=>s.controls.some(c=>c.id===id&&!c.disabled),id);await page.locator('[data-realquest-control="'+id+'"]').focus();await page.keyboard.press('Enter');await page.waitForTimeout(100);}
async function field(id,value){await action(id);await page.waitForFunction(()=>['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)&&!document.activeElement.disabled);await page.keyboard.press('ControlOrMeta+A');await page.keyboard.insertText(value);await page.keyboard.press('Escape');await page.waitForTimeout(100);}
async function shot(label){await page.screenshot({path:path.join(directory,label+'.png')});captures.push(label+'.png');}
try{
 const basePort=await port();let apiPort=await port();while(apiPort===basePort)apiPort=await port();
 let originPort=basePort;if(isFirefox){originPort=await port();while([basePort,apiPort].includes(originPort))originPort=await port();}
 const baseURL='http://127.0.0.1:'+basePort,apiURL='http://127.0.0.1:'+apiPort,cookie='rq_network_'+runId.replaceAll('-',''),database=path.join(directory,'test.db');
 const html=path.join(release.directory,'html'),nginxFile=path.join(directory,'nginx.conf'),serverFile=path.join(directory,'server.conf');
 const safe=file=>{assert(!/["$\r\n;{}\\]/.test(file));return '"'+file+'"';};
 await fs.writeFile(serverFile,await renderNginx({active:release.active,directory:html,port:originPort,upstream:'127.0.0.1:'+apiPort,loopback:true,template:await fs.readFile(path.join(release.directory,'nginx.conf.template'),'utf8')}));
 await fs.writeFile(nginxFile,`pid ${safe(path.join(directory,'nginx.pid'))};\nerror_log ${safe(path.join(directory,'nginx-error.log'))};\nevents {worker_connections 256;}\nhttp {include ${safe(mime)}; default_type application/octet-stream; client_body_temp_path ${safe(path.join(directory,'client-temp'))}; proxy_temp_path ${safe(path.join(directory,'proxy-temp'))}; access_log ${safe(path.join(directory,'access.log'))}; include ${safe(serverFile)};}\n`);
 const env={...process.env,DATABASE_URL:'sqlite:///'+database,SESSION_COOKIE_NAME:cookie,COOKIE_SECURE:'false',ALLOWED_ORIGINS:baseURL,PYTHONDONTWRITEBYTECODE:'1'};
 delete env.REALQUEST_COCOS_TEST_CONFIG;delete env.REALQUEST_TEST_RUN_ID;
 const config={schema_version:1,repository:root,runDirectory,runId,nonce,controllerPID:process.pid,suite:'network',directory,database,baseURL,apiURL,cookie};
 await fs.writeFile(path.join(runDirectory,'run.json'),JSON.stringify({schema_version:1,runId,nonce,controllerPID:process.pid,createdAt:new Date().toISOString()}));
 await fs.writeFile(path.join(directory,'config.json'),JSON.stringify(config));
 if(isFirefox){
  report.calibration=await calibrateShaper({budget,signal:controller.signal,onProgress:s=>console.log('CALIBRATED '+s.profile+' '+s.mode+' '+s.elapsedMs.toFixed(1)+'ms')});
  await fs.writeFile(path.join(directory,'calibration.json'),JSON.stringify(report.calibration,null,2)+'\n');assert(report.calibration.complete,'Firefox shared-proxy calibration failed');
 }
 const python=path.join(root,'backend/.venv/bin/python');
 report.migration=await runOwned(python,['-B','-m','alembic','upgrade','head'],{cwd:path.join(root,'backend'),env,log:path.join(directory,'migration.log'),signal:controller.signal});assert.equal(report.migration.code,0);
 service(python,['-B','-m','uvicorn','app.main:app','--app-dir',path.join(root,'backend'),'--host','127.0.0.1','--port',String(apiPort)],env,'api');await wait(apiURL+'/api/health');
 report.syntax=await runOwned(nginx,['-t','-p',directory+'/', '-c',nginxFile],{cwd:root,env,log:path.join(directory,'nginx-syntax.log'),signal:controller.signal});assert.equal(report.syntax.code,0);
 service(nginx,['-p',directory+'/', '-c',nginxFile,'-g','daemon off;'],env,'nginx');await wait('http://127.0.0.1:'+originPort);
 if(isFirefox){shaper=await createShaper({port:basePort,upstreamPort:originPort,profile:budget.profiles[0]});report.proxy={port:basePort,upstreamPort:originPort,model:'Shared duplex HTTP TCP payload scheduling'};await wait(baseURL);}
 await fs.writeFile(path.join(directory,'ready.json'),JSON.stringify({run_id:runId,database,parent_pid:process.pid,port:basePort,api_port:apiPort,cookie,children:services.map(x=>x.pid)}));
 process.env.REALQUEST_COCOS_TEST_CONFIG=path.join(directory,'config.json');await browserConfig('network');
 const {chromium,firefox}=createRequire(new URL('../package.json',import.meta.url))('playwright');
 browser=await launchBrowser(isFirefox?firefox:chromium,{headless:true,handleSIGINT:false,handleSIGTERM:false,handleSIGHUP:false,...(isFirefox?{channel:'moz-firefox',executablePath:firefoxExecutable}:process.env.REALQUEST_CHROMIUM_EXECUTABLE?{executablePath:process.env.REALQUEST_CHROMIUM_EXECUTABLE}:{})},{handleSignals:false});
 if(controller.signal.aborted)throw Error('Cancelled during browser launch');report.browserVersion=browser.version();
 if(isFirefox)report.browserProduct={product:'Firefox/'+browser.version(),protocol:'WebDriver BiDi',channel:'moz-firefox'};
 else{
 const browserCDP=await browser.newBrowserCDPSession();report.browserProduct=await browserCDP.send('Browser.getVersion');await browserCDP.detach();
 validateNetworkBrowser(report.browserVersion,report.browserProduct.product);
 }
 for(const profile of budget.profiles)for(let sample=1;sample<=profile.samples;sample++){
  const label=profile.id+'-'+sample;if(shaper){await shaper.idle();shaper.reset(profile);}console.log('RUN '+label);
  context=await browser.newContext({viewport:{width:1440,height:900}});page=await context.newPage();
  if(isFirefox){const ua=await page.evaluate(()=>navigator.userAgent);validateFirefoxNetworkBrowser(browser.version(),ua);report.browserProduct.userAgent=ua;}
  await page.addInitScript(({buffer})=>{
   window.__qaKeys=[];for(const type of ['focus','blur','keydown','keyup','focusin','focusout','visibilitychange'])window.addEventListener(type,e=>window.__qaKeys.push({type,code:e.code,at:performance.now(),target:e.target?.tagName||'window',targetId:e.target?.id,active:document.activeElement?.id,focus:document.hasFocus(),visibility:document.visibilityState}),true);performance.setResourceTimingBufferSize(buffer);window.__qaNet={bufferFull:0,boot:[]};performance.addEventListener('resourcetimingbufferfull',()=>window.__qaNet.bufferFull++);
   let seen=false,last='';const observer=new MutationObserver(()=>{const el=document.getElementById('rq-boot');if(!el&&!seen)return;const value=el?.dataset.state||'removed';if(value!==last){window.__qaNet.boot.push({phase:value,at:performance.now()});last=value;}if(el)seen=true;else observer.disconnect();});observer.observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['data-state']});
  },{buffer:budget.resourceTimingBuffer});
  page.on('pageerror',e=>errors.push(label+': '+e.message));page.on('console',m=>{if(m.type()==='error')errors.push(label+': '+m.text());});
  let rows=[],current=new Map(),cdp,rules,navigating=false,closingContext=false;
  if(isFirefox){
   page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(baseURL+'/'))errors.push(label+': unshaped page request '+new URL(r.url()).origin);if(r.url().startsWith(baseURL+'/')){const row={path:new URL(r.url()).pathname,method:r.method(),at:Date.now()};rows.push(row);current.set(r,row);}});
   page.on('response',r=>{const row=current.get(r.request());if(row){const h=r.headers();Object.assign(row,{status:r.status(),mime:h['content-type'],cacheControl:h['cache-control'],encoding:h['content-encoding']});if(row.status>=400)errors.push(label+': HTTP'+row.status+' '+row.path);}});
   page.on('requestfinished',r=>{const row=current.get(r);if(row)row.finished=Date.now();});
   page.on('requestfailed',r=>{const row=current.get(r);if(row)row.failed=r.failure();if(navigating&&!closingContext)errors.push(label+': '+r.failure()?.errorText+' '+row?.path);});
  }else{
  cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:false});
  const conditions={urlPattern:'',latency:profile.latencyMs,downloadThroughput:profile.downloadBytesPerSec,uploadThroughput:profile.uploadBytesPerSec};
  rules=await cdp.send('Network.emulateNetworkConditionsByRule',{offline:false,matchedNetworkConditions:[conditions]});assert.equal(rules.ruleIds.length,1);
  cdp.on('Network.requestWillBeSent',e=>{if(!e.request.url.startsWith(baseURL))return;const old=current.get(e.requestId);if(old&&e.redirectResponse){old.status=e.redirectResponse.status;old.encodedDataLength=e.redirectResponse.encodedDataLength;old.redirect=true;}const row={id:e.requestId,path:new URL(e.request.url).pathname,type:e.type,method:e.request.method,at:e.timestamp};rows.push(row);current.set(e.requestId,row);});
  cdp.on('Network.requestWillBeSentExtraInfo',e=>{const r=current.get(e.requestId);if(r)r.appliedNetworkConditionsId=e.appliedNetworkConditionsId;});
  cdp.on('Network.requestServedFromCache',e=>{const r=current.get(e.requestId);if(r)r.fromCache=true;});
  cdp.on('Network.responseReceived',e=>{const r=current.get(e.requestId);if(!r)return;const h=Object.fromEntries(Object.entries(e.response.headers).map(([k,v])=>[k.toLowerCase(),v]));Object.assign(r,{status:e.response.status,mime:e.response.mimeType,cacheControl:h['cache-control'],encoding:h['content-encoding'],fromDiskCache:e.response.fromDiskCache,fromServiceWorker:e.response.fromServiceWorker});if(e.response.status>=400)errors.push(label+': HTTP'+e.response.status+' '+r.path);});
  cdp.on('Network.loadingFinished',e=>{const r=current.get(e.requestId);if(r){r.encodedDataLength=e.encodedDataLength;r.finished=e.timestamp;}});
  cdp.on('Network.loadingFailed',e=>{const r=current.get(e.requestId);if(r)errors.push(label+': '+e.errorText+' '+r.path);});
  }
  async function navigate(kind){
   if(shaper){await shaper.idle();shaper.beginWindow(label+'-'+kind);navigating=true;}rows=[];current=new Map();const started=Date.now();const response=await page.goto(baseURL,{waitUntil:'domcontentloaded',timeout:120000});assert.equal(response.status(),200);
   const ready=page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).loaded&&!document.getElementById('rq-boot'),null,{timeout:120000});
   if(kind==='cold'&&profile.id.startsWith('constrained')&&sample===1){const done=await Promise.race([ready.then(()=>true),page.waitForTimeout(12500).then(()=>false)]);if(!done&&await page.locator('#rq-boot[data-state="slow"]').isVisible())await shot(label+'-actual-slow');}
   await ready;const elapsed=Date.now()-started;
   const observed=await page.evaluate(()=>({readyMs:performance.now(),boot:window.__qaNet.boot,bufferFull:window.__qaNet.bufferFull,navigation:performance.getEntriesByType('navigation').map(e=>({transferSize:e.transferSize,encodedBodySize:e.encodedBodySize,duration:e.duration})),resources:performance.getEntriesByType('resource').map(e=>({path:new URL(e.name).pathname,origin:new URL(e.name).origin,scheme:new URL(e.name).protocol,type:e.initiatorType,transferSize:e.transferSize,encodedBodySize:e.encodedBodySize,decodedBodySize:e.decodedBodySize,duration:e.duration}))}));
   let metrics;
   if(shaper){
    await page.waitForTimeout(200);const proxyWindow=await shaper.endWindow();navigating=false;
    assert.equal(observed.bufferFull,0);assert(observed.resources.filter(r=>/^https?:$/.test(r.scheme)).every(r=>r.origin===baseURL),'All HTTP page resources must use shaped origin');
    const captured=structuredClone(rows);assert(captured.every(r=>r.finished||r.status>=300&&r.status<400),'Every observed request finished');
    metrics={kind,elapsedMs:elapsed,readyMs:observed.readyMs,httpBytes:proxyWindow.downstreamBytes,upstreamHttpBytes:proxyWindow.upstreamBytes,requests:captured.length,cachedRequests:observed.resources.filter(r=>r.transferSize===0&&r.encodedBodySize>0).length,gzipResponses:captured.filter(r=>r.encoding==='gzip').length,performance:observed,network:captured,proxyWindow};
    if(kind==='cold')assert(metrics.gzipResponses>0&&metrics.cachedRequests===0);else assert(metrics.cachedRequests>0);
   }else{
   assert.equal(observed.bufferFull,0);const captured=structuredClone(rows);assert(captured.every(r=>r.finished||r.redirect),'Every requested resource finished before welcome ready');
   metrics={kind,elapsedMs:elapsed,readyMs:observed.readyMs,httpBytes:captured.reduce((n,r)=>n+(r.encodedDataLength||0),0),requests:captured.length,cachedRequests:captured.filter(r=>r.fromCache||r.fromDiskCache).length,gzipResponses:captured.filter(r=>r.encoding==='gzip').length,ruleApplied:captured.filter(r=>r.appliedNetworkConditionsId===rules.ruleIds[0]).length,performance:observed,network:captured};
   assert(metrics.ruleApplied>0);if(kind==='cold')assert(metrics.gzipResponses>0);else assert(metrics.cachedRequests>0,'Warm navigation must exercise actual HTTP cache');
   }
   console.log('MEASURE '+label+' '+kind+' '+Math.round(metrics.readyMs)+'ms '+metrics.httpBytes+' HTTP bytes '+metrics.requests+' requests');return metrics;
  }
  const result={label,profile,sample,cold:await navigate('cold')};results.push(result);if(sample===1)await shot(label+'-cold-welcome');
  await action('start');await until(s=>s.mode==='world'&&s.connection==='ready'&&!s.busy&&!s.pendingAction,'fresh world');await page.waitForFunction(()=>document.activeElement?.id==='GameCanvas',null,{timeout:5000});const save=(await read()).saveId,credential=await page.evaluate(()=>localStorage.getItem('realquest-session-v2'));
  async function exported(){const a=JSON.parse(credential);const r=await context.request.get(baseURL+'/api/export',{headers:{Authorization:'Bearer '+a.token}});assert.equal(r.status(),200);return r.json();}
  async function inputState(label){return page.evaluate(label=>({label,at:performance.now(),focus:document.hasFocus(),visibility:document.visibilityState,active:{id:document.activeElement?.id,tag:document.activeElement?.tagName},state:JSON.parse(render_game_to_text()),events:window.__qaKeys}),label);}
  const initial=(await exported()).state,x=(await read()).player.x;result.input={before:await inputState('before-native-d')};await page.keyboard.down('d');try{await page.waitForTimeout(250);}finally{await page.keyboard.up('d');}result.input.immediate=await inputState('after-d-up');
  try{await until(s=>s.savedPosition.x>x&&s.connection==='ready'&&!s.busy&&!s.pendingAction,'real movement saved');result.firstMovePassed=true;}catch(e){result.firstMovePassed=false;result.input.failure=await inputState('first-no-move');errors.push(label+': first native movement failed');await shot(label+'-native-first-no-move');await page.keyboard.down('d');try{await page.waitForTimeout(250);}finally{await page.keyboard.up('d');}await until(s=>s.savedPosition.x>x&&s.connection==='ready'&&!s.busy&&!s.pendingAction,'second native d without extra focus');result.input.second=await inputState('second-native-d');}
  console.log('INPUT '+label+' '+JSON.stringify({firstMovePassed:result.firstMovePassed,focus:result.input.before.focus,active:result.input.before.active,immediate:result.input.immediate.state.player}));
  await action('life');await until(s=>s.mode==='life'&&!s.pendingAction,'Life pause');await action('study-new');await field('study-title','网络研习 '+label);await field('study-minutes','12');await action('save-study');await until(s=>s.studyTasks.length===1&&!s.pendingAction&&!s.busy,'one study under profile');
  const beforeWarm=await exported();assert.equal(beforeWarm.ledger.filter(r=>r.action==='study_create').length,1);assert.deepEqual(beforeWarm.state.inventory,initial.inventory);for(const key of ['knowledge_points','health_points','skill_points'])assert.equal(beforeWarm.state[key],initial[key]);if(sample===1)await shot(label+'-one-study');
  result.warm=await navigate('warm');assert.equal(await page.evaluate(()=>localStorage.getItem('realquest-session-v2')),credential);await action('start');await until(s=>s.mode==='world'&&s.connection==='ready'&&!s.pendingAction&&!s.busy,'warm original guest');assert.equal((await read()).saveId,save);assert.equal((await read()).studyTasks.length,1);
  const after=await exported();assert.equal(after.ledger.filter(r=>r.action==='study_create').length,1);assert.deepEqual(after.state.inventory,initial.inventory);assert.deepEqual(after.state.position,beforeWarm.state.position);for(const key of ['knowledge_points','health_points','skill_points'])assert.equal(after.state[key],initial[key]);result.sameSave=true;result.studyCreateReceipts=1;result.originalResourcesPreserved=true;
  await action('life');await until(s=>!s.pendingAction&&!s.busy,'pause before close');if(sample===1)await shot(label+'-warm-same-save');
  if(cdp)await cdp.detach();closingContext=true;await context.close();context=null;check(label+' cold/warm actual game and original-save record integrity');
  await fs.writeFile(path.join(directory,'partial-result.json'),JSON.stringify(report,null,2)+'\n');
 }
 assert.deepEqual(await freeze(),originalInputs);assert.equal((await verifyRelease(release.directory)).artifactSHA256,release.artifactSHA256);assert.equal((await currentBuildSource(build.identity)).sha256,build.sourceFingerprint);budgetFailures.push(...(isFirefox?evaluateFirefoxNetworkRun:evaluateNetworkRun)(report,budget));
 report.behaviorComplete=true;report.complete=budgetFailures.length===0;if(budgetFailures.length)process.exitCode=1;
}catch(e){report.error=String(e);report.errorStack=e.stack;report.complete=false;process.exitCode=1;if(page&&!page.isClosed())try{await shot('failure');await fs.writeFile(path.join(directory,'failure-state.json'),JSON.stringify(await read(),null,2));}catch{}}
finally{
 try{try{if(context)await context.close();}finally{if(browser)await closeBrowser(browser);}}catch(e){errors.push('browser cleanup: '+e.message);}
 try{if(shaper){report.proxyCleanup=await shaper.close();assert.deepEqual(report.proxyCleanup.errors,[]);}}catch(e){errors.push('proxy cleanup: '+e.message);}
 try{await cleanup();}catch(e){errors.push('service cleanup: '+e.message);}
 process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);process.removeListener('SIGHUP',stop);report.cancelled=controller.signal.aborted;
 if(errors.length||report.cancelled){report.complete=false;process.exitCode=1;}
 report.errors=errors;report.finished=new Date().toISOString();await fs.writeFile(path.join(directory,'result.json'),JSON.stringify(report,null,2)+'\n');await fs.writeFile(path.join(runDirectory,'result.json'),JSON.stringify(report,null,2)+'\n');console.log('Network report: '+path.join(directory,'result.json'));
}
