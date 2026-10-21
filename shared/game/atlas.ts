import type { MapData } from './protocol';
export type AtlasRect = {x:number;y:number;w:number;h:number};
/** One uniform scale: world coordinates are never moved to make a control fit. */
export function atlasProjection(map:MapData,frame:AtlasRect){
  const scale=Math.min(frame.w/map.width,frame.h/map.height),w=map.width*scale,h=map.height*scale;
  return {x:frame.x+(frame.w-w)/2,y:frame.y+(frame.h-h)/2,w,h,scale};
}
/** Nearby pins get separate 44px targets and a leader back to the exact point. */
export function atlasPins(points:{key:string;x:number;y:number}[],frame:AtlasRect){
  const captions=frame.h>=200,columns=Math.max(1,Math.floor((frame.w+8)/(captions?112:52))),rows=Math.max(1,Math.floor((frame.h-(captions?28:0)+8)/(captions?88:52)));
  const cells=Array.from({length:columns*rows},(_,i)=>({x:frame.x+22+(columns===1?0:(frame.w-44)*(i%columns)/(columns-1)),y:frame.y+22+(rows===1?0:(frame.h-44-(captions?28:0))*Math.floor(i/columns)/(rows-1))}));
  return points.slice(0,cells.length).map(p=>{cells.sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y));return {...p,target:cells.shift()!};});
}
