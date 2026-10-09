import type {
  GameState,
  MapData,
  NavigationTarget,
  Quest,
  World,
} from "../types";
export const currentMap = (world: World, state: GameState): MapData =>
  state.location === "overworld" ? world : world.interiors[state.location];
export function accessibleTarget(
  target: NavigationTarget,
  world: World,
  state: GameState,
) {
  const map = currentMap(world, state);
  if (state.location === target.mapId)
    return map.objects.find((o) => o.id === target.targetId) || null;
  if (state.location !== "overworld")
    return map.objects.find((o) => o.kind === "exit") || null;
  return world.objects.find((o) => o.id === target.mapId) || null;
}
export function questTarget(
  quest: Quest,
  state: GameState,
): NavigationTarget | null {
  if (quest.status === "ready" || quest.status === "available")
    return {
      mapId: quest.giver === "guild_board" ? "guild" : "overworld",
      targetId: quest.giver,
    };
  const step = quest.checks.findIndex((v) => !v);
  const targets: Record<string, NavigationTarget[]> = {
    settle_in: [
      { mapId: "overworld", targetId: "home" },
      { mapId: "overworld", targetId: "wood_1" },
    ],
    first_harvest: [
      { mapId: "overworld", targetId: Object.keys(state.plots)[0] || "plot_0" },
      { mapId: "workshop", targetId: "workshop_counter" },
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
