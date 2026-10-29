import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../../../package.json',import.meta.url));
const {build}=require('esbuild');
const result=await build({entryPoints:[new URL('../assets/scripts/artLoading.ts',import.meta.url).pathname],bundle:true,platform:'node',format:'esm',write:false});
const {DemandArt,viewArtPaths,entryArtPaths,knownArtPaths,canonicalArt}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
const state={location:'overworld',character:{appearance:4},inventory:{axe:1},tools:{held:'axe'},plots:{},construction:{machines:{}},combat:{equipped:null},ranch:{mounted:null}};
const map={id:'overworld',outdoor:true,objects:[],trees:[],resource_nodes:[{id:'tree'}]};
const entry=viewArtPaths('welcome',state,map);
assert.deepEqual(entry,viewArtPaths('session',state,map));
assert.equal(entry.length,entryArtPaths.length);
assert(entry.every(p=>p.startsWith('ui/')||/^village\/actor-[0-5]$/.test(p)));
assert(!entry.some(p=>/^(tool|ranch|farming|scenes|combat|atlas|items)/.test(p)));
const village=viewArtPaths('world',state,map);
assert(village.includes('scenes/terrain'));
assert(village.includes('tool-actors/axe-4'));
assert(!village.includes('tool-actors/axe-0'));
assert(!village.some(p=>p.startsWith('farming/')));
assert(!village.includes('ui/satchel'));
assert(!village.some(p=>p.startsWith('ranching/chicken')));
assert(!village.includes('atlas/terrain'));
const home=viewArtPaths('world',state,{...map,id:'home',objects:[],resource_nodes:[]});
assert(home.some(p=>p.startsWith('scenes/')));assert(!home.includes('scenes/terrain'));
assert(viewArtPaths('world',state,{...map,objects:[{id:'field',kind:'plot'}]},).every(p=>knownArtPaths.has(p)));
const planted=viewArtPaths('world',{...state,plots:{field:{crop_id:'carrot'}}},{...map,objects:[{id:'field',kind:'plot'}]});
assert(planted.includes('farming/carrot-1')&&planted.includes('farming/carrot-4'));
assert(viewArtPaths('inventory',state,map).includes('ui/satchel'));
assert(!viewArtPaths('inventory',state,map).includes('ui/shop-interior'));
assert(viewArtPaths('shop',state,map).includes('ui/shop-interior'));
assert(!viewArtPaths('shop',state,map).includes('ui/blacksmith-interior'));
assert(viewArtPaths('map',state,map).includes('atlas/terrain'));
assert(viewArtPaths('ranch',state,map).some(p=>p.startsWith('ranching/')));
for(const path of knownArtPaths)await fs.access(new URL('../assets/resources/'+path+'.png',import.meta.url));
for(const alias of ['items/axe','items/alloy','items/wooden_chest','items/mayo_machine'])assert(knownArtPaths.has(canonicalArt(alias)));
{
 let calls=0,finish;const frames=new Map();
 const art=new DemandArt(frames,()=>{calls++;return new Promise(r=>finish=r);},()=>{});
 const a=art.one('items/alloy'),b=art.one('items/shell');assert.equal(a,b);assert.equal(calls,1);
 const frame={id:'original'};finish(frame);await Promise.all([a,b]);
 assert.equal(frames.get('items/alloy'),frame);assert.equal(frames.get('items/shell'),frame);
 await art.ensure(['items/shell','items/alloy']);assert.equal(calls,1);
}
{
 let calls=0;const frames=new Map(),frame={id:'retried'};
 const art=new DemandArt(frames,async()=>{if(++calls===1)throw Error('deliberate fixture failure');return frame;},()=>{});
 await assert.rejects(art.one('ui/satchel'));assert(art.failed.has('ui/satchel'));assert.equal(art.pending.size,0);
 await art.one('ui/satchel');assert.equal(calls,2);assert(!art.failed.size);assert.equal(frames.get('ui/satchel'),frame);
 await assert.rejects(art.one('made-up/path'),/Unknown artwork/);
}
{
 let finish,changes=0;const frames=new Map();
 const art=new DemandArt(frames,()=>new Promise(r=>finish=r),()=>changes++);
 const task=art.one('ui/arrival');art.dispose();finish({id:'late'});await task;
 assert.equal(frames.size,0);assert.equal(changes,0);assert.equal(art.pending.size,0);
}
console.log('PASS entry-only loading, active map/tool/crop/feature plans, real bindings, aliases, shared requests, retry and disposed callbacks');
