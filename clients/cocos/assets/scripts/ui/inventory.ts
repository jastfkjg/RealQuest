import {seedCrop} from '../core/farming';
import type {PanelHost} from './panels';
import {InventoryPreferences,itemIntent,itemAmounts,type PreferenceStorage,type ItemIntent} from '../core/inventory';
import {itemDefinitions,itemNames} from '../core/items';
import {shortText,textPages} from '../core/lifeRecords';
import {C} from './theme';
import {currentMap} from '../core/navigation';
import type {DropArea} from './drag';
import {paperSurface,timberSurface} from './materials';
export class InventoryView {
 readonly preferences:InventoryPreferences;
 private view='main';private page=0;private leaf=0;private pocket=-1;private legacy=0;
 private detailOpen=false;private sorting=false;private hint='';
 private detailText='';private detailPages=1;
 private draft:{saveId:string;intent:ItemIntent;back:string;location:string}|null=null;private feedback='';
 constructor(storage:PreferenceStorage){this.preferences=new InventoryPreferences(storage);}
 get quick(){return this.preferences.value.quick;}
 get selected(){return this.preferences.value.selected;}
 init(h:PanelHost){if(this.preferences.saveId!==h.saveId){this.preferences.enter(h.saveId);this.opened();this.page=this.leaf=0;this.draft=null;}}
 snapshot(){return {inventoryDetailsOpen:this.detailOpen,inventorySorting:this.sorting,inventoryHint:this.hint,inventoryOffset:this.preferences.value.offset,inventoryTray:this.preferences.value.tray,inventoryView:this.view,inventoryPage:this.page,inventoryPocket:this.pocket,inventoryWarning:this.preferences.warning,inventoryDetailPage:this.leaf,inventoryDetailPages:this.detailPages,inventoryDetailText:this.detailText,inventoryDraft:this.draft?{item:this.draft.intent.item,target:this.draft.intent.data?.target,location:this.draft.location,costs:this.draft.intent.costs,gains:this.draft.intent.gains,seconds:this.draft.intent.seconds,signature:this.draft.intent.signature}:null};}
 opened(){this.view='main';this.detailOpen=false;this.sorting=false;this.pocket=-1;this.feedback=this.hint='';}
 clearPreview(){this.draft=null;}
 deleted(){this.preferences.deleted(this.preferences.saveId);this.draft=null;this.opened();}
 target(h:PanelHost){const d=this.draft;return d&&d.saveId===h.saveId&&d.location===h.state.location?currentMap(h.world,h.state,h.now).objects.find(o=>o.id===d.intent.data?.target)||null:null;}
 dismiss(h:PanelHost){
  if(h.mode==='item-confirm'){this.cancel(h);return true;}
  if(h.mode!=='inventory')return false;
  if(this.view!=='main'){const previous=this.view;this.view=previous==='legacy'?'layout':'main';this.detailOpen=previous==='uses';h.focus(previous==='uses'?'item-uses':previous==='layout'?'inventory-move':'item-legacy');return true;}
  if(this.detailOpen){this.detailOpen=false;h.focus('item-'+this.selected);return true;}
  if(this.sorting){this.sorting=false;h.focus('inventory-sort');return true;}return false;
 }
 private cancel(h:PanelHost){const d=this.draft;this.draft=null;h.go(d?.back||'inventory',true);this.detailOpen=d?.back!=='world';}
 private select(h:PanelHost,id:string){this.feedback=this.hint='';this.preferences.select(id);this.view='main';this.detailOpen=true;this.pocket=this.quick.indexOf(id);this.leaf=0;h.redraw(true);}
 activate(h:PanelHost,slot:number){
  this.init(h);const id=this.quick[slot];this.feedback='';
  if(!id){h.go('inventory');this.pocket=slot;this.hint='先点选物品，再点口袋放入';return;}
  this.preferences.select(id);const intent=itemIntent(h.world,h.state,h.now,id);
  if(seedCrop(id)&&intent.command&&!intent.reason)this.preview(h,intent,'world');
  else{h.go('inventory');this.view='main';this.detailOpen=true;this.pocket=slot;}
 }
 private preview(h:PanelHost,intent:ItemIntent,back='inventory'){this.feedback='';this.draft={saveId:h.saveId,intent,back,location:h.state.location};h.go('item-confirm');}
 draw(h:PanelHost){
  this.init(h);this.detailText='';this.detailPages=1;if(h.mode==='item-confirm'){this.confirm(h);return;}
  const owned=Object.keys(itemDefinitions).filter(id=>h.state.inventory[id]>0),ids=this.preferences.items(owned),short=h.height<500;
  const bw=Math.min(640,h.width-328),height=Math.min(500,h.height-24),reserve=296,w=bw+reserve,cx=(h.width-w)/2,cy=(h.height-height)/2;
  const offset=this.preferences.value.offset,x=Math.max(12,Math.min(h.width-w-12,cx+offset.x)),y=Math.max(12,Math.min(h.height-height-12,cy+offset.y));
  const position=(dx:number,dy:number)=>{const xx=Math.max(12,Math.min(h.width-w-12,x+dx)),yy=Math.max(12,Math.min(h.height-height-12,y+dy));this.preferences.position(xx-cx,yy-cy);h.redraw();};
  h.region('inventory-layout',x,y,w,height);h.region('inventory-bag',x+20,y+4,bw-40,height-16);
  h.image('ui/satchel',x+bw/2,y+height/2,bw,height,true);
  const titleW=Math.min(260,bw-140),titleX=x+(bw-titleW)/2;
  timberSurface(h,{x:titleX,y:y+2,w:titleW,h:52});
  h.button('inventory-move','',titleX,y+6,titleW,44,()=>{this.view='layout';this.detailOpen=false;h.redraw();},h.busy,false,'hud',{label:'摆放行囊，可拖动标题移动，或点击调整位置'});
  h.text('InventoryTitle','旅人的行囊',titleX+4,y+6,titleW-8,44,short?18:22,C.paper,true);
  h.drag('inventory-move',{panel:true,drop:(_x,_y,dx,dy)=>position(dx,dy)});
  h.button('close','收起行囊',x+bw-64,y+10,44,44,()=>h.close(),h.busy,false,'satchel-close',{label:'收起行囊'});
  const qh=short?48:64,qy=y+height-qh-24,row=qy-56;
  const cell=short?48:72,gap=8,columns=Math.min(6,Math.floor((bw-56+gap)/(cell+gap))),rows=Math.max(1,Math.floor((row-y-(short?72:80)-24+gap)/(cell+gap))),per=columns*rows,pages=Math.max(1,Math.ceil(ids.length/per));this.page=Math.min(this.page,pages-1);
  const gridW=columns*(cell+gap)-gap,gx=x+(bw-gridW)/2,gy=y+(short?72:80);
  h.box('InventoryTray',gx-7,gy-7,gridW+14,rows*(cell+gap)+6,'#dee3cf24',6);
  const targets:DropArea[]=Array.from({length:per},(_,i)=>({id:'tray:'+String(this.page*per+i),x:gx+(i%columns)*(cell+gap),y:gy+Math.floor(i/columns)*(cell+gap),w:cell,h:cell}));
  targets.forEach(t=>h.region('inventory-cell-'+t.id.slice(5),t.x,t.y,t.w,t.h));
  const qw=(bw-80)/4;
  for(let i=0;i<4;i++)targets.push({id:'quick:'+i,x:x+28+i*(qw+8),y:qy,w:qw,h:qh});
  const dropAreas=targets;
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
   h.itemSlot('item-'+id,id,xx,yy,cell,cell,count,selected,()=>this.select(h,id));if(count>0)drag('item-'+id,id);
  }
  if(!ids.some(Boolean))h.text('EmptyInventory','行囊暂时空着，沿途收集的物品会放在这里。',gx+8,gy,gridW-16,64,15,C.paper);
  const canBind=this.detailOpen&&this.view==='main'&&(h.state.inventory[this.selected]||0)>0;
  const hint=this.preferences.warning||this.hint||(canBind?'点口袋放入 · 再点可收回':'拖动摆放 · 点选查看');
  const display=this.preferences.warning?(this.preferences.warning.includes('当前窗口')?'仅窗口内保留，关闭后需重排':'本机偏好不可读，可继续整理'):hint;
  const label=h.text('InventoryHint',hint,x+28,row-28,bw-56,20,13,C.paper);label.string=shortText(display,Math.floor((bw-56)/13));label.lineHeight=20;
  for(let xx=x+28;xx<x+bw-28;xx+=10)h.line('PocketDivider',[{x:xx,y:row-4},{x:Math.min(xx+5,x+bw-28),y:row-4}],'#b2a66a80',1);
  if(this.sorting){
   const index=ids.indexOf(this.selected),move=(delta:number)=>{if(this.preferences.place(this.selected,index+delta,owned)){this.page=Math.floor((index+delta)/per);h.redraw(true);}};
   h.button('item-prev','←',x+28,row,44,44,()=>move(-1),h.busy||index<=0,false,'game',{label:'将选中物品移到前一格'});
   h.button('item-next','→',x+80,row,44,44,()=>move(1),h.busy||index<0||index>=per*pages-1,false,'game',{label:'将选中物品移到后一格'});
   h.text('ArrangeSelection',shortText(itemNames[this.selected]||'点选物品',Math.floor((bw-280)/14)),x+136,row,bw-280,44,14,C.paper);
  }else if(pages>1){
   h.button('inventory-next',(this.page+1)+'/'+pages+' ›',x+28,row,68,44,()=>{this.page=(this.page+1)%pages;h.redraw();},h.busy,false,'hud',{label:'物品翻页 '+(this.page+1)+'/'+pages});
  }else h.text('PocketsTitle','随手口袋 · 1–4',x+28,row+11,bw-180,22,14,C.paper);
  h.button('inventory-sort',this.sorting?'完成整理':'整理物品',x+bw-132,row,104,44,()=>{this.sorting=!this.sorting;this.view='main';this.detailOpen=false;this.hint='';h.redraw();},h.busy||!owned.length,this.sorting,'game');
  this.quick.forEach((id,i)=>{
   const remove=this.detailOpen&&this.view==='main'&&id===this.selected;
   const hint=remove?'收回'+itemNames[id]+',物品数量不变':canBind?'放入选中的'+itemNames[this.selected]:id?'查看'+itemNames[id]:'先点选物品，再点此格放入';
   h.itemSlot('quick-'+i,id,x+28+i*(qw+8),qy,qw,qh,id?h.state.inventory[id]||0:0,this.pocket===i,()=>{
    this.pocket=i;
    if(remove){this.preferences.clear(i);this.pocket=-1;this.hint='已收回，物品仍在行囊中';h.redraw(true);}
    else if(canBind){this.preferences.bind(i,this.selected,h.state.inventory);this.hint='已放入第'+(i+1)+'格';h.redraw(true);}
    else if(id)this.select(h,id);
    else{this.hint='先点选物品，再点口袋放入';h.redraw();}
   },true,i+1,hint);
   if(id&&(h.state.inventory[id]||0)>0)drag('quick-'+i,id,i);
  });
  if(!this.detailOpen&&this.view==='main')return;
  const tw=this.view==='main'?264:280,th=this.view==='main'?200:Math.min(this.view==='uses'?420:336,height),tx=x+bw+16,ty=Math.max(12,Math.min(h.height-th-12,y+98));
  h.region('inventory-tag',tx,ty,tw,th);paperSurface(h,{x:tx,y:ty,w:tw,h:th});
  const id=this.selected,def=itemDefinitions[id],count=h.state.inventory[id]||0,special=this.view==='layout'||this.view==='legacy';
  h.image('items/'+(this.view==='layout'?'backpack':this.view==='legacy'?'journal':id),tx+38,ty+38,44,44);
  h.text('TagName',this.view==='layout'?'摆放行囊':this.view==='legacy'?'旧快捷栏':def.name,tx+68,ty+10,tw-128,32,20);
  h.text('TagCount',special?this.view==='layout'?'拖动标题或点按方向':'选择来源后带入本旅程':'持有 '+count+' 份',tx+68,ty+43,tw-84,28,14,C.muted);
  const tagClose=h.button('item-details-close','收起',tx+tw-54,ty+6,44,44,()=>{this.view='main';this.detailOpen=false;h.focus('item-'+id);},h.busy,false,'page',{label:'收起物品详情'});tagClose.fontSize=13;
  if(this.view==='layout'){
   const legacy=this.preferences.legacy().length;
   if(legacy)h.button('item-legacy','查看旧快捷栏',tx+16,ty+80,tw-32,44,()=>{this.view='legacy';this.legacy=0;h.redraw();},h.busy,false,'page');
   const buttons=[['left','← 左移',-48,0],['right','右移 →',48,0],['up','↑ 上移',0,-48],['down','下移 ↓',0,48]] as const;
   buttons.forEach(([key,label,dx,dy],i)=>h.button('bag-'+key,label,tx+16+(i%2)*(tw-24)/2,ty+(legacy?132:112)+Math.floor(i/2)*52,(tw-40)/2,44,()=>position(dx,dy),h.busy,false,'game'));
   h.button('bag-center','居中归位',tx+16,ty+th-58,(tw-40)/2,44,()=>{this.preferences.position(0,0);h.redraw();},h.busy,false,'game');
   h.button('tag-back','摆放好了',tx+24+(tw-40)/2,ty+th-58,(tw-40)/2,44,()=>{this.view='main';h.redraw();},h.busy,false,'game');
  }else if(this.view==='legacy')this.legacyView(h,tx,ty,tw,th);
  else if(this.view==='uses'){
   const body=def.description+'\n来源：'+def.source+'\n用途：'+def.use;
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
  h.button('tag-back','先保留',x+32+ww*2,y+height-58,ww,44,()=>{this.view='layout';this.detailOpen=false;h.focus('item-legacy');},h.busy,false,'game');
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
  const quote=targetName+'\n消耗：'+itemAmounts(d.intent.costs)+(d.intent.command==='plant'?'\n体力：'+(h.state.farming?.stamina.plant||2):'')+'\n获得：'+(d.intent.command==='plant'?'已播种农田 · '+((d.intent.seconds||0)/(h.state.world_clock?.day_seconds||1800)).toFixed(2)+'游戏日成熟':itemAmounts(d.intent.gains));
  const body=quote+'\n'+(h.error||(!valid?'目标或报价已变化，请取消后重选。':'库存以服务器确认结果为准。'));
  h.text('ItemConfirmQuote',textPages(body,Math.floor((w-48)/16),8)[0],x+24,y+62,w-48,height-132,16,h.error||!valid?C.danger:C.ink);
  h.button('item-cancel','先等等',x+24,y+height-62,(w-56)/2,44,()=>this.cancel(h),h.busy,false,'game');
  const retry=['offline','uncertain','unauthorized'].includes(h.connection);
  h.button(retry?'item-reconnect':'item-confirm',retry?'重连核对':'确认'+(d.intent.command==='plant'?'播种':'操作'),x+32+(w-56)/2,y+height-62,(w-56)/2,44,()=>retry?h.reconnect():this.commit(h),retry?h.processing:h.busy||!valid,true,'game');
 }
}
