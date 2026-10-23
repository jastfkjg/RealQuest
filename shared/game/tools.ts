import type {GameState,MapData,WorldObject} from './protocol';
import {toolCatalog} from './toolCatalog';
import {farmTick,farmCell,hoeReason,plotProgress} from './farming';

export type ToolId='hoe'|'axe'|'pickaxe'|'watering_can';
export type ResourceState={stage:string;work:number;version:number;total:number;solid:boolean;ready_tick?:number};
export type ToolState={version:number;held:string|null;levels:Record<ToolId,number>;water:number;next_at:number;sequence:number;
 resources:Record<string,{stage:string;work:number;version:number;ready_tick?:number}>;
 planted:Record<string,{id:string;x:number;y:number;ready_tick:number}>;
 action:{kind:string;target:string;x:number;y:number;started:number;until:number;sequence:number;drops:Record<string,number>;stage:string}|null};
export type ToolRules={interval:number;water_max:number;costs:Record<ToolId,number>;upgrades:Record<ToolId,{level:number;next:number|null;costs:Record<string,number>;reasons:string[]}>};
export const toolIds:ToolId[]=['hoe','axe','pickaxe','watering_can'];
export const isTool=(id:unknown):id is ToolId=>typeof id==='string'&&toolIds.includes(id as ToolId);
export const toolSpec=(id:ToolId)=>toolCatalog.tools.find(t=>t.id===id)!;
export const toolLevel=(s:GameState,id:ToolId)=>Math.max(0,Math.min(3,s.tools?.levels[id]||0));
export const toolName=(s:GameState,id:ToolId)=>toolCatalog.tiers[toolLevel(s,id)].name+toolSpec(id).name;
export const toolCost=(s:GameState,id:ToolId)=>s.tool_rules?.costs[id]??Math.max(1,toolSpec(id).stamina-Math.min(2,Math.floor((s.skill_growth?.[toolSpec(id).skill]||0)/3)));
export const resourceSpec=(id:string)=>(toolCatalog.resources as Record<string,{name:string;tool:string;work:number;level:number;stump_work?:number;days?:number;drops:Record<string,number>}>)[id];
export function resourceState(s:GameState,node:WorldObject,now:number):ResourceState{
 const tick=farmTick(s,now),spec=resourceSpec(node.resource!),saved=s.tools?.resources[node.id];
 const v:ResourceState={stage:node.resource==='tree'?'tree':'whole',work:0,version:0,total:spec.work,solid:true,...saved};
 if(node.planted&&!saved){v.stage='sapling';v.ready_tick=node.ready_tick;}
 if(v.stage==='sapling'&&tick>=v.ready_tick!){v.stage='tree';v.work=0;v.version++;}
 if(v.stage==='depleted'&&!node.home&&tick>=(v.ready_tick??Infinity)){
  v.stage=node.resource==='tree'?'sapling':'whole';v.work=0;v.version++;
  if(node.resource==='tree')v.ready_tick=(v.ready_tick??tick)+3*(s.world_clock?.day_seconds||1800);
  if(v.stage==='sapling'&&tick>=v.ready_tick!){v.stage='tree';v.version++;}
 }
 v.total=v.stage==='stump'?spec.stump_work!:spec.work;v.solid=!['depleted','sapling'].includes(v.stage);return v;
}
export function resourceObjects(base:MapData,s:GameState,now:number):WorldObject[]{
 const nodes=[...(base.resource_nodes||[])];
 if(base.id==='overworld')for(const o of Object.values(s.tools?.planted||{}))nodes.push({...o,kind:'resource',name:'新栽橡树',resource:'tree',home:true,planted:true,hitbox:[o.x-20,o.y-46,40,62],collider:[o.x-10,o.y-8,20,24]});
 return nodes.map(n=>({...n,resource_state:resourceState(s,n,now)}));
}
export function resourceLand(base:MapData,nodes:WorldObject[]){
 const land=base.cultivation;if(!land)return land;
 return {...land,blocked:[...(land.permanent_blocked||land.blocked),...nodes.filter(n=>n.resource_state?.stage!=='depleted').map(n=>n.collider!)]};
}
/** Single/charged line or3x3 selection on the existing soil grid. */
export function toolCells(map:MapData,x:number,y:number,direction:number,count:number){
 const land=map.cultivation;if(!land)return [];
 const c=farmCell(land,x,y),[dx,dy]=[[0,1],[0,-1],[-1,0],[1,0]][direction];
 const offsets=count===9?[-1,0,1].flatMap(a=>[-1,0,1].map(b=>[a,b])):Array.from({length:count},(_,i)=>[dx*i,dy*i]);
 return offsets.map(([a,b])=>farmCell(land,c.x+a*land.step,c.y+b*land.step));
}
export function toolTarget(map:MapData,s:GameState,now:number,key:ToolId,x:number,y:number):WorldObject|null{
 if(key==='axe'||key==='pickaxe'){
  const node=map.objects.filter(o=>o.kind==='resource'&&resourceSpec(o.resource!).tool===key&&!['depleted','sapling'].includes(o.resource_state!.stage)&&Math.abs(o.x-x)<=36&&y>=o.y-74&&y<=o.y+22).sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0];
  if(node||key==='axe')return node||null;
 }
 if(!map.cultivation)return null;
 const c=farmCell(map.cultivation,x,y),plot=map.objects.find(o=>o.id===c.id&&o.kind==='plot');return plot||c;
}
export function toolReason(map:MapData,s:GameState,key:ToolId,target:WorldObject,now=s.world_clock?.updated_at||0){
 if(!s.inventory[key])return '请把'+toolSpec(key).name+'放进背包';
 if(s.ranch?.mounted)return '请先下马';
 if(target.kind==='resource'){
  const spec=resourceSpec(target.resource!);
  if(spec.tool!==key)return '请选择'+toolSpec(spec.tool as ToolId).name;
  if(['depleted','sapling'].includes(target.resource_state!.stage))return '资源已耗尽或尚在生长';
  if(toolLevel(s,key)<spec.level)return '需要'+toolCatalog.tiers[spec.level].name+toolSpec(key).name;
  return '';
 }
 if(key==='hoe')return s.farm?.tilled.includes(target.id)?'这里已经开垦':hoeReason(map.cultivation!,target);
 if(key==='watering_can'){
  const p=s.plots[target.id];if(!p||p.clock!=='world')return '请选择正在生长的作物';
  if(plotProgress(s,p,now)>=1)return '作物已成熟，可以收获';if(p.watered)return '本轮已经浇水';if((s.tools?.water||0)<=0)return '水壶空了，走到河湖边按E补水';return '';
 }
 if(key==='pickaxe')return target.kind==='plot'&&!s.plots[target.id]?'':'请先收完作物，再恢复草地';
 return '请选择匹配的目标';
}
export const toolArtPaths=[...toolIds.flatMap(id=>[0,1,2,3].map(t=>'tools/'+id+'-'+t)),
 ...['stone','copper','iron','gold'].flatMap(id=>['whole','cracked','depleted'].map(stage=>'gathering/'+id+'-'+stage)),
 ...['stump','stump-cracked','sapling'].map(id=>'gathering/'+id),...['copper_ore','iron_ore','gold_ore','tree_seed'].map(id=>'items/'+id)];
