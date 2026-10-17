import {
  Node,
  UITransform,
  Graphics,
  Label,
  Color,
  EventTouch,
  UIOpacity,
} from "cc";
import type { GameState } from "../core/protocol";
import { C } from "./theme";
type Control = {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  disabled: boolean;
};
type Button = {
  node: Node;
  label: Label;
  caption: Label;
  control: Control;
  disabled: boolean;
  color: string;
};
/** Persistent press targets: receipt-driven HUD updates never replace held fingers. */
export class CombatDock {
  private root: Node;
  private buttons = new Map<string, Button>();
  private size = "";
  private heldPointers = new Set<number>();
  constructor(
    parent: Node,
    private run: (id: string) => void,
  ) {
    this.root = new Node("CombatDock");
    this.root.layer = parent.layer;
    parent.addChild(this.root);
    this.root.active = false;
  }
  get held() {
    return this.heldPointers.size > 0;
  }
  release() {
    this.heldPointers.clear();
  }
  hide() {
    this.release();
    this.root.active = false;
  }
  private shape(b: Button, color: string) {
    if (b.color === color) return;
    b.color = color;
    const g = b.node.getComponent(Graphics)!;
    g.clear();
    const { w, h } = b.control;
    g.fillColor = new Color(color);
    g.roundRect(-w / 2, -h / 2, w, h, 8);
    g.fill();
    g.strokeColor = new Color("#9ba687");
    g.lineWidth = 1;
    g.roundRect(-w / 2, -h / 2, w, h, 8);
    g.stroke();
  }
  private create(id: string, x: number, y: number, w: number, h: number) {
    const n = new Node(id);
    n.layer = this.root.layer;
    this.root.addChild(n);
    n.setPosition(x + w / 2, -y - h / 2);
    n.addComponent(UITransform).setContentSize(w, h);
    n.addComponent(Graphics);
    n.addComponent(UIOpacity);
    const labelNode = new Node("Action");
    labelNode.layer = n.layer;
    n.addChild(labelNode);
    labelNode.setPosition(0, 7);
    labelNode.addComponent(UITransform).setContentSize(w - 10, 26);
    const label = labelNode.addComponent(Label);
    label.fontSize = 16;
    label.lineHeight = 24;
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    const small = new Node("Key");
    small.layer = n.layer;
    n.addChild(small);
    small.setPosition(0, -13);
    small.addComponent(UITransform).setContentSize(w - 10, 20);
    const caption = small.addComponent(Label);
    caption.fontSize = 12;
    caption.lineHeight = 18;
    caption.horizontalAlign = Label.HorizontalAlign.CENTER;
    caption.verticalAlign = Label.VerticalAlign.CENTER;
    const b: Button = {
      node: n,
      label,
      caption,
      control: {
        id,
        label: "",
        x: x + w / 2,
        y: y + h / 2,
        w,
        h,
        disabled: false,
      },
      disabled: false,
      color: "",
    };
    this.buttons.set(id, b);
    n.on(Node.EventType.TOUCH_START, (e: EventTouch) => {
      e.propagationStopped = true;
      if (b.disabled) return;
      if (id === "attack") this.heldPointers.add(e.getID() ?? 0);
      else this.run(id);
      n.getComponent(UIOpacity)!.opacity = 210;
    });
    const end = (e: EventTouch) => {
      e.propagationStopped = true;
      this.heldPointers.delete(e.getID() ?? 0);
      n.getComponent(UIOpacity)!.opacity = 255;
    };
    n.on(Node.EventType.TOUCH_END, end);
    n.on(Node.EventType.TOUCH_CANCEL, end);
    n.on(Node.EventType.MOUSE_ENTER, () => {
      if (!b.disabled) n.getComponent(UIOpacity)!.opacity = 235;
    });
    n.on(Node.EventType.MOUSE_LEAVE, () => {
      if (!this.held) n.getComponent(UIOpacity)!.opacity = 255;
    });
  }
  draw(
    width: number,
    height: number,
    s: GameState,
    locked: boolean,
    controls: Control[],
    actions: Map<string, () => unknown>,
  ) {
    this.root.active = true;
    this.root.setPosition(-width / 2, height / 2);
    const compact = width < 1000,
      w = compact ? 82 : 108,
      h = 54,
      gap = 8,
      x = width - 4 * w - 3 * gap - 20,
      y = height - 140,
      size = width + ":" + height;
    if (this.size !== size) {
      this.release();
      for (const child of [...this.root.children]) child.destroy();
      this.root.removeAllChildren();
      this.buttons.clear();
      this.size = size;
      ["attack", "spark", "soup", "next-target"].forEach((id, i) =>
        this.create(id, x + i * (w + gap), y, w, h),
      );
    }
    const c = s.combat!,
      weapon = c.equipped ? c.weapons[c.equipped] : null,
      has = !!weapon && !!s.inventory[c.equipped!],
      stamina = s.stamina?.current || 0;
    const data: [string, string, string, boolean][] = [
      [
        "attack",
        has && stamina < (weapon?.stamina || 0)
          ? "体力不足"
          : c.cast
            ? "出手中"
            : c.attack_at > c.time
              ? "蓄势"
              : "攻击",
        compact ? "按住连击" : "空格 · 按住连击",
        locked || !has || stamina < (weapon?.stamina || 0),
      ],
      [
        "spark",
        "火花术",
        !c.spark_learned
          ? "尚未研习"
          : c.spark_at > c.time
            ? `${Math.ceil(c.spark_at - c.time)} 秒冷却`
            : compact
              ? "4 体力"
              : "Q · 4 体力",
        locked ||
          !c.spark_learned ||
          !!c.cast ||
          c.attack_at > c.time ||
          c.spark_at > c.time ||
          stamina < 4,
      ],
      [
        "soup",
        "菜汤",
        c.floor === 5 && c.soups_used >= 2
          ? "本层已用2次"
          : c.soup_at > c.time
            ? `${Math.ceil(c.soup_at - c.time)} 秒冷却`
            : `${s.inventory.soup || 0} 份${compact ? "" : " · R"}`,
        locked ||
          !s.inventory.soup ||
          !!c.cast ||
          c.soup_at > c.time ||
          (c.floor === 5 && c.soups_used >= 2),
      ],
      [
        "next-target",
        "切换目标",
        compact ? "点击选择" : "T · 不会攻击",
        locked || !c.enemies.some((e) => e.hp > 0),
      ],
    ];
    for (const [id, label, caption, disabled] of data) {
      const b = this.buttons.get(id)!;
      b.disabled = disabled;
      b.control.disabled = disabled;
      b.control.label = label;
      b.label.string = label;
      b.caption.string = caption;
      b.label.color = new Color(
        id === "attack" && !disabled ? C.raised : C.ink,
      );
      b.caption.color = new Color(
        id === "attack" && !disabled ? C.paper : C.muted,
      );
      this.shape(
        b,
        disabled
          ? "#d0d7bf"
          : id === "attack"
            ? this.held
              ? "#2c4b36"
              : C.moss
            : C.raised,
      );
      controls.push(b.control);
      if (!disabled) actions.set(id, () => this.run(id));
    }
  }
}
