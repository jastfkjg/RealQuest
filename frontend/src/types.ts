export type Attribute =
  "strength" | "wisdom" | "craft" | "stewardship" | "bond";
export interface WorldObject {
  id: string;
  kind: string;
  name: string;
  x: number;
  y: number;
  rect?: number[];
  building?: string;
}
export interface World extends MapData {
  interiors: Record<string, MapData>;
}
export interface GameState {
  location: string;
  quest_log: Quest[];
  quests: Record<string, { status: string; accepted_at: number }>;
  tracked_quest: string | null;
  stats: Record<string, number>;
  storage: Record<string, number>;
  character: { name: string; appearance: number } | null;
  position: { x: number; y: number };
  inventory: Record<string, number>;
  xp: number;
  attributes: Record<Attribute, number>;
  energy: number;
  knowledge_shard: number;
  buildings: Record<string, number>;
  plots: Record<string, { planted_at: number; ready_at: number }>;
  gathered: Record<string, number>;
  relationships: Record<string, number>;
  events: string[];
  activities: {
    kind: string;
    amount: number;
    date: string;
    source: string;
    verified: boolean;
    note: string;
    xp: number;
  }[];
  timer: {
    topic: string;
    elapsed: number;
    started_at: number;
    running: boolean;
  } | null;
  revision: number;
}
export interface Reply {
  state: GameState;
  world?: World;
  server_time: number;
  message?: string;
}
export type Panel =
  | "menu"
  | "map"
  | "board"
  | "storage"
  | "character"
  | "inventory"
  | "activity"
  | "journal"
  | "guide"
  | "settings"
  | "ai"
  | "building"
  | "npc"
  | null;

export interface Furniture {
  kind: string;
  rect: number[];
  solid?: boolean;
}
export interface Region {
  id: string;
  name: string;
  subtitle: string;
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface MapData {
  id: string;
  name: string;
  width: number;
  height: number;
  tile: number;
  objects: WorldObject[];
  trees: number[][];
  obstacles: number[][];
  furniture?: Furniture[];
  regions?: Region[];
  spawn?: { x: number; y: number };
}
export interface Quest {
  id: string;
  title: string;
  giver: string;
  giver_name: string;
  description: string;
  objectives: string[];
  checks: boolean[];
  reward: Record<string, number>;
  xp: number;
  attribute: Attribute;
  requires: string | null;
  status: "available" | "locked" | "active" | "ready" | "claimed";
}
export interface NavigationTarget {
  mapId: string;
  targetId: string;
}
