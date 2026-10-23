import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';
async function module(name){const r=await build({entryPoints:['shared/game/'+name+'.ts'],bundle:true,write:false,format:'esm',platform:'node'});return import('data:text/javascript;base64,'+Buffer.from(r.outputFiles[0].text).toString('base64'));}
const {currentMap,walkable}=await module('navigation'),{approachRoute}=await module('localScene');
const f=JSON.parse(execFileSync('backend/.venv/bin/python',['-c',`import sys,json
sys.path.insert(0,'backend');sys.path.insert(0,'backend/tests')
from test_game import fresh
from app.world import WORLD,map_for
s=fresh();s.update(location='home',position={'x':240,'y':300})
s['construction']['chests']['player_chest_1']={'recipe':'wooden_chest','name':'木料箱','x':144,'y':288,'items':{'wood':3},'version':0}
print(json.dumps({'world':WORLD,'state':s,'map':map_for('home',s,100)}))`],{encoding:'utf8'}));
const before=JSON.stringify(f.state),map=currentMap(f.world,f.state,100),box=map.objects.find(o=>o.id==='player_chest_1');
assert.deepEqual(map.obstacles,f.map.obstacles,'client/server share dynamic collision geometry');
assert.equal(JSON.stringify(f.state),before,'map projection cannot mutate contents');assert(!walkable(map,144,280));
for(const id of ['player_chest_1','home_chest','home_exit','home_bed']){const o=map.objects.find(o=>o.id===id),route=approachRoute(map,f.state.position,o);assert(route.length,id+' reachable');assert(route.every(p=>walkable(map,p.x,p.y)),id+' walkable approach');}
f.state.construction.chests[box.id].x=384;
const moved=currentMap(f.world,f.state,100);assert(walkable(moved,144,280));assert(!walkable(moved,384,280));assert.deepEqual(f.state.construction.chests[box.id].items,{wood:3});
f.state.location='workshop';const workshop=currentMap(f.world,f.state,100);assert(workshop.objects.some(o=>o.id==='carpenter'));assert(approachRoute(workshop,{x:240,y:300},workshop.objects.find(o=>o.id==='carpenter')).length,'carpenter reachable without overlapping armory');
console.log('PASS dynamic chest collision, door/bed/storage reachability, move identity and carpenter approach');

const uiBundle=await build({entryPoints:['clients/cocos/assets/scripts/ui/construction.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const {ConstructionPanels}=await import('data:text/javascript;base64,'+Buffer.from(uiBundle.outputFiles[0].text).toString('base64'));
const panel=new ConstructionPanels();let fieldValue,change;
const host={saveId:'A',state:{location:'home',construction:{chests:{player_chest_1:{name:'甲的木箱',version:0}},completed:[]},construction_view:{}},context:{id:'player_chest_1'},mode:'chest-name',width:740,height:360,box(){},text(){},image(){},region(){},button(){},field(id,label,value,x,y,w,onChange){fieldValue=value;change=onChange;}};
panel.draw(host);assert.equal(fieldValue,'甲的木箱');change('甲的未保存草稿');panel.draw({...host,saveId:'B',state:{...host.state,construction:{chests:{player_chest_1:{name:'乙的木箱',version:0}},completed:[]}}});assert.equal(fieldValue,'乙的木箱','changing saves must not expose or submit the previous save name draft');
console.log('PASS rename drafts are scoped to save and container revision');
