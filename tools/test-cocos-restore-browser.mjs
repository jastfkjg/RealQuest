import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {runOwned} from './cocos-child.mjs';
import {verifyBuild,buildPayload} from './cocos-build-info.mjs';
import {browserConfig,launchBrowser,closeBrowser} from './cocos-browser-config.mjs';

const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
if(Number(process.versions.node.split('.')[0])!==22)throw Error('Use Node22.');
const options={};for(let i=2;i<process.argv.length;i+=2){if(!['--build','--web-build'].includes(process.argv[i])||!process.argv[i+1]||options[process.argv[i]])throw Error('Usage: cocos:test:restore -- --build candidate/web-desktop --web-build output/existing-web');options[process.argv[i]]=process.argv[i+1];}
if(!options['--build']||!options['--web-build'])throw Error('Choose explicit Cocos and existing original Web builds.');
const build=await verifyBuild(path.resolve(root,'clients/cocos',options['--build'])),webBuild=await fs.realpath(path.resolve(root,options['--web-build']));
if(!webBuild.startsWith(root+path.sep))throw Error('Web comparison package must be inside this repository.');
const web=await buildPayload(webBuild),inventory=await fs.readFile(path.join(root,'docs/migration/cocos-source-inventory.json'));
const parent=path.join(root,'output/cocos-regression');await fs.mkdir(parent,{recursive:true});
const runDirectory=await fs.mkdtemp(path.join(parent,'run-')),directory=path.join(runDirectory,'suites/backup-restore');await fs.mkdir(directory,{recursive:true});
const runId=crypto.randomUUID(),nonce=crypto.randomBytes(16).toString('hex'),controller=new AbortController(),started=new Date().toISOString();
const stop=()=>{controller.abort();if(browser)void closeBrowser(browser).catch(e=>errors.push('cancel cleanup: '+e.message));};
process.on('SIGINT',stop);process.on('SIGTERM',stop);process.on('SIGHUP',stop);const timer=setTimeout(stop,420000);
const checks=[],captures=[],errors=[],operations=[],services=[],contexts=[],guestCreates=[],report={kind:'sqlite-backup-browser-rehearsal',runId,runDirectory,directory,controllerPID:process.pid,started,build,web:{directory:webBuild,sha256:web.sha256},sourceInventorySHA256:crypto.createHash('sha256').update(inventory).digest('hex'),checks,captures,errors,operations,services,complete:false};
const alive=pid=>{try{process.kill(pid,0);return true;}catch(e){if(e.code==='ESRCH')return false;throw e;}};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function port(){const server=net.createServer();await new Promise((r,j)=>{server.once('error',j);server.listen(0,'127.0.0.1',r);});const result=server.address().port;await new Promise(r=>server.close(r));return result;}
let browser,service,config,env,base,old,database,phase=0;
function check(name,details={}){checks.push({name,...details});console.log('PASS '+name);}
async function child(command,args,label,extra={}){const result=await runOwned(command,args,{cwd:root,env,log:path.join(directory,label+'.log'),signal:controller.signal,timeoutMs:65000,...extra});operations.push(result);return result;}
async function cli(args,label,expected=0){const result=await child(process.execPath,[path.join(root,'tools/cocos-backup.mjs'),...args],label);result.expectedCode=expected;assert.equal(result.code,expected,label);assert(!result.timedOut&&!result.cancelled,label);const value=JSON.parse((await fs.readFile(result.log,'utf8')).trim());result.receipt=value.receipt;return value;}
async function startHost(label){
 if(controller.signal.aborted)throw Error('Rehearsal cancelled before host launch');
 phase++;const own=new AbortController(),cancel=()=>own.abort();controller.signal.addEventListener('abort',cancel,{once:true});
 const args=[path.join(root,'clients/cocos/tools/run-preview.py'),'--build',build.directory,'--database',database,'--port',new URL(base).port,'--api-port',new URL(config.apiURL).port,'--web-port',new URL(old).port,'--web-build',webBuild,'--cookie-name',config.cookie,'--ready-file',path.join(directory,'ready.json')];
 const item={phase,label,own,cancel,done:false};service=item;
 item.promise=runOwned(path.join(root,'backend/.venv/bin/python'),args,{cwd:root,env,log:path.join(directory,'host-'+phase+'.log'),timeoutMs:300000,signal:own.signal}).then(result=>{item.result=result;item.done=true;},error=>{item.error=error;item.done=true;});
 for(let i=0;i<200;i++){if(controller.signal.aborted)throw Error('Rehearsal cancelled');if(item.done)throw Error('Host exited before readiness');try{item.ready=JSON.parse(await fs.readFile(path.join(directory,'ready.json'),'utf8'));break;}catch{}await pause(75);}
 assert(item.ready&&item.ready.parent_pid===process.pid&&item.ready.database===database,'Owned host readiness');
 const health=await fetch(base+'/api/health');assert.equal(health.status,200);
}
async function stopHost(){
 const item=service;if(!item)return;service=null;item.own.abort();await item.promise;controller.signal.removeEventListener('abort',item.cancel);
 if(!item.ready)try{const observed=JSON.parse(await fs.readFile(path.join(directory,'ready.json'),'utf8'));if(observed.parent_pid===process.pid&&observed.database===database&&observed.pid===item.result?.pid)item.ready=observed;}catch(e){if(e.code!=='ENOENT')item.readyError=String(e);}
 const children=item.ready?.children||[],childrenExited=children.every(pid=>!alive(pid));let hostGroupExited=false;
 if(item.result?.pid)try{process.kill(-item.result.pid,0);}catch(e){if(e.code==='ESRCH')hostGroupExited=true;else throw e;}
 services.push({phase:item.phase,label:item.label,...item.result,error:item.error?String(item.error):null,readyError:item.readyError,children,childrenExited,hostGroupExited});
 assert(childrenExited&&hostGroupExited,'Owned API/proxy or host group survived shutdown');
 try{await fs.rename(path.join(directory,'ready.json'),path.join(directory,'ready-phase-'+item.phase+'.json'));}catch(e){if(e.code!=='ENOENT')throw e;}
}
async function api(context,route,method='GET',data,token,expected=200){const response=await context.request.fetch(base+'/api/'+route,{method,data,headers:token?{Authorization:'Bearer '+token}:{}});assert.equal(response.status(),expected,route);return response.json();}
const read=p=>p.evaluate(()=>JSON.parse(window.render_game_to_text()));
async function until(p,predicate,label='game condition'){for(let i=0;i<300;i++){if(controller.signal.aborted)throw Error('Cancelled');const state=await read(p);if(predicate(state))return state;await p.waitForTimeout(70);}throw Error(label);}
async function click(p,id){const state=await until(p,s=>s.controls.some(c=>c.id===id&&!c.disabled),id),control=state.controls.find(c=>c.id===id);await p.mouse.click(control.x,control.y);await p.waitForTimeout(80);}
async function load(p){await p.goto(base);await p.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).loaded&&JSON.parse(window.render_game_to_text()).controls.some(c=>c.id==='start'&&!c.disabled));}
async function active(p){return until(p,s=>s.mode==='world'&&s.connection==='ready'&&!s.busy&&!s.pendingAction,'world ready');}
async function quiet(p){await p.keyboard.press('l');await until(p,s=>s.mode==='life'&&s.connection==='ready'&&!s.pendingAction);}
async function credential(p,id){const pending=p.waitForEvent('download');await click(p,id);return downloaded(await pending);}
async function downloaded(download){const stream=await download.createReadStream(),parts=[];for await(const chunk of stream)parts.push(chunk);return JSON.parse(Buffer.concat(parts).toString());}
async function choose(p,file){const pending=p.waitForEvent('filechooser');await click(p,'choose-recovery');await(await pending).setFiles({name:'journey.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(file))});await until(p,s=>s.controls.some(c=>c.id==='confirm-restore'));}
async function shot(p,name){await p.screenshot({path:path.join(directory,name+'.png')});captures.push(name+'.png');}
async function context(cookies){const result=await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true});contexts.push(result);if(cookies)await result.addCookies(cookies);return result;}
function watch(p){p.on('pageerror',e=>errors.push(e.message));p.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text());});p.on('request',request=>{if(request.url().endsWith('/api/client-session')&&!request.headers().authorization)guestCreates.push(request.url());});}
const stable=state=>{const copy=structuredClone(state);delete copy.revision;delete copy.stamina.updated_at;for(const key of ['owner','elapsed','updated_at','running_until'])delete copy.world_clock[key];return copy;};
function legacyFields(expected,actual,label='legacy'){
 if(expected&&typeof expected==='object'&&!Array.isArray(expected)){
  assert(actual&&typeof actual==='object',label);
  for(const [key,value] of Object.entries(expected))legacyFields(value,actual[key],label+'.'+key);
 }else assert.deepEqual(actual,expected,label);
}
async function archiveDatabase(label){assert(!service,'Stop owned DB connections before activation');const target=path.join(directory,label);await fs.mkdir(target);for(const name of ['test.db','test.db-wal','test.db-shm'])try{await fs.rename(path.join(directory,name),path.join(target,name));}catch(e){if(e.code!=='ENOENT')throw e;}return target;}
try{
 const preflight=await child(process.execPath,[path.join(root,'tools/cocos-sources.mjs'),'--check'],'sources-before');assert.equal(preflight.code,0);
 const ports=[];while(ports.length<3){const value=await port();if(!ports.includes(value))ports.push(value);}
 base='http://127.0.0.1:'+ports[0];old='http://127.0.0.1:'+ports[2];database=path.join(directory,'test.db');
 config={schema_version:1,repository:root,runDirectory,runId,nonce,controllerPID:process.pid,suite:'backup-restore',directory,database,baseURL:base,apiURL:'http://127.0.0.1:'+ports[1],oldURL:old,cookie:'rq_backup_'+runId.replaceAll('-',''),build};
 await fs.writeFile(path.join(runDirectory,'run.json'),JSON.stringify({schema_version:1,runId,nonce,controllerPID:process.pid,createdAt:started}));await fs.writeFile(path.join(directory,'config.json'),JSON.stringify(config));
 env={...process.env,REALQUEST_COCOS_TEST_CONFIG:path.join(directory,'config.json'),REALQUEST_TEST_RUN_ID:runId};
 process.env.REALQUEST_COCOS_TEST_CONFIG=env.REALQUEST_COCOS_TEST_CONFIG;
 await startHost('original source');await browserConfig('backup-restore');
 if(controller.signal.aborted)throw Error('Rehearsal cancelled before browser launch');
 const {chromium}=createRequire(new URL('../package.json',import.meta.url))('playwright');browser=await launchBrowser(chromium,{headless:true,handleSIGINT:false,handleSIGTERM:false,handleSIGHUP:false},{handleSignals:false});
 if(controller.signal.aborted)throw Error('Rehearsal cancelled during browser launch');
 const originalContext=await context(),oldPage=await originalContext.newPage(),page=await originalContext.newPage();watch(oldPage);watch(page);
 await oldPage.goto(old);await oldPage.getByLabel('你的名字').fill('备份演练旅人');await oldPage.getByRole('button',{name:'外观 5',exact:true}).click();await oldPage.locator('#start-btn').click();await oldPage.locator('canvas').waitFor();
 const original=(await api(originalContext,'state')).save_id;await oldPage.goto('about:blank');await pause(250);
 const seeded=await child(path.join(root,'backend/.venv/bin/python'),['-B',path.join(root,'tools/cocos_restore_fixture.py'),'prepare','--database',database,'--save',original],'fixture');assert.equal(seeded.code,0);const fixture=JSON.parse((await fs.readFile(seeded.log,'utf8')).trim());report.fixture=fixture;
 await oldPage.goto(old);await oldPage.locator('canvas').waitFor();await oldPage.getByRole('button',{name:'主菜单',exact:true}).click();await oldPage.getByRole('button',{name:/^存档与数据/}).click();await oldPage.getByRole('button',{name:'旅程凭证',exact:true}).click();
 const download=oldPage.waitForEvent('download');await oldPage.getByRole('button',{name:'下载旅程凭证',exact:true}).click();const oldFile=await downloaded(await download);assert.equal(oldFile.format,'realquest-recovery');await shot(oldPage,'original-web-credential');await oldPage.goto('about:blank');
 const beforeImport=await api(originalContext,'export');await load(page);await click(page,'import-save');await choose(page,oldFile);await shot(page,'cocos-preview-before-backup');await click(page,'cancel-restore');assert.equal((await read(page)).saveId,'');await choose(page,oldFile);await click(page,'confirm-restore');await active(page);assert.equal((await read(page)).saveId,original);await quiet(page);
 const auth=await page.evaluate(()=>JSON.parse(localStorage.getItem('realquest-session-v2')));assert.equal(guestCreates.length,0);assert.deepEqual(stable((await api(originalContext,'export','GET',undefined,auth.token)).state),stable(beforeImport.state));
 await page.reload();await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).loaded);await click(page,'start');await active(page);assert.equal((await read(page)).saveId,original);await click(page,'session');const cocosFile=await credential(page,'export-recovery');await click(page,'session-close');await active(page);await quiet(page);
 check('original Web native export and Cocos preview/cancel/confirm/reload preserve the full prepared journey without a substitute guest',{categories:fixture.categories.length});
 const cookies=await originalContext.cookies(),lookupContext=await context(cookies),lookup=await lookupContext.newPage();watch(lookup);await load(lookup);await click(lookup,'import-save');await click(lookup,'find-web-journey');await until(lookup,s=>s.recoverySource==='web');await click(lookup,'cancel-restore');await click(lookup,'find-web-journey');await click(lookup,'confirm-restore');await active(lookup);const linked=await lookup.evaluate(()=>JSON.parse(localStorage.getItem('realquest-session-v2')));assert.equal((await read(lookup)).saveId,original);await quiet(lookup);await lookup.goto('about:blank');
 check('an existing original cookie can obtain Cocos access without an earlier credential file');
 const controlContext=await context();const control=(await api(controlContext,'session','POST',{})).save_id;await api(controlContext,'command','POST',{request_id:'control-create-once',save_id:control,action:'create',data:{name:'保留的对照旅人',appearance:2}});
 const deleted=await api(originalContext,'client-session','POST',{}),deletion={save_id:deleted.save_id,request_id:'rehearsal-deletion-once'};await api(originalContext,'command','POST',{request_id:'deleted-create-once',save_id:deleted.save_id,action:'create',data:{name:'隔离删除样本'}},deleted.session_token);await api(originalContext,'client-delete','POST',deletion,deleted.session_token);
 const durable={request_id:'backup-durable-activity',save_id:original,action:'activity',data:{kind:'study',amount:5,note:'实际提交、恢复后重试一次的手动记录'}};await api(originalContext,'command','POST',durable,auth.token);
 await page.goto('about:blank');await pause(350);const beforeBackup=await api(originalContext,'export','GET',undefined,auth.token);
 const sourceInspect=await cli(['inspect','--database',database],'source-inspect');const backupDir=path.join(directory,'backup-current');const backup=await cli(['backup','--database',database,'--output',backupDir],'online-backup');assert.equal(backup.sourceStorage.journalMode,'wal');assert(backup.sourceStorage.walBytesAtStart>32);assert.deepEqual(backup.snapshot,sourceInspect.snapshot);assert.equal(backup.snapshot.tables.find(x=>x.name==='players').rows,2);assert(backup.snapshot.tables.every(x=>x.rows>0));
 report.backup={directory:backupDir,snapshot:backup.snapshot,sourceStorage:backup.sourceStorage};await cli(['restore','--backup',backupDir,'--destination',database],'occupied-target',1);assert.deepEqual((await api(originalContext,'export','GET',undefined,auth.token)),beforeBackup);
 check('online WAL backup includes every table and rejects an occupied restore target without modifying live data',{tables:backup.snapshot.tables.length});
 const legacy=path.join(directory,'legacy');await fs.mkdir(legacy);const legacyDB=path.join(legacy,'test.db');const migrated=await child(path.join(root,'backend/.venv/bin/python'),['-B','-m','alembic','upgrade','001'],'legacy-create',{cwd:path.join(root,'backend'),env:{...env,DATABASE_URL:'sqlite:///'+legacyDB}});assert.equal(migrated.code,0);
 const legacyFixture=await child(path.join(root,'backend/.venv/bin/python'),['-B',path.join(root,'tools/cocos_restore_fixture.py'),'legacy-copy','--database',database,'--destination',legacyDB,'--legacy-control',control],'legacy-fixture');assert.equal(legacyFixture.code,0);report.legacyFixture=JSON.parse((await fs.readFile(legacyFixture.log,'utf8')).trim());
 const legacyBackupDir=path.join(directory,'backup-001'),legacyBackup=await cli(['backup','--database',legacyDB,'--output',legacyBackupDir],'backup-001');assert.deepEqual(legacyBackup.snapshot.migrations,['001']);
 await stopHost();await archiveDatabase('original-preserved');const restored=await cli(['restore','--backup',backupDir,'--destination',database],'restore-current');assert.deepEqual(restored.snapshot,backup.snapshot);await startHost('restored schema003');
 for(const token of [undefined,auth.token,linked.token]){const state=await api(originalContext,'state','GET',undefined,token);assert.equal(state.save_id,original);assert.deepEqual(await api(originalContext,'export','GET',undefined,token),beforeBackup);}
 assert.equal((await api(controlContext,'state')).save_id,control);assert.equal((await api(originalContext,'recovery-preview','POST',{recovery_key:oldFile.recovery_key})).character.name,beforeBackup.state.character.name);await api(originalContext,'state','GET',undefined,deleted.session_token,401);assert.deepEqual(await api(originalContext,'client-delete','POST',deletion,deleted.session_token),{deleted:true,save_id:deleted.save_id});
 const replay=await api(originalContext,'command','POST',durable,auth.token);assert.equal(replay.replayed,true);assert.deepEqual(await api(originalContext,'export','GET',undefined,auth.token),beforeBackup);
 check('restored schema and all table fingerprints are identical; cookie, both bearers, recovery key, deletion receipt and original idempotency ledger remain valid');
 await load(page);await click(page,'start');await active(page);assert.equal((await read(page)).saveId,original);await quiet(page);const observed=await read(page);assert.equal(observed.timer.id,beforeBackup.state.timer.id);assert.equal(observed.timer.running,true);assert.deepEqual(stable((await api(originalContext,'export','GET',undefined,auth.token)).state),stable(beforeBackup.state));await shot(page,'cocos-after-database-restore');await page.goto('about:blank');
 const recoveredContext=await context(),recovered=await recoveredContext.newPage();watch(recovered);await load(recovered);await click(recovered,'import-save');await choose(recovered,cocosFile);await click(recovered,'confirm-restore');await active(recovered);assert.equal((await read(recovered)).saveId,original);await quiet(recovered);await shot(recovered,'credential-after-database-restore');await recovered.goto('about:blank');
 await oldPage.goto(old);await oldPage.locator('canvas').waitFor();assert.equal((await api(originalContext,'state')).save_id,original);await shot(oldPage,'original-web-after-database-restore');await oldPage.goto('about:blank');await pause(250);
 assert.equal((await cli(['inspect','--database',database],'players-after-all-recovery-paths')).snapshot.tables.find(t=>t.name==='players').rows,2);assert.equal(guestCreates.length,0);
 check('real Cocos reload and pre-backup Cocos credential recovery plus original Web cookie reload retain progress and running timer');
 await stopHost();await archiveDatabase('schema003-restored-preserved');await cli(['restore','--backup',legacyBackupDir,'--destination',database],'restore-001');assert.deepEqual((await cli(['inspect','--database',database],'before-upgrade-001')).snapshot,legacyBackup.snapshot);await startHost('restored schema001 upgraded by original migrations');const upgraded=(await cli(['inspect','--database',database],'after-upgrade-003')).snapshot;
 assert.deepEqual(upgraded.migrations,['003']);for(const name of ['players','receipts'])assert.deepEqual(upgraded.tables.find(t=>t.name===name),legacyBackup.snapshot.tables.find(t=>t.name===name));for(const name of ['guest_sessions','recovery_keys','client_deletions'])assert.equal(upgraded.tables.find(t=>t.name===name).rows,0);
 const oldMain=await api(originalContext,'state');assert.equal(oldMain.save_id,original);assert.deepEqual(stable((await api(originalContext,'export')).state),stable(beforeBackup.state));const oldControl=await api(controlContext,'state');assert.equal(oldControl.save_id,control);assert.equal(oldControl.state.save_version,3);assert.equal(oldControl.state.village_combat.gate_open,false);
 legacyFields(report.legacyFixture.legacyState,oldControl.state);
 for(const [item,amount] of Object.entries(oldControl.state.inventory))if(!(item in report.legacyFixture.legacyState.inventory))assert.equal(amount,0,'new empty item '+item);
 for(const field of ['knowledge_points','health_points','skill_points'])assert.equal(oldControl.state[field],0);
 for(const level of Object.values(oldControl.state.knowledge_growth))assert.equal(level,0);
 check('genuine schema001 restore upgrades via unchanged original migrations; both old cookies, full main progress and a pre-versioned control state survive without copying later credential tables');
 const legacyContext=await context(cookies),legacyPage=await legacyContext.newPage();watch(legacyPage);await load(legacyPage);await click(legacyPage,'import-save');await click(legacyPage,'find-web-journey');await click(legacyPage,'confirm-restore');await active(legacyPage);assert.equal((await read(legacyPage)).saveId,original);await quiet(legacyPage);await shot(legacyPage,'legacy-schema-cookie-continuation');
 const controlCocosContext=await context(await controlContext.cookies()),controlPage=await controlCocosContext.newPage();watch(controlPage);await load(controlPage);await click(controlPage,'import-save');await click(controlPage,'find-web-journey');await click(controlPage,'confirm-restore');const controlView=await active(controlPage);assert.equal(controlView.saveId,control);assert.equal(controlView.character.name,'保留的对照旅人');assert.equal(controlView.appearance,2);assert.equal(controlView.location,'overworld');assert.deepEqual(controlView.savedPosition,{x:240,y:320});assert.equal(controlView.inventory.gold,20);assert.deepEqual(controlView.points,{knowledge:0,health:0,skill:0});await shot(controlPage,'legacy-unversioned-control-cocos');await quiet(controlPage);
 const finalSnapshot=(await cli(['inspect','--database',database],'final-inspect')).snapshot;assert.equal(finalSnapshot.tables.find(t=>t.name==='players').rows,2);
 check('after legacy upgrade, full-progress and unversioned-control cookies both enter the same Cocos saves without a replacement player or extra resources');
 assert.equal(guestCreates.length,0);report.unintendedCocosGuests=guestCreates.length;assert.deepEqual(errors,[]);await verifyBuild(build.directory);assert.equal((await buildPayload(webBuild)).sha256,web.sha256);const postflight=await child(process.execPath,[path.join(root,'tools/cocos-sources.mjs'),'--check'],'sources-after');assert.equal(postflight.code,0);assert.equal(crypto.createHash('sha256').update(await fs.readFile(path.join(root,'docs/migration/cocos-source-inventory.json'))).digest('hex'),report.sourceInventorySHA256);report.complete=true;
}catch(error){report.error=String(error);report.complete=false;process.exitCode=1;}finally{
 const cleanupErrors=[];const closed=await Promise.allSettled(contexts.map(c=>c.close()));for(const result of closed)if(result.status==='rejected')cleanupErrors.push(String(result.reason));
 try{if(browser)await closeBrowser(browser);}catch(error){cleanupErrors.push(String(error));}
 try{await stopHost();}catch(error){cleanupErrors.push(String(error));}
 if(cleanupErrors.length){report.complete=false;report.cleanupErrors=cleanupErrors;process.exitCode=1;}
 report.cancelled=controller.signal.aborted;if(report.cancelled){report.complete=false;process.exitCode=1;}
 clearTimeout(timer);process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);process.removeListener('SIGHUP',stop);report.finished=new Date().toISOString();await fs.writeFile(path.join(directory,'result.json'),JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log('Restore report: '+path.join(directory,'result.json'));
}
