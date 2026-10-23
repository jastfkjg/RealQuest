import assert from 'node:assert/strict';
import {build} from 'esbuild';
import fs from 'node:fs/promises';
const {outputFiles}=await build({entryPoints:[new URL('../assets/scripts/ui/blacksmithModel.ts',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'node'});
const {smithQuote,smithStock}=await import('data:text/javascript;base64,'+Buffer.from(outputFiles[0].text).toString('base64'));
const {equipment}=JSON.parse(await fs.readFile(new URL('../../../backend/app/equipment_catalog.json',import.meta.url),'utf8'));
const gear=Object.fromEntries(equipment.map(g=>[g.id,{...g,known:false,use_reasons:[]}]))
const offers=equipment.filter(g=>g.region==='village'&&g.sale).map(g=>g.id);
const s={inventory:{gold:20},combat:{gear,weapons:gear,equipped:null,equipment:{},gear_shop:{offers:[...offers,'soup'],diagrams:equipment.filter(g=>g.region==='village'&&g.blueprint_source==='merchant').map(g=>g.id)}}};
assert.equal(smithStock(s,'obtain','all').length,16);assert(!smithStock(s,'obtain','all').includes('clockwork_pistol'));assert.deepEqual(smithStock(s,'supplies','all'),['soup']);
let q=smithQuote(s,'obtain','stone_sword',1);assert.equal(q.total,24);assert.equal(q.missing,4);assert(!q.valid);assert.equal(q.owned,0);
gear.stone_sword.use_reasons=['使用不足'];s.inventory.gold=48;q=smithQuote(s,'obtain','stone_sword',2);assert(q.valid);assert.equal(q.after,0);assert.equal(q.max,2);
q=smithQuote(s,'diagrams','stone_sword',99);assert.equal(q.amount,1);assert.equal(q.total,8);assert(q.valid);gear.stone_sword.known=true;assert(!smithQuote(s,'diagrams','stone_sword',1).valid);
s.inventory.stone_sword=2;s.combat.equipped='stone_sword';q=smithQuote(s,'sell','stone_sword',2);assert(q.valid&&q.unloads);assert.equal(q.total,12);assert(!smithQuote(s,'sell','stone_sword',1).unloads);assert(!smithQuote(s,'sell','stone_sword',3).valid);
delete s.inventory.stone_sword;assert.deepEqual(smithStock(s,'sell','all'),[]);assert(!smithQuote(s,'sell','stone_sword',1).valid);
console.log('PASS blacksmith regional stock, honest insufficient-balance quote, use vs buy gates, permanent one-time blueprint, bulk sale and last-equipped warning.');
