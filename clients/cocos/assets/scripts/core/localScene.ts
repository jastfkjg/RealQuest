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

export type ViewBox = { x: number; y: number; w: number; h: number };
/** Fit world-space silhouettes into the gaps between fixed CSS-pixel controls.
 * Only the camera moves/scales; neither actors nor authoritative positions change.
 */
export function unobscuredCamera(
  actors: readonly ViewBox[],
  blockers: readonly ViewBox[],
  width: number,
  height: number,
  preferred: { x: number; y: number; zoom: number },
  worldWidth?: number,
) {
  if (!actors.length) return preferred;
  const margin = 8, clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
  const minX = Math.min(...actors.map(a => a.x)), maxX = Math.max(...actors.map(a => a.x + a.w));
  const minY = Math.min(...actors.map(a => a.y)), maxY = Math.max(...actors.map(a => a.y + a.h));
  // Search the largest readable whole-scene scale first. Rectangle edges suffice:
  // at each horizontal edge, subtract blocked vertical intervals and pick the
  // remaining point closest to the ordinary camera. No arbitrary screen grid.
  for (let step = 0; step <= 12; step++) {
    const zoom = Math.max(.65, preferred.zoom - step * .1);
    const side = worldWidth === undefined ? undefined : (width - worldWidth * zoom) / 2;
    const left = Math.max(margin - minX * zoom, side === undefined ? -Infinity : side > 0 ? side : side * 2);
    const right = Math.min(width - margin - maxX * zoom, side === undefined ? Infinity : side > 0 ? side : 0);
    const top = margin - minY * zoom, bottom = height - margin - maxY * zoom;
    if (left > right || top > bottom) continue;
    const forbidden = actors.flatMap(a => blockers.map(b => ({
      left: b.x - (a.x + a.w) * zoom - margin,
      right: b.x + b.w - a.x * zoom + margin,
      top: b.y - (a.y + a.h) * zoom - margin,
      bottom: b.y + b.h - a.y * zoom + margin,
    })));
    const desiredX = width / 2 + preferred.x * zoom / preferred.zoom, desiredY = height / 2 - preferred.y * zoom / preferred.zoom;
    const xs = Array.from(new Set([clamp(desiredX, left, right), left, right,
      ...forbidden.flatMap(b => [clamp(b.left, left, right), clamp(b.right, left, right)])]));
    let best: { x: number; y: number; score: number } | undefined;
    for (const x of xs) {
      const intervals = forbidden.filter(b => x > b.left + 1e-7 && x < b.right - 1e-7)
        .map(b => [b.top, b.bottom])
        .filter(([lo, hi]) => lo < bottom && hi > top).sort((a, b) => a[0] - b[0]);
      let start = top;
      const choose = (lo: number, hi: number) => {
        if (lo > hi + 1e-7) return;
        const y = clamp(desiredY, lo, hi), score = (x - desiredX) ** 2 + (y - desiredY) ** 2;
        if (!best || score < best.score) best = { x, y, score };
      };
      for (const [lo, hi] of intervals) { if (lo >= start) choose(start, Math.min(lo, bottom)); start = Math.max(start, hi); }
      if (start <= bottom) choose(start, bottom);
    }
    if (best) return { x: best.x - width / 2, y: height / 2 - best.y, zoom };
    if (zoom === .65) break;
  }
  return preferred;
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

/** Keep predicted movement reachable by the server's straight-line move command. */
export function pendingSafeMove(map: MapData, current: Point, proposed: Point, confirmed: Point, pending?: Point | null): Point {
  if (Math.hypot(proposed.x-current.x, proposed.y-current.y)<.000001) return current;
  const clear=(from: Point, to: Point) => {
    const distance=Math.hypot(to.x-from.x,to.y-from.y);
    if(distance>220)return false;
    const steps=Math.max(1,Math.floor(distance/4));
    for(let i=1;i<=steps;i++)if(!walkable(map,from.x+(to.x-from.x)*i/steps,from.y+(to.y-from.y)*i/steps))return false;
    return true;
  };
  const valid=(p: Point) => {
    const rounded={x:Math.round(p.x*100)/100,y:Math.round(p.y*100)/100};
    return Math.hypot(p.x-current.x,p.y-current.y)>.000001 && walkable(map,p.x,p.y) && Math.hypot(p.x-confirmed.x,p.y-confirmed.y)<=220 && (!pending||Math.hypot(p.x-pending.x,p.y-pending.y)<=220) && clear(confirmed,rounded) && (!pending||clear(pending,rounded));
  };
  // Retain wall sliding, but flush the last safe point before crossing a corner.
  return [proposed,{x:proposed.x,y:current.y},{x:current.x,y:proposed.y}].find(valid)||current;
}
