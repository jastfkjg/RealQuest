import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

const base = process.env.REALQUEST_URL || "http://127.0.0.1:5403";
const out = new URL("../../output/village-combat/", import.meta.url);
const db = process.env.REALQUEST_TEST_DB;
assert.equal(
  db,
  new URL("test.db", out).pathname,
  "Only this task's isolated database can be seeded",
);
await fs.mkdir(out, { recursive: true });
const metrics = [];
const checks = [],
  shots = [],
  errors = [];
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: new URL("videos/", out).pathname },
});
const page = await context.newPage();
let save, world;
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
const read = () =>
  page.evaluate(() => JSON.parse(window.render_game_to_text()));
const state = async () =>
  (await (await page.request.get(base + "/api/state")).json()).state;
async function command(action, data = {}) {
  const r = await page.request.post(base + "/api/command", {
    data: { action, data, request_id: randomUUID() },
  });
  assert.equal(r.status(), 200, action + " " + (await r.text()));
  return (await r.json()).state;
}
async function until(fn, label, limit = 200) {
  for (let n = 0; n < limit; n++) {
    if (await fn()) return;
    await page.waitForTimeout(75);
  }
  throw Error(label + " " + JSON.stringify(await read()));
}
async function load() {
  await page.goto(base);
  await page.locator("canvas").waitFor();
  await page.waitForFunction(
    () =>
      window.render_game_to_text &&
      JSON.parse(window.render_game_to_text()).canvasCount === 1,
  );
  await page.waitForTimeout(350);
}
async function shot(name) {
  await page.waitForTimeout(250);
  await page.screenshot({ path: new URL(name + ".png", out).pathname });
  shots.push(name);
}
function check(name) {
  checks.push(name);
  console.log("PASS " + name);
}
async function seed(patch) {
  await page.goto("about:blank");
  execFileSync(
    new URL("../../backend/.venv/bin/python", import.meta.url).pathname,
    [
      "-c",
      `
import sqlite3,json,sys,time
p,key,patch=sys.argv[1:];assert p.endswith('/output/village-combat/test.db')
c=sqlite3.connect(p);s=json.loads(c.execute('select state from players where id=?',(key,)).fetchone()[0]);s.update(json.loads(patch));s['revision']+=1
s['world_clock'].update(updated_at=time.time(),running_until=0)
c.execute('update players set state=? where id=?',(json.dumps(s),key));c.commit();c.close()
`,
      db,
      save,
      JSON.stringify(patch),
    ],
  );
  await load();
}
async function interact() {
  await page.keyboard.press("KeyE");
  await until(
    async () => !!(await read()).mode && (await read()).mode !== "explore",
    "open interaction",
  );
}
async function moveClick(x, y) {
  const t = await read(),
    box = await page.locator("canvas").boundingBox();
  await page.mouse.click(
    box.x + (x - t.camera.viewX) * t.camera.zoom,
    box.y + (y - t.camera.viewY) * t.camera.zoom,
  );
}
async function caveObject(id) {
  let t = await read();
  const o = t.objects.find((o) => o.id === id);
  assert(o, id);
  await moveClick(o.x, o.y);
  await until(
    async () => (await read()).mode === "cave",
    "reach cave object " + id,
    500,
  );
}
let held = new Set();
async function keys(next) {
  const s = new Set(next);
  for (const k of held) if (!s.has(k)) await page.keyboard.up(k);
  for (const k of s) if (!held.has(k)) await page.keyboard.down(k);
  held = s;
}
function pass(t, x, y) {
  return (
    x >= 28 &&
    x <= 612 &&
    y >= 48 &&
    y <= 416 &&
    !t.obstacles.some(
      ([a, b, w, h]) =>
        x > a - 11 && x < a + w + 11 && y > b - 9 && y < b + h + 9,
    )
  );
}
function sight(t, a, b) {
  const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 4);
  for (let i = 1; i <= n; i++)
    if (!pass(t, a.x + ((b.x - a.x) * i) / n, a.y + ((b.y - a.y) * i) / n))
      return false;
  return true;
}
function route(t, p, e) {
  const key = (x, y) => x + "," + y,
    start = [Math.floor(p.x / 16), Math.floor(p.y / 16)],
    goal = key(Math.floor(e.x / 16), Math.floor(e.y / 16));
  const q = [start],
    parents = new Map([[key(...start), null]]);
  let found;
  for (let i = 0; i < q.length; i++) {
    const n = q[i],
      k = key(...n);
    if (k === goal) {
      found = n;
      break;
    }
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const a = [n[0] + dx, n[1] + dy],
        id = key(...a);
      if (
        !parents.has(id) &&
        a[0] * 16 + 8 >= 170 &&
        pass(t, a[0] * 16 + 8, a[1] * 16 + 8)
      ) {
        parents.set(id, n);
        q.push(a);
      }
    }
  }
  if (!found) return e;
  while (
    parents.get(key(...found)) &&
    key(...parents.get(key(...found))) !== key(...start)
  )
    found = parents.get(key(...found));
  return { x: found[0] * 16 + 8, y: found[1] * 16 + 8 };
}
async function fight(floor) {
  const start = Date.now();
  let iteration = 0;
  try {
    while (Date.now() - start < 160000) {
      const t = await read(),
        c = t.combat,
        p = t.player;
      assert.equal(
        t.location,
        "cave_" + floor,
        "not defeated / fainted during floor " + floor,
      );
      if (c.cleared) {
        check("floor " + floor + " cleared using keyboard combat");
        break;
      }
      const alive = c.enemies.filter((e) => e.hp > 0),
        e = alive.find((e) => e.id === t.combatTarget) || alive[0];
      if (!e) break;
      const d = Math.hypot(p.x - e.x, p.y - e.y),
        aim = Math.atan2(e.y - p.y, e.x - p.x);
      let vx = 0,
        vy = 0;
      if (d > 102) {
        vx = Math.cos(aim);
        vy = Math.sin(aim);
      } else if (d < 78) {
        vx = -Math.cos(aim);
        vy = -Math.sin(aim);
      }
      if (e.phase === "windup") {
        if (
          e.kind === "bat" ||
          e.style === "shot" ||
          Math.hypot(p.x - e.tx, p.y - e.ty) < (e.kind === "boss" ? 52 : 36)
        ) {
          vx = -Math.sin(aim);
          vy = Math.cos(aim);
        }
      }
      const visible = sight(t, p, e);
      if (!visible) {
        const waypoint = route(t, p, e);
        vx = waypoint.x - p.x;
        vy = waypoint.y - p.y;
        const n = Math.max(1, Math.hypot(vx, vy));
        vx /= n;
        vy /= n;
      }
      const options = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
        [0, 0],
      ];
      options.sort((a, b) => {
        const score = ([x, y]) => {
          const n = Math.max(1, Math.hypot(x, y)),
            xx = p.x + (x / n) * 20,
            yy = p.y + (y / n) * 20;
          if (!pass(t, xx, yy) || xx < 170) return -10000;
          return (
            ((x / n) * vx + (y / n) * vy) * 10 -
            Math.abs(Math.hypot(xx - e.x, yy - e.y) - 91) * 0.02
          );
        };
        return score(b) - score(a);
      });
      const [dx, dy] = options[0],
        next = [];
      if (dx > 0) next.push("KeyD");
      if (dx < 0) next.push("KeyA");
      if (dy > 0) next.push("KeyS");
      if (dy < 0) next.push("KeyW");
      if (visible && d <= 118 && p.x >= 166) next.push("Space");
      if (
        (t.vitality.current < 50 || t.stamina.current < 12) &&
        t.inventory.soup &&
        c.time >= c.soup_at &&
        !c.cast &&
        (floor !== 5 || c.soups_used < 2)
      )
        next.push("KeyR");
      await keys(next);
      if (iteration++ % 50 === 0)
        console.log(
          "FIGHT " +
            floor +
            " " +
            JSON.stringify({
              hp: t.vitality.current,
              stamina: Math.floor(t.stamina.current),
              enemy: e.name,
              enemyHp: e.hp,
              p: [Math.round(p.x), Math.round(p.y)],
            }),
        );
      await page.waitForTimeout(140);
    }
  } finally {
    await keys([]);
  }
  assert(
    (await read()).combat.cleared,
    "floor " + floor + " cleared before timeout",
  );
  const end = await read();
  metrics.push({
    floor,
    seconds: (Date.now() - start) / 1000,
    hp: end.vitality.current,
    stamina: Math.floor(end.stamina.current),
    weapon: end.combat.equipped,
  });
  await page.waitForTimeout(350);
  await shot("floor-" + floor + "-cleared");
}

try {
  await page.goto(base);
  await page.getByLabel("你的名字").fill("洞穴试玩");
  await page.locator("#start-btn").click();
  await page.locator("canvas").waitFor();
  const session = await (await page.request.post(base + "/api/session")).json();
  save = session.save_id;
  world = session.world;
  let s = await state();
  await seed({
    location: "workshop",
    position: { x: 376, y: 280 },
    inventory: { ...s.inventory, gold: 32 },
  });
  await interact();
  await shot("01-armory-start");
  let intercepted = false;
  await page.route("**/api/command", async (route) => {
    const b = route.request().postDataJSON();
    if (!intercepted && b.action === "gear_buy") {
      intercepted = true;
      await route.fetch();
      await route.abort("failed");
    } else await route.continue();
  });
  await page
    .getByRole("button", { name: "购买 · 24 金币", exact: true })
    .click();
  await until(
    async () => (await state()).inventory.stone_sword === 1,
    "buy retry",
  );
  await page.unroute("**/api/command");
  assert.equal((await state()).inventory.gold, 8);
  await page.getByRole("button", { name: "装备这件武器", exact: true }).click();
  await until(
    async () => (await state()).combat.equipped === "stone_sword",
    "equip",
  );
  check("zero-level purchase, replay safety and equip");
  await shot("02-first-sword-equipped");
  await page.getByRole("button", { name: "图纸打造", exact: true }).click();
  assert(
    await page
      .getByRole("button", { name: "确认打造 1 件", exact: true })
      .isDisabled(),
  );
  check("crafting shortages shown without spending");
  s = await state();
  await seed({
    location: "workshop",
    position: { x: 376, y: 280 },
    inventory: {
      ...s.inventory,
      gold: 200,
      plank: 20,
      stone: 20,
      gel: 10,
      shell: 10,
      crystal: 10,
    },
    knowledge_growth: { science: 1, magic: 3 },
    skill_growth: { planting: 0, ranching: 0, building: 1 },
  });
  await interact();
  await page.getByRole("button", { name: "图纸打造", exact: true }).click();
  for (const [id, name] of [
    ["reinforced_sword", "加固短剑"],
    ["spring_spear", "弹簧长矛"],
    ["glow_staff", "微光短杖"],
  ]) {
    await page.locator(".gear-rack button").filter({ hasText: name }).click();
    await page
      .getByRole("button", { name: "确认打造 1 件", exact: true })
      .click();
    await until(async () => (await state()).inventory[id] === 1, "craft " + id);
  }
  await page.getByRole("button", { name: "装备这件武器", exact: true }).click();
  for (let n = 0; n < 2; n++)
    await page
      .getByRole("button", { name: "购买 1 份菜汤", exact: true })
      .click();
  await until(async () => (await state()).inventory.soup === 2, "soups");
  await shot("03-crafted-staff");
  check("all three advanced recipes and supply purchase");
  await seed({ location: "library", position: { x: 112, y: 232 } });
  await interact();
  await page
    .getByRole("button", { name: "学习火花术 · 8金币", exact: true })
    .click();
  await until(async () => (await state()).combat.spark_learned, "learn spark");
  await shot("04-learned-spell");
  check("spell learning persists");
  await seed({ location: "overworld", position: { x: 1816, y: 372 } });
  await interact();
  assert(
    await page
      .getByRole("button", { name: "嵌入魔法石 · 永久开门", exact: true })
      .isDisabled(),
  );
  await shot("05-sealed-gate");
  check("magic3 alone cannot open gate");
  await seed({ location: "overworld", position: { x: 304, y: 1180 } });
  await interact();
  await shot("06-cave-entry");
  await page.getByRole("button", { name: "进入第1层", exact: true }).click();
  await until(
    async () => (await read()).sceneLocation === "cave_1",
    "enter floor1",
  );
  await shot("07-cave-floor1");
  await page.getByRole("button", { name: "装备 / 暂停", exact: true }).click();
  await page.waitForTimeout(300);
  let frozen = await read();
  await page.waitForTimeout(1200);
  assert.equal((await read()).combat.time, frozen.combat.time);
  assert.equal((await read()).vitality.current, frozen.vitality.current);
  await shot("08-combat-paused");
  await page.keyboard.press("Escape");
  check("menu pauses enemies, health and cooldown clock");
  const lootStart = await state();
  for (let floor = 1; floor <= 5; floor++) {
    await fight(floor);
    if (floor === 3) {
      for (let n = 0; n < 3; n++) {
        await caveObject("cave_rest");
        await page
          .getByRole("button", {
            name: "短休30分钟 · +20体力 / +10生命",
            exact: true,
          })
          .click();
        await until(
          async () => (await read()).mode === "explore",
          "rest finishes",
        );
      }
      check("safe platform restores via actual short-rest action");
    }
    if (floor < 5) {
      await caveObject("cave_down");
      await page
        .getByRole("button", { name: "前往下一层", exact: true })
        .click();
      await until(
        async () => (await read()).sceneLocation === "cave_" + (floor + 1),
        "next floor",
      );
    }
  }
  s = await state();
  assert.equal(s.inventory.gate_stone, 1);
  for (const [item, amount] of Object.entries({
    gold: 72,
    gel: 7,
    crystal: 7,
    shell: 4,
  }))
    assert.equal(
      s.inventory[item] - lootStart.inventory[item],
      amount,
      "first full cave loot " + item,
    );
  assert(s.combat.boss_first);
  check("boss first-clear stone and world-state persisted");
  await page.getByRole("button", { name: "撤至洞口", exact: true }).click();
  await until(
    async () => (await read()).sceneLocation === "overworld",
    "retreat after boss",
  );
  await seed({
    location: "overworld",
    position: { x: 1816, y: 372 },
    knowledge_growth: { science: 1, magic: 2 },
  });
  await interact();
  assert(
    await page
      .getByRole("button", { name: "嵌入魔法石 · 永久开门", exact: true })
      .isDisabled(),
  );
  await shot("09-stone-but-magic2");
  check("stone with magic2 cannot open gate");
  await seed({ knowledge_growth: { science: 1, magic: 3 } });
  await interact();
  await page
    .getByRole("button", { name: "嵌入魔法石 · 永久开门", exact: true })
    .click();
  await until(async () => (await state()).combat.gate_open, "permanent gate");
  s = await state();
  assert.equal(s.inventory.gate_stone, 0);
  await shot("10-gate-open");
  await load();
  assert((await state()).combat.gate_open);
  assert.equal((await state()).inventory.gate_stone, 0);
  await shot("11-open-gate-world");
  check("gate consumes once and remains open after reload");
  await context.storageState({
    path: new URL("browser-storage.json", out).pathname,
  });
  assert.equal((await read()).canvasCount, 1);
  check("single Phaser canvas preserved");
} catch (error) {
  await shot("failure").catch(() => {});
  console.error(error);
  throw error;
} finally {
  await keys([]).catch(() => {});
  await context.close();
  await browser.close();
  await fs.writeFile(
    new URL("report.json", out),
    JSON.stringify(
      {
        checks,
        metrics,
        shots,
        errors,
        fixture:
          "Only test.db resources/growth/proximity set for UI setup; no combat HP/drops/Boss outcome seeded. No real commission wait claimed.",
      },
      null,
      2,
    ),
  );
}
assert.equal(
  errors.filter((e) => !e.includes("net::ERR_FAILED")).length,
  0,
  errors.join("\n"),
);
console.log(`Complete: ${checks.length} checks, ${shots.length} screenshots`);
