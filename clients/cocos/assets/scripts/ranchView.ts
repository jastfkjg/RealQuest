import {Node,UITransform,Sprite,SpriteFrame,Graphics,Color} from 'cc';
import type {GameState,MapData,WorldObject} from './core/protocol';
import {ranchShelters,ranchFacilities,animalArt} from './core/ranching';
/** Presentation only. Server-owned anchors and ranch clocks govern interaction. */
export class RanchRenderer {
 private visual=new Map<string,{node:Node;key:string}>();private mount:Node|null=null;
 constructor(private parent:Node,private frames:Map<string,SpriteFrame>,private depths:Map<Node,number>){}
 reset(){this.visual.clear();this.mount=null;}
 hit(object:WorldObject,x:number,y:number){
  const id=object.kind==='shelter'?'RanchBuilding-'+object.id.slice(8):object.id;
  const n=this.visual.get(id)?.node,t=n?.getComponent(UITransform);
  if(!n||!t)return false;
  return Math.abs(x-n.position.x)<=Math.max(24,t.width/2)&&y>=-n.position.y-t.height&&y<=-n.position.y+12;
 }
 private sprite(id:string,art:string,x:number,y:number,w:number,h:number){
  const n=new Node(id);n.layer=this.parent.layer;this.parent.addChild(n);n.setPosition(x,-y);const t=n.addComponent(UITransform);t.setContentSize(w,h);t.setAnchorPoint(.5,0);const s=n.addComponent(Sprite);s.sizeMode=Sprite.SizeMode.CUSTOM;s.spriteFrame=this.frames.get(art)||null;this.depths.set(n,y);return n;
 }
 build(map:MapData){
  if(map.id!=='pasture')return false;
  const n=new Node('PastureGround');n.layer=this.parent.layer;this.parent.addChild(n);this.depths.set(n,-2000);const g=n.addComponent(Graphics);
  const rect=(x:number,y:number,w:number,h:number,c:string)=>{g.fillColor=new Color(c);g.rect(x,-y-h,w,h);g.fill();};
  rect(0,0,896,544,'#8ca777');
  for(let i=0;i<1300;i++){const x=(i*167)%896,y=(i*97)%544;rect(x,y,2+i%3,2,i%2?'#9eb784':'#7d9c68');}
  rect(72,238,752,30,'#c5b38a');rect(430,244,36,290,'#c5b38a');
  for(const s of Object.values(ranchShelters))rect(s.x-18,218,36,60,'#c5b38a');
  // Mark the reserved construction footprints before a shelter exists.
  for(const s of Object.values(ranchShelters)){
   rect(s.x-s.width/2,s.y-s.height,s.width,s.height-24,'#a39878');
   for(let xx=s.x-s.width/2;xx<s.x+s.width/2;xx+=16){rect(xx,s.y-s.height,12,4,'#d6cab0');rect(xx,s.y-28,12,4,'#d6cab0');}
  }
  // Short corner rails leave the whole approach lawn open to walking.
  for(const [a,b] of [[72,280],[330,564],[620,800]])for(const yy of [278,414]){
   for(const xx of [a,b-20]){rect(xx,yy,20,3,'#8c704b');rect(xx,yy+9,20,3,'#ac8c5f');rect(xx,yy-5,4,22,'#755b3c');}
  }
  for(const x of [80,816])for(let y=76;y<510;y+=74)this.sprite('PastureShrub','village/shrub',x,y,40,32);
  this.sprite('RanchLedger','ranching/ledger',448,446,42,48);
  this.sprite('PastureExit','ranching/ledger',480,500,24,28);
  for(const [key,s] of Object.entries(ranchShelters))this.sprite('Trough-'+key,'ranching/trough',s.x+70,256,38,26);
  return true;
 }
 update(state:GameState,p:{x:number;y:number},time:number,reduced:boolean){
  const r=state.ranching,save=state.ranch;if(!r||!save)return;
  if(state.location==='pasture'){
   const wanted=new Set<string>();
   const bind=(id:string,key:string,x:number,y:number,w:number,h:number)=>{wanted.add(id);let v=this.visual.get(id);if(!v||v.key!==key){if(v){this.depths.delete(v.node);v.node.destroy();}const n=this.sprite(id,key,x,y,w,h);v={node:n,key};this.visual.set(id,v);}return v.node;};
   for(const [id,s] of Object.entries(ranchShelters)){
    const level=save.buildings[id],art=level?'ranching/'+id+'-'+level:'ranching/ledger';bind('RanchBuilding-'+id,art,s.x,s.y-18,level?s.width:32,level?s.width*3/4:38);
   }
   for(const [i,id] of Object.keys(ranchFacilities).entries())if(save.facilities[id]&&['water','rooting'].includes(id)){
    const x=id==='water'?270:id==='rooting'?574:168+(i-2)*92,y=id==='water'||id==='rooting'?360:474;
    bind('RanchFacility-'+id,'ranching/'+id,x,y,id==='water'||id==='rooting'?64:42,id==='water'||id==='rooting'?48:42);
   }
   for(const [id,m] of Object.entries(state.construction?.machines||{})){const n=bind(id,'ranching/'+m.facility,m.x,m.y,44,44);n.setPosition(m.x,-m.y);this.depths.set(n,m.y);if(r.jobs[id]?.ready)bind('MachineReady-'+id,'items/'+r.jobs[id].output,m.x+14,m.y-40,18,18);}
   for(const [id,a] of Object.entries(r.animals)){
    if(id===save.mounted)continue;
    const n=bind(id,animalArt(a.species,a.stage),a.x,a.y,['chicken','duck'].includes(a.species)?42:62,['chicken','duck'].includes(a.species)?42:62);
    const t=reduced?0:Math.sin(time*.7+Number(id.slice(7))*1.7),walking=!reduced&&a.feed_days>0;
    n.setPosition(a.x+(walking?t*5:0),-a.y+(walking?Math.abs(Math.sin(time*2))*1.3:0));
    if(a.ready){const spec=r.catalog.animals.find(s=>s.id===a.species)!;bind('Product-'+id,'items/'+spec.product,a.x+14,a.y-30,16,16);}
   }
   for(const [id,v] of this.visual)if(!wanted.has(id)){this.depths.delete(v.node);v.node.destroy();this.visual.delete(id);}
  }
  if(save.mounted){if(!this.mount)this.mount=this.sprite('MountedHorse',animalArt('horse',3),p.x,p.y,64,64);this.mount.setPosition(p.x,-p.y);this.depths.set(this.mount,p.y-.5);}
  else if(this.mount){this.depths.delete(this.mount);this.mount.destroy();this.mount=null;}
 }
}
