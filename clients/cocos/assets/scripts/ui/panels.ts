import type { Label } from 'cc';
import type {GameState,World,WorldObject,NavigationTarget,GrowthTarget,Quest} from '../core/protocol';
import {C} from './theme';
import {drawQuestBoard,drawQuestStory} from './questBoard';
import {drawJourneyMenu} from './journeyMenu';
import {drawExpeditionGear} from './expeditionGear';
import {gameControls,paperSurface,timberSurface} from './materials';
import {LifePanels} from './life';
import {DossierPanels} from './dossier';
import {GuidancePanels} from './guidance';
import {PlacesPanels} from './places';
import {PreferencePanels} from './preferences';
import type {GuidanceAction} from '../core/guidance';
import {itemNames,growthNames,questStatuses,costText,shortages,growthCommand,timeText,entityId,plankRecipe,upgradeCosts} from '../core/features';
import {questTarget,currentMap} from '../core/navigation';
import {residentPositions} from '../core/residents';
import {textPages} from '../core/lifeRecords';

export type ControlSkin='game'|'reply'|'portrait'|'answer'|'pocket'|'notice'|'entry'|'tab'|'back'|'back-light'|'page';
export interface PanelHost {
 readonly state:GameState; readonly saveId:string; readonly world:World; readonly context:WorldObject|null;
 readonly reducedMotion:boolean;readonly mode:string;readonly width:number;readonly height:number;readonly processing:boolean;readonly connection:string;readonly busy:boolean;readonly error:string;readonly notice:string;readonly now:number;
 box(id:string,x:number,y:number,w:number,h:number,color:string,radius?:number):void;
 text(id:string,value:string,x:number,y:number,w:number,h:number,size?:number,color?:string,center?:boolean):Label;
 button(id:string,label:string,x:number,y:number,w:number,h:number,action:()=>unknown,disabled?:boolean,primary?:boolean,skin?:ControlSkin,semantic?:{label:string;pressed?:boolean}):Label;
 region(id:string,x:number,y:number,w:number,h:number):void;
 line(id:string,points:{x:number;y:number}[],color:string,width?:number):void;
 itemSlot(id:string,item:string|null,x:number,y:number,w:number,h:number,count:number,selected:boolean,action:()=>unknown,reference?:boolean,number?:number):void;
 image(path:string,x:number,y:number,w:number,h:number,sliced?:boolean):void;
 hasArt(path:string):boolean;
 routeArt(gate:boolean,x:number,y:number,w:number,h:number):void;
 person(name:string,x:number,y:number,w:number,h:number):void;
 field(id:string,label:string,value:string,x:number,y:number,w:number,change:(value:string)=>void,numeric?:boolean,maxLength?:number):void;
 send(action:string,data?:Record<string,unknown>):Promise<boolean>;
 follow(action:GuidanceAction):void; go(mode:string,replace?:boolean):void; close():void; redraw(clearFeedback?:boolean):void; mark(target:NavigationTarget,label:string):void; uuid():string;
 meet(id:string):void; focus(id:string):void; reconnect():void;
}
type Frame={x:number;y:number;w:number;h:number;compact:boolean;top:number;bottom:number};
const lifeNames={study:'学习',exercise:'运动',work:'工作'};
export class FeaturePanels {
 private lifePanels=new LifePanels();
 private dossier=new DossierPanels();
 private guidance=new GuidancePanels();
 private places=new PlacesPanels();
 private preferences=new PreferencePanels();
 openNotices(){this.preferences.openNotices();}
 contractNotices(){this.lifePanels.lifeTab='contracts';return 'life';}
 prepare(){this.guidance.prepare();}
 get dialogueChoices(){return this.places.dialogueChoices;}
 tick(dt:number){this.places.tick(dt);}
 advanceDialogue(h:PanelHost){return this.npcTab==='talk'&&this.places.advance(h);}
 focusLife(view:'study'|'contracts',state:GameState){return this.lifePanels.focus(view,state);}
 inspectPlace(h:PanelHost,id:string){this.places.inspect(h,id);}
 findNeighbor(h:PanelHost,id:string){this.places.find(h,id);}
 get growth(){return this.dossier.growth;}
 set growth(value:GrowthTarget){this.dossier.growth=value;}
 get lifeTab(){return this.lifePanels.lifeTab;}
 npcTab='talk'; page=0; detailPage=0;
 questId=''; weaponId='stone_sword'; taskId='';
 private questListPer=0;
 amount='1'; orderId=''; tradeItem='seed'; tradeSide='buy';
 lifeKind:'study'|'exercise'|'work'='study';hours=1; confirm='';shopTab='trade';gearTab='obtain';
 private modes=['menu','journal','quests','quest-story','shop','building','dialogue','life','growth','equipment','armory','spellbook','cave','gate','map','study-new','study-edit','plan-new','plan-edit'];
 handles(mode:string){return mode==='gear-recipe'||mode==='preferences'||this.places.handles(mode)||this.guidance.handles(mode)||this.dossier.handles(mode)||this.lifePanels.handles(mode)||this.modes.includes(mode);}
 guideMode(mode:string){return this.guidance.handles(mode);}
 lifeMode(mode:string){return this.lifePanels.handles(mode);}
 reset(){this.page=0;this.detailPage=0;this.confirm='';this.lifePanels.reset();this.dossier.reset();}
 snapshot(){return {npcTab:this.npcTab,questId:this.questId,weaponId:this.weaponId,mapResidentId:this.taskId,page:this.page,detailPage:this.detailPage,...this.lifePanels.snapshot(),...this.dossier.snapshot(),...this.guidance.snapshot(),...this.places.snapshot(),...this.preferences.snapshot()};}
 draw(original:PanelHost){
  const h=gameControls(original);
  if(['armory','equipment','gear-recipe'].includes(h.mode)){drawExpeditionGear(h,this);return;}
  if(h.mode==='menu'){drawJourneyMenu(h,this);return;}
  if(h.mode==='preferences'){this.preferences.draw(h);return;}
  if(h.mode==='dialogue'&&this.npcTab==='talk'){this.places.encounter(h,id=>{if(id==='shop')h.go('shop');else{this.npcTab=id;this.page=0;h.redraw();}});return;}
  if(this.places.handles(h.mode)){this.places.draw(h);return;}
  if(this.guidance.handles(h.mode)){this.guidance.draw(h);return;}
  if(this.dossier.handles(h.mode)){this.dossier.draw(h);return;}
  if(this.lifePanels.handles(h.mode)){this.lifePanels.draw(h);return;}
  if(h.mode==='quests'||h.mode==='journal'){drawQuestBoard(h,this,h.mode==='quests'?h.context?.id:undefined);return;}
  if(h.mode==='quest-story'){drawQuestStory(h,this);return;}
  const titles:Record<string,string>={menu:'旅程随身页',journal:'旅途委托',quests:h.context?.name||'村庄告示板','quest-story':'委托原文',shop:'风铃杂货铺',building:h.context?.name||'工坊蓝图',dialogue:h.context?.name||'村民对话',life:'现实成长',growth:'旅人成长',equipment:'随行装备',armory:'工坊武备台',spellbook:'火花术研习',cave:'石根山洞',gate:'村东石门',map:'旅途地图','study-new':'写下今日研习','study-edit':'修改研习书页','plan-new':'装订长期计划','plan-edit':'修改长期计划'};
  const ideal=h.mode.startsWith('study-')||h.mode.startsWith('plan-')?400:({menu:520,shop:520,building:480,growth:560,equipment:520,armory:520,spellbook:480,cave:560,gate:560,map:500,life:560} as Record<string,number>)[h.mode]||620;
  const w=Math.min(['cave','gate','armory','equipment','shop'].includes(h.mode)?1000:880,h.width-32),height=Math.min(ideal,h.height-24);
  const f:Frame={x:(h.width-w)/2,y:(h.height-height)/2,w,h:height,compact:height<460,top:(h.height-height)/2+80,bottom:(h.height+height)/2-114};
  if(['cave','gate'].includes(h.mode)){
   timberSurface(h,f);const left=Math.round(w*(f.compact?0.27:0.30));
   h.box('ExpeditionCloth',f.x+18,f.y+68,left-18,height-86,C.moss,4);
   h.routeArt(h.mode==='gate',f.x+30,f.y+(f.compact?78:112),left-48,f.compact?132:210);
   h.text('ExpeditionPlace',h.mode==='gate'?'村东石门':'石根山洞',f.x+30,f.y+height-(f.compact?106:192),left-48,40,f.compact?20:26,C.paper,true);
   if(!f.compact)h.text('ExpeditionCaption',h.mode==='gate'?'石门之外\n苇风渡口与远行之路':'旧采石场旁\n由你决定何时进入',f.x+34,f.y+height-144,left-56,60,16,C.paper,true);
   const decision={...f,x:f.x+left+12,w:w-left-30,y:f.y+68,h:height-86};paperSurface(h,decision);
   h.text('FeatureTitle',titles[h.mode],f.x+24,f.y+12,w-360,42,24,C.paper);
   h.button('expedition-entry',h.state.village_intro?.reviewed?'再出发手记':h.state.village_intro?.returned?'初探材料回顾':'初探与远行',f.x+w-264,f.y+12,152,44,()=>{this.prepare();h.go(h.state.village_intro?.reviewed?'preparation':'expedition');},h.busy);
   h.button('close','返回',f.x+w-100,f.y+12,76,44,()=>h.close(),h.busy,false,'back-light');
   const inner={...decision,top:decision.y+24,bottom:decision.y+decision.h-114,compact:decision.h<430};this.cave(h,inner);
   if(h.error||h.notice)h.text('FeatureFeedback',h.error||h.notice,decision.x+24,decision.y+decision.h-108,decision.w-48,42,14,h.error?C.danger:C.muted);return;
  }
  if(['armory','shop','building'].includes(h.mode)){timberSurface(h,f);paperSurface(h,{x:f.x+12,y:f.y+10,w:w-24,h:height-20});}
  else paperSurface(h,f,true);
  const expedition=['armory','cave','gate'].includes(h.mode)||(h.mode==='quests'&&h.context?.id==='board');
  const hasBalance=['shop','building','spellbook'].includes(h.mode);
  h.text('FeatureTitle',titles[h.mode]||'旅程',f.x+24,f.y+12,expedition?(h.mode==='armory'?w-512:w-360):w-(hasBalance?312:160),42,f.compact?21:24);
  if(expedition)h.button('expedition-entry',h.state.village_intro?.reviewed?'再出发手记':h.state.village_intro?.returned?'初探材料回顾':'初探与远行',f.x+w-264,f.y+12,152,44,()=>{this.prepare();h.go(h.state.village_intro?.reviewed?'preparation':'expedition');},h.busy);
  h.button('close','返回',f.x+w-100,f.y+12,76,44,()=>h.close(),h.busy);
  const money=`金币 ${h.state.inventory.gold||0}`;
  if(['shop','building','armory','equipment','spellbook'].includes(h.mode))h.text('FeatureBalance',money,f.x+w-(expedition?464:280),f.y+20,160,28,16,C.muted);
  if(h.mode==='menu')this.menu(h,f);
  else if(h.mode==='journal'||h.mode==='quests')this.quests(h,f,h.mode==='quests'?h.context?.id:undefined);
  else if(h.mode==='shop')this.shop(h,f);
  else if(h.mode==='building')this.building(h,f);
  else if(h.mode==='quest-story')this.questStory(h,f);
  else if(h.mode==='dialogue')this.npc(h,f);

  else if(h.mode==='spellbook')this.spell(h,f);
  else if(h.mode==='cave'||h.mode==='gate')this.cave(h,f);

  if(h.error||h.notice&&!(h.mode==='dialogue'&&this.npcTab==='talk'))h.text('FeatureFeedback',h.error||h.notice,f.x+24,f.y+f.h-108,f.w-48,42,15,h.error?C.danger:C.muted);
 }
 private tabs(h:PanelHost,f:Frame,entries:[string,string][],selected:string,change:(id:string)=>void){const width=(f.w-48)/entries.length;
  entries.forEach(([id,label],i)=>h.button('tab-'+id,label,f.x+24+i*width,f.y+68,width-8,44,()=>{change(id);this.page=0;this.confirm='';h.redraw();},h.busy,selected===id,undefined,{label,pressed:selected===id}));
  f.top=f.y+126;
 }
 private list(h:PanelHost,f:Frame,entries:{id:string;label:string}[],selected:string,choose:(id:string)=>void,width:number){
  const per=Math.max(1,Math.floor((f.bottom-f.top-52)/52)),pages=Math.max(1,Math.ceil(entries.length/per));this.page=Math.min(this.page,pages-1);
  entries.slice(this.page*per,(this.page+1)*per).forEach((e,i)=>{const label=h.button('select-'+e.id,e.label,f.x+24,f.top+i*52,width,44,()=>{choose(e.id);this.detailPage=0;this.confirm='';h.redraw();},h.busy,selected===e.id);if(e.label.includes('\n'))label.lineHeight=20;});
  if(!entries.length)h.text('EmptyList','这里还没有记录',f.x+24,f.top,width,48,16,C.muted);
  if(pages>1)h.button('list-next',`${this.page+1}/${pages} · 下一页`,f.x+24,f.bottom-44,width,44,()=>{this.page=(this.page+1)%pages;h.redraw();},h.busy);
 }
 private menu(h:PanelHost,f:Frame){
  const entries=[['character','旅人档案'],['growth','培养能力'],['equipment','随行装备'],['journal','旅途委托'],['map','地点与邻里'],['life','现实成长'],['preferences','旅途偏好'],['session','旅程凭证'],['guide','旅人指南'],['preparation','再出发手记']];
  const per=f.compact?6:12,pages=Math.ceil(entries.length/per);this.page=Math.min(this.page,pages-1);const ww=(f.w-64)/3;
  entries.slice(this.page*per,(this.page+1)*per).forEach(([mode,label],i)=>h.button('menu-'+mode,label,f.x+24+(i%3)*(ww+8),f.top+Math.floor(i/3)*64,ww,52,()=>{if(mode==='preparation')this.prepare();h.go(mode);},h.busy));
  if(!f.compact)h.text('MenuHint','WASD 移动 · E 交互 · C 档案 · I 行囊 · L 成长 · J 委托 · M 地图',f.x+24,f.y+f.h-156,f.w-48,40,16,C.muted);
  if(pages>1){h.button('menu-prev','上一页',f.x+24,f.y+f.h-62,160,44,()=>{this.page--;h.redraw();},h.busy||!this.page);h.button('menu-next','下一页 '+(this.page+1)+'/'+pages,f.x+f.w-184,f.y+f.h-62,160,44,()=>{this.page++;h.redraw();},h.busy||this.page>=pages-1);}
 }
 private quests(h:PanelHost,f:Frame,giver?:string){
  const entries=h.state.quest_log.filter(q=>!giver||q.giver===giver),q=entries.find(q=>q.id===this.questId)||entries.find(q=>['ready','active','available'].includes(q.status))||entries[0];
  if(!q){h.text('NoQuests','这里暂时没有剧情委托。',f.x+24,f.top,f.w-48,60);return;}this.questId=q.id;
  const lw=Math.round(f.w*.30),dx=f.x+lw+48,dw=f.w-lw-72;
  h.box('NoticeTimber',f.x+16,f.top-8,lw+16,f.bottom-f.top+18,C.wood,8);
  const category=(q:Quest)=>q.kind==='main'?'主线':'支线';
  const tracked=h.state.tracked_quest===q.id,trackable=['active','ready'].includes(q.status);
  const perPage=Math.max(1,Math.floor((f.bottom-f.top-52)/52));
  if(this.questListPer!==perPage){this.page=Math.floor(entries.indexOf(q)/perPage);this.questListPer=perPage;}
  this.list(h,f,entries.map(q=>({id:q.id,label:`${category(q)} · ${h.state.tracked_quest===q.id?'追踪中':questStatuses[q.status]}\n${q.title}`})),q.id,id=>this.questId=id,lw);
  h.text('QuestName',`${category(q)} · ${q.title}`,dx,f.top,dw,36,22);
  h.text('QuestTracking',`${questStatuses[q.status]} · ${tracked?'当前追踪':q.status==='available'?'接取后保留当前追踪':trackable?'尚未追踪，可手动切换':q.kind==='side'?'可选事项':'旅程主线'}`,dx,f.top+36,dw,26,14,tracked?C.moss:C.muted);
  if(!f.compact){const pages=textPages(q.description,Math.max(12,Math.floor(dw/16)-2),2);h.text('QuestDescription',pages[0]+(pages.length>1?'…':''),dx,f.top+68,dw,64,16,C.muted);}
  const start=f.top+(f.compact?64:138),per=f.compact?1:Math.max(1,Math.floor((f.bottom-start-84)/26)),pages=Math.max(1,Math.ceil(q.objectives.length/per));this.detailPage%=pages;
  if(f.compact){const i=this.detailPage;h.button('objectives-next',`${q.checks[i]?'✓':'○'} ${q.objectives[i]}${pages>1?` · ${i+1}/${pages}`:''}`,dx,start,dw,44,()=>{this.detailPage=(this.detailPage+1)%pages;h.redraw();},h.busy||pages===1);}
  else q.objectives.slice(this.detailPage*per,(this.detailPage+1)*per).forEach((text,i)=>{const n=this.detailPage*per+i;h.text('Objective-'+n,`${q.checks[n]?'✓':'○'} ${text}`,dx,start+i*26,dw,26,15,q.checks[n]?C.moss:C.ink);});
  h.text('QuestReward','回礼 · '+costText(q.reward)+` · ${q.xp} EXP`,dx,f.bottom-30,dw,28,14,C.muted);
  if(pages>1&&!f.compact)h.button('objectives-next',`目标 ${this.detailPage+1}/${pages}`,dx,f.bottom-76,Math.min(160,dw),44,()=>{this.detailPage=(this.detailPage+1)%pages;h.redraw();});
  const giverObject=currentMap(h.world,h.state,h.now).objects.find(o=>o.id===q.giver),near=!!giverObject&&Math.hypot(giverObject.x-h.state.position.x,giverObject.y-h.state.position.y)<=72;
  const action=q.status==='available'?'quest_accept':q.status==='ready'?'quest_claim':q.status==='active'?'track_quest':null;
  const actionWidth=(dw-16)/3,footer=f.y+f.h-62;
  h.button('quest-action',q.status==='available'?`接取${category(q)}`:q.status==='ready'?'交付领取':q.status==='active'?(tracked?'正在追踪':'追踪此委托'):questStatuses[q.status],dx,footer,actionWidth,44,()=>action&&h.send(action,{quest_id:q.id}),h.busy||!action||(action==='track_quest'?tracked:!near),true);
  const target=questTarget(q,h.state);h.button('quest-mark',near?'标记目标':'标记委托人',dx+actionWidth+8,footer,actionWidth,44,()=>target&&h.mark(target,q.title),!target||h.busy);
  h.button('quest-read','阅读原文',dx+(actionWidth+8)*2,footer,actionWidth,44,()=>h.go('quest-story'),h.busy);
 }
 private questStory(h:PanelHost,f:Frame){
  const q=h.state.quest_log.find(q=>q.id===this.questId);
  if(!q){h.text('QuestStoryMissing','这份委托暂不可用，请返回重新选择。',f.x+24,f.top,f.w-48,60);return;}
  const width=f.w-48,bodyY=f.top+44,rows=Math.max(1,Math.floor((f.bottom-bodyY)/24));
  const pages=textPages(q.description,Math.max(12,Math.floor(width/16)-2),rows);this.detailPage=Math.min(this.detailPage,pages.length-1);
  h.text('QuestStoryName',q.title,f.x+24,f.top,width,34,20);
  h.text('QuestStoryBody',pages[this.detailPage],f.x+24,bodyY,width,rows*24,16);
  const buttonWidth=(width-16)/3,y=f.y+f.h-62;
  h.button('quest-story-prev','上一页',f.x+24,y,buttonWidth,44,()=>{this.detailPage--;h.redraw();},h.busy||!this.detailPage);
  h.button('quest-story-back',`${this.detailPage+1}/${pages.length} · 返回委托`,f.x+32+buttonWidth,y,buttonWidth,44,()=>h.close(),h.busy);
  h.button('quest-story-next','下一页',f.x+40+buttonWidth*2,y,buttonWidth,44,()=>{this.detailPage++;h.redraw();},h.busy||this.detailPage>=pages.length-1);
 }
 private shop(h:PanelHost,f:Frame){
  this.tabs(h,f,[['trade','柜台交易'],['orders','今日订单']],this.shopTab,id=>this.shopTab=id);
  const market=h.state.market;if(!market)return;const target=h.context?.id==='mira'?'mira':'shop_counter';
  if(this.shopTab==='orders'){
   const order=market.orders.find(o=>o.id===this.orderId)||market.orders[0];if(!order)return;this.orderId=order.id;
   const lw=Math.floor(f.w*.36),dx=f.x+lw+48,dw=f.w-lw-72;
   this.list(h,f,market.orders.map(o=>({id:o.id,label:`${o.completed?'已交付':'待交付'} · ${o.title}`})),order.id,id=>this.orderId=id,lw);
   h.text('OrderTitle',order.title,dx,f.top,dw,36,22);h.text('OrderCosts',`需要 ${costText({[order.item]:order.amount})} · 持有 ${h.state.inventory[order.item]||0}
回礼 金币 ${order.gold}`,dx,f.top+42,dw,66,17);
   if(!f.compact)h.text('OrderNote',`${order.note}
日期 ${market.date} · ${market.timezone}`,dx,f.top+122,dw,78,16,C.muted);
   h.button('deliver-order',order.completed?'今天已交付':'确认交付订单',dx,f.y+f.h-62,dw,44,()=>h.send('market_deliver',{target,date:market.date,order_id:order.id}),h.busy||order.completed||(h.state.inventory[order.item]||0)<order.amount,true);return;
  }
  const lw=Math.floor(f.w*.32),dx=f.x+lw+48,dw=f.w-lw-72;
  const entries=[...Object.keys(market.buy).map(id=>({id:'buy:'+id,label:'买入 · '+(itemNames[id]||id)})),...Object.keys(market.sell).map(id=>({id:'sell:'+id,label:'卖出 · '+(itemNames[id]||id)}))];
  if(!entries.some(e=>e.id===this.tradeSide+':'+this.tradeItem)){this.tradeSide='buy';this.tradeItem=Object.keys(market.buy)[0];}
  this.list(h,f,entries,this.tradeSide+':'+this.tradeItem,id=>{[this.tradeSide,this.tradeItem]=id.split(':');this.amount='1';},lw);
  const price=(this.tradeSide==='buy'?market.buy:market.sell)[this.tradeItem],amount=Number(this.amount),cost=price*amount;
  if(h.hasArt('items/'+this.tradeItem))h.image('items/'+this.tradeItem,dx+(f.compact?20:32),f.top+(f.compact?20:46),f.compact?40:64,f.compact?40:64);
  h.text('TradeItem',f.compact?`${itemNames[this.tradeItem]} · 单价 ${price} · 持有 ${h.state.inventory[this.tradeItem]||0}`:itemNames[this.tradeItem]||this.tradeItem,dx+(f.compact?52:88),f.top,dw-(f.compact?52:88),34,f.compact?16:24);
  if(!f.compact)h.text('TradePrice',`单价 ${price} 金币 · 持有 ${h.state.inventory[this.tradeItem]||0}`,dx+88,f.top+40,dw-88,28,16,C.muted);
  const quantityY=f.top+(f.compact?36:116),step=(delta:number)=>{this.amount=String(Math.min(99,Math.max(1,(Number.isInteger(amount)?amount:1)+delta)));h.redraw();};
  h.field('trade-amount','数量 1–99',this.amount,dx+52,quantityY,88,v=>this.amount=v,true,2);
  h.button('trade-minus','−',dx,quantityY+22,44,44,()=>step(-1),h.busy||amount<=1,false,'game',{label:'减少购买或出售数量'});
  h.button('trade-plus','+',dx+148,quantityY+22,44,44,()=>step(1),h.busy||amount>=99,false,'game',{label:'增加购买或出售数量'});
  const valid=Number.isInteger(amount)&&amount>=1&&amount<=99,balance=this.tradeSide==='buy'?h.state.inventory.gold||0:h.state.inventory[this.tradeItem]||0,required=this.tradeSide==='buy'?cost:amount,missing=valid?Math.max(0,required-balance):0;
  h.text('TradeTotal',`${this.tradeSide==='buy'?'支付':'获得'} ${valid?cost:'—'} 金币`,dx+208,f.top+(f.compact?58:138),dw-208,44,18);
  if(!h.error&&!h.notice)h.text('TradeReadiness',!valid?'请输入 1–99 的整数数量':missing?`还差 ${missing} ${this.tradeSide==='buy'?'金币':itemNames[this.tradeItem]}`:`交易后${this.tradeSide==='buy'?'金币':'持有'} ${balance-required}`,dx,f.y+f.h-108,dw,36,15,missing||!valid?C.danger:C.muted);
  h.button('trade-confirm',`确认${this.tradeSide==='buy'?'买入':'卖出'}`,dx,f.y+f.h-62,dw,44,()=>h.send('market_trade',{target,side:this.tradeSide,item:this.tradeItem,amount:Number(this.amount)}),h.busy||!valid||!!missing,true);
 }
 private building(h:PanelHost,f:Frame){
  const obj=h.context;if(!obj)return;const key=obj.building||'workshop',level=h.state.buildings[key]||1,costs=upgradeCosts(level),dx=f.x+f.w*.44,dw=f.w*.56-24;
  h.image('interiors/workbench',f.x+f.w*.22,f.top+46,208,61);
  h.text('BlueprintName',`${({home:'家园',workshop:'工坊',library:'图书馆'} as Record<string,string>)[key]} · 等级 ${level}`,f.x+24,f.top+94,f.w*.40,40,22);
  h.text('UpgradeCosts',level>=3?'已达当前最高等级':`扩建至 ${level+1} 级\n`+Object.entries(costs).map(([id,n])=>`${itemNames[id]||id} ${h.state.inventory[id]||0}/${n}`).join(' · '),dx,f.top,dw,74,f.compact?16:18);
  h.button('upgrade-building','确认升级',dx,f.top+84,dw,44,()=>h.send('upgrade',{target:obj.id}),h.busy||level>=3||shortages(h.state,costs).length>0,true);
  if(obj.id==='workshop_counter'){
   if(!f.compact){h.image('items/plank',f.x+56,f.top+206,48,48);h.text('PlankRecipe','木板蓝图',f.x+96,f.top+172,f.w-120,34,22);h.text('PlankMaterials',`3 份木材 → 1 块木板\n手边有 ${h.state.inventory.wood||0} 份木材${(h.state.inventory.wood||0)<3?'，还需收集 '+(3-(h.state.inventory.wood||0))+' 份':'，可以开工'}`,f.x+96,f.top+210,f.w-120,56,16,C.muted);}
   h.button('craft-plank',`制作木板 · 木材 ${h.state.inventory.wood||0}/3`,f.x+24,f.y+f.h-62,(f.w-64)/3,44,()=>h.send('craft',{target:obj.id}),h.busy||shortages(h.state,plankRecipe).length>0,true);
   h.button('counter-sell',`卖萝卜 · +${8+level-1} 金币`,f.x+32+(f.w-64)/3,f.y+f.h-62,(f.w-64)/3,44,()=>h.send('sell',{target:obj.id}),h.busy||!h.state.inventory.crop);
   h.button('counter-seed','买种子 · 金币 2',f.x+40+2*(f.w-64)/3,f.y+f.h-62,(f.w-64)/3,44,()=>h.send('buy_seed',{target:obj.id}),h.busy||(h.state.inventory.gold||0)<2);
  }
 }
 private npc(h:PanelHost,f:Frame){
  const obj=h.context;if(!obj)return;
  this.tabs(h,f,obj.id==='noah'?[['talk','聊一聊'],['quests','剧情委托'],['contracts','现实约定']]:[['talk','聊一聊'],['quests','剧情委托'],...(obj.id==='mira'?[['shop','逛小铺'] as [string,string]]:[])],this.npcTab,id=>{if(id==='shop')h.go('shop');else this.npcTab=id;});
  if(this.npcTab==='quests'){this.quests(h,f,obj.id);return;}
  if(this.npcTab==='contracts'){this.contracts(h,f,true);return;}
  this.npcTab='talk';h.redraw();
 }
 private spell(h:PanelHost,f:Frame){
  const learned=!!h.state.combat?.spark_learned,magic=h.state.knowledge_growth?.magic||0;
  h.image('items/journal',f.x+f.w*.18,f.top+78,80,80);
  const dx=f.x+f.w*.34,dw=f.w*.66-24;
  h.text('SpellName','火花术',dx,f.top,dw,38,26);
  h.text('SpellDescription','12 魔法伤害 · 4 体力 · 冷却 4 秒'+(f.compact?'':'\n进入洞穴后，选择目标并按 Q 施放。'),dx,f.top+48,dw,f.compact?28:72,f.compact?16:18);
  h.text('SpellRequirements',learned?'✓ 已掌握 · 洞内选中目标，按 Q 施放':`研习需要 · 魔法 ${magic}/1 级 · 金币 ${h.state.inventory.gold||0}/8`,dx,f.top+(f.compact?84:140),dw,f.compact?52:72,16,learned?C.moss:C.muted);
  h.button('learn-spark',learned?'已经学会':'研习 · 金币 8',dx,f.y+f.h-62,(dw-12)/2,44,()=>h.send('spark_learn',{target:'spell_desk'}),h.busy||learned||magic<1||(h.state.inventory.gold||0)<8,true);
  h.button('spell-growth','查看魔法培养',dx+(dw+12)/2,f.y+f.h-62,(dw-12)/2,44,()=>{this.growth='magic';h.go('growth');},h.busy);
 }
 private cave(h:PanelHost,f:Frame){
  const c=h.state.combat,obj=h.context;if(!c||!obj)return;
  const gate=h.mode==='gate',inCave=h.state.location.startsWith('cave_'),dx=f.x+24,dw=f.w-48;
  if(!gate&&!inCave){
   const ready=!!c.equipped&&!!h.state.inventory[c.equipped],equipped=ready?c.weapons[c.equipped!]:null;
   const low=(h.state.vitality?.current??100)<40||(h.state.stamina?.current??100)<20;
   const compact=f.compact,top=f.top,footer=f.y+f.h-62;
   h.text('CaveSummary','准备进入第一层',dx,top,dw,compact?28:38,compact?20:26);
   if(!compact&&ready)h.image('items/'+c.equipped,dx+32,top+86,64,64);
   h.text('CaveEquipment',ready?'✓ 已装备 '+equipped?.name:'○ 尚未装备武器',dx+(!compact&&ready?84:0),top+(compact?30:58),dw-(!compact&&ready?84:0),compact?24:32,compact?15:20,ready?C.moss:C.danger);
   h.text('CaveVitals',`生命 ${h.state.vitality?.current}/${h.state.vitality?.max} · 体力 ${Math.floor(h.state.stamina?.current||0)}/${h.state.stamina?.max}`,dx+(!compact&&ready?84:0),top+(compact?54:98),dw-(!compact&&ready?84:0),28,compact?14:17,low?C.danger:C.muted);
   const hint=!ready?'建议先装备武器。也可以自行决定进入。':low?'生命或体力偏低，建议先回床边休整。':'先探索首层；随时可撤离，已获材料保留。';
   const note=h.text('CaveReadiness',hint,dx,top+(compact?82:154),dw,compact?36:56,compact?14:17,!ready||low?C.danger:C.ink);if(compact)note.lineHeight=18;
   if(!compact){h.text('CaveHelp','空格攻击 · 点击怪物选择目标\n看见攻击预兆，先走出金色区域。',dx,top+226,dw,68,16,C.muted);}
   const bw=(dw-12)/2;
   h.button('cave-enter','进入第一层',dx,footer,bw,44,()=>h.send('cave_interact',{target:obj.id}).then(ok=>{if(ok)h.go('world');}),h.busy,ready&&!low);
   const recover=c.boss_first&&!c.gate_open&&!(h.state.inventory.gate_stone||0);
   h.button(recover?'stone-recover':ready&&low?'cave-rest':'cave-equipment',recover?'核实并补领门钥石':ready&&low?'标记床铺休整':ready?'查看装备':'先装备武器',dx+bw+12,footer,bw,44,()=>recover?h.send('stone_recover'):ready&&low?h.mark({mapId:'home',targetId:'home_bed'},'家中床铺'):h.go('equipment'),h.busy,!ready||low);
   return;
  }
  const body=gate?(c.gate_open?'石门已永久开启，无需再次提交魔法石。\n东行的路已经通了，查看安排后再出发吧。':`门钥魔法石 ${h.state.inventory.gate_stone||0} / 1 · 魔法 ${h.state.knowledge_growth?.magic||0} / 3\n击败底层守卫并培养魔法后，走近此处嵌石。`):inCave?`第 ${c.floor} 层 · ${c.cleared?'本层已清理':'本层仍有怪物'} · 已探索至 ${c.unlocked} 层\n安全区位于左侧；可随时撤离，已有战利品保留。`:`共 5 层 · 已开放至 ${c.unlocked} 层\n当前装备：${c.equipped?itemNames[c.equipped]:'尚未装备'} · 生命 ${h.state.vitality?.current}/${h.state.vitality?.max}`;
  h.text('CaveSummary',gate?'通往苇风渡口':inCave?obj.name:'主动进入战斗区域',dx,f.top,dw,38,24);
  h.text('CaveRequirements',body,dx,f.top+46,dw,88,18);
  if(!f.compact)h.text('CaveHelp',gate?'石门开启后，可以从这里查看离村路线。\n带好路途补给；村庄里的家与成长手记仍会为你保留。':'WASD / 点击地面移动 · 点击怪物选定目标\n空格攻击 · Q 火花术 · R 菜汤\n打开面板、切换到现实成长或离开窗口，会停止发送战斗输入。',dx,f.top+150,dw,110,17,C.muted);
  if(gate){
   h.button('open-gate',c.gate_open?'石门已开启':'确认嵌入魔法石',dx,f.y+f.h-62,Math.min(300,dw/2-8),44,()=>h.send('gate_open'),h.busy||c.gate_open||!c.boss_first||(h.state.inventory.gate_stone||0)<1||(h.state.knowledge_growth?.magic||0)<3,true);
   h.button('gate-travel','查看离村安排',dx+Math.min(312,dw/2),f.y+f.h-62,Math.min(300,dw/2-8),44,()=>h.go('travel'),h.busy||!c.gate_open);return;
  }
  let reason='';if(obj.id==='cave_down'&&!c.cleared)reason='先清理本层';if(obj.id==='cave_rope'&&c.unlocked<4)reason='通路尚未打通';if(obj.id==='cave_deep'&&c.unlocked<5)reason='通路尚未打通';
  h.button('cave-enter',reason||(!inCave?'进入第一层':obj.id==='cave_exit'?'离开山洞':obj.name),dx,f.y+f.h-62,Math.min(360,dw/2-8),44,()=>h.send('cave_interact',{target:obj.id}).then(ok=>{if(ok)h.go('world');}),h.busy||!!reason,true);
  const recover=!inCave&&c.boss_first&&!c.gate_open&&!(h.state.inventory.gate_stone||0);
  h.button(inCave?'cave-retreat':recover?'stone-recover':'cave-equipment',inCave?'安全撤离':recover?'核实并补领门钥石':'查看装备',dx+Math.min(372,dw/2),f.y+f.h-62,Math.min(300,dw/2-8),44,()=>inCave?h.send('cave_retreat').then(ok=>{if(ok)h.go('world');}):recover?h.send('stone_recover'):h.go('equipment'),h.busy);
 }
 private markNoah(h:PanelHost){const r=residentPositions(h.world,h.state,h.now).find(r=>r.id==='noah');if(r)h.mark({mapId:r.location!,targetId:r.id},r.name);}
 private contracts(h:PanelHost,f:Frame,atNoah:boolean){
  const journal=h.state.life_journal;if(!journal)return;const active=journal.tasks.find(t=>t.status==='active');
  h.text('ContractQuota',`今日成长 ${journal.claimed}/${journal.limit} · 预留 ${journal.reserved} · 可领取 ${journal.remaining}`,f.x+24,f.top,f.w-48,30,18,C.muted);
  if(active){
   const ready=active.ready_at<=h.now;
   h.text('ContractTitle',`${active.hours} 小时${lifeNames[active.kind]} · ${ready?'已到约定时间':timeText(active.ready_at-h.now)+' 后可结算'}`,f.x+24,f.top+40,f.w-48,42,24);
   if(!f.compact)h.text('ContractSource','按现实经过时间结算 · 未核验行为。结算需走近诺亚。',f.x+24,f.top+90,f.w-48,40,16,C.muted);
   const width=(f.w-64)/3;
   h.button('claim-life',atNoah?'确认结算':'标记诺亚位置',f.x+24,f.y+f.h-62,width,44,()=>atNoah?h.send('life_claim',{target:'noah',task_id:active.id}):this.markNoah(h),h.busy||(atNoah&&!ready),true);
   h.button('cancel-life',this.confirm===active.id?'确认取消（不发点数）':'取消这份约定',f.x+32+width,f.y+f.h-62,width,44,()=>{if(this.confirm===active.id)void h.send('life_cancel',{task_id:active.id}).then(ok=>{if(!ok)return;this.confirm='';h.redraw();});else{this.confirm=active.id;h.redraw();}},h.busy);
   h.button('life-growth','查看培养',f.x+40+width*2,f.y+f.h-62,width,44,()=>h.go('growth'),h.busy);return;
  }
  if(!atNoah){h.text('ContractEmpty','当前没有进行中的现实约定。\n走近诺亚，可以领取学习、运动或工作委托。',f.x+24,f.top+46,f.w-48,90,20);h.button('life-mark-noah','标记诺亚位置',f.x+24,f.y+f.h-62,f.w-48,44,()=>this.markNoah(h),h.busy,true);return;}
  const width=(f.w-64)/3;
  if(!f.compact)(Object.entries(lifeNames) as ['study'|'exercise'|'work',string][]).forEach(([id,name],i)=>h.button('contract-'+id,name,f.x+24+i*(width+8),f.top+42,width,44,()=>{this.lifeKind=id;h.redraw();},h.busy,this.lifeKind===id));
  const yy=f.top+(f.compact?42:100);
  if(f.compact)h.button('contract-kind',lifeNames[this.lifeKind]+' · 点击更换',f.x+24,yy,210,44,()=>{this.lifeKind=({study:'exercise',exercise:'work',work:'study'} as const)[this.lifeKind];h.redraw();},h.busy);
  h.button('hours-less','−',f.x+(f.compact?246:24),yy,52,44,()=>{this.hours=Math.max(1,this.hours-1);h.redraw();},h.busy||this.hours<=1);
  h.text('ContractHours',`${this.hours} 小时 → ${this.hours} 点${{study:'知识',exercise:'健康',work:'技能'}[this.lifeKind]}成长`,f.x+(f.compact?304:92),yy,f.w-(f.compact?396:208),44,18);
  h.button('hours-more','＋',f.x+f.w-76,yy,52,44,()=>{this.hours=Math.min(5,journal.remaining,this.hours+1);h.redraw();},h.busy||this.hours>=journal.remaining);
  h.button('accept-life','确认这份现实约定',f.x+24,f.y+f.h-62,f.w-48,44,()=>h.send('life_accept',{target:'noah',task_id:entityId(h.uuid()),kind:this.lifeKind,hours:this.hours}),h.busy||journal.remaining<this.hours,true);
 }
}
