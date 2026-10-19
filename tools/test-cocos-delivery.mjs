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
import {browserConfig,launchBrowser,closeBrowser,validateChromiumProduct} from './cocos-browser-config.mjs';

const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
if(Number(process.versions.node.split('.')[0])!==22)throw Error('Use Node22.');
if(process.argv.length!==4||process.argv[2]!=='--artifact')throw Error('Usage: cocos:test:delivery -- --artifact output/<release>');
const release=await verifyRelease(process.argv[3]);
const nginx=process.env.REALQUEST_NGINX||'nginx';
const probe=spawn(nginx,['-V']);let flags='';for(const stream of [probe.stdout,probe.stderr])stream.on('data',b=>flags+=b);await new Promise((resolve,reject)=>{probe.once('error',reject);probe.once('close',code=>code===0?resolve():reject(Error('Nginx -V failed')));});
const confPath=flags.match(/--conf-path=([^\s]+)/)?.[1];if(!confPath)throw Error('Cannot locate installed Nginx mime.types.');
const mime=path.join(path.dirname(confPath),'mime.types');await fs.access(mime);
const parent=path.join(root,'output/cocos-regression');await fs.mkdir(parent,{recursive:true});
const runDirectory=await fs.mkdtemp(path.join(parent,'run-')),directory=path.join(runDirectory,'suites/delivery');await fs.mkdir(directory,{recursive:true});
const runId=crypto.randomUUID(),nonce=crypto.randomBytes(16).toString('hex'),controller=new AbortController();
const stop=()=>{controller.abort();if(browser)void closeBrowser(browser).catch(e=>errors.push('cancel cleanup: '+e.message));};
process.on('SIGINT',stop);process.on('SIGTERM',stop);process.on('SIGHUP',stop);
const services=[],checks=[],errors=[],captures=[],report={kind:'native-nginx-production-artifact',started:new Date().toISOString(),runId,runDirectory,directory,artifact:release.directory,artifactSHA256:release.artifactSHA256,active:release.active,nginx:flags.split('\n')[0],checks,captures,errors,complete:false};
const alive=pid=>{try{process.kill(-pid,0);return true;}catch(e){if(e.code==='ESRCH')return false;if(e.code==='EPERM')return true;throw e;}};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function service(command,args,env,name){
 const fd=openSync(path.join(directory,name+'.log'),'wx',0o600);
 const child=spawn(command,args,{cwd:root,env,detached:true,stdio:['ignore',fd,fd]});closeSync(fd);
 const item={pid:child.pid,name,started:new Date().toISOString(),child};services.push(item);child.on('error',e=>errors.push(name+': '+e.message));
 return child;
}
async function cleanup(){
 const failures=[];
 async function signal(item,kind){
  try{process.kill(-item.pid,kind);}catch(error){
   if(error.code==='ESRCH')return;
   if(error.code==='EPERM'){
    // Never accept a permission failure while the owned group still exists.
    await sleep(50);
    if(!alive(item.pid)){(report.cleanupObservations??=[]).push({pid:item.pid,signal:kind,errorCode:error.code,groupGoneAfterRecheck:true});return;}
   }
   throw error;
  }
 }
 async function requestStop(item,kind){try{await signal(item,kind);}catch(error){failures.push({pid:item.pid,signal:kind,errorCode:error.code,error:String(error)});}}
 try{
  for(const item of services)if(item.pid&&alive(item.pid))await requestStop(item,'SIGTERM');
  for(let i=0;i<70&&services.some(x=>x.pid&&alive(x.pid));i++)await sleep(50);
  for(const item of services)if(item.pid&&alive(item.pid))await requestStop(item,'SIGKILL');
  for(let i=0;i<40&&services.some(x=>x.pid&&alive(x.pid));i++)await sleep(50);
 }finally{
  report.services=services.map(({child,...item})=>({...item,exitCode:child.exitCode,signal:child.signalCode,groupExited:!!item.pid&&!alive(item.pid)}));
  report.cleanupSignalErrors=failures;
 }
 assert(report.services.every(x=>x.groupExited),'Owned API/Nginx process group survived cleanup');
 assert.deepEqual(failures,[],'Owned service signal failed; cleanup attempted all remaining groups');
}
async function port(){const server=net.createServer();await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});const n=server.address().port;await new Promise(r=>server.close(r));return n;}
async function wait(url,predicate=()=>true){for(let i=0;i<400;i++){if(controller.signal.aborted)throw Error('Delivery check cancelled');if(services.some(x=>x.child.exitCode!==null||x.child.signalCode!==null))throw Error('Owned service exited');try{const r=await fetch(url,{signal:AbortSignal.timeout(1000),redirect:'manual'});if(r.ok||r.status===302){if(await predicate(r))return r;}}catch(e){if(!/fetch failed|timeout|aborted/i.test(e.message))throw e;}await sleep(75);}throw Error('Service/selector readiness timeout: '+url);}
function check(name,evidence={}){checks.push({name,passed:true,...evidence});console.log('PASS '+name);}
let browser,context,page,config;
try{
 const basePort=await port(),apiPort=await port();assert.notEqual(basePort,apiPort);
 const baseURL='http://127.0.0.1:'+basePort,apiURL='http://127.0.0.1:'+apiPort,cookie='rq_delivery_'+runId.replaceAll('-','');
 const database=path.join(directory,'test.db'),html=path.join(directory,'html');
 await fs.cp(path.join(release.directory,'html'),html,{recursive:true,errorOnExist:true,force:false});
 const nginxFile=path.join(directory,'nginx.conf'),serverFile=path.join(directory,'server.conf');
 const template=await fs.readFile(path.join(release.directory,'nginx.conf.template'),'utf8');
 const server=active=>renderNginx({active,directory:html,port:basePort,upstream:'127.0.0.1:'+apiPort,loopback:true,template});
 await fs.writeFile(serverFile,await server(release.active));
 const safe=file=>{if(/["$\r\n;{}\\]/.test(file))throw Error('Unsafe local Nginx path');return '"'+file+'"';};
 await fs.writeFile(nginxFile,`pid ${safe(path.join(directory,'nginx.pid'))};\nerror_log ${safe(path.join(directory,'nginx-error.log'))};\nevents {worker_connections 256;}\nhttp {include ${safe(mime)}; default_type application/octet-stream; client_body_temp_path ${safe(path.join(directory,'client-temp'))}; proxy_temp_path ${safe(path.join(directory,'proxy-temp'))}; access_log ${safe(path.join(directory,'access.log'))}; include ${safe(serverFile)};}\n`);
 const env={...process.env,DATABASE_URL:'sqlite:///'+database,SESSION_COOKIE_NAME:cookie,COOKIE_SECURE:'false',ALLOWED_ORIGINS:baseURL,PYTHONDONTWRITEBYTECODE:'1'};
 delete env.REALQUEST_COCOS_TEST_CONFIG;delete env.REALQUEST_TEST_RUN_ID;
 const python=path.join(root,'backend/.venv/bin/python');
 const migration=await runOwned(python,['-B','-m','alembic','upgrade','head'],{cwd:path.join(root,'backend'),env,log:path.join(directory,'migration.log'),signal:controller.signal});assert.equal(migration.code,0);report.migration=migration;
 service(python,['-B','-m','uvicorn','app.main:app','--app-dir',path.join(root,'backend'),'--host','127.0.0.1','--port',String(apiPort)],env,'api');
 await wait(apiURL+'/api/health');
 const syntax=await runOwned(nginx,['-t','-p',directory+'/', '-c',nginxFile],{cwd:root,env,log:path.join(directory,'nginx-syntax.log'),signal:controller.signal});assert.equal(syntax.code,0);report.syntax=syntax;
 const master=service(nginx,['-p',directory+'/', '-c',nginxFile,'-g','daemon off;'],env,'nginx');
 await wait(baseURL);
 config={schema_version:1,repository:root,runDirectory,runId,nonce,controllerPID:process.pid,suite:'delivery',directory,database,baseURL,apiURL,cookie};
 await fs.writeFile(path.join(runDirectory,'run.json'),JSON.stringify({schema_version:1,runId,nonce,controllerPID:process.pid,createdAt:report.started}));
 await fs.writeFile(path.join(directory,'config.json'),JSON.stringify(config));
 await fs.writeFile(path.join(directory,'ready.json'),JSON.stringify({run_id:runId,database,parent_pid:process.pid,port:basePort,api_port:apiPort,cookie,children:services.map(x=>x.pid)}));
 process.env.REALQUEST_COCOS_TEST_CONFIG=path.join(directory,'config.json');await browserConfig('delivery');
 check('actual-production-package-and-native-nginx-start',{source:release.releases.find(r=>r.id===release.active).build.sourceFingerprint,files:release.records.length});
 const entry=await fetch(baseURL+'/?from=delivery',{redirect:'manual'});assert.equal(entry.status,302);assert.equal(entry.headers.get('cache-control'),'no-store');assert.equal(entry.headers.get('location'),'/releases/'+release.active+'/?from=delivery');
 const index=await fetch(baseURL+'/releases/'+release.active+'/');assert(index.headers.get('cache-control').includes('immutable'));assert.equal(index.headers.get('x-content-type-options'),'nosniff');assert((await index.text()).includes('GameCanvas'));
 check('noncached-entry-and-immutable-versioned-html-preserve-query');
 const version='/releases/'+release.active+'/',files=release.records.filter(x=>x.path.startsWith('html'+version)&&!x.path.endsWith('/release.json'));
 const types={'.js':/^(?:application|text)\/javascript/,'.css':/^text\/css/,'.json':/^application\/json/,'.png':/^image\/png/,'.webp':/^image\/webp/,'.wasm':/^application\/wasm/};
 for(let start=0;start<files.length;start+=16)await Promise.all(files.slice(start,start+16).map(async file=>{const response=await fetch(baseURL+file.path.slice(4),{method:'HEAD'});assert.equal(response.status,200,file.path);assert(response.headers.get('cache-control')?.includes('immutable'));const expected=types[path.extname(file.path)];if(expected)assert(expected.test(response.headers.get('content-type')||''),file.path+' MIME');}));
 const js=files.find(f=>f.path.endsWith('.js')&&f.bytes>1024),compressed=await fetch(baseURL+js.path.slice(4),{headers:{'Accept-Encoding':'gzip'}});assert.equal(compressed.headers.get('content-encoding'),'gzip');assert.match(compressed.headers.get('vary'),/Accept-Encoding/);assert.equal(crypto.createHash('sha256').update(Buffer.from(await compressed.arrayBuffer())).digest('hex'),js.sha256);
 check('all-runtime-heads-mime-cache-and-real-gzip',{files:files.length});
 for(const suffix of ['missing.js','missing.png','missing.wasm','missing.map']){const response=await fetch(baseURL+version+suffix);assert.equal(response.status,404);assert.equal(response.headers.get('cache-control'),'no-store');assert(!(await response.text()).includes('GameCanvas'));}
 const favicon=await fetch(baseURL+'/favicon.ico');assert.equal(favicon.status,204);assert.equal(favicon.headers.get('cache-control'),'no-store');assert.equal(favicon.headers.get('x-content-type-options'),'nosniff');assert.equal((await favicon.arrayBuffer()).byteLength,0);
 check('missing-assets-are-real-uncached-404-with-no-game-html-fallback',{legacyRootFavicon:{status:204,bodyBytes:0,noStore:true}});
 const {chromium}=createRequire(new URL('../package.json',import.meta.url))('playwright');
 if(controller.signal.aborted)throw Error('Cancelled before browser launch');
 browser=await launchBrowser(chromium,{headless:true,handleSIGINT:false,handleSIGTERM:false,handleSIGHUP:false,...(process.env.REALQUEST_CHROMIUM_EXECUTABLE?{executablePath:process.env.REALQUEST_CHROMIUM_EXECUTABLE}:{})},{handleSignals:false});
 if(controller.signal.aborted)throw Error('Cancelled during browser launch');
 report.browserVersion=browser.version();
 const browserCDP=await browser.newBrowserCDPSession();try{report.browserProduct=await browserCDP.send('Browser.getVersion');}finally{await browserCDP.detach();}
 validateChromiumProduct(report.browserVersion,report.browserProduct.product);
 context=await browser.newContext({viewport:{width:1440,height:900}});page=await context.newPage();
 page.on('pageerror',error=>errors.push(error.message));page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text());});page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
 const old=await context.request.post(baseURL+'/api/session',{data:{},headers:{Origin:baseURL}});assert.equal(old.status(),200);assert.match(old.headers()['set-cookie'],/HttpOnly/);assert.match(old.headers()['set-cookie'],/SameSite=strict/);assert.equal(old.headers()['cache-control'],'no-store');
 const original=await old.json();await context.request.post(baseURL+'/api/command',{headers:{Origin:baseURL},data:{request_id:'delivery-create',save_id:original.save_id,action:'create',data:{name:'交付接续旅人',appearance:3}}});
 const before=await(await context.request.get(baseURL+'/api/export')).json();
 const denied=await context.request.post(baseURL+'/api/session',{data:{},headers:{Origin:'https://untrusted.invalid'}});assert.equal(denied.status(),403);
 check('same-origin-api-cookie-nostore-and-cross-origin-rejection');
 const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
 async function until(predicate){for(let i=0;i<350;i++){if(controller.signal.aborted)throw Error('Cancelled');const s=await read();if(predicate(s))return s;await page.waitForTimeout(80);}throw Error('Game condition timeout: '+JSON.stringify(await read()));}
 async function click(id){const s=await until(s=>s.controls.some(c=>c.id===id&&!c.disabled)),c=s.controls.find(c=>c.id===id);await page.mouse.click(c.x,c.y);await page.waitForTimeout(100);}
 async function load(){await page.goto(baseURL);await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).loaded,{},{timeout:45000});}
 await load();assert(new URL(page.url()).pathname.startsWith(version));await click('import-save');await click('find-web-journey');await until(s=>s.recoverySource==='web');await click('confirm-restore');await until(s=>s.mode==='world'&&!s.busy);
 assert.equal((await read()).saveId,original.save_id);
 const auth=await page.evaluate(()=>JSON.parse(localStorage.getItem('realquest-session-v2')));
 const continued=await(await context.request.get(baseURL+'/api/export',{headers:{Authorization:'Bearer '+auth.token}})).json();
 const stable=state=>{const copy=structuredClone(state);delete copy.revision;delete copy.world_clock;return copy;};
 assert.deepEqual(stable(continued.state),stable(before.state));
 const fixedClock=state=>{const copy=structuredClone(state.world_clock);for(const key of ['elapsed','owner','running_until','updated_at'])delete copy[key];return copy;};
 assert.deepEqual(fixedClock(continued.state),fixedClock(before.state));
 assert.deepEqual(continued.ledger.slice(0,before.ledger.length),before.ledger);
 const resumed=continued.ledger.slice(before.ledger.length);assert(resumed.length>0&&resumed.every(r=>r.action==='world_resume'&&Object.keys(r.changes.inventory).length===0&&r.changes.xp===0));
 assert.equal(continued.state.revision,before.state.revision+resumed.length);

 const initial=(await read()).player;await page.keyboard.down('d');await page.waitForTimeout(300);await page.keyboard.up('d');await page.waitForTimeout(600);await until(s=>!s.busy&&!s.pendingAction&&s.connection==='ready');assert((await read()).player.x>initial.x);const savedMove=await(await context.request.get(baseURL+'/api/state',{headers:{Authorization:'Bearer '+auth.token}})).json();assert(savedMove.state.position.x>before.state.position.x);
 await page.screenshot({path:path.join(directory,'production-world-1440.png')});captures.push('production-world-1440.png');
 await page.keyboard.press('l');await until(s=>s.mode==='life');await page.setViewportSize({width:740,height:360});await until(s=>s.camera.width===740);await page.screenshot({path:path.join(directory,'production-life-740.png')});captures.push('production-life-740.png');await page.keyboard.press('Escape');await until(s=>s.mode==='world');
 check('real-production-engine-cookie-continuation-move-life-and-landscape',{saveID:original.save_id});
 const alternate=release.releases.find(r=>r.id!==release.active),nextID=alternate?.id||crypto.createHash('sha256').update('HTTP cache-switch fixture only').digest('hex');
 if(!alternate){const fixture=path.join(html,'releases',nextID);await fs.mkdir(fixture);await fs.writeFile(path.join(fixture,'index.html'),'<p>HTTP cache-switch fixture only; not a game release.</p>');}
 report.entrySwitch={kind:alternate?'two-real-engine-releases':'explicit-http-fixture',initial:release.active,next:nextID};
 await fs.writeFile(serverFile,await server(nextID));master.kill('SIGHUP');await wait(baseURL,r=>r.headers.get('location')==='/releases/'+nextID+'/');
 const oldTabURL=page.url();await page.reload();await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).loaded);await click('start');await until(s=>s.mode==='world'&&s.connection==='ready');assert.equal((await read()).saveId,original.save_id);assert.equal(page.url(),oldTabURL);
 await page.screenshot({path:path.join(directory,'old-tab-after-entry-switch.png')});captures.push('old-tab-after-entry-switch.png');
 check('old-real-game-tab-reloads-from-retained-version-after-entry-switch',report.entrySwitch);
 if(alternate){
  await until(s=>!s.busy&&!s.pendingAction);const beforeSwitch=await(await context.request.get(baseURL+'/api/export',{headers:{Authorization:'Bearer '+auth.token}})).json();
  await load();assert(new URL(page.url()).pathname.startsWith('/releases/'+alternate.id+'/'));await click('start');await until(s=>s.mode==='world'&&s.connection==='ready'&&!s.busy&&!s.pendingAction);assert.equal((await read()).saveId,original.save_id);
  const afterSwitch=await(await context.request.get(baseURL+'/api/export',{headers:{Authorization:'Bearer '+auth.token}})).json();assert.deepEqual(stable(afterSwitch.state),stable(beforeSwitch.state));assert.deepEqual(afterSwitch.ledger.slice(0,beforeSwitch.ledger.length),beforeSwitch.ledger);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('realquest-session-v2')).token),auth.token);assert.equal((await(await context.request.get(baseURL+'/api/state')).json()).save_id,original.save_id);
  await page.screenshot({path:path.join(directory,'retained-engine-version-continuation.png')});captures.push('retained-engine-version-continuation.png');check('second-real-engine-release-keeps-same-cookie-credential-and-stable-save', {release:alternate.id});
 }
 await fs.writeFile(serverFile,await server(release.active));master.kill('SIGHUP');await wait(baseURL,r=>r.headers.get('location')==='/releases/'+release.active+'/');await load();await click('start');await until(s=>s.mode==='world'&&s.connection==='ready');assert.equal((await read()).saveId,original.save_id);
 assert.deepEqual((await(await context.request.get(baseURL+'/api/export',{headers:{Authorization:'Bearer '+auth.token}})).json()).state.character,before.state.character);
 await page.screenshot({path:path.join(directory,'production-after-rollback.png')});captures.push('production-after-rollback.png');
 assert.deepEqual(errors,[]);check('root-entry-rollback-keeps-cookie-bearer-and-character-without-restore');report.complete=true;
}catch(error){report.error=String(error);report.complete=false;process.exitCode=1;}finally{
 try{try{if(context)await context.close();}finally{if(browser)await closeBrowser(browser);}}catch(e){errors.push('browser cleanup: '+e.message);}
 try{await cleanup();}catch(e){errors.push('service cleanup: '+e.message);}
 process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);process.removeListener('SIGHUP',stop);report.cancelled=controller.signal.aborted;
 if(errors.length||report.cancelled){report.complete=false;process.exitCode=1;}
 report.finished=new Date().toISOString();await fs.writeFile(path.join(directory,'result.json'),JSON.stringify(report,null,2)+'\n');console.log('Delivery report: '+path.join(directory,'result.json'));
}
