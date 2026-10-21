import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import {performance} from 'node:perf_hooks';
import {createShaper,calibrateShaper,validateFirefoxNetworkBrowser,validateProxyWindow,evaluateFirefoxNetworkRun} from './cocos-network-proxy.mjs';

validateFirefoxNetworkBrowser('158.0','Mozilla/5.0 Firefox/158.0');
validateFirefoxNetworkBrowser('158.0.1','Mozilla/5.0 Firefox/158.0');
for(const [v,u] of [['158.0','Firefox/155.0'],['158.0','Chrome/158.0'],['158.0','Chrome/158.0 Firefox/158.0'],['158','Firefox/158.0'],[undefined,'Firefox/158.0']])assert.throws(()=>validateFirefoxNetworkBrowser(v,u));
const p={id:'fixture',samples:1,latencyMs:20,downloadBytesPerSec:1000,uploadBytesPerSec:1000,coldReadyMs:1000,warmReadyMs:500};
const window=warm=>({profile:p,started:0,finished:100,events:[{sequence:1,connection:1,direction:'up',bytes:10,enqueued:0,due:20,written:20},{sequence:2,connection:1,direction:'down',bytes:warm?4:40,enqueued:20,due:warm?34:70,written:warm?34:70}],upstreamBytes:10,downstreamBytes:warm?4:40});
const metric=warm=>({readyMs:100,httpBytes:warm?4:40,requests:2,cachedRequests:warm?1:0,gzipResponses:1,performance:{bufferFull:0,resources:[{}]},proxyWindow:window(warm)});
const valid={errors:[],results:[{label:'fixture-1',profile:p,firstMovePassed:true,sameSave:true,studyCreateReceipts:1,originalResourcesPreserved:true,cold:metric(false),warm:metric(true)}]},budget={schemaVersion:1,maxColdHttpBytes:100,resourceTimingBuffer:5000,profiles:[p]};
assert.deepEqual(evaluateFirefoxNetworkRun(valid,budget),[]);
function rejects(change){const r=structuredClone(valid);change(r);assert.throws(()=>evaluateFirefoxNetworkRun(r,budget));}
for(const change of [r=>r.results.pop(),r=>r.results.push(r.results[0]),r=>r.results[0].firstMovePassed=false,r=>r.results[0].studyCreateReceipts=2,r=>r.results[0].warm.cachedRequests=0,r=>r.results[0].cold.proxyWindow.events[1].due--,r=>r.results[0].cold.proxyWindow.downstreamBytes++,r=>r.results[0].cold.proxyWindow.events[1].written=30,r=>r.results[0].cold.readyMs=Infinity,r=>r.results[0].cold.performance.bufferFull=1])rejects(change);
const over=structuredClone(valid);over.results[0].cold.readyMs=1001;over.results[0].warm.readyMs=501;assert.equal(evaluateFirefoxNetworkRun(over,budget).length,2);
assert.equal(evaluateFirefoxNetworkRun(valid,{...budget,maxColdHttpBytes:39}).length,1);

let server,shaper;
const payload=Buffer.alloc(16384,83),profile={...p,latencyMs:10,downloadBytesPerSec:128000,uploadBytesPerSec:128000};
async function receive(port){return new Promise((resolve,reject)=>{const r=http.get({host:'127.0.0.1',port,agent:false},s=>{const chunks=[];s.on('data',b=>chunks.push(b));s.on('end',()=>resolve(Buffer.concat(chunks)));s.once('error',reject);});r.once('error',reject);});}
try{
 server=http.createServer((req,res)=>{res.setHeader('Connection','close');res.end(payload);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 shaper=await createShaper({upstreamPort:server.address().port,profile});shaper.beginWindow('four-concurrent-integrity');const start=performance.now();
 const bodies=await Promise.all(Array.from({length:4},()=>receive(shaper.port)));const elapsed=performance.now()-start,w=await shaper.endWindow();
 for(const body of bodies)assert.deepEqual(body,payload);validateProxyWindow(w,profile);assert(w.downstreamBytes>=payload.length*4);assert(elapsed>=payload.length*4/profile.downloadBytesPerSec*1000-5,'Concurrent responses share aggregate bandwidth');
 const a=await shaper.close(),b=await shaper.close();assert.deepEqual(a,b);assert(a.closed&&a.sockets===0&&a.pendingWrites===0&&a.timers===0);shaper=undefined;
}finally{if(shaper)await shaper.close();if(server?.listening){server.closeAllConnections();await new Promise(r=>server.close(r));}}

// A request half-close can close the upstream while response bytes remain paced.
// Preserve the entire nonuniform payload and its order before forwarding EOF.
let rawServer,rawProxy;
try{
 const payload=Buffer.alloc(524288);for(let i=0;i<payload.length;i++)payload[i]=i%251;
 const expected=Buffer.concat([Buffer.from('HTTP/1.1 200 OK\r\nContent-Length: '+payload.length+'\r\nConnection: close\r\n\r\n'),payload]);
 rawServer=net.createServer({allowHalfOpen:true},s=>{let sent=false;s.on('data',()=>{if(!sent){sent=true;s.end(expected);}});s.on('error',()=>{});});await new Promise(r=>rawServer.listen(0,'127.0.0.1',r));
 rawProxy=await createShaper({upstreamPort:rawServer.address().port,profile:{latencyMs:80,downloadBytesPerSec:1250000,uploadBytesPerSec:250000}});
 const received=await new Promise((resolve,reject)=>{const chunks=[],s=net.connect({host:'127.0.0.1',port:rawProxy.port,allowHalfOpen:true});s.once('connect',()=>s.end('GET / HTTP/1.1\r\nHost: qa\r\nConnection: close\r\n\r\n'));s.on('data',b=>chunks.push(b));s.once('close',()=>resolve(Buffer.concat(chunks)));s.once('error',reject);});
 assert.deepEqual(received,expected,'Half-closed TCP request must retain every paced response byte in order');
}finally{if(rawProxy)await rawProxy.close();if(rawServer?.listening)await new Promise(r=>rawServer.close(r));}

const abort=new AbortController();let timer;
const cancelled=await calibrateShaper({budget:{...budget,profiles:[profile]},signal:abort.signal,onProgress:()=>{timer=setTimeout(()=>abort.abort(),10);}});clearTimeout(timer);
assert(!cancelled.complete&&cancelled.cancelled&&cancelled.samples.length===1&&cancelled.cleanup.closed&&cancelled.originClosed);
assert(cancelled.cleanup.sockets===0&&cancelled.cleanup.pendingWrites===0&&cancelled.cleanup.timers===0);
for(const port of Object.values(cancelled.ports)){
 const open=await new Promise((resolve,reject)=>{const s=net.connect({host:'127.0.0.1',port});s.once('connect',()=>{s.destroy();resolve(true);});s.once('error',e=>{s.destroy();if(e.code==='ECONNREFUSED')resolve(false);else reject(e);});});assert.equal(open,false,'Cancelled calibration port closed');
}
console.log('PASS network proxy: Firefox identity, raw shared-clock/byte evidence, per-sample budgets, parallel payload integrity/aggregate cap, idempotent close and active calibration cancellation with closed ports.');
