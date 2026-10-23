import {formatMoney} from '../core/currency';
import type {PanelHost} from './panels';
import type {GearDefinition,WeaponDefinition} from '../core/protocol';
import {routeNames,slotNames} from '../core/gearCatalog';
import {C} from './theme';
import {paperSurface,timberSurface,inkRule} from './materials';
import {itemNames} from '../core/features';
import {textPages} from '../core/lifeRecords';
import {canExploreStory} from '../core/story';
import {hasDepartureNotes} from '../core/nextDeparture';

type GearView={weaponId:string;page:number;detailPage:number;gearTab:string;gearFilter:string;confirm:string;prepare():void};
const cave={mapId:'overworld',targetId:'cave_entry'};
const signed=(n:number)=>(n>0?'+':'')+Math.round(n*100)/100;
const wrap=(s:string,w:number,size=15,lines=2)=>textPages(s,Math.max(8,Math.floor(w/size)),lines)[0];
function requirements(h:PanelHost,g:GearDefinition){
 const conditions=[`使用：永久体力上限 ${h.state.stamina?.max||100}/${g.min_stamina}`,
 ...(g.use_science?[`使用：科学 ${h.state.knowledge_growth?.science||0}/${g.use_science}`]:[]),
 ...(g.use_magic?[`使用：魔法 ${h.state.knowledge_growth?.magic||0}/${g.use_magic}`]:[]),
 `打造：建造 ${h.state.skill_growth?.building||0}/${g.building}`,
 ...(g.science?[`打造：科学 ${h.state.knowledge_growth?.science||0}/${g.science}`]:[]),
 ...(g.magic_level?[`打造：魔法 ${h.state.knowledge_growth?.magic||0}/${g.magic_level}`]:[]),
 '图纸：'+(g.known?'已学会 · 永久保留':'尚未学会'),
 ...Object.entries(g.costs).map(([id,n])=>`${(h.state.inventory[id]||0)>=n?'✓':'○'} ${id==='gold'?'钱袋 '+formatMoney(h.state.inventory[id]||0)+' / 需要 '+formatMoney(n):(itemNames[id]||id)+' '+(h.state.inventory[id]||0)+'/'+n}`),
 ...g.craft_reasons.map(s=>'○ '+s)];
 return conditions;
}
/** Regional server quotes, learned diagrams, explicit equipment; reading never changes resources. */
export function drawExpeditionGear(h:PanelHost,v:GearView){
 const compact=h.height<600||h.width<980,recipe=h.mode==='gear-recipe',armory=h.mode==='armory';
 const w=Math.min(recipe?780:1120,h.width-24),height=Math.min(recipe?620:armory?700:580,h.height-24),x=(h.width-w)/2,y=(h.height-height)/2,footer=y+height-60;
 const c=h.state.combat!,gear=c.gear||c.weapons,shop=c.gear_shop,all=Object.keys(gear),eq=c.equipped;
 const equipped=(g:GearDefinition)=>g.slot==='weapon'?eq:c.equipment?.[g.slot];
 const equippedNames=['weapon','body','feet','charm'].map(slot=>`${slotNames[slot]}：${itemNames[slot==='weapon'?eq||'':c.equipment?.[slot]||'']||'未装备'}`);
 const target=shop?.target||'armory_counter';
 const send=(action:string)=>h.send(action,{item:v.weaponId,target});
 timberSurface(h,{x,y,w,h:height});paperSurface(h,{x:x+10,y:y+10,w:w-20,h:height-20});
 h.text('FeatureTitle',recipe?'图纸与装备条件':armory?shop?.name||'工坊武备台':'随行装备',x+24,y+10,w-(armory?330:140),40,compact?22:26);
 h.button('close','返回',x+w-100,y+10,76,44,()=>h.close(),h.busy);
 if(armory){
  const ready=!!eq&&!!h.state.inventory[eq],exploring=canExploreStory(h.state);
  const review=exploring&&h.state.village_intro?.returned&&!h.state.village_intro?.reviewed;
  const notes=review||!ready&&exploring;
  h.button(notes?'expedition-entry':ready?'gear-depart':'gear-current-quest',review?'初探材料回顾':notes?'初探手记':ready?'标记山洞':'查看当前委托',x+w-244,y+10,132,44,()=>{
   if(notes){v.prepare();h.go(hasDepartureNotes(h.state)?'preparation':'expedition');}
   else if(ready)h.mark(cave,'石根山洞');else h.go('journal');
  },h.busy,false,'back');
 }
 if(recipe){
  const g=gear[v.weaponId];if(!g)return;
  const source=g.blueprint_source==='boss'?'石壳守卫首次击败':g.blueprint_source==='ruins'?'解读村庄沉睡符文':g.blueprint_source==='research'?'苔桥城精密工坊 · 研究兑换':g.region==='city'?'苔桥城图纸商人':'村庄工坊图纸商人';
  const lines=[g.name+' · '+routeNames[g.route]+' · '+g.tier+'阶',g.effect_text||'精心制作的旅途武备','图纸来源：'+source,...requirements(h,g),'','当前体力不影响使用资格；普攻免体力。','购买成品不要求制造等级；购买和打造不会自动装备。','图纸不会被打造消耗；研究图纸另需6微光晶屑。'];
  const pages=textPages(lines.join('\n'),Math.floor((w-80)/16),Math.max(3,Math.floor((height-148)/24)));
  v.detailPage=Math.max(0,Math.min(v.detailPage,pages.length-1));
  h.text('RecipeRequirements',pages[v.detailPage],x+40,y+66,w-80,height-140,16);
  h.button('recipe-prev','前页',x+24,footer,100,44,()=>{v.detailPage--;h.redraw();},h.busy||v.detailPage===0,false,'page');
  h.text('RecipePage',`${v.detailPage+1} / ${pages.length}`,x+w/2-40,footer,80,44,14,C.muted,true);
  h.button('recipe-next','后页',x+w-124,footer,100,44,()=>{v.detailPage++;h.redraw();},h.busy||v.detailPage===pages.length-1,false,'page');return;
 }
 const tabY=y+62,filters=armory?['all','martial','science','magic','gear']:['all','weapon','body','feet','charm'];
 if(!filters.includes(v.gearFilter))v.gearFilter='all';
 if(armory){
  const tabs=[['obtain','成品'],['diagrams','图纸'],['craft','打造'],['sell','出售'],['materials','材料']];
  if(!tabs.some(t=>t[0]===v.gearTab))v.gearTab='obtain';
  const tw=(w-48-4*8)/5;
  tabs.forEach(([id,label],i)=>h.button('tab-'+id,label,x+24+i*(tw+8),tabY,tw,44,()=>{v.gearTab=id;v.page=0;v.confirm='';h.redraw(true);},h.busy,v.gearTab===id,'tab',{label,pressed:v.gearTab===id}));
 }
 const fy=armory?y+112:tabY,fw=(w-48-4*8)/5;
 filters.forEach((id,i)=>{const label=id==='all'?'全部':id==='gear'?'护具饰品':armory?({martial:'冷兵器',science:'科学',magic:'魔法'} as Record<string,string>)[id]:slotNames[id];h.button('filter-'+id,label,x+24+i*(fw+8),fy,fw,44,()=>{v.gearFilter=id;v.page=0;h.redraw(true);},h.busy,v.gearFilter===id,'page',{label,pressed:v.gearFilter===id});});
 const top=fy+54,left=compact?Math.max(176,Math.floor(w*.28)):280,dx=x+left+48,dw=w-left-72;
 const material=v.gearTab==='materials'&&armory,diagrams=v.gearTab==='diagrams'&&armory,sell=v.gearTab==='sell'&&armory,craft=v.gearTab==='craft'&&armory;
 let ids=armory?material?Object.keys(shop?.materials||{}):diagrams?[...(shop?.diagrams||[]),...(shop?.research||[])]:craft?shop?.craft||[]:sell?all.filter(id=>h.state.inventory[id]>0):shop?.offers||Object.keys(c.weapons):all.filter(id=>h.state.inventory[id]>0);
 ids=ids.filter(id=>id==='soup'?v.gearFilter==='all':material||v.gearFilter==='all'||(armory?v.gearFilter==='gear'?gear[id]?.slot!=='weapon':gear[id]?.slot==='weapon'&&gear[id]?.route===v.gearFilter:gear[id]?.slot===v.gearFilter));
 const per=Math.max(1,Math.floor((footer-top-52)/52)),pages=Math.max(1,Math.ceil(ids.length/per));
 v.page=Math.max(0,Math.min(v.page,pages-1));
 if(!ids.includes(v.weaponId))v.weaponId=ids[v.page*per]||'';
 ids.slice(v.page*per,(v.page+1)*per).forEach((id,i)=>{
  const g=gear[id],n=h.state.inventory[id]||0,name=id==='soup'?'便携菜汤':itemNames[id]||id;
  const state=material?'持有'+n:diagrams?g.known?'已学会':'图纸':g&&equipped(g)===id&&n?'已装备':n?'持有'+n:'未持有';
  h.button('select-'+id,name+' · '+state,x+24,top+i*52,left,44,()=>{v.weaponId=id;v.confirm='';v.detailPage=0;h.redraw(true);},h.busy,v.weaponId===id,'entry');
 });
 if(pages>1)h.button('list-next',`${v.page+1}/${pages} · 下一页`,x+24,footer-52,left,44,()=>{v.page=(v.page+1)%pages;v.weaponId=ids[v.page*per]||'';h.redraw();},h.busy,false,'page');
 if(!ids.length){
  const message=material?'这里没有精密材料。苔桥城工坊提供高级材料。':craft?'还没有可打造的图纸。商人出售基础图纸，探索也能获得特殊图纸。':diagrams?'这个分类暂时没有图纸。':'还没有这类随行装备。';
  h.text('GearEmpty',wrap(message,dw,18,4),dx,top+12,dw,120,18,C.muted);
  if(!armory)h.button('gear-depart','标记武备台',dx,footer,dw,44,()=>h.mark({mapId:'workshop',targetId:'armory_counter'},'工坊武备台'),h.busy,true);return;
 }
 const id=v.weaponId,g=gear[id],soup=id==='soup',m=shop?.materials[id],n=h.state.inventory[id]||0,name=itemNames[id]||id;
 const art=compact?56:112;
 h.image('items/'+(material?m?.icon:id),dx+art/2,top+art/2,art,art);
 h.text('WeaponName',name,dx+art+16,top,dw-art-16,32,compact?20:28);
 const weapon=g?.slot==='weapon'?g as WeaponDefinition:null;
 const info=material?m?.summary||'精密制作材料':soup?'恢复生命20 · 体力15':weapon?`${weapon.damage} ${weapon.magic?'魔法':'物理'}伤害 · 距离${weapon.reach}`:g.effect_text;
 h.text('WeaponStats',wrap(info,dw-art-16,compact?14:16,compact?1:2),dx+art+16,top+36,dw-art-16,compact?24:48,compact?14:16,C.muted);
 const price=material?m!.price:soup?8:diagrams?g.blueprint_price:g.price,gold=h.state.inventory.gold||0,missing=Math.max(0,price-gold);
 const current=eq?c.weapons[eq]:null;
 const delta=weapon&&current&&id!==eq?`较当前：伤害 ${signed(weapon.damage-current.damage)} · 距离 ${signed(weapon.reach-current.reach)}`:weapon?`${routeNames[g.route]} · ${g.tier}阶 · 间隔${weapon.interval}秒 · 普攻免体力`:soup?'洞内按R饮用，恢复可被打断。':material?'城市工坊材料':`${slotNames[g.slot]} · ${g.tier}阶`;
 if(!compact)h.text('WeaponComparison',delta,dx+art+16,top+88,dw-art-16,28,15,C.muted);
 const recipeOpen=()=>{v.detailPage=0;h.go('gear-recipe');};
 const equipId=armory?'armory-equip':'equip-weapon',isEquipped=!!g&&equipped(g)===id&&n>0;
 const status=isEquipped?'✓ 已装备 '+name:n?'持有 '+n+' 件 · 装备后生效':'当前武器：'+(itemNames[eq||'']||'尚未装备');
 const use=g?.use_reasons?.join('；')||'',validCraft=!!g&&!g.craft_reasons.length;
 const equip=()=>h.send('gear_equip',{item:id});
 const mark=()=>h.mark(cave,'石根山洞');
 if(g)h.button('gear-requirements',compact?'全部条件':'图纸 · 材料 · 使用条件',x+24,footer,left,44,recipeOpen,h.busy,false,'page');
 if(!compact){
  inkRule(h,'GearRule',dx,top+132,dw);
  const body=armory?diagrams?[g.known?'✓ 已学会，打造不会消耗图纸':`图纸报价 ${formatMoney(price)}`,'图纸来源：'+(g.blueprint_source==='research'?'城市研究兑换 · 另需6微光晶屑':'武备图纸商人'),...(g.blueprint_source==='research'?g.research_reasons:[]),`持有 ${formatMoney(gold)} / 需要 ${formatMoney(price)}`,use?'使用尚缺：'+use:'使用条件已满足']:material?[`单价 ${formatMoney(price)} · 持有 ${n} 份`,m!.summary]:sell?[`出售一件 +${formatMoney(Math.floor((g?.price||0)/4))}`,isEquipped&&n===1?'出售最后一件会自动卸下。':'物品数量和装备状态由服务器确认。']:[soup?'便携恢复补给':g.effect_text||'以可靠的形制陪伴旅途。',`持有 ${formatMoney(gold)} / 需要 ${formatMoney(price)}`+(missing?` · 还差 ${formatMoney(missing)}`:' · 可购买'),g?.known?'图纸已学会，可反复打造':'打造前先到「图纸」学会配方',use?'使用尚缺：'+use:'使用条件已满足',g?.craft_reasons[0]||'材料与制造能力已满足']: [equippedNames.join('\n'),g.effect_text||'可靠的随行武器。',use?'使用尚缺：'+use:'使用条件已满足'];
  h.text('GearDetails',textPages(body.join('\n'),Math.floor(dw/16),Math.max(3,Math.floor((footer-top-196)/26)))[0],dx,top+150,dw,Math.max(80,footer-top-196),16,use?C.muted:C.ink);
 }
 const shortQuote=diagrams?(g.known?'✓ 图纸已永久学会':`图纸 ${formatMoney(price)}${g.blueprint_source==='research'?' + 6晶屑':''} · 持有 ${formatMoney(gold)}`):material?`单价 ${formatMoney(price)} · 持有 ${n} 份`:sell?isEquipped&&n===1?'当前装备的最后一件，售出后卸下。':`出售一件 +${formatMoney(Math.floor(g.price/4))}`:craft?use||g.craft_reasons[0]||'✓ 材料与能力已满足':use||g?.effect_text||delta;
 const feedback=h.error||h.notice||(!compact?'':shortQuote);
 if(feedback)h.text('GearFeedback',wrap(feedback,dw,14,compact?1:2),dx,footer-(compact?28:44),dw,compact?24:40,14,h.error?C.danger:C.muted);
 const bw=(dw-16)/3;
 if(!armory){
  h.button(equipId,isEquipped?'已装备':'装备',dx,footer,bw,44,equip,h.busy||!n||!!use||isEquipped,!isEquipped);
  h.button('gear-unequip','卸下',dx+bw+8,footer,bw,44,()=>h.send('gear_unequip',{slot:g.slot}),h.busy||!isEquipped);
  h.button('gear-depart','标记山洞',dx+(bw+8)*2,footer,bw,44,mark,h.busy);
 }else if(diagrams){
  const research=g.blueprint_source==='research',reasons=research?g.research_reasons:[],lack=missing>0||research&&(h.state.inventory.crystal||0)<6;
  h.button('buy-blueprint',g.known?'已学会':research?`研究 · ${formatMoney(price)} + 6晶屑`:`学会图纸 · ${formatMoney(price)}`,dx,footer,dw,44,()=>send(research?'blueprint_research':'blueprint_buy'),h.busy||g.known||lack||!!reasons.length,!g.known);
 }else if(material){
  h.button('buy-material','购买1份 · '+formatMoney(price),dx,footer,(dw-8)/2,44,()=>h.send('gear_material_buy',{target,item:id,amount:1}),h.busy||!!missing,true);
  h.button('buy-material-five','购买5份 · '+formatMoney(price*5),dx+(dw+8)/2,footer,(dw-8)/2,44,()=>h.send('gear_material_buy',{target,item:id,amount:5}),h.busy||gold<price*5);
 }else if(sell){
  h.button('sell-gear',v.confirm===id?'确认出售这一件':`出售一件 · +${formatMoney(Math.floor(g.price/4))}`,dx,footer,dw,44,()=>{if(v.confirm===id)void send('gear_sell').then(ok=>{if(ok){v.confirm='';h.redraw();}});else{v.confirm=id;h.redraw();}},h.busy||!n,true);
 }else{
  if(craft)h.button('buy-gear','图纸已学会',dx,footer,bw,44,()=>{},true);
  else h.button('buy-gear','购买 · '+formatMoney(price),dx,footer,bw,44,()=>send('gear_buy'),h.busy||!!missing,!n);
  h.button(soup?'gear-equipment':'craft-gear',soup?'查看装备':'打造',dx+bw+8,footer,bw,44,()=>soup?h.go('equipment'):send('gear_craft'),h.busy||(!soup&&!validCraft));
  if(n&&!soup)h.button(equipId,isEquipped?'已装备':'装备',dx+(bw+8)*2,footer,bw,44,equip,h.busy||isEquipped||!!use,!isEquipped);
  else h.button('gear-browse','查看装备',dx+(bw+8)*2,footer,bw,44,()=>h.go('equipment'),h.busy);
 }
 if(!compact&&!feedback)h.text('ArmoryEquippedState',status,dx,footer-42,dw,32,15,C.moss);
}
