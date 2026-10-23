import assert from "node:assert/strict";
import fs from "node:fs/promises";
import ts from "typescript";
import {build} from 'esbuild';
const bundle=await build({entryPoints:[new URL('../shared/game/nextDeparture.ts',import.meta.url).pathname],bundle:true,write:false,platform:'node',format:'esm'});
const js=bundle.outputFiles[0].text;
const {
  nextDeparture: next,
  growthStep: growth,
  trackedDeparture: tracked,
  returnNote,
  clearedDepth,
} = await import(
  "data:text/javascript;base64," + Buffer.from(js).toString("base64")
);
const now = 1800000000;
const fresh = () => ({
  village_intro: { reviewed: true, dismissed: false },
  combat: {
    gate_open: false,
    boss_first: false,
    equipped: "stone_sword",
    unlocked: 2,
    weapons: { stone_sword: {}, reinforced_sword: {} },
  },
  inventory: { gold: 32, stone_sword: 1, gel: 3 },
  knowledge_growth: { magic: 0, science: 0 },
  knowledge_points: 0,
  vitality: { current: 100 },
  stamina: { current: 100 },
  location: "workshop",
  life_journal: { remaining: 5, tasks: [] },
  tracked_quest: "leave_valley",
});
let s = fresh();
const original = structuredClone(s);
assert.equal(
  next(s, now).target.targetId,
  "noah",
  "arrange learning without blocking exploration",
);
assert.deepEqual(
  s,
  original,
  "reading recommendations cannot mutate resources or milestones",
);
s.life_journal.tasks.push({
  id: "learning",
  status: "active",
  kind: "study",
  ready_at: now + 3600,
  hours: 1,
});
assert.equal(
  next(s, now).target.targetId,
  "cave_entry",
  "pending growth leaves cave play available",
);
assert.equal(growth(s, now).panel, "activity");
s.life_journal.tasks[0].ready_at = now;
assert.equal(
  next(s, now).target.targetId,
  "noah",
  "deadline is eligible, never auto-claimed",
);
assert.equal(s.knowledge_points, 0);
s.life_journal.tasks[0].status = "claimed";
s.knowledge_points = 1;
assert.equal(
  next(s, now).magic,
  true,
  "explicit magic research entry for the actual wallet",
);
s.knowledge_points = 0;
s.knowledge_growth.magic = 1;
s.life_journal.remaining = 0;
assert.equal(
  next(s, now).topic,
  "trail",
  "exhausted quota does not block the cave",
);
assert.equal(growth(s, now).panel, "activity");
s.life_journal.tasks = [
  { status: "active", kind: "work", hours: 2, ready_at: now + 200 },
];
assert.equal(
  growth(s, now).panel,
  "activity",
  "other kinds remain intact, no automatic cancellation",
);
assert.equal(next(s, now).topic, "trail");
assert.equal(next(s, now + 200).target.targetId, "noah");
s.combat.equipped = null;
assert.equal(next(s, now).panel, "equipment");
s.inventory.stone_sword = 0;
assert.equal(next(s, now).target.targetId, "armory_counter");
s = fresh();
s.stamina.current = 0;
assert.equal(next(s, now).target.targetId, "home_bed");
s.location = "cave_2";
assert.equal(
  next(s, now).panel,
  null,
  "no unsafe cross-map instruction in a live cave",
);
s = fresh();
s.combat.unlocked = 4;
assert.equal(
  clearedDepth(s),
  3,
  "permanent routes represent completed depth, not today's monster reset",
);
s.combat.boss_first = true;
assert.equal(clearedDepth(s), 5);
assert.equal(
  next(s, now).target.targetId,
  "cave_entry",
  "missing unique stone has its existing recovery path",
);
s.inventory.gate_stone = 1;
assert.equal(
  next(s, now).topic,
  "growth",
  "stone alone cannot assert gate readiness",
);
s.knowledge_growth.magic = 3;
assert.equal(next(s, now).target.targetId, "village_departure");
s.tracked_quest = "first_harvest";
assert.equal(tracked(s, now), null, "manual side-quest owns the HUD");
assert.equal(
  returnNote(s, now, { version: 1, at: now - 600 }),
  null,
  "return slip also respects manual side quests",
);
s.tracked_quest = "leave_valley";
s.village_intro.dismissed = true;
assert.equal(tracked(s, now), null);
assert.ok(next(s, now), "manual journal access survives dismissed guidance");
assert.equal(returnNote(s, now, { version: 1, at: now - 600 }), null);
s = fresh();
assert.equal(
  returnNote(s, now, null),
  null,
  "new device has no invented absence",
);
assert.equal(returnNote(s, now, { version: 1, at: now - 299 }), null);
assert.equal(returnNote(s, now, { version: 1, at: now + 500 }), null);
assert.equal(returnNote(s, now, { version: 1, at: "invalid" }), null);
assert.ok(returnNote(s, now, { version: 1, at: now - 300 }));
s.combat.gate_open = true;
assert.equal(tracked(s, now), null);
assert.equal(returnNote(s, now, { version: 1, at: now - 600 }), null);
s.village_intro.reviewed = false;
assert.equal(
  next(s, now),
  null,
  "first-expedition recap retains ownership until actually reviewed",
);
console.log(
  "PASS preparation policies: parallel progress, resource conservation, all promise states, recovery, cave ownership, side quests, return boundaries and legacy saves",
);
