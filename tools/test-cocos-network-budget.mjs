import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {networkOptions,validateNetworkBrowser,validateNetworkBudget,evaluateNetworkRun} from './cocos-network-budget.mjs';
const budget=validateNetworkBudget(JSON.parse(await fs.readFile(new URL('./cocos-network-budget-v1.json',import.meta.url),'utf8')));
assert.deepEqual(networkOptions(['--artifact','output/release']),{artifact:'output/release'});
assert.deepEqual(networkOptions(['--artifact','output/release','--browser','firefox']),{artifact:'output/release',browser:'firefox'});
assert.deepEqual(networkOptions(['--browser','firefox','--artifact','output/release']),{artifact:'output/release',browser:'firefox'});
assert.deepEqual(networkOptions(['--artifact','output/release','--browser','chromium']),{artifact:'output/release'});
for(const args of [['--browser','firefox'],['--artifact','x','--browser','webkit'],['--artifact','x','--artifact','y'],['--artifact','x','--browser','firefox','--browser','firefox'],['--artifact','x','--browser']])assert.throws(()=>networkOptions(args));
for(const args of [[],['--url','http://127.0.0.1:5442'],['--database','player.db'],['--artifact','output/release','--samples','1'],['--artifact','output/release','--budget','relaxed.json']])assert.throws(()=>networkOptions(args));
for(const prefix of ['Chrome/','HeadlessChrome/','Edg/'])validateNetworkBrowser('155.0.4283.62',prefix+'155.0.4283.62');
for(const [version,product] of [
 ['155.0.4283.62','Edg/155.0.8059.85'], // Edge product version differs from its Chromium kernel.
 ['155.0.4283.62','Edg/155.0.4283.620'],
 ['155.0.4283.62','Edg/155.0.4283.62 suffix'],
 ['155.0.4283.62','Firefox/155.0.4283.62'],
 ['155.0.4283.62','Safari/155.0.4283.62'],
 ['155.0.4283.62',undefined],['155','Edg/155'],[undefined,'Edg/undefined'],
])assert.throws(()=>validateNetworkBrowser(version,product));
const metric=()=>({readyMs:1000,httpBytes:100,requests:10,ruleApplied:10,gzipResponses:2,cachedRequests:8,performance:{bufferFull:0}});
const valid={errors:[],results:budget.profiles.flatMap(p=>Array.from({length:p.samples},(_,i)=>({label:p.id+'-'+(i+1),firstMovePassed:true,sameSave:true,studyCreateReceipts:1,originalResourcesPreserved:true,cold:metric(),warm:metric()})))};
assert.equal(valid.results.length,7);assert.deepEqual(evaluateNetworkRun(valid,budget),[]);
function rejects(change){const r=structuredClone(valid);change(r);assert.throws(()=>evaluateNetworkRun(r,budget));}
rejects(r=>r.results.pop());rejects(r=>r.results[2]=r.results[1]);rejects(r=>r.errors.push('real console failure'));
for(const [key,value] of [['firstMovePassed',false],['sameSave',false],['studyCreateReceipts',2],['originalResourcesPreserved',false]])rejects(r=>r.results[0][key]=value);
for(const value of [NaN,Infinity,null,undefined,0,-1])rejects(r=>r.results[0].cold.readyMs=value);
rejects(r=>r.results[0].cold.httpBytes=Infinity);rejects(r=>r.results[0].cold.performance.bufferFull=1);rejects(r=>r.results[0].cold.ruleApplied=0);rejects(r=>r.results[0].cold.gzipResponses=0);rejects(r=>r.results[0].warm.cachedRequests=0);
const threshold=structuredClone(valid),p=budget.profiles.find(p=>p.coldReadyMs!==null),r=threshold.results.find(r=>r.label===p.id+'-1');r.cold.readyMs=p.coldReadyMs;r.warm.readyMs=p.warmReadyMs;r.cold.httpBytes=budget.maxColdHttpBytes;assert.deepEqual(evaluateNetworkRun(threshold,budget),[]);
r.cold.readyMs++;r.warm.readyMs++;r.cold.httpBytes++;assert.equal(evaluateNetworkRun(threshold,budget).length,3,'Every individual exceedance fails even when other samples are fast');
for(const change of [b=>b.profiles[0].samples=0,b=>b.profiles.push(b.profiles[0]),b=>b.profiles[1].coldReadyMs=NaN,b=>b.maxColdHttpBytes=0]){const b=structuredClone(budget);change(b);assert.throws(()=>validateNetworkBudget(b));}
console.log('PASS network budget: Chromium-family CDP/version identity, complete seven-sample coverage, native/save/receipt/resource integrity, throttle/gzip/cache/buffer evidence, strict per-sample limits, explicit browser selection and no budget/sample/database overrides.');
