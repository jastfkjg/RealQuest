import {formatMoney} from '../core/currency';
import type {PanelHost} from './panels';
import type {InventoryPreferences} from '../core/inventory';
import {itemNames} from '../core/items';
import {seedCrop} from '../core/farming';
import {C} from './theme';
import {paperSurface,timberSurface} from './materials';
import {pageOf,stockIds,shopCategories,shopCategory,ShopModel,type ShopSide} from './shopModel';

export class ShopPanels {
 readonly model=new ShopModel();private orderId='';private ordersPage=0;private sending=false;private categoryPage=0;
 private productCount=0;private productPages=1;private bagPages=1;
 constructor(private inventory:InventoryPreferences){}
 snapshot(){return {...this.model.snapshot(),shopProductCount:this.productCount,shopPages:this.productPages,shopBagPages:this.bagPages};}
 handles(mode:string){return mode==='shop'||mode==='shop-orders';}
 private choose(h:PanelHost,side:ShopSide,id:string){this.model.select(side,id,h.state.market!);h.redraw(true);}
 draw(h:PanelHost){
  const market=h.state.market;if(!market)return;
  this.inventory.enter(h.saveId);
  const owned=Object.keys(h.state.inventory).filter(id=>id!=='gold'&&h.state.inventory[id]>0);
  this.model.enter(h.saveId,market,h.state.inventory,this.inventory.items(owned));
  if(h.mode==='shop-orders'){this.orders(h);return;}
  const m=this.model,short=h.height<500,narrow=h.width<1100;
  // A shop scene surrounds the counter; its controls stay in screen coordinates.
  const bg=Math.max(h.width/1672,h.height/941);
  h.image('ui/shop-interior',h.width/2,h.height/2,1672*bg,941*bg);
  h.box('ShopAtmosphere',0,0,h.width,h.height,'#15291d18',0);
  const w=Math.min(1440,h.width-(short?24:narrow?32:96)),height=Math.min(840,h.height-(short?12:32));
  const x=(h.width-w)/2,y=(h.height-height)/2,header=short?48:narrow?96:124,trade=short?104:140;
  const bodyY=y+header,tradeY=y+height-trade,bodyBottom=tradeY-8;
  const lx=x+16,lw=Math.floor((w-48)*.59),bx=lx+lw+12,bw=x+w-16-bx;
  h.region('shop-counter',x,y,w,height);
  timberSurface(h,{x,y:bodyY-12,w,h:height-header+12});
  this.header(h,x,y,w,header,short);
  h.region('shop-stock',lx,bodyY,lw,bodyBottom-bodyY);
  h.box('ShelfRecess',lx,bodyY,lw,bodyBottom-bodyY,'#302017d9',2);
  h.box('ShelfInnerLight',lx+6,bodyY+4,lw-12,bodyBottom-bodyY-8,'#70563e55',1);
  // The cloth keeps a compact, nearly square silhouette instead of stretching to fill.
  h.image('ui/satchel',bx+bw/2,bodyY+(bodyBottom-bodyY)/2,bw,bodyBottom-bodyY,true);
  h.region('shop-satchel',bx+14,bodyY+10,bw-28,bodyBottom-bodyY-20);
  if(!short){
   h.box('BagPlaqueShadow',bx+bw*.2+3,bodyY+8,bw*.6,44,'#15291d66',2);
   paperSurface(h,{x:bx+bw*.2,y:bodyY+4,w:bw*.6,h:44});
   h.image('items/seed',bx+bw*.2+24,bodyY+26,24,24);
  }
  h.text('ShopBagTitle','我的行囊',bx+36,bodyY+(short?0:4),bw-64,short?24:44,short?16:22,short?C.paper:C.ink,true);
  const cats=shopCategories.filter(([id])=>id==='all'||Object.keys(market.buy).some(item=>shopCategory(item)===id));
  if(!cats.some(c=>c[0]===m.category))m.category='all';
  const navY=bodyY+2,navH=44;
  if(m.search){
   h.field('shop-query','查找商品',m.query,lx+6,navY,lw-110,value=>{m.find(value);h.redraw();},false,40,true);
   h.button('shop-search-clear','返回分类',lx+lw-98,navY,92,44,()=>{m.search=false;m.find('');h.redraw(true);},h.busy,false,'shop-tab');
  }else{
   const searchW=short?56:76,limit=Math.max(1,Math.floor((lw-searchW-74)/90)),overflow=cats.length>limit;
   const categoryWindow=pageOf(cats,this.categoryPage,overflow?limit:cats.length);this.categoryPage=categoryWindow.index;
   const shown=categoryWindow.ids,tw=Math.min(118,(lw-searchW-18-(overflow?50:0)-(shown.length-1)*6)/shown.length);
   const icons:Record<string,string>={all:'seed',seed:'seed_wheat',material:'wood',food:'crop',tool:'stone_hammer',gear:'stone_sword',other:'animal_feed'};
   shown.forEach(([id,label],i)=>{
    const xx=lx+6+i*(tw+6),button=h.button('shop-category-'+id,label,xx,navY,tw,44,()=>{m.filter(id);h.redraw(true);},h.busy,m.category===id,'shop-tab',{label:'商品分类：'+label,pressed:m.category===id});
    if(!short&&tw>=90){button.string='';h.image('items/'+icons[id],xx+21,navY+22,26,26);h.text('ShopCategoryLabel',label,xx+38,navY,tw-44,44,16,m.category===id?C.paper:C.ink,true);}
   });
   if(overflow)h.button('shop-categories-next','›',lx+lw-searchW-56,navY,44,44,()=>{this.categoryPage=(categoryWindow.index+1)%categoryWindow.pages;h.redraw(true);},h.busy,false,'shop-tab',{label:'查看更多商品分类'});
   h.button('shop-search','查找',lx+lw-searchW-6,navY,searchW,44,()=>{m.search=true;h.redraw(true);h.focus('shop-query');},h.busy,false,'shop-tab');
  }
  const gridY=navY+navH+8,pagerY=bodyBottom-44,columns=4,gridH=pagerY-gridY-4;
  const rows=Math.max(1,Math.min(3,Math.floor(gridH/(short?70:118)))),rh=gridH/rows,cw=(lw-12)/columns;
  const all=stockIds(market,m.category,m.query),stock=pageOf(all,m.page,columns*rows);
  m.page=stock.index;this.productCount=all.length;this.productPages=stock.pages;m.visible('buy',stock.ids);
  for(let row=0;row<rows;row++){
   const sy=gridY+(row+1)*rh-11;
   h.box('ShelfCastShadow'+row,lx+6,sy+9,lw-12,8,'#15291d66',0);
   h.box('ShelfPlank'+row,lx+4,sy,lw-8,12,C.wood,1);
   h.box('ShelfLip'+row,lx+4,sy,lw-8,3,'#bd9259',0);
   h.box('ShelfGrain'+row,lx+8,sy+7,lw-16,1,'#70563e',0);
  }
  stock.ids.forEach((id,i)=>{
   const xx=lx+6+(i%columns)*cw,yy=gridY+Math.floor(i/columns)*rh,cellW=cw-8,cellH=rh-14;
   const selected=m.selected?.side==='buy'&&m.selected.item===id;
   h.button('select-buy:'+id,'',xx,yy,cellW,cellH,()=>this.choose(h,'buy',id),h.busy,selected,'shop-item',{label:(itemNames[id]||id)+'，单价 '+formatMoney(market.buy[id])+'，点选购买',pressed:selected});
   const art=Math.min(112,Math.max(24,Math.floor((cellH-42)/8)*8)),labelY=yy+cellH-43,tagW=Math.min(cellW-8,158),tagX=xx+(cellW-tagW)/2;
   h.box('StockShadow',xx+cellW*.25,labelY-5,cellW*.5,8,'#15291d66',5);
   if(h.hasArt('items/'+id))h.image('items/'+id,xx+cellW/2,yy+art/2+2,art,art);
   else h.text('MissingStockArt','暂无图',xx+6,yy+4,cellW-12,art,14,C.paper,true);
   // Small paper labels sit on the shelf lip, close to the product.
   h.box('TagShadow',tagX+1,labelY+2,tagW,24,'#15291d66',2);
   h.box('StockTag',tagX,labelY,tagW,24,C.paper,2);
   h.box('TagEdge',tagX+2,labelY+22,tagW-4,1,C.wood,0);
   if(!short){h.box('TagPin',tagX+3,labelY+9,3,3,C.wood,1);h.box('TagPin',tagX+tagW-6,labelY+9,3,3,C.wood,1);}
   h.text('StockName',itemNames[id]||id,tagX+6,labelY,tagW-12,24,short||narrow?13:16,C.ink,true);
   if(!short){h.image('items/gold',xx+cellW/2-33,labelY+33,20,20);h.text('StockPrice',formatMoney(market.buy[id]),xx+cellW/2-18,labelY+23,70,22,15,C.paper);}
   else h.text('StockPrice',formatMoney(market.buy[id]),xx+4,labelY+24,cellW-8,20,13,C.paper,true);
  });
  if(!all.length)h.text('ShopEmpty',m.query?'没有找到该商品，试试其他名称。':'这个分类暂时没有在售商品。',lx+20,gridY,lw-40,Math.min(76,gridH),16,C.paper,true);
  if(stock.pages>1){
   const pw=short?64:112;
   h.button('shop-prev',short?'‹':'‹ 上一页',lx+6,pagerY,pw,44,()=>{m.page--;m.visible('buy',[]);h.redraw(true);},h.busy||stock.index===0,false,'shop-tab',{label:'商品上一页'});
   h.text('ShopPagination',`${stock.index+1} / ${stock.pages} 页 · 共 ${all.length} 件`,lx+pw+12,pagerY,lw-pw*2-24,44,short?13:15,C.paper,true);
   h.button('list-next',short?'›':'下一页 ›',lx+lw-pw-6,pagerY,pw,44,()=>{m.page++;m.visible('buy',[]);h.redraw(true);},h.busy||stock.index===stock.pages-1,false,'shop-tab',{label:'商品下一页'});
  }else h.text('ShopStockCount','在售 '+all.length+' 件',lx+12,pagerY,lw-24,44,14,C.paper,true);
  this.bag(h,bx,bodyY,bw,bodyBottom-bodyY,short);
  this.trade(h,x+10,tradeY,w-20,trade,short);
 }
 private header(h:PanelHost,x:number,y:number,w:number,header:number,short:boolean){
  const titleW=short?184:Math.min(360,w*.28),titleY=y+(short?0:24);
  timberSurface(h,{x:x+8,y:titleY,w:titleW,h:short?44:header-28});
  if(!short){h.image('interiors/planter',x+22,titleY+28,48,64);h.image('interiors/lantern',x+titleW-14,titleY+28,40,56);}
  h.text('FeatureTitle','风铃杂货铺',x+(short?16:44),titleY,titleW-(short?16:72),short?44:header-28,short?21:30,C.paper,true);
  if(!short){
   const portrait=Math.min(128,header+16),mx=x+titleW+portrait/2+16,speechX=mx+portrait/2+8,speechW=w-titleW-portrait-280;
   h.image('atlas/mira',mx,y+header-portrait/2+4,portrait,portrait);
   if(speechW>=190){paperSurface(h,{x:speechX,y:y+22,w:speechW,h:48});h.text('ShopWelcome','种子在这里，收获也可以卖给我。',speechX+18,y+24,speechW-36,44,16,C.ink,true);h.text('Shopkeeper','店主 · 米拉',speechX+18,y+74,speechW-36,28,15,C.paper);}
  }
  const balanceW=short?116:174,xx=x+w-balanceW-72;
  if(!short){paperSurface(h,{x:xx,y:y+header-68,w:balanceW,h:48});h.image('items/gold',xx+24,y+header-44,26,26);}
  h.text('FeatureBalance','钱袋 '+formatMoney(h.state.inventory.gold||0),xx+(short?6:44),y+(short?0:header-66),balanceW-(short?12:48),44,short?15:18,short?C.paper:C.ink,true);
  h.button('close','收起商店',x+w-58,y+(short?0:header-66),44,44,()=>h.close(),h.busy,false,'satchel-close',{label:'收起商店'});
 }
 private bag(h:PanelHost,x:number,y:number,w:number,height:number,short:boolean){
  const m=this.model,gap=short?6:8,cell=short?48:Math.min(88,Math.floor((w-64-4*gap)/5)),cols=short?Math.max(1,Math.min(5,Math.floor((w-40+gap)/(cell+gap)))):5;
  const top=y+(short?28:66),bottom=y+height-(short?54:120),rows=Math.max(1,Math.min(short?10:3,Math.floor((bottom-top+gap)/(cell+gap)))),per=cols*rows;
  const page=pageOf(m.bag,m.bagPage,per);m.bagPage=page.index;this.bagPages=page.pages;m.visible('sell',page.ids);
  const gx=x+(w-cols*(cell+gap)+gap)/2;
  for(let i=0;i<per;i++){
   const id=page.ids[i],xx=gx+(i%cols)*(cell+gap),yy=top+Math.floor(i/cols)*(cell+gap);
   if(!id){h.box('EmptyShopSlot',xx,yy,cell,cell,'#dce1c91c',5);continue;}
   const price=h.state.market!.sell[id],sell=typeof price==='number';
   h.itemSlot('select-sell:'+id,id,xx,yy,cell,cell,h.state.inventory[id]||0,m.selected?.side==='sell'&&m.selected.item===id,()=>this.choose(h,'sell',id),false,undefined,sell?'出售给米拉，收购单价 '+formatMoney(price):'本店不收购此物',!sell);
  }
  const foot=y+height-(short?50:110),noticeW=short?100:148;
  if(page.pages>1){
   h.button('shop-bag-prev','‹',x+20,foot,44,44,()=>{m.bagPage--;m.visible('sell',[]);h.redraw(true);},h.busy||!page.index,false,'hud',{label:'行囊上一页'});
   h.text('ShopBagPage',`${page.index+1}/${page.pages}`,x+66,foot,w-noticeW-138,44,14,C.paper,true);
   h.button('shop-bag-next','›',x+w-noticeW-70,foot,44,44,()=>{m.bagPage++;m.visible('sell',[]);h.redraw(true);},h.busy||page.index===page.pages-1,false,'hud',{label:'行囊下一页'});
  }else if(!short){
   const selected=m.selected?.side==='sell'?itemNames[m.selected.item]:'';
   h.text('ShopBagHint',selected?'已选择'+selected+'，调整数量后出售':'点选行囊物品，出售给米拉',x+28,foot,w-56,26,16,C.paper);
  }
  if(!short)h.text('ShopBagRule','灰色物品本店不收购',x+28,foot+32,w-noticeW-44,24,14,C.paper);
  const noticeY=short?foot:foot+30;
  if(!short)paperSurface(h,{x:x+w-noticeW-20,y:noticeY-2,w:noticeW,h:52});
  h.button('tab-orders','收购委托 ›',x+w-noticeW-20,noticeY,noticeW,44,()=>h.go('shop-orders'),h.busy,false,'shop-tab');
  if(!m.bag.some(Boolean))h.text('ShopBagEmpty','行囊暂时空着',x+24,top,w-48,44,16,C.paper,true);
 }
 private trade(h:PanelHost,x:number,y:number,w:number,height:number,short:boolean){
  paperSurface(h,{x,y,w,h:height});const m=this.model,s=m.selected,q=m.quote(h.state.market!,h.state.inventory);
  if(!s){h.text('ShopTradeEmpty',h.error||h.notice||q.reason,x+22,y+12,w-44,height-24,16,h.error?C.danger:C.ink,true);return;}
  const titleW=Math.floor(w*(short?.34:.38)),titleX=x+(short?14:114),art=short?0:88;
  if(art)h.image('items/'+s.item,x+58,y+height/2,art,art);
  h.text('TradeItem',(s.side==='sell'?'出售给米拉 · ':'')+(itemNames[s.item]||s.item),titleX,y+8,titleW-(titleX-x)-8,28,short?16:22);
  const price=typeof q.price==='number'?(s.side==='sell'?(short?'收购 ':'收购单价 '):'单价 ')+formatMoney(q.price)+' · 持有 '+q.owned:'本店不收购此物';
  h.text('TradePrice',price,titleX,y+38,titleW-(titleX-x)-8,24,short?12:15,C.muted);
  const crop=seedCrop(s.item),note=s.side==='sell'?q.valid?'出售后剩余 '+Math.max(0,q.remaining)+' 份':'请选择出售数量':crop?'种植 '+crop.level+' 级后可播种 · 现在可购买':'点选数量后确认购买';
  if(!short)h.text('TradeNote',note,titleX,y+66,titleW-(titleX-x)-8,24,14,C.muted);
  const qtyX=x+titleW+8,qtyY=y+(short?34:36),qtyW=short?44:64,maxX=qtyX+44+6+qtyW+6+44+6;
  h.text('ShopQuantity',s.side==='sell'?'出售数量':'购买数量',qtyX,y+5,170,24,14,C.muted);
  const step=(delta:number)=>{m.amount=String(Math.max(1,Math.min(Math.max(1,q.max),(q.valid?q.amount:1)+delta)));h.redraw(true);};
  h.button('trade-minus','−',qtyX,qtyY,44,44,()=>step(-1),h.busy||q.amount<=1,false,'game',{label:'减少交易数量'});
  h.field('trade-amount','交易数量',m.amount,qtyX+50,qtyY,qtyW,value=>{m.amount=value;h.redraw();},true,2,true);
  h.button('trade-plus','+',qtyX+50+qtyW+6,qtyY,44,44,()=>step(1),h.busy||q.amount>=q.max,false,'game',{label:'增加交易数量'});
  if(s.side==='sell')h.button('trade-max','最大',maxX,qtyY,short?48:56,44,()=>{m.amount=String(q.max);h.redraw(true);},h.busy||q.max<1,false,'game');
  const actionW=short?Math.max(150,w*.24):Math.max(260,w*.24),actionX=x+w-actionW-18;
  const buy=s.side==='buy',enabled=!q.reason&&!this.sending;
  const action= h.processing?'交易中…':!q.valid?'请输入数量':!q.price&&q.price!==0?'本店不收购':`${buy?'购买':'出售'} ${q.amount} 份 · ${buy?'':'获得 '}${formatMoney(q.total)}`;
  const button=h.button('trade-confirm',action,actionX,y+(short?34:38),actionW,short?44:52,()=>void this.commit(h),h.busy||!enabled,true,'shop-action');button.fontSize=short?13:16;
  if(!short){
   const totalX=maxX+70,totalW=actionX-totalX-12;
   if(totalW>=115){h.text('TradeTotal',(buy?'支付 ':'获得 ')+(q.valid?formatMoney(q.total):'—'),totalX,y+32,totalW,28,18);h.text('TradeReadiness','余额 '+(q.valid&&!q.reason?formatMoney(q.afterGold):'—'),totalX,y+64,totalW,24,14,C.muted);}
   h.text('TradeLimit',buy?'最多可买 '+q.max+' 份':'本次最多可售 '+q.max+' 份',qtyX,y+84,240,24,14,C.muted);
  }
  const feedback=h.error||h.notice||q.reason||(short?(buy?'余额 '+formatMoney(q.afterGold):'出售后剩余 '+q.remaining+' 份 · 余额 '+formatMoney(q.afterGold)):'');
  if(feedback)h.text('ShopTradeFeedback',feedback,x+18,y+height-(short?26:30),w-36,24,short?12:14,h.error||q.reason?C.danger:C.muted);
 }
 private async commit(h:PanelHost){
  const m=this.model,s=m.selected,q=m.quote(h.state.market!,h.state.inventory);if(h.busy||this.sending||!s||q.reason)return;
  const save=h.saveId,selected=s;this.sending=true;
  try{const ok=await h.send('market_trade',{target:h.context?.id==='mira'?'mira':'shop_counter',side:s.side,item:s.item,amount:q.amount});if(ok&&save===h.saveId&&m.selected===selected){if(s.side==='sell'&&!h.state.inventory[s.item])m.selected=null;else m.amount='1';}}
  finally{this.sending=false;h.redraw();}
 }
 private orders(h:PanelHost){
  const orders=h.state.market!.orders,short=h.height<500,w=Math.min(840,h.width-24),height=Math.min(540,h.height-24),x=(h.width-w)/2,y=(h.height-height)/2;
  timberSurface(h,{x,y,w,h:height});paperSurface(h,{x:x+10,y:y+10,w:w-20,h:height-20});
  h.text('FeatureTitle','小铺收购委托',x+24,y+10,w-140,40,short?20:26);
  h.button('close','返回商店',x+w-112,y+8,88,44,()=>h.close(),h.busy,false,'back');
  const left=Math.floor(w*.34),top=y+66,bottom=y+height-64,per=Math.max(1,Math.floor((bottom-top-46)/54)),page=pageOf(orders,this.ordersPage,per);this.ordersPage=page.index;
  const order=orders.find(o=>o.id===this.orderId)||orders[0];if(!order){h.text('OrdersEmpty','米拉暂时没有收购委托。',x+24,top,w-48,60,18);return;}this.orderId=order.id;
  page.ids.forEach((o,i)=>h.button('select-'+o.id,(o.completed?'已交付 · ':'')+o.title,x+24,top+i*54,left-24,48,()=>{this.orderId=o.id;h.redraw(true);},h.busy,o.id===order.id,'entry'));
  if(page.pages>1)h.button('orders-next',`${page.index+1}/${page.pages} · 下一页`,x+24,bottom-46,left-24,44,()=>{this.ordersPage=(page.index+1)%page.pages;h.redraw();},h.busy,false,'page');
  const dx=x+left+24,dw=w-left-48,held=h.state.inventory[order.item]||0;
  h.text('OrderTitle',order.title,dx,top,dw,36,short?18:23);
  h.image('items/'+order.item,dx+24,top+64,40,40);
  h.text('OrderCosts',`${itemNames[order.item]||order.item} ${held} / ${order.amount} 份\n回礼 ${formatMoney(order.gold)}`,dx+56,top+40,dw-56,60,16);
  if(!short)h.text('OrderNote',order.note+'\n\n按现实日期刷新 · '+h.state.market!.date+'（北京时间）',dx,top+120,dw,150,16,C.muted);
  h.text('OrderFeedback',h.error||h.notice||(short?'现实日期 '+h.state.market!.date:'普通出售不交付委托；交付会消耗指定数量物品。'),dx,bottom-46,dw,40,short?13:14,h.error?C.danger:C.muted);
  h.button('deliver-order',order.completed?'今天已交付':'交付 '+order.amount+' 份 · 获得 '+formatMoney(order.gold),dx,bottom,dw,44,()=>h.send('market_deliver',{target:h.context?.id==='mira'?'mira':'shop_counter',date:h.state.market!.date,order_id:order.id}),h.busy||order.completed||held<order.amount,true);
 }
}
