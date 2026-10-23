import {formatMoney} from '../core/currency';
import type {PanelHost} from './panels';
import {C} from './theme';
import {paperSurface,timberSurface} from './materials';
import {ranchCatalog,ranchSpecies,ranchShelters,ranchFacilities,ranchProducts,animalArt,stageNames,ranchDays} from '../core/ranching';
import {costText} from '../core/features';
import {villageClock} from '../core/residents';
type Tab='animals'|'buy'|'build'|'feed'|'process';
export class RanchPanels {
 private tab:Tab='animals';private selected='';private page=0;private source='';private name='';private fine=false;
 reset(){this.source='__closed__';}
 snapshot(){return {ranchTab:this.tab,ranchSelected:this.selected,ranchPage:this.page};}
 draw(h:PanelHost){
  const r=h.state.ranching,save=h.state.ranch;if(!r||!save)return;
  const context=h.context?.id||'',contextChanged=context!==this.source;
  if(contextChanged){this.source=context;this.page=0;this.selected='';this.name='';h.redraw(true);this.tab=context.startsWith('animal_')?'animals':context.startsWith('shelter_')?'build':'buy';if(context.startsWith('animal_'))this.selected=context;if(context.startsWith('shelter_'))this.selected=context.slice(8);}
  const short=h.height<560,w=Math.min(1060,h.width-24),height=Math.min(640,h.height-24),x=(h.width-w)/2,y=(h.height-height)/2;
  const top=y+98,bottom=y+height-80,left=short?194:260,dx=x+left+30,dw=w-left-54,bodyH=bottom-top-50;
  timberSurface(h,{x,y,w,h:height});paperSurface(h,{x:x+12,y:y+10,w:w-24,h:height-20});
  h.text('RanchTitle','向阳牧场 · 牧场手记',x+24,y+12,w-150,34,short?20:25);
  h.button('close','回牧场',x+w-104,y+6,80,44,()=>h.close(),h.busy,false,'back-light');
  const tabs:[Tab,string][]=[['animals','伙伴'],['buy','幼崽'],['build','建造'],['feed','饲料'],['process','加工']];
  tabs.forEach(([tab,label],i)=>h.button('ranch-tab-'+tab,label,x+24+i*(w-48)/5,y+52,(w-64)/5,44,()=>{this.tab=tab;this.selected='';this.page=0;h.redraw(true);},h.busy,this.tab===tab,'page',{label,pressed:this.tab===tab}));
  const ids=this.tab==='animals'?Object.keys(r.animals):this.tab==='buy'?ranchSpecies.map(s=>s.id):this.tab==='build'?[...Object.keys(ranchShelters),...Object.keys(ranchFacilities)]:this.tab==='process'?ranchCatalog.recipes.map(q=>q.id):['purchase','wheat','corn','all'];
  const per=short?(h.height<380?2:3):6,pages=Math.max(1,Math.ceil(ids.length/per));this.page=Math.min(this.page,pages-1);
  if(!ids.includes(this.selected))this.selected=ids[0]||'';
  if(contextChanged&&context.startsWith('animal_'))this.page=Math.max(0,Math.floor(ids.indexOf(this.selected)/per));
  const label=(id:string)=>this.tab==='animals'?r.animals[id].name:this.tab==='buy'?ranchSpecies.find(a=>a.id===id)!.baby:this.tab==='build'?(ranchShelters[id]||ranchFacilities[id]).name:this.tab==='process'?ranchProducts[ranchCatalog.recipes.find(a=>a.id===id)!.output].name:({purchase:'购买饲料',wheat:'小麦制饲料',corn:'玉米制饲料',all:'给缺食伙伴添粮'} as Record<string,string>)[id];
  ids.slice(this.page*per,(this.page+1)*per).forEach((id,i)=>h.button('ranch-select-'+id,(id===this.selected?'› ':'')+label(id),x+24,top+i*(short?46:52),left-12,44,()=>{this.selected=id;this.name='';h.redraw(true);},h.busy,id===this.selected,'page',{label:label(id),pressed:id===this.selected}));
  h.line('RanchFold',[{x:x+left+10,y:top},{x:x+left+10,y:bottom-52}],C.line,1);
  if(pages>1){h.button('ranch-prev','上一页',x+24,bottom-48,(left-20)/2,44,()=>{this.page=(this.page+pages-1)%pages;h.redraw();},h.busy,false,'page');h.button('ranch-next',`${this.page+1}/${pages} →`,x+28+(left-20)/2,bottom-48,(left-20)/2,44,()=>{this.page=(this.page+1)%pages;h.redraw();},h.busy,false,'page');}
  h.text('RanchWallet',`钱袋 ${formatMoney(h.state.inventory.gold)} · 饲料 ${h.state.inventory.animal_feed||0}`,x+24,bottom,left-12,44,short?13:15,C.muted);
  const nearLedger=context==='ranch_ledger';
  const send=(action:string,data:Record<string,unknown>={})=>h.send(action,{target:context,...data});
  const shortage=(cost:Record<string,number>)=>Object.entries(cost).some(([k,v])=>(h.state.inventory[k]||0)<v);
  const title=(text:string)=>h.text('RanchDetailTitle',text,dx,top,dw,32,short?18:23);
  const info=(text:string,yy=top+44,hh=bodyH-44)=>{const n=h.text('RanchDetail',text,dx,yy,dw,Math.max(36,hh),short?13:16,C.ink);n.lineHeight=short?19:25;};
  const action=(id:string,text:string,fn:()=>unknown,disabled=false,index=0,count=1)=>h.button(id,text,dx+index*(dw+8)/count,bottom,(dw-8*(count-1))/count,44,fn,h.busy||disabled,index===0,'game');
  const relocate=()=>h.mark({mapId:'pasture',targetId:'ranch_ledger'},'牧场采购簿');
  if(this.tab==='animals'){
   const a=r.animals[this.selected];if(!a){title('牧场还在等第一位伙伴');info('先建造禽舍，再从幼崽页购买小鸡。\n养殖0级就能开始；照料和产出随游戏时间推进。');action('ranch-start-build','查看住所',()=>{this.tab='build';this.selected='coop';h.redraw();});}
   else{
    const spec=ranchSpecies.find(s=>s.id===a.species)!,near=Math.hypot(h.state.position.x-a.x,h.state.position.y-a.y)<=72;
    title(a.name+' · '+stageNames[a.stage]);const size=short?58:128;
    h.image(animalArt(a.species,a.stage),dx+size/2,top+40+size/2,size,size);
    const lines=`口粮 ${ranchDays(a.feed_days)} · 每日 ${spec.feed}份\n亲密 ${a.affection}/20 · ${spec.product?(a.affection>=5?'优质出产':'5点后优质出产'):'骑乘伙伴'}\n`+(a.stage<3?'距成年 '+ranchDays(a.grown_in):spec.product?(a.ready?'可收集 '+a.ready+'份 / 容量3份':'下次产出 '+ranchDays(a.next_product_days)):(short?'户外骑乘 · 移速 +45%':'户外骑乘，移速 +45%'));
    const txt=h.text('AnimalStatus',lines,dx+size+12,top+40,dw-size-12,short?60:150,short?13:17,C.ink);txt.lineHeight=short?20:27;
    if(!short)info(spec.product?(a.feed_days<=0?'缺少口粮，成长和生产已暂停。':'有口粮时持续成长。')+'\n离线和现实模式暂停；产物留存，满3份后暂停生产。':(a.feed_days<=0?'缺少口粮，成长和骑乘已暂停。':a.stage<3?'有口粮时持续成长，成年后可骑乘。':'口粮充足，可在户外骑乘。')+'\n离线和现实模式暂停，不会消耗口粮。',top+192,80);
    const id=this.selected;
    if(save.mounted===id&&!near)action('ranch-collect','下马',()=>h.send('ranch_dismount',{target:id}));
    else if(near){
     h.button('ranch-feed-three','添3日口粮',dx,bottom-48,(dw-8)/2,44,()=>h.send('ranch_feed',{target:id,days:3}),h.busy||a.feed_days>.000001||(h.state.inventory.animal_feed||0)<spec.feed*3,false,'page');
     h.button('ranch-pet','抚摸'+(a.pet_day===villageClock(h.state,h.now).day?' · 今日已完成':''),dx+(dw+8)/2,bottom-48,(dw-8)/2,44,()=>h.send('ranch_pet',{target:id}),h.busy||a.pet_day===villageClock(h.state,h.now).day,false,'page');
     action('ranch-feed','添1日 · '+spec.feed+'份',()=>h.send('ranch_feed',{target:id}),a.feed_days>2.000001||(h.state.inventory.animal_feed||0)<spec.feed,0,2);
     const mounted=save.mounted===id;
     action('ranch-collect',spec.id==='horse'?(mounted?'下马':'骑乘'):spec.id==='sheep'?'剪取羊毛':spec.id==='cow'||spec.id==='goat'?'挤奶':spec.id==='pig'?'拾取松露':'收集蛋',()=>h.send(spec.id==='horse'?(mounted?'ranch_dismount':'ranch_mount'):'ranch_collect',{target:id}),spec.id==='horse'?!mounted&&(a.stage<3||a.feed_days<=0):!a.ready,1,2);
    }else action('ranch-visit','标记伙伴 · 走近照料',()=>h.mark({mapId:'pasture',targetId:id},a.name));
   }
  }else if(this.tab==='buy'){
   const spec=r.catalog.animals.find(s=>s.id===this.selected)!;title(spec.baby+' · '+(spec.price===0?'首次领养援助':formatMoney(spec.price)));
   const size=short?48:92,yy=top+36;
   [1,2,3].forEach((stage,i)=>{h.image(animalArt(spec.id,stage),dx+dw*(i+.5)/3,yy+size/2,size,size);if(!short)h.text('RanchStage'+stage,stageNames[stage],dx+dw*i/3,yy+size,dw/3,24,13,C.muted,true);});
   const reasons=r.offers[spec.id]||[],iy=yy+size+(short?2:32);
   info(`养殖${spec.level}级 · ${spec.young_days}+${spec.growing_days}日成年 · 每日${spec.feed}份饲料\n`+(reasons.length?reasons.join('；'):spec.note),iy,short?42:85);
   if(!short)h.field('ranch-name','伙伴名字（可留空）',this.name,dx,iy+98,dw,v=>this.name=v,false,12);
   action('ranch-buy',nearLedger?(spec.price===0?'领取援助 · 直接入住':'确认购买 · 直接入住'):'前往采购簿',()=>nearLedger?send('ranch_buy',{species:spec.id,expected_next:save.next_id,name:this.name}):relocate(),nearLedger&&reasons.length>0);
  }else if(this.tab==='build'){
   const id=this.selected,shelter=ranchShelters[id],facility=ranchFacilities[id],owned=shelter?r.buildings[id].level:save.facilities[id]?1:0,cost=shelter?r.buildings[id].next_costs:owned?null:facility.costs;
   title((shelter||facility).name+' · '+(owned?(shelter?owned+'级':'已建成'):'待建造'));
   const size=short?72:148;h.image('ranching/'+id+(shelter?'-'+Math.max(1,owned):''),dx+size/2,top+40+size/2,size,shelter?size*.75:size);
   const detail=shelter?`入住 ${r.buildings[id].used}/${r.buildings[id].capacity}\n`+(owned<3?'下一等级容量 '+shelter.capacity[owned+1]:'住所已完成全部扩容'):facility.note;
   const tx=h.text('RanchBuildingInfo',detail+'\n'+(cost?Object.keys(cost).length?'所需：'+costText(cost):'首次禽舍施工援助 · 村民承担费用':'已完成建设'),dx+size+12,top+42,dw-size-12,short?98:180,short?13:17,C.ink);tx.lineHeight=short?20:27;
   if(!short)info('委托工匠使用材料完成建设。\n已有动物和成长记录始终保留。',top+214,70);
   const here=nearLedger||context==='shelter_'+id;
   if(shelter)action('ranch-build',cost?'找木匠委托工程':'住所已完成扩容',()=>h.mark({mapId:'workshop',targetId:'carpenter'},'木匠阿榆'),!cost);
   else action('ranch-build',!here?'前往采购簿':cost?(owned?'确认升级':'确认建造'):'已建成',()=>!here?relocate():send(shelter?'ranch_build':'ranch_facility',shelter?{building:id,expected_level:owned}:{facility:id}),here&&(!cost||shortage(cost)));
  
  }else if(this.tab==='feed'){
   title(label(this.selected));h.image('items/animal_feed',dx+40,top+84,80,80);
   const hungry=Object.values(r.animals).filter(a=>a.feed_days<=.000001),need=hungry.reduce((n,a)=>n+ranchSpecies.find(s=>s.id===a.species)!.feed,0);
   const details:Record<string,string>={purchase:formatMoney(r.feed_price*10)+' → 10份饲料\n可在这里或风铃杂货铺购买。',wheat:'1份小麦 → '+r.catalog.feed_recipes.wheat+'份饲料\n持有小麦 '+(h.state.inventory.wheat||0),corn:'1份玉米 → '+r.catalog.feed_recipes.corn+'份饲料\n持有玉米 '+(h.state.inventory.corn||0),all:`${hungry.length}位伙伴缺食 · 合计${need}份饲料\n为每位缺食伙伴添加1游戏日口粮。`};
   const tx=h.text('RanchFeedInfo',details[this.selected],dx+96,top+42,dw-96,100,short?14:18);tx.lineHeight=short?22:28;
   if(!short)info('食槽最多存3游戏日口粮。\n幼崽喂饱才成长；成年后喂饱才生产。\n离线或进入现实模式都不会消耗口粮。',top+168,100);
   const type=this.selected,disabled=type==='purchase'?h.state.inventory.gold<r.feed_price*10:type==='all'?!hungry.length||(h.state.inventory.animal_feed||0)<need:!(h.state.inventory[type]>0);
   action('ranch-feed-action',nearLedger?(type==='purchase'?'购买10份':type==='all'?'确认补喂':'加工饲料'):'前往采购簿',()=>!nearLedger?relocate():type==='purchase'?send('ranch_feed_buy',{amount:10}):type==='all'?send('ranch_feed_all'):send('ranch_feed_craft',{item:type}),nearLedger&&disabled);
  }else{
   const recipe=ranchCatalog.recipes.find(q=>q.id===this.selected)!,job=r.jobs[recipe.facility],facility=ranchFacilities[recipe.facility],prefix=this.fine?'fine_':'';
   title(ranchProducts[recipe.output].name+' · '+facility.name);
   const size=short?24:100;h.image('items/'+recipe.input,dx+size/2,top+42+size/2,size,size);h.text('RanchArrow','→',dx+size+12,top+(short?34:52),40,short?32:40,short?20:26,C.muted,true);h.image('items/'+recipe.output,dx+size*1.5+68,top+42+size/2,size,size);
   const msg=job?(job.ready?'加工完成：'+(job.output.startsWith('fine_')?'优质':'')+ranchProducts[job.output.replace('fine_','')].name:'正在加工 · 还需'+ranchDays(job.remaining_days)):!save.facilities[recipe.facility]?'请先在建造页安装'+facility.name:`消耗1份${this.fine?'优质':''}${ranchProducts[recipe.input].name} · 持有${h.state.inventory[prefix+recipe.input]||0}份\n耗时${recipe.days}游戏日，成品品质保留。`;
   info(msg,top+size+(short?42:48),short?38:90);
   if(!job)h.button('ranch-quality',this.fine?'使用优质原料':'使用普通原料',dx,bottom-48,dw,44,()=>{this.fine=!this.fine;h.redraw();},h.busy,false,'page');
   action('ranch-process',!nearLedger?'前往采购簿':job?(job.ready?'取出成品':'加工中'):'开始加工',()=>!nearLedger?relocate():job?send('ranch_job_collect',{facility:recipe.facility}):send('ranch_process',{recipe:recipe.id,fine:this.fine}),nearLedger&&(job?!job.ready:!save.facilities[recipe.facility]||!(h.state.inventory[prefix+recipe.input]>0)));
  }
  if(h.error||h.notice)h.text('RanchFeedback',h.error||h.notice,x+24,y+height-30,w-48,18,12,h.error?C.danger:C.muted);
  if(['offline','uncertain','unauthorized'].includes(h.connection))h.button('ranch-reconnect','重连并核对',dx,bottom,dw,44,()=>h.reconnect(),h.processing,true);
 }
}
