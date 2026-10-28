import type {PanelHost} from './panels';
import {toolIds,toolName,toolLevel,toolSpec} from '../core/tools';
import {toolCatalog} from '../core/toolCatalog';
import {itemAmounts} from '../core/inventory';
import {formatMoney} from '../core/currency';
import {C} from './theme';
import {paperSurface,timberSurface} from './materials';

export class ToolPanels {
 private selected=0;private confirm='';
 draw(h:PanelHost){
  const short=h.height<520,w=Math.min(1000,h.width-24),height=Math.min(560,h.height-20),x=(h.width-w)/2,y=(h.height-height)/2;
  timberSurface(h,{x,y,w,h:height});paperSurface(h,{x:x+12,y:y+10,w:w-24,h:height-20});
  h.text('ToolTitle','阿焰 · 工具升级',x+26,y+12,w-312,40,short?20:26);
  h.text('ToolBalance',formatMoney(h.state.inventory.gold),x+w-280,y+14,158,36,16,C.muted,true);
  h.button('close','返回',x+w-100,y+12,76,44,()=>h.close(),h.busy,false,'back-light');
  const top=y+(short?66:86),left=Math.min(250,w*.28),dx=x+left+30,dw=w-left-56,footer=y+height-64;
  h.region('tools-service',x,y,w,height);
  toolIds.forEach((id,i)=>{const yy=top+i*(short?51:76);h.button('tools-select-'+id,'',x+24,yy,left-20,short?46:68,()=>{this.selected=i;this.confirm='';h.redraw(true);},h.busy,this.selected===i,'game',{label:toolName(h.state,id)+'，升级报价',pressed:this.selected===i});h.image('items/'+id,x+50,yy+(short?23:34),36,36);h.text('ToolChoice',toolSpec(id).name,x+76,yy,left-80,short?46:68,short?14:18,this.selected===i?C.paper:C.ink);});
  const id=toolIds[this.selected],level=toolLevel(h.state,id),q=h.state.tool_rules?.upgrades[id],tier=toolCatalog.tiers[level],next=toolCatalog.tiers[Math.min(3,level+1)];
  h.text('ToolName',toolName(h.state,id),dx,top,dw,32,short?18:24);
  const art=short?64:104;h.image('tools/'+id+'-'+level,dx+art/2,top+42+art/2,art,art);
  h.image('tools/'+id+'-'+Math.min(3,level+1),dx+art*1.9,top+42+art/2,art,art);
  h.text('ToolArrow','→',dx+art+8,top+42+art*.3,24,32,22,C.muted,true);
  h.text('ToolNext',level===3?'已完成全部升级':next.name+toolSpec(id).name,dx+art*1.3,top+42+art,dw-art*1.3,26,short?13:17,C.moss);
  const info=top+art+(short?72:98),lines=id==='axe'||id==='pickaxe'?'每次工作量 '+tier.power+' → '+next.power+(id==='pickaxe'?'；铜镐采铁、铁镐采金':'；更少挥动砍倒树木与树桩'):'可选范围 '+tier.area+' → '+next.area+' 格'+(id==='watering_can'?'；容量 '+tier.water+' → '+next.water:'；在世界按G切换范围');
  const text=level===3?'永久使用，无耐久损坏。':lines+'\n材料与工钱：'+itemAmounts(q?.costs)+'\n'+(q?.reasons.join('；')||'材料齐全，报价包含冶炼和锻造。');
  const body=h.text('ToolQuote',text,dx,info,dw,Math.max(44,footer-info-14),short?13:17,C.ink);body.lineHeight=short?19:26;
  const signature=id+':'+level,confirm=this.confirm===signature;
  const retry=['offline','uncertain','unauthorized'].includes(h.connection),available=!!q&&q.next!==null&&!q.reasons.length;
  const msg=h.error||h.notice;if(msg)h.text('ToolFeedback',msg,dx,footer-44,dw,38,13,h.error?C.danger:C.moss);
  h.button('tool-upgrade',retry?'重连并核对':level===3?'已达最高等级':confirm?'确认升级 · '+itemAmounts(q?.costs):'升级为'+next.name+toolSpec(id).name,dx,footer,dw,44,()=>{
   if(retry){h.reconnect();return;}if(!confirm){this.confirm=signature;h.redraw(true);return;}
   void h.send('tool_upgrade',{target:'blacksmith',item:id,expected_level:level}).then(ok=>{if(ok)this.confirm='';});
  },retry?h.processing:h.busy||!available,true,'game');
 }
}
