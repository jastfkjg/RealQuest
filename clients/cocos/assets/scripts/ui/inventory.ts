import type {PanelHost} from './panels';
import {InventoryPreferences,itemIntent,itemAmounts,type PreferenceStorage,type ItemIntent} from '../core/inventory';
import {itemDefinitions,itemNames} from '../core/items';
import {shortText,textPages} from '../core/lifeRecords';
import {C} from './theme';
import {currentMap} from '../core/navigation';
import type {DropArea} from './drag';
export class InventoryView {
 readonly preferences:InventoryPreferences;
 private view='main';private all=false;private page=0;private leaf=0;private pocket=-1;private legacy=0;
 private detailOpen=false;private sorting=false;private hint='';
 private detailText='';private detailPages=1;
 private draft:{saveId:string;intent:ItemIntent;back:string;location:string}|null=null;private feedback='';
 constructor(storage:PreferenceStorage){this.preferences=new InventoryPreferences(storage);}
 get quick(){return this.preferences.value.quick;}
 get selected(){return this.preferences.value.selected;}
 init(h:PanelHost){if(this.preferences.saveId!==h.saveId){this.preferences.enter(h.saveId);this.opened();this.page=this.leaf=0;this.draft=null;}}
 snapshot(){return {inventoryDetailsOpen:this.detailOpen,inventorySorting:this.sorting,inventoryHint:this.hint,inventoryOffset:this.preferences.value.offset,inventoryTray:this.preferences.value.tray,inventoryView:this.view,inventoryAll:this.all,inventoryPage:this.page,inventoryPocket:this.pocket,inventoryWarning:this.preferences.warning,inventoryDetailPage:this.leaf,inventoryDetailPages:this.detailPages,inventoryDetailText:this.detailText,inventoryDraft:this.draft?{item:this.draft.intent.item,target:this.draft.intent.data?.target,location:this.draft.location,costs:this.draft.intent.costs,gains:this.draft.intent.gains,seconds:this.draft.intent.seconds,signature:this.draft.intent.signature}:null};}
 opened(){this.view='main';this.detailOpen=false;this.sorting=false;this.pocket=-1;this.feedback=this.hint='';}
 clearPreview(){this.draft=null;}
 deleted(){this.preferences.deleted(this.preferences.saveId);this.draft=null;this.opened();}
 target(h:PanelHost){const d=this.draft;return d&&d.saveId===h.saveId&&d.location===h.state.location?currentMap(h.world,h.state,h.now).objects.find(o=>o.id===d.intent.data?.target)||null:null;}
 dismiss(h:PanelHost){
  if(h.mode==='item-confirm'){this.cancel(h);return true;}
  if(h.mode!=='inventory')return false;
  if(this.view!=='main'){const previous=this.view;this.view='main';this.detailOpen=previous==='uses';h.focus(previous==='uses'?'item-uses':previous==='wallet'?'inventory-wallet':previous==='layout'?'inventory-move':'item-legacy');return true;}
  if(this.detailOpen){this.detailOpen=false;h.focus('item-'+this.selected);return true;}
  if(this.sorting){this.sorting=false;h.focus('inventory-sort');return true;}return false;
 }
 private cancel(h:PanelHost){const d=this.draft;this.draft=null;h.go(d?.back||'inventory',true);this.detailOpen=d?.back!=='world';}
 private select(h:PanelHost,id:string){this.feedback=this.hint='';this.preferences.select(id);this.view='main';this.detailOpen=true;this.pocket=this.quick.indexOf(id);this.leaf=0;h.redraw(true);}
 activate(h:PanelHost,slot:number){
  this.init(h);const id=this.quick[slot];this.feedback='';
  if(!id){h.go('inventory');this.pocket=slot;this.hint='先点选物品，再点口袋放入';return;}
  this.preferences.select(id);const intent=itemIntent(h.world,h.state,h.now,id);
  if(id==='seed'&&intent.command&&!intent.reason)this.preview(h,intent,'world');
  else{h.go('inventory');this.view='main';this.detailOpen=true;this.pocket=slot;}
 }
 private preview(h:PanelHost,intent:ItemIntent,back='inventory'){this.feedback='';this.draft={saveId:h.saveId,intent,back,location:h.state.location};h.go('item-confirm');}
 draw(h:PanelHost){
  this.init(h);this.detailText='';this.detailPages=1;if(h.mode==='item-confirm'){this.confirm(h);return;}
  const owned=Object.keys(itemDefinitions).filter(id=>h.state.inventory[id]>0),ids=this.preferences.items(this.all?Object.keys(itemDefinitions):owned),short=h.height<500;
  const bw=Math.min(640,h.width-328),height=Math.min(500,h.height-24),reserve=296,w=bw+reserve,cx=(h.width-w)/2,cy=(h.height-height)/2;
  const offset=this.preferences.value.offset,x=Math.max(12,Math.min(h.width-w-12,cx+offset.x)),y=Math.max(12,Math.min(h.height-height-12,cy+offset.y));
  const position=(dx:number,dy:number)=>{const xx=Math.max(12,Math.min(h.width-w-12,x+dx)),yy=Math.max(12,Math.min(h.height-height-12,y+dy));this.preferences.position(xx-cx,yy-cy);h.redraw();};
  h.region('inventory-layout',x,y,w,height);h.region('inventory-bag',x+20,y+4,bw-40,height-16);
  h.image('ui/satchel',x+bw/2,y+height/2,bw,height,true);
  const titleW=Math.min(260,bw-140),titleX=x+(bw-titleW)/2;
  h.box('SatchelTitle',titleX,y+4,titleW,44,C.wood,5);
  h.button('inventory-move','',titleX,y+4,titleW,44,()=>{this.view='layout';this.detailOpen=false;h.redraw();},h.busy,false,'hud',{label:'摆放行囊，可拖动标题移动，或点击调整位置'});
  h.text('InventoryTitle','旅人的行囊',titleX+4,y+4,titleW-8,44,short?18:22,C.paper,true);
  h.drag('inventory-move',{panel:true,drop:(_x,_y,dx,dy)=>position(dx,dy)});
  const close=h.button('close','×',x+bw-64,y+5,44,44,()=>h.close(),h.busy,false,'hud',{label:'收起行囊'});close.fontSize=26;
  const walletW=Math.min(this.preferences.legacy().length?140:176,bw-160),gold='金币 '+(h.state.inventory.gold||0),extras=[h.state.energy>0?'能量 '+h.state.energy:'',h.state.knowledge_shard>0?'碎片 '+h.state.knowledge_shard:''].filter(Boolean).join(' · ');
  const wallet=h.button('inventory-wallet',gold+(extras?'\n'+extras:''),x+28,y+58,walletW,44,()=>{this.view='wallet';this.detailOpen=false;h.redraw(true);},h.busy,false,'game');wallet.fontSize=extras?13:16;wallet.lineHeight=20;wallet.string=shortText(gold,Math.floor((walletW-16)/14))+(extras?'\n'+shortText(extras,Math.floor((walletW-16)/14)):'');
  h.button('inventory-group',this.all?'物品图鉴':'随身物品',x+bw-116,y+58,88,44,()=>{this.all=!this.all;this.page=0;this.detailOpen=false;this.sorting=false;this.view='main';h.redraw();},h.busy,false,'game');
  const cell=short?48:64,gap=8,columns=Math.min(6,Math.floor((bw-56+gap)/(cell+gap))),rows=Math.max(1,Math.floor((height-254)/(cell+gap))),per=columns*rows,pages=Math.max(1,Math.ceil(ids.length/per));this.page=Math.min(this.page,pages-1);
  const gridW=columns*(cell+gap)-gap,gx=x+(bw-gridW)/2,gy=y+110;
  h.box('InventoryTray',gx-7,gy-7,gridW+14,rows*(cell+gap)+6,'#dee3cf24',6);
  const targets:DropArea[]=Array.from({length:per},(_,i)=>({id:'tray:'+String(this.page*per+i),x:gx+(i%columns)*(cell+gap),y:gy+Math.floor(i/columns)*(cell+gap),w:cell,h:cell}));
  targets.forEach(t=>h.region('inventory-cell-'+t.id.slice(5),t.x,t.y,t.w,t.h));
  const qw=(bw-64)/4,qh=short?48:56,qy=y+height-qh-16;
  for(let i=0;i<4;i++)targets.push({id:'quick:'+i,x:x+24+i*(qw+5),y:qy,w:qw,h:qh});
  const dropAreas=this.all?targets.filter(t=>t.id.startsWith('quick:')):targets;
  const drag=(control:string,item:string,from?:number)=>h.drag(control,{item,targets:dropAreas,drop:(px,py)=>{
   const t=dropAreas.find(t=>px>=t.x&&px<=t.x+t.w&&py>=t.y&&py<=t.y+t.h);if(!t)return;
   if(t.id.startsWith('quick:')){const slot=Number(t.id.slice(6));if(from!==undefined)this.preferences.swapQuick(from,slot);else this.preferences.bind(slot,item,h.state.inventory);this.pocket=slot;this.hint='已放入第'+(slot+1)+'格';}
   else{this.preferences.place(item,Number(t.id.slice(5)),owned);if(from!==undefined)this.preferences.clear(from);this.pocket=this.quick.indexOf(item);this.hint='已放好 '+itemNames[item];}
   this.preferences.select(item);h.redraw(true);
  }});
  for(let i=0;i<per;i++){
   const id=ids[this.page*per+i],xx=gx+(i%columns)*(cell+gap),yy=gy+Math.floor(i/columns)*(cell+gap);
   if(!id){h.box('EmptyTraySlot',xx,yy,cell,cell,'#dce1c918',5);continue;}
   const count=h.state.inventory[id]||0,selected=(this.detailOpen||this.sorting)&&this.selected===id;
   h.itemSlot('item-'+id,id,xx,yy,cell,cell,count,selected,()=>this.select(h,id));if(count>0&&!this.all)drag('item-'+id,id);
  }
  if(!ids.some(Boolean))h.text('EmptyInventory','行囊暂时空着，沿途收集的物品会放在这里。',gx+8,gy,gridW-16,64,15,C.paper);
  const row=y+height-144,canBind=this.detailOpen&&this.view==='main'&&!this.all&&(h.state.inventory[this.selected]||0)>0,canClear=this.pocket>=0&&!!this.quick[this.pocket];
  if(this.sorting){
   const index=ids.indexOf(this.selected),move=(delta:number)=>{if(this.preferences.place(this.selected,index+delta,owned)){this.page=Math.floor((index+delta)/per);h.redraw(true);}};
   h.button('item-prev','←',x+28,row,44,44,()=>move(-1),h.busy||index<=0,false,'game',{label:'将选中物品移到前一格'});
   h.button('item-next','→',x+80,row,44,44,()=>move(1),h.busy||index<0||index>=per*pages-1,false,'game',{label:'将选中物品移到后一格'});
   h.text('ArrangeSelection',shortText(itemNames[this.selected]||'点选物品',Math.floor((bw-280)/14)),x+136,row,bw-280,44,14,C.paper);
  }else if(pages>1){
   h.button('inventory-next',(this.page+1)+'/'+pages+' ›',x+28,row,68,44,()=>{this.page=(this.page+1)%pages;h.redraw();},h.busy,false,'page',{label:'物品翻页 '+(this.page+1)+'/'+pages});
  }else{
   const hint=this.preferences.warning||this.hint||(canBind?'点口袋放入':'拖动放置 · 点选查看');
   const display=this.preferences.warning?(this.preferences.warning.includes('当前窗口')?'仅窗口内保留，关闭后需重排':'本机偏好不可读，可继续整理'):hint;
   const hintW=bw-(canClear?292:168);const label=h.text('InventoryHint',hint,x+28,row,hintW,44,13,C.paper);label.string=textPages(display,Math.max(6,Math.floor(hintW/13)),2)[0];label.lineHeight=20;
  }
  if(canClear&&!this.sorting)h.button('pocket-clear','移出第'+(this.pocket+1)+'格',x+bw-248,row,112,44,()=>{this.preferences.clear(this.pocket);this.pocket=-1;this.hint='已移出随手口袋';h.redraw(true);},h.busy,false,'game');
  h.button('inventory-sort',this.sorting?'完成整理':'整理物品',x+bw-128,row,104,44,()=>{this.sorting=!this.sorting;this.view='main';this.detailOpen=false;this.hint='';h.redraw();},h.busy||this.all||!owned.length,this.sorting,'game');
  h.text('PocketsTitle','随手口袋 · 1–4',x+28,qy-26,bw-56,22,13,C.paper);
  this.quick.forEach((id,i)=>{
   const hint=canBind?'放入选中的'+itemNames[this.selected]:id?'查看'+itemNames[id]:'先点选物品，再点此格放入';
   h.itemSlot('quick-'+i,id,x+24+i*(qw+5),qy,qw,qh,id?h.state.inventory[id]||0:0,this.pocket===i,()=>{
    this.pocket=i;
    if(canBind){this.preferences.bind(i,this.selected,h.state.inventory);this.hint='已放入第'+(i+1)+'格';h.redraw(true);}
    else if(id)this.select(h,id);
    else{this.hint='先点选物品，再点口袋放入';h.redraw();}
   },true,i+1,hint);
   if(id&&(h.state.inventory[id]||0)>0)drag('quick-'+i,id,i);
  });
  if(this.preferences.legacy().length)h.button('item-legacy','旧快捷栏',x+176,y+58,88,44,()=>{this.view='legacy';this.detailOpen=false;this.legacy=0;h.redraw();},h.busy,false,'page');
  if(!this.detailOpen&&this.view==='main')return;
  const tw=this.view==='main'?264:280,th=this.view==='main'?200:Math.min(this.view==='uses'?420:336,height),tx=x+bw+16,ty=Math.max(12,Math.min(h.height-th-12,y+98));
  h.region('inventory-tag',tx,ty,tw,th);h.box('InventoryTagShadow',tx-2,ty+3,tw+4,th,C.wood,6);h.box('InventoryTag',tx,ty,tw,th,C.paper,5);
  h.line('ItemTagPointer',[{x:tx,y:ty+58},{x:tx-10,y:ty+64},{x:tx,y:ty+70}],C.paper,3);
  const id=this.selected,def=itemDefinitions[id],count=h.state.inventory[id]||0,special=this.view==='wallet'||this.view==='layout'||this.view==='legacy';
  h.image('items/'+(this.view==='wallet'?'gold':this.view==='layout'?'backpack':this.view==='legacy'?'journal':id),tx+38,ty+38,44,44);
  h.text('TagName',this.view==='wallet'?'随身物资':this.view==='layout'?'摆放行囊':this.view==='legacy'?'旧快捷栏':def.name,tx+68,ty+10,tw-128,32,20);
  h.text('TagCount',special?this.view==='wallet'?'金币与特殊资源':this.view==='layout'?'拖动标题或点按方向':'选择来源后带入本旅程':'持有 '+count+' 份',tx+68,ty+43,tw-84,28,14,C.muted);
  const tagClose=h.button('item-details-close','×',tx+tw-50,ty+4,44,44,()=>{this.view='main';this.detailOpen=false;h.focus('item-'+id);},h.busy,false,'page',{label:'收起物品详情'});tagClose.fontSize=24;
  if(this.view==='wallet'){
   const body='金币 '+(h.state.inventory.gold||0)+'\n能量 '+h.state.energy+'\n知识碎片 '+h.state.knowledge_shard;this.detailText=body;
   h.text('WalletAmounts',body,tx+16,ty+92,tw-32,144,20);h.button('tag-back','收好钱袋',tx+16,ty+th-58,tw-32,44,()=>{this.view='main';h.focus('inventory-wallet');},h.busy,false,'game');
  }else if(this.view==='layout'){
   const buttons=[['left','← 左移',-48,0],['right','右移 →',48,0],['up','↑ 上移',0,-48],['down','下移 ↓',0,48]] as const;
   buttons.forEach(([key,label,dx,dy],i)=>h.button('bag-'+key,label,tx+16+(i%2)*(tw-24)/2,ty+112+Math.floor(i/2)*52,(tw-40)/2,44,()=>position(dx,dy),h.busy,false,'game'));
   h.button('bag-center','居中归位',tx+16,ty+th-58,(tw-40)/2,44,()=>{this.preferences.position(0,0);h.redraw();},h.busy,false,'game');
   h.button('tag-back','摆放好了',tx+24+(tw-40)/2,ty+th-58,(tw-40)/2,44,()=>{this.view='main';h.redraw();},h.busy,false,'game');
  }else if(this.view==='legacy')this.legacyView(h,tx,ty,tw,th);
  else if(this.view==='uses'){
   const body=def.description+'\n来源：'+def.source+'\n用途：'+def.use+(id==='seed'?'\n本旅程成熟需'+(h.state.buildings.home>=2?45:60)+'秒，离线照常生长。':'');
   const lines=Math.max(2,Math.floor((th-160)/24)),pages=textPages(body,Math.floor((tw-32)/16),lines);this.leaf=Math.min(this.leaf,pages.length-1);this.detailPages=pages.length;this.detailText=pages[this.leaf];
   h.text('ItemUses',pages[this.leaf],tx+16,ty+84,tw-32,lines*24,16);
   h.button('uses-next','翻页 '+(this.leaf+1)+'/'+pages.length,tx+16,ty+th-58,(tw-40)/2,44,()=>{this.leaf=(this.leaf+1)%pages.length;h.redraw();},h.busy||pages.length===1,false,'game');
   h.button('tag-back','看物品',tx+24+(tw-40)/2,ty+th-58,(tw-40)/2,44,()=>{this.view='main';h.redraw();},h.busy,false,'game');
  }else{
   const intent=itemIntent(h.world,h.state,h.now,id),message=h.error||this.feedback||intent.reason||def.summary;
   const body=h.text('ItemPurpose',textPages(message,Math.floor((tw-32)/15),2)[0],tx+16,ty+82,tw-32,44,15,h.error?C.danger:C.ink);body.lineHeight=21;
   const action=h.button('item-action',intent.label,tx+16,ty+140,132,44,()=>{if(intent.command)this.preview(h,intent);else if(intent.target)h.mark(intent.target,def.name);else if(intent.mode)h.go(intent.mode);},h.busy||!!intent.reason&&!intent.target&&!intent.mode,true,'game');action.fontSize=14;
   const uses=h.button('item-uses','用途与来源',tx+156,ty+140,tw-172,44,()=>{this.view='uses';this.leaf=0;h.redraw(true);},h.busy,false,'page');uses.fontSize=14;
  }
 }
 private legacyView(h:PanelHost,x:number,y:number,w:number,height:number){
  const all=this.preferences.legacy(),c=all[this.legacy%Math.max(1,all.length)];if(!c){this.view='main';h.redraw();return;}
  const body=c.label+'\n'+c.quick.map((id,i)=>(i+1)+' · '+(id?itemNames[id]:'空格')).join('\n')+'\n仅带入当前旅程，不改变物品。';
  const label=h.text('LegacyQuickPreview',textPages(body,Math.floor((w-32)/14),7)[0],x+16,y+84,w-32,168,14);label.lineHeight=21;
  const ww=(w-48)/3;
  h.button('legacy-source','换来源',x+16,y+height-58,ww,44,()=>{this.legacy++;h.redraw();},h.busy||all.length<2,false,'game');
  h.button('legacy-apply','带入本旅程',x+24+ww,y+height-58,ww,44,()=>{this.preferences.importLegacy(c.key);this.view='main';this.detailOpen=false;this.hint='已带入本旅程';h.redraw(true);},h.busy,true,'game');
  h.button('tag-back','先保留',x+32+ww*2,y+height-58,ww,44,()=>{this.view='main';this.detailOpen=false;h.redraw();},h.busy,false,'game');
 }
 private async commit(h:PanelHost){
  const draft=this.draft;if(h.busy||!draft||draft.saveId!==h.saveId)return;
  const live=itemIntent(h.world,h.state,h.now,draft.intent.item);if(live.signature!==draft.intent.signature||live.reason){h.redraw();return;}
  if(await h.send(live.command!,live.data)){if(h.saveId!==draft.saveId||this.draft!==draft||h.mode!=='item-confirm')return;this.feedback=h.notice;this.draft=null;h.go(draft.back,true);}
 }
 private confirm(h:PanelHost){
  const d=this.draft,w=Math.min(304,h.width-32),height=Math.min(336,h.height-24),x=h.width-w-16,y=(h.height-height)/2;
  h.box('ItemConfirmWood',x-3,y+3,w+6,height,C.wood,8);h.box('ItemConfirmPaper',x,y,w,height,C.paper,6);
  if(!d||d.saveId!==h.saveId){h.text('StaleItemDraft','操作预览已过期，请重新选择物品。',x+24,y+24,w-48,70,18);h.button('close','返回行囊',x+24,y+height-62,w-48,44,()=>h.go('inventory',true),h.busy);return;}
  const live=itemIntent(h.world,h.state,h.now,d.intent.item),valid=live.signature===d.intent.signature&&!live.reason;
  const target=this.target(h),plot=target?.kind==='plot'?h.world.objects.filter(o=>o.kind==='plot').findIndex(o=>o.id===target.id)+1:0,targetName=(target?.name||String(d.intent.data?.target))+(plot?' '+plot:'');
  h.text('ItemConfirmTitle',d.intent.label,x+24,y+16,w-48,36,22);
  const quote=targetName+'\n消耗：'+itemAmounts(d.intent.costs)+'\n获得：'+(d.intent.command==='plant'?'已播种农田 · '+d.intent.seconds+'秒成熟':itemAmounts(d.intent.gains));
  const body=quote+'\n'+(h.error||(!valid?'目标或报价已变化，请取消后重选。':'库存以服务器确认结果为准。'));
  h.text('ItemConfirmQuote',textPages(body,Math.floor((w-48)/16),8)[0],x+24,y+62,w-48,height-132,16,h.error||!valid?C.danger:C.ink);
  h.button('item-cancel','先等等',x+24,y+height-62,(w-56)/2,44,()=>this.cancel(h),h.busy,false,'game');
  const retry=['offline','uncertain','unauthorized'].includes(h.connection);
  h.button(retry?'item-reconnect':'item-confirm',retry?'重连核对':'确认'+(d.intent.command==='plant'?'播种':'操作'),x+32+(w-56)/2,y+height-62,(w-56)/2,44,()=>retry?h.reconnect():this.commit(h),retry?h.processing:h.busy||!valid,true,'game');
 }
}
