import { create } from "zustand";
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
  dialogue: string;
  nearest: WorldObject | null;
  notice: string;
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
export const useGame = create<Store>((set, get) => ({
  state: null,
  world: null,
  panel: null,
  selected: null,
  dialogue: "",
  nearest: null,
  notice: "",
  error: "",
  busy: false,
  ready: false,
  clockOffset: 0,
  tracking: true,
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
export const itemNames: Record<string, string> = {
  gold: "金币",
  wood: "木材",
  stone: "石料",
  seed: "种子",
  crop: "萝卜",
  plank: "木板",
};
export const attributeNames: Record<string, string> = {
  strength: "体魄",
  wisdom: "学识",
  craft: "创造",
  stewardship: "经营",
  bond: "联结",
};
export const activityNames: Record<string, string> = {
  steps: "步行",
  study: "学习",
  exercise: "运动",
  creative: "创造与工作",
  management: "生活管理",
};
