import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../../../package.json',import.meta.url));
const ts=require('typescript'),cache=new Map();
async function module(name){
  if(cache.has(name))return cache.get(name);
  let source=ts.transpileModule(await fs.readFile(new URL(`../../../shared/game/${name}.ts`,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText;
  for(const match of [...source.matchAll(/from ['"]\.\/(\w+)['"]/g)])source=source.replace(match[0],`from ${JSON.stringify(await module(match[1]))}`);
  const url='data:text/javascript;base64,'+Buffer.from(source).toString('base64');cache.set(name,url);return url;
}
const {Client,TransportError,ApiError,readRecovery}=await import(await module('client'));
const reply=(revision=1,id='fixture')=>({save_id:id,state:{revision,world_clock:{elapsed:0,day_seconds:1800},inventory:{seed:6}},world:{id:'overworld'},server_time:1800000000+revision});
function fixture(){
  let session=null,pending=null,next=0,calls=[],handler=async()=>reply();
  const transport={getSession:()=>session,setSession:s=>session=s,clearSession:(id,token)=>{if(session?.saveId===id&&session?.token===token)session=null;},getPending:()=>structuredClone(pending),setPending:(id,p)=>pending=structuredClone(p),uuid:()=>`request-${++next}`,request:async(path,method,body,token)=>{
    if(path==='client-session')return {...reply(),...(token?{}:{session_token:'server-token'})};
    calls.push({path,body:structuredClone(body),token});return handler(path,body);
  }};
  return {transport,calls,get pending(){return pending},get session(){return session},handle:f=>handler=f};
}
let groups=0;
{
 const f=fixture(),client=new Client(f.transport,()=>{});await client.boot();let committed=0;
 f.handle(async(path,b)=>{assert(f.pending);if(b.action==='plant'&&committed++===0)throw new TransportError('lost');return reply(2);});
 await Promise.all([client.command('plant',{target:'plot_0'}),client.command('move',{x:1,y:2})]);
 assert.deepEqual(f.calls[0].body,f.calls[1].body);assert.notEqual(f.calls[1].body.request_id,f.calls[2].body.request_id);assert.equal(f.pending,null);assert.equal(client.status,'ready');groups++;
}
{
 const f=fixture(),client=new Client(f.transport,()=>{});await client.boot();f.handle(async()=>{throw new TransportError('offline');});
 await assert.rejects(client.command('plant'));const saved=structuredClone(f.pending);assert(saved);assert.equal(client.status,'uncertain');await assert.rejects(client.command('plant'));assert.equal(f.calls.length,2);
 const reloaded=new Client(f.transport,()=>{});f.handle(async()=>reply(4));await reloaded.boot();assert.deepEqual(f.calls[2].body,saved.body);assert.equal(f.pending,null);assert.equal(reloaded.state.revision,4);groups++;
}
{
 const f=fixture(),client=new Client(f.transport,()=>{});await client.boot();f.handle(async()=>{throw new ApiError(422,'not enough');});await assert.rejects(client.command('gather'),/not enough/);assert.equal(f.pending,null);assert.equal(client.status,'ready');f.handle(async()=>reply(2));await client.command('move');groups++;
}
{
 const f=fixture();f.transport.setSession({token:'expired',saveId:'fixture'});f.transport.request=async()=>{throw new ApiError(401,'expired');};const c=new Client(f.transport,()=>{});await assert.rejects(c.boot());assert.equal(c.status,'unauthorized');assert.equal(f.session.token,'expired');groups++;
}
{
 const f=fixture(),c=new Client(f.transport,()=>{});await c.boot();let sent=false;f.transport.setPending=()=>{throw Error('storage full');};f.handle(async()=>{sent=true;return reply();});await assert.rejects(c.command('plant'),/storage full/);assert.equal(sent,false);groups++;
}
{
 const f=fixture(),c=new Client(f.transport,()=>{});await c.boot();f.handle(async()=>reply(5));await c.refresh();f.handle(async()=>reply(2));await c.refresh();assert.equal(c.state.revision,5);f.handle(async()=>reply(9,'other'));await assert.rejects(c.refresh(),/存档已切换/);assert.equal(c.saveId,'fixture');groups++;
}
{
 const f=fixture(),c=new Client(f.transport,()=>{});await c.boot();const file=readRecovery(JSON.stringify({format:'realquest-recovery',version:1,recovery_key:'x'.repeat(43)}));
 f.handle(async()=>({...reply(7,'restored'),session_token:'new-token'}));f.transport.setSession=()=>{throw Error('storage denied');};await assert.rejects(c.restore(file),/storage denied/);assert.equal(c.saveId,'fixture');assert.equal(c.token,'server-token');assert.throws(()=>readRecovery('{"state":{"gold":999}}'),/数值存档/);groups++;
}
{
 const f=fixture(),c=new Client(f.transport,()=>{});await c.boot();f.handle(async()=>{throw new TransportError('lost');});await assert.rejects(c.command('plant'));const original=f.pending;
 f.handle(async()=>({...reply(3,'other'),session_token:'new-token'}));await assert.rejects(c.restore({recovery_key:'x'.repeat(43)}),/待保存/);assert.deepEqual(f.pending,original);assert.equal(c.saveId,'fixture');
 f.handle(async(path)=>path==='client-recover'?{...reply(2),session_token:'new-token'}:reply(3));await c.restore({recovery_key:'x'.repeat(43)});assert.deepEqual(f.calls.at(-1).body,original.body);assert.equal(f.pending,null);groups++;
}
{
 const f=fixture(),c=new Client(f.transport,()=>{});await c.boot();f.transport.setSession({token:'another',saveId:'another'});const count=f.calls.length;await assert.rejects(c.command('plant'),/另一页面/);assert.equal(f.calls.length,count);assert.equal(c.status,'unauthorized');await assert.rejects(c.refresh(),/另一页面/);groups++;
}
{
 const data=new Map();const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k),key:i=>[...data.keys()][i]??null,get length(){return data.size;}};
 globalThis.__phase23Storage=storage;
 const sys='data:text/javascript;base64,'+Buffer.from('export const sys={localStorage:globalThis.__phase23Storage,isNative:false}').toString('base64');
 let code=ts.transpileModule(await fs.readFile(new URL('../assets/scripts/platform.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText;
 code=code.replace("from 'cc'",`from ${JSON.stringify(sys)}`).replace("from './core/client'",`from ${JSON.stringify(await module('client'))}`);
 const effects=ts.transpileModule(await fs.readFile(new URL('../assets/scripts/experience.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText;
 code=code.replace("from './core/preferences'",`from ${JSON.stringify(await module('preferences'))}`).replace("from './experience'",`from ${JSON.stringify('data:text/javascript;base64,'+Buffer.from(effects).toString('base64'))}`);
 const {transport}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
 const a={version:1,saveId:'same',body:{save_id:'same',request_id:'tab-a',action:'plant',data:{}}},b={...a,body:{...a.body,request_id:'tab-b',action:'store'}};
 transport.setPending('same',a);transport.setPending('same',b);assert.equal(data.size,2);transport.setPending('same',null,'tab-a');assert.deepEqual(transport.getPending('same'),b);transport.setPending('same',null,'tab-b');assert.equal(transport.getPending('same'),null);
 const token='a'.repeat(43);data.set('realquest-cocos-guest-v1',token);transport.setSession({token,saveId:'same'});assert(!data.has('realquest-cocos-guest-v1'));
 transport.setPending('same',a);transport.setPending('different',{...b,saveId:'different'});data.set('unrelated','keep');data.set('realquest-cocos-inventory-v2:same','same-pref');data.set('realquest-cocos-inventory-v2:different','other-pref');
 transport.clearSession('same','b'.repeat(43));assert(transport.getSession());
 transport.clearSession('same',token);assert.equal(transport.getSession(),null);assert.equal(transport.getPending('same'),null);assert(transport.getPending('different'));assert.equal(data.get('unrelated'),'keep');assert.equal(data.get('realquest-cocos-inventory-v2:same'),undefined);assert.equal(data.get('realquest-cocos-inventory-v2:different'),'other-pref');
 const shapeKey='realquest-outbox-v2:shape:bad';
 for(const raw of ['null','[]','false','0','"lost"','{bad']){data.set(shapeKey,raw);assert.throws(()=>transport.getPending('shape'),/待确认操作记录异常/);assert.equal(data.get(shapeKey),raw);data.delete(shapeKey);}
 const legacyKey='realquest-pending-v1:shape';for(const raw of ['', 'null','[]','false','{bad']){data.set(legacyKey,raw);assert.throws(()=>transport.getPending('shape'),/待确认操作记录异常/);assert.equal(data.get(legacyKey),raw);data.delete(legacyKey);}
 for(const raw of ['null','[]','false','{bad',JSON.stringify({token:'bad',saveId:'same'})]){data.set('realquest-session-v2',raw);assert.throws(()=>transport.getSession(),/本机会话记录异常/);assert.equal(data.get('realquest-session-v2'),raw);data.delete('realquest-session-v2');}
 console.log('PASS original storage adapter rejects16 malformed current/legacy/credential representations, preserves exact bytes and exposes readable messages.');
 delete globalThis.__phase23Storage;groups++;
}
const {walkable,pathfind,accessibleTarget}=await import(await module('navigation'));
const map={id:'overworld',width:320,height:240,obstacles:[[128,64,32,80]],trees:[],objects:[{id:'home',kind:'building',x:64,y:64}]};
assert(!walkable(map,140,100));const route=pathfind(map,{x:64,y:96},{x:224,y:96});assert(route.length);assert(route.every(p=>walkable(map,p.x,p.y)));
assert.equal(accessibleTarget({mapId:'home',targetId:'chest'},{...map,interiors:{home:{...map,id:'home',objects:[]}}},{location:'overworld',world_clock:{elapsed:0,day_seconds:1800},npc_encounter:null},1800000000)?.id,'home');groups++;
console.log(`${groups} shared core groups passed: durable retries/reload, rejection, expired auth, storage failure, stale replies, safe recovery and navigation.`);

// Account previews never replace a guest until explicitly adopted. Passwords
// are request-only; failed network/storage and pending saves keep the old identity.
{
 const f=fixture(),c=new Client(f.transport,()=>{});await c.boot();
 const original=structuredClone(f.session),login={...reply(9,'account-save'),session_token:'account-token',account:{username:'woodland'}};
 f.handle(async(path,b,token)=>{assert.equal(path,'account/login');assert.equal(b.username,'woodland');return login;});
 const preview=await c.authenticate('login','woodland','a long passphrase');
 assert.deepEqual(f.session,original);assert.equal(c.saveId,'fixture');assert.equal(c.account,null);
 await c.adoptAccount(preview);assert.equal(c.saveId,'account-save');assert.equal(c.account.username,'woodland');assert(!JSON.stringify(f.session).includes('passphrase'));
 f.handle(async()=>{throw new TransportError('logout reply lost');});await assert.rejects(c.logout(),/lost/);assert.equal(f.session.logout,true);assert.equal(c.logoutPending,true);
 await assert.rejects(c.command('plant'),/管理/);
 f.handle(async path=>{assert.equal(path,'account/logout');return {logged_out:true};});
 const reloaded=new Client(f.transport,()=>{});assert.equal(await reloaded.boot(),null);assert.equal(f.session,null);assert.equal(reloaded.disconnectionReason,'logout');
 groups++;
}
{
 const f=fixture(),c=new Client(f.transport,()=>{});await c.boot();
 f.handle(async()=>{throw new TransportError('offline');});await assert.rejects(c.command('plant'));
 const count=f.calls.length;await assert.rejects(c.authenticate('register','woodland','long passphrase'),/待保存/);assert.equal(f.calls.length,count);
 f.handle(async()=>reply(2));await c.reconnect();
 f.handle(async()=>({...reply(3),session_token:'bound-token',account:{username:'woodland'}}));
 const old=structuredClone(f.session);f.transport.setSession=()=>{throw Error('storage denied');};
 await assert.rejects(c.authenticate('register','woodland','long passphrase'),/storage denied/);assert.equal(c.token,old.token);assert.equal(c.account,null);assert.deepEqual(f.session,old);groups++;
}
{
 const f=fixture(),c=new Client(f.transport,()=>{});await c.boot();
 f.handle(async()=>{throw new ApiError(401,'bad credentials');});await assert.rejects(c.authenticate('login','woodland','wrong'),/credentials/);assert.equal(c.saveId,'fixture');
 f.handle(async()=>{f.transport.setSession({token:'another-tab',saveId:'other'});return {...reply(2,'account'),session_token:'account-token',account:{username:'woodland'}};});
 await assert.rejects(c.authenticate('login','woodland','long passphrase'),/另一页面/);assert.equal(c.saveId,'fixture');assert.equal(f.session.saveId,'other');groups++;
}
console.log('PASS account preview/adoption, pending-save guards, memory-only passwords, storage rejection, late tab changes and logout retry after reload.');
{
 const f=fixture(),c=new Client(f.transport,()=>{});await c.boot();const old=structuredClone(f.session);
 f.handle(async()=>{throw new TransportError('registration response lost');});await assert.rejects(c.authenticate('register','woodland','long passphrase'),/注册结果待确认/);assert.deepEqual(f.session,old);
 f.handle(async()=>({...reply(3),session_token:'account-token',account:{username:'woodland'}}));
 const preview=await c.authenticate('login','woodland','long passphrase');assert.deepEqual(f.session,old);await c.adoptAccount(preview);assert.equal(c.saveId,old.saveId);assert.equal(c.account.username,'woodland');groups++;
}

// Data lifecycle: no guest creation during cookie lookup, export or deletion recovery.
{
 const f=fixture(),c=new Client(f.transport,()=>{});
 f.handle(async(path)=>{assert.equal(path,'state');return {...reply(3,'cookie-save'),state:{...reply().state,character:{name:'旧网页'},activities:[],study_plan_log:[]}};});
 const preview=await c.inspectWebJourney();assert.equal(preview.save_id,'cookie-save');assert.equal(c.state,null);assert.equal(f.session,null);assert.equal(f.calls[0].token,undefined);
 f.handle(async(path,b)=>{assert.equal(path,'client-from-web');assert.equal(b.save_id,'cookie-save');return {...reply(4,'cookie-save'),session_token:'linked-token'};});
 await c.continueWebJourney(preview.save_id);assert.equal(c.saveId,'cookie-save');assert.equal(f.session.token,'linked-token');groups++;
}
{
 const f=fixture(),c=new Client(f.transport,()=>{});await c.boot();
 f.handle(async()=>({state:{inventory:{seed:6}},ledger:[]}));assert.equal((await c.exportData()).state.inventory.seed,6);
 f.handle(async()=>{f.transport.setSession({saveId:'fixture',token:'other-tab-token'});return {state:{},ledger:[]};});
 await assert.rejects(c.exportData(),/另一页面/);groups++;
}
{
 const f=fixture(),c=new Client(f.transport,()=>{});await c.boot();
 f.handle(async(path)=>{assert.equal(path,'client-delete');throw new TransportError('committed but lost');});
 await assert.rejects(c.deleteData(),/lost/);const intent=structuredClone(f.session);assert(intent.deletion);assert.equal(c.deletionPending,true);
 await assert.rejects(c.command('plant'),/管理/);
 f.handle(async(path,b)=>{assert.equal(path,'client-delete');assert.equal(b.request_id,intent.deletion.requestId);return {deleted:true,save_id:'fixture'};});
 const reloaded=new Client(f.transport,()=>{});assert.equal(await reloaded.boot(),null);assert.equal(f.session,null);assert.equal(reloaded.state,null);assert.equal(reloaded.status,'disconnected');groups++;
}
{
 const f=fixture(),c=new Client(f.transport,()=>{});await c.boot();let sent=false;
 f.transport.setSession=()=>{throw Error('storage denied');};f.handle(async()=>{sent=true;return {deleted:true,save_id:'fixture'};});
 await assert.rejects(c.deleteData(),/storage denied/);assert.equal(sent,false);assert(c.state);groups++;
}
{
 const f=fixture(),c=new Client(f.transport,()=>{});await c.boot();
 f.handle(async()=>{throw new TransportError('offline');});await assert.rejects(c.command('plant'));
 let deleted=false;f.handle(async()=>{deleted=true;return {deleted:true,save_id:'fixture'};});await assert.rejects(c.deleteData(),/待保存/);assert.equal(deleted,false);groups++;
}
console.log(`${groups} total core groups passed, including explicit cookie continuity, guarded export, durable deletion/reload and pending/storage protection.`);
{
 const f=fixture(),c=new Client(f.transport,()=>{});await c.boot();
 f.handle(async()=>{throw new ApiError(403,'denied');});await assert.rejects(c.deleteData(),/denied/);
 assert.equal(c.deletionPending,false);assert.equal(c.status,'ready');assert(c.state);assert.equal(f.session.deletion,undefined);
 f.handle(async()=>{f.transport.setSession({saveId:'elsewhere',token:'other'});return {...reply(8,'restored'),session_token:'restored-token'};});
 await assert.rejects(c.restore({recovery_key:'x'.repeat(43)}),/另一页面/);assert.equal(c.saveId,'fixture');assert.equal(f.session.saveId,'elsewhere');
 groups++;console.log(`${groups} total core groups passed, including definitive deletion rejection and late recovery after another tab switches.`);
}
