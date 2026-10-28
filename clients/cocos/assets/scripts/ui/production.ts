import type {PanelHost} from './panels';
import {gameControls,paperSurface} from './materials';
import {C} from './theme';
import {productionFacilities} from '../core/construction';
import {ranchCatalog,ranchProducts,ranchDays} from '../core/ranching';
export class ProductionPanels {
 private item='mayo_machine';private east=false;private cell={x:0,y:0};private page=0;private recipe='';private fine=false;
 handles(mode:string){return ['production','facility-placement','production-machine'].includes(mode);}
 draw(original:PanelHost){
  const h=gameControls(original),c=h.state.construction,v=h.state.construction_view,r=h.state.ranching;if(!c||!v||!r)return;
  const machines=c.machines||{},machine=h.context?machines[h.context.id]:null,place=h.mode==='facility-placement',moving=place&&!!machine;
  const w=Math.min(900,h.width-32),height=Math.min(480,h.height-24),x=(h.width-w)/2,y=(h.height-height)/2,short=height<400,top=y+66,bottom=y+height-60;
  paperSurface(h,{x,y,w,h:height},true);h.region('production-paper',x+16,y+8,w-32,height-16);
  const title=place?(moving?'移动设备 · 牧场加工地带':'摆放设备 · 牧场加工地带'):machine?productionFacilities[machine.facility].name:'牧场加工地带';
  h.text('ProductionTitle',title,x+24,y+12,w-144,40,24);h.button('close','返回',x+w-100,y+12,76,44,()=>h.close(),h.busy);
  const crafts=Object.entries(v.recipes).filter(([,s])=>s.kind==='facility');
  if(place){
   const size=48,gx=x+24,gy=top+100,gridW=size*7,dx=gx+gridW+24,dw=w-gridW-72;
   if(!v.recipes[this.item])this.item=crafts[0][0];const item=moving?productionFacilities[machine.facility].craft!.item:this.item;
   h.button('zone-west','西侧加工地带',gx,top,160,44,()=>{this.east=false;this.cell={x:0,y:0};h.redraw(true);},h.busy,!this.east,'tab');
   h.button('zone-east','东侧加工地带',gx+176,top,160,44,()=>{this.east=true;this.cell={x:0,y:0};h.redraw(true);},h.busy,this.east,'tab');
   h.text('WorkyardHint','北侧是住所与活动区，中间道路通往出口。',gx,top+52,gridW,40,14,C.muted);
   h.box('Workyard',gx-3,gy-5,gridW+2,68,C.canvas,3);
   const cells=(v.facility_cells||[]).filter(cell=>this.east?cell.x>=528:cell.x<528);
   cells.forEach((cell,i)=>{const xx=gx+i*size,selected=this.cell.x===cell.x;
    h.box('MachineFloor-'+i,xx,gy,44,44,selected?C.moss:cell.reason?C.canvas:C.raised,1);
    h.button('machine-place-'+cell.x,'',xx,gy,44,44,()=>{this.cell=cell;h.redraw(true);},h.busy||!!cell.reason,selected,'satchel-slot',{label:cell.reason||`选择${this.east?'东':'西'}侧第${i+1}格`,pressed:selected});
    const installed=Object.values(machines).find(m=>m.x===cell.x&&m.y===cell.y);
    if(installed)h.image('ranching/'+installed.facility,xx+22,gy+22,38,38);
    if(selected&&!cell.reason)h.image('ranching/'+v.recipes[item].facility,xx+22,gy+22,38,38);
   });
   h.text('PlacementSafety','每台设备独立加工。\n保留入口和动物活动空间。',gx,gy+78,gridW,60,15,C.muted);
   h.image('ranching/'+v.recipes[item].facility,dx+44,top+40,80,80);
   h.text('DeviceStock',v.recipes[item].name+'\n'+(moving?'搬动这台空闲设备':`背包中 ${h.state.inventory[item]||0} 台`),dx+96,top,dw-96,88,16);
   if(!moving)h.button('placement-device','切换：'+v.recipes[item].name,dx,top+100,dw,44,()=>{this.item=crafts[(crafts.findIndex(([id])=>id===this.item)+1)%crafts.length][0];h.redraw(true);},h.busy,false,'page');
   const selected=cells.find(a=>a.x===this.cell.x),valid=selected&&!selected.reason;
   h.text('MachinePlacementFeedback',h.error||h.notice||'选中格位后确认，取消不消耗设备。',dx,top+154,dw,short?44:76,short?13:16,h.error?C.danger:C.muted);
   h.button('machine-placement-confirm',moving?'确认移动':'确认摆放',dx,bottom,dw,44,async()=>{if(await h.send(moving?'construction_machine_move':'construction_machine_place',{target:moving?h.context!.id:'ranch_ledger',recipe:item,x:this.cell.x,y:this.cell.y,expected_version:machine?.version})){this.cell={x:0,y:0};h.go('world',true);}},h.busy||!valid||!moving&&!h.state.inventory[item],true);
   return;
  }
  if(machine){
   const id=h.context!.id,spec=productionFacilities[machine.facility],recipes=ranchCatalog.recipes.filter(q=>q.facility===machine.facility);
   const job=r.jobs[id];if(job)this.recipe=job.recipe;
   if(!recipes.some(q=>q.id===this.recipe))this.recipe=recipes[0].id;
   const q=recipes.find(q=>q.id===this.recipe)!,dx=x+200,dw=w-224,prefix=this.fine?'fine_':'';
   h.image('ranching/'+machine.facility,x+94,top+70,120,120);
   h.text('DeviceLocation',(machine.x<448?'西侧':'东侧')+'加工地带\n每台独立加工',x+24,top+136,152,58,short?13:16,C.muted);
   recipes.forEach((q,i)=>h.button('machine-recipe-'+q.id,ranchProducts[q.output].name,dx+i*(dw+8)/recipes.length,top,(dw-8*(recipes.length-1))/recipes.length,44,()=>{this.recipe=q.id;h.redraw(true);},h.busy||!!job,this.recipe===q.id,'entry'));
   const message=job?(job.ready?'加工完成 · '+(job.output.startsWith('fine_')?'优质':'')+ranchProducts[job.output.replace('fine_','')].name:'加工中 · 还需'+ranchDays(job.remaining_days)):`1份${this.fine?'优质':''}${ranchProducts[q.input].name} → 1份${this.fine?'优质':''}${ranchProducts[q.output].name}\n持有 ${h.state.inventory[prefix+q.input]||0} 份 · 耗时 ${q.days} 游戏日`;
   h.text('MachineStatus',h.error||message,dx,top+60,dw,short?66:110,short?14:18,h.error?C.danger:C.ink);
   if(job)h.text('MachineMoveReason','加工中或未取成品时不可搬动。',dx,top+(short?128:184),dw,30,short?13:15,C.muted);
   h.button('machine-move','移动设备',dx,bottom-48,(dw-8)/2,44,()=>h.go('facility-placement'),h.busy||!!job,false,'page');
   h.button('machine-pack','收回背包',dx+(dw+8)/2,bottom-48,(dw-8)/2,44,async()=>{if(await h.send('construction_machine_pack',{target:id,expected_version:machine.version}))h.go('world',true);},h.busy||!!job,false,'page');
   h.button('machine-quality',(job?job.output.startsWith('fine_'):this.fine)?'优质原料':'普通原料',x+24,bottom,152,44,()=>{this.fine=!this.fine;h.redraw(true);},h.busy||!!job,false,'page');
   if(['offline','uncertain','unauthorized'].includes(h.connection))h.button('machine-reconnect','重连并核对',dx,bottom,dw,44,()=>h.reconnect(),h.processing,true);
   else h.button('machine-process',job?(job.ready?'收取成品':'正在加工…'):'确认投料 · 开始加工',dx,bottom,dw,44,()=>h.send(job?'ranch_job_collect':'ranch_process',{target:id,facility:id,recipe:q.id,fine:this.fine,expected_version:machine.version}),h.busy||(job?!job.ready:!h.state.inventory[prefix+q.input]),true);
   return;
  }
  const entries=Object.entries(machines),per=short?3:6,pages=Math.max(1,Math.ceil(entries.length/per));this.page=Math.min(this.page,pages-1);
  entries.slice(this.page*per,(this.page+1)*per).forEach(([id,m],i)=>{const job=r.jobs[id],status=job?(job.ready?'成品待取':'加工中'):'空闲';h.button('production-visit-'+id,productionFacilities[m.facility].name+' · '+(m.x<448?'西侧':'东侧')+' · '+status,x+24,top+i*48,w-48,44,()=>h.mark({mapId:'pasture',targetId:id},productionFacilities[m.facility].name+' · 走近操作'),h.busy,false,'entry');});
  if(!entries.length)h.text('ProductionEmpty','这里还没有生产设备。\n向阿榆学习图纸，在工坊制作后带来摆放。',x+24,top,w-48,80,short?16:20,C.muted);
  const near=Math.hypot(h.state.position.x-448,h.state.position.y-440)<=72;
  if(pages>1)h.button('production-page',`翻页 ${this.page+1}/${pages}`,x+24,bottom-48,160,44,()=>{this.page=(this.page+1)%pages;h.redraw();},h.busy,false,'page');
  h.button('production-place',near?'摆放背包里的设备':'前往采购簿 · 摆放设备',x+24,bottom,(w-56)/2,44,()=>near?h.go('facility-placement'):h.mark({mapId:'pasture',targetId:'ranch_ledger'},'牧场采购簿'),h.busy||near&&!crafts.some(([id])=>h.state.inventory[id]>0),true);
  h.button('production-learn','找阿榆学习图纸',x+32+(w-56)/2,bottom,(w-56)/2,44,()=>h.mark({mapId:'workshop',targetId:'carpenter'},'木匠阿榆'),h.busy);
 }
}
