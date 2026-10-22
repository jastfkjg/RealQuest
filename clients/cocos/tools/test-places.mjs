import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const require=createRequire(new URL('../../../package.json',import.meta.url)),ts=require('typescript'),cache=new Map();
async function module(name){if(cache.has(name))return cache.get(name);let code=ts.transpileModule(await fs.readFile(new URL('../../../shared/game/'+name+'.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText;for(const m of [...code.matchAll(/from ['"]\.\/(\w+)['"]/g)])code=code.replace(m[0],'from '+JSON.stringify(await module(m[1])));const url='data:text/javascript;base64,'+Buffer.from(code).toString('base64');cache.set(name,url);return url;}
const {placeMaps,placeEntries,placeInfo,placeName,socialAccess,bearingText,neighborRoute}=await import(await module('places'));
const root=fileURLToPath(new URL('../../../',import.meta.url));
const fixture=JSON.parse(execFileSync(root+'backend/.venv/bin/python',['-c',`import json
from app.main import snapshot
from app.rules import initial_state
from app.world import WORLD
from app.residents import routine_definitions
s=initial_state();s['character']={'name':'查询夹具','appearance':0}
print(json.dumps(snapshot(s,world={**WORLD,'residents':routine_definitions()})))`],{cwd:root+'backend',encoding:'utf8'}));
const {world,state:s,server_time:now}=fixture,before=JSON.stringify(s),maps=placeMaps(world),entries=placeEntries(world,s,now);
assert.equal(maps.length,15);assert.equal(new Set(entries.map(e=>e.key)).size,entries.length);const plots=entries.filter(e=>e.object.kind==='plot');assert.equal(new Set(plots.map(e=>placeName(e,world))).size,plots.length,'same-name farm plots remain distinguishable');
for(const map of maps)for(const o of map.objects.filter(o=>!['npc','travel_npc','soil'].includes(o.kind)))assert(entries.some(e=>e.mapId===map.id&&e.object.id===o.id),map.id+':'+o.id);
for(const id of ['home_bed','home_chest','plot_0','shop_counter','armory_counter','cave_entry','village_departure','adu','lanya','inn_bed','mountain_pass','ruins'])assert(entries.some(e=>e.object.id===id),'landmark '+id);
for(const e of entries)assert(placeInfo(e,world,s,now).length>20,e.key);assert.equal(JSON.stringify(s),before,'index, quotes and bearings are read-only');
const gate=entries.find(e=>e.object.id==='village_departure'),inn=entries.find(e=>e.object.id==='inn_bed');assert.match(placeInfo(gate,world,s,now),/石门尚未开启/);assert.match(placeInfo(inn,world,s,now),/订下当晚客房/);
assert.match(placeInfo(entries.find(e=>e.mapId==='cave_5'),world,s,now),/通路尚未开放/);
for(const q of s.travel.options){const e=entries.find(e=>e.object.id===q.target);assert(e,q.target);const text=placeInfo(e,world,s,now);assert(text.includes(q.label));for(const reason of q.reasons)assert(text.includes(reason),reason);}
assert.match(bearingText({mapId:'inn',targetId:'lanya'},world,s,now),/东行/);s.location='inn';assert.match(bearingText({mapId:'home',targetId:'home_chest'},world,s,now),/户外|南门/);
const e=entries.find(e=>e.object.id==='lia');s.location=e.mapId;s.position={x:e.object.x,y:e.object.y};assert(socialAccess(world,s,now,'lia').near);assert(!socialAccess(world,s,now,'lia').memory);
s.npc_social.lia.memory_unlocked=true;assert(socialAccess(world,s,now,'lia').memory);s.npc_social.lia.gifted=true;assert(!socialAccess(world,s,now,'lia').gift);s.npc_social.lia.helped=true;assert(!socialAccess(world,s,now,'lia').help);s.npc_social.lia.helped=false;s.stamina.current=3;s.stamina.updated_at=now;assert(!socialAccess(world,s,now,'lia').help);assert(socialAccess(world,s,now+720,'lia').help,'regenerated live stamina is used');s.position.x+=73;assert(!socialAccess(world,s,now,'lia').near);assert(!socialAccess(world,s,now,'lia').gift);
const oldKey=e.key;s.world_clock.elapsed=950;s.world_clock.running_until=0;const moved=placeEntries(world,s,now).find(e=>e.object.id==='lia');assert.equal(moved.key,oldKey,'resident key survives door transitions');assert.notEqual(moved.mapId,e.mapId);
console.log('PASS all15 server maps/object identities, exact quoted restrictions, connected bearings, immutable reads, stable moving residents, proximity/daily/memory/regeneration guards.');

const routeState=JSON.parse(before),routeBefore=JSON.stringify(routeState);const nr=neighborRoute(world,routeState,now,'lia');assert(nr);assert.equal(nr.person.location,'library');assert.equal(nr.bearing.id,'library');assert.equal(nr.sameMap,false);assert.match(nr.instruction,/门前/);assert.equal(JSON.stringify(routeState),routeBefore);routeState.location='library';assert(neighborRoute(world,routeState,now,'lia').sameMap);assert.match(neighborRoute(world,routeState,now,'lia').instruction,/走近/);assert.equal(neighborRoute(world,routeState,now,'unknown'),null);console.log('PASS actual early indoor resident → real door instruction; same-room approach and unknown identity guards; reads preserve state.');
