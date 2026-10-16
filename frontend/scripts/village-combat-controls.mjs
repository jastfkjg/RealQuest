import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
const base = process.env.REALQUEST_URL || "http://127.0.0.1:5403";
const out = new URL("../../output/village-combat/", import.meta.url),
  db = process.env.REALQUEST_TEST_DB;
assert.equal(
  db,
  new URL("test.db", out).pathname,
  "Only the isolated combat database is allowed",
);
const browser = await chromium.launch({ headless: true });
const contexts = [],
  checks = [],
  errors = [],
  shots = [];
let page, context, save;
const read = () =>
  page.evaluate(() => JSON.parse(window.render_game_to_text()));
async function state() {
  return (await (await page.request.get(base + "/api/state")).json()).state;
}
async function load() {
  await page.goto(base);
  await page.locator("canvas").waitFor();
  await page.waitForTimeout(600);
}
async function wait(fn, label, ms = 15000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await fn()) return;
    await page.waitForTimeout(90);
  }
  throw Error(label);
}
async function shot(name) {
  await page.screenshot({ path: new URL(name + ".png", out).pathname });
  shots.push(name);
}
function check(name) {
  console.log("PASS " + name);
  checks.push(name);
}
async function fixture(patch, nextDay = false) {
  await page.goto("about:blank");
  execFileSync(
    new URL("../../backend/.venv/bin/python", import.meta.url).pathname,
    [
      "-c",
      `
import sqlite3,json,sys,time
p,key,patch,nextday=sys.argv[1:];assert p.endswith('/output/village-combat/test.db')
c=sqlite3.connect(p);s=json.loads(c.execute('select state from players where id=?',(key,)).fetchone()[0]);s.update(json.loads(patch));s['revision']+=1
s['world_clock'].update(updated_at=time.time(),running_until=0)
if nextday=='true':s['world_clock']['elapsed']=(int(s['world_clock']['elapsed']/1800)+1)*1800
c.execute('update players set state=? where id=?',(json.dumps(s),key));c.commit();c.close()
`,
      db,
      save,
      JSON.stringify(patch),
      String(nextDay),
    ],
  );
  await load();
}
async function enterBoss() {
  await wait(async () => (await read()).mode === "explore", "panel closed");
  await page.waitForTimeout(300);
  await page.keyboard.press("KeyE");
  await page.getByRole("button", { name: "进入第1层", exact: true }).click();
  await wait(
    async () => (await read()).sceneLocation === "cave_1",
    "cave entry",
  );
  const t = await read(),
    box = await page.locator("canvas").boundingBox();
  await page.mouse.click(
    box.x + (64 - t.camera.viewX) * t.camera.zoom,
    box.y + (216 - t.camera.viewY) * t.camera.zoom,
  );
  await page
    .getByRole("button", { name: "深层通路 · 第5层", exact: true })
    .click();
  await wait(
    async () => (await read()).sceneLocation === "cave_5",
    "deep shortcut",
  );
}
async function approachBoss() {
  for (let n = 0; n < 100; n++) {
    const t = await read();
    if (t.location !== "cave_5") return;
    const e = t.combat.enemies[0],
      p = t.player,
      dx = e.x - p.x,
      dy = e.y - p.y;
    if (Math.hypot(dx, dy) < 35) return;
    const keys = [];
    if (dx > 8) keys.push("KeyD");
    if (dx < -8) keys.push("KeyA");
    if (dy > 8) keys.push("KeyS");
    if (dy < -8) keys.push("KeyW");
    try {
      for (const k of keys) await page.keyboard.down(k);
      await page.waitForTimeout(140);
    } finally {
      for (const k of keys) await page.keyboard.up(k);
    }
  }
  throw Error("boss approach timed out");
}
async function newContext(options = {}) {
  context = await browser.newContext({
    storageState: new URL("browser-storage.json", out).pathname,
    viewport: { width: 1440, height: 900 },
    ...options,
  });
  contexts.push(context);
  page = await context.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await load();
  save = (await (await page.request.post(base + "/api/session")).json())
    .save_id;
}
try {
  await newContext();
  let s = await state();
  await fixture(
    {
      location: "overworld",
      position: { x: 304, y: 1180 },
      stamina: { ...s.stamina, current: 100, updated_at: Date.now() / 1000 },
      vitality: { current: 100, max: 100 },
    },
    true,
  );
  await page.getByRole("button", { name: "远行装备", exact: true }).click();
  await page
    .locator(".gear-rack button")
    .filter({ hasText: "石刃短剑" })
    .click();
  if (
    await page
      .getByRole("button", { name: "装备这件武器", exact: true })
      .count()
  )
    await page
      .getByRole("button", { name: "装备这件武器", exact: true })
      .click();
  await wait(
    async () => (await state()).combat.equipped === "stone_sword",
    "sword equipped",
  );
  await page.keyboard.press("Escape");
  await enterBoss();
  await approachBoss();
  const fightStart = Date.now();
  await page.keyboard.down("Space");
  await wait(async () => {
    const t = await read();
    const b = t.combat.enemies[0];
    if (b.phase === "windup") {
      await shot("boss-slam-or-sweep");
      return true;
    }
    return false;
  }, "visible boss tell");
  await wait(
    async () => (await read()).combat.enemies[0].hp <= 80,
    "boss phase2",
  );
  await page.keyboard.up("Space");
  await wait(
    async () => {
      const t = await read();
      return (
        t.combat.enemies[0].phase === "windup" &&
        t.combat.enemies[0].style === "shot"
      );
    },
    "phase2 shard tell",
    35000,
  );
  await shot("boss-phase2-tell");
  await page.keyboard.down("KeyA");
  await page.waitForTimeout(400);
  await page.keyboard.up("KeyA");
  await wait(
    async () => (await read()).combat.projectiles.length > 0,
    "shard projectiles",
  );
  await shot("boss-phase2-shards");
  await approachBoss();
  await page.keyboard.press("KeyQ");
  await page.keyboard.down("Space");
  await wait(
    async () => (await read()).combat.cleared,
    "initial sword completes boss",
    45000,
  );
  await page.keyboard.up("Space");
  await shot("boss-initial-sword-win");
  const after = await state();
  assert.equal(after.inventory.gate_stone, 0);
  assert.equal(after.inventory.gold, s.inventory.gold + 8);
  check(
    "initial sword boss win, visible phase2, later-day reward8 without a second key",
  );
  console.log("BOSS_SECONDS " + ((Date.now() - fightStart) / 1000).toFixed(1));
  await page.getByRole("button", { name: "撤至洞口", exact: true }).click();
  await wait(
    async () => (await read()).sceneLocation === "overworld",
    "retreat",
  );
  s = await state();
  await fixture(
    {
      location: "overworld",
      position: { x: 304, y: 1180 },
      vitality: { current: 5, max: 100 },
      stamina: { ...s.stamina, current: 90, updated_at: Date.now() / 1000 },
    },
    true,
  );
  await enterBoss();
  const before = await state();
  await approachBoss();
  await wait(
    async () => (await read()).sceneLocation === "overworld",
    "defeat returns safely",
    20000,
  );
  s = await state();
  assert.match((await read()).notice, /回到洞口.*生命恢复至30%/);
  assert.equal(s.vitality.current, 30);
  assert.deepEqual(s.inventory, before.inventory);
  assert.equal(s.combat.unlocked, 5);
  check(
    "actual enemy damage causes safe defeat without item loss; shortcut retained",
  );
  await shot("combat-defeat");
  await context.close();
  await newContext({
    viewport: { width: 844, height: 390 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });
  s = await state();
  await fixture({
    location: "overworld",
    position: { x: 304, y: 1180 },
    vitality: { current: 100, max: 100 },
    stamina: { ...s.stamina, current: 100, updated_at: Date.now() / 1000 },
  });
  await page.getByRole("button", { name: "远行装备", exact: true }).tap();
  await page.locator(".gear-rack button").filter({ hasText: "微光短杖" }).tap();
  await page.getByRole("button", { name: "装备这件武器", exact: true }).tap();
  await page
    .locator(".modal-body")
    .evaluate((el) => (el.scrollTop = el.scrollHeight));
  const close = await page
    .getByRole("button", { name: "关闭面板", exact: true })
    .boundingBox();
  assert(close && close.y >= 0 && close.y + close.height <= 390);
  await shot("landscape-equipment-scroll");
  await page.getByRole("button", { name: "关闭面板", exact: true }).tap();
  await page
    .getByRole("button", { name: /查看山洞|查看洞口|进入山洞|查看洞穴/ })
    .tap()
    .catch(async () => {
      await page.keyboard.press("KeyE");
    });
  await page.getByRole("button", { name: "进入第1层", exact: true }).tap();
  await wait(
    async () => (await read()).sceneLocation === "cave_1",
    "touch cave entry",
  );
  const cdp = await context.newCDPSession(page);
  async function hold(button, ms) {
    const b = await button.boundingBox();
    assert(
      b &&
        b.x >= 0 &&
        b.y >= 0 &&
        b.x + b.width <= 844 &&
        b.y + b.height <= 390,
      "touch button visible",
    );
    try {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: b.x + b.width / 2, y: b.y + b.height / 2 }],
      });
      await page.waitForTimeout(ms);
    } finally {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
    }
  }
  await hold(page.getByRole("button", { name: "向右移动", exact: true }), 1000);
  assert((await read()).player.x > 180);
  await hold(page.getByRole("button", { name: "攻击", exact: true }), 2200);
  assert((await read()).combat.enemies[0].hp < 18);
  await shot("landscape-touch-combat");
  check(
    "DPR2 landscape touch move/attack, reduced motion and scroll-safe close",
  );
  const t = await read();
  await page.getByRole("button", { name: "装备 / 暂停", exact: true }).tap();
  await page.waitForTimeout(300);
  const paused = await read();
  await page.locator(".gear-rack button").first().focus();
  await page.keyboard.down("KeyD");
  await page.keyboard.down("Space");
  await page.waitForTimeout(700);
  await page.keyboard.up("KeyD");
  await page.keyboard.up("Space");
  assert.equal((await read()).combat.time, paused.combat.time);
  await page.getByRole("button", { name: "关闭面板", exact: true }).tap();
  await page.waitForTimeout(350);
  assert(Math.abs((await read()).player.x - paused.player.x) < 1);
  check("panel owns gameplay keys and clears held inputs");
  // This automation runtime reports every tab focused, even after disabling
  // Chromium focus emulation. Exercise the application's blur/resume contract
  // explicitly; do not report this as native tab/OS focus verification.
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await wait(
    async () => (await state()).world_clock.running_until === 0,
    "blur pause acknowledged",
  );
  const frozen = await read();
  await page.waitForTimeout(1000);
  assert.equal((await read()).combat.time, frozen.combat.time);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await page.waitForTimeout(350);
  check("injected blur/resume signals freeze cave time without catch-up");
  await page.getByRole("button", { name: "撤至洞口", exact: true }).tap();
  await wait(
    async () => (await read()).sceneLocation === "overworld",
    "touch retreat",
  );
  assert.equal((await read()).canvasCount, 1);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  check("touch retreat, one canvas and no horizontal overflow");
} catch (e) {
  console.error(e);
  await shot("controls-failure").catch(() => {});
  await fs.writeFile(
    new URL("controls-failure-state.json", out),
    JSON.stringify(await read().catch(() => null), null, 2),
  );
  throw e;
} finally {
  for (const c of contexts) await c.close().catch(() => {});
  await browser.close();
  await fs.writeFile(
    new URL("controls-report.json", out),
    JSON.stringify({ checks, shots, errors }, null, 2),
  );
}
assert.equal(errors.length, 0, errors.join("\n"));
console.log("Complete controls: " + checks.length);
