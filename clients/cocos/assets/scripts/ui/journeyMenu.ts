import type {PanelHost} from './panels';
import {bookSurface,bookLeaves,gameControls,paperSurface,inkRule} from './materials';
import {C} from './theme';
import {mapById} from '../core/navigation';
const entries=[['character','旅人档案','C'],['growth','培养能力',''],['equipment','随行装备',''],['journal','旅途委托','J'],['map','地点与邻里','M'],['life','现实成长','L'],['preferences','旅途偏好',''],['session','旅程凭证',''],['guide','旅人指南',''],['preparation','再出发手记','']];
export function drawJourneyMenu(original:PanelHost,view:{page:number;prepare():void}){
 const h=gameControls(original),compact=h.height<600||h.width<980;
 const w=compact?Math.min(800,h.width-32):Math.min(1160,h.width-32,(h.height-28)*1.5),height=compact?Math.min(390,h.height-24):w/1.5;
 const x=(h.width-w)/2,y=(h.height-height)/2;
 const choose=(mode:string)=>{if(mode==='preparation')view.prepare();h.go(mode);};
 if(compact){
  paperSurface(h,{x,y,w,h:height},true);
  h.text('FeatureTitle','旅程随身页',x+32,y+18,w-200,40,24);
  h.button('close','合上',x+w-112,y+16,80,44,()=>h.close(),h.busy,false,'back');
  const per=6,count=Math.ceil(entries.length/per);view.page=Math.min(view.page,count-1);const bw=(w-80)/2;
  entries.slice(view.page*per,(view.page+1)*per).forEach(([mode,label],i)=>h.button('menu-'+mode,label,x+32+i%2*(bw+16),y+80+Math.floor(i/2)*56,bw,48,()=>choose(mode),h.busy,false,'entry'));
  h.button('menu-prev','前页',x+32,y+height-62,112,44,()=>{view.page--;h.redraw();},h.busy||!view.page,false,'page');
  h.text('MenuPage',`${view.page+1} / ${count}`,x+w/2-40,y+height-62,80,44,14,C.muted,true);
  h.button('menu-next','后页',x+w-144,y+height-62,112,44,()=>{view.page++;h.redraw();},h.busy||view.page>=count-1,false,'page');return;
 }
 bookSurface(h,{x,y,w,h:height});
 const {left,right}=bookLeaves({x,y,w,h:height});
 h.region('menu-left-leaf',left.x,left.y,left.w,left.h);h.region('menu-right-leaf',right.x,right.y,right.w,right.h);
 h.text('FeatureTitle','旅程随身页',left.x,left.y,left.w,38,26);
 h.person('actor-'+h.state.character?.appearance,left.x+22,left.y+86,42,56);
 h.text('MenuTraveler',h.state.character?.name||'旅人',left.x+58,left.y+58,left.w-58,30,20);
 h.text('MenuPlace',mapById(h.world,h.state.location)?.name||h.state.location,left.x+58,left.y+88,left.w-58,24,14,C.muted);
 h.text('MenuRightTitle','手记与旅程',right.x,right.y,right.w-110,38,23);
 h.button('close','合上',right.x+right.w-80,right.y,80,44,()=>h.close(),h.busy,false,'back');
 h.image('items/journal',right.x+22,right.y+84,44,44);
 h.text('MenuRightNote','记录生活，整理下一程',right.x+58,right.y+64,right.w-58,52,15,C.muted);
 const rowHeight=Math.min(56,(left.h-140)/5);
 [entries.slice(0,5),entries.slice(5)].forEach((group,column)=>{
  const leaf=column?right:left,top=leaf.y+132;
  inkRule(h,'MenuRule'+column,leaf.x,top-10,leaf.w);
  group.forEach(([mode,label,key],i)=>{
   const yy=top+i*rowHeight;
   h.button('menu-'+mode,label,leaf.x,yy,leaf.w,Math.max(44,rowHeight-6),()=>choose(mode),h.busy,false,'entry',{label});
   if(key)h.text('MenuKey-'+mode,key,leaf.x+leaf.w-58,yy,24,Math.max(44,rowHeight-6),13,C.muted,true);
  });
 });
}
