import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../../../package.json',import.meta.url)),ts=require('typescript'),cache=new Map();
async function module(name){
 if(cache.has(name))return cache.get(name);
 let code=ts.transpileModule(await fs.readFile(new URL('../../../shared/game/'+name+'.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText;
 for(const m of [...code.matchAll(/from ['"]\.\/(\w+)['"]/g)])code=code.replace(m[0],'from '+JSON.stringify(await module(m[1])));
 const url='data:text/javascript;base64,'+Buffer.from(code).toString('base64');cache.set(name,url);return url;
}
const f=await import(await module('dossier'));
for(let appearance=0;appearance<6;appearance++)assert.deepEqual(f.registration('  中文旅人  ',appearance),{name:'中文旅人',appearance});
assert.equal(f.registration('  ',5).name,'林间旅人');assert.equal(f.registration('中文'.repeat(8),2).name.length,16);
assert.throws(()=>f.registration('中'.repeat(17),0),/16/);for(const id of [-1,6,NaN,2.5])assert.throws(()=>f.registration('姓名',id),/外观/);
const state={xp:245,attributes:{strength:2,wisdom:3,craft:4,stewardship:5,bond:6},energy:7,knowledge_shard:8,inventory:{gold:9},vitality:{current:52,max:105},stamina:{current:61,max:110,updated_at:100},stamina_rules:{seconds_per_point:720}};
const before=JSON.stringify(state);assert.deepEqual(f.dossierSummary(state,820),{level:3,xp:245,vitality:{current:52,max:105},stamina:{current:62,max:110}});
for(const [xp,level,remaining] of [[0,1,100],[99,1,1],[100,2,100],[1001,11,99]]){state.xp=xp;const p=f.dossierSummary(state,1);assert.equal(p.level,level);assert.equal(p.xp,xp);assert.equal(p.stamina.current,61);}
state.xp=245;assert.equal(f.dossierSummary(state,100000).stamina.current,110);assert.equal(JSON.stringify(state),before,'dossier reads never mutate stored capacity/XP');
assert.deepEqual(f.dossierAttributes(state).map(r=>r.value),[2,3,4,5,6,7,8,9]);assert.equal(new Set(f.growthTargets).size,7);
console.log('PASS registration: six stable IDs, blank/CJK/length guards; dossier: original level/XP, current/max recovery cap, all attributes and nonmutating reads.');
