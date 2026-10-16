import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../../../frontend/package.json',import.meta.url));
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
  const transport={getSession:()=>session,setSession:s=>session=s,getPending:()=>structuredClone(pending),setPending:(id,p)=>pending=structuredClone(p),uuid:()=>`request-${++next}`,request:async(path,method,body,token)=>{
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
 const data=new Map();const storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k),key:i=>[...data.keys()][i]??null,get length(){return data.size;}};
 globalThis.__phase23Storage=storage;
 const sys='data:text/javascript;base64,'+Buffer.from('export const sys={localStorage:globalThis.__phase23Storage,isNative:false}').toString('base64');
 let code=ts.transpileModule(await fs.readFile(new URL('../assets/scripts/platform.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText;
 code=code.replace("from 'cc'",`from ${JSON.stringify(sys)}`).replace("from './core/client'",`from ${JSON.stringify(await module('client'))}`);
 const {transport}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
 const a={version:1,saveId:'same',body:{save_id:'same',request_id:'tab-a',action:'plant',data:{}}},b={...a,body:{...a.body,request_id:'tab-b',action:'store'}};
 transport.setPending('same',a);transport.setPending('same',b);assert.equal(data.size,2);transport.setPending('same',null,'tab-a');assert.deepEqual(transport.getPending('same'),b);transport.setPending('same',null,'tab-b');assert.equal(transport.getPending('same'),null);delete globalThis.__phase23Storage;groups++;
}
const {walkable,pathfind,accessibleTarget}=await import(await module('navigation'));
const map={id:'overworld',width:320,height:240,obstacles:[[128,64,32,80]],trees:[],objects:[{id:'home',kind:'building',x:64,y:64}]};
assert(!walkable(map,140,100));const route=pathfind(map,{x:64,y:96},{x:224,y:96});assert(route.length);assert(route.every(p=>walkable(map,p.x,p.y)));
assert.equal(accessibleTarget({mapId:'home',targetId:'chest'},{...map,interiors:{home:{...map,id:'home',objects:[]}}},{location:'overworld',world_clock:{elapsed:0,day_seconds:1800},npc_encounter:null},1800000000)?.id,'home');groups++;
console.log(`${groups} shared core groups passed: durable retries/reload, rejection, expired auth, storage failure, stale replies, safe recovery and navigation.`);
