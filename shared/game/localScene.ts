import type { MapData, WorldObject } from "./protocol";
import { pathfind, walkable } from "./navigation";
import type { Mark } from "./caveArt";
type Point = { x: number; y: number };
/** A real reachable approach, inside the existing interaction radius. */
export function approachRoute(
  map: MapData,
  from: Point,
  obj: WorldObject,
): Point[] {
  const candidates: Point[] = [];
  for (let dx = -56; dx <= 56; dx += 16)
    for (let dy = -56; dy <= 56; dy += 16) {
      const p = {
          x: Math.floor((obj.x + dx) / 16) * 16 + 8,
          y: Math.floor((obj.y + dy) / 16) * 16 + 8,
        },
        d = Math.hypot(p.x - obj.x, p.y - obj.y);
      if (d <= 60 && d >= 24 && walkable(map, p.x, p.y)) candidates.push(p);
    }
  candidates.sort(
    (a, b) =>
      Math.hypot(a.x - from.x, a.y - from.y) -
      Math.hypot(b.x - from.x, b.y - from.y),
  );
  for (const p of candidates) {
    const route = pathfind(map, from, p);
    if (route.length) return route;
  }
  return [];
}
export function localCamera(map: MapData, width: number, height: number) {
  if (map.id.startsWith("cave_") || (map.outdoor && map.id !== "overworld"))
    return width < 1000 ? 1.65 : 2.15;
  return Math.max(
    1.5,
    Math.floor(
      Math.min(
        width / (map.id === "overworld" ? 640 : 520),
        (height - (map.id === "overworld" ? 0 : 144)) /
          (map.id === "overworld" ? 400 : 368),
      ) * 2,
    ) / 2,
  );
}
export function routeMarks(route: Point[], reduced = false, time = 0): Mark[] {
  if (!route.length) return [];
  const a: Mark[] = [],
    end = route[route.length - 1],
    points = route.filter((_, i) => i % 3 === 0).slice(0, 7);
  for (const p of points)
    a.push({
      kind: "ellipse",
      x: p.x,
      y: p.y,
      w: 2.5,
      h: 2.5,
      fill: "#f4efde",
      alpha: 0.7,
    });
  a.push({
    kind: "ellipse",
    x: end.x,
    y: end.y,
    w: 14,
    h: 7,
    stroke: "#27392f",
    line: 3,
    alpha: 0.8,
  });
  a.push({
    kind: "ellipse",
    x: end.x,
    y: end.y,
    w: 14,
    h: 7,
    stroke: "#efddb0",
    line: 1.25,
    alpha: reduced ? 1 : 0.8 + 0.2 * Math.sin(time * 4),
  });
  return a;
}
export function focusMarks(
  obj: WorldObject,
  phase: "ready" | "pending" | "rejected" = "ready",
): Mark[] {
  const [x, y, w, h] =
    obj.hitbox ||
    (obj.kind === "building"
      ? [obj.x - 20, obj.y - 26, 40, 20]
      : [obj.x - 22, obj.y - 22, 44, 30]);
  const marks: Mark[] = [],
    stroke = phase === "rejected" ? "#e4a18c" : "#f4efde";
  for (const [xx, yy, dx, dy] of [
    [x - 3, y - 3, 1, 1],
    [x + w + 3, y - 3, -1, 1],
    [x - 3, y + h + 3, 1, -1],
    [x + w + 3, y + h + 3, -1, -1],
  ]) {
    const points = [
      { x: xx + dx * 6, y: yy },
      { x: xx, y: yy },
      { x: xx, y: yy + dy * 6 },
    ];
    marks.push(
      { kind: "line", points, stroke: "#27392f", line: 3.5 },
      { kind: "line", points, stroke, line: 1.5 },
    );
  }
  if (phase === "pending")
    for (let i = 0; i < 3; i++)
      marks.push({
        kind: "rect",
        x: obj.x - 6 + i * 5,
        y: y - 9,
        w: 2,
        h: 2,
        fill: stroke,
      });
  return marks;
}
/** Existing sheets: four directions × idle/A/idle/B rows. */
export function sourceActorFrame(
  direction: number,
  moving: boolean,
  seconds: number,
  reduced = false,
) {
  return (moving && !reduced ? Math.floor(seconds * 7) % 4 : 0) * 4 + direction;
}
