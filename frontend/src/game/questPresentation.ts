import type { Quest } from "../types";

export const questStatuses: Record<Quest["status"], string> = {
  available: "可接取",
  locked: "尚未解锁",
  active: "进行中",
  ready: "可交付",
  claimed: "已完成",
};
