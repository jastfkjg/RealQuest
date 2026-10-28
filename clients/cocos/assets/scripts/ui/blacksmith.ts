import {formatMoney} from '../core/currency';
import {itemNames} from '../core/items';
import {textPages} from '../core/lifeRecords';
import type {WeaponDefinition} from '../core/protocol';
import type {PanelHost} from './panels';
import type {GearView} from './expeditionGear';
import {C} from './theme';
import {paperSurface,timberSurface,inkRule} from './materials';
import {smithStock,smithQuote,smithTabs,smithFilters,type SmithTab} from './blacksmithModel';

/** Dedicated village merchant. Selection is local; every trade uses the command queue. */
export class BlacksmithPanels {
 private save='';private amount=1;private sending=false;
 snapshot(){return {blacksmithAmount:this.amount};}
 draw(h:PanelHost,v:GearView){
  if(this.save!==h.saveId){this.save=h.saveId;this.amount=1;v.confirm='';v.gearTab='obtain';v.page=0;v.gearFilter='all';v.weaponId='stone_sword';}
  if(!smithTabs.some(t=>t[0]===v.gearTab))v.gearTab='obtain';
  if(!smithFilters.some(t=>t[0]===v.gearFilter))v.gearFilter='all';
  const tab=v.gearTab as SmithTab,short=h.height<520,narrow=h.width<1100;
  const w=Math.min(1640,h.width-(short?24:64)),height=Math.min(980,h.height-(short?12:24)),x=(h.width-w)/2,y=(h.height-height)/2;
  const header=short?44:narrow?112:156,trade=short?78:112,foot=short?20:30,bodyY=y+header+6,tradeY=y+height-foot-trade,bodyBottom=tradeY-8;
  const lx=x+14,lw=Math.floor((w-44)*.65),rx=lx+lw+12,rw=x+w-14-rx;
  const scale=Math.max(h.width/1586,h.height/992);h.image('ui/blacksmith-interior',h.width/2,h.height/2,1586*scale,992*scale);
  h.box('SmithAtmosphere',0,0,h.width,h.height,'#15291d10',0);
  this.header(h,x,y,w,header,short);
  timberSurface(h,{x,y:bodyY-8,w,h:bodyBottom-bodyY+16});
  h.region('blacksmith-counter',x,y,w,height);
  h.region('blacksmith-stock',lx,bodyY,lw,bodyBottom-bodyY);
  h.box('SmithRackRecess',lx,bodyY,lw,bodyBottom-bodyY,'#25170fdd',2);
  // Texture is decorative. Every object, label, selected state and action is native.
  h.image('ui/notice-timber',lx+lw/2,bodyY+(bodyBottom-bodyY)/2,lw,bodyBottom-bodyY,true);
  h.box('SmithRackTint',lx+6,bodyY+6,lw-12,bodyBottom-bodyY-12,'#25170fbd',1);
  const tw=(lw-18)/4;
  smithTabs.forEach(([id,label],i)=>h.button('tab-'+id,label,lx+3+i*(tw+4),bodyY+2,tw,44,()=>{v.gearTab=id;v.page=0;v.weaponId='';v.confirm='';this.amount=1;h.redraw(true);},h.busy,tab===id,'smith-tab',{label,pressed:tab===id}));
  if(!short){const fw=(lw-20)/5;smithFilters.forEach(([id,label],i)=>h.button('filter-'+id,label,lx+4+i*(fw+3),bodyY+54,fw,44,()=>{v.gearFilter=id;v.page=0;v.weaponId='';v.confirm='';this.amount=1;h.redraw(true);},h.busy||tab==='supplies',v.gearFilter===id,'smith-tab',{label:'武备分类：'+label,pressed:v.gearFilter===id}));}
  const gridY=bodyY+(short?52:110),pagerY=bodyBottom-44,rows=short?1:2,per=rows*4,gridH=pagerY-gridY-6,rh=gridH/rows,cw=(lw-12)/4;
  const ids=smithStock(h.state,tab,v.gearFilter),pages=Math.max(1,Math.ceil(ids.length/per));v.page=Math.max(0,Math.min(v.page,pages-1));
  const shown=ids.slice(v.page*per,(v.page+1)*per);
  if(!shown.includes(v.weaponId)){v.weaponId=shown[0]||'';this.amount=1;v.confirm='';}
  for(let row=0;row<rows;row++){
   const sy=gridY+(row+1)*rh-6;
   timberSurface(h,{x:lx+2,y:sy-8,w:lw-4,h:16});
   h.box('ShelfShadow',lx+6,sy+8,lw-12,4,'#130d09aa',0);
   h.line('ShelfLip',[{x:lx+6,y:sy-6},{x:lx+lw-6,y:sy-6}],'#b58a51',2);
  }
  shown.forEach((id,i)=>{
   const xx=lx+6+(i%4)*cw,yy=gridY+Math.floor(i/4)*rh,ww=cw-8,hh=rh-10;
   const selected=v.weaponId===id,q=smithQuote(h.state,tab,id,1),name=itemNames[id]||id;
   h.button('select-'+id,'',xx,yy,ww,hh,()=>{v.weaponId=id;v.confirm='';this.amount=1;h.redraw(true);},h.busy,selected,'shop-item',{label:name+(tab==='diagrams'?'图纸':'')+'，'+formatMoney(q.price)+(q.known?'，已学会':'')+'，点选查看',pressed:selected});
   const labelY=yy+hh-42,art=Math.max(24,Math.min(narrow?128:160,hh-48));
   if(!short&&tab!=='diagrams')h.image('ui/weapon-stand',xx+ww/2,labelY-34,ww-16,(ww-16)*.45);
   if(tab==='diagrams'){paperSurface(h,{x:xx+ww/2-art*.42,y:yy+2,w:art*.84,h:art});h.image('items/'+id,xx+ww/2,yy+art/2+2,art*.76,art*.76);}
   else h.image('items/'+id,xx+ww/2,yy+art/2+2,art,art);
   const tagW=ww-10,tagX=xx+5;
   h.box('SmithTagShadow',tagX+1,labelY+2,tagW,23,'#00000066',2);
   h.box('SmithStockTag',tagX,labelY,tagW,23,C.paper,2);
   h.line('SmithTagEdge',[{x:tagX+2,y:labelY+23},{x:tagX+tagW-2,y:labelY+23}],C.wood,1);
   if(!short){h.box('SmithTagPin',tagX+3,labelY+10,3,3,C.wood,1);h.box('SmithTagPin',tagX+tagW-6,labelY+10,3,3,C.wood,1);}
   h.text('SmithStockName',name,tagX+7,labelY,tagW-14,23,short?12:narrow?14:17,C.ink,true);
   h.text('SmithStockPrice',q.known?'✓ 已学会':(tab==='sell'?'+':'')+formatMoney(q.price),xx+3,labelY+23,ww-6,21,short?12:15,C.paper,true);
   if(selected)h.box('SmithSelectionSeal',xx+4,yy+4,5,5,C.amber,0);
  });
  if(!ids.length)h.text('SmithEmpty',tab==='sell'?'行囊中没有可出售的装备。':'这个分类暂时没有在售商品。',lx+24,gridY,lw-48,gridH,short?14:18,C.paper,true);
  const pw=short?44:112;
  h.button('list-prev',short?'‹':'‹ 上一页',lx+4,pagerY,pw,44,()=>{v.page--;v.weaponId='';h.redraw(true);},h.busy||v.page===0,false,'smith-tab',{label:'武备上一页'});
  h.button('list-next',short?'›':'下一页 ›',lx+lw-pw-4,pagerY,pw,44,()=>{v.page++;v.weaponId='';h.redraw(true);},h.busy||v.page===pages-1,false,'smith-tab',{label:'武备下一页'});
  if(short){h.button('smith-filter',smithFilters.find(f=>f[0]===v.gearFilter)![1]+' ▸',lx+pw+8,pagerY,84,44,()=>{v.gearFilter=smithFilters[(smithFilters.findIndex(f=>f[0]===v.gearFilter)+1)%smithFilters.length][0];v.page=0;v.weaponId='';h.redraw(true);},h.busy||tab==='supplies',false,'smith-tab',{label:'切换武备分类'});h.text('SmithPage',`${v.page+1}/${pages} · ${ids.length}件`,lx+pw+98,pagerY,lw-pw*2-108,44,13,C.paper,true);}
  else h.text('SmithPage',`${v.page+1} / ${pages} 页 · 共 ${ids.length} 件`,lx+pw+8,pagerY,lw-pw*2-16,44,16,C.paper,true);
  this.details(h,v,tab,rx,bodyY,rw,bodyBottom-bodyY,short);
  this.trade(h,v,tab,x+8,tradeY,w-16,trade,short);
  h.text('SmithWorkbenchHint','打造请使用工坊锻造工作台',x+w*.25,y+height-foot,w*.5,foot,short?12:14,C.paper,true);
 }
 private header(h:PanelHost,x:number,y:number,w:number,height:number,short:boolean){
  const signW=short?190:Math.min(410,w*.31),titleY=y+(short?0:32);
  timberSurface(h,{x:x+4,y:titleY,w:signW,h:short?44:height-40});
  if(!short)h.image('interiors/anvil',x+46,titleY+(height-40)/2,52,44);
  h.text('FeatureTitle','工坊 · 铁匠铺',x+(short?12:78),titleY,signW-(short?20:88),short?44:height-40,short?22:w<1000?23:32,C.paper,true);
  if(!short){
   const pw=Math.min(226,height*1.42),px=x+signW+pw/2+4;
   h.image('atlas/blacksmith',px,y+height/2,pw,height+8);
   const sx=px+pw/2+4,sw=x+w-20-sx;
   if(sw>200){const speechY=y+(height<140?4:48);paperSurface(h,{x:sx,y:speechY,w:sw,h:52});h.text('SmithWelcome','挑件趁手的吧，想自己做也有图纸。',sx+20,speechY+2,sw-40,48,w<1100?14:17,C.ink,true);h.text('SmithIdentity','阿焰 · 驻店铁匠',sx+20,y+height-42,sw-270,32,15,C.paper);}
  }
  h.button('smith-tools','工具升级',short?x+signW+12:x+w-244,y+(short?0:4),short?140:180,44,()=>h.go('tools'),h.busy,false,'smith-tab');
  const balanceW=short?122:180,bx=x+w-balanceW-64,by=y+(short?0:height-48);
  paperSurface(h,{x:bx,y:by,w:balanceW,h:44});
  h.text('FeatureBalance','持有 '+formatMoney(h.state.inventory.gold||0),bx+12,by,balanceW-24,44,short?15:18,C.ink,true);
  h.button('close','收起铁匠柜台',x+w-52,by,44,44,()=>h.close(),h.busy,false,'satchel-close',{label:'收起铁匠柜台'});
 }
 private details(h:PanelHost,v:GearView,tab:SmithTab,x:number,y:number,w:number,height:number,short:boolean){
  h.image('ui/satchel',x+w/2,y+height/2,w,height,true);
  paperSurface(h,{x:x+6,y:y+6,w:w-12,h:height-12});
  h.region('blacksmith-detail',x+18,y+16,w-36,height-32);
  const id=v.weaponId,g=(h.state.combat!.gear||h.state.combat!.weapons)[id],q=smithQuote(h.state,tab,id,this.amount);
  if(!id){h.text('SmithDetailEmpty','选一件武备，看看是否趁手。',x+24,y+28,w-48,80,16);return;}
  const inner=w-48,name=itemNames[id]||id,art=short?42:Math.min(height<530?100:142,w*.44),top=y+(short?14:24);
  if(!short)h.image('ui/satchel',x+24+art/2,top+art/2,art+8,art,true);
  h.image('items/'+id,x+24+art/2,top+art/2,art,art);
  h.text('WeaponName',name+(tab==='diagrams'?'图纸':''),x+art+30,top+2,w-art-54,short?28:70,short?16:w<350?21:25);
  if(!short)h.text('WeaponRoute',g?(g.slot==='weapon'?({martial:'冷兵器',science:'科学',magic:'魔法'}[g.route]):'护具饰品')+' · '+g.tier+'阶':'便携补给',x+art+30,top+76,w-art-54,28,15,C.muted);
  const sy=top+art+(short?2:20),weapon=g?.slot==='weapon'?g as WeaponDefinition:null;
  const stats=weapon?[`${weapon.magic?'魔法':'物理'}伤害  ${weapon.damage}`,`攻击间隔  ${weapon.interval} 秒`,`攻击距离  ${weapon.reach}`]:[g?.effect_text||'恢复生命20 · 体力15'];
  if(short){
   h.text('WeaponStats',weapon?`伤害 ${weapon.damage} · ${weapon.interval}秒 · 距离${weapon.reach}`:stats[0],x+24,sy,inner,28,13);
   const use=g?.use_reasons?.[0];h.text('SmithUse',use?'使用尚缺：'+use:tab==='diagrams'?(q.known?'✓ 图纸已学会':'永久学会，可反复打造'):'持有 '+q.owned+' 件 · '+(g?'使用条件已满足':'洞内按R饮用'),x+24,sy+28,inner,32,13,use?C.danger:C.moss);
   if(g)h.button('gear-requirements','图纸与完整条件',x+22,y+height-56,w-44,44,()=>{v.detailPage=0;h.go('gear-recipe');},h.busy,false,'smith-tab');
   return;
  }
  const step=height<530?24:w<350?28:34;
  stats.forEach((s,i)=>h.text('WeaponStats'+i,s,x+28,sy+i*step,w-56,step,17));
  const rule=sy+stats.length*step+12;inkRule(h,'SmithStatRule',x+24,rule,inner);
  const use=g?.use_reasons?.join('；')||'',status=use?'使用尚缺：'+use:'✓ 使用条件已满足';
  h.text('SmithUse',textPages(g?status:'洞内按R饮用',Math.floor(inner/15),2)[0],x+24,rule+14,inner,44,15,use?C.danger:C.moss);
  h.text('SmithOwned','当前持有 '+q.owned+' 件'+(q.equipped?' · 已装备':''),x+24,rule+58,inner,28,16);
  const note=tab==='diagrams'?q.known?'图纸已永久学会，打造不会消耗':'买下即可永久学会，可反复打造':tab==='sell'?q.unloads?'售出最后一件会自动卸下':'出售后物品数量减少':'购买成品无需学会图纸';
  h.text('SmithPurchaseRule',note,x+24,rule+90,inner,28,14,C.muted);
  const slipY=y+height-128;
  if(g&&h.state.combat!.gear_shop!.diagrams.includes(id)&&tab!=='sell'){
   paperSurface(h,{x:x+18,y:slipY,w:w-36,h:108});
   h.image('items/'+id,x+60,slipY+49,64,64);
   h.text('SmithRecipeName',name+'图纸',x+102,slipY+10,w-130,28,16);
   h.text('SmithRecipePrice',formatMoney(g.blueprint_price)+' · '+(g.known?'已学会':'永久学会'),x+102,slipY+38,w-130,26,14,C.muted);
   h.button(tab==='diagrams'?'gear-requirements':'smith-see-blueprint',tab==='diagrams'?'查看打造条件 ›':'查看图纸 →',x+102,slipY+62,w-130,44,()=>{if(tab==='diagrams'){v.detailPage=0;h.go('gear-recipe');}else{v.gearTab='diagrams';this.amount=1;v.confirm='';v.page=Math.floor(smithStock(h.state,'diagrams',v.gearFilter).indexOf(id)/8);h.redraw(true);}},h.busy,false,'back');
  }else if(g)h.button('gear-requirements','图纸与完整条件',x+24,y+height-64,inner,44,()=>{v.detailPage=0;h.go('gear-recipe');},h.busy,false,'smith-tab');
 }
 private trade(h:PanelHost,v:GearView,tab:SmithTab,x:number,y:number,w:number,height:number,short:boolean){
  paperSurface(h,{x,y,w,h:height});const id=v.weaponId;
  if(!id){h.text('SmithTradeEmpty','点选货架上的武备查看报价',x+24,y+14,w-48,height-28,16,C.muted,true);return;}
  const q=smithQuote(h.state,tab,id,this.amount),name=itemNames[id]||id,titleW=w*(short?.29:.33),art=short?0:78,titleX=x+(short?16:100);
  if(art)h.image('items/'+id,x+52,y+height/2,art,art);
  h.text('SmithTradeName',name+(tab==='diagrams'?'图纸':''),titleX,y+10,titleW-(titleX-x)-8,30,short?16:23);
  h.text('SmithTradeCount',tab==='diagrams'?'永久学会 · 不会消耗':(tab==='sell'?'出售':'购买')+'数量 '+q.amount+' 件',titleX,y+(short?34:42),titleW-(titleX-x)-8,short?18:26,short?12:16,C.muted);
  const qtyX=x+titleW,qtyY=y+(short?13:26),numberW=short?36:62;
  if(tab!=='diagrams'){
   const change=(n:number)=>{this.amount=Math.max(1,Math.min(Math.max(1,q.max),this.amount+n));v.confirm='';h.redraw(true);};
   h.button('smith-minus','−',qtyX,qtyY,44,44,()=>change(-1),h.busy||q.amount<=1,false,'smith-tab',{label:'减少交易数量'});
   h.text('SmithAmount',String(q.amount),qtyX+46,qtyY,numberW,44,18,C.ink,true);
   h.button('smith-plus','+',qtyX+48+numberW,qtyY,44,44,()=>change(1),h.busy||q.amount>=q.max,false,'smith-tab',{label:'增加交易数量'});
  }
  const actionW=w*(short?.28:.27),actionX=x+w-actionW-18,actionY=y+(short?13:26),totalX=qtyX+100+numberW+16;
  const feedback=h.error||h.notice||(q.known?'图纸已学会，无需重复购买':q.missing?'还差 '+formatMoney(q.missing):q.unloads?'出售最后一件会自动卸下':tab==='sell'?'确认后移出行囊':tab==='diagrams'?'学会后到锻造工作台核对材料打造':'购买后可在行囊中装备');
  if(!short&&actionX-totalX>115){h.text('SmithTotal',q.known?'图纸已学会':(tab==='sell'?'获得 ':'需要 ')+formatMoney(q.total),totalX,y+18,actionX-totalX-12,30,19);h.text('SmithBalanceAfter',q.known?'无需再次支付':q.missing?'还差 '+formatMoney(q.missing):'交易后 '+formatMoney(q.after),totalX,y+52,actionX-totalX-12,26,15,q.missing?C.danger:C.muted);}
  const action=tab==='diagrams'?'buy-blueprint':tab==='sell'?'sell-gear':'buy-gear';
  const label=h.processing?'交易中…':q.known?'已学会':tab==='diagrams'?'购买图纸 · '+formatMoney(q.total):tab==='sell'?(v.confirm===id?'确认出售':'出售 '+q.amount+' 件')+' · '+formatMoney(q.total):'购买 '+q.amount+' 件 · '+formatMoney(q.total);
  const button=h.button(action,label,actionX,actionY,actionW,short?44:54,()=>{if(tab==='sell'&&v.confirm!==id){v.confirm=id;h.redraw();}else void this.commit(h,v,tab);},h.busy||this.sending||!q.valid,true,'shop-action');button.fontSize=short?13:17;
  h.text('SmithTradeFeedback',!short&&q.missing&&!h.error&&!h.notice?'':feedback,x+18,y+height-(short?22:26),w-36,short?18:22,short?12:14,h.error||q.missing?C.danger:C.muted);
 }
 private async commit(h:PanelHost,v:GearView,tab:SmithTab){
  const id=v.weaponId,q=smithQuote(h.state,tab,id,this.amount);if(h.busy||this.sending||!q.valid)return;
  this.sending=true;const save=h.saveId;
  try{const ok=await h.send(tab==='diagrams'?'blueprint_buy':tab==='sell'?'gear_sell':'gear_buy',{target:h.state.combat!.gear_shop!.target,item:id,...(tab==='diagrams'?{}:{amount:q.amount})});if(ok&&save===h.saveId){this.amount=1;v.confirm='';}}
  finally{this.sending=false;h.redraw();}
 }
}
