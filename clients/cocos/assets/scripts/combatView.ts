import {
  Node,
  Graphics,
  Color,
  UITransform,
  Label,
  LabelOutline,
  UIOpacity,
} from "cc";
import type { GameState } from "./core/protocol";
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
