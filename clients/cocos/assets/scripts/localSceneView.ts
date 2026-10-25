import {
  Node,
  UITransform,
  Sprite,
  SpriteFrame,
  Graphics,
  Color,
  UIOpacity,
} from "cc";
import type { MapData, GameState, WorldObject } from "./core/protocol";
import { sceneLayouts, type SceneImage } from "./core/sceneLayout";
import { hitObject } from "./core/interaction";
import { routeMarks } from "./core/localScene";
import { paintGraphics } from "./cavePaint";
import { serverNow } from "./core/clock";
export class LocalSceneRenderer {
  private images: { node: Node; record: SceneImage }[] = [];
  private cues: Graphics | null = null;
  constructor(
    private parent: Node,
    private frames: Map<string, SpriteFrame>,
    private objects: Map<string, Node>,
    private depths: Map<Node, number>,
  ) {}
  build(map: MapData) {
    this.images = [];
    this.cues = null;
    const layout = sceneLayouts[map.id];
    if (!layout) return false;
    for (const record of layout) {
      if(map.resource_nodes){
        if(record.data.canopy||typeof record.data.worldObject==='string'&&map.resource_nodes.some(n=>n.id===record.data.worldObject))continue;
        if(record.kind!=='image'&&map.trees.some(([x,y])=>record.x===x+5&&record.y===y+5))continue;
      }
      const n = new Node(record.art || "SceneShadow");
      n.layer = this.parent.layer;
      this.parent.addChild(n);
      n.setPosition(record.x, -record.y);
      const t = n.addComponent(UITransform);
      t.setContentSize(record.w * record.scale, record.h * record.scale);
      t.setAnchorPoint(record.originX, 1 - record.originY);
      if (record.kind === "image") {
        const frame = this.frames.get(record.art!);
        if (!frame) throw Error("Unbound scene artwork " + record.art);
        const sprite = n.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        sprite.spriteFrame = frame;
      } else {
        const g = n.addComponent(Graphics);
        g.fillColor = new Color(
          "#" + (record.color || 0).toString(16).padStart(6, "0"),
        );
        g.fillColor = new Color(
          g.fillColor.r,
          g.fillColor.g,
          g.fillColor.b,
          Math.round(record.alpha * 255),
        );
        g.ellipse(0, 0, record.w / 2, record.h / 2);
        g.fill();
      }
      n.active = record.visible;
      this.depths.set(n, record.depth);
      const id = record.data.building || record.data.worldObject;
      if (typeof id === "string") this.objects.set(id, n);
      this.images.push({ node: n, record });
    }
    const cue = new Node("LocalInteractionCues");
    cue.layer = this.parent.layer;
    this.parent.addChild(cue);
    cue.addComponent(UITransform).setContentSize(map.width, map.height);
    this.cues = cue.addComponent(Graphics);
    this.depths.set(cue, 9999);
    return true;
  }
  hit(obj: WorldObject, x: number, y: number) {
    if (obj.kind === "building") {
      const item = this.images.find((i) => i.record.data.building === obj.id);
      if (item) {
        const r = item.record,
          w = r.w * r.scale,
          h = r.h * r.scale;
        return (
          x >= r.x - w * r.originX &&
          x <= r.x + w * (1 - r.originX) &&
          y >= r.y - h * r.originY &&
          y <= r.y + h * (1 - r.originY)
        );
      }
    }
    return hitObject(obj, x, y);
  }
  update(
    s: GameState,
    p: { x: number; y: number },
    route: { x: number; y: number }[],
    active: string | undefined,
    reduced: boolean,
    time: number,
    blocked: {x:number;y:number}|null = null,
  ) {
    for (const { node: n, record: r } of this.images) {
      if (r.data.canopy) {
        const behind =
          p.y < r.y &&
          p.y > r.y - r.h * r.scale - 8 &&
          Math.abs(p.x - r.x) < (r.w * r.scale) / 2 - 4;
        (n.getComponent(UIOpacity) || n.addComponent(UIOpacity)).opacity =
          behind ? 115 : 255;
      }
      const response = r.data["home-response"];
      if (typeof response === "string") {
        if (response === "home_chest") {
          const frame = this.frames.get(
            active === response
              ? "interiors/chest-open"
              : "interiors/chest-closed",
          )!;
          const sprite = n.getComponent(Sprite)!;
          if (sprite.spriteFrame !== frame) {
            sprite.spriteFrame = frame;
            n.getComponent(UITransform)!.setContentSize(
              frame.width * r.scale,
              frame.height * r.scale,
            );
          }
        } else if (response === "home_bed")
          n.getComponent(Sprite)!.color = new Color(
            active === response ? "#f6edce" : "#ffffff",
          );
        else n.active = active === response;
      }
      const id = r.data.worldObject;
      if (typeof id === "string") {
        n.active = (s.gathered[id] || 0) <= serverNow();
        (n.getComponent(UIOpacity) || n.addComponent(UIOpacity)).opacity =
          s.events.includes("opened_" + id) ? 166 : 255;
      }
    }
    if (this.cues) {
      this.cues.clear();
      paintGraphics(this.cues, routeMarks(route, reduced, time));
      if(blocked){
        this.cues.strokeColor=new Color('#ead9a4b8');this.cues.lineWidth=1;
        this.cues.moveTo(blocked.x-3,-blocked.y-3);this.cues.lineTo(blocked.x+3,-blocked.y+3);
        this.cues.moveTo(blocked.x-3,-blocked.y+3);this.cues.lineTo(blocked.x+3,-blocked.y-3);this.cues.stroke();
      }
    }
  }
}
