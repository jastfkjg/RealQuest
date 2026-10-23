import {Node,UITransform,Sprite,SpriteFrame,Graphics,Color} from 'cc';
import type {MapData,WorldObject} from './core/protocol';

/** South Gate Street uses the existing collision map and project-owned artwork.
 * All dimensions below are world units; unchanged PNGs retain two source pixels
 * per world unit. Signs are native labels rather than text baked into artwork.
 */
export class ArrivalScene {
 readonly signs:{id:string;text:string;x:number;y:number;width:number}[]=[];
 constructor(private parent:Node,private frames:Map<string,SpriteFrame>,private objects:Map<string,Node>,private depths:Map<Node,number>){}
 private node(id:string,x:number,y:number,w:number,h:number,depth:number){
  const n=new Node(id);n.layer=this.parent.layer;this.parent.addChild(n);n.setPosition(x,-y);n.addComponent(UITransform).setContentSize(w,h);this.depths.set(n,depth);return n;
 }
 private image(id:string,art:string,x:number,bottom:number,object?:string){
  const sf=this.frames.get(art);if(!sf)throw Error('Missing arrival artwork '+art);
  const n=this.node(id,x,bottom-sf.height/4,sf.width/2,sf.height/2,bottom);
  const sprite=n.addComponent(Sprite);sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.spriteFrame=sf;
  if(object)this.objects.set(object,n);return n;
 }
 private sign(id:string,text:string,x:number,y:number,width:number){
  const n=this.node(id,x,y,width,22,y+8),g=n.addComponent(Graphics);
  g.fillColor=new Color('#514a36');g.rect(-width/2-2,-12,width+4,24);g.fill();
  g.fillColor=new Color('#eee2bb');g.rect(-width/2,-10,width,20);g.fill();
  this.depths.set(n,9998);this.signs.push({id,text,x,y,width});
 }
 hit(map:MapData,obj:WorldObject,x:number,y:number){
  return map.id==='city'&&obj.id==='to_inn'&&x>=280&&x<=424&&y>=66&&y<=244;
 }
 build(map:MapData){
  this.signs.length=0;
  if(map.id!=='city')return false;
  const ground=this.node('SouthGateStreet',0,0,map.width,map.height,-1000),g=ground.addComponent(Graphics);
  const rect=(x:number,y:number,w:number,h:number,c:string)=>{g.fillColor=new Color(c);g.rect(x,-y-h,w,h);g.fill();};
  rect(0,0,800,600,'#829466');
  // Grass, gravel and paving vary deterministically, without changing walkability.
  for(let i=0;i<420;i++)rect(48+(i*173)%704,76+(i*127)%524,3+i%4,2,i%2?'#91a174':'#76885e');
  rect(104,436,512,52,'#c6b88b');rect(304,228,64,232,'#c6b88b');rect(336,316,296,48,'#c6b88b');
  for(let y=240;y<480;y+=16)for(let x=112;x<616;x+=24){
   if(y>=436||x>=304&&x<368||y>=316&&y<364&&x>=336)rect(x+(y%32?8:0),y,16,10,'#bdad80');
  }
  // Existing solid boundaries become masonry rather than anonymous rectangles.
  for(const [x,y,w,h] of map.obstacles.filter(([x,y,w,h])=>w>100||x===0||x===752)){
   if(x===256||x===544)continue;
   rect(x,y,w,h,'#596655');
   for(let yy=y;yy<y+h;yy+=16)for(let xx=x;xx<x+w;xx+=32)rect(xx+2,yy+2,Math.min(28,x+w-xx-2),12,(yy/16)%2?'#73816a':'#68765f');
  }
  // Door threshold and lamp stand on the authoritative to_inn interaction point.
  rect(328,232,48,12,'#9a9279');rect(332,232,40,4,'#d7c9a2');
  rect(96,470,64,22,'#c6b88b');
  this.image('InnFacade','village/home',352,240,'to_inn');
  this.image('SupplyHouse','village/shop',616,284);
  this.image('SupplyCounter','interiors/market-counter',608,348,'city_supplies');
  this.image('PrecisionAnvil','interiors/anvil',520,320,'city_armory');
  this.sign('PrecisionShopName','精密工坊',520,280,64);
  this.image('SouthGateNotice','village/board',480,440,'city_notice');
  for(const x of [312,392])this.image('InnLamp','village/lantern',x,244);
  for(const x of [272,432])this.image('InnGarden','interiors/planter',x,220);
  for(const x of [64,712])for(const y of [320,416])this.image('StreetFence','village/fence',x,y);
  // Gate piers frame the actual return point; the open centre stays traversable.
  const gate=this.node('SouthGate',128,480,96,68,480),gg=gate.addComponent(Graphics);
  for(const x of [-44,28]){
   gg.fillColor=new Color('#586452');gg.rect(x,0,16,60);gg.fill();
   gg.fillColor=new Color('#9a9d7b');for(let y=2;y<60;y+=12){gg.rect(x+2,y,12,9);gg.fill();}
   gg.fillColor=new Color('#c2b68b');gg.rect(x-3,56,22,6);gg.fill();
  }
  this.objects.set('to_mountain',gate);
  this.sign('InnName','灯穗旅店',352,181,64);
  this.sign('ArrivalWayfinding','↑ 灯穗旅店 · 交信与住宿',240,422,124);
  this.sign('StreetDirection','↑ 旅店    补给 →',352,362,96);
  this.sign('SupplyName','行旅补给',608,302,64);
  this.sign('NoticeName','南门告示',480,392,64);
  this.sign('GateName','南城门 · 返乡',128,503,80);
  return true;
 }
}
