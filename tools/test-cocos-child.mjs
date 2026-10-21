import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {runOwned} from './cocos-child.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),out=await fs.mkdtemp(path.join(root,'output/child-lifecycle-'));
const sentinel=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'}),closed=new Promise(resolve=>sentinel.once('close',resolve));
const alive=pid=>{try{process.kill(pid,0);return true;}catch(e){if(e.code==='ESRCH')return false;throw e;}};
try{
 const pass=await runOwned(process.execPath,['-e','console.log("child proof")'],{cwd:root,log:path.join(out,'pass.log')});assert.equal(pass.code,0);assert((await fs.readFile(pass.log,'utf8')).includes('child proof'));
 const failed=await runOwned(process.execPath,['-e','process.exit(7)'],{cwd:root,log:path.join(out,'failed.log')});assert.equal(failed.code,7);
 const timeout=await runOwned(process.execPath,['-e',`const fs=require('fs'),{spawn}=require('child_process');const c=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'inherit'});fs.writeFileSync(process.argv[1],String(c.pid));setInterval(()=>{},1000)`,path.join(out,'descendant.pid')],{cwd:root,log:path.join(out,'timeout.log'),timeoutMs:400});assert(timeout.timedOut);assert(!alive(timeout.pid));const descendant=Number(await fs.readFile(path.join(out,'descendant.pid'),'utf8'));assert(!alive(descendant));assert(alive(sentinel.pid),'unrelated sibling must survive owned group cleanup');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),200);const cancelled=await runOwned(process.execPath,['-e','setInterval(()=>{},1000)'],{cwd:root,log:path.join(out,'cancelled.log'),signal:controller.signal});clearTimeout(timer);assert(cancelled.cancelled&&!cancelled.timedOut);assert(!alive(cancelled.pid));
 const worker=`require('fs').writeFileSync(process.argv[1],String(process.pid));process.on('SIGTERM',()=>{});setInterval(()=>{},1000)`,pidFile=path.join(out,'nested.pid');
 const nested=`import {runOwned} from ${JSON.stringify(new URL('./cocos-child.mjs',import.meta.url).href)};await runOwned(process.execPath,['-e',${JSON.stringify(worker)},${JSON.stringify(pidFile)}],{cwd:${JSON.stringify(root)},log:${JSON.stringify(path.join(out,'inner.log'))},timeoutMs:10000});`;
 const parent=await runOwned(process.execPath,['--input-type=module','-e',nested],{cwd:root,log:path.join(out,'nested.log'),timeoutMs:500});assert(parent.timedOut);assert(!alive(parent.pid));assert(!alive(Number(await fs.readFile(pidFile,'utf8'))));assert(alive(sentinel.pid));
 console.log('PASS owned child exit/failure/timeout/cancellation; descendant group exits, unrelated sibling survives.');
}finally{if(alive(sentinel.pid))sentinel.kill('SIGTERM');await closed;assert(!alive(sentinel.pid));}
