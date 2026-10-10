import { BookOpen, Hammer, Heart, Sparkles, Sprout } from "lucide-react";
import type { Attribute } from "../types";

export const attributeNames: Record<Attribute, string> = {
  strength: "体魄",
  wisdom: "学识",
  craft: "创造",
  stewardship: "经营",
  bond: "联结",
};
export const appearanceNames = ["林间旅行装", "轻装旅行服", "远行者装束"];

export const growth: Record<
  Attribute,
  {
    icon: typeof Heart;
    skill: string;
    threshold: number;
    type: string;
    effect: string;
    activity: string;
    kind: string;
    destination: { mapId: string; targetId: string };
    action: string;
  }
> = {
  strength: {
    icon: Heart,
    skill: "熟练采集",
    threshold: 50,
    type: "被动能力",
    effect: "每次采集木材或石料，额外获得 1 份材料。",
    activity: "步行或运动",
    kind: "exercise",
    destination: { mapId: "overworld", targetId: "wood_1" },
    action: "标记林间采集点",
  },
  wisdom: {
    icon: BookOpen,
    skill: "古代符文解读",
    threshold: 25,
    type: "探索能力",
    effect: "解读图书馆东侧的沉睡符文，找回古代手稿与知识碎片。",
    activity: "学习",
    kind: "study",
    destination: { mapId: "overworld", targetId: "ruins" },
    action: "标记古代遗迹",
  },
  craft: {
    icon: Hammer,
    skill: "木板制作",
    threshold: 0,
    type: "基础技艺",
    effect: "在工坊柜台将 3 份木材制作成 1 块木板，推进工匠委托。",
    activity: "创造与工作",
    kind: "creative",
    destination: { mapId: "workshop", targetId: "workshop_counter" },
    action: "标记工坊柜台",
  },
  stewardship: {
    icon: Sprout,
    skill: "家园种植",
    threshold: 0,
    type: "基础技艺",
    effect: "播种、收获并留下种子。小屋升至 2 级后，作物成熟时间缩短至 45 秒。",
    activity: "生活管理",
    kind: "management",
    destination: { mapId: "overworld", targetId: "plot_0" },
    action: "标记家园农田",
  },
  bond: {
    icon: Sparkles,
    skill: "旅人之谊",
    threshold: 0,
    type: "日常能力",
    effect: "每天首次与每位村民交谈，增加 1 点好感与 5 点联结经验。",
    activity: "村民交谈与委托",
    kind: "",
    destination: { mapId: "overworld", targetId: "lia" },
    action: "标记莉亚的位置",
  },
};
