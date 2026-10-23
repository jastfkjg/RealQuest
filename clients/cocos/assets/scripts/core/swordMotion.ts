import type { CombatAction, CaveEnemy } from './protocol';

export type CombatAim = { x:number; y:number; source:'pointer'|'facing'|'lock'; lockedTarget:string|null };
export type SwordPresentation = { active:boolean; direction:number; frame:number; phase:'ready'|'anticipation'|'start'|'active'|'follow'|'recover'|'walk'|'dodge'; sheet:'attack'|'motion'; moving:boolean };
export const swordArtPaths = ['combat/sword-actor-0','combat/sword-motion-0'];
export const facingAngles = [Math.PI/2,-Math.PI/2,Math.PI,0];
export function facingDirection(angle:number){
  return Math.abs(Math.cos(angle))>Math.abs(Math.sin(angle))?(Math.cos(angle)>0?3:2):(Math.sin(angle)<0?1:0);
}
/** A target is an explicit lock, never an implicit nearest-enemy aim. */
export function resolveCombatAim(p:{x:number;y:number},direction:number,pointer:{x:number;y:number}|null,locked:CaveEnemy|undefined):CombatAim{
  if(locked&&locked.hp>0)return {x:locked.x,y:locked.y,source:'lock',lockedTarget:locked.id};
  if(pointer&&Number.isFinite(pointer.x)&&Number.isFinite(pointer.y)&&Math.hypot(pointer.x-p.x,pointer.y-p.y)>2)return {...pointer,source:'pointer',lockedTarget:null};
  const a=facingAngles[direction]??0;
  return {x:p.x+Math.cos(a)*48,y:p.y+Math.sin(a)*48,source:'facing',lockedTarget:null};
}
/** Exactly the accepted stone-sword actor; other identities/gear keep their own art. */
export function hasSwordArt(appearance:number,weapon:string|null,owned:boolean){return appearance===0&&weapon==='stone_sword'&&owned;}
/** Contact is anchored to the authoritative hit_at, not an arbitrary frame timer. */
export function swordPresentation(options:{appearance:number;weapon:string|null;owned:boolean;direction:number;action:CombatAction|null;time:number;elapsed:number;moving:boolean;dodge:{started:number;until:number;dx:number;dy:number}|null;reduced?:boolean}):SwordPresentation{
  const o=options,base:SwordPresentation={active:hasSwordArt(o.appearance,o.weapon,o.owned),direction:o.direction,frame:0,phase:'ready',sheet:'attack',moving:o.moving};
  if(!base.active)return base;
  if(o.dodge&&o.time<o.dodge.until){
    const phase=(o.time-o.dodge.started)/Math.max(.001,o.dodge.until-o.dodge.started);
    return {...base,direction:facingDirection(Math.atan2(o.dodge.dy,o.dodge.dx)),sheet:'motion',frame:phase<.7?2:3,phase:'dodge'};
  }
  const a=o.action;
  if(a?.kind==='weapon'&&a.style==='sweep'&&o.time<a.until){
    const hit=a.hit_at??a.started+.11,windup=Math.max(.001,hit-a.started),recovery=Math.max(.001,a.until-hit);
    const frame=o.time<hit?(o.time<a.started+windup*.55?1:2):o.time<hit+Math.min(.065,recovery*.25)?3:o.time<hit+recovery*.72?4:5;
    return {...base,direction:facingDirection(a.angle??0),frame,phase:({1:'anticipation',2:'start',3:'active',4:'follow',5:'recover'} as const)[frame as 1|2|3|4|5]};
  }
  if(o.moving&&!o.reduced){const step=Math.floor(o.elapsed*8)%4;if(step%2)return {...base,sheet:'motion',frame:step===1?0:1,phase:'walk'};}
  return base;
}
