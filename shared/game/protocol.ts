export type Attribute =
  "strength" | "wisdom" | "craft" | "stewardship" | "bond";
export interface WorldObject {
  id: string;
  kind: string;
  name: string;
  x: number;
  y: number;
  destination?: string;
  phase?: number;
  rect?: number[];
  hitbox?: number[];
  building?: string;
  location?: string;
  activity?: string;
  walking?: boolean;
}
export interface WeaponDefinition {
  name: string;
  price: number;
  damage: number;
  interval: number;
  reach: number;
  stamina: number;
  magic: boolean;
  science: number;
  magic_level: number;
  either: boolean;
  costs: Record<string, number>;
  craft_reasons: string[];
}
export interface CaveEnemy {
  id: string;
  kind: string;
  name: string;
  x: number;
  y: number;
  hp: number;
  max_hp: number;
  phase: string;
  until: number;
  tx: number;
  ty: number;
  style?: string;
  hit_until?: number;
  stagger_until?: number;
  dead_at?: number;
}
export interface CombatAction {
  kind: string;
  style?: string;
  angle?: number;
  reach?: number;
  until: number;
  started: number;
  hit_at?: number;
  seq?: number;
}
export interface CombatView {
  encounter: string;
  input_seq: number;
  projectiles: {
    x: number;
    y: number;
    angle: number;
    until: number;
    wave: string;
    side?: string;
  }[];
  weapons: Record<string, WeaponDefinition>;
  enemies: CaveEnemy[];
  floor: number;
  time: number;
  effects: {
    x: number;
    y: number;
    text: string;
    until: number;
    kind: string;
    id?: number;
    enemy?: string;
    heavy?: boolean;
    exposed?: boolean;
  }[];
  cast: CombatAction | null;
  action?: CombatAction | null;
  dash?: { dx: number; dy: number; started: number; until: number } | null;
  dodge_at?: number;
  hurt_until?: number;
  message: string;
  cleared: boolean;
  unlocked: number;
  equipped: string | null;
  gate_open: boolean;
  legacy_passage: boolean;
  boss_first: boolean;
  spark_learned: boolean;
  soups_used: number;
  attack_at: number;
  spark_at: number;
  soup_at: number;
}
export interface World extends MapData {
  interiors: Record<string, MapData>;
  areas?: Record<string, MapData>;
  travel_npcs?: (WorldObject & {
    phase: number;
    location: string;
    walking: boolean;
    activity: string;
  })[];
  residents?: Resident[];
}
export interface Resident {
  id: string;
  name: string;
  role: string;
  signature: string;
  favorite: string;
  liked: string;
  help: string;
  schedule: {
    minute: number;
    location: string;
    x: number;
    y: number;
    activity: string;
    legs: { location: string; seconds: number; points: number[][] }[];
  }[];
}
export interface NpcEncounter {
  id: string;
  token: string;
  location: string;
  x: number;
  y: number;
  started_at: number;
  until: number;
}
export interface LifeTask {
  id: string;
  kind: "study" | "exercise" | "work";
  hours: number;
  date: string;
  giver: string;
  accepted_at: number;
  ready_at: number;
  status: "active" | "claimed" | "cancelled";
  claimed_at: number | null;
  cancelled_at: number | null;
  reward: number;
  source: "npc_elapsed";
  verified: false;
}
export type GrowthTarget =
  | "vitality"
  | "stamina"
  | "science"
  | "magic"
  | "planting"
  | "ranching"
  | "building";
export type GrowthCurrency =
  "health_points" | "knowledge_points" | "skill_points";
export interface GrowthOption {
  currency: GrowthCurrency;
  cost: number;
  current: number;
  next: number;
  expected_invested: number;
}
export interface Market {
  date: string;
  timezone: string;
  buy: Record<string, number>;
  sell: Record<string, number>;
  orders: {
    id: string;
    title: string;
    item: string;
    amount: number;
    gold: number;
    note: string;
    completed: boolean;
  }[];
}
export interface TravelOption {
  completed: boolean;
  id: string;
  target: string;
  label: string;
  note: string;
  minutes: number;
  costs: Record<string, number>;
  stamina: number;
  destination: string | null;
  arrival_minute: number;
  reasons: string[];
}
export interface GameState {
  village_intro?: {
    version: number;
    dismissed: boolean;
    briefed: boolean;
    first_clear: boolean;
    returned: boolean;
    reviewed: boolean;
  };
  village_combat?: {
    gate_open: boolean;
    legacy_passage: boolean;
    boss_first: boolean;
    equipped: string | null;
  };
  combat?: CombatView;
  departure?: {
    bridge_repaired: boolean;
    rope_ready: boolean;
    letter_delivered: boolean;
    booking_day: number;
  };
  travel?: { day: number; options: TravelOption[] };
  world_clock?: {
    version?: number;
    start_minute?: number;
    elapsed: number;
    updated_at: number;
    running_until: number;
    day_seconds: number;
    last_night?: {
      day: number;
      kind: "sleep" | "faint";
      health_delta: number;
      stamina_delta: number;
      at: number;
    } | null;
  };
  sleep_rules?: {
    wake_minute: number;
    deadline_minute: number;
    faint_damage: number;
    sleep_health: number;
    short_rest_minutes: number;
    short_rest_stamina: number;
    short_rest_health: number;
  };
  npc_encounter?: NpcEncounter | null;
  npc_social?: Record<
    string,
    {
      greeted: boolean;
      gifted: boolean;
      helped: boolean;
      memory_unlocked: boolean;
    }
  >;

  market?: Market;
  vitality?: { current: number; max: number };
  skill_growth?: { planting: number; ranching: number; building: number };
  character_growth_options?: Record<GrowthTarget, GrowthOption>;
  skill_points?: number;
  life_journal?: {
    date: string;
    timezone: string;
    limit: number;
    claimed: number;
    reserved: number;
    remaining: number;
    tasks: LifeTask[];
  };
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
  account?: { username: string } | null;
  session_token?: string;
  save_id?: string;
  state: GameState;
  world?: World;
  server_time: number;
  message?: string;
}
export type Panel =
  | "preparation"
  | "armory"
  | "equipment"
  | "spellbook"
  | "cave"
  | "gate"
  | "travel"
  | "sleep"
  | "neighbors"
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
  | "shop"
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
  outdoor?: boolean;
  objects: WorldObject[];
  trees: number[][];
  obstacles: number[][];
  furniture?: Furniture[];
  regions?: Region[];
  spawn?: { x: number; y: number };
}
export interface Quest {
  id: string;
  kind: 'main' | 'side';
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
