import type {GameState} from './core/protocol';
import {isTool,toolIds,toolLevel,type ToolId} from './core/tools';

export type ToolActorPresentation={active:boolean;held:string|null;tool:ToolId|null;appearance:number;tier:number;direction:number;sourceDirection:number;flipX:boolean;frame:number;phase:'ready'|'walk'|'raise'|'contact'|'follow'|'recover';progress:number;moving:boolean;sheet:string;lean:number};
export const toolActorArtPaths=Array.from({length:6},(_,a)=>toolIds.map(k=>`tool-actors/${k}-${a}`)).flat();
/** Six painted whole-body keys per direction. The tool and both gripping hands
 * belong to the same source pose; no empty-handed arms or rotating prop layer. */
export function toolActorPresentation(s:GameState,direction:number,time:number,moving:boolean,reduced:boolean,motion:{kind:ToolId;started:number;direction:number}|null):ToolActorPresentation{
 const held=s.tools?.held||null,tool=isTool(held)?held:null,appearance=s.character?.appearance||0;
 const active=!!tool&&!!s.inventory[tool]&&!s.location.startsWith('cave_')&&!s.ranch?.mounted;
 const work=active&&motion?.kind===tool&&time>=motion.started&&time-motion.started<.48?motion:null;
 const progress=work?Math.min(1,(time-work.started)/.48):0;
 const facing=work?.direction??direction,sourceDirection=tool==='axe'&&appearance===4&&facing===2?3:facing;
 const base:ToolActorPresentation={active,held,tool,appearance,tier:tool?toolLevel(s,tool):0,direction:facing,sourceDirection,flipX:sourceDirection!==facing,frame:0,phase:'ready',progress,moving:moving&&!work,sheet:tool?`tool-actors/${tool}-${appearance}`:'',lean:0};
 if(!active)return base;
 if(work){
  if(reduced)return {...base,frame:2,phase:'contact'};
  // Shared work contact at32% of the existing480ms labor action. The recovery
  // returns to the actual ready key, never tilts a standing body as a substitute.
  return progress<.32?{...base,frame:1,phase:'raise'}:progress<.58?{...base,frame:2,phase:'contact'}:progress<.84?{...base,frame:3,phase:'follow'}:{...base,frame:0,phase:'recover'};
 }
 if(moving&&!reduced){const step=Math.floor(time*7)%4;return {...base,frame:[4,0,5,0][step],phase:'walk'};}
 return base;
}
