import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../../../package.json',import.meta.url));
const {outputFiles}=await require('esbuild').build({entryPoints:[new URL('../../../shared/game/farming.ts',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'node'});
const f=await import('data:text/javascript;base64,'+Buffer.from(outputFiles[0].text).toString('base64'));
assert.equal(f.crops.length,12);assert.equal(new Set(f.cropArtPaths).size,72);
const s={buildings:{home:1},farm:{tilled:['plot_0','farm_0_0']},world_clock:{elapsed:0,updated_at:100,running_until:0},plots:{}};
const objects=[{id:'plot_0',kind:'plot'},{id:'plot_1',kind:'plot'},{id:'farm_0_0',kind:'soil'}];assert.deepEqual(f.farmObjects(objects,s).map(o=>o.kind),['plot','soil','plot']);assert.equal(objects[2].kind,'soil');s.farm.tilled=[];assert(f.farmObjects(objects,s).every(o=>o.kind==='soil'));
const p={clock:'world',crop_id:'blueberry',planted_at:1,planted_tick:0,ready_tick:100};
for(const [tick,stage] of [[0,1],[24,1],[25,2],[64,2],[65,3],[99,3],[100,4]]){s.world_clock.elapsed=tick;assert.equal(f.plotStage(s,p,1000),stage);}
s.world_clock.elapsed=0;assert.equal(f.plotProgress(s,p,1000000),0);s.world_clock.running_until=110;assert.equal(f.farmTick(s,105),5);assert.equal(f.farmTick(s,111),0);
assert.equal(f.plotCrop(p).id,'blueberry');assert.equal(f.plotCrop({planted_at:1,ready_at:2}).id,'radish');assert.equal(f.plotProgress(s,{planted_at:1,ready_at:2},3),1);
assert.equal(f.growingDays(s,4),4);s.buildings.home=2;assert.equal(f.growingDays(s,4),3);assert(f.remaining(s,p,105).includes('游戏'));console.log('PASS 12 crops/72 distinct bindings, state-owned land, four clock-derived stages, offline/pause/lease boundaries, legacy growth and home speed.');
