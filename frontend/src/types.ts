export type Attribute =
  "strength" | "wisdom" | "craft" | "stewardship" | "bond";
export interface WorldObject {
  id: string;
  kind: string;
  name: string;
  x: number;
  y: number;
  rect?: number[];
  hitbox?: number[];
  building?: string;
}
export interface World extends MapData {
  interiors: Record<string, MapData>;
}
export interface GameState {
  knowledge_points?: number;
  knowledge_growth?: { science: number; magic: number };
  stamina?: { current: number; max: number; updated_at: number };
  stamina_rules?: {
    gather_costs: Record<string, number>;
    seconds_per_point: number;
    capacity_per_point: number;
  };
  health_points?: number;
  health_invested?: number;
  exercise_task_log?: ExerciseTask[];
  study_plan_log?: StudyPlan[];
  study_task_log?: StudyTask[];
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
    id?: string;
    study_task_id?: string;
    exercise_task_id?: string;
    knowledge_shards?: number;
    created_at?: number;
    kind: string;
    amount: number;
    date: string;
    source: string;
    verified: boolean;
    note: string;
    xp: number;
  }[];
  timer: {
    id?: string;
    study_task_id?: string | null;
    topic: string;
    elapsed: number;
    started_at: number;
    running: boolean;
  } | null;
  revision: number;
}
export interface Reply {
  save_id?: string;
  state: GameState;
  world?: World;
  server_time: number;
  message?: string;
}
export type Panel =
  | "training"
  | "menu"
  | "map"
  | "board"
  | "storage"
  | "character"
  | "inventory"
  | "activity"
  | "study"
  | "journal"
  | "guide"
  | "settings"
  | "ai"
  | "building"
  | "npc"
  | null;

export interface StudyTask {
  knowledge_reward?: number;
  plan_id?: string | null;
  archived_at?: number | null;
  id: string;
  title: string;
  target_minutes: number;
  date: string;
  timezone: string;
  created_at: number;
  completed_at: number | null;
  minutes: number;
  earned_xp: number;
  record_count: number;
}

export interface ExerciseTask {
  id: string;
  title: string;
  target_minutes: number;
  date: string;
  timezone: string;
  created_at: number;
  completed_at: number | null;
  minutes: number;
}

export interface StudyPlan {
  id: string;
  title: string;
  daily_minutes: number;
  created_at: number;
  archived_at: number | null;
}

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
