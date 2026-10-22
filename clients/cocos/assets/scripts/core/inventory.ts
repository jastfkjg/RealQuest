import {seedCrop,itemCrop,growingDays,farmObjects} from './farming';
import type {GameState,World,NavigationTarget} from './protocol';
import {itemDefinitions,itemNames} from './items';
import {currentMap} from './navigation';
export interface PreferenceStorage {getItem(key:string):string|null;setItem(key:string,value:string):void;removeItem(key:string):void;}
export type InventoryPreference={version:2;saveId:string;selected:string;quick:(string|null)[];tray:(string|null)[];offset:{x:number;y:number}};
const known=(id:unknown):id is string=>typeof id==='string'&&Object.prototype.hasOwnProperty.call(itemDefinitions,id);
export const inventoryPreferenceKey=(id:string)=>'realquest-cocos-inventory-v2:'+id;
export function cleanQuick(value:unknown):(string|null)[]{
 const seen=new Set<string>();return Array.from({length:4},(_,i)=>{const id=Array.isArray(value)?value[i]:null;if(!known(id)||seen.has(id))return null;seen.add(id);return id;});
}
function cleanTray(value:unknown):(string|null)[]{const seen=new Set<string>();return (Array.isArray(value)?value.slice(0,128):[]).map(id=>{if(!known(id)||seen.has(id))return null;seen.add(id);return id;});}
function cleanOffset(value:any){return {x:Number.isFinite(value?.x)?Math.max(-4096,Math.min(4096,value.x)):0,y:Number.isFinite(value?.y)?Math.max(-4096,Math.min(4096,value.y)):0};}
function defaults(saveId:string):InventoryPreference{return {version:2,saveId,selected:'seed',quick:['seed',null,null,null],tray:[],offset:{x:0,y:0}};}
/** Optional presentation preferences; never authoritative possessions. */
export class InventoryPreferences {
 private memory=new Map<string,InventoryPreference>(); private active=''; warning='';
 constructor(private storage:PreferenceStorage){}
 get saveId(){return this.active;}
 get value(){return this.memory.get(this.active)||defaults(this.active);}
 enter(saveId:string){
  this.active=saveId;if(this.memory.has(saveId))return this.value;
  let value=defaults(saveId);if(saveId)try{const raw=this.storage.getItem(inventoryPreferenceKey(saveId));if(raw){const p=JSON.parse(raw);if(p?.version===2&&p.saveId===saveId){value={version:2,saveId,selected:known(p.selected)?p.selected:'seed',quick:cleanQuick(p.quick),tray:cleanTray(p.tray),offset:cleanOffset(p.offset)};}}}catch{this.warning='本机偏好暂时无法读取，本次整理仍可继续。';}
  this.memory.set(saveId,value);return value;
 }
 private write(value:InventoryPreference){if(!this.active)return;this.memory.set(this.active,value);try{this.storage.setItem(inventoryPreferenceKey(this.active),JSON.stringify(value));this.warning='';}catch{this.warning='本次整理已保留在当前窗口，关闭后可能需要重新安排。';}}
 select(id:string){if(known(id))this.write({...this.value,selected:id});}
 bind(slot:number,id:string,inventory:Record<string,number>){
  if(!Number.isInteger(slot)||slot<0||slot>3||!known(id)||!(inventory[id]>0))return false;
  const quick=[...this.value.quick],old=quick.indexOf(id);if(old>=0)quick[old]=quick[slot];quick[slot]=id;this.write({...this.value,quick});return true;
 }
 clear(slot:number){if(!Number.isInteger(slot)||slot<0||slot>3)return;const quick=[...this.value.quick];quick[slot]=null;this.write({...this.value,quick});}
 items(ids:string[]){const available=new Set(ids.filter(known)),tray=this.value.tray.map(id=>id&&available.has(id)?id:null);for(const id of available){if(tray.includes(id))continue;const empty=tray.indexOf(null);if(empty<0)tray.push(id);else tray[empty]=id;}return tray;}
 place(id:string,index:number,ids:string[]){if(!known(id)||!ids.includes(id)||!Number.isInteger(index)||index<0||index>=128)return false;const tray=this.items(ids);while(tray.length<=index)tray.push(null);const old=tray.indexOf(id);if(old<0)return false;[tray[old],tray[index]]=[tray[index],id];this.write({...this.value,tray});return true;}
 swapQuick(from:number,to:number){if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>3||to>3)return false;const quick=[...this.value.quick];[quick[from],quick[to]]=[quick[to],quick[from]];this.write({...this.value,quick});return true;}
 position(x:number,y:number){this.write({...this.value,offset:cleanOffset({x,y})});}
 legacy(){
  const candidates:{key:string;label:string;quick:(string|null)[]}[]=[];
  for(const [key,label] of [['realquest-cocos-quick-v1','旧Cocos快捷栏'],['realquest-quick-items','原Web快捷栏']])try{const raw=this.storage.getItem(key);if(!raw)continue;const value=JSON.parse(raw);if(!Array.isArray(value))continue;const quick=cleanQuick(value);if(quick.some(Boolean))candidates.push({key,label,quick});}catch{/* Optional legacy data cannot authenticate or choose a journey. */}
  return candidates;
 }
 importLegacy(key:string){const candidate=this.legacy().find(c=>c.key===key);if(!candidate||!this.active)return false;this.write({...this.value,quick:[...candidate.quick]});return true;}
 deleted(saveId:string){if(!saveId)return;this.memory.delete(saveId);try{this.storage.removeItem(inventoryPreferenceKey(saveId));}catch{this.warning='此旅程已删除，本机偏好清理未完成。';}if(this.active===saveId)this.active='';}
}
export type ItemIntent={item:string;label:string;reason:string;target?:NavigationTarget;mode?:string;command?:string;data?:Record<string,unknown>;costs?:Record<string,number>;gains?:Record<string,number>;seconds?:number;signature:string};
/** Re-derived at confirmation: movement, price or target changes invalidate the draft. */
export function itemIntent(world:World,s:GameState,now:number,item:string):ItemIntent {
 const map=currentMap(world,s,now),count=s.inventory[item]||0;
 const near=(id:string)=>map.objects.find(o=>o.id===id&&Math.hypot(o.x-s.position.x,o.y-s.position.y)<=65);
 const intent:Omit<ItemIntent,'signature'>={item,label:'查看相关委托',reason:count>0?'':'暂未持有，收集后再使用或分配。',mode:'journal'};
 const mark=(label:string,mapId:string,targetId:string)=>{intent.label=label;intent.target={mapId,targetId};delete intent.mode;};
 const action=(label:string,command:string,data:Record<string,unknown>,costs:Record<string,number>,gains:Record<string,number>)=>{intent.label=label;intent.command=command;intent.data=data;intent.costs=costs;intent.gains=gains;delete intent.mode;};
 if(['stone_sword','reinforced_sword','spring_spear','glow_staff'].includes(item)){intent.label='查看随行装备';intent.mode='equipment';}
 else if(item==='gate_stone')mark('标记东行石门','overworld','village_departure');
 else if(['gel','shell','crystal','soup'].includes(item))mark('标记工坊武备台','workshop','armory_counter');
 else if(seedCrop(item)){
  const c=seedCrop(item)!;
  const plot=farmObjects(world.objects,s).filter(o=>o.kind==='plot'&&!s.plots[o.id]).sort((a,b)=>Math.hypot(a.x-s.position.x,a.y-s.position.y)-Math.hypot(b.x-s.position.x,b.y-s.position.y)||a.id.localeCompare(b.id))[0];
  if((s.skill_growth?.planting||0)<c.level){intent.reason='需要种植 '+c.level+' 级，当前 '+(s.skill_growth?.planting||0)+' 级';intent.label='培养种植技能';intent.mode='growth';}
  else if(!plot){intent.reason='农田已种满，可收获后再播种，或在家园开垦。';delete intent.mode;intent.label='没有空农田';}
  else if(near(plot.id)){action('预览播种','plant',{target:plot.id,seed:item},{[item]:1},{});intent.seconds=growingDays(s,c.days)*(s.world_clock?.day_seconds||1800);}
  else mark('标记家园农田','overworld',plot.id);
 }else if(item==='wood'){
  if(near('workshop_counter')){action('制作1块木板','craft',{target:'workshop_counter'},{wood:3},{plank:1});if(count>0&&count<3)intent.reason='还需要'+(3-count)+'份木材。';}
  else mark('标记工坊柜台','workshop','workshop_counter');
 }else if(itemCrop(item)){
  const c=itemCrop(item)!;
  if(item==='crop'&&near('workshop_counter'))action('出售1份'+c.name,'sell',{target:'workshop_counter'},{[item]:1},{gold:7+s.buildings.workshop});
  else if(near('mira')||near('shop_counter')){
   const price=s.market?.sell[item];
   if(typeof price==='number')action('出售1份'+c.name,'market_trade',{target:near('mira')?'mira':'shop_counter',side:'sell',item,amount:1},{[item]:1},{gold:price});
   else {intent.reason='杂货铺报价尚未同步。';mark('标记杂货铺柜台','shop','shop_counter');}
  }else mark('标记风铃杂货铺','shop','shop_counter');
 }else if(item==='stone')mark('标记小屋工作台','home','home_desk');
 if(!known(item)){intent.reason='未识别的物品，请重新选择。';delete intent.command;delete intent.mode;delete intent.target;}
 return {...intent,signature:JSON.stringify({location:s.location,item,command:intent.command,data:intent.data,costs:intent.costs,gains:intent.gains,reason:intent.reason,plantSeconds:intent.seconds})};
}
export function itemAmounts(values:Record<string,number>|undefined){return Object.entries(values||{}).map(([id,n])=>(itemNames[id]||id)+' ×'+n).join('、')||'无';}
