import {
  Node,
  Graphics,
  Color,
  UITransform,
  Label,
  LabelOutline,
  UIOpacity,
} from "cc";
import type { GameState, CaveEnemy } from "./core/protocol";
import { monsterArt } from "./core/caveArt";
import { combatMarks, confirmedFeedback } from "./core/caveView";
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
  private poses = new Map<string, string>();
  private feedbackRoot: Node | null = null;
  private feedback = new Map<string, Node>();
  private extents = new Map<string, {x:number;y:number;w:number;h:number}>();
  constructor(
    private parent: Node,
    private depths: Map<Node, number>,
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
    this.enemies.clear();
    this.poses.clear();
    this.effects = null;
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
  ) {
    const c = s.combat;
    if (!c || !s.location.startsWith("cave_")) {
      this.hide();
      return;
    }
    if (!this.effects) {
      this.effects = this.node("CombatTelegraphs");
      this.depths.set(this.effects, -500);
    }
    const effects = this.effects.getComponent(Graphics)!;
    effects.clear();
    paintGraphics(effects, combatMarks(s, targetId, reduced));
    for (const e of c.enemies) {
      let n = this.enemies.get(e.id);
      if (!n) {
        n = this.node("Enemy-" + e.id);
        this.enemies.set(e.id, n);
      }
      n.active = e.hp > 0;
      if (!n.active) continue;
      n.setPosition(e.x, -e.y);
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
        paintGraphics(g, monsterArt(e, c.time, reduced));
        this.poses.set(e.id, pose);
      }
    }
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
