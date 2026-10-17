import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
const require = createRequire(
    new URL("../../../frontend/package.json", import.meta.url),
  ),
  ts = require("typescript");
const root = new URL("../../../", import.meta.url),
  dest = new URL("output/cave-polish/test-modules/", root);
await fs.mkdir(dest, { recursive: true });
await fs.writeFile(new URL("package.json", dest), '{"type":"module"}');
for (const file of await fs.readdir(new URL("shared/game/", root))) {
  if (!file.endsWith(".ts")) continue;
  const code = ts
    .transpileModule(
      await fs.readFile(new URL("shared/game/" + file, root), "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.ES2022,
          target: ts.ScriptTarget.ES2022,
        },
      },
    )
    .outputText.replace(/from (["'])(\.\/[^"']+)\1/g, "from $1$2.js$1");
  await fs.writeFile(new URL(file.replace(".ts", ".js"), dest), code);
}
const v = await import(new URL("caveView.js", dest)),
  a = await import(new URL("caveArt.js", dest));
const map = {
  id: "cave_1",
  width: 640,
  height: 448,
  obstacles: [[288, 80, 48, 80]],
  objects: [],
  trees: [],
};
const s = {
  location: "cave_1",
  position: { x: 208, y: 344 },
  inventory: { glow_staff: 1, soup: 1 },
  stamina: { current: 100, max: 100 },
  combat: {
    equipped: "glow_staff",
    weapons: { glow_staff: { reach: 112, stamina: 2 } },
    enemies: [
      { id: "dead", kind: "bat", hp: 0, x: 211, y: 344 },
      {
        id: "first",
        kind: "slime",
        hp: 18,
        max_hp: 18,
        x: 240,
        y: 344,
        phase: "idle",
      },
      {
        id: "far",
        kind: "beetle",
        hp: 30,
        max_hp: 30,
        x: 480,
        y: 200,
        phase: "idle",
      },
    ],
    effects: [],
    time: 4,
    spark_at: 7,
    soup_at: 0,
    cast: null,
    cleared: false,
    unlocked: 1,
  },
};
const copy = JSON.stringify(s);
assert.equal(v.liveTarget(s, "dead").id, "first");
assert.equal(v.nextTarget(s, "first"), "far");
assert.equal(v.nextTarget(s, "far"), "first");
assert.equal(v.caveStatus(s, "far", map).far, true);
assert.equal(v.caveStatus(s, "first", map).remaining, 2);
assert.equal(v.caveStatus(s, "first", map).sparkWait, 3);
assert.equal(v.confirmedFeedback(s).length, 0);
assert.equal(JSON.stringify(s), copy);
assert(v.caveSight(map, { x: 200, y: 200 }, { x: 270, y: 200 }));
assert(!v.caveSight(map, { x: 200, y: 100 }, { x: 400, y: 100 }));
s.combat.cast = { kind: "spark", started: 3, until: 5 };
assert.equal(v.caveStatus(s, "first", map).castProgress, 0.5);
s.combat.time = 8;
assert.equal(v.caveStatus(s, "first", map).castProgress, 1);
s.combat.time = 4;
s.combat.effects = [
  { x: 240, y: 344, text: "−10", kind: "hit", until: 4.5 },
  { x: 208, y: 344, text: "−5", kind: "hurt", until: 3.9 },
];
assert.equal(v.confirmedFeedback(s).length, 1);
assert(v.confirmedFeedback(s)[0].lift > 0);
assert.equal(v.confirmedFeedback(s, true)[0].lift, 0);
assert.equal(v.confirmedFeedback(s, true)[0].alpha, 1);
const original = JSON.stringify(map),
  ground = a.caveGround(map);
assert(ground.length > 500);
assert.equal(JSON.stringify(a.caveGround(map)), JSON.stringify(ground));
assert.equal(JSON.stringify(map), original);
const route = { id: "cave_rope", kind: "cave", x: 64, y: 280 };
const locked = JSON.stringify(a.caveRouteArt(route, s));
s.combat.unlocked = 4;
assert.notEqual(JSON.stringify(a.caveRouteArt(route, s)), locked);
for (const kind of ["slime", "bat", "beetle", "boss"]) {
  const e = { ...s.combat.enemies[1], kind, phase: "idle" };
  assert(a.monsterArt(e, 1).length > 8);
  assert.equal(
    JSON.stringify(a.monsterArt(e, 1, true)),
    JSON.stringify(a.monsterArt(e, 1.3, true)),
  );
}
s.combat.enemies = [];
assert.equal(v.nextTarget(s, null), null);
assert.equal(v.liveTarget(s, null), undefined);
console.log(
  "Cave presentation behavior passes: live/cyclic targeting, cover/range, server cast timing, confirmed-only feedback, reduced motion, immutable deterministic art and route availability.",
);
