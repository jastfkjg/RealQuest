import type {PanelHost} from './panels';
import {gameControls,paperSurface} from './materials';
import {C} from './theme';
import {costText,shortages} from '../core/features';
import {chestArt,constructionArt} from '../core/construction';
/** Workbench recipes, a carpenter's order sheet and a measured room plan. */
export class ConstructionPanels {
 private recipe='wooden_chest';private project='home';private cell={x:0,y:0};private page=0;private name='';private named='';
 handles(mode:string){return ['construction','chest-placement','chest-name'].includes(mode);}
 draw(original:PanelHost){
  const h=gameControls(original),v=h.state.construction_view,c=h.state.construction;if(!v||!c)return;
  const w=Math.min(920,h.width-32),height=Math.min(560,h.height-24),x=(h.width-w)/2,y=(h.height-height)/2,short=height<430,top=y+66,bottom=y+height-60;
  paperSurface(h,{x,y,w,h:height},true);h.region('construction-paper',x+16,y+8,w-32,height-16);
  const moving=h.context?.id.startsWith('player_chest_')?h.context.id:null,chest=moving?c.chests[moving]:null;
  const place=h.mode==='chest-placement',home=h.state.location==='home',npc=h.context?.id==='carpenter';
  h.text('ConstructionTitle',place?(moving?'移动木箱 · 内容随箱保留':'摆放木箱 · 家中平面图'):npc?'阿榆的木作与工程':home?'家园手册':'木作工作台',x+24,y+12,w-144,40,24);
  h.button('close','返回',x+w-100,y+12,76,44,()=>h.close(),h.busy);
  const feedback=()=>h.text('ConstructionFeedback',h.error||h.notice||(c.job?`施工：${c.job.name} · 还需${Math.ceil(v.remaining_days*24)}游戏小时`:c.completed.length?`阿榆已完成：${c.completed[c.completed.length-1].name}`:''),home?x+24:x+240,bottom-44,home?w-48:w-264,40,14,h.error?C.danger:C.muted);
  if(h.mode==='chest-name'&&chest){if(this.named!==h.saveId+':'+moving+':'+chest.version){this.named=h.saveId+':'+moving+':'+chest.version;this.name=chest.name;}h.field('chest-name','木箱名称（1–12字）',this.name,x+24,top+24,w-48,value=>this.name=value,false,12);h.button('chest-rename','保存箱名',x+24,bottom,w-48,44,async()=>{if(await h.send('construction_rename',{target:moving,chest:moving,expected_version:chest.version,name:this.name}))h.close();},h.busy||!this.name.trim(),true);feedback();return;}
  if(place){
   const size=short?44:52,gx=x+24,gy=top,planW=size*9,sideX=gx+planW+20,sideW=w-planW-68;
   const recipe=chest?.recipe||this.recipe;
   h.box('RoomPlan',gx-3,gy-3,planW+6,size*6+6,C.line,3);
   v.cells.forEach(cell=>{const xx=gx+(cell.x/48-1)*size,yy=gy+(cell.y/48-1)*size;
    h.box('Floor-'+cell.x+'-'+cell.y,xx+1,yy+1,size-2,size-2,this.cell.x===cell.x&&this.cell.y===cell.y?C.moss:cell.reason?C.canvas:C.raised,1);
    if(cell.reason)h.line('Blocked-'+cell.x+'-'+cell.y,[{x:xx+size*.3,y:yy+size*.3},{x:xx+size*.7,y:yy+size*.7}],C.line,1);
    h.button(`place-${cell.x}-${cell.y}`,'',xx,yy,size,size,()=>{this.cell=cell;h.redraw(true);},h.busy||!!cell.reason,this.cell.x===cell.x&&this.cell.y===cell.y,'satchel-slot',{label:cell.reason?`位置 ${cell.x},${cell.y}：${cell.reason}`:`选择位置 ${cell.x},${cell.y}`,pressed:this.cell.x===cell.x&&this.cell.y===cell.y});
   });
   // Furniture silhouettes and containers are aligned to the same world coordinates.
   const project=(xx:number,yy:number)=>({x:gx+(xx/48-.5)*size,y:gy+(yy/48-.5)*size});
   for(const f of h.world.interiors.home.furniture||[]){const [xx,yy,ww,hh]=f.rect,p=project(xx+ww/2,yy+hh/2);if(f.solid!==false)h.image('interiors/'+(({chest:'chest-closed',desk:'desk-96',fireplace:'hearth',plant:'planter',shelf:'bookcase'} as Record<string,string>)[f.kind]||f.kind),p.x,p.y,ww/48*size,hh/48*size);}
   for(const box of Object.values(c.chests)){const p=project(box.x,box.y-6);h.image(chestArt(box.recipe),p.x,p.y,36/48*size,28/48*size);}
   h.text('PlanDoor','门口 ↓',gx+4*size,gy+5*size+size-24,size,22,12,C.muted,true);
   const selected=v.cells.find(a=>a.x===this.cell.x&&a.y===this.cell.y),ok=!!selected&&!selected.reason;
   if(ok){const p=project(this.cell.x,this.cell.y-6);h.image(chestArt(recipe),p.x,p.y,36/48*size,28/48*size);}
   h.text('PlacementDescription',`${chest?.name||v.recipes[recipe].name}\n${moving?'选择新位置，再确认移动。':'选择空地，再确认摆放。'}\n门口、家具和通路需留空。`,sideX,top,sideW,short?105:150,short?14:17);
   if(!moving)h.button('placement-recipe',this.recipe==='wooden_chest'?'改放加固木箱':'改放普通木箱',sideX,top+(short?116:170),sideW,44,()=>{this.recipe=this.recipe==='wooden_chest'?'reinforced_chest':'wooden_chest';h.redraw(true);},h.busy);
   h.text('PlacementStock',moving?'箱内 '+Object.values(chest!.items).reduce((a,b)=>a+b,0)+' 份物品':`背包中 ${h.state.inventory[recipe]||0} 只`,sideX,top+(short?166:226),sideW,40,15,C.muted);
   h.button('placement-confirm',moving?'确认移动':'确认摆放',sideX,bottom,sideW,44,async()=>{const success=await h.send(moving?'construction_move':'construction_place',{target:moving||'home_desk',chest:moving,recipe,x:this.cell.x,y:this.cell.y,expected_version:chest?.version});if(success){this.cell={x:0,y:0};h.go('world',true);}},h.busy||!ok||!moving&&!(h.state.inventory[recipe]>0),true);
   // The plan uses 6 rows; feedback stays in the side margin on short screens.
   if(h.error||h.notice)h.text('PlacementFeedback',h.error||h.notice,sideX,bottom-42,sideW,40,13,h.error?C.danger:C.muted);
   return;
  }
  if(home){
   h.image('interiors/chest-closed',x+100,top+70,112,84);
   h.text('HomeConstruction',`亲手布置的小屋\n普通木箱 ${h.state.inventory.wooden_chest||0} · 加固木箱 ${h.state.inventory.reinforced_chest||0}\n已摆放 ${Object.keys(c.chests).length} 只木箱`,x+190,top,w-222,short?86:140,short?16:20);
   h.button('home-place-chest','摆放背包里的木箱',x+24,bottom,Math.min(280,(w-64)/2),44,()=>h.go('chest-placement'),h.busy||!(h.state.inventory.wooden_chest||h.state.inventory.reinforced_chest),true);
   h.button('find-carpenter','找阿榆 · 学图纸 / 扩建',x+w/2+8,bottom,w/2-32,44,()=>h.mark({mapId:'workshop',targetId:'carpenter'},'木匠阿榆'),h.busy);
  }else{
   const left=200,dx=x+left+40,dw=w-left-64;
   const ids=npc?[...Object.keys(v.recipes).sort((a,b)=>v.recipes[a].level-v.recipes[b].level),'home','coop','barn','stable']:Object.keys(v.recipes).sort((a,b)=>v.recipes[a].level-v.recipes[b].level);
   const per=short?3:6,pages=Math.ceil(ids.length/per);this.page=Math.min(this.page,pages-1);
   ids.slice(this.page*per,(this.page+1)*per).forEach((id,i)=>h.button('construction-select-'+id,(v.recipes[id]?.name||v.projects[id].name)+(v.projects[id]?' · 工程':''),x+24,top+i*48,left,44,()=>{if(v.recipes[id])this.recipe=id;else this.project=id;this.project=v.recipes[id]?'':id;h.redraw(true);},h.busy,(npc?(this.project||this.recipe):this.recipe)===id,'entry'));
   if(pages>1)h.button('construction-page',`翻页 ${this.page+1}/${pages}`,x+24,bottom-(npc?0:48),left,44,()=>{this.page=(this.page+1)%pages;h.redraw();},h.busy,false,'page');
   const project=npc&&this.project?v.projects[this.project]:null;
   if(project){
    h.text('ProjectDescription',project.level>=project.max_level?`${project.name} · ${project.level}级\n已完成当前全部扩建。`:`${project.name} · ${project.level} → ${project.level+1}级\n${costText(project.costs)}\n工期 ${project.days} 游戏日 · 不要求玩家建造等级`,dx,top,dw,short?88:126,short?15:20);
    h.text('ProjectEffect',this.project==='home'?'提升小屋修缮等级，保留家具与库存。\n本期尚不新增房间。':'扩建动物住所，增加入住容量。\n已有动物和物品完整保留。',dx,top+(short?90:144),dw,short?52:88,short?13:17,C.muted);
    h.button('construction-order',project.level>=project.max_level?'已完成全部扩建':'确认报价并委托施工',dx,bottom,dw,44,()=>h.send('construction_order',{target:'carpenter',building:this.project,expected_level:project.level}),h.busy||!!c.job||project.level>=3||shortages(h.state,project.costs).length>0,true);
   }else{
    const r=v.recipes[this.recipe],known=c.blueprints.includes(this.recipe),level=h.state.skill_growth?.building||0;
    h.image(constructionArt(this.recipe,h.state),dx+44,top+42,88,66);
    h.text('RecipeDescription',`${r.name}${r.slots?' · '+r.slots+'格':' · 生产设备'}\n建造 ${level}/${r.level}级\n${costText(r.costs)}`,dx+104,top,dw-104,short?100:142,short?15:20);
    const reasons=!known?'先向阿榆学习图纸。':level<r.level?'建造等级不足，可在旅人档案投入技能点。':r.kind==='facility'?'制作后进入背包，到牧场加工页摆放。':'每种物品占一格；同类最多9999份。';
    h.text('RecipeHint',npc?'阿榆：先看图纸，尺寸和材料都要对得上。\n图纸免费教授，学会后到工作台制作。':reasons,dx,top+(short?108:160),dw,short?52:84,short?13:17,C.muted);
    h.button(npc?'construction-learn':'construction-craft',npc?(known?'已经学会图纸':'请阿榆教我这张图纸'):r.kind==='facility'?'确认材料 · 制作1台':'确认材料 · 制作1只',dx,bottom,dw,44,()=>h.send(npc?'construction_learn':'construction_craft',{target:npc?'carpenter':'workshop_counter',recipe:this.recipe}),h.busy||(npc?known:!known||level<r.level||shortages(h.state,r.costs).length>0),true);
   }
   if(!npc)h.button('workshop-services','木板 / 工坊修缮',x+24,bottom,left,44,()=>h.go('building'),h.busy,false,'page');
  }
  if(c.job&&!short)h.text('ConstructionJob',`阿榆正在施工：${c.job.name} · 还需 ${Math.ceil(v.remaining_days*24)} 游戏小时`,x+24,bottom-(short?84:96),w-48,32,short?13:16,C.moss);
  feedback();
 }
}
