import { create } from "zustand";
import { itemNames } from "../game/items";
export { itemNames } from "../game/items";
import { api, sendCommand } from "../services/api";
import type {
  GameState,
  NavigationTarget,
  Panel,
  Reply,
  World,
  WorldObject,
} from "../types";
interface Store {
  state: GameState | null;
  world: World | null;
  panel: Panel;
  selected: WorldObject | null;
  inventoryItem: string;
  quickItems: string[];
  activityKind: string;
  selectItem: (item: string) => void;
  pinItem: (item: string, index: number) => void;
  dialogue: string;
  nearest: WorldObject | null;
  notice: string;
  noticePanel: Panel;
  error: string;
  busy: boolean;
  ready: boolean;
  clockOffset: number;
  tracking: boolean;
  navigation: NavigationTarget | null;
  navigate: (target: NavigationTarget | null) => void;
  boot: () => Promise<void>;
  accept: (reply: Reply) => void;
  command: (
    action: string,
    data?: Record<string, unknown>,
    silent?: boolean,
  ) => Promise<boolean>;
  open: (panel: Panel, selected?: WorldObject) => void;
  setNearest: (obj: WorldObject | null) => void;
}
const defaultQuickItems = ["seed", "wood", "stone", "crop"];
function readQuickItems(): string[] {
  try {
    const saved = JSON.parse(
      localStorage.getItem("realquest-quick-items") || "null",
    );
    if (
      Array.isArray(saved) &&
      saved.length === 4 &&
      new Set(saved).size === 4 &&
      saved.every((item) =>
        ["seed", "wood", "stone", "crop", "plank"].includes(item),
      )
    )
      return saved;
  } catch {
    /* Browser preferences are optional. */
  }
  return defaultQuickItems;
}
export const useGame = create<Store>((set, get) => ({
  state: null,
  world: null,
  panel: null,
  selected: null,
  inventoryItem: "seed",
  quickItems: readQuickItems(),
  activityKind: "study",
  selectItem: (inventoryItem) => set({ inventoryItem }),
  pinItem: (item, index) => {
    if (
      !itemNames[item] ||
      item === "gold" ||
      index < 0 ||
      index > 3 ||
      !Number.isInteger(index) ||
      (get().state?.inventory[item] ?? 0) <= 0
    )
      return;
    const quickItems = [...get().quickItems];
    const oldIndex = quickItems.indexOf(item);
    if (oldIndex >= 0) quickItems[oldIndex] = quickItems[index];
    quickItems[index] = item;
    set({ quickItems });
    try {
      localStorage.setItem("realquest-quick-items", JSON.stringify(quickItems));
    } catch {
      /* Optional. */
    }
  },
  dialogue: "",
  nearest: null,
  notice: "",
  noticePanel: null,
  error: "",
  busy: false,
  ready: false,
  clockOffset: 0,
  tracking: false,
  navigation: null,
  navigate: (navigation) => set({ navigation, panel: null }),
  accept: (reply) =>
    set((current) => ({
      state:
        !current.state || reply.state.revision >= current.state.revision
          ? reply.state
          : current.state,
      clockOffset: reply.server_time - Date.now() / 1000,
    })),
  boot: async () => {
    try {
      const reply = await api("session", "POST");
      get().accept(reply);
      set({ world: reply.world!, ready: true, error: "" });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },
  command: async (action, data = {}, silent = false) => {
    if (!silent && get().busy) return false;
    if (!silent) set({ busy: true, error: "" });
    try {
      const reply = await sendCommand(action, data);
      get().accept(reply);
      if (["track_quest", "quest_accept", "quest_claim"].includes(action))
        set({ navigation: null });
      if (!silent)
        set({
          notice: reply.message || "",
          noticePanel: get().panel,
          dialogue: action === "talk" ? reply.message || "" : get().dialogue,
        });
      return true;
    } catch (e) {
      set({ error: (e as Error).message });
      return false;
    } finally {
      if (!silent) set({ busy: false });
    }
  },
  open: (panel, selected) =>
    set({ panel, selected: selected || null, error: "" }),
  setNearest: (nearest) => {
    if (get().nearest?.id !== nearest?.id) set({ nearest });
  },
}));
export const serverNow = () =>
  Date.now() / 1000 + useGame.getState().clockOffset;
export { attributeNames } from "../game/characterGrowth";
export { activityNames } from "../game/activities";
