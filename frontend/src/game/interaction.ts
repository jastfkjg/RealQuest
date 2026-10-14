import type { GameState, Panel, WorldObject } from "../types";
import { staminaNow } from "./stamina";

// Inside the server's 72px validation radius, leaving room for position sync.
export const INTERACTION_RADIUS = 65;
export function interactionFor(
  obj: WorldObject,
  state: GameState,
  now: number,
): {
  label: string;
  command?: string;
  panel?: Panel;
  reason?: string;
} {
  switch (obj.kind) {
    case "building":
      return { label: "进入", command: "enter" };
    case "exit":
      return { label: "回到户外", command: "exit" };
    case "npc":
      return { label: "交谈 / 委托", command: "talk", panel: "npc" };
    case "board":
      return { label: "查看委托", panel: "board" };
    case "station":
      return {
        label: obj.id === "home_desk" ? "翻阅升级手册" : "打开工作台",
        panel: "building",
      };
    case "study":
      return { label: "翻开研习手记", panel: "study" };
    case "storage":
      return { label: "存取物品", panel: "storage" };
    case "rest":
      return { label: "睡觉 · 补满体力", command: "rest" };
    case "wood":
    case "stone": {
      const seconds = Math.ceil((state.gathered[obj.id] || 0) - now);
      const cost =
        state.stamina_rules?.gather_costs[obj.kind] ??
        (obj.kind === "wood" ? 4 : 6);
      return {
        label: `采集 · ${cost} 体力`,
        command: "gather",
        reason:
          seconds > 0
            ? `${seconds} 秒后恢复`
            : staminaNow(state, now) < cost
              ? `体力不足 · 需要 ${cost} 点，回家睡觉可补满`
              : undefined,
      };
    }
    case "plot": {
      const crop = state.plots[obj.id];
      const seconds = crop ? Math.ceil(crop.ready_at - now) : 0;
      return {
        label: crop ? "收获" : "播种",
        command: crop ? "harvest" : "plant",
        reason:
          seconds > 0
            ? `${seconds} 秒后成熟`
            : !crop && state.inventory.seed < 1
              ? "需要种子 · 可在工坊购买"
              : undefined,
      };
    }
    case "landmark":
      return {
        label: "发现此地",
        command: "discover",
        reason: state.events.includes(`discovered_${obj.id}`)
          ? "已记录在地图"
          : undefined,
      };
    case "chest":
      return {
        label: "打开补给",
        command: "open_chest",
        reason: state.events.includes(`opened_${obj.id}`)
          ? "补给已取走"
          : undefined,
      };
    case "event":
      return {
        label: "解读符文",
        command: "explore",
        reason: state.events.includes("rune_awakened")
          ? "符文已唤醒"
          : state.attributes.wisdom < 25
            ? `需要学识 EXP ${state.attributes.wisdom}/25`
            : undefined,
      };
    default:
      return { label: "查看", reason: "暂不可互动" };
  }
}

// Visual hit areas resolve to the existing authoritative interaction anchors.
export function hitObject(obj: WorldObject, x: number, y: number) {
  if (obj.hitbox) {
    const [rx, ry, w, h] = obj.hitbox;
    return x >= rx && x <= rx + w && y >= ry && y <= ry + h;
  }
  if (obj.rect) {
    const [rx, ry, w] = obj.rect;
    return x >= rx && x <= rx + w && y >= ry - 32 && y <= obj.y + 12;
  }
  const height = obj.kind === "npc" ? 36 : obj.kind === "board" ? 44 : 24;
  return Math.abs(x - obj.x) <= 24 && y >= obj.y - height && y <= obj.y + 16;
}
