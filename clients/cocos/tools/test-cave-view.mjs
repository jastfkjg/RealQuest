import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
const require = createRequire(
    new URL("../../../package.json", import.meta.url),
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

const {CombatMotion}=await import(new URL('combatMotion.js',dest));
const motion=new CombatMotion(),free={...map,obstacles:[]};
motion.reset({x:208,y:240},0);
assert(motion.step(free,{x:208,y:240},1,0,1/60,1/60).x>208,'movement starts before receipt');
motion.checkpoint(1);motion.step(free,{x:208,y:240},1,0,.05,.07);
motion.acknowledge(1,{x:212,y:240},.08);
const previous=motion.position.x;
assert(motion.step(free,{x:212,y:240},1,0,1/60,.09).x>=previous,'matching receipt does not snap backwards');
for(let t=.1;t<1;t+=.05)motion.step(free,{x:212,y:240},1,0,.05,t);
const frozen=motion.position.x;
assert.equal(motion.step(free,{x:212,y:240},1,0,.05,2).x,frozen,'stale network stops prediction');
motion.reset({x:270,y:120},3);
for(let i=0;i<10;i++)motion.step(map,{x:270,y:120},1,0,.01,3+i*.01,360);
assert(motion.position.x<288,'dash prediction cannot cross pillar');
const base={x:208,y:344},action={kind:'weapon',style:'sweep',angle:0,reach:34,started:1,until:1.38};
assert(v.weaponMarks('stone_sword',true,base,action,1.2).length>v.weaponMarks('stone_sword',true,base,null,1).length);
assert.equal(v.weaponMarks('stone_sword',false,base,action,1.2).length,0);
assert.notDeepEqual(v.weaponMarks('spring_spear',true,base,{...action,style:'thrust'},1.2),v.weaponMarks('stone_sword',true,base,action,1.2));
console.log('Combat response passes: immediate movement, acknowledged correction, weak-network bound, collision-safe prediction, owned/differentiated weapon action.');
const {CombatInputBuffer}=await import(new URL('combatMotion.js',dest));
const buffered=new CombatInputBuffer();buffered.queue('dodge');const firstPress=buffered.snapshot();
assert.deepEqual(buffered.expired(.7),[],'press is retained while previous transport request is pending');
buffered.markSent(firstPress,.7);assert.deepEqual(buffered.expired(.8),[]);
assert.deepEqual(buffered.expired(1),['dodge'],'unaccepted gameplay buffer is bounded after first send');
buffered.queue('dodge');assert(!buffered.consume('dodge',firstPress.dodge),'late receipt cannot consume a newer press');
const newer=buffered.snapshot();assert(buffered.consume('dodge',newer.dodge));buffered.queue('attack');buffered.clear();assert.deepEqual(buffered.snapshot(),{});
console.log('Input buffer retains unsent presses, bounds recovery buffering, protects newer presses from late receipts and clears on mode/blur.');
