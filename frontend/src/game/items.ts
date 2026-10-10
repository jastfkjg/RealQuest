// Stable game IDs and the existing, audited 16px icon family.
export interface ItemDefinition {
  name: string;
  group: string;
  summary: string;
  description: string;
  source: string;
  use: string;
  icon: string;
}
const icon = (id: string) => `/assets/ninja-adventure/icons/${id}.png`;
export const itemDefinitions: Record<string, ItemDefinition> = {
  wood: {
    name: "木材",
    group: "材料",
    summary: "建造家园，也能加工成木板。",
    description: "带着树脂香气的结实木材。家园的一梁一柱，都从这里开始。",
    source: "林间落枝 · 每 30 秒恢复",
    use: "3 木材 → 1 木板",
    icon: icon("wood"),
  },
  stone: {
    name: "石料",
    group: "材料",
    summary: "为小屋与工坊添一份坚实。",
    description: "从岩堆中采集的石料，是加固小屋与工坊的基础材料。",
    source: "岩石采集点 · 每 30 秒恢复",
    use: "用于小屋、工坊和图书馆升级",
    icon: icon("stone"),
  },
  seed: {
    name: "种子",
    group: "种植",
    summary: "在家园农田播种。",
    description: "一小袋萝卜种子。在家门口的农田播下，等待新生活破土而出。",
    source: "工坊购买 · 收获时留种",
    use: "1 种子 → 2 萝卜 + 1 种子",
    icon: icon("seed"),
  },
  crop: {
    name: "萝卜",
    group: "收获",
    summary: "带到工坊，换取下一袋种子。",
    description: "刚从泥土中拔出的新鲜萝卜。带去工坊，为下一次冒险换些金币。",
    source: "家园农田 · 成熟后收获",
    use: "在工坊柜台出售",
    icon: icon("crop"),
  },
  plank: {
    name: "木板",
    group: "材料",
    summary: "交给工匠，完成制作委托。",
    description: "细心打磨的木板，保留着温暖的木纹。也是完成工匠委托的证明。",
    source: "工坊制作 · 消耗 3 木材",
    use: "完成制作相关委托",
    icon: icon("plank"),
  },
};
export const itemNames: Record<string, string> = {
  gold: "金币",
  ...Object.fromEntries(
    Object.entries(itemDefinitions).map(([id, item]) => [id, item.name]),
  ),
};
// Legacy tray size, NOT an authoritative capacity or stack limit.
export const inventoryTraySlots = 24;
