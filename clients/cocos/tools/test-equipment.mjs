import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
const require=createRequire(new URL('../../../package.json',import.meta.url));
const {outputFiles}=await require('esbuild').build({entryPoints:[new URL('../../../shared/game/inventory.ts',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'node'});
const m=await import('data:text/javascript;base64,'+Buffer.from(outputFiles[0].text).toString('base64'));
const catalogue=JSON.parse(await fs.readFile(new URL('../../../backend/app/equipment_catalog.json',import.meta.url),'utf8'));
const world={id:'overworld',width:100,height:100,objects:[],obstacles:[],trees:[]};
const state={location:'overworld',position:{x:0,y:0},inventory:{},events:[],plots:{},buildings:{workshop:1},combat:{gear:{},equipment:{},equipped:null}};
for(const g of catalogue.equipment){
 state.inventory[g.id]=1;state.combat.gear[g.id]={...g,use_reasons:[]};
 const intent=m.itemIntent(world,state,0,g.id);assert.equal(intent.command,'gear_equip');assert.deepEqual(intent.data,{item:g.id});assert.equal(intent.reason,'');
 state.combat.gear[g.id].use_reasons=['条件不足'];assert.equal(m.itemIntent(world,state,0,g.id).reason,'条件不足');
 state.inventory[g.id]=0;assert(m.itemIntent(world,state,0,g.id).reason);
}
console.log('PASS all24 equipment intents choose explicit equip, respect server use conditions and absent inventory.');
