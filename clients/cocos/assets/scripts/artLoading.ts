import type {GameState,MapData} from './core/protocol';
import {registrationAppearances} from './core/appearances';
import {sceneLayouts,sceneArtPaths} from './core/sceneLayout';
import {toolIds,toolArtPaths,isTool} from './core/tools';
import {toolActorArtPaths} from './toolActor';
import {cropArtPaths,plotCrop} from './core/farming';
import {ranchArtPaths} from './core/ranching';
import {swordArtPaths} from './core/swordMotion';
import {gearCatalog,gearMaterials} from './core/gearCatalog';
import {lazyMaterialPaths} from './ui/materials';

const villageNames=['actor-0','actor-1','actor-2','actor-3','actor-4','actor-5','shop','home','workshop','library','guild','oak','oak-alt','fir','birch','shrub','board','wood','stone','bridge','grass','grass-patch','bank-stones','fence','bench','lantern','lia-actor','noah-actor','mira-actor','adu-actor','lanya-actor'];
const interiorNames=['market-counter','notice','bookcase','workbench','desk-88','desk-96','bed','hearth','planter','barrel','anvil','rug','window','chest-open','book','lantern','wall','chest-closed'];
export const artAliases:Record<string,string>={
 ...Object.fromEntries(Object.entries(gearMaterials).map(([id,m])=>['items/'+id,'items/'+m.icon])),
 ...Object.fromEntries(toolIds.map(id=>['items/'+id,'tools/'+id+'-0'])),
 'items/wooden_chest':'interiors/chest-closed','items/reinforced_chest':'interiors/chest-open',
 ...Object.fromEntries(Object.entries({mayo_machine:'mayo',loom_machine:'loom',cheese_press:'cheese',oil_press:'oil'}).map(([id,art])=>['items/'+id,'ranching/'+art])),
};
export const entryArtPaths=['ui/notice-paper',...registrationAppearances.map(a=>'village/actor-'+a.id)];
export const knownArtPaths=new Set([...entryArtPaths,...toolArtPaths,...toolActorArtPaths,...sceneArtPaths,...cropArtPaths,...ranchArtPaths,...swordArtPaths,
 ...Array.from(lazyMaterialPaths),'ui/arrival','ui/register','ui/satchel','ui/notice-timber','ui/shop-interior','ui/blacksmith-interior','ui/weapon-stand','atlas/blacksmith','village/blacksmith-figure',
 ...['terrain','lia','noah','mira','adu','lanya'].map(n=>'atlas/'+n),...villageNames.map(n=>'village/'+n),...interiorNames.map(n=>'interiors/'+n),
 ...Object.keys(gearCatalog).map(n=>'items/'+n),...['wood','stone','seed','crop','plank','backpack','stone_sword','reinforced_sword','spring_spear','glow_staff','gel','shell','crystal','gate_stone','soup','gold','journal'].map(n=>'items/'+n)]);
export const canonicalArt=(path:string)=>artAliases[path]||path;
const unique=(paths:string[])=>Array.from(new Set(paths.map(canonicalArt).filter(p=>knownArtPaths.has(p)))).sort();

/** Only assets required by the active view belong on its blocking path. */
export function viewArtPaths(mode:string,state?:GameState|null,map?:MapData):string[]{
 const paths=[...entryArtPaths];
 if(mode==='welcome'||mode==='session'||!state)return unique(paths);
 if(mode==='world'&&map){
  paths.push(...villageNames.map(n=>'village/'+n));
  paths.push(...(sceneLayouts[map.id]||[]).flatMap(r=>r.art?[r.art]:[]));
  if(!sceneLayouts[map.id]&&!map.outdoor)paths.push(...interiorNames.map(n=>'interiors/'+n));
  if(map.id==='city')paths.push(...interiorNames.map(n=>'interiors/'+n));
  if(map.resource_nodes?.length)paths.push(...toolArtPaths);
  if(map.objects.some(o=>o.kind==='blacksmith'))paths.push('village/blacksmith-figure');
  if(map.objects.some(o=>o.kind==='ranch_gate'))paths.push('ranching/ledger');
  if(map.objects.some(o=>o.id.startsWith('player_chest_')))paths.push('interiors/chest-closed');
  for(const o of map.objects){
   if(o.kind==='plot'&&state.plots[o.id]){const crop=plotCrop(state.plots[o.id]);paths.push(...[1,2,3,4].map(n=>'farming/'+crop.id+'-'+n));}
   if(o.kind==='production'){const machine=state.construction?.machines?.[o.id];if(machine)paths.push('ranching/'+machine.facility);}
  }
  if(map.id==='pasture'||state.ranch?.mounted)paths.push(...ranchArtPaths);
  const held=state.tools?.held;if(held){paths.push('items/'+held);if(isTool(held)&&!map.id.startsWith('cave_'))paths.push(`tool-actors/${held}-${state.character?.appearance||0}`);}
  if(state.combat?.equipped&&state.inventory[state.combat.equipped])paths.push(...swordArtPaths,'items/'+state.combat.equipped);
 }else{
  if(['inventory','item-confirm','storage'].includes(mode))paths.push('ui/satchel');
  if(mode==='shop')paths.push('ui/shop-interior');
  if(['armory','forge','equipment','gear-recipe'].includes(mode))paths.push('ui/blacksmith-interior','ui/weapon-stand','atlas/blacksmith',...Object.keys(gearCatalog).map(n=>'items/'+n));
  if(mode==='farm')paths.push(...cropArtPaths);
  if(mode==='ranch')paths.push(...ranchArtPaths);
  if(['map','atlas'].includes(mode))paths.push('atlas/terrain');
 }
 return unique(paths);
}

/** Shared in-flight work, retryable failures and aliases, without engine state. */
export class DemandArt<T>{
 readonly pending=new Map<string,Promise<void>>();
 readonly failed=new Set<string>();
 private alive=true;
 constructor(readonly frames:Map<string,T>,private load:(path:string)=>Promise<T>,private changed:()=>void){}
 has(path:string){return this.frames.has(canonicalArt(path));}
 ensure(paths:string[]){return Promise.all(unique(paths).map(path=>this.one(path))).then(()=>{});}
 one(path:string):Promise<void>{
  path=canonicalArt(path);
  if(!knownArtPaths.has(path))return Promise.reject(new Error('Unknown artwork '+path));
  if(this.frames.has(path))return Promise.resolve();
  const existing=this.pending.get(path);if(existing)return existing;
  this.failed.delete(path);
  const task=this.load(path).then(frame=>{
   if(!this.alive)return;
   this.frames.set(path,frame);
   for(const [alias,target] of Object.entries(artAliases))if(target===path)this.frames.set(alias,frame);
  }).catch(error=>{if(this.alive)this.failed.add(path);throw error;}).finally(()=>{
   this.pending.delete(path);if(this.alive)this.changed();
  });
  this.pending.set(path,task);return task;
 }
 dispose(){this.alive=false;}
}
