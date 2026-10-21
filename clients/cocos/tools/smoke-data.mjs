import {browserConfig,launchBrowser,closeBrowser} from '../../../tools/cocos-browser-config.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../../../package.json',import.meta.url));
const {chromium}=require('playwright');
const test=await browserConfig('data');const base=test.baseURL,out=test.directory;
await fs.mkdir(out,{recursive:true});
const browser=await launchBrowser(chromium,{headless:true});
const contexts=[],errors=[],checks=[],captures=[],expected=[];
let originalFile;
const read=p=>p.evaluate(()=>JSON.parse(window.render_game_to_text()));
async function until(p,predicate,label='condition'){
 for(let i=0;i<180;i++){const s=await read(p);if(predicate(s))return s;await p.waitForTimeout(80);}
 throw Error(label+': '+JSON.stringify(await read(p)));
}
async function click(p,id){const s=await until(p,s=>s.controls.some(c=>c.id===id&&!c.disabled),'click '+id),c=s.controls.find(c=>c.id===id);await p.mouse.click(c.x,c.y);await p.waitForTimeout(100);}
async function load(p){await p.goto(base);await p.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).loaded);}
async function context(options={}){
 const c=await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true,...options});contexts.push(c);
 const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
 p.on('response',r=>{if(r.status()>=400&&!r.url().includes('/api/'))errors.push('resource '+r.status()+' '+r.url());});
 p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::ERR_FAILED/.test(m.text()))errors.push(m.text());});
 return {c,p};
}
function check(label){checks.push(label);console.log('PASS '+label);}
async function shot(p,name){await p.waitForTimeout(150);await p.screenshot({path:out+'/'+name+'.png'});captures.push(name);}
async function session(p,page='recovery'){if((await read(p)).mode!=='session')await click(p,'session');await click(p,'session-tab-'+page);}
async function api(p,path,method='GET',body,token){return p.request.fetch(base+'/api/'+path,{method,data:body,headers:token?{Authorization:'Bearer '+token}:{}});}
async function auth(p){return p.evaluate(()=>JSON.parse(localStorage.getItem('realquest-session-v2')));}
async function download(p,id){const promise=p.waitForEvent('download');await click(p,id);const d=await promise;const file=out+'/tmp-'+d.suggestedFilename();await d.saveAs(file);return {file,value:JSON.parse(await fs.readFile(file,'utf8'))};}
async function importFile(p,value){const choose=p.waitForEvent('filechooser');await click(p,'choose-recovery');await(await choose).setFiles({name:'recovery.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(value))});}
async function geometry(p){const s=await read(p),v=p.viewportSize();for(const c of s.controls){assert(c.w>=44&&c.h>=44,c.id+' touch size');assert(c.x-c.w/2>=0&&c.x+c.w/2<=v.width&&c.y-c.h/2>=0&&c.y+c.h/2<=v.height,c.id+' viewport');}for(let i=0;i<s.controls.length;i++)for(let j=i+1;j<s.controls.length;j++){const a=s.controls[i],b=s.controls[j];assert(!(Math.abs(a.x-b.x)<(a.w+b.w)/2-1&&Math.abs(a.y-b.y)<(a.h+b.h)/2-1),'overlap '+a.id+' / '+b.id);}}
try{
 const {c,p}=await context();
 await load(p);await click(p,'import-save');await click(p,'find-web-journey');await until(p,s=>s.error.includes('未找到'));
 assert.equal(await auth(p),null);await shot(p,'missing-cookie');check('missing cookie lookup creates no Cocos guest');
 await api(p,'session','POST');await api(p,'command','POST',{action:'create',request_id:'legacy-create-data',data:{name:'旧网页旅人',appearance:5}});
 await api(p,'command','POST',{action:'activity',request_id:'legacy-manual-data',data:{kind:'study',amount:5,note:'旧网页学习记录'}});
 const key=crypto.randomUUID();await api(p,'command','POST',{action:'study_plan_create',request_id:'legacy-plan-data',data:{plan_id:key,title:'旧网页长期计划',daily_minutes:25}});
 const original=(await(await api(p,'state')).json()).save_id;
 const before=await(await api(p,'export')).json();originalFile=await(await api(p,'recovery-file','POST')).json();
 await click(p,'find-web-journey');await until(p,s=>s.recoverySource==='web');await shot(p,'cookie-preview');
 await click(p,'cancel-restore');assert.equal(await auth(p),null);
 await click(p,'find-web-journey');await click(p,'confirm-restore');await until(p,s=>s.mode==='world'&&!s.busy);
 assert.equal((await read(p)).saveId,original);assert.equal((await read(p)).appearance,5);
 const linked=await auth(p);let after=await(await api(p,'export','GET',undefined,linked.token)).json();
 for(const field of ['character','inventory','storage','study_plans','activities','quests','knowledge_growth','health_points','skill_points'])assert.deepEqual(after.state[field],before.state[field],field+' preserved');
 assert.equal((await(await api(p,'state')).json()).save_id,original);
 check('cookie preview/cancel/confirm preserves original save, records, plans, appearance and Web cookie');
 await session(p,'data');const full=await download(p,'export-data');assert.deepEqual(full.value.state.character,before.state.character);assert(Array.isArray(full.value.ledger));
 const credential=await download(p,'data-export-recovery');assert.equal(credential.value.format,'realquest-recovery');assert.equal(full.value.format,undefined);
 await click(p,'delete-begin');await shot(p,'delete-confirm-desktop');await click(p,'delete-cancel');assert.equal((await read(p)).saveId,original);
 let failed=false;await p.route('**/api/export',async r=>{if(!failed){failed=true;expected.push('503 export');await r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({detail:'测试导出失败'})});}else await r.continue();});
 await click(p,'export-data');await until(p,s=>s.error.includes('测试导出失败'));await shot(p,'export-rejected');await download(p,'export-data');await p.unroute('**/api/export');
 check('full export vs recovery credential, deletion cancellation and export failure/retry');
 for(const size of [{width:1920,height:1080},{width:1024,height:768},{width:844,height:390},{width:740,height:360}]){
  await p.setViewportSize(size);await p.waitForTimeout(200);await session(p,'data');await geometry(p);await shot(p,'data-'+size.width);
  await click(p,'delete-begin');await geometry(p);await shot(p,'delete-'+size.width);await click(p,'delete-cancel');await session(p,'recovery');await click(p,'find-web-journey');await geometry(p);await shot(p,'preview-'+size.width);await click(p,'cancel-restore');
 }
 check('desktop and short-landscape export/delete/recovery controls in bounds, no overlap, 44px targets');
 const {c:c2,p:p2}=await context({viewport:{width:740,height:360},deviceScaleFactor:2,hasTouch:true,reducedMotion:'reduce'});
 await load(p2);await click(p2,'start');await until(p2,s=>s.mode==='world'&&!s.busy);const separate=await auth(p2);assert.notEqual(separate.saveId,original);
 await load(p2);await click(p2,'import-save');await until(p2,s=>s.saveId===separate.saveId&&!s.busy);
 await importFile(p2,{state:{gold:999}});await until(p2,s=>s.error.includes('数值存档'));assert.equal((await read(p2)).saveId,separate.saveId);
 await importFile(p2,{...originalFile,recovery_key:'x'.repeat(43)});await until(p2,s=>!!s.error);assert.equal((await read(p2)).saveId,separate.saveId);
 await importFile(p2,originalFile);await until(p2,s=>s.recoverySource==='file');assert((await read(p2)).controls.find(c=>c.id==='confirm-restore').disabled);
 const backup=await download(p2,'backup-before-restore');assert((await read(p2)).controls.find(c=>c.id==='confirm-restore').disabled);await click(p2,'backup-saved');assert(!(await read(p2)).controls.find(c=>c.id==='confirm-restore').disabled);await shot(p2,'backup-confirmed-touch');
 await click(p2,'cancel-restore');assert.equal((await read(p2)).saveId,separate.saveId);
 await importFile(p2,originalFile);await click(p2,'confirm-restore');await until(p2,s=>s.mode==='world'&&!s.busy);assert.equal((await read(p2)).saveId,original);
 await session(p2);await importFile(p2,backup.value);await download(p2,'backup-before-restore');await click(p2,'backup-saved');await click(p2,'confirm-restore');await until(p2,s=>s.mode==='world'&&!s.busy);assert.equal((await read(p2)).saveId,separate.saveId);
 check('invalid/numerical/wrong-server credentials preserve save; explicit saved-backup acknowledgement and bidirectional file recovery');
 await c2.addCookies(await c.cookies());
 await p2.evaluate(()=>localStorage.setItem('unrelated-pref','keep'));
 await session(p2,'data');await click(p2,'delete-begin');
 let lost=false;await p2.route('**/api/client-delete',async r=>{if(!lost){lost=true;expected.push('committed deletion response lost');await r.fetch();await r.abort();}else await r.continue();});
 await click(p2,'delete-confirm');await until(p2,s=>s.deletionPending&&!s.busy);await shot(p2,'delete-uncertain');assert((await auth(p2)).deletion);
 const newGuests=[];p2.on('request',r=>{if(r.url().endsWith('/api/client-session'))newGuests.push(r.url());});
 await load(p2);const pendingWelcome=await read(p2);assert.equal(pendingWelcome.controls.find(c=>c.id==='start').label,'确认删除结果');assert(pendingWelcome.controls.find(c=>c.id==='import-save').disabled);await shot(p2,'delete-retry-welcome');
 await click(p2,'start');await until(p2,s=>s.mode==='welcome'&&!s.busy&&!s.deletionPending&&s.notice.includes('已删除'));await shot(p2,'delete-confirmed-after-reload');
 assert.equal(await auth(p2),null);assert.equal(newGuests.length,0);assert.equal(await p2.evaluate(()=>localStorage.getItem('unrelated-pref')),'keep');
 assert.equal((await api(p2,'state','GET',undefined,separate.token)).status(),401);
 assert.equal((await api(p2,'recovery-preview','POST',{recovery_key:backup.value.recovery_key})).status(),404);
 assert.equal((await(await api(p2,'state')).json()).save_id,original);
 check('lost deletion response survives reload, repeats same request, clears only selected session, revokes credential, keeps other cookie journey');
 // A second, actual touch-driven confirmation against the original isolated save.
 await click(p2,'import-save');await click(p2,'find-web-journey');await click(p2,'confirm-restore');await until(p2,s=>s.mode==='world'&&!s.busy);await session(p2,'data');await click(p2,'delete-begin');
 const last=await read(p2),control=last.controls.find(c=>c.id==='delete-confirm');await p2.touchscreen.tap(control.x,control.y);await until(p2,s=>s.mode==='welcome'&&!s.busy&&!s.saveId);
 assert.equal((await api(p,'state')).status(),401);assert.equal((await api(p,'state','GET',undefined,linked.token)).status(),401);
 assert.equal((await api(p,'recovery-preview','POST',{recovery_key:originalFile.recovery_key})).status(),404);
 check('touch deletion of same journey invalidates old Web cookie, other Cocos token and recovery file');
 assert.deepEqual(errors,[]);
 await fs.writeFile(out+'/result.json',JSON.stringify({checks,captures,errors,expected},null,2));
 console.log(`${checks.length} groups / ${captures.length} captures; no unexpected page errors.`);
}finally{
 for(const c of contexts)await c.close();await closeBrowser(browser);
 for(const name of await fs.readdir(out))if(name.startsWith('tmp-'))await fs.rm(out+'/'+name,{force:true});
}
