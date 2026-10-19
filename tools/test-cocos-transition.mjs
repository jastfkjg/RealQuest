import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {verifyTransition,transitionRecords} from './cocos-transition.mjs';

export async function testTransition(root,providedPolicy){
 root=await fs.realpath(root);const policy=providedPolicy||JSON.parse(await fs.readFile(path.join(root,'docs/migration/cocos-transition-policy.json'),'utf8'));
 const current=await verifyTransition(root,policy),parent=path.join(root,'output/cocos-protection');await fs.mkdir(parent,{recursive:true});
 const fixture=await fs.mkdtemp(path.join(parent,'fixture-')),checks=[];let complete=false;
 const check=async(name,fn)=>{await fn();checks.push(name);};
 const verify=changed=>verifyTransition(fixture,changed||policy,{gitRoot:root});
 const mutate=async(file,transform,pattern,name)=>{
  const target=path.join(fixture,file),original=await fs.readFile(target),changed=Buffer.from(transform(original.toString('utf8')));assert(!changed.equals(original),'Negative fixture must change source: '+name);
  try{await fs.writeFile(target,changed);await assert.rejects(()=>verify(),pattern);}finally{await fs.writeFile(target,original);}
 };
 try{
  const files=[...new Set([...transitionRecords(root).map(x=>x.path),'docs/migration/cocos-baseline.json',...policy.additionalFiles.map(x=>x.path)])];
  for(let start=0;start<files.length;start+=16)await Promise.all(files.slice(start,start+16).map(async file=>{const to=path.join(fixture,file);await fs.mkdir(path.dirname(to),{recursive:true});await fs.copyFile(path.join(root,file),to);await fs.chmod(to,(await fs.stat(path.join(root,file))).mode&0o777);}));
  await verify();
  await check('deleting original Web source is rejected',async()=>{const file=path.join(fixture,'frontend/src/App.tsx'),old=await fs.readFile(file);try{await fs.unlink(file);await assert.rejects(()=>verify(),/ENOENT/);}finally{await fs.writeFile(file,old);}});
  await check('original server rule edits are rejected',()=>mutate('backend/app/rules.py',s=>s.replace('def initial_state(','def altered_initial_state('),/Preserved original source changed/,'rule'));
  await check('existing asynchronous origin middleware edits are rejected',()=>mutate('backend/app/main.py',s=>s.replace("if request.method in ['POST', 'DELETE']:","if False:"),/original API bytes outside additive block/,'async middleware'));
  await check('new API deletion behavior is frozen to the reviewed addition',()=>mutate('backend/app/main.py',s=>s.replace("return {'deleted': True","return {'deleted': False"),/approved additive API block/,'additive API'));
  await check('old model definitions cannot be rewritten',()=>mutate('backend/app/models.py',s=>s.replace('class Player(','class RenamedPlayer('),/Original model definitions changed/,'original models'));
  await check('model append cannot grow without a reviewed contract',()=>mutate('backend/app/models.py',s=>s+'\nclass UnreviewedModel: pass\n',/approved model append/,'new models'));
  await check('compatible Web wrapper cannot be removed',()=>mutate('frontend/src/game/lifeJournalDates.ts',s=>s.replace('export *','export {}'),/Authorized transition shape changed/,'Web wrapper'));
  await check('original date assertions cannot be weakened',()=>mutate('frontend/scripts/life-journal-dates.mjs',s=>s.replace('assert.equal(','assert.ok('),/Authorized transition shape changed/,'date assertions'));
  await check('adapter metadata cannot hide an original assertion removal',async()=>{
   const changed=structuredClone(policy),adapter=changed.adapters.find(x=>x.path==='frontend/scripts/cave-polish.mjs'),target=path.join(fixture,adapter.path),old=await fs.readFile(target,'utf8'),assertion='assert.equal((await read()).inventory.gold, 22);';assert.equal(old.split(assertion).length,2);
   adapter.edits.push({before:assertion,after:'// removed original gold assertion'});
   try{await fs.writeFile(target,old.replace(assertion,'// removed original gold assertion'));await assert.rejects(()=>verify(changed),/Original assertion changed or removed/);}finally{await fs.writeFile(target,old);}
  });
  await check('changing original startup is rejected',()=>mutate('scripts/start.py',s=>s.replace('FRONTEND = ROOT / "frontend"','FRONTEND = ROOT / "clients/cocos"'),/Preserved original source changed/,'default startup'));
  await check('changing the original CI artifact is rejected',()=>mutate('.github/workflows/ci.yml',s=>s.replace('name: realquest-release','name: realquest-cocos-candidate'),/Preserved original source changed/,'original CI'));
  await check('changing original production Compose is rejected',()=>mutate('deploy/compose.prod.yaml',s=>s.replace('REALQUEST_FRONTEND_IMAGE','REALQUEST_COCOS_IMAGE'),/Preserved original source changed/,'original Compose'));
  await check('baseline record rebasing is rejected',()=>mutate('docs/migration/cocos-baseline.json',s=>{const data=JSON.parse(s);data.records.pop();return JSON.stringify(data);},/immutable baseline records/,'baseline records'));
  await check('broadening exceptions in both documents is rejected',async()=>{
   const file=path.join(fixture,'docs/migration/cocos-baseline.json'),old=await fs.readFile(file,'utf8'),baseline=JSON.parse(old),changed=structuredClone(policy);baseline.allowed_extensions.push('frontend/src/App.tsx');changed.allowedExtensions.push('frontend/src/App.tsx');
   try{await fs.writeFile(file,JSON.stringify(baseline));await assert.rejects(()=>verify(changed),/closed phase exception list/);}finally{await fs.writeFile(file,old);}
  });
  await check('shrinking retained source scope is rejected',async()=>{const changed=structuredClone(policy);changed.retainedPrefixes.shift();await assert.rejects(()=>verify(changed),/retained prefixes/);});
  await check('silently moving the original Git reference is rejected',async()=>{const changed=structuredClone(policy);changed.reference=changed.reference.replace(/^./,'0');await assert.rejects(()=>verify(changed),/original reference/);});
  await check('protected source symlinks are rejected',async()=>{const file=path.join(fixture,'frontend/src/App.tsx'),copy=path.join(fixture,'App.original');await fs.rename(file,copy);try{await fs.symlink(copy,file);await assert.rejects(()=>verify(),/without symlink ancestors/);}finally{await fs.unlink(file);await fs.rename(copy,file);}});
  await check('the explicit new migration cannot drift',()=>mutate('backend/migrations/versions/003_client_deletions.py',s=>s+'\n# changed migration\n',/approved additive file/,'additive migration'));
  await check('startup executable permission is retained',async()=>{const file=path.join(fixture,'start.command'),mode=(await fs.stat(file)).mode&0o777;try{await fs.chmod(file,0o644);await assert.rejects(()=>verify(),/original executable mode/);}finally{await fs.chmod(file,mode);}});
  await verify();assert.deepEqual(await verifyTransition(root,policy),current);complete=true;
  return {kind:'transition-protection-fixtures',complete,negativeFixtures:checks.length,checks,original:current,scope:'Real copied source files and original Git objects; no player database, browser, runtime or Git mutation'};
 }finally{
  await fs.rm(fixture,{recursive:true,force:true});assert.equal(await fs.stat(fixture).then(()=>true,()=>false),false,'Own fixture cleanup');
 }
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await testTransition(fileURLToPath(new URL('../',import.meta.url))),null,2));
