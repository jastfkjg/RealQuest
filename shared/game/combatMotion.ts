import type { MapData } from './protocol';
import { walkable } from './navigation';
type Point={x:number;y:number};
/** A short press waits for transport; its gameplay buffer starts on first send. */
export class CombatInputBuffer {
  private serial=0;
  private entries=new Map<string,{token:number;sentAt?:number}>();
  queue(id:string){this.entries.set(id,{token:++this.serial});}
  snapshot(){const result:Record<string,number>={};for(const [id,e] of this.entries)result[id]=e.token;return result;}
  markSent(tokens:Record<string,number>,now:number){
    for(const [id,token] of Object.entries(tokens)){const e=this.entries.get(id);if(e?.token===token&&e.sentAt===undefined)e.sentAt=now;}
  }
  expired(now:number){return Array.from(this.entries).filter(([,e])=>e.sentAt!==undefined&&now-e.sentAt>.22).map(([id])=>id);}
  consume(id:string,token:number){if(this.entries.get(id)?.token!==token)return false;this.entries.delete(id);return true;}
  clear(){this.entries.clear();}
}
/** Visual-only prediction. Never writes saved position, damage or invulnerability. */
export class CombatMotion {
  position:Point={x:0,y:0};
  private anchor:Point={x:0,y:0};
  private correction:Point={x:0,y:0};
  private sent=new Map<number,Point>();
  private received=0;
  private initialized=false;
  reset(position:Point,now:number){
    this.position={...position};this.anchor={...position};this.correction={x:0,y:0};
    this.sent.clear();this.received=now;this.initialized=true;
  }
  checkpoint(seq:number){this.sent.set(seq,{...this.position});}
  acknowledge(seq:number,position:Point,now:number){
    const predicted=this.sent.get(seq);
    this.anchor={...position};this.received=now;
    if(predicted)this.correction={x:position.x-predicted.x,y:position.y-predicted.y};
    else this.reset(position,now);
    for(const key of Array.from(this.sent.keys()))if(key<=seq)this.sent.delete(key);
    if(Math.hypot(this.correction.x,this.correction.y)>48)this.reset(position,now);
  }
  step(map:MapData,authority:Point,dx:number,dy:number,dt:number,now:number,speed=160){
    if(!this.initialized)this.reset(authority,now);
    const stale=now-this.received>.35;
    const length=Math.max(1,Math.hypot(dx,dy));
    const blend=Math.min(1,dt*18);
    const cx=this.correction.x*blend,cy=this.correction.y*blend;
    this.correction.x-=cx;this.correction.y-=cy;
    const move=(x:number,y:number)=>{
      if(walkable(map,x,this.position.y))this.position.x=x;
      if(walkable(map,this.position.x,y))this.position.y=y;
    };
    move(this.position.x+cx,this.position.y+cy);
    if(!stale){
      // Small substeps prevent both regular movement and dash crossing walls.
      const ticks=Math.max(1,Math.ceil(dt/.0125)),step=Math.min(dt,.05)/ticks;
      for(let i=0;i<ticks;i++){
        const x=this.position.x+dx/length*speed*step,y=this.position.y+dy/length*speed*step;
        if(Math.hypot(x-this.anchor.x,y-this.anchor.y)<=64)move(x,y);
      }
    }
    return {...this.position};
  }
}
