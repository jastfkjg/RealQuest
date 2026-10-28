import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../../',import.meta.url)),require=createRequire(new URL('../../../package.json',import.meta.url));
async function module(name){const {outputFiles}=await require('esbuild').build({entryPoints:[root+'shared/game/'+name+'.ts'],bundle:true,write:false,format:'esm',platform:'node'});return import('data:text/javascript;base64,'+Buffer.from(outputFiles[0].text).toString('base64'));}
const r=await module('ranching'),{approachRoute}=await module('localScene'),{walkable}=await module('navigation'),{interactionFor}=await module('interaction');
const fixture=JSON.parse(execFileSync(root+'backend/.venv/bin/python',['-c',`import json
from app.rules import initial_state,upgrade_state
from app.daynight import ensure_clock
from app.world import WORLD,map_for
from app.ranching import CATALOG,ranch_view,ensure_ranch
s=upgrade_state(initial_state());ensure_clock(s,100);s['location']='pasture';s['position']={'x':448,'y':480};s['world_clock']['running_until']=0
for i,a in enumerate(CATALOG['animals']):
 s['ranch']['animals']['animal_'+str(i+1)]={'species':a['id'],'name':a['baby'],'age':0,'feed_seconds':0,'progress':0,'products':{},'affection':0,'pet_day':0}
s['ranching']=ranch_view(s,100)
print(json.dumps({'catalog':CATALOG,'state':s,'map':map_for('pasture',s,100),'home':WORLD}))`],{cwd:root+'backend',encoding:'utf8'}));
assert.deepEqual(r.ranchCatalog,fixture.catalog,'UI catalog exactly matches server quotes/species');
assert.deepEqual(r.ranchSpecies.map(a=>a.id),['chicken','duck','sheep','cow','goat','pig','horse']);
const animals=r.ranchObjects(fixture.state);assert.equal(animals.length,7);assert.equal(new Set(animals.map(a=>a.id)).size,7);assert(animals.every(a=>a.kind==='animal'));
for(const a of animals){const route=approachRoute(fixture.map,fixture.state.position,a);assert(route.length,a.id+' reachable from gate');assert(route.every(p=>walkable(fixture.map,p.x,p.y)),a.id+' approach avoids buildings');assert(Math.hypot(route.at(-1).x-a.x,route.at(-1).y-a.y)<=60);assert.equal(interactionFor(a,fixture.state,100).panel,'ranch');}
const before=JSON.stringify(fixture.state);r.ranchObjects(fixture.state);assert.equal(JSON.stringify(fixture.state),before,'projection leaves authority unchanged');fixture.state.ranch.mounted='animal_7';assert(!r.ranchObjects(fixture.state).some(a=>a.id==='animal_7'),'mounted horse absent from stable interaction anchors');
for(const id of ['ranch_ledger','shelter_coop','shelter_barn','shelter_stable','pasture_exit']){const obj=fixture.map.objects.find(o=>o.id===id);assert(obj,id);assert(approachRoute(fixture.map,fixture.state.position,obj).length,id+' reachable');const action=interactionFor(obj,fixture.state,100);assert(action.panel==='ranch'||action.command==='ranch_exit');}
const gate=fixture.home.objects.find(o=>o.id==='pasture_gate');assert.equal(interactionFor(gate,fixture.state,100).command,'ranch_enter');assert(approachRoute(fixture.home,{x:240,y:352},gate).length,'home gate reachable from initial spawn');
const bindings=JSON.parse(await fs.readFile(root+'clients/cocos/asset-bindings.json','utf8')).records;
const requested=r.ranchSpecies.flatMap(a=>[1,2,3].map(stage=>r.animalArt(a.id,stage)));assert.equal(new Set(requested).size,21);
for(const art of r.ranchArtPaths){await fs.access(root+'clients/cocos/assets/resources/'+art+'.png');assert(bindings.some(b=>b.target==='assets/resources/'+art+'.png'),art+' provenance binding');}
// Independent texture contents prevent three labels from disguising one sprite.
for(const species of r.ranchSpecies){const pngs=await Promise.all([1,2,3].map(stage=>fs.readFile(root+'clients/cocos/assets/resources/'+r.animalArt(species.id,stage)+'.png')));assert.equal(new Set(pngs.map(b=>b.toString('base64'))).size,3,species.id+' three distinct raster stages');}
assert.equal(r.ranchSpecies.find(a=>a.id==='sheep').product,'wool');assert.equal(r.ranchSpecies.find(a=>a.id==='goat').product,'goat_milk');assert.equal(r.ranchSpecies.find(a=>a.id==='horse').product,null);
console.log('PASS authoritative catalog parity; seven stable IDs and mounted filtering; all gate/ledger/shelter/animal approaches reachable;21 distinct existing stage images and all ranch product/facility bindings present.');
