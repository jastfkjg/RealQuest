import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';
async function module(name){const r=await build({entryPoints:['shared/game/'+name+'.ts'],bundle:true,write:false,format:'esm',platform:'node'});return import('data:text/javascript;base64,'+Buffer.from(r.outputFiles[0].text).toString('base64'));}
const {currentMap,walkable}=await module('navigation'),{approachRoute}=await module('localScene');
const f=JSON.parse(execFileSync('backend/.venv/bin/python',['-c',`import sys,json
sys.path.insert(0,'backend');sys.path.insert(0,'backend/tests')
from test_game import fresh
from app.world import WORLD,map_for
from app.production import CELLS
s=fresh();s.update(location='pasture',position={'x':448,'y':440})
for i,(x,y) in enumerate(CELLS):s['construction']['machines']['machine_'+str(i)]={'facility':['mayo','loom','cheese','oil'][i%4],'x':x,'y':y,'version':0}
print(json.dumps({'world':WORLD,'state':s,'map':map_for('pasture',s,100)}))`],{encoding:'utf8'}));
const before=JSON.stringify(f.state),map=currentMap(f.world,f.state,100);
assert.deepEqual(map.obstacles,f.map.obstacles,'client/server machine collision agrees');
assert.equal(JSON.stringify(f.state),before,'projection cannot mutate machines');
for(const id of [...Object.keys(f.state.construction.machines),'pasture_exit','ranch_ledger']){
 const object=map.objects.find(o=>o.id===id);assert(object,id);
 const route=approachRoute(map,f.state.position,object);assert(route.length,id+' reachable in a full workyard');assert(route.every(p=>walkable(map,p.x,p.y)),id+' walkable route');
}
assert(!walkable(map,144,468));assert(walkable(map,448,480),'middle road remains clear');
delete f.state.construction.machines.machine_1;assert(walkable(currentMap(f.world,f.state,100),144,468),'packing releases collision');
console.log('PASS full workyard geometry, independent IDs, approach to all14 devices and exit/ledger');

const bundle=await build({entryPoints:['clients/cocos/assets/scripts/ui/production.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const {ProductionPanels}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const buttons=new Map(),texts=new Map(),panel=new ProductionPanels(),state={construction:{machines:{one:{facility:'mayo',x:144,y:480,version:1}}},construction_view:{recipes:{}},inventory:{},ranching:{jobs:{one:{recipe:'duck_mayo',output:'fine_duck_mayo',ready:false,remaining_days:.3}}}};
const host={state,context:{id:'one'},mode:'production-machine',width:740,height:360,connection:'ready',box(){},image(){},region(){},text(id,value){texts.set(id,value);},button(id,label,x,y,w,h,fn,disabled,selected){buttons.set(id,{label,disabled,selected});}};
panel.draw(host);
assert.equal(buttons.get('machine-recipe-duck_mayo').selected,true,'job recipe selected even when previous device used another recipe');
assert.equal(buttons.get('machine-quality').label,'优质原料','busy device shows actual job quality');
assert(buttons.get('machine-move').disabled&&buttons.get('machine-pack').disabled,'in-process inventory cannot be relocated');
host.connection='uncertain';buttons.clear();panel.draw(host);assert(buttons.has('machine-reconnect'));assert(!buttons.has('machine-process'),'recovery owns exactly one confirmation control');
state.ranching.jobs.one.ready=true;host.connection='ready';buttons.clear();panel.draw(host);assert.equal(buttons.get('machine-process').label,'收取成品');assert(buttons.get('machine-pack').disabled,'uncollected output still blocks packing');
console.log('PASS per-device recipe/quality, busy and uncollected restrictions, single recovery control');
