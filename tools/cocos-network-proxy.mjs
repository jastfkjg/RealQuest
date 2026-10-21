import net from 'node:net';
import http from 'node:http';
import {validateNetworkBudget} from './cocos-network-budget.mjs';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';

// Application-level TCP payload scheduling, not kernel/TCP-handshake emulation.
// One serialization clock per direction is shared by every owned connection.
export async function createShaper({upstreamPort,port=0,profile}) {
 assert(Number.isInteger(upstreamPort)&&upstreamPort>0&&upstreamPort<65536);
 validateProfile(profile);
 const sockets=new Set(),timers=new Set(),transfers=new Set(),connections=new Map(),errors=[],windows=[];
 const clock={up:0,down:0};let sequence=0,current,closing=false,active=0,closePromise;
 const now=()=>performance.now(),pause=ms=>new Promise(r=>setTimeout(r,ms));
 function transfer(source,target,direction,connection) {
  const queue=[];let queuedBytes=0,ended=false,broken=false,task;
  const channel={cancel(){if(task){clearTimeout(task.timer);timers.delete(task);task=undefined;}active-=queue.length;queue.length=0;queuedBytes=0;transfers.delete(channel);}};
  transfers.add(channel);
  function pump(){
   if(task)return;
   while(queue.length){
    const item=queue[0],left=item.event.due-now();
    if(left>0.5){task={timer:null};timers.add(task);task.timer=setTimeout(()=>{timers.delete(task);task=undefined;pump();},Math.max(1,left));return;}
    queue.shift();queuedBytes-=item.piece.length;active--;
    if(!target.destroyed){const written=now();target.write(item.piece);if(item.window)item.window.events.push({...item.event,written});}
    if(queuedBytes<131072&&!broken&&!source.destroyed)source.resume();
   }
   if(ended&&!target.destroyed)target.end();
   if(broken)transfers.delete(channel);
  }
  source.on('data',buffer=>{
   const rate=profile[direction==='down'?'downloadBytesPerSec':'uploadBytesPerSec'];
   for(let offset=0;offset<buffer.length;offset+=8192){
    const piece=buffer.subarray(offset,Math.min(offset+8192,buffer.length)),enqueued=now(),ready=enqueued+profile.latencyMs/2;
    const due=rate===-1?ready:Math.max(ready,clock[direction])+piece.length/rate*1000;
    if(rate!==-1)clock[direction]=due;
    queue.push({piece,window:current,event:{sequence:++sequence,connection,direction,bytes:piece.length,enqueued,due}});queuedBytes+=piece.length;active++;
   }
   if(queuedBytes>=262144)source.pause();pump();
  });
  source.on('end',()=>{ended=true;pump();});
  source.on('close',()=>{broken=true;ended=true;pump();});
 }
 const server=net.createServer({allowHalfOpen:true,highWaterMark:65536},client=>{
  const id=connections.size+1,upstream=net.connect({host:'127.0.0.1',port:upstreamPort,allowHalfOpen:true,highWaterMark:65536});
  connections.set(id,{id,started:now()});
  for(const socket of [client,upstream]){sockets.add(socket);socket.setNoDelay(true);socket.on('error',e=>{if(!closing)errors.push({connection:id,code:e.code});client.destroy();upstream.destroy();});socket.on('close',()=>{sockets.delete(socket);if(socket===client)upstream.destroy();});}
  transfer(client,upstream,'up',id);transfer(upstream,client,'down',id);
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
 async function idle(timeout=10000){const start=now();for(;;){if(!active){await pause(30);if(!active)return;}assert(now()-start<timeout,'Shaper pending writes did not drain');await pause(10);}}
 function reset(next){validateProfile(next);assert(!closing&&!active,'Reset only between completed samples');for(const s of sockets)s.destroy();profile=next;clock.up=clock.down=0;current=undefined;}
 async function close(){if(closePromise)return closePromise;closePromise=(async()=>{closing=true;for(const s of sockets)s.destroy();for(const channel of [...transfers])channel.cancel();await new Promise(r=>server.close(r));await pause(20);assert.equal(sockets.size,0);assert.equal(active,0);assert.equal(timers.size,0);return {closed:true,sockets:0,pendingWrites:0,timers:0,errors};})();return closePromise;}
 return {port:server.address().port,profile:()=>profile,reset,idle,close,
  beginWindow(label){assert(!current&&!active,'Window must start after all prior transfers finish');current={label,profile:{...profile},started:now(),events:[]};windows.push(current);},
  async endWindow(){assert(current);await idle();const result=current;current=undefined;result.finished=now();result.upstreamBytes=result.events.filter(e=>e.direction==='up').reduce((n,e)=>n+e.bytes,0);result.downstreamBytes=result.events.filter(e=>e.direction==='down').reduce((n,e)=>n+e.bytes,0);return result;},
  stats:()=>({sockets:sockets.size,pendingWrites:active,timers:timers.size,connections:connections.size,errors:[...errors]}),windows
 };
}

function validateProfile(p){
 assert(p&&Number.isFinite(p.latencyMs)&&p.latencyMs>=0);
 for(const k of ['downloadBytesPerSec','uploadBytesPerSec'])assert(p[k]===-1||Number.isFinite(p[k])&&p[k]>0);
}

export function validateFirefoxNetworkBrowser(version,userAgent){
 assert(typeof version==='string'&&/^\d+(?:\.\d+){1,3}$/.test(version),'Native Firefox version required');
 assert(typeof userAgent==='string'&&!/(?:Chrome|Edg)\//.test(userAgent));
 const actual=userAgent.match(/\bFirefox\/(\d+)(?:\.\d+){1,3}(?:\s|$)/);
 assert(actual&&actual[1]===version.split('.')[0],'Firefox UA major must match native driver version');
}

// Reconstruct the shared clocks from raw writes. Counts or complete:true alone
// cannot establish that the throttle was applied to actual navigation traffic.
export function validateProxyWindow(w,profile){
 assert(w&&Array.isArray(w.events)&&w.events.length>0);assert.deepEqual(w.profile,profile);
 assert(Number.isFinite(w.started)&&Number.isFinite(w.finished)&&w.finished>=w.started);
 const next={up:0,down:0},total={up:0,down:0},seen=new Set();
 const streamSequence=new Map();
 for(const e of w.events){
  assert(Number.isSafeInteger(e.connection)&&e.connection>0);const key=e.connection+':'+e.direction;
  assert(e.sequence>(streamSequence.get(key)||0),'TCP stream write order');streamSequence.set(key,e.sequence);
 }
 for(const e of [...w.events].sort((a,b)=>a.sequence-b.sequence)){
  assert(Number.isSafeInteger(e.sequence)&&e.sequence>0&&!seen.has(e.sequence));seen.add(e.sequence);
  assert(['up','down'].includes(e.direction)&&Number.isSafeInteger(e.bytes)&&e.bytes>0&&e.bytes<=8192);
  assert([e.enqueued,e.due,e.written].every(Number.isFinite));
  assert(e.enqueued>=w.started&&e.written>=e.enqueued&&e.written<=w.finished&&e.written+3>=e.due);
  const rate=profile[e.direction==='up'?'uploadBytesPerSec':'downloadBytesPerSec'],ready=e.enqueued+profile.latencyMs/2;
  const expected=rate===-1?ready:Math.max(ready,next[e.direction])+e.bytes/rate*1000;
  assert(Math.abs(expected-e.due)<0.001,'Shared scheduling clock');if(rate!==-1)next[e.direction]=expected;
  total[e.direction]+=e.bytes;
 }
 assert.equal(total.up,w.upstreamBytes);assert.equal(total.down,w.downstreamBytes);return total;
}

export function evaluateFirefoxNetworkRun(report,budget){
 validateNetworkBudget(budget);assert.deepEqual(report.errors,[]);
 assert.equal(report.results.length,budget.profiles.reduce((n,p)=>n+p.samples,0));
 const failures=[],seen=new Set();
 for(const profile of budget.profiles)for(let sample=1;sample<=profile.samples;sample++){
  const label=profile.id+'-'+sample,r=report.results.find(x=>x.label===label);
  assert(r&&!seen.has(label));seen.add(label);assert.deepEqual(r.profile,profile);
  assert(r.firstMovePassed&&r.sameSave&&r.studyCreateReceipts===1&&r.originalResourcesPreserved);
  for(const kind of ['cold','warm']){
   const m=r[kind];assert(m&&Number.isFinite(m.readyMs)&&m.readyMs>0);assert.equal(m.performance?.bufferFull,0);
   assert(Number.isSafeInteger(m.requests)&&m.requests>0);assert(Number.isSafeInteger(m.cachedRequests)&&m.cachedRequests>=0);
   const total=validateProxyWindow(m.proxyWindow,profile);assert(total.up>0&&total.down>0);assert.equal(m.httpBytes,total.down);
   if(kind==='cold')assert(m.gzipResponses>0&&m.performance.resources.length>0&&m.cachedRequests===0);
   else assert(m.cachedRequests>0&&m.httpBytes<r.cold.httpBytes/4,'Warm cache must avoid proxy transfers');
   const cap=profile[kind+'ReadyMs'];if(cap!==null&&m.readyMs>cap)failures.push({label:label+' '+kind+' readyMs',actual:m.readyMs,limit:cap});
   if(kind==='cold'&&m.httpBytes>budget.maxColdHttpBytes)failures.push({label:label+' cold HTTP payload bytes',actual:m.httpBytes,limit:budget.maxColdHttpBytes});
  }
 }
 return failures;
}

export const calibrationLimits=Object.freeze({bytes:1048576,parallelConnections:4,minimumRTTSlackMs:5,throughputUpperRatio:1.03,throughputLowerRatio:0.75,scheduleEarlySlackMs:3});

export async function calibrateShaper({budget,signal,onProgress=()=>{}}){
 validateNetworkBudget(budget);
 const report={started:new Date().toISOString(),kind:'shared-duplex-HTTP-payload-shaper-calibration',limits:calibrationLimits,samples:[],complete:false};
 const abort=()=>signal?.throwIfAborted();let shaper,server;
 async function request(port,{method='GET',bytes=0,body}={}){
  abort();const started=performance.now();return new Promise((resolve,reject)=>{
   const r=http.request({host:'127.0.0.1',port,path:'/?bytes='+bytes,method,agent:false,signal,headers:body?{'Content-Length':body.length}:{}},s=>{let count=0;s.on('data',b=>count+=b.length);s.on('end',()=>resolve({bytes:count,ms:performance.now()-started,status:s.statusCode,serverReceivedBytes:Number(s.headers['x-qa-received'])}));s.once('error',reject);});
   r.once('error',reject);if(body)r.write(body);r.end();
  });
 }
 try{
  abort();server=http.createServer((req,res)=>{const bytes=Number(new URL(req.url,'http://qa').searchParams.get('bytes'));let received=0;req.on('data',b=>received+=b.length);req.on('end',()=>{res.setHeader('Connection','close');res.setHeader('Content-Length',req.method==='POST'?0:bytes);res.setHeader('X-QA-Received',received);res.end(req.method==='POST'?undefined:Buffer.alloc(bytes,91));});});
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  shaper=await createShaper({upstreamPort:server.address().port,profile:budget.profiles[0]});
  report.ports={origin:server.address().port,proxy:shaper.port};
  for(const profile of budget.profiles.filter(p=>p.downloadBytesPerSec>0)){
   abort();shaper.reset(profile);
   for(const mode of ['latency','single-download','parallel-download','upload']){
    abort();shaper.beginWindow(profile.id+'-'+mode);const start=performance.now();
    const received=mode==='parallel-download'?await Promise.all(Array.from({length:4},()=>request(shaper.port,{bytes:262144}))):[await request(shaper.port,mode==='upload'?{method:'POST',body:Buffer.alloc(262144,32)}:{bytes:mode==='latency'?0:1048576})];
    const elapsed=performance.now()-start,window=await shaper.endWindow();report.samples.push({profile:profile.id,mode,elapsedMs:elapsed,received,window});
    validateProxyWindow(window,profile);assert(received.every(r=>r.status===200));
    if(mode==='latency')assert(elapsed>=profile.latencyMs-calibrationLimits.minimumRTTSlackMs);
    else{const direction=mode==='upload'?'up':'down',bytes=window[direction==='up'?'upstreamBytes':'downstreamBytes'],rate=profile[direction==='up'?'uploadBytesPerSec':'downloadBytesPerSec'];assert(received.reduce((n,r)=>n+r.bytes,0)===(mode==='upload'?0:1048576));if(mode==='upload')assert.equal(received[0].serverReceivedBytes,262144);const effective=bytes/elapsed*1000;assert(effective<=rate*calibrationLimits.throughputUpperRatio&&effective>=rate*calibrationLimits.throughputLowerRatio,'Shared throughput bounds');}
    onProgress({profile:profile.id,mode,elapsedMs:elapsed});
   }
  }
  abort();shaper.beginWindow('cancelled-transfer');
  await new Promise((resolve,reject)=>{const r=http.get({host:'127.0.0.1',port:shaper.port,path:'/?bytes=1048576',agent:false,signal},s=>{s.once('data',()=>{s.destroy();r.destroy();resolve();});s.once('error',reject);});r.once('error',reject);});
  report.cancelledTransferCleanup=await shaper.close();shaper=undefined;report.complete=true;
 }catch(e){report.error=String(e);report.cancelled=!!signal?.aborted;}
 finally{
  if(shaper)try{report.cleanup=await shaper.close();}catch(e){report.cleanupError=String(e);report.complete=false;}
  if(server?.listening){server.closeAllConnections();await new Promise(r=>server.close(r));}
  report.originClosed=!server?.listening;
  report.finished=new Date().toISOString();
 }
 return report;
}
