import fs from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {verifyBuild,buildPayload} from './cocos-build-info.mjs';
import {runOwned} from './cocos-child.mjs';
import {browserSuites,selectSuites} from './cocos-browser-suites.mjs';
import {finishBrowserProcesses} from './cocos-browser-cleanup.mjs';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const alive=pid=>{try{process.kill(pid,0);return true;}catch(error){if(error.code==='ESRCH')return false;throw error;}};
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
async function backendSources(){
 const records=[];
 async function visit(directory){for(const entry of (await fs.readdir(path.join(root,directory),{withFileTypes:true})).sort((a,b)=>a.name<b.name?-1:1)){const file=directory+'/'+entry.name;if(entry.isSymbolicLink())throw Error('Backend source symlinks are not supported by the test receipt.');if(entry.isDirectory()&&!entry.name.startsWith('__'))await visit(file);else if(entry.isFile()&&file.endsWith('.py'))records.push({path:file,sha256:hash(await fs.readFile(path.join(root,file)))});}}
 await visit('backend/app');await visit('backend/migrations');records.push({path:'backend/requirements.lock.txt',sha256:hash(await fs.readFile(path.join(root,'backend/requirements.lock.txt')))});return {sha256:hash(JSON.stringify(records)),records};
}
async function freePort(){const server=net.createServer();await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});const port=server.address().port;await new Promise(resolve=>server.close(resolve));return port;}
async function health(url,signal){
 for(let i=0;i<100;i++){
  if(signal.aborted)throw Error('Regression cancelled during service readiness.');
  try{const r=await fetch(url+'/api/health',{signal:AbortSignal.timeout(700)});if(r.ok)return;}catch{}
  await pause(100);
 }
 throw Error('Owned test service did not become healthy: '+url);
}
export function parseBrowserArgs(args){
 const options={selection:'current',continueOnFailure:false};
 const values={'--build':'build','--suite':'selection','--port':'port','--api-port':'apiPort','--web-port':'webPort','--web-build':'webBuild'};
 for(let i=0;i<args.length;i++){
  if(args[i]==='--list')options.list=true;
  else if(args[i]==='--continue-on-failure')options.continueOnFailure=true;
  else if(values[args[i]]&&args[i+1])options[values[args[i]]]=args[++i];
  else throw Error('Usage: cocos:test:browser -- --build <candidate>/web-desktop [--suite current|all|compatibility|id,id] [--port N --api-port N] [--web-build path --web-port N] [--continue-on-failure] [--list]');
 }
 for(const key of ['port','apiPort','webPort'])if(options[key]!==undefined){options[key]=Number(options[key]);if(!Number.isInteger(options[key])||options[key]<1||options[key]>65535)throw Error('Invalid test port.');}
 if(!options.list&&!options.build)throw Error('Choose an explicit separately built Cocos candidate with --build.');
 return options;
}

export async function runRegression(options,suites=selectSuites(options.selection)){
 if(Number(process.versions.node.split('.')[0])!==22)throw Error('Browser regression requires Node22.');
 const build=await verifyBuild(path.resolve(root,'clients/cocos',options.build));
 const needsWeb=suites.some(s=>s.group==='compatibility');
 if(needsWeb&&!options.webBuild)throw Error('Compatibility suite requires an explicit existing --web-build package; current Cocos suites do not.');
 const webBuild=options.webBuild?await fs.realpath(path.resolve(root,options.webBuild)):null;
 if(webBuild){if(!webBuild.startsWith(root+path.sep))throw Error('Web comparison package must be inside this repository.');await fs.access(path.join(webBuild,'index.html'));}
 const webComparison=webBuild?{directory:webBuild,...await buildPayload(webBuild)}:null;
 const parent=path.join(root,'output/cocos-regression');await fs.mkdir(parent,{recursive:true});
 if(await fs.realpath(parent)!==parent)throw Error('Regression output directory must not be a symlink.');
 const runDirectory=await fs.mkdtemp(path.join(parent,'run-')),runId=crypto.randomUUID(),nonce=crypto.randomBytes(16).toString('hex');
 const inventory=await fs.readFile(path.join(root,'docs/migration/cocos-source-inventory.json'));
 const owner={schema_version:1,runId,nonce,controllerPID:process.pid,createdAt:new Date().toISOString(),repository:root,build,webComparison,selected:suites.map(s=>s.id),sourceInventorySHA256:hash(inventory),backend:await backendSources(),runtime:{node:process.version,nodeExecutable:process.execPath,platform:process.platform,arch:process.arch}};
 await fs.writeFile(path.join(runDirectory,'run.json'),JSON.stringify(owner,null,2)+'\n',{flag:'wx'});
 await fs.writeFile(path.join(runDirectory,'source-inventory.json'),inventory,{flag:'wx'});
 console.log('Run: '+runDirectory);
 const controller=new AbortController(),stop=()=>controller.abort();process.on('SIGINT',stop);process.on('SIGTERM',stop);
 const results=[];let failure;
 try{
  const preflight=await runOwned(process.execPath,[path.join(root,'tools/cocos-sources.mjs'),'--check'],{cwd:root,log:path.join(runDirectory,'sources.log'),signal:controller.signal});
  if(preflight.code!==0)throw Error('Source ownership preflight failed; inspect sources.log.');
  for(const suite of suites){
   if(controller.signal.aborted)break;
   const directory=path.join(runDirectory,'suites',suite.id);await fs.mkdir(directory,{recursive:true});
   const port=options.port||await freePort();let apiPort=options.apiPort||await freePort();while(!options.apiPort&&apiPort===port)apiPort=await freePort();
   const webPort=needsWeb&&(suite.group==='compatibility')?(options.webPort||await freePort()):null;
   if(new Set([port,apiPort,...(webPort?[webPort]:[])]).size!==(webPort?3:2))throw Error('Test proxy/API/Web ports must differ.');
   const config={schema_version:1,repository:root,runDirectory,runId,nonce,controllerPID:process.pid,suite:suite.id,directory,database:path.join(directory,'test.db'),baseURL:'http://127.0.0.1:'+port,apiURL:'http://127.0.0.1:'+apiPort,oldURL:webPort?'http://127.0.0.1:'+webPort:null,cookie:'rq_test_'+runId.replaceAll('-',''),build};
   const configFile=path.join(directory,'config.json');await fs.writeFile(configFile,JSON.stringify(config,null,2)+'\n',{flag:'wx'});
   try{await fs.access(config.database);throw Error('Refusing an existing test DB.');}catch(error){if(error.code!=='ENOENT')throw error;}
   const env={...process.env,REALQUEST_COCOS_TEST_CONFIG:configFile,REALQUEST_TEST_RUN_ID:runId,DATABASE_URL:'sqlite:///'+config.database};
   for(const key of ['REALQUEST_INVENTORY_VISUAL_ONLY','REALQUEST_DIALOGUE_REVIEW','REALQUEST_PLACES_REVIEW','REALQUEST_CONVERSATION_REVIEW','REALQUEST_INVENTORY_REVIEW','REALQUEST_DATA_URL','REALQUEST_LIFE_URL'])delete env[key];
   Object.assign(env,suite.env||{});
   const testSourceSHA256=hash(await fs.readFile(path.join(root,suite.file)));
   const serviceController=new AbortController(),testController=new AbortController(),cancelService=()=>serviceController.abort(),cancelTest=()=>testController.abort();
   controller.signal.addEventListener('abort',cancelService,{once:true});controller.signal.addEventListener('abort',cancelTest,{once:true});
   const serviceArgs=[path.join(root,'clients/cocos/tools/run-preview.py'),'--port',String(port),'--api-port',String(apiPort),'--build',build.directory,'--database',config.database,'--cookie-name',config.cookie,'--ready-file',path.join(directory,'ready.json')];
   if(webPort)serviceArgs.push('--web-port',String(webPort),'--web-build',webBuild);
   let serviceDone=false,serviceOutcome,serviceError;
   const service=runOwned(path.join(root,'backend/.venv/bin/python'),serviceArgs,{cwd:root,env,log:path.join(directory,'service.log'),timeoutMs:suite.timeoutMs+45000,signal:serviceController.signal}).then(r=>{serviceDone=true;serviceOutcome=r;},e=>{serviceDone=true;serviceError=e;});
   void service.then(()=>{if(!serviceController.signal.aborted)testController.abort();});
   const result={id:suite.id,file:suite.file,testSourceSHA256,specification:{args:suite.args||[],env:suite.env||{},result:suite.result,timeoutMs:suite.timeoutMs},started:new Date().toISOString(),configFile,success:false};
   try{
    const readyFile=path.join(directory,'ready.json');let ready;
    for(let i=0;i<150;i++){
     if(serviceDone)throw serviceError||Error('Test service exited before readiness.');
     if(controller.signal.aborted)throw Error('Regression cancelled.');
     try{ready=JSON.parse(await fs.readFile(readyFile,'utf8'));break;}catch(error){if(error.code!=='ENOENT'&&!(error instanceof SyntaxError))throw error;}
     await pause(100);
    }
    if(!ready||ready.parent_pid!==process.pid||ready.database!==config.database||ready.run_id!==runId)throw Error('Test service ownership was not established.');
    await Promise.race([health(config.baseURL,controller.signal),service.then(()=>{throw serviceError||Error('Test service exited while waiting for health.');})]);
    console.log('RUN '+suite.id+' '+config.baseURL);
    result.test=await runOwned(process.execPath,[path.join(root,suite.file),...(suite.args||[])],{cwd:root,env,log:path.join(directory,'test.log'),timeoutMs:suite.timeoutMs,signal:testController.signal});
    if(result.test.code!==0||result.test.timedOut||result.test.cancelled)throw Error('Browser module did not complete successfully.');
    const report=JSON.parse(await fs.readFile(path.join(directory,suite.result),'utf8'));
    if(!Array.isArray(report.checks)||!report.checks.length||report.errors?.length)throw Error('Browser report is missing executed checks or contains unexpected errors.');
    const browserProof=JSON.parse(await fs.readFile(path.join(directory,'browser-lifecycle.json'),'utf8'));
    if(!browserProof.length||browserProof.some(p=>!p.closed||alive(p.pid)))throw Error('Owned browser cleanup was not proved.');
    result.checks=report.checks;result.report=path.join(directory,suite.result);result.browsers=browserProof;result.success=true;
   }catch(error){result.error=String(error);console.error('FAIL '+suite.id+': '+error.message);}
   finally{
    try{result.browserCleanup=await finishBrowserProcesses(config,result.test?.pid);}catch(error){result.success=false;result.error||=String(error);}
    serviceController.abort();await service;controller.signal.removeEventListener('abort',cancelService);controller.signal.removeEventListener('abort',cancelTest);
    result.service=serviceOutcome;result.serviceError=serviceError?String(serviceError):null;
    if(!serviceOutcome?.cancelled||serviceOutcome.timedOut||serviceError){result.success=false;result.error||='Test service exited unexpectedly.';}
    try{const ready=JSON.parse(await fs.readFile(path.join(directory,'ready.json'),'utf8'));result.serviceChildren=ready.children;result.serviceChildrenExited=ready.children.every(pid=>!alive(pid));if(!result.serviceChildrenExited||serviceError){result.success=false;result.error||='Service cleanup failed.';}}catch(error){if(error.code!=='ENOENT'){result.success=false;result.error||=String(error);}}
    result.finished=new Date().toISOString();results.push(result);await fs.writeFile(path.join(runDirectory,'partial-result.json'),JSON.stringify({expected:suites.length,results},null,2)+'\n');
   }
   console.log((result.success?'PASS ':'FAIL ')+suite.id);
   if(!result.success&&!options.continueOnFailure)break;
  }
  await verifyBuild(build.directory);
  if(webComparison&&(await buildPayload(webBuild)).sha256!==webComparison.sha256)throw Error('Web comparison payload changed during the run.');
  const postflight=await runOwned(process.execPath,[path.join(root,'tools/cocos-sources.mjs'),'--check'],{cwd:root,log:path.join(runDirectory,'sources-after.log'),signal:controller.signal});
  if(postflight.code!==0)throw Error('Source ownership changed during the run; inspect sources-after.log.');
  if(hash(await fs.readFile(path.join(root,'docs/migration/cocos-source-inventory.json')))!==owner.sourceInventorySHA256||(await backendSources()).sha256!==owner.backend.sha256)throw Error('Test/source/backend inputs changed during the run; results cannot be marked current.');
  for(const result of results)if(hash(await fs.readFile(path.join(root,result.file)))!==result.testSourceSHA256)throw Error('A browser module changed during its run.');
 }catch(error){failure=String(error);}
 finally{
  process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);
  const complete=!failure&&!controller.signal.aborted&&results.length===suites.length&&results.every(r=>r.success);
  const report={kind:'browser-regression',runId,runDirectory,started:owner.createdAt,finished:new Date().toISOString(),build,webComparison,sourceInventorySHA256:owner.sourceInventorySHA256,backend:owner.backend,runtime:owner.runtime,expected:suites.length,results,unexecuted:suites.filter(s=>!results.some(r=>r.id===s.id)).map(s=>s.id),cancelled:controller.signal.aborted,error:failure,complete,unitTestsIncluded:false};
  await fs.writeFile(path.join(runDirectory,'result.json'),JSON.stringify(report,null,2)+'\n');console.log('Report: '+path.join(runDirectory,'result.json'));
  if(!complete)process.exitCode=controller.signal.aborted?130:1;
  return report;
 }
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const options=parseBrowserArgs(process.argv.slice(2));
 if(options.list)console.log(browserSuites.map(s=>s.id+'\t'+s.group+'\t'+s.file).join('\n'));else await runRegression(options);
}
