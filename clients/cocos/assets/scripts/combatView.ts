import {
  Node,
  Graphics,
  Color,
  UITransform,
  Label,
  LabelOutline,
  UIOpacity,
  Sprite,
  SpriteFrame,
} from "cc";
import type { GameState, CaveEnemy, CombatAction } from "./core/protocol";
import { monsterArt } from "./core/caveArt";
import { combatMarks, confirmedFeedback, weaponMarks, weaponPose } from "./core/caveView";
import { paintGraphics } from "./cavePaint";
type Screen = {
  x: number;
  y: number;
  zoom: number;
  width: number;
  height: number;
};
export class CombatRenderer {
  private enemies = new Map<string, Node>();
  private effects: Node | null = null;
  private weapon: Node | null = null;
  private heldArt:Node|null=null;
  private armor:Node|null=null;
  private poses = new Map<string, string>();
  private feedbackRoot: Node | null = null;
  private feedback = new Map<string, Node>();
  private extents = new Map<string, {x:number;y:number;w:number;h:number}>();
  private actorDepth=0;
  get playerDepth(){return this.actorDepth;}
  constructor(
    private parent: Node,
    private depths: Map<Node, number>,
    private frames:Map<string,SpriteFrame>,
  ) {}
  attachFeedback(parent: Node) {
    this.feedbackRoot = new Node("ConfirmedCombatFeedback");
    this.feedbackRoot.layer = parent.layer;
    parent.addChild(this.feedbackRoot);
    this.feedbackRoot.setSiblingIndex(this.parent.getSiblingIndex() + 1);
  }
  hide() {
    if (this.feedbackRoot) this.feedbackRoot.active = false;
  }
  get visibleFeedbackCount() {
    return this.feedbackRoot?.active ? this.feedback.size : 0;
  }
  bounds(enemy: CaveEnemy) {
    const key=enemy.kind+':'+(enemy.phase==='windup');let box=this.extents.get(key);
    if(!box){
      const points=Array.from({length:4},(_,pose)=>monsterArt(enemy,pose/6)).flat().flatMap(m=>{
        const pad=(m.line||0)/2;
        if('points' in m)return m.points.flatMap(p=>[{x:p.x-pad,y:p.y-pad},{x:p.x+pad,y:p.y+pad}]);
        const x=m.kind==='ellipse'?m.x-m.w/2:m.x,y=m.kind==='ellipse'?m.y-m.h/2:m.y;
        return [{x:x-pad,y:y-pad},{x:x+m.w+pad,y:y+m.h+pad}];
      });
      const x=Math.min(...points.map(p=>p.x)),y=Math.min(...points.map(p=>p.y));
      box={x,y,w:Math.max(...points.map(p=>p.x))-x,h:Math.max(...points.map(p=>p.y))-y};this.extents.set(key,box);
    }
    return {x:enemy.x+box.x,y:enemy.y+box.y,w:box.w,h:box.h};
  }
  reset() {
    this.actorDepth=0;
    this.enemies.clear();
    this.poses.clear();
    this.effects = null;
    this.weapon = null;this.heldArt=null;this.armor=null;
    for (const n of this.feedback.values()) n.destroy();
    this.feedback.clear();
    this.hide();
  }
  private node(name: string) {
    const n = new Node(name);
    n.layer = this.parent.layer;
    this.parent.addChild(n);
    n.addComponent(UITransform).setContentSize(96, 96);
    n.addComponent(Graphics);
    return n;
  }
  draw(
    s: GameState,
    targetId: string | null,
    reduced: boolean,
    screen: Screen,
    presentation?: {position:{x:number;y:number};action:CombatAction|null;time:number;facing?:number;integratedSword?:boolean;aim?:{x:number;y:number;source:string}},
  ) {
    const c = s.combat;
    if (!c) {
      this.hide();
      return;
    }
    if (!this.effects) {
      this.effects = this.node("CombatTelegraphs");
      this.depths.set(this.effects, -500);
    }
    const cave=s.location.startsWith("cave_");this.effects.active=cave;
    const effects = this.effects.getComponent(Graphics)!;
    effects.clear();
    const time=presentation?.time??c.time;
    if(cave){
      const p=presentation?.position||s.position;
      paintGraphics(effects, combatMarks({...s,position:p,combat:{...c,time}}, targetId, reduced));
      // A small ground bearing communicates free aim without claiming a hit.
      if(presentation?.aim&&p.x>=166){
        const a=presentation.action?.angle??Math.atan2(presentation.aim.y-p.y,presentation.aim.x-p.x);
        const tip={x:p.x+Math.cos(a)*23,y:p.y+Math.sin(a)*23};
        effects.strokeColor=new Color(presentation.aim.source==='lock'?'#e6bd7f':'#e5e7bf');effects.lineWidth=1.3;
        for(const side of [-1,1]){effects.moveTo(tip.x-Math.cos(a)*5+Math.sin(a)*side*4,-tip.y+Math.sin(a)*5+Math.cos(a)*side*4);effects.lineTo(tip.x,-tip.y);}effects.stroke();
      }
    }
    if(!this.weapon){this.weapon=this.node('EquippedWeapon');}
    this.weapon.active=!presentation?.integratedSword||presentation.action?.kind==='spark';
    const p=presentation?.position||s.position,g=this.weapon.getComponent(Graphics)!;
    this.actorDepth=p.y;
    this.depths.set(this.weapon,p.y+2);g.clear();
    const owned=!!c.equipped&&!!s.inventory[c.equipped],frame=owned?this.frames.get('items/'+c.equipped):null;
    if(!presentation?.integratedSword||presentation.action?.kind==='spark')paintGraphics(g,weaponMarks(c.equipped,owned,p,presentation?.action||null,time,reduced,!frame&&!presentation?.integratedSword));
    if(!this.heldArt){this.heldArt=new Node('HeldWeaponArt');this.heldArt.layer=this.parent.layer;this.weapon.addChild(this.heldArt);this.heldArt.addComponent(UITransform).setAnchorPoint(.22,.22);this.heldArt.addComponent(Sprite).sizeMode=Sprite.SizeMode.CUSTOM;}
    this.heldArt.active=!!frame&&!presentation?.integratedSword;
    if(this.heldArt.active&&frame&&c.equipped){const pose=weaponPose(c.equipped,p,presentation?.action||null,time,reduced,presentation?.facing||0);this.heldArt.getComponent(Sprite)!.spriteFrame=frame;this.heldArt.getComponent(UITransform)!.setContentSize(pose.size,pose.size);this.heldArt.setPosition(pose.x,-pose.y);this.heldArt.angle=pose.angle;}
    if(!this.armor)this.armor=this.node('EquippedGearDetails');
    const ag=this.armor.getComponent(Graphics)!;ag.clear();this.armor.setPosition(p.x,-p.y);this.depths.set(this.armor,p.y+1);
    // Small, directional equipment accents keep the actor's identity and scale intact.
    if(c.equipment?.body&&s.inventory[c.equipment.body]){
      ag.fillColor=new Color(c.equipment.body==='exo_armor'?'#70826a':c.equipment.body==='shell_armor'?'#a5b09b':'#677951');
      ag.rect(-8,16,5,7);ag.rect(4,16,5,7);ag.fill();
      if(c.equipment.body==='exo_armor'){ag.fillColor=new Color('#d6b26e');ag.rect(-9,18,3,4);ag.rect(7,18,3,4);ag.fill();ag.fillColor=new Color('#a7ecc9');ag.circle(0,20,2);ag.fill();}
    }
    if(c.gear_stats?.light){ag.strokeColor=new Color('#d2dba578');ag.lineWidth=1;ag.ellipse(0,1,20,7);ag.stroke();}
    if(!cave){this.hide();return;}

    for (const e of c.enemies) {
      let n = this.enemies.get(e.id);
      if (!n) {
        n = this.node("Enemy-" + e.id);
        this.enemies.set(e.id, n);
      }
      const dying=e.hp<=0&&e.dead_at!==undefined&&time-e.dead_at<.3;
      n.active = e.hp > 0 || dying;
      if (!n.active) continue;
      if(!n.getComponent(UIOpacity)){n.addComponent(UIOpacity);n.setPosition(e.x,-e.y);}
      n.setPosition(reduced?e.x:n.position.x+(e.x-n.position.x)*.5,reduced?-e.y:n.position.y+(-e.y-n.position.y)*.5);
      const preparing=e.phase==='windup',hit=(e.hit_until||0)>time;
      const charge=preparing?Math.max(0,Math.min(1,1-(e.until-time)/1.1)):0;
      const death=dying?Math.min(1,(time-e.dead_at!)/.3):0;
      const squash=!reduced&&preparing?(e.kind==='slime'?.27:e.kind==='bat'?.13:.06)*charge:0;
      n.setScale((1+squash)*(1-death*.35),(1-squash)*(1-death*.35));
      n.angle=!reduced&&hit?(e.kind==='boss'?1.5:5):0;
      const body=this.bounds(e),occluding=p.y<=e.y+2&&p.x+14>body.x&&p.x-14<body.x+body.w&&p.y>body.y&&p.y-42<body.y+body.h;
      // Multi-layer Graphics can remain opaque when faded; protect the actual
      // player/weapon draw order rather than relying on alpha alone.
      if(occluding)this.actorDepth=Math.max(this.actorDepth,e.y+1);
      n.getComponent(UIOpacity)!.opacity=Math.min(occluding?140:255,dying?Math.round(255*(1-death)):hit?210:255);
      this.depths.set(n, e.y);
      const pose = [
        e.kind,
        e.hp,
        e.phase,
        reduced ? 0 : Math.floor(c.time * 6) % 4,
      ].join(":");
      if (this.poses.get(e.id) !== pose) {
        const g = n.getComponent(Graphics)!;
        g.clear();
        paintGraphics(g, monsterArt(dying?{...e,hp:1}:e, c.time, reduced));
        this.poses.set(e.id, pose);
      }
    }
    this.depths.set(this.weapon,this.actorDepth+1);
    const root = this.feedbackRoot;
    if (!root) return;
    root.active = true;
    root.setPosition(-screen.width / 2, screen.height / 2);
    const visible = confirmedFeedback(s, reduced),
      keys = new Set(visible.map((e) => e.key));
    for (const [key, n] of this.feedback)
      if (!keys.has(key)) {
        n.destroy();
        this.feedback.delete(key);
      }
    for (const e of visible) {
      let n = this.feedback.get(e.key);
      if (!n) {
        n = new Node("ConfirmedHit");
        n.layer = root.layer;
        root.addChild(n);
        n.addComponent(UITransform).setContentSize(120, 32);
        const label = n.addComponent(Label);
        label.string = e.text;
        label.fontSize = 16;
        label.lineHeight = 24;
        label.color = new Color(e.kind === "hurt" ? "#ffe2c5" : "#fff2c6");
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        const outline = n.addComponent(LabelOutline);
        outline.color = new Color("#293e32");
        outline.width = 2;
        n.addComponent(UIOpacity);
        this.feedback.set(e.key, n);
      }
      const x = screen.width / 2 + screen.x + e.x * screen.zoom,
        y =
          screen.height / 2 - screen.y + e.anchorY * screen.zoom - 12 - e.lift;
      n.setPosition(x, -y);
      n.getComponent(UIOpacity)!.opacity = Math.round(e.alpha * 255);
    }
  }
}
