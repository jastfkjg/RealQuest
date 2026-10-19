import assert from 'node:assert/strict';
export {validateChromiumProduct as validateNetworkBrowser} from './cocos-browser-config.mjs';

export function networkOptions(args){
 const options={},seen=new Set();
 for(let i=0;i<args.length;i+=2){
  const key=args[i],value=args[i+1];
  if(!['--artifact','--browser'].includes(key)||seen.has(key)||!value||value.startsWith('--'))throw Error('Usage: cocos:test:network -- --artifact output/<release> [--browser chromium|firefox]');
  seen.add(key);
  if(key==='--artifact')options.artifact=value;
  else if(!['chromium','firefox'].includes(value))throw Error('Network browser must be chromium or firefox.');
  else if(value==='firefox')options.browser=value;
 }
 if(!options.artifact)throw Error('A sealed --artifact is required.');
 return options;
}

export function validateNetworkBudget(budget){
 assert.equal(budget.schemaVersion,1);
 assert(Number.isSafeInteger(budget.maxColdHttpBytes)&&budget.maxColdHttpBytes>0);
 assert(Number.isSafeInteger(budget.resourceTimingBuffer)&&budget.resourceTimingBuffer>0);
 assert(Array.isArray(budget.profiles)&&budget.profiles.length>0);
 const ids=new Set();
 for(const p of budget.profiles){
  assert(/^[a-z0-9.-]+$/.test(p.id)&&!ids.has(p.id));ids.add(p.id);
  assert(Number.isSafeInteger(p.samples)&&p.samples>0);
  assert(Number.isFinite(p.latencyMs)&&p.latencyMs>=0);
  for(const key of ['downloadBytesPerSec','uploadBytesPerSec'])assert(p[key]===-1||Number.isFinite(p[key])&&p[key]>0);
  for(const key of ['coldReadyMs','warmReadyMs'])assert(p[key]===null||Number.isFinite(p[key])&&p[key]>0);
 }
 return budget;
}

// Acceptance uses every raw sample. Missing/invalid observations fail closed;
// averages and a previously computed complete:true flag cannot grant a pass.
export function evaluateNetworkRun(report,budget){
 validateNetworkBudget(budget);assert.deepEqual(report.errors,[]);
 assert(Array.isArray(report.results));
 assert.equal(report.results.length,budget.profiles.reduce((n,p)=>n+p.samples,0));
 const failures=[],seen=new Set();
 const compare=(actual,limit,label)=>{if(limit!==null&&actual>limit)failures.push({label,actual,limit});};
 for(const profile of budget.profiles)for(let sample=1;sample<=profile.samples;sample++){
  const label=profile.id+'-'+sample,r=report.results.find(r=>r.label===label);
  assert(r&&!seen.has(label),'Missing/duplicate network sample: '+label);seen.add(label);
  assert.equal(r.firstMovePassed,true,label+' first native movement');
  assert.equal(r.sameSave,true,label+' same-save continuation');
  assert.equal(r.studyCreateReceipts,1,label+' exactly one study receipt');
  assert.equal(r.originalResourcesPreserved,true,label+' original resources');
  for(const kind of ['cold','warm']){
   const m=r[kind];assert(m&&Number.isFinite(m.readyMs)&&m.readyMs>0,label+' '+kind+' timing');
   assert(Number.isSafeInteger(m.httpBytes)&&m.httpBytes>=0,label+' '+kind+' HTTP bytes');
   assert(Number.isSafeInteger(m.requests)&&m.requests>0&&Number.isSafeInteger(m.ruleApplied)&&m.ruleApplied>0&&m.ruleApplied<=m.requests,label+' actual requests and throttle rule');
   assert.equal(m.performance?.bufferFull,0,label+' resource buffer overflow');
   assert(kind==='cold'?m.gzipResponses>0:m.cachedRequests>0,label+' actual gzip/cache');
   compare(m.readyMs,profile[kind+'ReadyMs'],label+' '+kind+' readyMs');
   if(kind==='cold')compare(m.httpBytes,budget.maxColdHttpBytes,label+' cold HTTP bytes');
  }
 }
 return failures;
}
