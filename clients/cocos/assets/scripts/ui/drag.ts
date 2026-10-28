import {Node,EventTouch} from 'cc';

export type DropArea={x:number;y:number;w:number;h:number;id:string};
export type DragSpec={item?:string;panel?:boolean;targets?:DropArea[];drop:(x:number,y:number,dx:number,dy:number)=>void};
/** One pointer owns a gesture until release, even outside its source control. */
export class InventoryDrag {
 private gesture:{pointer:number;x:number;y:number;spec:DragSpec;dragged:boolean}|null=null;
 private swallowed:number|null=null;
 constructor(private height:()=>number,private paint:(spec:DragSpec,x:number,y:number,dx:number,dy:number)=>void,private clear:()=>void){}
 get holding(){return !!this.gesture;}
 resetClick(){this.swallowed=null;}
 bind(node:Node,spec:DragSpec){node.on(Node.EventType.TOUCH_START,(e:EventTouch)=>{
  if(this.gesture)return;const p=e.getUILocation();this.swallowed=null;
  this.gesture={pointer:e.getID()??0,x:p.x,y:this.height()-p.y,spec,dragged:false};
 });
  node.on(Node.EventType.TOUCH_MOVE,(e:EventTouch)=>this.move(e));
  node.on(Node.EventType.TOUCH_END,(e:EventTouch)=>this.finish(e));
  // Creator3.8.8 reports release outside the source as a node CANCEL, while
  // getEventCode retains the original END. Real device/lifecycle cancels abort.
  node.on(Node.EventType.TOUCH_CANCEL,(e:EventTouch)=>{if(e.getEventCode()===Node.EventType.TOUCH_END)this.finish(e);else this.cancel();});
 }
 move(e:EventTouch){const g=this.gesture;if(!g||(e.getID()??0)!==g.pointer)return;
  const p=e.getUILocation(),y=this.height()-p.y,dx=p.x-g.x,dy=y-g.y;
  if(!g.dragged&&Math.hypot(dx,dy)<6)return;
  g.dragged=true;this.paint(g.spec,p.x,y,dx,dy);
 }
 finish(e:EventTouch){const g=this.gesture;if(!g||(e.getID()??0)!==g.pointer)return this.swallowed===(e.getID()??0);
  this.gesture=null;this.clear();if(!g.dragged)return false;
  this.swallowed=g.pointer;const p=e.getUILocation(),y=this.height()-p.y;g.spec.drop(p.x,y,p.x-g.x,y-g.y);return true;
 }
 cancel(){if(!this.gesture)return;this.swallowed=this.gesture.pointer;this.gesture=null;this.clear();}
}
