import {Node,Sprite,SpriteFrame,UITransform,Graphics,Color,UIOpacity} from 'cc';
import type {GameState,MapData,WorldObject} from './core/protocol';
import {isTool,toolLevel,type ToolId} from './core/tools';

export type WorkMotion={kind:ToolId;target:WorldObject;started:number;direction:number};
/** Project-owned articulated tool animation, independent of the world camera.
 * Four directions share raised grip, contact and recovery joints; sprites keep
 * their real source proportions. Resource pictures represent saved work. */
export class ToolRenderer {
 private resources=new Map<string,{node:Node;picture:Node;marks:Graphics;signature:string;stage:string;version:number;hit:number}>();
 private falling:{node:Node;started:number;sign:number}[]=[];
 private held:Node|null=null;private grip:Node|null=null;private arms:Graphics|null=null;private effects:Graphics|null=null;
 presentation:{held:string|null;phase:string;direction:number;progress:number}={held:null,phase:'ready',direction:0,progress:0};
 constructor(private parent:Node,private frames:Map<string,SpriteFrame>,private objects:Map<string,Node>,private depths:Map<Node,number>){}
 reset(){this.resources.clear();this.falling=[];this.held=this.grip=null;this.arms=this.effects=null;}
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
 updateHeld(s:GameState,p:{x:number;y:number},direction:number,time:number,reduced:boolean,motion:WorkMotion|null){
  const id=s.tools?.held||null,tool=isTool(id)?id:null,active=motion&&tool===motion.kind&&time-motion.started<.48?motion:null;
  if(!this.held){this.held=this.node(this.parent,'CurrentHandArt');this.arms=this.node(this.held,'WorkingArms').addComponent(Graphics);this.grip=this.picture(this.held,'HandTool');this.effects=this.node(this.parent,'ToolContactEffects').addComponent(Graphics);this.depths.set(this.effects.node,9997);}
  const show=!!id&&(!!tool||id==='tree_seed'||id.endsWith('_seed')||id==='seed');this.held.active=show&&!s.location.startsWith('cave_')&&!s.ranch?.mounted;
  this.effects!.clear();this.arms!.clear();
  const t=active?Math.min(1,Math.max(0,(time-active.started)/.48)):0;
  const phase=active?t<.32?'raise':t<.58?'contact':'recover':'ready';
  this.presentation={held:id,phase,direction:active?.direction??direction,progress:t};
  if(!this.held.active)return;
  const dir=active?.direction??direction,side=dir===2?-1:1;
  const lift=active&&!reduced?(t<.32?t/.32:t<.58?1-(t-.32)/.26:0):0;
  const gx=side*(active?8+Math.sin(t*Math.PI)*3:9),gy=active?17+lift*15:17;
  this.held.setPosition(p.x,-p.y);this.depths.set(this.held,p.y+(dir===1?-1:1));
  const frame=tool?'tools/'+tool+'-'+toolLevel(s,tool):'items/'+id;
  this.frame(this.grip!,frame,tool==='watering_can'?28:tool?34:16,tool==='watering_can'?28:tool?34:16);
  this.grip!.getComponent(UITransform)!.setAnchorPoint(tool&&tool!=='watering_can'?.2:.5,tool&&tool!=='watering_can'?.2:.5);
  this.grip!.setPosition(gx,gy);this.grip!.setScale(tool==='watering_can'&&dir===2?-1:1,1,1);
  const impact=[-125,42,135,-35][dir],rest=[-25,35,125,-25][dir];
  this.grip!.angle=tool==='watering_can'?(active?(dir===2?24:-24):0):active&&!reduced?(t<.32?rest+(impact+110-rest)*(t/.32):t<.58?impact+110-125*((t-.32)/.26):impact-15+(rest-impact+15)*((t-.58)/.42)):rest;
  if(active){
   const a=this.arms!;a.strokeColor=new Color('#344d37');a.lineWidth=4;a.moveTo(side*5,25);a.lineTo(side*8,22+lift*8);a.stroke();a.strokeColor=new Color('#d3ac7b');a.lineWidth=3;a.moveTo(side*8,22+lift*8);a.lineTo(gx,gy);a.stroke();a.fillColor=new Color('#e3be8e');a.rect(gx-2,gy-2,4,4);a.fill();
   if(t>=.32&&t<.88){const e=this.effects!,o=active.target,k=tool==='watering_can';e.fillColor=new Color(k?'#83bdcd':tool==='axe'?'#c5a164':'#c9c5a8');
    for(let i=0;i<5;i++){const x=o.x-9+i*4,y=-o.y+(reduced?5:5+Math.sin((t-.32)/.56*Math.PI)*(8+i%3*3));e.rect(x,y,k?2:3,k?4:2);e.fill();}
   }
  }
 }
}
