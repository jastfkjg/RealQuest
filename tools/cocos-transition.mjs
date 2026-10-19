import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const ts=createRequire(import.meta.url)('typescript');

const reference='5e9d97d5a987b54b2a14587fb5793c51de924294';
const baselineIdentity='d2fc0a31198d891f3a059b72773cd15170de0690fa3c14a46331817cfd1e8723';
const prefixes=['frontend/','styles/','assets/','backend/app/','backend/migrations/','deploy/','.github/workflows/'];
const exact=['start.command','scripts/start.py','backend/Dockerfile','backend/requirements.txt','backend/requirements.lock.txt'];
const wrappers=['frontend/src/game/lifeJournalDates.ts','frontend/src/game/nextDeparture.ts','frontend/src/game/items.ts'];
const tests=['frontend/scripts/life-journal-dates.mjs','frontend/scripts/next-departure-state.mjs'];
const adapters=['frontend/scripts/cave-polish.mjs','frontend/scripts/village-polish.mjs'];
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const blob=value=>crypto.createHash('sha1').update('blob '+value.length+'\0').update(value).digest('hex');
const same=(actual,expected,label)=>assert.deepEqual(actual,expected,'Transition contract: '+label);
const once=(text,before,after,label)=>{if(!before||text.split(before).length!==2)throw Error('Ambiguous transition edit: '+label);return text.replace(before,after);};
function assertions(source){const file=ts.createSourceFile('preserved.mjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),calls=[];function visit(node){if(ts.isCallExpression(node)&&/^assert(?:\.|$)/.test(node.expression.getText(file)))calls.push(node.getText(file));ts.forEachChild(node,visit);}visit(file);return calls;}
function preserveAssertions(before,after,label){const originals=assertions(before),current=assertions(after);assert(originals.length>10,'Missing original assertion fixture: '+label);let offset=0;for(const original of originals){const at=current.indexOf(original,offset);if(at<0)throw Error('Original assertion changed or removed: '+label);offset=at+1;}return originals.length;}
function safe(relative){if(!relative||path.isAbsolute(relative)||relative.split('/').some(x=>!x||x==='.'||x==='..'))throw Error('Unsafe protection path');return relative;}
export function transitionRecords(gitRoot){
 const bytes=execFileSync('git',['ls-tree','-rz',reference,'--',...prefixes,...exact],{cwd:gitRoot});
 return bytes.toString('utf8').split('\0').filter(Boolean).map(row=>{const [metadata,file]=row.split('\t');const [mode,type,object]=metadata.split(' ');safe(file);if(type!=='blob'||!['100644','100755'].includes(mode))throw Error('Unsupported original source entry: '+file);return {path:file,mode,object};});
}
export async function verifyTransition(root,providedPolicy,{gitRoot=root}={}){
 root=await fs.realpath(root);
 const read=async relative=>{const file=path.join(root,safe(relative));if(await fs.realpath(file)!==file||(await fs.lstat(file)).isSymbolicLink()||!(await fs.stat(file)).isFile())throw Error('Protected source must be a regular file without symlink ancestors: '+relative);return fs.readFile(file);};
 const policy=providedPolicy||JSON.parse(await read('docs/migration/cocos-transition-policy.json'));
 same(policy.schema_version,1,'schema');same(policy.stage,'cocos-primary-preserve-original-web','stage');same(policy.reference,reference,'original reference');same(policy.baselineIdentitySHA256,baselineIdentity,'original baseline identity');same(policy.retainedPrefixes,prefixes,'retained prefixes');same(policy.retainedFiles,exact,'startup and publish paths');
 const baseline=JSON.parse(await read('docs/migration/cocos-baseline.json'));
 same(sha(JSON.stringify({revision:baseline.revision,records:baseline.records,preservation_prefixes:baseline.preservation_prefixes})),baselineIdentity,'immutable baseline records/revision/scope');
 const git=(rev,file)=>execFileSync('git',['show',rev+':'+safe(file)],{cwd:gitRoot});
 const previous=JSON.parse(git(reference,'docs/migration/cocos-baseline.json'));
 const extensionPaths=[...previous.allowed_extensions,'frontend/src/game/lifeJournalDates.ts','frontend/scripts/life-journal-dates.mjs','frontend/src/game/nextDeparture.ts','frontend/scripts/next-departure-state.mjs','frontend/src/game/items.ts'];
 same(baseline.allowed_extensions,extensionPaths,'closed phase exception list');same(policy.allowedExtensions,extensionPaths,'documented phase exception list');same(baseline.append_only_extensions,['backend/app/models.py'],'append-only path');same(policy.appendOnlyExtensions,baseline.append_only_extensions,'documented append-only path');
 same(Object.keys(policy.wrappers),wrappers,'wrapper paths');same(policy.rewrittenTests.map(x=>x.path),tests,'preserved test paths');same(policy.adapters.map(x=>x.path),adapters,'managed test adapter paths');same(policy.additionalFiles.map(x=>x.path),['backend/migrations/versions/003_client_deletions.py'],'additive migration paths');
 same(policy.backendExtension.path,'backend/app/main.py','additive API path');same(policy.modelsExtension.path,'backend/app/models.py','additive model path');
 const expected=new Map(Object.entries(policy.wrappers));
 for(const item of policy.rewrittenTests){const name=path.basename(item.path)==='life-journal-dates.mjs'?'lifeJournalDates':'nextDeparture';same(item.from,'../src/game/'+name+'.ts','original test import');same(item.to,'../../shared/game/'+name+'.ts','canonical test import');const before=git(baseline.revision,item.path).toString('utf8');expected.set(item.path,once(before,item.from,item.to,item.path));}
 let preservedAssertions=0;for(const item of policy.adapters){const before=git(reference,item.path).toString('utf8');let source=before;assert(item.reason&&item.edits.length,'Document each test adapter');for(const edit of item.edits)source=once(source,edit.before,edit.after,item.path);preservedAssertions+=preserveAssertions(before,source,item.path);expected.set(item.path,source);}
 const api=policy.backendExtension,source=(await read(api.path)).toString('utf8');
 const start=source.indexOf(api.start),end=source.indexOf(api.end,start+api.start.length);assert(start>=0&&end>start,'Additive API boundaries missing');
 const addition=source.slice(start,end);same(sha(addition),api.additionSHA256,'approved additive API block');
 let original=source.slice(0,start)+source.slice(end);original=once(original,api.importAfter,api.importBefore,api.path+' import');same(sha(original),sha(git(reference,api.path)),'original API bytes outside additive block');expected.set(api.path,source);
 const model=policy.modelsExtension,oldModel=git(reference,model.path),currentModel=await read(model.path);assert(currentModel.subarray(0,oldModel.length).equals(oldModel),'Original model definitions changed');same(sha(currentModel.subarray(oldModel.length)),model.appendSHA256,'approved model append');expected.set(model.path,currentModel);
 const records=transitionRecords(gitRoot);assert(records.length>390,'Original retained tree unexpectedly small');
 for(const record of records){
  const current=await read(record.path),replacement=expected.get(record.path);
  if(replacement!==undefined){if(!current.equals(Buffer.from(replacement)))throw Error('Authorized transition shape changed: '+record.path);}
  else if(blob(current)!==record.object)throw Error('Preserved original source changed: '+record.path);
  const executable=!!((await fs.stat(path.join(root,record.path))).mode&0o111);same(executable,record.mode==='100755','original executable mode: '+record.path);
 }
 for(const item of policy.additionalFiles){assert(item.reason,'Document additive source');same(sha(await read(item.path)),item.sha256,'approved additive file: '+item.path);}
 for(const file of expected.keys())assert(records.some(r=>r.path===file),'Exception outside original tree: '+file);
 return {reference,retainedFiles:records.length,closedBaselineExceptions:extensionPaths.length,preciseReplacements:expected.size,managedTestAdapters:policy.adapters.length,preservedAdapterAssertions:preservedAssertions,additiveFiles:policy.additionalFiles.length,originalStartupAndPublishRetained:true,stage:policy.stage};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await verifyTransition(fileURLToPath(new URL('../',import.meta.url)))));
