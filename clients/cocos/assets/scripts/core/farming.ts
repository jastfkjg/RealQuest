import type {GameState,WorldObject} from './protocol';
import {crops} from './cropCatalog';
export {crops} from './cropCatalog';
export const seedCrop=(id:string)=>crops.find(c=>c.seed===id);
export const itemCrop=(id:string)=>crops.find(c=>c.item===id);
export const plotCrop=(p:GameState['plots'][string])=>crops.find(c=>c.id===p?.crop_id)||crops[0];
export function farmObjects(objects:WorldObject[],s:GameState):WorldObject[]{const tilled=new Set(s.farm?.tilled||Array.from({length:6},(_,i)=>'plot_'+i));return objects.map(o=>['soil','plot'].includes(o.kind)?{...o,kind:tilled.has(o.id)?'plot':'soil',name:tilled.has(o.id)?'田地':'可开垦土地'}:o);}
export function farmTick(s:GameState,now:number){const c=s.world_clock;return (c?.elapsed||0)+(c&&now>=c.updated_at&&now<=c.running_until?now-c.updated_at:0);}
export function plotProgress(s:GameState,p:GameState['plots'][string],now:number){if(!p)return 0;const world=p.clock==='world',start=world?p.planted_tick!:p.planted_at,end=world?p.ready_tick!:p.ready_at!,tick=world?farmTick(s,now):now;return Math.max(0,Math.min(1,(tick-start)/Math.max(1,end-start)));}
export const plotStage=(s:GameState,p:GameState['plots'][string],now:number)=>{const v=plotProgress(s,p,now);return v>=1?4:v>=.65?3:v>=.25?2:1;};
export function remaining(s:GameState,p:GameState['plots'][string],now:number){if(p.clock!=='world')return Math.max(0,Math.ceil((p.ready_at||0)-now))+'现实秒';const ticks=Math.max(0,p.ready_tick!-farmTick(s,now)),minutes=Math.ceil(ticks*1440/(s.world_clock?.day_seconds||1800));return minutes>=1440?(minutes/1440).toFixed(1)+'游戏日':Math.floor(minutes/60)+'游戏时'+minutes%60+'分';}
export const growingDays=(s:GameState,days:number)=>days*(s.buildings.home>=2?.75:1);
export const cropArtPaths=crops.flatMap(c=>['items/'+c.seed,'items/'+c.item,...[1,2,3,4].map(stage=>'farming/'+c.id+'-'+stage)]);
