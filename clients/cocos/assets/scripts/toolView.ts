import {Node,Sprite,SpriteFrame,UITransform,Graphics,Color,UIOpacity} from 'cc';
import type {GameState,MapData,WorldObject} from './core/protocol';
import {isTool,type ToolId} from './core/tools';
import type {ToolActorPresentation} from './toolActor';

export type WorkMotion={kind:ToolId;target:WorldObject;started:number;direction:number};
/** Saved resource stages, contact particles and carried seeds. Tool users are
 * painted whole-body actors, supplied by toolActor.ts, with no prop overlay. */
export class ToolRenderer {
 private resources=new Map<string,{node:Node;picture:Node;marks:Graphics;signature:string;stage:string;version:number;hit:number}>();
 private falling:{node:Node;started:number;sign:number}[]=[];
 private held:Node|null=null;private grip:Node|null=null;private effects:Graphics|null=null;
 presentation={held:null as string|null,phase:'ready',direction:0,progress:0,lean:0,moving:false,integrated:false,frame:0,sheet:''};
 constructor(private parent:Node,private frames:Map<string,SpriteFrame>,private objects:Map<string,Node>,private depths:Map<Node,number>){}
 reset(){this.resources.clear();this.falling=[];this.held=this.grip=null;this.effects=null;}
 private node(parent:Node,id:string){const n=new Node(id);n.layer=parent.layer;parent.addChild(n);n.addComponent(UITransform);return n;}
 private picture(parent:Node,id:string){const n=this.node(parent,id);n.addComponent(Sprite).sizeMode=Sprite.SizeMode.CUSTOM;return n;}
 private frame(n:Node,path:string,w?:number,h?:number){const sf=this.frames.get(path);if(!sf)return;n.getComponent(Sprite)!.spriteFrame=sf;n.getComponent(UITransform)!.setContentSize(w??sf.width/2,h??sf.height/2);}
 updateResources(map:MapData,p:{x:number;y:number},time:number,reduced:boolean){
  const nodes=map.objects.filter(o=>o.kind==='resource');
  for(const o of nodes){
   const v=o.resource_state!;let r=this.resources.get(o.id);
   if(!r){const node=this.node(this.parent,o.id),picture=this.picture(node,'ResourcePicture'),marks=this.node(node,'ResourceMarks').addComponent(Graphics);r={node,picture,marks,signature:'',stage:v.stage,version:v.version,hit:0};this.resources.set(o.id,r);this.objects.set(o.id,node);}
   const changed=r.version!==v.version;if(changed)r.hit=time+.18;
   if(r.stage==='tree'&&v.stage==='stump'&&!reduced){
    const fall=this.picture(this.parent,'FallingTree-'+o.id);this.frame(fall,'village/'+(o.art||'oak'));fall.getComponent(UITransform)!.setAnchorPoint(.5,0);fall.setPosition(o.x,-o.y-12);fall.addComponent(UIOpacity);this.depths.set(fall,o.y+10);this.falling.push({node:fall,started:time,sign:p.x<o.x?-1:1});
   }
   r.stage=v.stage;r.version=v.version;
   const tree=o.resource==='tree',art=tree?v.stage==='tree'?'village/'+(o.art||'oak'):v.stage==='sapling'?'gathering/sapling':v.stage==='stump'?'gathering/'+(v.work?'stump-cracked':'stump'):'':
      'gathering/'+o.resource+'-'+(v.stage==='depleted'?'depleted':v.work>=v.total*.3?'cracked':'whole');
   if(r.signature!==art){r.signature=art;r.picture.active=!!art;if(art){this.frame(r.picture,art);r.picture.getComponent(UITransform)!.setAnchorPoint(.5,0);r.picture.setPosition(0,tree&&v.stage==='tree'?-12:-20);}}
   r.node.active=!!art;r.node.setPosition(o.x+(!reduced&&r.hit>time?Math.sin((r.hit-time)*70)*1.5:0),-o.y);this.depths.set(r.node,o.y+10);
   const behind=tree&&v.stage==='tree'&&p.y<o.y&&p.y>o.y-75&&Math.abs(p.x-o.x)<30;
   (r.picture.getComponent(UIOpacity)||r.picture.addComponent(UIOpacity)).opacity=behind?115:255;
   r.marks.clear();
   if(tree&&v.stage==='tree'&&v.work){r.marks.fillColor=new Color('#d4ac70');r.marks.rect(-5,2,10,2+Math.floor(v.work/v.total*5));r.marks.fill();r.marks.fillColor=new Color('#6e4a32');r.marks.rect(-3,3,7,2);r.marks.fill();}
  }
  for(const f of [...this.falling]){const t=Math.min(1,(time-f.started)/.6);f.node.angle=f.sign*t*t*78;f.node.getComponent(UIOpacity)!.opacity=Math.round(255*(1-Math.max(0,(t-.65)/.35)));if(t>=1){this.depths.delete(f.node);f.node.destroy();this.falling=this.falling.filter(x=>x!==f);}}
 }
 updateHeld(s:GameState,p:{x:number;y:number},time:number,reduced:boolean,motion:WorkMotion|null,pose:ToolActorPresentation){
  const id=s.tools?.held||null,tool=isTool(id)?id:null;
  if(!this.held){
   this.held=this.node(this.parent,'CarriedSeedArt');this.grip=this.picture(this.held,'SeedPacket');
   this.effects=this.node(this.parent,'ToolContactEffects').addComponent(Graphics);this.depths.set(this.effects.node,9997);
  }
  this.presentation={held:id,phase:pose.phase,direction:pose.direction,progress:pose.progress,lean:0,moving:pose.moving,integrated:pose.active,frame:pose.frame,sheet:pose.sheet};
  const seed=!!id&&!tool&&(id==='tree_seed'||id.endsWith('_seed')||id==='seed');
  this.held.active=seed&&!s.location.startsWith('cave_')&&!s.ranch?.mounted;
  if(this.held.active){
   this.held.setPosition(p.x,-p.y);this.depths.set(this.held,p.y+1);
   this.frame(this.grip!,'items/'+id,14,14);this.grip!.setPosition(pose.direction===2?-6:6,16);
  }
  this.effects!.clear();
  if(pose.active&&motion&&pose.progress>=.32&&pose.progress<.88){
   const e=this.effects!,o=motion.target,t=pose.progress,water=tool==='watering_can';e.fillColor=new Color(water?'#83bdcd':tool==='axe'?'#c5a164':'#c9c5a8');
   for(let i=0;i<5;i++){const x=o.x-9+i*4,y=-o.y+(reduced?5:5+Math.sin((t-.32)/.56*Math.PI)*(8+i%3*3));e.rect(x,y,water?2:3,water?4:2);e.fill();}
  }
 }
}
