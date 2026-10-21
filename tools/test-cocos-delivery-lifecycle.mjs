// Infrastructure probes for the standalone delivery owner, not game coverage.
import fs from 'node:fs/promises';import {openSync,closeSync} from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import assert from 'node:assert/strict';import {spawn,execFile} from 'node:child_process';import {promisify} from 'node:util';import {fileURLToPath} from 'node:url';
import {verifyRelease} from './cocos-release.mjs';import {finishBrowserProcesses} from './cocos-browser-cleanup.mjs';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url))),runs=path.join(root,'output/cocos-regression'),exec=promisify(execFile),pause=ms=>new Promise(r=>setTimeout(r,ms));
const modes=['normal','interrupt','terminate','hangup','startup-cancel','service-exit'];
async function identity(pid){const text=(await exec('ps',['-p',String(pid),'-o','pid=,pgid=,lstart=,command=']).catch(e=>{if(e.code===1)return {stdout:''};throw e;})).stdout.trim();return text||null;}
const groupAlive=pid=>{try{process.kill(-pid,0);return true;}catch(e){if(e.code==='ESRCH')return false;throw e;}};
async function json(file){try{return JSON.parse(await fs.readFile(file,'utf8'));}catch(e){if(e.code==='ENOENT'||e instanceof SyntaxError)return null;throw e;}}

export async function probeDelivery(artifact,mode,directory,signal){
 if(Number(process.versions.node.split('.')[0])!==22)throw Error('Use Node22');assert(modes.includes(mode));await verifyRelease(artifact);if(signal?.aborted)throw Error('Delivery lifecycle cancelled before launch');await fs.mkdir(runs,{recursive:true});await fs.mkdir(directory,{recursive:true});
 const before=new Set(await fs.readdir(runs)),log=path.join(directory,mode+'.log'),file=path.join(directory,mode+'.json'),fd=openSync(log,'wx',0o600),start=Date.now();
 const child=spawn(process.execPath,[path.join(root,'tools/test-cocos-delivery.mjs'),'--artifact',artifact],{cwd:root,env:process.env,detached:true,stdio:['ignore',fd,fd]});closeSync(fd);
 let closed=false,exit,spawnError,run,config,ready,proof,action=false,serviceIdentities={};const report={mode,started:new Date(start).toISOString(),controllerPID:child.pid,log,complete:false,action:null,observedResidualServices:[],cleanupErrors:[]};
 const completion=new Promise(resolve=>{child.once('error',e=>{spawnError=e;closed=true;resolve();});child.once('close',(code,signal)=>{closed=true;exit={code,signal};resolve();});});
 const send=signal=>{try{process.kill(signal==='SIGKILL'?-child.pid:child.pid,signal);}catch(e){if(e.code!=='ESRCH')throw e;}};
 async function discover(){
  if(!run)for(const name of (await fs.readdir(runs)).filter(n=>n.startsWith('run-')&&!before.has(n))){const owner=await json(path.join(runs,name,'run.json'));if(owner?.controllerPID===child.pid){run=path.join(runs,name);break;}}
  if(!run)return;const suite=path.join(run,'suites/delivery');config=await json(path.join(suite,'config.json'));ready=await json(path.join(suite,'ready.json'));proof=await json(path.join(suite,'browser-lifecycle.json'));
  if(ready){assert.equal(ready.parent_pid,child.pid);for(const pid of ready.children)if(!serviceIdentities[pid])serviceIdentities[pid]=await identity(pid);}
 }
 try{
  while(!closed){
   if(signal?.aborted)throw Error('Delivery lifecycle cancelled');
   await discover();
   const browserStarted=proof?.some(p=>p.parentPID===child.pid);
   if(!action&&mode!=='normal'&&(mode==='startup-cancel'?ready&&!browserStarted:browserStarted)){
    report.observed={at:new Date().toISOString(),run,ready,proof,serviceIdentities};
    if(mode==='service-exit'){
     const pid=ready.children[0],row=await identity(pid);assert.equal(row,serviceIdentities[pid]);assert(row.includes('uvicorn app.main:app')&&row.includes('--port '+ready.api_port));assert.equal(Number(row.split(/\s+/)[1]),pid);process.kill(-pid,'SIGTERM');report.action={servicePID:pid,signal:'SIGTERM'};
    }else{const signal={interrupt:'SIGINT',terminate:'SIGTERM',hangup:'SIGHUP','startup-cancel':'SIGTERM'}[mode];process.kill(child.pid,signal);report.action={signal,childPID:child.pid};}
    action=true;
   }
   if(Date.now()-start>90000)throw Error('Delivery lifecycle deadline exceeded');await pause(20);
  }
  if(spawnError)throw spawnError;await completion;await discover();report.exit=exit;report.runDirectory=run;report.result=run?await json(path.join(run,'suites/delivery/result.json')):null;
  if(mode!=='normal')assert(action,'Expected phase was not observed');
 }catch(e){report.error=e.stack;}
 finally{
  try{if(!closed){send('SIGTERM');await Promise.race([completion,pause(3500)]);if(!closed){send('SIGKILL');await completion;}}}catch(e){report.cleanupErrors.push(String(e));}
  try{await discover();}catch(e){report.cleanupErrors.push(String(e));}
  report.exit=exit;report.runDirectory=run;report.result=run?await json(path.join(run,'suites/delivery/result.json')):null;
  if(config)try{report.browserCleanup=await finishBrowserProcesses(config,child.pid);}catch(e){report.cleanupErrors.push(String(e));}
  if(ready)for(const pid of ready.children){
   try{
    const row=await identity(pid);if(!row)continue;report.observedResidualServices.push({pid,identity:row});assert.equal(row,serviceIdentities[pid],'PID identity changed; preserve unrelated process');assert.equal(Number(row.split(/\s+/)[1]),pid);assert(row.includes(run+'/suites/delivery/')||row.includes('uvicorn app.main:app')&&row.includes('--port '+ready.api_port));process.kill(-pid,'SIGTERM');
   }catch(e){report.cleanupErrors.push(String(e));}
  }
  if(ready){for(let i=0;i<60&&ready.children.some(groupAlive);i++)await pause(50);for(const pid of ready.children)if(groupAlive(pid))report.cleanupErrors.push('Owned service group remains: '+pid);}
  report.finished=new Date().toISOString();report.complete=!report.error&&!report.cleanupErrors.length;await fs.writeFile(file,JSON.stringify(report,null,2)+'\n');
 }
 return report;
}

export function validateDeliveryProbe(r,mode){
 assert(modes.includes(mode));assert(r.complete,r.error||r.cleanupErrors.join('\n'));assert(r.result,'Standalone command must write a final report');
 assert.equal(r.observedResidualServices.length,0,'Standalone command leaked a service');assert(r.browserCleanup?.allKnownGroupsExited);
 assert.equal(r.browserCleanup.controllerCleaned.length,0,'Harness must not need to clean a browser');assert(r.browserCleanup.proof.every(b=>b.closed&&!b.forced&&b.exitCode===0));
 assert(Array.isArray(r.result.services),'Standalone command must write service cleanup states');assert(r.result.services.every(s=>s.groupExited));
 assert(Array.isArray(r.result.errors));assert(!r.result.errors.some(e=>/^(?:browser|service|cancel) cleanup:/.test(e)),'Standalone cleanup errors cannot count as an expected lifecycle failure');
 assert.equal((r.result.cleanupSignalErrors||[]).length,0,'Standalone cleanup signal errors must fail');
 if(mode==='normal'){
  assert.equal(r.exit.code,0);assert(r.result.complete&&!r.result.cancelled);assert.deepEqual(r.result.errors,[]);
  const required=[
   'actual-production-package-and-native-nginx-start',
   'noncached-entry-and-immutable-versioned-html-preserve-query',
   'all-runtime-heads-mime-cache-and-real-gzip',
   'missing-assets-are-real-uncached-404-with-no-game-html-fallback',
   'same-origin-api-cookie-nostore-and-cross-origin-rejection',
   'real-production-engine-cookie-continuation-move-life-and-landscape',
   'old-real-game-tab-reloads-from-retained-version-after-entry-switch',
   'root-entry-rollback-keeps-cookie-bearer-and-character-without-restore',
  ];
  assert(['explicit-http-fixture','two-real-engine-releases'].includes(r.result.entrySwitch?.kind));
  if(r.result.entrySwitch.kind==='two-real-engine-releases')required.push('second-real-engine-release-keeps-same-cookie-credential-and-stable-save');
  assert.deepEqual(r.result.checks.map(c=>c.name).sort(),required.sort());assert(r.result.checks.every(c=>c.passed===true));
 }
 else{assert.notEqual(r.exit.code,0);assert(!r.result.complete);assert.equal(r.result.cancelled,mode!=='service-exit');}
}

async function main(){
 if(process.argv.length!==4||process.argv[2]!=='--artifact')throw Error('Usage: cocos:test:delivery:lifecycle -- --artifact output/<release>');
 const artifact=(await verifyRelease(process.argv[3])).directory;await fs.mkdir(runs,{recursive:true});const directory=await fs.mkdtemp(path.join(runs,'delivery-lifecycle-')),results=[],controller=new AbortController(),stop=()=>controller.abort();console.log('Delivery lifecycle report: '+directory);
 for(const s of ['SIGINT','SIGTERM','SIGHUP'])process.on(s,stop);
 const inputs=['tools/test-cocos-delivery.mjs','tools/cocos-browser-config.mjs','tools/test-cocos-delivery-lifecycle.mjs'];
 const sources=()=>Promise.all(inputs.map(async file=>({file,sha256:crypto.createHash('sha256').update(await fs.readFile(path.join(root,file))).digest('hex')})));const originalSources=await sources();
 let complete=false;
 try{
  for(const mode of modes){const r=await probeDelivery(artifact,mode,directory,controller.signal);results.push({mode,file:path.join(directory,mode+'.json')});validateDeliveryProbe(r,mode);
   console.log('PASS '+mode);
  }assert.deepEqual(await sources(),originalSources);assert(!controller.signal.aborted);complete=true;
 }finally{for(const s of ['SIGINT','SIGTERM','SIGHUP'])process.removeListener(s,stop);await fs.writeFile(path.join(directory,'result.json'),JSON.stringify({kind:'standalone-delivery-lifecycle-not-game-coverage',complete,cancelled:controller.signal.aborted,sources:originalSources,results},null,2)+'\n');}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
