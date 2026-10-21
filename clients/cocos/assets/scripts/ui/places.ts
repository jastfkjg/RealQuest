import {paperSurface,inkRule,gameControls} from './materials';
import type { Label } from 'cc';
import type { PanelHost } from './panels';
import { DialogueReader, dialogueCopy } from './dialogue';
import type { PlaceCategory } from '../core/places';
import { placeMaps, placeEntries, placeInfo, placeName, bearingText, socialAccess, neighborRoute } from '../core/places';
import { clockLabel, residentPlace, residentPositions, villageClock } from '../core/residents';
import { shortText, textPages } from '../core/lifeRecords';
import { itemNames } from '../core/features';
import { C } from './theme';
import { atlasProjection, atlasPins } from '../core/atlas';
import { sceneLayouts } from '../core/sceneLayout';
type Frame = { x: number; y: number; w: number; h: number; top?: number; };
type Action = { id: string; label: string; run: () => unknown; disabled?: boolean };
const categories: PlaceCategory[] = ['all','life','resources','routes'];
const categoryNames = { all:'全部地点',life:'生活设施',resources:'资源地标',routes:'出入与旅途' };
export class PlacesPanels {
  private saveId=''; private mapId=''; private category:PlaceCategory='all'; private selected=''; private person='lia';
  private page=0; private neighborPage=0; private leaves=new Map<string,number>(); private gift=''; private message=''; private lastNotice='';
  private reader=new DialogueReader(); private readerLabel:Label|null=null; private readerCue:Label|null=null; private readerHost:PanelHost|null=null;
  private chartPins:ReturnType<typeof atlasPins>=[];
  private modes=['neighbor-find','place-index','map','place-detail','neighbors','neighbor-detail','neighbor-schedule','neighbor-topics','neighbor-gift'];
  handles(mode:string){return this.modes.includes(mode);}
  find(h:PanelHost,id:string){this.init(h);this.person=id;h.go('neighbor-find');}
  inspect(h:PanelHost,id:string){this.init(h);const e=placeEntries(h.world,h.state,h.now).find(e=>e.mapId===h.state.location&&e.object.id===id);if(e){this.mapId=e.mapId;this.selected=e.key;h.go('place-detail');}}
  snapshot(){return {atlasPins:this.chartPins,atlasMap:this.mapId,atlasCategory:this.category,atlasSelected:this.selected,atlasPage:this.page,neighborId:this.person,neighborPage:this.neighborPage,socialGift:this.gift,dialogue:this.reader.snapshot()};}
  private init(h:PanelHost){if(this.saveId!==h.saveId){this.saveId=h.saveId;this.mapId=h.state.location;this.category='all';this.selected='';this.person='lia';this.page=this.neighborPage=0;this.gift='';this.leaves.clear();this.message=this.lastNotice='';}}
  private tactile(h:PanelHost):PanelHost{return gameControls(h);}
  draw(original:PanelHost){
    const h=this.tactile(original);this.init(h);if(h.mode==='neighbor-find'){this.finder(h);return;}if(h.mode==='neighbor-topics'){this.topicChoices(h);return;}if(h.mode==='neighbor-gift'){this.giftTray(h);return;}const heights:Record<string,number>={map:720,'place-detail':440,'neighbor-detail':540,'neighbor-schedule':540,'neighbor-topics':360,'neighbor-gift':500};const f:Frame={w:Math.min(h.mode==='map'?1180:h.mode==='place-detail'?880:h.mode.startsWith('neighbor-')?920:1040,h.width-32),h:Math.min(heights[h.mode]||620,h.height-24),x:0,y:0};f.x=(h.width-f.w)/2;f.y=(h.height-f.h)/2;
    const title=({map:'回响大陆 · 旅途地图','place-index':'地点索引',neighbors:'邻里名册','place-detail':'地点手记','neighbor-detail':'邻里近况','neighbor-schedule':'平常的一天','neighbor-topics':'聊一聊','neighbor-gift':'捎一份心意'} as Record<string,string>)[h.mode];
    this.paper(h,f);h.text('PlacesTitle',title,f.x+24,f.y+12,f.w-160,42,22);h.button('close','返回',f.x+f.w-100,f.y+12,76,44,()=>h.close(),h.busy);
    if(h.mode==='map')this.atlas(h,f);
    else if(h.mode==='place-index'||h.mode==='neighbors')this.index(h,f);
    else if(h.mode==='place-detail')this.place(h,f);
    else if(h.mode==='neighbor-detail'||h.mode==='neighbor-schedule')this.neighbor(h,f);
    if(h.error&&h.mode!=='neighbor-topics')h.text('PlacesError',textPages(h.error,Math.floor((f.w-48)/14),2)[0],f.x+24,f.y+f.h-108,f.w-48,42,14,C.danger);
  }
  private paper(h:PanelHost,f:Frame){
    h.box('PlacesTimberShadow',f.x-3,f.y+3,f.w+6,f.h,C.wood,12);
    paperSurface(h,f,true);
    h.box('PlacesBinding',f.x+12,f.y+12,4,f.h-24,C.wood,2);
    h.line('PlacesHeaderRule',[{x:f.x+24,y:f.y+62},{x:f.x+f.w-24,y:f.y+62}],C.line,1);
  }
  private atlas(h:PanelHost,f:Frame){
    const maps=placeMaps(h.world);if(!maps.some(m=>m.id===this.mapId))this.mapId=h.state.location;
    const mi=maps.findIndex(m=>m.id===this.mapId),map=maps[mi],choose=(n:number)=>{this.mapId=maps[(mi+n+maps.length)%maps.length].id;this.selected='';this.page=0;h.redraw(true);};
    const compact=f.h<470,dock=compact?236:272,chart={x:f.x+24,y:f.y+126,w:f.w-dock-64,h:f.h-216};
    h.button('atlas-map-prev','前区',f.x+24,f.y+72,60,44,()=>choose(-1),h.busy);
    h.text('AtlasMapName',map.name,f.x+92,f.y+72,chart.w-136,44,compact?17:20);
    h.button('atlas-map-next','后区',chart.x+chart.w-60,f.y+72,60,44,()=>choose(1),h.busy);
    const dx=f.x+f.w-dock-24;
    h.button('atlas-places','地点索引',dx,f.y+72,(dock-8)/2,44,()=>h.go('place-index'),h.busy);
    h.button('atlas-neighbors','邻里名册',dx+(dock+8)/2,f.y+72,(dock-8)/2,44,()=>h.go('neighbors'),h.busy);
    h.box('AtlasMapBacking',chart.x-2,chart.y-2,chart.w+4,chart.h+4,'#8f9b73',4);
    const projection=atlasProjection(map,chart),screen=(x:number,y:number)=>({x:projection.x+x*projection.scale,y:projection.y+y*projection.scale});
    h.box('AtlasMapGround',chart.x,chart.y,chart.w,chart.h,'#d0d7bf',2);
    if(map.id==='overworld')h.image('atlas/terrain',projection.x+projection.w/2,projection.y+projection.h/2,projection.w,projection.h);
    else if(sceneLayouts[map.id])h.image('scenes/room-floor',projection.x+projection.w/2,projection.y+projection.h/2,projection.w,projection.h);
    else {
      h.box('AtlasSurveyGround',projection.x,projection.y,projection.w,projection.h,map.id.startsWith('cave_')?'#818477':map.outdoor?'#a6b585':'#d9c8a5',2);
      map.obstacles.forEach(([x,y,w,height],i)=>{const p=screen(x,y);h.box('AtlasObstacle'+i,p.x,p.y,w*projection.scale,height*projection.scale,map.id.startsWith('cave_')?'#5a6456':'#718366',1);});
      map.trees.forEach(([x,y],i)=>{const p=screen(x,y);h.box('AtlasTree'+i,p.x-3,p.y-3,6,6,C.moss,3);});
    }
    const all=placeEntries(h.world,h.state,h.now).filter(e=>e.mapId===this.mapId),entries=all.filter(e=>this.category==='all'||e.category===this.category);
    const per=Math.min(6,Math.max(1,Math.floor((chart.w+8)/(chart.h>=200?112:52))*Math.floor((chart.h-(chart.h>=200?28:0)+8)/(chart.h>=200?88:52)))),pages=Math.max(1,Math.ceil(entries.length/per));this.page=Math.min(this.page,pages-1);
    const visible=entries.slice(this.page*per,(this.page+1)*per);if(!all.some(e=>e.key===this.selected))this.selected=visible[0]?.key||'';
    all.forEach(e=>{const p=screen(e.object.x,e.object.y);h.box('AtlasPoint-'+e.key,p.x-2,p.y-2,4,4,C.ink,2);if(e.object.kind==='building'&&['home','workshop','library','guild','shop'].includes(e.object.id))h.image('village/'+e.object.id,p.x,p.y-12,40,44);});
    this.chartPins=atlasPins(visible.map(e=>({key:e.key,...screen(e.object.x,e.object.y)})),chart);
    this.chartPins.forEach((pin,i)=>{const e=visible[i],p=pin.target,selected=e.key===this.selected;
      h.line('AtlasLeader-'+e.key,[{x:pin.x,y:pin.y},{x:p.x,y:p.y}],C.ink,2);
      h.button('atlas-place-'+e.object.id,String(this.page*per+i+1),p.x-22,p.y-22,44,44,()=>{this.selected=e.key;h.redraw();},h.busy,selected,undefined,{label:'选择地点 '+placeName(e,h.world),pressed:selected});
      if(chart.h>=200){const xx=Math.max(chart.x,Math.min(chart.x+chart.w-104,p.x-52));h.box('AtlasCaptionPaper',xx,p.y+23,104,26,C.paper,3);h.text('AtlasPinCaption-'+i,shortText(placeName(e,h.world),6),xx+2,p.y+23,100,26,14,C.ink,true);}
    });
    if(h.state.location===map.id){const p=screen(h.state.position.x,h.state.position.y);h.box('AtlasPlayerRim',p.x-6,p.y-6,12,12,C.ink,6);h.box('AtlasPlayer',p.x-4,p.y-4,8,8,C.raised,4);}
    h.text('AtlasLegend',map.id==='overworld'?'● 你的位置 · 数字路标可选 · 地形为旅途插画':'● 你的位置 · 数字路标可选 · 按实际区域坐标绘制',chart.x,chart.y+chart.h+5,chart.w,24,12,C.muted);
    const e=all.find(e=>e.key===this.selected);
    h.box('AtlasDock',dx,f.y+126,dock,f.h-216,C.raised,6);
    if(e){const portrait=['lia','noah','mira','adu','lanya'].includes(e.object.id),art=portrait?'atlas/'+e.object.id:e.object.kind==='building'&&['home','workshop','library','guild','shop'].includes(e.object.id)?'village/'+e.object.id:e.object.kind==='plot'?'items/seed':null;
      if(!compact&&art)h.image(art,dx+dock/2,f.y+186,portrait?80:72,80);
      const ty=f.y+(compact?126:238);h.text('AtlasSelectedName',compact?shortText(placeName(e,h.world),12):placeName(e,h.world),dx+12,ty,dock-24,compact?26:44,compact?16:22,C.ink,true);
      if(!compact)h.text('AtlasSelectedNote',textPages(placeInfo(e,h.world,h.state,h.now),14,4)[0],dx+16,ty+52,dock-32,104,16,C.muted);
      h.button('atlas-detail','查看地点手记',dx+12,f.y+f.h-184,dock-24,44,()=>h.go('place-detail'),h.busy);
      h.button('atlas-mark','标记方向并返回',dx+12,f.y+f.h-132,dock-24,44,()=>h.mark({mapId:e.mapId,targetId:e.object.id},placeName(e,h.world)),h.busy,true);
    }
    const yy=f.y+f.h-62;
    h.button('atlas-prev','前页',f.x+24,yy,72,44,()=>{this.page--;h.redraw();},h.busy||!this.page);
    h.button('atlas-next',(this.page+1)+'/'+pages+' · 后页',f.x+104,yy,100,44,()=>{this.page++;h.redraw();},h.busy||this.page>=pages-1);
    h.button('atlas-category',categoryNames[this.category],f.x+212,yy,128,44,()=>{this.category=categories[(categories.indexOf(this.category)+1)%categories.length];this.page=0;h.redraw(true);},h.busy);
    h.button('atlas-current','回到当前位置',dx,yy,dock,44,()=>{this.mapId=h.state.location;this.category='all';this.page=0;this.selected='';h.redraw(true);},h.busy);
  }
  private leaf(h:PanelHost,f:Frame,key:string,body:string,top=78){
    const illustrated=f.h>=420,offset=illustrated?224:24,bodyWidth=f.w-offset-24;
    if(illustrated){const entry=placeEntries(h.world,h.state,h.now).find(e=>e.key===this.selected),person=this.person;
      const objectArt:Record<string,string>={plot:'items/seed',wood:'items/wood',stone:'items/stone',storage:'interiors/chest-closed',rest:'interiors/bed',study:'interiors/book',station:'interiors/workbench',armory:'interiors/anvil',market:'interiors/market-counter',board:'interiors/notice',spellbook:'interiors/book'};
      const art=h.mode==='neighbor-gift'?'items/'+this.gift:h.mode.startsWith('neighbor-')?'atlas/'+person:entry?.object.kind==='building'&&['home','workshop','library','guild','shop'].includes(entry.object.id)?'village/'+entry.object.id:entry?objectArt[entry.object.kind]:null;
      inkRule(h,'PlacePortraitRule',f.x+44,f.y+328,128);
      if(art)h.image(art,f.x+108,f.y+178,96,96);
      else {h.box('PlaceSubjectSeal',f.x+76,f.y+146,64,64,C.canvas,8);h.text('PlaceSubjectGlyph','路标',f.x+80,f.y+152,56,52,20,C.ink,true);}
      const title=h.mode==='neighbor-gift'?(itemNames[this.gift]||this.gift):h.mode.startsWith('neighbor-')?(h.world.residents?.find(r=>r.id===person)?.name||'旅途人物'):entry?placeName(entry,h.world):'旅途手记';
      h.text('PlaceSubjectTitle',title,f.x+36,f.y+238,144,48,18,C.ink,true);
      h.text('PlaceSubjectHint',h.mode==='neighbor-gift'?'持有 '+(h.state.inventory[this.gift]||0)+' 份':'翻阅手记 · 到场互动',f.x+36,f.y+282,144,26,14,C.muted,true);
      h.line('PlacesFold',[{x:f.x+204,y:f.y+90},{x:f.x+204,y:f.y+f.h-126}],C.line,1);
    }
    const parts=body.split('\n'),heading=illustrated?parts.shift()||'':'';
    const bodyTop=top+(illustrated?46:0),rows=Math.max(2,Math.floor((f.h-114-bodyTop)/24)),pages=textPages(illustrated?parts.join('\n'):body,Math.max(16,Math.floor(bodyWidth/16)),rows),index=Math.max(0,Math.min(this.leaves.get(key)||0,pages.length-1));this.leaves.set(key,index);
    if(illustrated)h.text('PlacesLeafHeading',heading,f.x+offset,f.y+top,bodyWidth,36,22);
    h.text('PlacesBody',pages[index],f.x+offset,f.y+bodyTop,bodyWidth,Math.min(rows,pages[index].split('\n').length)*24,16);return {key,index,count:pages.length};
  }

  private footer(h:PanelHost,f:Frame,p:{key:string;index:number;count:number},primary:Action,secondary?:Action){
    const y=f.y+f.h-62,middle=(f.w-264)/2;
    h.button('places-prev','前页',f.x+24,y,96,44,()=>{this.leaves.set(p.key,p.index-1);h.redraw();},h.busy||!p.index);
    h.button(primary.id,primary.label,f.x+128,y,secondary?middle:f.w-256,44,primary.run,h.busy||!!primary.disabled,true);
    if(secondary)h.button(secondary.id,secondary.label,f.x+136+middle,y,middle,44,secondary.run,h.busy||!!secondary.disabled);
    h.button('places-next','后页 '+(p.index+1)+'/'+p.count,f.x+f.w-120,y,96,44,()=>{this.leaves.set(p.key,p.index+1);h.redraw();},h.busy||p.index>=p.count-1);
  }
  private index(h:PanelHost,f:Frame){
    const neighbors=h.mode==='neighbors',half=(f.w-56)/2;
    h.button('atlas-places','地点索引',f.x+24,f.y+68,half,44,()=>h.go('place-index'),h.busy,!neighbors);
    h.button('atlas-neighbors','村民名录',f.x+32+half,f.y+68,half,44,()=>h.go('neighbors'),h.busy,neighbors);
    if(neighbors){this.neighborIndex(h,f);return;}
    const maps=placeMaps(h.world);if(!maps.some(m=>m.id===this.mapId))this.mapId=h.state.location;
    const mi=Math.max(0,maps.findIndex(m=>m.id===this.mapId)),choose=(n:number)=>{this.mapId=maps[(mi+n+maps.length)%maps.length].id;this.page=0;h.redraw(true);};
    h.button('atlas-category',categoryNames[this.category]+' · 切换',f.x+24,f.y+126,152,44,()=>{this.category=categories[(categories.indexOf(this.category)+1)%categories.length];this.page=0;h.redraw(true);},h.busy);
    h.button('atlas-map-prev','前区',f.x+184,f.y+126,60,44,()=>choose(-1),h.busy);
    h.text('AtlasMapName',maps[mi].name,f.x+252,f.y+126,f.w-352,44,18,C.ink,true);
    h.button('atlas-map-next','后区',f.x+f.w-84,f.y+126,60,44,()=>choose(1),h.busy);
    const entries=placeEntries(h.world,h.state,h.now).filter(e=>e.mapId===this.mapId&&(this.category==='all'||e.category===this.category)),per=Math.max(1,Math.floor((f.h-270)/52)),pages=Math.max(1,Math.ceil(entries.length/per));this.page=Math.min(this.page,pages-1);
    entries.slice(this.page*per,(this.page+1)*per).forEach((e,i)=>h.button('atlas-place-'+e.object.id,shortText(placeName(e,h.world),Math.floor((f.w-64)/16)),f.x+24,f.y+184+i*52,f.w-48,44,()=>{this.selected=e.key;h.go('place-detail');},h.busy));
    if(!entries.length)h.text('AtlasEmpty','此区域没有这一类地点。可切换分类或区域。',f.x+24,f.y+184,f.w-48,44,16,C.muted);
    this.indexFooter(h,f,this.page,pages,()=>{this.page--;h.redraw();},()=>{this.page++;h.redraw();},()=>{this.mapId=h.state.location;this.category='all';this.page=0;h.redraw(true);},'当前位置 · '+shortText(residentPlace(h.world,h.state.location),12));
  }
  private indexFooter(h:PanelHost,f:Frame,index:number,count:number,previous:()=>void,next:()=>void,center:()=>void,label:string){
    const y=f.y+f.h-62;h.button('atlas-prev','前页',f.x+24,y,96,44,previous,h.busy||!index);
    h.button('atlas-current',label,f.x+128,y,f.w-256,44,center,h.busy);
    h.button('atlas-next','后页 '+(index+1)+'/'+count,f.x+f.w-120,y,96,44,next,h.busy||index>=count-1);
  }
  private place(h:PanelHost,f:Frame){
    const e=placeEntries(h.world,h.state,h.now).find(e=>e.key===this.selected);
    if(!e){const p=this.leaf(h,f,'missing','地点或村民位置已更新，请返回索引重新选择。');this.footer(h,f,p,{id:'atlas-reselect',label:'返回地点索引',run:()=>h.go('map')});return;}
    const p=this.leaf(h,f,'place:'+e.key,placeInfo(e,h.world,h.state,h.now));
    this.footer(h,f,p,{id:'atlas-mark',label:'标记方向并返回',run:()=>h.mark({mapId:e.mapId,targetId:e.object.id},placeName(e,h.world))});
  }
  private neighborIndex(h:PanelHost,f:Frame){
    const entries=residentPositions(h.world,h.state,h.now),per=Math.max(1,Math.floor((f.h-210)/64)),pages=Math.max(1,Math.ceil(entries.length/per));this.neighborPage=Math.min(this.neighborPage,pages-1);
    entries.slice(this.neighborPage*per,(this.neighborPage+1)*per).forEach((r,i)=>{const yy=f.y+126+i*64;h.image('atlas/'+r.id,f.x+52,yy+28,48,48);h.button('neighbor-'+r.id,r.name+' · '+residentPlace(h.world,r.location!)+'\n'+shortText(r.activity||'旅途人物',Math.floor((f.w-128)/16)),f.x+88,yy,f.w-112,56,()=>{this.person=r.id;h.go('neighbor-detail');},h.busy);});
    const c=villageClock(h.state,h.now);this.indexFooter(h,f,this.neighborPage,pages,()=>{this.neighborPage--;h.redraw();},()=>{this.neighborPage++;h.redraw();},()=>h.go('map'),'游戏第'+c.day+'天 · '+clockLabel(c.minute));
  }
  private neighbor(h:PanelHost,f:Frame){
    const r=h.world.residents?.find(r=>r.id===this.person),a=socialAccess(h.world,h.state,h.now,this.person),p=a.person;
    if(!p)return;
    const schedule=h.mode==='neighbor-schedule',clock=villageClock(h.state,h.now);
    const body=schedule&&r ? r.name+' · 平常的一天\n'+r.schedule.map(s=>(s.minute===p.phase?'此刻 · ':'')+clockLabel(s.minute)+' '+residentPlace(h.world,s.location)+' · '+s.activity).join('\n')+'\n作息按游戏时钟，阅读时暂停；和你交谈时会停留。每日社交限制按北京时间，游戏睡眠不重置。'
      : p.name+' · '+(r?.role||'旅途人物')+'\n'+(r?.signature||p.activity)+'\n当前位置：'+residentPlace(h.world,p.location!)+' · '+p.activity+'\n游戏第'+clock.day+'天 '+clockLabel(clock.minute)+'\n'+(r?'熟悉度 '+(h.state.relationships[r.id]||0)+' · '+(a.social?.memory_unlocked?'往事话题已解锁':'熟悉度5解锁往事')+'\n最爱 '+(itemNames[r.favorite]||r.favorite)+' · 喜欢 '+(itemNames[r.liked]||r.liked)+'\n帮忙：'+r.help+'\n今日'+(a.social?.greeted?'已问候':'尚未问候')+' · '+(a.social?.gifted?'已送心意':'可送一份心意')+' · '+(a.social?.helped?'已帮忙':'可帮一次忙')+'\n社交需要到场确认，每日限制按北京时间零点刷新。':'没有村民熟悉度/赠礼接口；到场查看旅途报价。')+'\n'+bearingText({mapId:p.location!,targetId:p.id},h.world,h.state,h.now);
    let leaf:{key:string;index:number;count:number};
    if(!schedule&&f.h>=500){
      const lx=f.x+36,lw=190,rx=f.x+266,rw=f.w-306;
      h.image('atlas/'+p.id,lx+lw/2,f.y+158,112,112);
      h.text('NeighborName',p.name,lx,f.y+232,lw,38,26,C.ink,true);
      h.text('NeighborRole',r?.role||'旅途人物',lx,f.y+274,lw,28,16,C.wood,true);
      h.text('NeighborSignature',textPages(r?.signature||p.activity,11,4)[0],lx+4,f.y+320,lw-8,96,16,C.muted,true);
      inkRule(h,'NeighborPortraitRule',lx+24,f.y+420,lw-48);
      h.text('NeighborPlace','此刻在'+residentPlace(h.world,p.location!),rx,f.y+88,rw,36,22);
      h.text('NeighborActivity',p.activity+' · 第'+clock.day+'天 '+clockLabel(clock.minute),rx,f.y+130,rw,30,16,C.muted);
      inkRule(h,'NeighborNoteRule',rx,f.y+178,rw);
      if(r){
        h.text('NeighborBond','熟悉度 '+(h.state.relationships[r.id]||0)+' · '+(a.social?.memory_unlocked?'可以聊聊往事':'熟悉度5可聊往事'),rx,f.y+192,rw,30,17);
        [['最爱',r.favorite],['喜欢',r.liked]].forEach(([caption,id],i)=>{const xx=rx+i*(rw/2);if(h.hasArt('items/'+id))h.image('items/'+id,xx+20,f.y+260,32,32);h.text('NeighborGift-'+i,caption+' '+(itemNames[id]||id),xx+44,f.y+242,rw/2-44,36,16);});
        h.text('NeighborHelp','一起做点事 · '+r.help,rx,f.y+292,rw,48,17);
        h.text('NeighborToday','今日'+(a.social?.greeted?'已问候':'尚未问候')+' · '+(a.social?.gifted?'已送心意':'可送心意')+' · '+(a.social?.helped?'已帮忙':'可帮忙'),rx,f.y+344,rw,28,15,C.muted);
      }else h.text('NeighborTravelRole','到场后可查看这段旅途的安排与报价。',rx,f.y+204,rw,64,18);
      h.text('NeighborBearing',textPages(bearingText({mapId:p.location!,targetId:p.id},h.world,h.state,h.now),Math.floor(rw/15),2)[0],rx,f.y+384,rw,42,15,C.moss);
      if(!h.error)h.text('NeighborSocialRule',r?'社交需到场确认；每日限制按北京时间零点刷新。':'此人物没有熟悉度与赠礼接口。',f.x+32,f.y+f.h-108,f.w-64,38,14,C.muted);
      leaf={key:'neighbor:'+p.id,index:0,count:1};
    }else leaf=this.leaf(h,f,(schedule?'schedule:':'neighbor:')+p.id,body);
    this.footer(h,f,leaf,{id:'neighbor-mark',label:'标记此人并返回',run:()=>h.mark({mapId:p.location!,targetId:p.id},p.name)},r?{id:'neighbor-routine',label:schedule?'查看近况':'日常作息',run:()=>h.go(schedule?'neighbor-detail':'neighbor-schedule')}:{id:'neighbor-index',label:'村民名录',run:()=>h.go('neighbors')});
  }
  private speaker(h:PanelHost){this.init(h);const id=h.context?.kind==='npc'?h.context.id:'';if(id){this.person=id;if(h.notice&&h.notice!==this.lastNotice){this.message=h.notice;this.lastNotice=h.notice;}}return id;}
  private finder(h:PanelHost){
    const route=neighborRoute(h.world,h.state,h.now,this.person);if(!route)return;
    const w=Math.min(700,h.width-32),height=Math.min(340,h.height-24),x=(h.width-w)/2,y=h.height-height-12,p=route.person;
    h.box('FinderWood',x-3,y+4,w+6,height,C.wood,10);paperSurface(h,{x,y,w,h:height});
    h.text('FinderTitle','今天想找谁？',x+24,y+14,w-272,40,22);
    ['lia','noah','mira'].forEach((id,i)=>{const xx=x+w-232+i*68,name=h.world.residents?.find(r=>r.id===id)?.name||id;h.button('finder-'+id,'',xx,y+12,60,60,()=>{this.person=id;h.redraw();},h.busy,id===this.person,undefined,{label:'选择'+name,pressed:id===this.person});h.image('atlas/'+id,xx+30,y+42,52,52);});
    h.image('atlas/'+p.id,x+88,y+142,128,128);h.text('FinderName',p.name,x+24,y+214,128,32,22,C.ink,true);
    h.text('FinderRole',h.world.residents?.find(r=>r.id===p.id)?.role||'旅途人物',x+24,y+250,128,26,14,C.muted,true);
    h.text('FinderWords',p.name+'现在在'+residentPlace(h.world,p.location!)+'。\n'+route.instruction,x+180,y+86,w-204,100,18);
    h.button('find-go',route.sameMap?'走近'+p.name+'，聊两句':'标记去'+residentPlace(h.world,p.location!)+'的方向',x+180,y+height-112,w-204,44,()=>route.sameMap?h.meet(p.id):h.mark(route.target,p.name),h.busy,true);
    h.button('find-about','先了解 TA',x+180,y+height-60,160,44,()=>h.go('neighbor-detail'),h.busy);
    h.button('close','先不去',x+w-112,y+height-60,88,44,()=>h.close(),h.busy);
  }
  private encounterFrame(h:PanelHost){
    const short=h.height<500,topics=h.mode==='neighbor-topics',choices=topics||this.reader.choices,w=Math.min(900,h.width-32),height=topics?(short?228:244):choices?(short?168:200):(short?144:176),x=(h.width-w)/2,y=h.height-height-16;
    h.box('EncounterShadow',x-3,y+5,w+6,height,C.wood,8);
    paperSurface(h,{x,y,w,h:height});
    h.box('EncounterTop',x+8,y+6,w-16,3,C.line,0);
    return {x,y,w,h:height,short};
  }
  get dialogueChoices(){return this.reader.choices;}
  advance(h:PanelHost){if(h.mode!=='dialogue'||h.busy||this.reader.choices)return false;this.reader.advance(h.reducedMotion);h.redraw();return true;}
  tick(dt:number){
    const h=this.readerHost;if(!h||h.mode!=='dialogue')return;
    this.reader.tick(dt,h.reducedMotion);
    if(this.readerLabel?.isValid&&!this.reader.choices)this.readerLabel.string=this.reader.text;
    if(this.readerCue?.isValid)this.readerCue.string=this.reader.typing?'点击显全文':this.reader.more?'继续听  ▾':'回应  ▾';
  }
  private replies(h:PanelHost,f:ReturnType<PlacesPanels['encounterFrame']>,entries:[string,string,()=>unknown,boolean?][]){
    const topics=h.mode==='neighbor-topics',portrait=topics?76:f.short?72:104,x=f.x+portrait+36,w=f.w-portrait-60,top=f.y+(topics?56:f.short?48:56),cell=(w-8)/2;
    entries.forEach(([id,label,run,disabled],i)=>h.button(id,'› '+label,x+(i%2)*(cell+8),top+Math.floor(i/2)*52,cell,44,run,h.busy||disabled,false,'answer'));
  }
  encounter(original:PanelHost,tab:(id:string)=>void){
    const h=original,id=this.speaker(h);if(!id)return;const short=h.height<500,name=h.context?.name||id,portrait=short?72:104,ww=Math.min(900,h.width-32)-portrait-60;
    const rows=short?2:3,raw=this.message||'很高兴在村里见到你。',copy=dialogueCopy(raw,name),pages=copy.words.split(/(?<=[。！？])|\n/).filter(Boolean).flatMap(sentence=>textPages(sentence,Math.max(14,Math.floor(ww/18)),rows));
    this.reader.open(h.saveId+id+(h.state.npc_encounter?.token||'')+raw,pages,h.reducedMotion);this.readerHost=h;
    const f=this.encounterFrame(h),tx=f.x+portrait+36;
    h.button('neighbor-about','了解'+name,f.x+12,f.y+22,portrait,portrait,()=>h.go('neighbor-detail'),h.busy,false,'portrait');h.image('atlas/'+id,f.x+12+portrait/2,f.y+22+portrait/2,portrait,portrait);
    h.box('SpeakerNameplate',tx-8,f.y-16,112,36,C.moss,4);h.text('EncounterName',name,tx,f.y-16,96,36,20,C.paper,true);
    if(!this.reader.choices)h.button('dialogue-read','继续这句台词',tx,f.y+24,ww,rows*27,()=>this.advance(h),h.busy,false,'portrait');
    this.readerLabel=h.text('NeighborWords',this.reader.choices?shortText(this.reader.text,Math.floor(ww/18)):this.reader.text,tx,f.y+(this.reader.choices?12:24),ww,this.reader.choices?30:rows*27,18);
    h.text('NeighborSource',h.error||copy.outcome||'预设剧情',tx,f.y+f.h-(this.reader.choices?24:42),this.reader.choices?ww:Math.max(100,ww-190),22,13,h.error?C.danger:copy.outcome?C.moss:C.muted);
    if(!this.reader.choices){
      this.readerCue=h.button('dialogue-next','继续对话',f.x+f.w-184,f.y+f.h-52,168,44,()=>this.advance(h),h.busy,false,'game');
    }else{
      this.readerCue=null;
      const replies:[string,string,()=>unknown][]=[['neighbor-topics','聊点别的吧。',()=>h.go('neighbor-topics')],['tab-quests','有什么需要帮忙的？',()=>tab('quests')],...(id==='noah'?[['tab-contracts','想接一份现实约定。',()=>tab('contracts')] as [string,string,()=>unknown]]:id==='mira'?[['tab-shop','我想逛逛小铺。',()=>tab('shop')] as [string,string,()=>unknown]]:[]),['close','下次见。',()=>h.close()]];
      this.replies(h,f,replies);
    }
  }
  private topicChoices(h:PanelHost){
    const id=this.speaker(h),a=socialAccess(h.world,h.state,h.now,id);if(!id)return;const f=this.encounterFrame(h),name=h.context?.name||id;
    h.image('atlas/'+id,f.x+52,f.y+56,72,72);h.text('TopicName',name,f.x+16,f.y+96,72,28,18,C.ink,true);
    h.text('TopicPrompt',h.error||(!a.near?'对方已经继续行程了，先找过去吧。':'想聊些什么？'),f.x+112,f.y+12,f.w-140,36,18,h.error?C.danger:C.ink);
    const topics:[string,string][]=[['today','最近过得怎么样？'],['interest','平时喜欢什么？'],['routine','每天都忙些什么？'],['memory',a.social?.memory_unlocked?'想听听你的故事。':'熟悉以后，想听你的故事。']];
    this.replies(h,f,topics.map(([topic,label])=>['npc-'+topic,label,()=>this.converse(h,'npc_topic',{target:id,topic}),!a.near||(topic==='memory'&&!a.memory)]));
    const w=(f.w-148)/3,y=f.y+f.h-58;
    h.button('npc-gift-choose','捎一份小心意',f.x+112,y,w,44,()=>{this.gift=h.world.residents?.find(r=>r.id===id)?.favorite||'crop';h.go('neighbor-gift');},h.busy,false,'game');
    h.button('npc-help',a.social?.helped?'今天已一起忙过':'帮个忙 · 4体力',f.x+120+w,y,w,44,()=>this.converse(h,'npc_help',{target:id}),h.busy||!a.help,false,'game');
    h.button('social-return',a.near?'接着聊':'标记位置',f.x+128+w*2,y,w,44,()=>a.near?h.go('dialogue'):a.person&&h.mark({mapId:a.person.location!,targetId:id},a.person.name),h.busy,true,'game');
  }
  private giftTray(h:PanelHost){
    const id=this.speaker(h),r=h.world.residents?.find(r=>r.id===id),a=socialAccess(h.world,h.state,h.now,id);if(!r)return;
    const w=Math.min(920,h.width-32),height=Math.min(320,h.height-24),x=(h.width-w)/2,y=h.height-height-12,choices=['crop','wood','stone','plank','seed'];if(!choices.includes(this.gift))this.gift=r.favorite;
    h.box('GiftWood',x-4,y+4,w+8,height,'#70563e',10);paperSurface(h,{x,y,w,h:height});
    h.image('atlas/'+id,x+w-88,y+94,112,112);h.text('GiftRecipient',r.name,x+w-156,y+158,136,30,20,C.ink,true);
    h.text('GiftQuestion','捎了点东西，想送给你。',x+24,y+12,w-200,36,22);
    const cell=60,gap=8,start=x+24;
    choices.forEach((item,i)=>{const xx=start+i*(cell+gap);h.button('gift-item-'+item,'',xx,y+62,cell,76,()=>{this.gift=item;h.redraw(true);},h.busy,item===this.gift,undefined,{label:'选择'+itemNames[item]+'，持有'+(h.state.inventory[item]||0)+'份',pressed:item===this.gift});h.image('items/'+item,xx+30,y+90,40,40);h.text('GiftQuantity',String(h.state.inventory[item]||0),xx+4,y+110,52,26,14,item===this.gift?C.paper:C.ink,true);});
    h.text('GiftName',(itemNames[this.gift]||this.gift)+' · 持有 '+(h.state.inventory[this.gift]||0)+'份',x+24,y+150,w-208,30,18);
    const note=h.error||a.social?.gifted&&'今天已收过心意，明天再来吧。'||!a.near&&'对方已离开，请先找过去。'||!h.state.inventory[this.gift]&&'背包里还没有这件物品。'||'送出会消耗1份。'+(this.gift===r.favorite?'这是 TA 最爱的礼物，熟悉度 +2。':'熟悉度 +1。');
    h.text('GiftNote',textPages(note,Math.floor((w-48)/16),2)[0],x+24,y+186,w-48,48,16,h.error?C.danger:C.muted);
    h.text('GiftDaily','每人每天一次 · 北京时间零点刷新',x+24,y+height-84,w-48,24,14,C.muted);
    const select=(n:number)=>{this.gift=choices[(choices.indexOf(this.gift)+n+choices.length)%choices.length];h.redraw(true);};
    h.button('gift-prev','前份',x+24,y+height-56,60,44,()=>select(-1),h.busy);
    h.button('gift-next','后份',x+92,y+height-56,60,44,()=>select(1),h.busy);
    h.button('npc-give','送出1份 '+itemNames[this.gift],x+160,y+height-56,w-320,44,()=>this.converse(h,'npc_gift',{target:id,item:this.gift}),h.busy||!a.gift||!(h.state.inventory[this.gift]>0),true,'game');
    h.button('gift-topics','先收起来',x+w-152,y+height-56,128,44,()=>h.go('neighbor-topics'),h.busy);
  }
  private async converse(h:PanelHost,action:string,data:Record<string,unknown>){if(await h.send(action,data)){this.message=h.notice;this.lastNotice=h.notice;this.leaves.set('words:'+String(data.target),0);h.go('dialogue',true);}}
}
