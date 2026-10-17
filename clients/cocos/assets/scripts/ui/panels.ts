import type {GameState,World,WorldObject,NavigationTarget,GrowthTarget,Quest} from '../core/protocol';
import {C} from './theme';
import {itemNames,growthNames,questStatuses,costText,shortages,growthCommand,timerSeconds,timeText,entityId,plankRecipe,upgradeCosts} from '../core/features';
import {questTarget,currentMap,mapById} from '../core/navigation';
import {residentPositions,residentPlace} from '../core/residents';

export interface PanelHost {
 readonly state:GameState; readonly world:World; readonly context:WorldObject|null;
 readonly mode:string;readonly width:number;readonly height:number;readonly busy:boolean;readonly error:string;readonly notice:string;readonly now:number;
 box(id:string,x:number,y:number,w:number,h:number,color:string,radius?:number):void;
 text(id:string,value:string,x:number,y:number,w:number,h:number,size?:number,color?:string,center?:boolean):void;
 button(id:string,label:string,x:number,y:number,w:number,h:number,action:()=>unknown,disabled?:boolean,primary?:boolean):void;
 image(path:string,x:number,y:number,w:number,h:number):void;
 person(name:string,x:number,y:number,w:number,h:number):void;
 field(id:string,label:string,value:string,x:number,y:number,w:number,change:(value:string)=>void,numeric?:boolean,maxLength?:number):void;
 send(action:string,data?:Record<string,unknown>):Promise<boolean>;
 go(mode:string,replace?:boolean):void; close():void; redraw():void; mark(target:NavigationTarget,label:string):void; uuid():string;
}
type Frame={x:number;y:number;w:number;h:number;compact:boolean;top:number;bottom:number};
const lifeNames={study:'学习',exercise:'运动',work:'工作'};
export class FeaturePanels {
 lifeTab='study'; npcTab='talk'; page=0; detailPage=0;
 questId=''; weaponId='stone_sword'; growth:GrowthTarget='magic'; taskId=''; planId='';
 title=''; minutes='25'; amount='1'; note=''; activityKind='study'; orderId=''; tradeItem='seed'; tradeSide='buy';
 lifeKind:'study'|'exercise'|'work'='study';hours=1; confirm='';shopTab='trade';gearTab='obtain';
 private modes=['menu','journal','quests','shop','building','dialogue','life','growth','equipment','armory','spellbook','cave','gate','map','study-new','study-edit','plan-new','plan-edit'];
 handles(mode:string){return this.modes.includes(mode);}
 reset(){this.page=0;this.detailPage=0;this.confirm='';}
 snapshot(){return {lifeTab:this.lifeTab,npcTab:this.npcTab,questId:this.questId,weaponId:this.weaponId,growth:this.growth,taskId:this.taskId,planId:this.planId,page:this.page,detailPage:this.detailPage};}
 draw(h:PanelHost){
  const titles:Record<string,string>={menu:'旅程随身页',journal:'旅途委托',quests:h.context?.name||'村庄告示板',shop:'风铃杂货铺',building:h.context?.name||'工坊蓝图',dialogue:h.context?.name||'村民对话',life:'现实成长',growth:'旅人成长',equipment:'随行装备',armory:'工坊武备台',spellbook:'火花术研习',cave:'石根山洞',gate:'村东石门',map:'旅途地图','study-new':'写下今日研习','study-edit':'修改研习书页','plan-new':'装订长期计划','plan-edit':'修改长期计划'};
  const ideal=h.mode.startsWith('study-')||h.mode.startsWith('plan-')?400:({menu:480,shop:520,building:480,growth:560,equipment:520,armory:520,spellbook:480,cave:480,gate:480,map:500,life:560} as Record<string,number>)[h.mode]||620;
  const w=Math.min(1040,h.width-32),height=Math.min(ideal,h.height-24);
  const f:Frame={x:(h.width-w)/2,y:(h.height-height)/2,w,h:height,compact:height<460,top:(h.height-height)/2+80,bottom:(h.height+height)/2-114};
  h.box('FeaturePaper',f.x,f.y,w,height,C.paper,16);
  h.text('FeatureTitle',titles[h.mode]||'旅程',f.x+24,f.y+12,w-160,42,24);
  h.button('close','返回',f.x+w-100,f.y+12,76,44,()=>h.close(),h.busy);
  const money=`金币 ${h.state.inventory.gold||0}`;
  if(['shop','building','armory','equipment','spellbook'].includes(h.mode))h.text('FeatureBalance',money,f.x+w-280,f.y+20,160,28,16,C.muted);
  if(h.mode==='menu')this.menu(h,f);
  else if(h.mode==='journal'||h.mode==='quests')this.quests(h,f,h.mode==='quests'?h.context?.id:undefined);
  else if(h.mode==='shop')this.shop(h,f);
  else if(h.mode==='building')this.building(h,f);
  else if(h.mode==='dialogue')this.npc(h,f);
  else if(h.mode==='growth')this.growthView(h,f);
  else if(h.mode==='armory'||h.mode==='equipment')this.gear(h,f);
  else if(h.mode==='spellbook')this.spell(h,f);
  else if(h.mode==='cave'||h.mode==='gate')this.cave(h,f);
  else if(h.mode==='map')this.map(h,f);
  else if(h.mode.startsWith('study-')||h.mode.startsWith('plan-'))this.studyForm(h,f);
  else this.life(h,f);
  if(h.error||h.notice&&!(h.mode==='dialogue'&&this.npcTab==='talk'))h.text('FeatureFeedback',h.error||h.notice,f.x+24,f.y+f.h-108,f.w-48,42,15,h.error?C.danger:C.muted);
 }
 private tabs(h:PanelHost,f:Frame,entries:[string,string][],selected:string,change:(id:string)=>void){const width=(f.w-48)/entries.length;
  entries.forEach(([id,label],i)=>h.button('tab-'+id,label,f.x+24+i*width,f.y+68,width-8,44,()=>{change(id);this.page=0;this.confirm='';h.redraw();},h.busy,selected===id));
  f.top=f.y+126;
 }
 private list(h:PanelHost,f:Frame,entries:{id:string;label:string}[],selected:string,choose:(id:string)=>void,width:number){
  const per=Math.max(1,Math.floor((f.bottom-f.top-36)/52)),pages=Math.max(1,Math.ceil(entries.length/per));this.page=Math.min(this.page,pages-1);
  entries.slice(this.page*per,(this.page+1)*per).forEach((e,i)=>h.button('select-'+e.id,e.label,f.x+24,f.top+i*52,width,44,()=>{choose(e.id);this.detailPage=0;this.confirm='';h.redraw();},h.busy,selected===e.id));
  if(!entries.length)h.text('EmptyList','这里还没有记录',f.x+24,f.top,width,48,16,C.muted);
  if(pages>1)h.button('list-next',`${this.page+1}/${pages} · 下一页`,f.x+24,f.bottom-36,width,36,()=>{this.page=(this.page+1)%pages;h.redraw();},h.busy);
 }
 private menu(h:PanelHost,f:Frame){const entries=[['journal','旅途委托'],['map','地图与村民'],['growth','培养能力'],['equipment','随行装备'],['life','现实成长'],['session','旅程凭证']];
  const columns=3,ww=(f.w-64)/columns;
  entries.forEach(([mode,label],i)=>h.button('menu-'+mode,label,f.x+24+(i%columns)*(ww+8),f.top+Math.floor(i/columns)*64,ww,52,()=>h.go(mode),h.busy));
  h.text('MenuHint','WASD 移动 · E 交互 · I 行囊 · L 成长 · J 委托 · M 地图',f.x+24,f.y+f.h-156,f.w-48,40,16,C.muted);
 }
 private quests(h:PanelHost,f:Frame,giver?:string){
  const entries=h.state.quest_log.filter(q=>!giver||q.giver===giver),q=entries.find(q=>q.id===this.questId)||entries.find(q=>['ready','active','available'].includes(q.status))||entries[0];
  if(!q){h.text('NoQuests','这里暂时没有剧情委托。',f.x+24,f.top,f.w-48,60);return;}this.questId=q.id;
  const lw=Math.round(f.w*.30),dx=f.x+lw+48,dw=f.w-lw-72;
  h.box('NoticeTimber',f.x+16,f.top-8,lw+16,f.bottom-f.top+18,C.wood,8);
  this.list(h,f,entries.map(q=>({id:q.id,label:`${questStatuses[q.status]} · ${q.title}`})),q.id,id=>this.questId=id,lw);
  h.text('QuestName',q.title,dx,f.top,dw,36,22);
  if(!f.compact)h.text('QuestDescription',q.description,dx,f.top+42,dw,64,16,C.muted);
  const start=f.top+(f.compact?42:116),per=f.compact?1:Math.max(2,Math.floor((f.bottom-start-62)/26)),pages=Math.max(1,Math.ceil(q.objectives.length/per));this.detailPage%=pages;
  q.objectives.slice(this.detailPage*per,(this.detailPage+1)*per).forEach((text,i)=>{const n=this.detailPage*per+i;h.text('Objective-'+n,`${q.checks[n]?'✓':'○'} ${text}`,dx,start+i*26,dw,26,15,q.checks[n]?C.moss:C.ink);});
  h.text('QuestReward','回礼 · '+costText(q.reward)+` · ${q.xp} EXP`,dx,f.bottom-30,dw,28,14,C.muted);
  if(pages>1)h.button('objectives-next',`目标 ${this.detailPage+1}/${pages}`,dx,f.bottom-68,160,36,()=>{this.detailPage=(this.detailPage+1)%pages;h.redraw();});
  const giverObject=currentMap(h.world,h.state,h.now).objects.find(o=>o.id===q.giver),near=!!giverObject&&Math.hypot(giverObject.x-h.state.position.x,giverObject.y-h.state.position.y)<=72;
  const action=q.status==='available'?'quest_accept':q.status==='ready'?'quest_claim':q.status==='active'?'track_quest':null;
  h.button('quest-action',q.status==='available'?'接取委托':q.status==='ready'?'交付并领取回礼':q.status==='active'?'追踪此委托':questStatuses[q.status],dx,f.y+f.h-62,220,44,()=>action&&h.send(action,{quest_id:q.id}),h.busy||!action||(action!=='track_quest'&&!near),true);
  const target=questTarget(q,h.state);h.button('quest-mark',near?'标记下一目标':'标记目标 / 委托人',dx+232,f.y+f.h-62,Math.max(160,dw-232),44,()=>target&&h.mark(target,q.title),!target||h.busy);
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
  h.text('TradeItem',f.compact?`${itemNames[this.tradeItem]} · 单价 ${price} · 持有 ${h.state.inventory[this.tradeItem]||0}`:itemNames[this.tradeItem]||this.tradeItem,dx,f.top,dw,34,f.compact?18:22);
  if(!f.compact)h.text('TradePrice',`单价 ${price} 金币 · 持有 ${h.state.inventory[this.tradeItem]||0}`,dx,f.top+36,dw,28,16,C.muted);
  h.field('trade-amount','数量（1–99）',this.amount,dx,f.top+(f.compact?36:72),150,v=>this.amount=v,true,2);
  h.text('TradeTotal',`${this.tradeSide==='buy'?'支付':'获得'} ${Number.isInteger(amount)?cost:'—'} 金币`,dx+170,f.top+(f.compact?58:94),dw-170,44,18);
  h.button('trade-confirm',`确认${this.tradeSide==='buy'?'买入':'卖出'}`,dx,f.y+f.h-62,dw,44,()=>h.send('market_trade',{target,side:this.tradeSide,item:this.tradeItem,amount:Number(this.amount)}),h.busy,true);
 }
 private building(h:PanelHost,f:Frame){
  const obj=h.context;if(!obj)return;const key=obj.building||'workshop',level=h.state.buildings[key]||1,costs=upgradeCosts(level),dx=f.x+f.w*.44,dw=f.w*.56-24;
  h.image('interiors/workbench',f.x+f.w*.22,f.top+46,208,61);
  h.text('BlueprintName',`${({home:'家园',workshop:'工坊',library:'图书馆'} as Record<string,string>)[key]} · 等级 ${level}`,f.x+24,f.top+94,f.w*.40,40,22);
  h.text('UpgradeCosts',level>=3?'已达当前最高等级':`升级至 ${level+1} 级
${costText(costs)}`,dx,f.top,dw,74,18);
  h.button('upgrade-building','确认升级',dx,f.top+84,dw,44,()=>h.send('upgrade',{target:obj.id}),h.busy||level>=3||shortages(h.state,costs).length>0,true);
  if(obj.id==='workshop_counter'){
   if(!f.compact)h.text('PlankRecipe','木板蓝图 · 3 木材 → 1 木板',f.x+24,f.top+166,f.w-48,40,20);
   h.button('craft-plank','制作木板 · 木材 3',f.x+24,f.y+f.h-62,(f.w-64)/3,44,()=>h.send('craft',{target:obj.id}),h.busy||shortages(h.state,plankRecipe).length>0,true);
   h.button('counter-sell',`卖萝卜 · +${8+level-1} 金币`,f.x+32+(f.w-64)/3,f.y+f.h-62,(f.w-64)/3,44,()=>h.send('sell',{target:obj.id}),h.busy||!h.state.inventory.crop);
   h.button('counter-seed','买种子 · 金币 2',f.x+40+2*(f.w-64)/3,f.y+f.h-62,(f.w-64)/3,44,()=>h.send('buy_seed',{target:obj.id}),h.busy||(h.state.inventory.gold||0)<2);
  }
 }
 private npc(h:PanelHost,f:Frame){
  const obj=h.context;if(!obj)return;
  this.tabs(h,f,obj.id==='noah'?[['talk','聊一聊'],['quests','剧情委托'],['contracts','现实约定']]:[['talk','聊一聊'],['quests','剧情委托'],...(obj.id==='mira'?[['shop','逛小铺'] as [string,string]]:[])],this.npcTab,id=>{if(id==='shop')h.go('shop');else this.npcTab=id;});
  if(this.npcTab==='quests'){this.quests(h,f,obj.id);return;}
  if(this.npcTab==='contracts'){this.contracts(h,f,true);return;}
  const social=h.state.npc_social?.[obj.id],resident=h.world.residents?.find(r=>r.id===obj.id),dx=f.x+f.w*.31,dw=f.w*.69-24;
  h.person(obj.id+'-actor',f.x+f.w*.16,f.top+(f.compact?42:70),f.compact?48:72,f.compact?64:96);
  h.text('ResidentRole',resident?.role||'村庄居民',f.x+24,f.top+(f.compact?78:160),f.w*.27,32,16,C.muted,true);
  h.text('ResidentWords',h.notice||'很高兴在村里见到你。',dx,f.top,dw,f.compact?82:138,19);
  h.text('DialogueSource','预设剧情 · 非 AI 对话',dx,f.top+(f.compact?78:144),dw,22,14,C.muted);
  if(!f.compact){
   h.button('npc-interest','兴趣与近况',dx,f.top+190,(dw-12)/2,44,()=>h.send('npc_topic',{target:obj.id,topic:'interest'}),h.busy);
   h.button('npc-memory','聊聊往事',dx+(dw+12)/2,f.top+190,(dw-12)/2,44,()=>h.send('npc_topic',{target:obj.id,topic:'memory'}),h.busy||(h.state.relationships[obj.id]||0)<5);
  }
  const favorite=resident?.favorite||'crop',canGift=(h.state.inventory[favorite]||0)>0&&!social?.gifted;
  h.button('npc-gift',`送 ${itemNames[favorite]||favorite} 1 份`,dx,f.y+f.h-62,(dw-12)/2,44,()=>h.send('npc_gift',{target:obj.id,item:favorite}),h.busy||!canGift);
  h.button('npc-help','搭把手 · 4 体力',dx+(dw+12)/2,f.y+f.h-62,(dw-12)/2,44,()=>h.send('npc_help',{target:obj.id}),h.busy||!!social?.helped||(h.state.stamina?.current||0)<4,true);
 }
 private growthView(h:PanelHost,f:Frame){
  const ids=Object.keys(growthNames) as GrowthTarget[],lw=Math.floor(f.w*.28),dx=f.x+lw+48,dw=f.w-lw-72;
  this.list(h,f,ids.map(id=>({id,label:`${growthNames[id]} · ${h.state.character_growth_options?.[id]?.current??0}`})),this.growth,id=>this.growth=id as GrowthTarget,lw);
  const quote=h.state.character_growth_options?.[this.growth];if(!quote)return;const command=growthCommand(h.state,this.growth),currency={health_points:'健康点',knowledge_points:'知识点',skill_points:'技能点'}[quote.currency];
  h.text('GrowthName',growthNames[this.growth],dx,f.top,dw,36,24);
  h.text('GrowthLevels',`${quote.current} → ${quote.next}`,dx,f.top+42,dw,42,28);
  h.text('GrowthCost',`持有 ${h.state[quote.currency]||0} ${currency} · 本次消耗 ${quote.cost}`,dx,f.top+96,dw,36,17,C.muted);
  if(!f.compact)h.text('GrowthSource','点数来自诺亚的现实委托。手动记录与研习计时不直接发放这些点数。\n只有确认培养才会消耗；服务器会检查最新等级。',dx,f.top+148,dw,90,17,C.muted);
  h.button('growth-spend',command.shortfall?`还差 ${command.shortfall} ${currency}`:'确认培养',dx,f.y+f.h-62,(dw-12)/2,44,()=>h.send(command.action,command.data),h.busy||command.shortfall>0,true);
  h.button('growth-noah','标记诺亚',dx+(dw+12)/2,f.y+f.h-62,(dw-12)/2,44,()=>this.markNoah(h),h.busy);
 }
 private gear(h:PanelHost,f:Frame){
  if(h.mode==='armory')this.tabs(h,f,[['obtain','购买与打造'],['sell','出售武器']],this.gearTab,id=>this.gearTab=id);
  const weapons=h.state.combat?.weapons||{},ids=Object.keys(weapons),lw=Math.floor(f.w*.31),dx=f.x+lw+48,dw=f.w-lw-72;
  if(h.mode==='equipment'&&!weapons[this.weaponId])this.weaponId=ids.find(id=>h.state.inventory[id]>0)||ids[0];
  if(this.weaponId!=='soup'&&!weapons[this.weaponId])this.weaponId=ids[0];const weapon=weapons[this.weaponId]||weapons[ids[0]];if(!weapon)return;
  this.list(h,f,[...ids.map(id=>({id,label:`${weapons[id].name} · 持有 ${h.state.inventory[id]||0}`})),...(h.mode==='armory'?[{id:'soup',label:`便携菜汤 · 持有 ${h.state.inventory.soup||0}`}]:[])],this.weaponId,id=>this.weaponId=id,lw);
  const soup=this.weaponId==='soup',owned=h.state.inventory[this.weaponId]||0;
  h.text('WeaponName',soup?'便携菜汤':weapon.name,dx,f.top,dw,38,24);
  h.text('WeaponStats',soup?'生命 +20 · 体力 +15\n洞内原地饮用；可被打断。':`${weapon.damage} ${weapon.magic?'魔法':'物理'}伤害 · 距离 ${weapon.reach}\n每次 ${weapon.stamina} 体力 · 间隔 ${weapon.interval} 秒`,dx,f.top+(f.compact?32:44),dw,f.compact?54:70,f.compact?16:18);
  const equipped=h.state.combat?.equipped;
  if(h.mode==='equipment'){
   h.text('EquippedState',equipped===this.weaponId?'当前已装备':`当前装备：${equipped?itemNames[equipped]:'尚未装备'}`,dx,f.top+122,dw,38,16,C.muted);
   h.button('equip-weapon',equipped===this.weaponId?'已装备':'装备此武器',dx,f.y+f.h-62,dw,44,()=>h.send('gear_equip',{item:this.weaponId}),h.busy||!owned||equipped===this.weaponId,true);return;
  }
  if(this.gearTab==='sell'){
   const price=Math.floor(weapon.price/4),lastEquipped=equipped===this.weaponId&&owned===1;
   h.text('WeaponSell',soup?'菜汤留作洞内恢复。':f.compact?`回款 ${price} 金币${lastEquipped?' · 最后一件售出后卸下':''}`:`出售一件可获得 ${price} 金币。${lastEquipped?'\n这是当前装备的最后一件，出售后将卸下。':''}`,dx,f.top+(f.compact?86:122),dw,f.compact?30:76,17,C.muted);
   h.button('sell-gear',this.confirm===this.weaponId?'确认出售这一件':`出售一件 · +${price} 金币`,dx,f.y+f.h-62,dw,44,()=>{if(this.confirm===this.weaponId)void h.send('gear_sell',{target:'armory_counter',item:this.weaponId}).then(ok=>{if(ok){this.confirm='';h.redraw();}});else{this.confirm=this.weaponId;h.redraw();}},h.busy||soup||owned<1,true);return;
  }
  const price=soup?8:weapon.price;
  if(f.compact&&!soup)h.text('CraftShortfall',weapon.craft_reasons[0]||'蓝图条件已满足',dx,f.top+86,dw,26,14,C.muted);
  if(!f.compact)h.text('CraftRequirements',soup?'购买后放入行囊，按 R 或恢复按钮饮用。':`打造材料 · ${costText(weapon.costs)}\n${weapon.craft_reasons.join('；')||'材料与能力已满足，可制作。'}`,dx,f.top+132,dw,100,16,C.muted);
  h.button('buy-gear',`购买 · ${price} 金币`,dx,f.y+f.h-62,(dw-12)/2,44,()=>h.send('gear_buy',{target:'armory_counter',item:this.weaponId}),h.busy||(h.state.inventory.gold||0)<price,true);
  h.button(soup?'gear-equipment':'craft-gear',soup?'查看装备':'按蓝图打造',dx+(dw+12)/2,f.y+f.h-62,(dw-12)/2,44,()=>soup?h.go('equipment'):h.send('gear_craft',{target:'armory_counter',item:this.weaponId}),h.busy||(!soup&&weapon.craft_reasons.length>0));
 }
 private spell(h:PanelHost,f:Frame){
  const learned=!!h.state.combat?.spark_learned,magic=h.state.knowledge_growth?.magic||0;
  h.image('interiors/book',f.x+f.w*.18,f.top+72,128,78);
  const dx=f.x+f.w*.34,dw=f.w*.66-24;
  h.text('SpellName','火花术',dx,f.top,dw,38,26);
  h.text('SpellDescription','12 魔法伤害 · 4 体力 · 冷却 4 秒\n进入洞穴后，选择目标并按 Q 施放。',dx,f.top+48,dw,72,18);
  if(!f.compact)h.text('SpellRequirements',`研习需要：魔法 1 级、金币 8\n当前魔法 ${magic} 级 · ${learned?'已经学会':'尚未学会'}`,dx,f.top+140,dw,72,18,C.muted);
  h.button('learn-spark',learned?'已经学会':'研习 · 金币 8',dx,f.y+f.h-62,(dw-12)/2,44,()=>h.send('spark_learn',{target:'spell_desk'}),h.busy||learned||magic<1||(h.state.inventory.gold||0)<8,true);
  h.button('spell-growth','查看魔法培养',dx+(dw+12)/2,f.y+f.h-62,(dw-12)/2,44,()=>{this.growth='magic';h.go('growth');},h.busy);
 }
 private cave(h:PanelHost,f:Frame){
  const c=h.state.combat,obj=h.context;if(!c||!obj)return;
  const gate=h.mode==='gate',inCave=h.state.location.startsWith('cave_'),dx=f.x+24,dw=f.w-48;
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
 private map(h:PanelHost,f:Frame){
  const places=[h.world,...Object.values(h.world.interiors),...Object.values(h.world.areas||{})].filter(m=>!m.id.startsWith('cave_'));
  const entries=residentPositions(h.world,h.state,h.now),lw=Math.floor(f.w*.35),dx=f.x+lw+48,dw=f.w-lw-72;
  this.list(h,f,entries.map(r=>({id:r.id,label:`${r.name} · ${residentPlace(h.world,r.location!)}`})),this.taskId,id=>this.taskId=id,lw);
  const resident=entries.find(r=>r.id===this.taskId)||entries[0];
  h.text('MapPlace',`${mapById(h.world,h.state.location)?.name||h.state.location}\n${places.length} 处村庄与旅途地点`,dx,f.top,dw,70,22);
  if(resident){h.text('MapResident',`${resident.name} · ${residentPlace(h.world,resident.location!)}\n${resident.activity||'在这里等候旅人'}`,dx,f.top+84,dw,f.compact?60:70,18,C.muted);h.button('map-mark-resident','标记此人所在位置',dx,f.y+f.h-62,dw,44,()=>h.mark({mapId:resident.location!,targetId:resident.id},resident.name),h.busy,true);}
 }
 private life(h:PanelHost,f:Frame){
  this.tabs(h,f,[['study','今日研习'],['plans','长期计划'],['record','手动记录'],['contracts','现实约定'],['history','成长历史']],this.lifeTab,id=>this.lifeTab=id);
  if(this.lifeTab==='record'){this.manual(h,f);return;}if(this.lifeTab==='contracts'){this.contracts(h,f,false);return;}if(this.lifeTab==='history'){this.history(h,f);return;}
  const plans=this.lifeTab==='plans',list=plans?(h.state.study_plan_log||[]):(h.state.study_task_log||[]),lw=Math.floor(f.w*.32),dx=f.x+lw+48,dw=f.w-lw-72;
  let selected=list.find(t=>t.id===(plans?this.planId:this.taskId))||list.find(t=>!t.archived_at)||list[0];
  if(selected){if(plans)this.planId=selected.id;else this.taskId=selected.id;}
  this.list(h,f,list.map(t=>({id:t.id,label:`${t.archived_at?'已归档 · ':''}${t.title}`})),selected?.id||'',id=>{if(plans)this.planId=id;else this.taskId=id;},lw);
  if(!selected){
   h.text('StudyEmpty',plans?'留下一本长期计划':'今天想学点什么？',dx,f.top,dw,40,24);
   h.text('StudyEmptyHint',f.compact?'写下主题和目标时长，再按自己的节奏计时。':'主题与时长由你决定，记录和计时都会保存到服务器。',dx,f.top+46,dw,f.compact?40:68,17,C.muted);
   h.button('study-create',plans?'新建长期计划':'写下研习主题',dx,f.y+f.h-62,dw,44,()=>{this.title='';this.minutes='25';h.go(plans?'plan-new':'study-new');},h.busy,true);return;
  }
  h.text('StudyTitle',selected.title,dx,f.top,dw,f.compact?30:38,22);
  if(plans){
   const p=h.state.study_plan_log!.find(p=>p.id===selected!.id)!;
   h.text('PlanGoal',`每天 ${p.daily_minutes} 分钟 · ${p.archived_at?'已归档':'进行中'}`,dx,f.top+44,dw,32,17,C.muted);
   if(!f.compact){h.button('plan-edit','修改计划',dx,f.top+106,(dw-12)/2,44,()=>{this.title=p.title;this.minutes=String(p.daily_minutes);h.go('plan-edit');},h.busy||!!p.archived_at);h.button('plan-archive',p.archived_at?'放回书架':'归档计划',dx+(dw+12)/2,f.top+106,(dw-12)/2,44,()=>h.send('study_plan_archive',{plan_id:p.id,archived:!p.archived_at}),h.busy);}
   h.button('plan-today',p.archived_at?'取回此计划':'翻开今天一页',dx,f.y+f.h-62,(dw-12)/2,44,()=>p.archived_at?h.send('study_plan_archive',{plan_id:p.id,archived:false}):h.send('study_plan_today',{plan_id:p.id}).then(ok=>{if(!ok)return;this.lifeTab='study';this.taskId=h.state.study_task_log?.find(t=>t.plan_id===p.id&&t.date===h.state.life_journal?.date)?.id||'';h.redraw();}),h.busy,true);
   h.button('plan-new','新增计划',dx+(dw+12)/2,f.y+f.h-62,(dw-12)/2,44,()=>{this.title='';this.minutes='25';h.go('plan-new');},h.busy);return;
  }
  const task=h.state.study_task_log!.find(t=>t.id===selected!.id)!,timer=h.state.timer,own=timer?.study_task_id===task.id;
  h.text('StudyProgress',`${task.minutes} / ${task.target_minutes} 分钟 · ${task.date}`,dx,f.top+(f.compact?34:42),dw,26,16,C.muted);
  const timerLabel=timer?`${own?'本页':'另一项'}计时 ${timeText(timerSeconds(h.state,h.now))} · ${timer.running?'进行中':'已暂停'}`:task.completed_at?'这一页已经完成':'计时尚未开始';
  h.text('TimerLabel',timerLabel,dx,f.top+(f.compact?66:80),dw,f.compact?32:40,f.compact?20:28,C.moss);
  if(!f.compact){
   h.text('StudyProvenance','计时记录经过的时间，不能证明学习行为。知识点需通过诺亚的现实委托领取。',dx,f.top+136,dw,64,16,C.muted);
   h.button('study-edit','修改书页',dx,f.top+218,(dw-12)/2,44,()=>{this.title=task.title;this.minutes=String(task.target_minutes);h.go('study-edit');},h.busy||!!task.completed_at||own);
   h.button('study-archive',task.archived_at?'取回书页':'归档书页',dx+(dw+12)/2,f.top+218,(dw-12)/2,44,()=>h.send('study_archive',{task_id:task.id,archived:!task.archived_at}),h.busy||own);
  }
  const bw=(dw-16)/3;
  h.button('timer-toggle',timer?(timer.running?'暂停计时':'继续计时'):'开始计时',dx,f.y+f.h-62,bw,44,()=>h.send(timer?(timer.running?'timer_pause':'timer_resume'):'timer_start',timer?{timer_id:timer.id}:{task_id:task.id}),h.busy||(!timer&&(!!task.completed_at||!!task.archived_at)),true);
  h.button('timer-finish','结束并记录',dx+bw+8,f.y+f.h-62,bw,44,()=>h.send('timer_finish',{timer_id:timer?.id}),h.busy||!timer);
  h.button('study-new','新增研习',dx+2*(bw+8),f.y+f.h-62,bw,44,()=>{this.title='';this.minutes='25';h.go('study-new');},h.busy);
 }
 private studyForm(h:PanelHost,f:Frame){
  const plan=h.mode.startsWith('plan-'),edit=h.mode.endsWith('-edit'),titleWidth=Math.floor((f.w-72)*.7);
  h.field('study-title',plan?'计划名称':'研习主题',this.title,f.x+24,f.top,titleWidth,v=>this.title=v,false,80);
  h.field('study-minutes',plan?'每日分钟（1–120）':'目标分钟（1–120）',this.minutes,f.x+titleWidth+48,f.top,f.w-titleWidth-72,v=>this.minutes=v,true,3);
  h.text('StudyFormHint',plan?'长期计划可以每天翻开一页，历史记录保持独立。':'按自己的节奏完成；暂停与切换模式不会丢失服务器计时。',f.x+24,f.top+82,f.w-48,54,17,C.muted);
  h.button('save-study',edit?'保存修改':plan?'装订计划':'写下这一页',f.x+24,f.y+f.h-62,f.w-48,44,()=>h.send(plan?(edit?'study_plan_edit':'study_plan_create'):(edit?'study_edit':'study_create'),{[plan?'plan_id':'task_id']:edit?(plan?this.planId:this.taskId):entityId(h.uuid()),title:this.title.trim(),[plan?'daily_minutes':'target_minutes']:Number(this.minutes)}).then(ok=>{if(!ok)return;this.lifeTab=plan?'plans':'study';if(!edit){const entries=plan?h.state.study_plan_log:h.state.study_task_log;const id=entries?.find(t=>t.title===this.title.trim())?.id;if(plan)this.planId=id||'';else this.taskId=id||'';}h.go('life',true);}),h.busy,true);
 }
 private manual(h:PanelHost,f:Frame){
  const kinds=[['study','学习分钟'],['exercise','运动分钟'],['creative','创作分钟'],['steps','步数'],['management','日常管理']];
  const name=kinds.find(([id])=>id===this.activityKind)?.[1]||'学习分钟',amountX=f.x+202,noteX=f.x+342;
  h.text('ActivityKindLabel','记录类型',f.x+24,f.top,164,22,14,C.muted);
  h.button('activity-kind',name,f.x+24,f.top+24,160,44,()=>{const i=kinds.findIndex(([id])=>id===this.activityKind);this.activityKind=kinds[(i+1)%kinds.length][0];this.amount='1';h.redraw();},h.busy);
  h.field('activity-amount','数量',this.amount,amountX,f.top,120,v=>this.amount=v,true,6);
  h.field('activity-note','备注（选填）',this.note,noteX,f.top,f.w-(noteX-f.x)-24,v=>this.note=v,false,160);
  h.text('ManualProvenance','手动记录 · 未核验。不会直接发放知识、健康或技能点。',f.x+24,f.top+(f.compact?72:82),f.w-48,f.compact?30:48,16,C.muted);
  h.button('save-activity','保存这条手动记录',f.x+24,f.y+f.h-62,f.w-48,44,()=>h.send('activity',{kind:this.activityKind,amount:Number(this.amount),note:this.note}).then(ok=>{if(!ok)return;this.lifeTab='history';h.redraw();}),h.busy,true);
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
 private history(h:PanelHost,f:Frame){
  const records=[...h.state.activities].reverse(),per=f.compact?2:5,pages=Math.max(1,Math.ceil(records.length/per));this.page%=pages;
  if(!records.length)h.text('HistoryEmpty','还没有成长记录。手动记录或完成研习计时后，会在这里留下足迹。',f.x+24,f.top,f.w-48,90,20,C.muted);
  records.slice(this.page*per,(this.page+1)*per).forEach((r,i)=>{const yy=f.top+i*(f.compact?58:62),source=r.source==='timer'?'计时':r.source==='manual'?'手动':r.source;
   h.text('Record-'+i,`${r.date} · ${source} · 未核验`,f.x+24,yy,260,28,14,C.muted);
   h.text('RecordText-'+i,`${r.note||({study:'学习',exercise:'运动',creative:'创作',steps:'步数',management:'日常管理'} as Record<string,string>)[r.kind]||r.kind} · ${r.amount}${r.kind==='steps'?' 步':r.kind==='management'?' 次':' 分钟'}`,f.x+300,yy,f.w-324,48,17);
  });
  h.button('history-next',`第 ${this.page+1}/${pages} 页 · 下一页`,f.x+24,f.y+f.h-62,f.w-48,44,()=>{this.page=(this.page+1)%pages;h.redraw();},h.busy||pages===1);
 }
}
