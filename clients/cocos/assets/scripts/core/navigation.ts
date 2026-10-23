import {chestObjects,carpenter,machineObjects} from './construction';
import type {
  GameState,
  MapData,
  NavigationTarget,
  Quest,
  World,
} from "./protocol";
import { residentPositions } from "./residents";
import { farmObjects } from "./farming";
import {ranchObjects} from './ranching';
import { villageIntroStep } from "./villageIntro";
import {resourceObjects,resourceLand} from './tools';

export const mapById = (world: World, id: string): MapData =>
  id === "overworld" ? world : world.areas?.[id] || world.interiors[id];
export const currentMap = (world: World, state: GameState, now: number): MapData => {
 const base=mapById(world,state.location),nodes=resourceObjects(base,state,now);
 return ({
  ...mapById(world, state.location),
  cultivation:resourceLand(base,nodes),
  obstacles:[...(base.permanent_obstacles||base.obstacles),...nodes.filter(n=>n.resource_state!.solid).map(n=>n.collider!),...(state.location==='home'?chestObjects(state).map(o=>o.hitbox!):state.location==='pasture'?machineObjects(state).map(o=>o.hitbox!):[])],
  objects: [
    ...nodes,
    ...(state.location==='home'?chestObjects(state):state.location==='workshop'?[carpenter]:[]),
    ...(state.location==='pasture'?[...ranchObjects(state),...machineObjects(state)]:[]),
    ...farmObjects(mapById(world, state.location).objects,state,mapById(world,state.location).cultivation).filter(
      (o) => !["npc", "travel_npc",'resource'].includes(o.kind),
    ),
    ...residentPositions(world, state, now).filter(
      (r) => r.location === state.location,
    ),
  ],
});};
export function accessibleTarget(
  target: NavigationTarget,
  world: World,
  state: GameState,
  now: number,
) {
  const resident = residentPositions(world, state, now).find(
    (r) => r.id === target.targetId,
  );
  if (resident) target = { ...target, mapId: resident.location };
  const map = currentMap(world, state, now);
  if (state.location === target.mapId)
    return map.objects.find((o) => o.id === target.targetId) || null;
  // Search the actual connected doors. This only selects a bearing, never moves
  // the player or bypasses a fare / mountain requirement.
  const queue = [
    { id: state.location, first: null as (typeof map.objects)[number] | null },
  ];
  const seen = new Set([state.location]);
  while (queue.length) {
    const node = queue.shift()!;
    for (const obj of mapById(world, node.id).objects) {
      const destination =
        obj.destination ||
        (obj.kind === "building"
          ? obj.id
          : obj.kind === "exit"
            ? "overworld"
            : null);
      if (!destination || seen.has(destination)) continue;
      const first = node.first || obj;
      if (destination === target.mapId) return first;
      seen.add(destination);
      queue.push({ id: destination, first });
    }
  }
  return null;
}
export function questTarget(
  quest: Quest,
  state: GameState,
): NavigationTarget | null {
  if (quest.status === 'available' && quest.accept_anywhere) return null;
  if ((quest.id === "leave_valley" && (!state.quest_story || quest.legacy) || quest.id === 'first_expedition') && quest.status === "active") {
    const intro = villageIntroStep(state);
    if (intro) return intro.target || null;
  }
  if (quest.status === "ready" || quest.status === "available")
    return {
      mapId: quest.giver_map || (
        quest.giver === "mira"
          ? "shop"
          : quest.giver === "guild_board"
            ? "guild"
            : "overworld"),
      targetId: quest.giver,
    };
  const step = quest.checks.findIndex((v) => !v);
  const targets: Record<string, NavigationTarget[]> = {
    leave_valley: [
      { mapId: "overworld", targetId: "cave_entry" },
      { mapId: "overworld", targetId: "library" },
      { mapId: "overworld", targetId: "village_departure" },
      { mapId: "overworld", targetId: "village_departure" },
      { mapId: "crossing", targetId: "river_bridge" },
      { mapId: "mountain", targetId: "mountain_pass" },
      { mapId: "inn", targetId: "lanya" },
      { mapId: "inn", targetId: "inn_bed" },
      { mapId: "overworld", targetId: "board" },
    ],
    market_neighbor: [
      { mapId: "overworld", targetId: "shop" },
      { mapId: "shop", targetId: "mira" },
    ],
    village_supplier: [
      { mapId: "shop", targetId: "mira" },
      { mapId: "home", targetId: "home_desk" },
    ],
    settle_in: [
      { mapId: "overworld", targetId: "home" },
      { mapId: "overworld", targetId: "wood_1" },
    ],
    first_harvest: [
      { mapId: "overworld", targetId: Object.keys(state.plots)[0] || "plot_0" },
      { mapId: "shop", targetId: "mira" },
    ],
    forest_path: [
      { mapId: "overworld", targetId: "grove" },
      { mapId: "overworld", targetId: "stone_3" },
    ],
    rune_research: [
      { mapId: "overworld", targetId: "library" },
      { mapId: "overworld", targetId: "lia" },
      { mapId: "overworld", targetId: "ruins" },
    ],
    craft_home: [
      { mapId: "workshop", targetId: "workshop_counter" },
      { mapId: "workshop", targetId: "workshop_counter" },
    ],
    wide_world: [
      { mapId: "overworld", targetId: "lake" },
      { mapId: "overworld", targetId: "quarry" },
    ],
  };
  if (state.quest_story && !quest.legacy) {
    const field = {mapId: 'overworld', targetId: Object.entries(state.plots).find(([,p]) => p.crop_id === 'radish')?.[0] || state.farm?.tilled?.[0] || 'plot_0'};
    const chicken = Object.entries(state.ranch?.animals || {}).find(([,a]) => a.species === 'chicken')?.[0];
    Object.assign(targets, {
      first_harvest: [field, field],
      craft_planks: [{mapId:'workshop',targetId:'workshop_counter'}],
      craft_home: [{mapId:'home',targetId:'home_desk'}],
      ranch_start: [{mapId:'pasture',targetId:'shelter_coop'}, {mapId:'pasture',targetId:'ranch_ledger'}, {mapId:'pasture',targetId:chicken || 'ranch_ledger'}],
      first_expedition: [{mapId:'workshop',targetId:'blacksmith'}, {mapId:'overworld',targetId:'cave_entry'}, {mapId:'workshop',targetId:'armory_counter'}],
      gate_story: [{mapId:'overworld',targetId:'library'}, {mapId:'overworld',targetId:'village_departure'}],
      gate_preparation: [{mapId:'overworld',targetId:'cave_entry'}, {mapId:'overworld',targetId:'noah'}],
      leave_valley: [{mapId:'overworld',targetId:'village_departure'}, {mapId:'overworld',targetId:'village_departure'}],
      crossing_path: [{mapId:'crossing',targetId:'river_bridge'}],
      city_arrival: [{mapId:'mountain',targetId:'mountain_pass'}, {mapId:'inn',targetId:'lanya'}, {mapId:'inn',targetId:'inn_bed'}],
      return_visit: [{mapId:'overworld',targetId:'board'}],
      ranch_harvest: [{mapId:'pasture',targetId:chicken || 'ranch_ledger'}],
    });
  }
  return targets[quest.id]?.[step] || null;
}
export function walkable(map: MapData, x: number, y: number) {
  return (
    x >= 24 &&
    x <= map.width - 24 &&
    y >= 32 &&
    y <= map.height - 24 &&
    !map.obstacles.some(
      ([rx, ry, w, h]) =>
        x > rx - 9 && x < rx + w + 9 && y > ry - 7 && y < ry + h + 7,
    )
  );
}
export function pathfind(
  map: MapData,
  start: { x: number; y: number },
  end: { x: number; y: number },
): { x: number; y: number }[] {
  const size = 16,
    cols = Math.ceil(map.width / size),
    rows = Math.ceil(map.height / size),
    key = (x: number, y: number) => y * cols + x;
  const sx = Math.floor(start.x / size),
    sy = Math.floor(start.y / size),
    tx = Math.floor(end.x / size),
    ty = Math.floor(end.y / size),
    goal = key(tx, ty);
  const open = [key(sx, sy)],
    cost = new Map([[open[0], 0]]),
    parent = new Map<number, number>(),
    closed = new Set<number>(),
    pass = new Map<number, boolean>();
  const h = (n: number) =>
    Math.abs((n % cols) - tx) + Math.abs(Math.floor(n / cols) - ty);
  for (let count = 0; open.length && count < 12000; count++) {
    open.sort((a, b) => cost.get(b)! + h(b) - (cost.get(a)! + h(a)));
    const n = open.pop()!;
    if (closed.has(n)) continue;
    if (n === goal) {
      const result = [];
      let at = n;
      while (parent.has(at)) {
        result.unshift({
          x: (at % cols) * size + 8,
          y: Math.floor(at / cols) * size + 8,
        });
        at = parent.get(at)!;
      }
      return result;
    }
    closed.add(n);
    const x = n % cols,
      y = Math.floor(n / cols);
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const xx = x + dx,
        yy = y + dy,
        nn = key(xx, yy);
      if (xx < 0 || yy < 0 || xx >= cols || yy >= rows || closed.has(nn))
        continue;
      if (!pass.has(nn))
        pass.set(nn, walkable(map, xx * size + 8, yy * size + 8));
      if (!pass.get(nn)) continue;
      const next = cost.get(n)! + 1;
      if (next < (cost.get(nn) ?? Infinity)) {
        parent.set(nn, n);
        cost.set(nn, next);
        open.push(nn);
      }
    }
  }
  return [];
}
