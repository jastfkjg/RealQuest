import type {PreferenceStorage} from './inventory';
import type {GameState,NavigationTarget} from './protocol';
import {villageClock,clockLabel} from './residents';
import {staminaNow} from './stamina';

export const preferenceKey='realquest-cocos-preferences-v1';
export type TravelPreferences={version:1;sound:boolean;motion:'system'|'reduce'};
/** Device presentation only: no session, inventory or reward state. */
export class LocalPreferences {
 value:TravelPreferences={version:1,sound:false,motion:'system'};
 warning='';source:'default'|'web'|'cocos'='default';
 constructor(private storage:PreferenceStorage){this.reload();}
 reload(){
  this.value={version:1,sound:false,motion:'system'};this.source='default';this.warning='';
  try{
   const raw=this.storage.getItem(preferenceKey);
   if(raw){const p=JSON.parse(raw);if(p?.version!==1||typeof p.sound!=='boolean'||!['system','reduce'].includes(p.motion))throw Error('invalid');this.value={version:1,sound:p.sound,motion:p.motion};this.source='cocos';return;}
   const old=JSON.parse(this.storage.getItem('realquest-preferences')||'null');
   if(old&&typeof old.sound==='boolean'&&typeof old.reducedMotion==='boolean'){this.value={version:1,sound:old.sound,motion:old.reducedMotion?'reduce':'system'};this.source='web';}
  }catch{this.warning='本机偏好暂不可读取，已使用默认设置；旅程数据不受影响。';}
 }
 set(change:Partial<Pick<TravelPreferences,'sound'|'motion'>>){
  if(change.sound!==undefined&&typeof change.sound!=='boolean'||change.motion!==undefined&&!['system','reduce'].includes(change.motion))return;
  this.value={...this.value,...change};
  try{this.storage.setItem(preferenceKey,JSON.stringify(this.value));this.source='cocos';this.warning='';}
  catch{this.warning='设置已用于当前窗口；本机存储不可用，重开后可能需要重设。';}
 }
 reduced(system:boolean){return system||this.value.motion==='reduce';}
}
export type TravelNotice={id:string;title:string;body:string;label:string;target?:NavigationTarget;contracts?:boolean};
export function travelNotices(s:GameState,now:number):TravelNotice[]{
 const notes:TravelNotice[]=[],clock=villageClock(s,now),deadline=s.sleep_rules?.deadline_minute??1500;
 if(clock.minute>=22*60||clock.minute<=Math.max(0,deadline-1440)){
  const inn=['city','inn'].includes(s.location);
  notes.push({id:'night:'+clock.day,title:'夜深了，找床休息',body:'夜晚会在'+clockLabel(deadline%1440)+'自动结算。睡到明早可恢复体力与生命；这里不会替你休息。',label:inn?'标记旅店床铺':'标记家里的床',target:{mapId:inn?'inn':'home',targetId:inn?'inn_bed':'home_bed'}});
 }
 const stamina=staminaNow(s,now),max=s.stamina?.max||100;
 if(stamina<=max*.2)notes.push({id:'stamina',title:'体力不多了',body:'当前体力 '+Math.floor(stamina)+' / '+max+'。采集与探索会消耗体力，可以先找床休息。',label:'标记休息处',target:{mapId:['city','inn'].includes(s.location)?'inn':'home',targetId:['city','inn'].includes(s.location)?'inn_bed':'home_bed'}});
 const ready=(s.life_journal?.tasks||[]).filter(t=>t.status==='active'&&now>=t.ready_at);
 if(ready.length)notes.push({id:'contracts',title:ready.length+'份现实约定时段已到',body:'计时到点不代表行为已核验。请查看约定，再到诺亚面前按原规则结算；不会自动发放成长点。',label:'查看现实约定',contracts:true});
 return notes;
}
export function confirmedCue(before:GameState,after:GameState):'reward'|'item'|null{
 if(after.xp>before.xp||['knowledge_points','health_points','skill_points'].some(k=>(after as any)[k]>(before as any)[k]))return 'reward';
 return Object.entries(after.inventory).some(([id,n])=>n>(before.inventory[id]||0))?'item':null;
}
