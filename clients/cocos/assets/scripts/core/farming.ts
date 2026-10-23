import type {GameState,WorldObject,MapData} from './protocol';
import {crops} from './cropCatalog';
export {crops} from './cropCatalog';
export const seedCrop=(id:string)=>crops.find(c=>c.seed===id);
export const itemCrop=(id:string)=>crops.find(c=>c.item===id);
export const plotCrop=(p:GameState['plots'][string])=>crops.find(c=>c.id===p?.crop_id)||crops[0];
type Land=NonNullable<MapData['cultivation']>;
export function farmCell(land:Land,x:number,y:number):WorldObject{
 const [ox,oy]=land.origin,col=Math.floor((x-ox)/land.step+.5),row=Math.floor((y-oy)/land.step+.5);x=ox+col*land.step;y=oy+row*land.step;
 const old=land.legacy.find(o=>o.x===x&&o.y===y);return {id:old?.id||`field_${col}_${row}`,kind:'soil',name:'草地',x,y};
}
export function farmCellById(land:Land,key:string):WorldObject|null{
 const old=land.legacy.find(o=>o.id===key);if(old)return {...old,kind:'soil',name:'草地'};
 const m=/^field_(-?\d{1,3})_(-?\d{1,3})$/.exec(key);if(!m)return null;
 const c=farmCell(land,land.origin[0]+Number(m[1])*land.step,land.origin[1]+Number(m[2])*land.step);return c.id===key?c:null;
}
function segmentBox(a:number[],b:number[],box:number[]){
 const [x,y,w,h]=box;let lo=0,hi=1;
 for(const [start,delta,lower,upper] of [[a[0],b[0]-a[0],x,x+w],[a[1],b[1]-a[1],y,y+h]]){
  if(delta===0){if(start<lower||start>upper){lo=1;hi=0;break;}}
  else{const t=[(lower-start)/delta,(upper-start)/delta].sort((c,d)=>c-d);lo=Math.max(lo,t[0]);hi=Math.min(hi,t[1]);}
 }
 if(lo<=hi)return 0;
 const dx=b[0]-a[0],dy=b[1]-a[1],dist=(px:number,py:number)=>{const t=Math.max(0,Math.min(1,((px-a[0])*dx+(py-a[1])*dy)/Math.max(1,dx*dx+dy*dy)));return Math.hypot(px-a[0]-t*dx,py-a[1]-t*dy);};
 return Math.min(...[[x,y],[x+w,y],[x,y+h],[x+w,y+h]].map(p=>dist(p[0],p[1])),...[a,b].map(([px,py])=>Math.hypot(Math.max(x-px,0,px-x-w),Math.max(y-py,0,py-y-h))));
}
export function hoeReason(land:Land,cell:WorldObject):string{
 const {x,y}=cell,[rx,ry,w,h]=land.bounds,box=[x-21,y-18,42,36];
 if(box[0]<rx||box[1]<ry||x+21>rx+w||y+18>ry+h)return '只能在家园范围内的草地开垦';
 if(land.blocked.some(([bx,by,bw,bh])=>box[0]<bx+bw&&x+21>bx&&box[1]<by+bh&&y+18>by))return '建筑、树干、水面和设施不能开垦';
 if(land.roads.some(([points,width])=>points.slice(1).some((p,i)=>segmentBox(points[i],p,box)<=width/2+2)))return '小路不能开垦，请选择草地';
 return '';
}
export function farmObjects(objects:WorldObject[],s:GameState,land?:Land):WorldObject[]{
 const tilled=s.farm?.tilled||Array.from({length:6},(_,i)=>'plot_'+i);
 if(!land){const set=new Set(tilled);return objects.map(o=>['soil','plot'].includes(o.kind)?{...o,kind:set.has(o.id)?'plot':'soil',name:set.has(o.id)?'田地':'草地'}:o);}
 return [...objects.filter(o=>!['plot','soil'].includes(o.kind)),...tilled.map(id=>farmCellById(land,id)).filter((o):o is WorldObject=>!!o).map(o=>({...o,kind:'plot',name:'田地'}))];
}
export function farmTick(s:GameState,now:number){const c=s.world_clock;return (c?.elapsed||0)+(c&&now>=c.updated_at&&now<=c.running_until?now-c.updated_at:0);}
export function plotProgress(s:GameState,p:GameState['plots'][string],now:number){if(!p)return 0;const world=p.clock==='world',start=world?p.planted_tick!:p.planted_at,end=world?p.ready_tick!:p.ready_at!,tick=world?farmTick(s,now):now;return Math.max(0,Math.min(1,(tick-start)/Math.max(1,end-start)));}
export const plotStage=(s:GameState,p:GameState['plots'][string],now:number)=>{const v=plotProgress(s,p,now);return v>=1?4:v>=.65?3:v>=.25?2:1;};
export function remaining(s:GameState,p:GameState['plots'][string],now:number){if(p.clock!=='world')return Math.max(0,Math.ceil((p.ready_at||0)-now))+'现实秒';const ticks=Math.max(0,p.ready_tick!-farmTick(s,now)),minutes=Math.ceil(ticks*1440/(s.world_clock?.day_seconds||1800));return minutes>=1440?(minutes/1440).toFixed(1)+'游戏日':Math.floor(minutes/60)+'游戏时'+minutes%60+'分';}
export const growingDays=(s:GameState,days:number)=>days*(s.buildings.home>=2?.75:1);
export const cropArtPaths=crops.flatMap(c=>['items/'+c.seed,'items/'+c.item,...[1,2,3,4].map(stage=>'farming/'+c.id+'-'+stage)]);
