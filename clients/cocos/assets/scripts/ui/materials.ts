import type {PanelHost,ControlSkin} from './panels';
import {C} from './theme';

export const uiArtPaths=['ui/arrival','ui/register','ui/book','ui/life-book','ui/letter'];
export const webMaterialPaths=new Set([...uiArtPaths,'ui/notice-paper']);
export const lazyMaterialPaths=new Set(['ui/book','ui/life-book','ui/letter']);
export type SurfaceBounds={x:number;y:number;w:number;h:number};
export function controlSkin(id:string,skin?:ControlSkin):ControlSkin{
 if(skin&&skin!=='game')return skin;
 if(id==='close'||id==='session-close')return 'back';
 if(/^(tab-|scope-|filter-|guide-tab-|dossier-(overview|attributes|levels)$|session-tab-|preference-(sound|motion|screen|notices)$|history-(activities|exercise)$)/.test(id))return 'tab';
 if(/^(open-(?:study|plan|activity|contract|exercise|record|link)-|select-|menu-|dossier-target-|neighbor-select-)/.test(id)&&!/(prev|next)$/.test(id))return 'entry';
 if(/(?:-prev|-next)$/.test(id))return 'page';
 return skin||'game';
}

/** Shared tactile controls; layout, wording, focus and mutations belong to each view. */
export function gameControls(h:PanelHost):PanelHost{
 // Retain live accessors: handlers read the reconciled state after awaiting send.
 const styled:PanelHost=Object.create(h);
 styled.button=(id,label,x,y,w,height,action,disabled,primary,skin,semantic)=>{
  return h.button(id,label,x,y,w,height,action,disabled,primary,controlSkin(id,skin),semantic);
 };
 return styled;
}
export function paperSurface(h:PanelHost,f:SurfaceBounds,binding=false){
 h.box('LeafShadow',f.x+3,f.y+5,f.w,f.h,'#15291d66',3);
 h.image('ui/notice-paper',f.x+f.w/2,f.y+f.h/2,f.w,f.h,true);
 if(binding){h.box('ClothBinding',f.x+8,f.y+18,5,f.h-36,C.moss,2);for(let i=0;i<3;i++)h.box('BindingStitch'+i,f.x+7,f.y+32+i*10,7,2,C.amber,0);}
}
export function timberSurface(h:PanelHost,f:SurfaceBounds){
 h.box('TimberShadow',f.x+4,f.y+6,f.w,f.h,'#15291d66',3);
 h.image('ui/notice-timber',f.x+f.w/2,f.y+f.h/2,f.w,f.h,true);
}
export function bookSurface(h:PanelHost,f:SurfaceBounds,asymmetric=false){
 // A quiet linen fallback remains usable while the full book loads on demand.
 const path=asymmetric?'ui/life-book':'ui/book';
 if(!h.hasArt(path))h.box('BookFallback',f.x+16,f.y+26,f.w-32,f.h-52,C.paper,5);
 h.image(path,f.x+f.w/2,f.y+f.h/2,f.w,f.h);
}

/** Content stays inside the illustrated leaf, including its ragged outer edge. */
export function bookLeaves(f:SurfaceBounds,asymmetric=false){
 const left={x:f.x+f.w*(asymmetric?.075:.105),y:f.y+f.h*.15,w:f.w*(asymmetric?.245:.32),h:f.h*.63};
 const right={x:f.x+f.w*(asymmetric?.405:.555),y:f.y+f.h*.15,w:f.w*(asymmetric?.51:.32),h:f.h*.63};
 return {left,right};
}

export function inkRule(h:PanelHost,id:string,x:number,y:number,w:number){
 h.line(id,[{x,y},{x:x+w,y}],C.line,1);
 h.box(id+'Seal',x,y-2,4,4,C.wood,0);
}

export function meter(h:PanelHost,id:string,label:string,current:number,max:number,x:number,y:number,w:number){
 h.text(id,label,x,y,w,28,16,C.muted);
 h.text(id+'Value',`${Math.floor(current)} / ${max}`,x,y+28,w,36,24);
 h.box(id+'Track',x,y+72,w,5,C.canvas,0);
 if(max>0&&current>0)h.box(id+'Fill',x,y+72,w*Math.min(1,current/max),5,C.moss,0);
}
