import type {PanelHost} from './panels';
import {InventoryPreferences,itemIntent,itemAmounts,type PreferenceStorage,type ItemIntent} from '../core/inventory';
import {itemDefinitions,itemNames} from '../core/items';
import {shortText,textPages} from '../core/lifeRecords';
import {C} from './theme';
import {currentMap} from '../core/navigation';
import type {DropArea} from './drag';
export class InventoryView {
 readonly preferences:InventoryPreferences;private view='main';private all=false;private page=0;private leaf=0;private pocket=0;private legacy=0;
 private detailText='';private detailPages=1;
 private draft:{saveId:string;intent:ItemIntent;back:string;location:string}|null=null;private feedback='';
 constructor(storage:PreferenceStorage){this.preferences=new InventoryPreferences(storage);}
 get quick(){return this.preferences.value.quick;}
 get selected(){return this.preferences.value.selected;}
 init(h:PanelHost){if(this.preferences.saveId!==h.saveId){this.preferences.enter(h.saveId);this.view='main';this.page=this.leaf=0;this.draft=null;this.feedback='';}}
 snapshot(){return {inventoryOffset:this.preferences.value.offset,inventoryTray:this.preferences.value.tray,inventoryView:this.view,inventoryAll:this.all,inventoryPage:this.page,inventoryPocket:this.pocket,inventoryWarning:this.preferences.warning,inventoryDetailPage:this.leaf,inventoryDetailPages:this.detailPages,inventoryDetailText:this.detailText,inventoryDraft:this.draft?{item:this.draft.intent.item,target:this.draft.intent.data?.target,location:this.draft.location,costs:this.draft.intent.costs,gains:this.draft.intent.gains,seconds:this.draft.intent.seconds,signature:this.draft.intent.signature}:null};}
 opened(){this.view='main';this.feedback='';}
 clearPreview(){this.draft=null;}
 deleted(){this.preferences.deleted(this.preferences.saveId);this.draft=null;this.feedback='';this.view='main';}
 target(h:PanelHost){const d=this.draft;return d&&d.saveId===h.saveId&&d.location===h.state.location?currentMap(h.world,h.state,h.now).objects.find(o=>o.id===d.intent.data?.target)||null:null;}
 dismiss(h:PanelHost){if(h.mode==='item-confirm'){this.cancel(h);return true;}if(h.mode==='inventory'&&this.view!=='main'){const focus=this.view==='quick'?'item-pockets':this.view==='uses'?'item-uses':this.view==='wallet'?'inventory-wallet':'item-legacy';this.view='main';h.focus(focus);return true;}return false;}
 private cancel(h:PanelHost){const d=this.draft;this.draft=null;h.go(d?.back||'inventory',true);}
 private select(h:PanelHost,id:string){this.feedback='';this.preferences.select(id);this.view='main';this.leaf=0;h.redraw(true);}
 activate(h:PanelHost,slot:number){this.init(h);const id=this.quick[slot];this.feedback='';if(!id){h.go('inventory');this.pocket=slot;this.view='quick';return;}this.preferences.select(id);const intent=itemIntent(h.world,h.state,h.now,id);if(id==='seed'&&intent.command&&!intent.reason)this.preview(h,intent,'world');else{h.go('inventory');this.view='main';}}
 private preview(h:PanelHost,intent:ItemIntent,back='inventory'){this.feedback='';this.draft={saveId:h.saveId,intent,back,location:h.state.location};h.go('item-confirm');}
 draw(h:PanelHost){this.init(h);this.detailText='';this.detailPages=1;if(h.mode==='item-confirm'){this.confirm(h);return;}
  const owned=Object.keys(itemDefinitions).filter(id=>h.state.inventory[id]>0),ids=this.preferences.items(this.all?Object.keys(itemDefinitions):owned);
  const occupiedCount=ids.filter(Boolean).length;
  const hasLegacy=this.preferences.legacy().length>0,short=h.height<500,w=Math.min(936,h.width-32),height=Math.min(this.all||occupiedCount>12?520:420,h.height-24),cx=(h.width-w)/2,cy=(h.height-height)/2;
  const offset=this.preferences.value.offset,x=Math.max(12,Math.min(h.width-w-12,cx+offset.x)),y=Math.max(12,Math.min(h.height-height-12,cy+offset.y)),tw=short?304:312,bw=w-tw-16,tx=x+bw+16,th=Math.min(this.view==='main'?(hasLegacy?336:284):this.view==='uses'?420:336,height),ty=y+(height-th)/2;
  const position=(dx:number,dy:number)=>{const xx=Math.max(12,Math.min(h.width-w-12,x+dx)),yy=Math.max(12,Math.min(h.height-height-12,y+dy));this.preferences.position(xx-cx,yy-cy);h.redraw();};
  h.region('inventory-bag',x+20,y+4,bw-40,height-16);h.region('inventory-tag',tx,ty,tw,th);
  h.image('ui/satchel',x+bw/2,y+height/2,bw,height,true);
  const titleW=Math.min(260,bw-120);h.box('SatchelTitle',x+(bw-titleW)/2,y+4,titleW,44,C.wood,5);h.button('inventory-move','',x+(bw-titleW)/2,y+4,titleW,44,()=>{this.view='layout';h.redraw();},h.busy,false,'hud',{label:'摆放行囊，可拖动标题移动，或点击调整位置'});h.text('InventoryTitle','旅人的行囊  ···',x+(bw-titleW)/2+4,y+4,titleW-8,44,short?17:22,C.paper,true);h.drag('inventory-move',{panel:true,drop:(_x,_y,dx,dy)=>position(dx,dy)});
  const walletW=Math.min(212,bw-152),gold='金币 '+(h.state.inventory.gold||0),extras=[h.state.energy>0?'能量 '+h.state.energy:'',h.state.knowledge_shard>0?'碎片 '+h.state.knowledge_shard:''].filter(Boolean).join(' · '),caption=gold+(extras?'\n'+extras:'');
  const wallet=h.button('inventory-wallet',caption,x+28,y+48,walletW,44,()=>{this.view='wallet';h.redraw(true);},h.busy,false,'game');wallet.fontSize=extras?14:16;wallet.lineHeight=20;wallet.string=shortText(gold,Math.floor((walletW-16)/14))+(extras?'\n'+shortText(extras,Math.floor((walletW-16)/14)):'');
  h.button('inventory-group',this.all?'物品图鉴':'随身物品',x+bw-112,y+48,88,44,()=>{this.all=!this.all;this.page=0;h.redraw();},h.busy,false,'game');
  const cell=short?48:56,gap=8,columns=Math.min(6,Math.floor((bw-56+gap)/(cell+gap))),rows=Math.max(1,Math.floor((height-208)/(cell+gap))),per=columns*rows,pages=Math.max(1,Math.ceil(ids.length/per));this.page=Math.min(this.page,pages-1);
  const gridW=columns*(cell+gap)-gap,gx=x+(bw-gridW)/2,gy=y+(short?100:106);
  h.box('InventoryTray',gx-7,gy-7,gridW+14,rows*(cell+gap)+6,'#dee3cf24',6);
  const targets:DropArea[]=Array.from({length:per},(_,i)=>({id:'tray:'+String(this.page*per+i),x:gx+(i%columns)*(cell+gap),y:gy+Math.floor(i/columns)*(cell+gap),w:cell,h:cell}));
  targets.forEach(t=>h.region('inventory-cell-'+t.id.slice(5),t.x,t.y,t.w,t.h));
  const qw=(bw-64)/4;for(let i=0;i<4;i++)targets.push({id:'quick:'+i,x:x+24+i*(qw+5),y:y+height-58,w:qw,h:44});
  const dropAreas=this.all?targets.filter(t=>t.id.startsWith('quick:')):targets;
  const drag=(control:string,item:string,from?:number)=>h.drag(control,{item,targets:dropAreas,drop:(px,py)=>{const t=dropAreas.find(t=>px>=t.x&&px<=t.x+t.w&&py>=t.y&&py<=t.y+t.h);if(!t)return;if(t.id.startsWith('quick:')){const slot=Number(t.id.slice(6));if(from!==undefined)this.preferences.swapQuick(from,slot);else this.preferences.bind(slot,item,h.state.inventory);this.pocket=slot;}else{this.preferences.place(item,Number(t.id.slice(5)),owned);if(from!==undefined)this.preferences.clear(from);}this.preferences.select(item);h.redraw(true);}});
  for(let i=0;i<per;i++){
   const id=ids[this.page*per+i],xx=gx+(i%columns)*(cell+gap),yy=gy+Math.floor(i/columns)*(cell+gap);if(!id){h.box('EmptyTraySlot',xx,yy,cell,cell,'#dce1c918',5);continue;}
   const count=h.state.inventory[id]||0,selected=this.selected===id;
   h.itemSlot('item-'+id,id,xx,yy,cell,cell,count,selected,()=>this.select(h,id));if(count>0&&!this.all)drag('item-'+id,id);
  }
  if(pages>1){h.box('InventoryPagerPaper',x+bw-112,y+height-116,88,44,C.paper,4);h.button('inventory-next','翻页 '+(this.page+1)+'/'+pages,x+bw-112,y+height-116,88,44,()=>{this.page=(this.page+1)%pages;h.redraw();},h.busy,false,'page');}
  if(!occupiedCount)h.text('EmptyInventory','行囊暂时空着，沿途收集的物品会放在这里。',gx+8,gy,gridW-16,48,15,C.muted);
  h.text('PocketsTitle',this.all?'物品图鉴 · 仅供查阅':'拖动物品整理 · 随手口袋 1–4',x+28,y+height-(pages>1?104:88),bw-56,24,13,C.paper);
  this.quick.forEach((id,i)=>{h.itemSlot('quick-'+i,id,x+24+i*(qw+5),y+height-58,qw,44,id?h.state.inventory[id]||0:0,false,()=>{this.pocket=i;if(id)this.select(h,id);else{this.view='quick';h.redraw();}},true,i+1);if(id&&(h.state.inventory[id]||0)>0)drag('quick-'+i,id,i);});
  h.box('InventoryTagShadow',tx-3,ty+4,tw+6,th,C.wood,8);h.box('InventoryTag',tx,ty,tw,th,C.paper,7);
  h.button('close','收起',tx+tw-72,ty+10,60,44,()=>h.close(),h.busy,false,'game');
  const id=this.selected,def=itemDefinitions[id],count=h.state.inventory[id]||0;
  h.image('items/'+(this.view==='wallet'?'gold':id),tx+44,ty+44,48,48);h.text('TagName',this.view==='wallet'?'随身物资':def.name,tx+80,ty+14,tw-160,40,20);h.text('TagCount',this.view==='legacy'?'旧全局配置 · 请核对':this.view==='wallet'?'金币与特殊资源':'持有 '+count+' 份',tx+80,ty+54,tw-100,28,15,C.muted);
  if(this.view==='layout'){
   h.text('PositionHint','拖动行囊标题，也可点按方向摆放。',tx+20,ty+94,tw-40,48,15,C.muted);
   const buttons=[['left','← 左移',-48,0],['right','右移 →',48,0],['up','↑ 上移',0,-48],['down','下移 ↓',0,48]] as const;
   buttons.forEach(([id,label,dx,dy],i)=>h.button('bag-'+id,label,tx+20+(i%2)*(tw-40+8)/2,ty+146+Math.floor(i/2)*52,(tw-48)/2,44,()=>position(dx,dy),h.busy,false,'game'));
   h.button('bag-center','居中归位',tx+20,ty+th-58,(tw-48)/2,44,()=>{this.preferences.position(0,0);h.redraw();},h.busy,false,'game');
   h.button('tag-back','摆放好了',tx+28+(tw-48)/2,ty+th-58,(tw-48)/2,44,()=>{this.view='main';h.redraw();},h.busy,false,'game');
  }else if(this.view==='arrange'){
   h.text('ArrangeHint','选中左侧物品，移到前一格或后一格。也可直接拖到空格，或拖入随手口袋。',tx+20,ty+94,tw-40,104,16);
   const index=ids.indexOf(id),move=(n:number)=>{this.preferences.place(id,index+n,owned);h.redraw();};
   h.button('item-prev','← 前一格',tx+20,ty+th-112,(tw-48)/2,44,()=>move(-1),h.busy||index<=0||!count,false,'game');
   h.button('item-next','后一格 →',tx+28+(tw-48)/2,ty+th-112,(tw-48)/2,44,()=>move(1),h.busy||index<0||index>=per*pages-1||!count,false,'game');
   h.button('tag-back','整理好了',tx+20,ty+th-58,tw-40,44,()=>{this.view='main';h.redraw();},h.busy,false,'game');
  }else if(this.view==='wallet'){
   const body='金币 '+(h.state.inventory.gold||0)+'\n能量 '+h.state.energy+'\n知识碎片 '+h.state.knowledge_shard;this.detailText=body;h.text('WalletAmounts',body,tx+20,ty+104,tw-40,144,20);h.button('tag-back','收好钱袋',tx+20,ty+th-58,tw-40,44,()=>{this.view='main';h.focus('inventory-wallet');},h.busy,false,'game');
  }else if(this.view==='quick')this.pockets(h,tx,ty,tw,th);
  else if(this.view==='legacy')this.legacyView(h,tx,ty,tw,th);
  else if(this.view==='uses'){
   const body=def.description+'\n来源：'+def.source+'\n用途：'+def.use+(id==='seed'?'\n本旅程成熟需'+(h.state.buildings.home>=2?45:60)+'秒，离线照常生长。':'');
   const lines=Math.max(2,Math.floor((th-160)/24)),pages=textPages(body,Math.floor((tw-40)/16),lines);this.leaf=Math.min(this.leaf,pages.length-1);this.detailPages=pages.length;this.detailText=pages[this.leaf];
   h.text('ItemUses',pages[this.leaf],tx+20,ty+92,tw-40,lines*24,16);
   h.button('uses-next','翻页 '+(this.leaf+1)+'/'+pages.length,tx+20,ty+th-58,(tw-48)/2,44,()=>{this.leaf=(this.leaf+1)%pages.length;h.redraw();},h.busy||pages.length===1,false,'game');
   h.button('tag-back','看物品',tx+28+(tw-48)/2,ty+th-58,(tw-48)/2,44,()=>{this.view='main';h.redraw();},h.busy,false,'game');
  }else{
   const intent=itemIntent(h.world,h.state,h.now,id),message=h.error||this.feedback||this.preferences.warning||intent.reason||def.summary;
   h.text('ItemPurpose',textPages(message,Math.floor((tw-40)/16),3)[0],tx+20,ty+94,tw-40,72,16,h.error?C.danger:C.ink);
   h.button('item-action',intent.label,tx+20,ty+th-(hasLegacy?164:112),tw-40,44,()=>{if(intent.command)this.preview(h,intent);else if(intent.target)h.mark(intent.target,def.name);else if(intent.mode)h.go(intent.mode);},h.busy||!!intent.reason&&!intent.target&&!intent.mode,true,'game');
   const ww=(tw-48)/2;h.button('item-uses','用途与来源',tx+20,ty+th-(hasLegacy?112:60),ww,44,()=>{this.view='uses';this.leaf=0;h.redraw(true);},h.busy,false,'game');
   h.button('item-pockets','整理快捷栏',tx+28+ww,ty+th-(hasLegacy?112:60),ww,44,()=>{this.view='quick';h.redraw(true);},h.busy,false,'game');
   if(this.preferences.legacy().length)h.button('item-legacy','查看旧快捷栏',tx+20,ty+th-58,tw-40,44,()=>{this.view='legacy';this.legacy=0;h.redraw(true);},h.busy,false,'game');
  }
 }
 private pockets(h:PanelHost,x:number,y:number,w:number,height:number){
  const ww=(w-64)/4;this.quick.forEach((id,i)=>h.button('pocket-select-'+i,String(i+1),x+20+i*(ww+8),y+92,ww,44,()=>{this.pocket=i;h.redraw();},h.busy,this.pocket===i,'game'));
  const id=this.quick[this.pocket],note=this.preferences.warning||'第'+(this.pocket+1)+'格：'+(id?itemNames[id]+' · '+(h.state.inventory[id]||0)+'份':'空口袋')+'\n安排不消耗物品；同类会交换位置。';
  h.text('PocketInstruction',textPages(note,Math.floor((w-40)/15),3)[0],x+20,y+140,w-40,64,15).lineHeight=21;
  const ww2=(w-48)/2,yy=y+height-112;
  h.button('pocket-bind','装入此格',x+20,yy,ww2,44,()=>{this.preferences.bind(this.pocket,this.selected,h.state.inventory);h.redraw(true);},h.busy||!(h.state.inventory[this.selected]>0),true,'game');
  h.button('pocket-clear','清空此格',x+28+ww2,yy,ww2,44,()=>{this.preferences.clear(this.pocket);h.redraw(true);},h.busy||!id,false,'game');
  h.button('pocket-sort','整理物品',x+20,y+height-58,ww2,44,()=>{this.view='arrange';h.redraw();},h.busy,false,'game');
  h.button('tag-back','整理好了',x+28+ww2,y+height-58,ww2,44,()=>{this.view='main';h.redraw();},h.busy,false,'game');
 }
 private legacyView(h:PanelHost,x:number,y:number,w:number,height:number){
  const all=this.preferences.legacy(),c=all[this.legacy%Math.max(1,all.length)];if(!c){this.view='main';h.redraw();return;}
  const body=c.label+'\n'+c.quick.map((id,i)=>(i+1)+' · '+(id?itemNames[id]:'空格')).join('\n')+'\n仅带入当前旅程，不改变物品。';
  h.text('LegacyQuickPreview',textPages(body,Math.floor((w-40)/15),7)[0],x+20,y+92,w-40,168,15);
  const ww=(w-56)/3;h.button('legacy-source','换来源',x+20,y+height-58,ww,44,()=>{this.legacy++;h.redraw();},h.busy||all.length<2,false,'game');
  h.button('legacy-apply','带入本旅程',x+28+ww,y+height-58,ww,44,()=>{this.preferences.importLegacy(c.key);this.view='quick';h.redraw(true);},h.busy,true,'game');
  h.button('tag-back','先保留',x+36+ww*2,y+height-58,ww,44,()=>{this.view='main';h.redraw();},h.busy,false,'game');
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
