import fs from 'node:fs/promises';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';import {execFile} from 'node:child_process';import {promisify} from 'node:util';
import {runRegression} from './cocos-browser.mjs';
import {fileURLToPath} from 'node:url';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url))),out=path.join(root,'output/cocos-regression'),exec=promisify(execFile),results=[];
if(process.argv.length!==4||process.argv[2]!=='--build')throw Error('Usage: cocos:test:runner -- --build <candidate>/web-desktop');
const build=process.argv[3];await fs.mkdir(out,{recursive:true});const summary=await fs.mkdtemp(path.join(out,'lifecycle-'));console.log('Lifecycle report directory: '+summary);
const alive=pid=>{try{process.kill(pid,0);return true;}catch(e){if(e.code==='ESRCH')return false;throw e;}};
async function ownRun(suite){for(const entry of await fs.readdir(out)){if(!entry.startsWith('run-'))continue;try{const dir=path.join(out,entry),owner=JSON.parse(await fs.readFile(path.join(dir,'run.json'),'utf8'));if(owner.controllerPID===process.pid&&owner.selected.includes(suite))return {dir,owner};}catch{}}}
for(const mode of ['normal','failure','timeout','service-exit','cancel','startup-cancel','occupied']){
 const id='lifecycle-'+mode;let timer,sentinel,busy=false,observed;
 try{
  let port;
  if(mode==='occupied'){sentinel=http.createServer((_,r)=>r.end('preserved-sentinel'));await new Promise(resolve=>sentinel.listen(0,'127.0.0.1',resolve));port=sentinel.address().port;}
  if(mode==='cancel'||mode==='startup-cancel')timer=setInterval(async()=>{
   if(busy)return;busy=true;
   try{const run=await ownRun(id);if(!run)return;const dir=path.join(run.dir,'suites',id);
    if(mode==='cancel'){const proof=JSON.parse(await fs.readFile(path.join(dir,'browser-lifecycle.json'),'utf8'));if(!proof.length)return;observed='owned-browser-lifecycle-record';}
    else{const marker='--realquest-test-owner='+run.owner.nonce+':'+id;const ps=(await exec('ps',['-eo','command='])).stdout;if(!ps.split('\n').some(l=>l.split(/\s+/).includes(marker)))return;try{await fs.access(path.join(dir,'browser-lifecycle.json'));return;}catch(e){if(e.code!=='ENOENT')throw e;}observed='marked-Chromium-before-launch-completed';}
    clearInterval(timer);process.kill(process.pid,'SIGINT');
   }catch{}finally{busy=false;}
  },30);
  const suite={id,file:'clients/cocos/tools/runner-probe.mjs',result:'probe-result.json',group:'infrastructure',timeoutMs:mode==='timeout'?3500:20000,env:{REALQUEST_RUNNER_PROBE:mode}};
  const report=await runRegression({build,port},[suite]);
  clearInterval(timer);const item=report.results[0];assert(item);
  if(mode==='normal')assert(report.complete);else assert(!report.complete);
  assert(item.browserCleanup.allKnownGroupsExited);
  if(item.serviceChildren)assert(item.serviceChildrenExited&&item.serviceChildren.every(pid=>!alive(pid)));
  if(mode==='timeout')assert(item.test.timedOut);
  if(mode==='service-exit'){assert(item.test.cancelled&&!item.test.timedOut);assert(!report.cancelled&&!item.service.cancelled);}
  if(mode==='cancel'||mode==='startup-cancel'){assert(report.cancelled);assert(observed);}
  if(mode==='occupied'){const response=await fetch('http://127.0.0.1:'+port);assert.equal(await response.text(),'preserved-sentinel');const config=JSON.parse(await fs.readFile(item.configFile,'utf8'));await assert.rejects(fs.access(config.database));}
  results.push({mode,passed:true,observed,report:path.join(report.runDirectory,'result.json'),expectedComplete:mode==='normal',browserGroupsGone:true,servicesGone:true});
  await fs.writeFile(path.join(summary,'result.json'),JSON.stringify({kind:'infrastructure-not-game-coverage',complete:false,results},null,2)+'\n');process.exitCode=0;
 }finally{clearInterval(timer);if(sentinel)await new Promise(resolve=>sentinel.close(resolve));}
}
await fs.writeFile(path.join(summary,'result.json'),JSON.stringify({kind:'infrastructure-not-game-coverage',complete:true,results},null,2)+'\n');console.log('PASS seven actual browser/service lifecycle probes.');
