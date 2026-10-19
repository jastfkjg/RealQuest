// Optional compatibility/restore infrastructure; never starts or mutates a player DB.
import fs from 'node:fs/promises';import {openSync,closeSync} from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import assert from 'node:assert/strict';import {spawn,execFile} from 'node:child_process';import {promisify} from 'node:util';import {fileURLToPath} from 'node:url';
import {verifyBuild,buildPayload} from './cocos-build-info.mjs';import {finishBrowserProcesses} from './cocos-browser-cleanup.mjs';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url))),runs=path.join(root,'output/cocos-regression'),exec=promisify(execFile),pause=ms=>new Promise(r=>setTimeout(r,ms));
const modes=['normal','interrupt','terminate','hangup','startup-cancel','restored-current-cancel','legacy-upgrade-cancel','service-exit'];
async function json(f){try{return JSON.parse(await fs.readFile(f,'utf8'));}catch(e){if(e.code==='ENOENT'||e instanceof SyntaxError)return null;throw e;}}
async function row(pid){return(await exec('ps',['-p',String(pid),'-o','pid=,pgid=,lstart=,command=']).catch(e=>{if(e.code===1)return{stdout:''};throw e;})).stdout.trim();}
const groupAlive=pid=>{try{process.kill(-pid,0);return true;}catch(e){if(e.code==='ESRCH')return false;throw e;}};
async function databases(directory){
 const records=[];
 async function walk(d){for(const e of await fs.readdir(d,{withFileTypes:true})){const f=path.join(d,e.name);if(e.isDirectory())await walk(f);else if(e.isFile()&&['test.db','database.sqlite'].includes(e.name)){const r=await exec(path.join(root,'backend/.venv/bin/python'),['-B','tools/cocos_sqlite_backup.py','inspect','--database',f],{cwd:root,maxBuffer:2*1024*1024});records.push({file:f,snapshot:JSON.parse(r.stdout).snapshot});}}}
 await walk(directory);return records;
}

export async function probeRestore(build,webBuild,mode,directory,signal){
 assert(modes.includes(mode));await verifyBuild(path.resolve(root,'clients/cocos',build));const web=await fs.realpath(path.resolve(root,webBuild));assert(web.startsWith(root+path.sep));if(signal?.aborted)throw Error('Restore probe cancelled before launch');await fs.mkdir(runs,{recursive:true});await fs.mkdir(directory,{recursive:true});
 const before=new Set(await fs.readdir(runs)),log=path.join(directory,mode+'.log'),file=path.join(directory,mode+'.json'),fd=openSync(log,'wx',0o600),start=Date.now();
 const child=spawn(process.execPath,['tools/test-cocos-restore-browser.mjs','--build',build,'--web-build',web],{cwd:root,env:process.env,detached:true,stdio:['ignore',fd,fd]});closeSync(fd);
 let closed=false,exit,spawnError,run,config,ready,proof,action=false;const hosts=new Map(),report={mode,started:new Date(start).toISOString(),controllerPID:child.pid,log,complete:false,action:null,residualAfterGrace:[],cleanupErrors:[]};
 const done=new Promise(resolve=>{child.once('error',e=>{spawnError=e;closed=true;resolve();});child.once('close',(code,signal)=>{closed=true;exit={code,signal};resolve();});});
 const send=signal=>{try{process.kill(signal==='SIGKILL'?-child.pid:child.pid,signal);}catch(e){if(e.code!=='ESRCH')throw e;}};
 async function discover(){
  if(!run)for(const name of(await fs.readdir(runs)).filter(n=>n.startsWith('run-')&&!before.has(n))){const owner=await json(path.join(runs,name,'run.json'));if(owner?.controllerPID===child.pid)run=path.join(runs,name);}
  if(!run)return;const d=path.join(run,'suites/backup-restore');config=await json(d+'/config.json');proof=await json(d+'/browser-lifecycle.json');ready=await json(d+'/ready.json');
  for(const f of(await fs.readdir(d)).filter(n=>/^ready(?:-phase-\d+)?\.json$/.test(n))){const r=await json(path.join(d,f));if(!r)continue;assert.equal(r.parent_pid,child.pid);assert.equal(r.database,config.database);if(!hosts.has(r.pid)){const identities={};for(const p of[r.pid,...r.children])identities[p]=await row(p);hosts.set(r.pid,{ready:r,identities});}}
 }
 try{
  while(!closed){
   if(signal?.aborted)throw Error('Restore lifecycle cancelled');await discover();
   if(!action&&mode!=='normal'&&run){
    const d=path.join(run,'suites/backup-restore'),browserStarted=proof?.some(p=>p.parentPID===child.pid),phase1=await json(d+'/ready-phase-1.json'),phase2=await json(d+'/ready-phase-2.json');
    const observed=mode==='startup-cancel'?ready&&!browserStarted:mode==='restored-current-cancel'?ready&&phase1&&ready.pid!==phase1.pid&&!phase2:mode==='legacy-upgrade-cancel'?ready&&phase2&&ready.pid!==phase2.pid:browserStarted;
    if(observed){
     assert(ready,'Current host required');report.observed={at:new Date().toISOString(),run,ready,proof,archivedPhases:[phase1,phase2].filter(Boolean).map(p=>p.pid)};
     if(mode==='service-exit'){const pid=ready.children[0],r=await row(pid);assert.equal(r,hosts.get(ready.pid).identities[pid]);assert(r.includes('uvicorn app.main:app')&&r.includes('--port '+ready.api_port));process.kill(pid,'SIGTERM');report.action={pid,signal:'SIGTERM'};}
     else{const sig={interrupt:'SIGINT',terminate:'SIGTERM',hangup:'SIGHUP','startup-cancel':'SIGTERM','restored-current-cancel':'SIGTERM','legacy-upgrade-cancel':'SIGHUP'}[mode];send(sig);report.action={signal:sig,pid:child.pid};}action=true;
    }
   }
   if(Date.now()-start>210000)throw Error('Restore lifecycle deadline exceeded');await pause(20);
  }
  if(spawnError)throw spawnError;await done;await discover();if(mode!=='normal')assert(action,'Required restore phase not reached');
 }catch(e){report.error=e.stack;}
 finally{
  try{if(!closed){send('SIGTERM');await Promise.race([done,pause(3500)]);if(!closed){send('SIGKILL');await done;}}}catch(e){report.cleanupErrors.push(String(e));}
  try{await discover();}catch(e){report.cleanupErrors.push(String(e));}
  report.exit=exit;report.runDirectory=run;report.result=run?await json(path.join(run,'suites/backup-restore/result.json')):null;
  if(config)try{report.browserCleanup=await finishBrowserProcesses(config,child.pid);}catch(e){report.cleanupErrors.push(String(e));}
  for(let i=0;i<35&&[...hosts.keys()].some(groupAlive);i++)await pause(100);
  for(const [pid,h] of hosts)if(groupAlive(pid))try{
   const members=await Promise.all([pid,...h.ready.children].map(row));for(let i=0;i<members.length;i++)if(members[i]){const p=[pid,...h.ready.children][i];assert.equal(members[i],h.identities[p],'PID identity changed; preserve unrelated process');assert.equal(Number(members[i].split(/\s+/)[1]),pid);}report.residualAfterGrace.push({pid,members});assert(h.identities[pid].includes('run-preview.py')&&h.identities[pid].includes('--database '+config.database));process.kill(-pid,'SIGTERM');
  }catch(e){if(e.code!=='ESRCH')report.cleanupErrors.push(String(e));}
  for(let i=0;i<60&&[...hosts.keys()].some(groupAlive);i++)await pause(50);for(const pid of hosts.keys())if(groupAlive(pid))report.cleanupErrors.push('Owned host group survived: '+pid);
  report.hosts=[...hosts].map(([pid,h])=>({pid,ready:h.ready,groupExited:!groupAlive(pid)}));
  if(run)try{report.databases=await databases(path.join(run,'suites/backup-restore'));}catch(e){report.cleanupErrors.push(String(e));}
  report.finished=new Date().toISOString();report.complete=!report.error&&!report.cleanupErrors.length;await fs.writeFile(file,JSON.stringify(report,null,2)+'\n',{mode:0o600});
 }
 return report;
}

async function main(){
 if(Number(process.versions.node.split('.')[0])!==22)throw Error('Use Node22');const options={};for(let i=2;i<process.argv.length;i+=2){if(!['--build','--web-build'].includes(process.argv[i])||!process.argv[i+1]||options[process.argv[i]])throw Error('Usage: cocos:test:restore:lifecycle -- --build candidate/web-desktop --web-build output/existing-web');options[process.argv[i]]=process.argv[i+1];}assert(options['--build']&&options['--web-build']);
 await fs.mkdir(runs,{recursive:true});const directory=await fs.mkdtemp(path.join(runs,'restore-lifecycle-')),results=[],controller=new AbortController(),stop=()=>controller.abort();for(const s of['SIGINT','SIGTERM','SIGHUP'])process.on(s,stop);console.log('Restore lifecycle report: '+directory);
 const inputs=['tools/test-cocos-restore-browser.mjs','tools/test-cocos-restore-lifecycle.mjs','tools/cocos-browser-config.mjs'],sources=()=>Promise.all(inputs.map(async file=>({file,sha256:crypto.createHash('sha256').update(await fs.readFile(path.join(root,file))).digest('hex')}))),originalSources=await sources();let complete=false;
 try{
  for(const mode of modes){const r=await probeRestore(options['--build'],options['--web-build'],mode,directory,controller.signal);results.push({mode,file:path.join(directory,mode+'.json')});assert(r.complete,r.error||r.cleanupErrors.join('\n'));assert(r.result,'Restore command must write final report');assert(!r.residualAfterGrace.length);assert(r.hosts.length&&r.hosts.every(h=>h.groupExited));assert(r.browserCleanup?.allKnownGroupsExited&&!r.browserCleanup.controllerCleaned.length);assert(r.browserCleanup.proof.every(b=>b.closed&&!b.forced&&b.exitCode===0));assert(r.result.services.every(s=>s.childrenExited&&s.hostGroupExited));assert(r.databases.length>0);
   if(mode==='normal'){assert.equal(r.exit.code,0);assert(r.result.complete&&!r.result.cancelled&&r.result.checks.length===7&&r.result.services.length===3&&r.result.unintendedCocosGuests===0);}
   else{assert.notEqual(r.exit.code,0);assert(!r.result.complete);assert.equal(r.result.cancelled,mode!=='service-exit');}
   if(mode==='restored-current-cancel'){const manifest=await json(path.join(r.runDirectory,'suites/backup-restore/backup-current/manifest.json')),actual=r.databases.find(d=>d.file===path.join(r.runDirectory,'suites/backup-restore/test.db'));assert.deepEqual(actual.snapshot,manifest.snapshot,'Restored current schema fingerprint must remain intact');}
   if(mode==='legacy-upgrade-cancel'){const manifest=await json(path.join(r.runDirectory,'suites/backup-restore/backup-001/manifest.json')),actual=r.databases.find(d=>d.file===path.join(r.runDirectory,'suites/backup-restore/test.db'));assert.deepEqual(actual.snapshot.migrations,['003']);for(const name of['players','receipts'])assert.deepEqual(actual.snapshot.tables.find(t=>t.name===name),manifest.snapshot.tables.find(t=>t.name===name));}
   console.log('PASS '+mode);
  }assert.deepEqual(await sources(),originalSources);assert(!controller.signal.aborted);complete=true;
 }finally{for(const s of['SIGINT','SIGTERM','SIGHUP'])process.removeListener(s,stop);await fs.writeFile(path.join(directory,'result.json'),JSON.stringify({kind:'standalone-restore-lifecycle-not-natural-game-coverage',complete,cancelled:controller.signal.aborted,sources:originalSources,results},null,2)+'\n',{mode:0o600});}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
