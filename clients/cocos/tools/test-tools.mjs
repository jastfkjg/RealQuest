import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';
const root=new URL('../../../',import.meta.url).pathname;
const result=await build({stdin:{contents:"export * from './shared/game/tools';export * from './shared/game/inventory';export {currentMap} from './shared/game/navigation';",resolveDir:root},bundle:true,write:false,format:'esm',platform:'node'});
const t=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
const fixtures=JSON.parse(execFileSync(root+'backend/.venv/bin/python',['-c',`import json
from app.rules import initial_state,apply
from app.world import WORLD,map_for
from app.main import snapshot
s=initial_state();apply(s,'create',{'name':'工具夹具'},100)
s['world_clock'].update(updated_at=100,running_until=0)
s['tools']['resources']['tree_19']={'stage':'depleted','work':0,'version':9,'ready_tick':9000}
s['tools']['resources']['wood_1']={'stage':'stump','work':1,'version':7}
s['tools']['resources']['stone_3']={'stage':'depleted','work':0,'version':5,'ready_tick':1000}
states=[]
for tick in [0,1000,10000]:
 s['world_clock']['elapsed']=tick
 states.append({'state':s.copy(),'map':map_for('overworld',s,100)})
 states[-1]=json.loads(json.dumps(states[-1]))
print(json.dumps({'world':WORLD,'states':states}))`],{cwd:root+'backend',encoding:'utf8'}));
for(const {state:s,map} of fixtures.states){
 const m=t.currentMap(fixtures.world,s,100);
 assert.deepEqual(m.obstacles,map.obstacles,'saved clearing must release the same server/client collision');
 assert.deepEqual(m.cultivation.blocked,map.cultivation.blocked);
 assert.deepEqual(m.objects.filter(o=>o.kind==='resource'),map.objects.filter(o=>o.kind==='resource'));
 assert(!m.objects.some(o=>['wood','stone'].includes(o.kind)));
 assert.equal(m.objects.find(o=>o.id==='wood_1').resource_state.stage,'stump');
}
const s=fixtures.states[0].state,m=t.currentMap(fixtures.world,s,100);
assert.equal(t.toolTarget(m,s,100,'axe',328,332).id,'wood_1');
assert.equal(t.toolTarget(m,s,100,'pickaxe',328,332)?.kind,'soil');
const iron=m.objects.find(o=>o.resource==='iron');assert.match(t.toolReason(m,s,'pickaxe',iron),/铜制/);
s.tools.levels.pickaxe=1;assert.equal(t.toolReason(m,s,'pickaxe',iron),'');
const cells=t.toolCells(m,136,536,1,3);assert.deepEqual(cells.map(c=>c.y),[536,488,440]);assert.equal(new Set(t.toolCells(m,136,536,0,9).map(c=>c.id)).size,9);
const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
const p=new t.InventoryPreferences(storage);p.enter('new');assert.equal(p.value.quick.length,8);assert.deepEqual(p.value.quick.slice(0,5),['hoe','axe','pickaxe','watering_can','seed']);
data.set(t.inventoryPreferenceKey('old'),JSON.stringify({version:2,saveId:'old',selected:'seed',quick:['seed','wood',null,'stone'],tray:[],offset:{x:12,y:-8}}));
p.enter('old');assert.deepEqual(p.value.quick,['seed','wood',null,'stone','hoe','axe','pickaxe','watering_can']);assert.deepEqual(p.value.offset,{x:12,y:-8});
assert(p.bind(7,'seed',s.inventory));assert.equal(p.value.quick[7],'seed');assert.equal(p.value.quick.filter(id=>id==='seed').length,1);p.clear(7);assert.equal(p.value.quick[7],null);assert.equal(new t.InventoryPreferences(storage).enter('old').quick.length,8);
for(const id of t.toolIds){const intent=t.itemIntent(fixtures.world,s,100,id);assert.equal(intent.command,'tool_hold');assert.deepEqual(intent.data,{item:id});}
console.log('PASS tool ownership/selection,8-pocket migration/reorder/persistence, resource/collision/land parity across game days, tier gates and charged range selection.');
