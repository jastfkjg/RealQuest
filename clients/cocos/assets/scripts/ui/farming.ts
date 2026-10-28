import {formatMoney} from '../core/currency';
import type {PanelHost} from './panels';
import {C} from './theme';
import {paperSurface,timberSurface} from './materials';
import {crops,plotCrop,plotProgress,remaining,growingDays} from '../core/farming';
import {currentMap} from '../core/navigation';
import {staminaNow} from '../core/stamina';
export class FarmingPanels {
 constructor(private grow:()=>void){}
 private seed='seed';private page=0;private restore=false;private targetId='';
 draw(h:PanelHost){
  const short=h.height<560,w=Math.min(1040,h.width-24),height=Math.min(580,h.height-24),x=(h.width-w)/2,y=(h.height-height)/2;
  const target=currentMap(h.world,h.state,h.now).objects.find(o=>o.id===h.context?.id),p=target&&h.state.plots[target.id];
  if(target?.id!==this.targetId||target?.kind==='soil'){this.restore=false;this.targetId=target?.id||'';}
  const costs=h.state.farming?.stamina||{till:4,plant:2,water:2,harvest:1,reclaim:3};
  const c=p?plotCrop(p):crops.find(c=>c.seed===this.seed)||crops[0],level=h.state.skill_growth?.planting||0;
  const left=Math.floor(w*.43),dx=x+left+20,dw=w-left-40,top=y+(short?58:86),footer=y+height-60;
  timberSurface(h,{x,y,w,h:height});paperSurface(h,{x:x+12,y:y+10,w:w-24,h:height-20});
  h.text('FarmTitle','向阳家园 · 耕作手记',x+24,y+12,w-150,36,short?20:24);
  h.button('close','回田边',x+w-100,y+10,76,44,()=>h.close(),h.busy,false,'back-light');
  if(!short)h.text('FarmCapacity','种植 '+level+' 级 · 已开垦 '+(h.state.farm?.tilled.length??6)+' 块 · 家园草地可用锄头开垦',x+24,y+52,w-48,24,15,C.muted);
  if(!target){h.text('FarmMissing','请回到家园，点选一块土地后再操作。',x+24,top,w-48,64);return;}
  h.line('FarmSeam',[{x:x+left,y:top},{x:x+left,y:footer-12}],C.line,1);
  const per=6,cw=(left-56)/2,rh=short?50:86;
  crops.slice(this.page*per,this.page*per+per).forEach((v,i)=>{
   const xx=x+24+(i%2)*(cw+8),yy=top+Math.floor(i/2)*(rh+8),owned=h.state.inventory[v.seed]||0;
   h.button('farm-seed-'+v.id,'',xx,yy,44,44,()=>{this.seed=v.seed;this.restore=false;h.redraw(true);},h.busy,this.seed===v.seed,'game',{label:v.name+'种子目录，持有'+owned+'份，需要种植'+v.level+'级',pressed:this.seed===v.seed});
   h.image('items/'+v.seed,xx+22,yy+22,40,40);
   const lab=h.button('farm-choose-'+v.id,v.name+(short?'':'\n需'+v.level+'级'),xx+48,yy,cw-48,44,()=>{this.seed=v.seed;this.restore=false;h.redraw(true);},h.busy,this.seed===v.seed,'page');lab.fontSize=short?14:16;lab.lineHeight=20;
   if(!short)h.text('SeedStock','持有 '+owned+' · '+formatMoney(v.buy),xx,yy+48,cw,24,13,C.muted);
  });
  h.button('farm-seeds-next',(this.page+1)+' / 2 · 换页',x+24,footer,left-48,44,()=>{this.page=1-this.page;h.redraw();},h.busy,false,'page');
  h.text('FarmPlotName',(target.kind==='soil'?'待开垦土地':p?c.name+' · '+(plotProgress(h.state,p,h.now)>=1?'可收获':'生长中'):'空田 · '+c.name),dx,top,dw,32,short?17:22);
  const stagesY=top+(short?36:52),size=Math.min(short?46:76,(dw-24)/4);
  for(let i=1;i<=4;i++){const xx=dx+(i-1)*(dw/4);h.image('farming/'+c.id+'-'+i,xx+dw/8,stagesY+size/2,size,size);if(!short)h.text('GrowthStage',['初芽','幼苗','生长','成熟'][i-1],xx,stagesY+size,dw/4,24,13,C.muted,true);}
  const infoY=stagesY+size+(short?2:38),infoH=Math.max(38,footer-infoY-48);
  let text='',action='',disabled=false;
  if(target.kind==='soil'){
   text='收起手记，在家园拿起锄头直接点击草地。\n每块'+costs.till+'体力，可连续开垦。';action='挥锄 · '+costs.till+'体力';
   disabled=staminaNow(h.state,h.now)<costs.till;
  }else if(p){
   const ready=plotProgress(h.state,p,h.now)>=1;
   text=(ready?'成熟了，随时可以收获':'还需 '+remaining(h.state,p,h.now))+' · 本轮产量 '+c.yield+'\n'+(p.clock==='world'?'剩余 '+p.harvests_left+' 轮 · '+(p.watered?'本轮已浇水':'浇水可缩短本轮时间10%'):'旧作物保留原现实计时与一次留种');
   action=ready?'确认收获 · 1体力':'浇水 · '+costs.water+'体力';disabled=ready?staminaNow(h.state,h.now)<1:!!p.watered||p.clock!=='world'||staminaNow(h.state,h.now)<costs.water;
  }else{
   text='需种植 '+c.level+' 级 · 当前 '+level+' 级 · 种子 '+(h.state.inventory[c.seed]||0)+'份\n'+growingDays(h.state,c.days)+' 游戏日首熟 · 每轮 '+c.yield+' 份 · 共 '+c.harvests+' 轮';
   action='确认播种 · '+costs.plant+'体力';disabled=level<c.level||!(h.state.inventory[c.seed]>0)||staminaNow(h.state,h.now)<costs.plant;
  }
  if(this.restore&&target.kind==='plot'&&!p)text='用十字镐恢复草地，消耗'+costs.reclaim+'体力。\n恢复后可用锄头重新开垦。';
  const label=h.text('FarmConditions',text,dx,infoY,dw,infoH,short?13:16,(this.restore?staminaNow(h.state,h.now)<costs.reclaim:disabled)?C.danger:C.ink);label.lineHeight=short?19:24;
  if(!h.error&&!h.notice)h.text('FarmClockRule',short?'游戏时间 / 睡眠生长 · 离线暂停':'游戏时间与睡眠推进生长；离线暂停，成熟不枯萎。',dx,footer-40,dw,32,short?12:14,C.muted);
  else h.text('FarmFeedback',h.error||h.notice,dx,footer-42,dw,36,13,h.error?C.danger:C.muted);
  const locked=target.kind==='plot'&&!p&&level<c.level,retry=['offline','uncertain','unauthorized'].includes(h.connection);
  const canRestore=target.kind==='plot'&&!p,aw=canRestore?(dw-8)*.62:dw;
  if(canRestore&&this.restore&&!retry)h.button('farm-action','保留田地',dx,footer,aw,44,()=>{this.restore=false;h.redraw();},h.busy,false,'page');
  else h.button('farm-action',retry?'重连并核对':locked?'培养种植技能':action,dx,footer,aw,44,()=>retry?h.reconnect():locked?(this.grow(),h.go('growth')):h.send(target.kind==='soil'?'till':p?(plotProgress(h.state,p,h.now)>=1?'harvest':'water'):'plant',{target:target.id,seed:this.seed}),retry?h.processing:h.busy||(!locked&&disabled),true,'game');
  if(canRestore)h.button('farm-restore',this.restore?'确认恢复草地':'恢复草地',dx+aw+8,footer,dw-aw-8,44,()=>{if(this.restore)void h.send('reclaim',{target:target.id});else{this.restore=true;h.redraw();}},h.busy||(this.restore&&staminaNow(h.state,h.now)<costs.reclaim),false,'page');
 }
}
