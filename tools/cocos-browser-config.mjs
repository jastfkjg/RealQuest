import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const inside=(base,file)=>file.startsWith(base+path.sep);
let activeConfig,stopping=false;
const browsers=new Map(),starting=new Set();let lifecycleWrite=Promise.resolve();

export function browserProfile(args){
 const profiles=[];
 for(let i=0;i<args.length;i++){
  let value;
  if(args[i].startsWith('--user-data-dir='))value=args[i].slice(16);
  else if(args[i]==='--profile'||args[i]==='-profile')value=args[++i];
  else continue;
  if(!value||value.startsWith('-'))return undefined;
  profiles.push(value);
 }
 return new Set(profiles).size===1?profiles[0]:undefined;
}

export function browserCommandHasProfile(command,profile){
 // ps text loses argv boundaries. A spaced path alone is insufficient proof;
 // the exact run marker can still establish ownership of a marked process.
 if(profile!==undefined&&(!profile||/\s/.test(profile)))return false;
 const value=profile===undefined?'(?!-)\\S+':profile.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?=\\s+-|\\s*$)';
 return !!value&&new RegExp('(?:^|\\s)(?:--user-data-dir=|--profile\\s+|-profile\\s+)'+value).test(command);
}

export function validateChromiumProduct(version,product){
 assert(typeof version==='string'&&/^\d+\.\d+\.\d+\.\d+$/.test(version),'Expected a full Chromium-family browser version');
 assert(typeof product==='string'&&['Chrome/','HeadlessChrome/','Edg/'].some(prefix=>product===prefix+version),'CDP product and actual browser version must agree');
}

export function validateBrowserConfig(config,owner,configFile){
 const directory=path.resolve(config.directory||''),database=path.resolve(config.database||''),runDirectory=path.resolve(config.runDirectory||'');
 if(config.schema_version!==1||owner.schema_version!==1||config.runId!==owner.runId||config.nonce!==owner.nonce||config.repository!==root)throw Error('Browser test configuration ownership mismatch.');
 if(!inside(path.join(root,'output/cocos-regression'),runDirectory)||directory!==path.join(runDirectory,'suites',config.suite)||database!==path.join(directory,'test.db')||path.resolve(configFile)!==path.join(directory,'config.json'))throw Error('Browser fixtures must use their own fresh regression suite directory/test.db.');
 if(!/^[a-z0-9-]+$/.test(config.suite)||!/^[0-9a-f-]{36}$/.test(config.runId)||!/^[0-9a-f]{32}$/.test(config.nonce)||owner.controllerPID!==config.controllerPID||!Number.isInteger(config.controllerPID)||config.controllerPID<1)throw Error('Invalid regression suite/controller.');
 for(const key of ['baseURL','apiURL']){const u=new URL(config[key]);if(u.protocol!=='http:'||u.hostname!=='127.0.0.1'||!u.port||u.pathname!=='/'||u.search||u.hash)throw Error('Test endpoints must be explicit loopback origins.');}
 if(config.baseURL===config.apiURL)throw Error('Proxy/API ports must differ.');
 if(config.oldURL){const u=new URL(config.oldURL);if(u.protocol!=='http:'||u.hostname!=='127.0.0.1'||!u.port||[config.baseURL,config.apiURL].includes(config.oldURL))throw Error('Invalid optional Web comparison origin.');}
 return {...config,directory,database,runDirectory};
}

export async function browserConfig(suite,legacy={}){
 const configFile=process.env.REALQUEST_COCOS_TEST_CONFIG;
 if(!configFile){
  if(!legacy.directory)throw Error('Use npm run cocos:test:browser -- --build <candidate>/web-desktop; fixture suites require an owned run configuration.');
  const directory=path.resolve(root,legacy.directory),baseURL=legacy.baseURL;
  if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(baseURL)||baseURL==='http://127.0.0.1:5442'||!inside(path.join(root,'output'),directory))throw Error('Legacy browser test requires its documented isolated endpoint/directory.');
  await fs.mkdir(directory,{recursive:true});
  return {managed:false,suite,baseURL,oldURL:legacy.oldURL,directory,database:path.join(directory,'test.db'),async assertDatabase(){if(await fs.realpath(path.join(directory,'test.db'))!==path.join(directory,'test.db'))throw Error('Legacy test database symlink is not permitted.');}};
 }
 const value=JSON.parse(await fs.readFile(configFile,'utf8')),owner=JSON.parse(await fs.readFile(path.join(value.runDirectory,'run.json'),'utf8'));
 const config=validateBrowserConfig(value,owner,configFile);
 if(config.suite!==suite)throw Error('Wrong suite configuration: '+suite);
 for(const file of [config.runDirectory,config.directory,configFile,config.database])if(await fs.realpath(file)!==file)throw Error('Regression fixture paths must not use symlinks.');
 const ready=JSON.parse(await fs.readFile(path.join(config.directory,'ready.json'),'utf8'));
 if(ready.run_id!==config.runId||ready.database!==config.database||ready.parent_pid!==config.controllerPID||ready.port!==Number(new URL(config.baseURL).port)||ready.api_port!==Number(new URL(config.apiURL).port)||ready.cookie!==config.cookie)throw Error('Configured test service identity mismatch.');
 activeConfig={...config,managed:true,async assertDatabase(){const real=await fs.realpath(config.database);if(real!==config.database)throw Error('Test database symlink is not permitted.');}};
 return activeConfig;
}

async function recordBrowsers(){
 if(!activeConfig?.managed)return;
 const config=activeConfig;
 const pending=lifecycleWrite.then(async()=>{
  const rows=[...browsers.values()].map(b=>({pid:b.server.process().pid,parentPID:process.pid,owner:config.nonce+':'+config.suite,profile:browserProfile(b.server.process().spawnargs),browserVersion:b.version,started:b.started,closed:b.closed,forced:b.forced,exitCode:b.server.process().exitCode,signal:b.server.process().signalCode}));
  const temporary=path.join(config.directory,'.browser-lifecycle-'+process.pid+'-'+randomUUID()+'.tmp');
  try{await fs.writeFile(temporary,JSON.stringify(rows,null,2)+'\n',{flag:'wx'});await fs.rename(temporary,path.join(config.directory,'browser-lifecycle.json'));}finally{await fs.rm(temporary,{force:true});}
 });
 lifecycleWrite=pending.catch(()=>{});await pending;
}
async function stopBrowser(entry){
 if(entry.promise)return entry.promise;
 entry.promise=(async()=>{
  let force;
  try{
   const forced=new Promise((resolve,reject)=>{force=setTimeout(()=>{entry.forced=true;entry.server.kill().then(resolve,reject);},1600);});
   await Promise.race([entry.server.close(),forced]);
  }catch{entry.forced=true;await entry.server.kill();
  }finally{clearTimeout(force);}
  const child=entry.server.process();
  if(child.exitCode===null&&child.signalCode===null)throw Error('Owned Chromium has not exited: '+child.pid);
  entry.closed=true;await recordBrowsers();
 })();return entry.promise;
}
async function interrupt(signal){
 if(stopping)return;stopping=true;
 await Promise.allSettled([...starting]);
 const results=await Promise.allSettled([...browsers.values()].map(stopBrowser));
 if(results.some(r=>r.status==='rejected'))process.stderr.write('Owned browser cleanup failed; inspect browser-lifecycle.json.\n');
 process.exit(signal==='SIGINT'?130:143);
}
let listeners=false;
export async function launchBrowser(chromium,options={},lifecycle={}){
 if(!activeConfig?.managed)return chromium.launch(options);
 if(!listeners&&lifecycle.handleSignals!==false){process.once('SIGINT',()=>void interrupt('SIGINT'));process.once('SIGTERM',()=>void interrupt('SIGTERM'));listeners=true;}
 if(stopping)throw Error('Browser run cancelled.');
 const pending=chromium.launchServer({timeout:15000,...options,args:[...(options.args||[]),'--realquest-test-owner='+activeConfig.nonce+':'+activeConfig.suite]});starting.add(pending);
 let server;try{server=await pending;}finally{starting.delete(pending);}
 const entry={server,started:new Date().toISOString(),closed:false,forced:false};
 browsers.set(server,entry);await recordBrowsers();
 try{
  if(stopping)throw Error('Browser run cancelled during launch.');
  const browser=await chromium.connect(server.wsEndpoint());entry.browser=browser;entry.version=browser.version();browsers.set(browser,entry);browsers.delete(server);return browser;
 }catch(error){await stopBrowser(entry);throw error;}
}
export async function closeBrowser(browser){
 const entry=browsers.get(browser);if(!entry)return browser.close();
 await stopBrowser(entry);
}
