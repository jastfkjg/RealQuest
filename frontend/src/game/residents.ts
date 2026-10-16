import type { GameState, Resident, World, WorldObject } from "../types";

export const villageClock = (state: GameState, now: number) => {
  const clock = state.world_clock;
  const elapsed =
    (clock?.elapsed || 0) +
    (clock && now <= clock.running_until
      ? Math.max(0, now - clock.updated_at)
      : 0);
  const base = clock?.start_minute ?? 510;
  const total = base + (elapsed * 1440) / (clock?.day_seconds || 1800);
  const day =
    clock?.version === 2
      ? Math.floor((clock.elapsed || 0) / clock.day_seconds) + 1
      : Math.floor(total / 1440) + 1;
  return {
    day,
    minute:
      (clock?.version === 2
        ? Math.min(total, (day - 1) * 1440 + 1500)
        : total) % 1440,
  };
};
export const clockLabel = (minute: number) =>
  `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(Math.floor(minute % 60)).padStart(2, "0")}`;
export function residentPosition(
  resident: Resident,
  state: GameState,
  now: number,
) {
  const lease = state.npc_encounter;
  const minute = villageClock(state, now).minute;
  const phase = [...resident.schedule]
    .reverse()
    .find((s) => s.minute <= minute)!;
  const base = {
    id: resident.id,
    name: resident.name,
    kind: "npc",
    phase: phase.minute,
    activity: phase.activity,
    walking: false,
    location: phase.location,
    x: phase.x,
    y: phase.y,
  };
  if (lease?.id === resident.id && lease.until > now)
    return {
      ...base,
      location: lease.location,
      x: lease.x,
      y: lease.y,
      activity: "正在和你聊天",
    };
  let passed = ((minute - phase.minute) * 1800) / 1440;
  for (const leg of phase.legs) {
    if (passed >= leg.seconds) {
      passed -= leg.seconds;
      continue;
    }
    let distance = passed * 40;
    for (let i = 1; i < leg.points.length; i++) {
      const a = leg.points[i - 1],
        b = leg.points[i],
        length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (length && distance <= length)
        return {
          ...base,
          location: leg.location,
          x: a[0] + ((b[0] - a[0]) * distance) / length,
          y: a[1] + ((b[1] - a[1]) * distance) / length,
          activity: `前往${phase.activity}`,
          walking: true,
        };
      distance -= length;
    }
  }
  return base;
}
export const residentPositions = (
  world: World,
  state: GameState,
  now: number,
) => [
  ...(world.residents || []).map((r) => residentPosition(r, state, now)),
  ...(world.travel_npcs || []),
];
export const residentPlace = (world: World, location: string) =>
  location === "overworld"
    ? "村庄户外"
    : world.areas?.[location]?.name ||
      world.interiors[location]?.name ||
      location;
export function atlasObjects(
  world: World,
  state: GameState,
  now: number,
): WorldObject[] {
  return [
    ...world.objects.filter((o) => o.kind !== "npc"),
    ...residentPositions(world, state, now)
      .filter(
        (r) => !["crossing", "mountain", "city", "inn"].includes(r.location),
      )
      .map((r) => {
        const door =
          r.location !== "overworld" &&
          world.objects.find((o) => o.id === r.location);
        return door ? { ...r, x: door.x, y: door.y } : r;
      }),
  ];
}
