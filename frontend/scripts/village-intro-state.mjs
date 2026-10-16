import assert from "node:assert/strict";
import fs from "node:fs/promises";
import ts from "typescript";

// Execute the UI's real state policy without a DOM or fake timers.
const source = await fs.readFile(
  new URL("../src/game/villageIntro.ts", import.meta.url),
  "utf8",
);
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2022 },
}).outputText;
const { villageIntroStep: step, trackedIntroStep: tracked } = await import(
  "data:text/javascript;base64," + Buffer.from(js).toString("base64")
);
const fresh = () => ({
  village_intro: {
    version: 1,
    dismissed: false,
    briefed: false,
    first_clear: false,
    returned: false,
    reviewed: false,
  },
  combat: {
    gate_open: false,
    equipped: null,
    weapons: { stone_sword: { price: 24 }, glow_staff: { price: 120 } },
  },
  quests: { settle_in: { status: "claimed" } },
  tracked_quest: null,
  inventory: { gold: 32, gel: 0, stone_sword: 0 },
  storage: { gel: 0 },
  location: "overworld",
  vitality: { current: 100 },
  stamina: { current: 100 },
});
let s = fresh();
assert.equal(step(s).target.targetId, "board");
s.village_intro.briefed = true;
assert.equal(step(s).target.targetId, "armory_counter");
s.inventory.gold = 4;
assert.equal(step(s).target.targetId, "wood_1");
s.inventory.wood = 3;
assert.equal(step(s).target.targetId, "shop");
s.inventory.stone_sword = 1;
assert.equal(step(s).panel, "equipment");
s.combat.equipped = "stone_sword";
assert.equal(
  step(s).target.targetId,
  "cave_entry",
  "magic0 can explore; no knowledge gate",
);
s.stamina.current = 0;
assert.equal(step(s).target.targetId, "home_bed");
s.location = "cave_1";
assert.equal(
  step(s).id,
  "explore",
  "never direct a cave player into unsafe cross-scene recovery",
);
s.village_intro.first_clear = true;
s.inventory.gel = 3;
assert.equal(step(s).target.targetId, "cave_exit");
s.location = "overworld";
assert.equal(step(s).target.targetId, "armory_counter");
s.inventory.gel = 0;
s.storage.gel = 3;
assert.equal(step(s).target.targetId, "home_chest");
s.storage.gel = 0;
assert.equal(
  step(s).target.targetId,
  "cave_entry",
  "disposed loot cannot fake a workshop return",
);
s.village_intro.returned = true;
assert.equal(step(s).id, "review");
s.tracked_quest = "first_harvest";
assert.equal(tracked(s), null, "manual side-quest tracking keeps ownership");
s.tracked_quest = "leave_valley";
assert.equal(tracked(s).id, "review");
s.village_intro.dismissed = true;
assert.equal(step(s), null);
s.village_intro.dismissed = false;
assert.equal(step(s).id, "review", "resuming retains reached milestone");
s.village_intro.reviewed = true;
assert.equal(step(s), null);
s = fresh();
s.combat.gate_open = true;
assert.equal(step(s), null, "departed saves keep free play");
console.log(
  "PASS 19 state-aware onboarding decisions, including shortages, storage, recovery and optional guidance",
);
