import type {PanelHost} from './panels';
import {C} from './theme';
import {paperSurface,timberSurface,inkRule} from './materials';
import {itemNames} from '../core/features';
import {textPages} from '../core/lifeRecords';

type GearView={weaponId:string;page:number;detailPage:number;gearTab:string;confirm:string;prepare():void};
const cave={mapId:'overworld',targetId:'cave_entry'};

/** A quote, an explicit equip, then a route marker. Reading never mutates resources. */
export function drawExpeditionGear(h:PanelHost,v:GearView){
 const compact=h.height<600||h.width<980,w=Math.min(h.mode==='gear-recipe'?760:1080,h.width-32),height=Math.min(compact?410:h.mode==='armory'?640:500,h.height-24);
 const x=(h.width-w)/2,y=(h.height-height)/2,footer=y+height-66;
 timberSurface(h,{x,y,w,h:height});paperSurface(h,{x:x+10,y:y+10,w:w-20,h:height-20});
 const weapons=h.state.combat?.weapons||{},ids=Object.keys(weapons),equipped=h.state.combat?.equipped;
 if(v.weaponId!=='soup'&&!weapons[v.weaponId]||h.mode==='equipment'&&v.weaponId==='soup')v.weaponId=equipped||ids.find(id=>h.state.inventory[id]>0)||ids[0];
 const soup=v.weaponId==='soup',weapon=weapons[v.weaponId],owned=h.state.inventory[v.weaponId]||0,ready=!!equipped&&!!h.state.inventory[equipped];
 const recipe=h.mode==='gear-recipe',armory=h.mode==='armory',sell=armory&&v.gearTab==='sell';
 h.text('FeatureTitle',recipe?'打造条件':armory?'工坊武备台':'出发前 · 随行装备',x+24,y+12,w-330,42,compact?22:26);
 h.button('close','返回',x+w-104,y+12,80,44,()=>h.close(),h.busy);
 if(armory)h.button('expedition-entry','初探手记',x+w-248,y+12,132,44,()=>{v.prepare();h.go(h.state.village_intro?.reviewed?'preparation':'expedition');},h.busy,false,'back');
 if(recipe){
  if(!weapon)return;
  const materials=Object.entries(weapon.costs).map(([id,n])=>`${(h.state.inventory[id]||0)>=n?'✓':'○'} ${itemNames[id]||id}  ${h.state.inventory[id]||0} / ${n}`);
  const requirements=weapon.craft_reasons.length?weapon.craft_reasons.map(r=>'○ '+r):['✓ 材料与能力均已满足'];
  const lines=[weapon.name+' · 蓝图',...materials,'',...requirements,'','购买武器不要求打造等级；买到后仍需主动装备。'];
  const pages=textPages(lines.join('\n'),Math.floor((w-80)/16),Math.max(3,Math.floor((height-154)/24)));
  v.detailPage=Math.max(0,Math.min(v.detailPage,pages.length-1));
  h.text('RecipeRequirements',pages[v.detailPage],x+40,y+74,w-80,Math.min(height-154,pages[v.detailPage].split('\n').length*24),16);
  if(pages.length>1){h.button('recipe-prev','前页',x+24,footer,100,44,()=>{v.detailPage--;h.redraw();},h.busy||!v.detailPage,false,'page');h.text('RecipePage',`${v.detailPage+1} / ${pages.length}`,x+w/2-40,footer,80,44,14,C.muted,true);h.button('recipe-next','后页',x+w-124,footer,100,44,()=>{v.detailPage++;h.redraw();},h.busy||v.detailPage===pages.length-1,false,'page');}
  return;
 }
 const left=compact?Math.max(180,Math.floor(w*.29)):260,dx=x+left+52,dw=w-left-76,top=y+(armory?122:82);
 if(armory){const tabW=(w-56)/2;for(const [i,id,label] of [[0,'obtain','购买与打造'],[1,'sell','出售武器']] as const)h.button('tab-'+id,label,x+24+i*(tabW+8),y+66,tabW,44,()=>{v.gearTab=id;v.page=0;v.confirm='';h.redraw(true);},h.busy,v.gearTab===id,'tab',{label,pressed:v.gearTab===id});}
 else h.text('GearJourney','买到 → 装备 → 去洞口',x+24,y+56,w-48,24,14,C.muted);
 const entries=armory?[...ids,'soup']:ids,per=compact?Math.max(1,Math.floor((footer-top-54)/48)):5,pages=Math.ceil(entries.length/per);
 v.page=Math.max(0,Math.min(v.page,pages-1));
 entries.slice(v.page*per,(v.page+1)*per).forEach((id,i)=>{const n=h.state.inventory[id]||0,label=(weapons[id]?.name||'便携菜汤')+' · '+(equipped===id&&n?'已装备':n?'持有 '+n:'未持有');h.button('select-'+id,label,x+24,top+i*(compact?48:56),left,44,()=>{v.weaponId=id;v.confirm='';v.detailPage=0;h.redraw(true);},h.busy,v.weaponId===id,'entry');});
 if(pages>1)h.button('list-next',`${v.page+1}/${pages} · 下一页`,x+24,footer-52,left,44,()=>{v.page=(v.page+1)%pages;h.redraw();},h.busy,false,'page');
 const name=soup?'便携菜汤':weapon?.name;if(!name)return;
 const art=compact?48:72;
 h.image('items/'+v.weaponId,dx+art/2,top+art/2+4,art,art);
 h.text('WeaponName',name,dx+art+14,top,dw-art-14,32,compact?20:26);
 const stats=soup?'恢复生命 20 · 体力 15':`${weapon.damage} ${weapon.magic?'魔法':'物理'}伤害 · 距离 ${weapon.reach}`;
 h.text('WeaponStats',stats,dx+art+14,top+34,dw-art-14,24,compact?14:16);
 const current=equipped?weapons[equipped]:null;
 const delta=current&&weapon&&equipped!==v.weaponId?`较当前：伤害 ${signed(weapon.damage-current.damage)} · 距离 ${signed(weapon.reach-current.reach)}`:soup?'洞内按 R 饮用；恢复可被打断。':`每次 ${weapon.stamina} 体力 · 间隔 ${weapon.interval} 秒`;
 if(!compact)h.text('WeaponComparison',delta,dx+art+14,top+62,dw-art-14,28,15,C.muted);
 const equippedName=ready?weapons[equipped!]?.name||itemNames[equipped!]:'尚未装备';
 const equip=()=>h.send('gear_equip',{item:v.weaponId});
 const mark=()=>h.mark(cave,'石根山洞');
 const equipId=armory?'armory-equip':'equip-weapon';
 const status=equipped===v.weaponId&&owned?'✓ 已装备 '+name:owned&&!soup?'已放入行囊 · 还需亲手装备':'当前装备：'+equippedName;
 const feedback=h.error||h.notice;
 if(!armory){
  h.text('EquippedState',status,dx,top+(compact?66:122),dw,32,16,owned?C.moss:C.muted);
  if(!compact){if(current&&equipped!==v.weaponId)h.text('EquipmentComparison',delta,dx,top+170,dw,32,17);h.text('EquipmentHelp',equipped===v.weaponId?'武器已备好。标记洞口后，沿路标前往。':owned?'装备只更换当前武器，不消耗物品。':'这件武器尚未持有。可在工坊购买或打造。',dx,top+220,dw,56,16,C.muted);}
  const bw=(dw-12)/2;
  h.button(equipId,equipped===v.weaponId?'已装备':'装备此武器',dx,footer,bw,44,equip,h.busy||!owned||equipped===v.weaponId,!ready);
  h.button('gear-depart',ready?'标记石根山洞':'标记武备台',dx+bw+12,footer,bw,44,()=>ready?mark():h.mark({mapId:'workshop',targetId:'armory_counter'},'工坊武备台'),h.busy,ready);
 }else if(sell){
  const price=Math.floor((weapon?.price||0)/4),last=equipped===v.weaponId&&owned===1;
  h.text('WeaponSell',soup?'菜汤留作洞内恢复。':`出售一件 +${price} 金币${last?'\n当前装备的最后一件，售出后会卸下。':''}`,dx,top+(compact?64:126),dw,compact?52:90,16,C.muted);
  h.button('sell-gear',v.confirm===v.weaponId?'确认出售这一件':`出售一件 · +${price} 金币`,dx,footer,dw,44,()=>{if(v.confirm===v.weaponId)void h.send('gear_sell',{target:'armory_counter',item:v.weaponId}).then(ok=>{if(ok){v.confirm='';h.redraw();}});else{v.confirm=v.weaponId;h.redraw();}},h.busy||soup||!owned,true);
 }else{
  const price=soup?8:weapon.price,gold=h.state.inventory.gold||0,missing=Math.max(0,price-gold),craftable=!soup&&!weapon.craft_reasons.length;
  const buy=()=>h.send('gear_buy',{target:'armory_counter',item:v.weaponId}),craft=()=>h.send('gear_craft',{target:'armory_counter',item:v.weaponId});
  const recipeOpen=()=>{v.detailPage=0;h.go('gear-recipe');};
  if(compact){
   h.text('PurchaseShortfall',`金币 ${gold} / ${price}${missing?' · 还差 '+missing:' · 可购买'}`,dx,top+62,dw-144,28,14,missing?C.danger:C.moss);
   if(!soup)h.button('gear-requirements','打造条件',dx+dw-136,top+62,136,44,recipeOpen,h.busy,false,'entry');
   const bw=(dw-16)/3;
   h.button('buy-gear',`购买 · ${price}`,dx,footer,bw,44,buy,h.busy||!!missing,!owned);
   h.button(soup?'gear-equipment':'craft-gear',soup?'查看装备':'打造',dx+bw+8,footer,bw,44,()=>soup?h.go('equipment'):craft(),h.busy||(!soup&&!craftable));
   if(owned&&!soup)h.button(equipId,equipped===v.weaponId?'已装备':'装备此武器',dx+2*(bw+8),footer,bw,44,equip,h.busy||equipped===v.weaponId,equipped!==v.weaponId);
   else h.button('gear-income',missing?'标记小铺':'查看装备',dx+2*(bw+8),footer,bw,44,()=>missing?h.mark({mapId:'overworld',targetId:'shop'},'风铃杂货铺'):h.go('equipment'),h.busy);
   if(ready)h.button('gear-depart','标记山洞',x+24,footer,left,44,mark,h.busy,equipped===v.weaponId);
  }else{
   const col=(dw-28)/2,ty=top+120;
   inkRule(h,'GearTradeRule',dx,ty-10,dw);
   h.text('PurchaseTitle','直接购买',dx,ty,col,32,20);
   h.text('PurchasePrice',`${price} 金币`,dx,ty+38,col,36,26);
   h.text('PurchaseShortfall',`持有 ${gold}${missing?' · 还差 '+missing+' 金币':' · 金币足够'}`,dx,ty+78,col,30,16,missing?C.danger:C.moss);
   h.text('PurchaseHint','购买不要求打造等级',dx,ty+112,col,26,14,C.muted);
   h.button('buy-gear',`购买 · ${price} 金币`,dx,ty+146,col,44,buy,h.busy||!!missing,!owned);
   const cx=dx+col+28;
   h.text('CraftTitle',soup?'随身补给':'按蓝图打造',cx,ty,col,32,20);
   const costs=soup?['持有 '+owned+' 份','洞内按 R 饮用']:Object.entries(weapon.costs).map(([id,n])=>`${itemNames[id]||id} ${h.state.inventory[id]||0}/${n}`);
   h.text('CraftMaterials',costs.join(' · '),cx,ty+38,col,68,16,C.muted);
   h.text('CraftShortfall',soup?'恢复时保持原地':craftable?'✓ 材料与能力已满足':weapon.craft_reasons[0],cx,ty+112,col,26,14,craftable?C.moss:C.muted);
   h.button(soup?'gear-equipment':'craft-gear',soup?'查看装备':'按蓝图打造',cx,ty+146,col,44,()=>soup?h.go('equipment'):craft(),h.busy||(!soup&&!craftable));
   if(!soup)h.button('gear-requirements','查看全部打造条件',cx,ty+198,col,44,recipeOpen,h.busy,false,'entry');
   if(missing)h.button('gear-income','标记小铺 · 出售换金币',dx,ty+198,col,44,()=>h.mark({mapId:'overworld',targetId:'shop'},'风铃杂货铺'),h.busy,false,'entry');
   inkRule(h,'GearDepartureRule',x+24,footer-54,w-48);
   h.text('ArmoryEquippedState',status,dx,footer-44,dw,32,16,owned?C.moss:C.muted);
   const bw=(dw-12)/2;
   if(owned&&!soup)h.button(equipId,equipped===v.weaponId?'已装备':'装备此武器',dx,footer,bw,44,equip,h.busy||equipped===v.weaponId,equipped!==v.weaponId);
   else h.text('EquipReminder','买到后，请亲手装备。',dx,footer,bw,44,16,C.muted);
   h.button('gear-depart',ready?'标记石根山洞':'查看随行装备',dx+bw+12,footer,bw,44,()=>ready?mark():h.go('equipment'),h.busy,ready);
  }
 }
 if(feedback)h.text('GearFeedback',textPages(feedback,Math.max(12,Math.floor((compact?dw:left)/14)),2)[0],compact?dx:x+24,footer-(compact?42:44),compact?dw:left,40,14,h.error?C.danger:C.muted);
 else if(compact&&armory&&!sell)h.text('ArmoryEquippedState',status,dx,footer-40,dw,30,14,owned?C.moss:C.muted);
}
function signed(value:number){return (value>0?'+':'')+Math.round(value*100)/100;}
