import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";

const base = process.env.REALQUEST_URL || "http://127.0.0.1:5404";
const out = new URL("../../output/first-expedition/", import.meta.url);
await fs.mkdir(out, { recursive: true });
const checks = [],
  shots = [],
  errors = [];
const browser = await chromium.launch({ headless: true });
const contexts = [];
let page;
const read = () =>
  page.evaluate(() => JSON.parse(window.render_game_to_text()));
const state = async () =>
  (await (await page.request.get(base + "/api/state")).json()).state;
async function until(fn, label, ms = 18000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    if (await fn()) return;
    await page.waitForTimeout(100);
  }
  const t = await read();
  throw Error(
    label +
      ": " +
      JSON.stringify({
        location: t.location,
        sceneLocation: t.sceneLocation,
        mode: t.mode,
        player: t.player,
        nearest: t.nearest,
        walking: t.walking,
        error: t.error,
      }),
  );
}
async function shot(name) {
  await page.waitForTimeout(200);
  await page.screenshot({ path: new URL(name + ".png", out).pathname });
  shots.push(name);
}
function check(name) {
  checks.push(name);
  console.log("PASS " + name);
}
async function worldClick(x, y) {
  await until(async () => {
    const t = await read();
    return t.location === t.sceneLocation;
  }, "scene transition");
  await page.waitForTimeout(120);
  const t = await read();
  await page.mouse.click(
    (x - t.camera.viewX) * t.camera.zoom,
    (y - t.camera.viewY) * t.camera.zoom,
  );
}
async function walk(x, y) {
  await until(async () => {
    const t = await read();
    return t.location === t.sceneLocation;
  }, "road scene ready");
  // These road waypoints avoid trees. Drive public keyboard input so HUD
  // surfaces and camera edges cannot turn an off-screen click into a test step.
  const start = (await read()).player;
  if (y < start.y) await axes(start.x, y);
  else await axes(x, start.y);
  await axes(x, y);
  const end = (await read()).player;
  assert(
    Math.hypot(end.x - x, end.y - y) < 22,
    "road waypoint reached " + JSON.stringify({ x, y, end }),
  );
}

async function axes(x, y) {
  for (const [axis, target, negative, positive] of [
    ["x", x, "KeyA", "KeyD"],
    ["y", y, "KeyW", "KeyS"],
  ]) {
    for (let n = 0; n < 40; n++) {
      const distance = target - (await read()).player[axis];
      if (Math.abs(distance) < 6) break;
      const key = distance < 0 ? negative : positive;
      try {
        await page.keyboard.down(key);
        await page.waitForTimeout(
          Math.min(200, Math.max(35, (Math.abs(distance) / 160) * 1000)),
        );
      } finally {
        await page.keyboard.up(key);
      }
    }
  }
  await page.waitForTimeout(200);
}
async function reload() {
  await page.reload();
  await page.locator("canvas").waitFor();
  await until(async () => (await read()).canvasCount === 1, "single canvas");
  await page.waitForTimeout(250);
}
async function layouts(prefix, buttonName) {
  for (const [width, height] of [
    [1440, 900],
    [1920, 1080],
    [844, 390],
    [720, 450],
  ]) {
    await page.setViewportSize({ width, height });
    if (buttonName)
      await page
        .getByRole("button", { name: buttonName, exact: true })
        .scrollIntoViewIfNeeded();
    const metrics = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      controls: [...document.querySelectorAll(".intro-context button")]
        .filter((e) => e.checkVisibility())
        .map((e) => ({
          text: e.textContent,
          h: e.getBoundingClientRect().height,
        })),
      close: (() => {
        const e = document.querySelector("dialog .modal-close");
        if (!e) return null;
        const r = e.getBoundingClientRect();
        return r.top >= 0 && r.bottom <= innerHeight;
      })(),
    }));
    assert(!metrics.overflow, "horizontal overflow");
    assert(
      metrics.controls.every((e) => e.h >= 43),
      "44px new actions",
    );
    assert.notEqual(metrics.close, false, "close remains visible");
    await shot(prefix + "-" + width);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
}
let held = new Set();
async function keys(next) {
  const wanted = new Set(next);
  for (const key of held) if (!wanted.has(key)) await page.keyboard.up(key);
  for (const key of wanted) if (!held.has(key)) await page.keyboard.down(key);
  held = wanted;
}
async function fightFirst() {
  const start = Date.now();
  try {
    while (Date.now() - start < 90000) {
      const t = await read();
      assert.equal(t.location, "cave_1", "initial sword survived first floor");
      if (t.combat.cleared) return;
      const enemy = t.combat.enemies.find((e) => e.hp > 0);
      if (t.combatTarget !== enemy.id) await worldClick(enemy.x, enemy.y);
      const dx = enemy.x - t.player.x,
        dy = enemy.y - t.player.y;
      const movement = [];
      if (Math.hypot(dx, dy) > 25) {
        if (Math.abs(dx) > 10) movement.push(dx > 0 ? "KeyD" : "KeyA");
        if (Math.abs(dy) > 10) movement.push(dy > 0 ? "KeyS" : "KeyW");
      }
      await keys([...movement, "Space"]);
      await page.waitForTimeout(120);
    }
    throw Error("first-floor combat timed out");
  } finally {
    await keys([]);
  }
}

try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: new URL("videos/", out).pathname },
  });
  contexts.push(context);
  page = await context.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error" && !/503/.test(m.text())) errors.push(m.text());
  });
  await page.goto(base);
  await page.getByLabel("你的名字").fill("初探流程旅人");
  await page.locator("#start-btn").click();
  await page.locator("canvas").waitFor();
  await page.waitForTimeout(600);
  // No fixture writes: starter objectives, travel, purchases and combat are real actions.
  await worldClick(160, 180);
  await until(async () => (await read()).location === "home", "enter own home");
  await page.waitForTimeout(300);
  await page.keyboard.press("KeyE");
  await until(async () => (await read()).location === "overworld", "exit home");
  await walk(240, 320);
  await axes(328, 352);
  await page.keyboard.press("KeyE");
  await until(
    async () => (await read()).inventory.wood === 3,
    "collect starter wood",
  );
  await worldClick(256, 272);
  await until(
    async () => (await read()).mode === "board",
    "open village board",
  );
  await page.getByRole("button", { name: /交付任务 · 领取奖励/ }).click();
  await page
    .getByRole("heading", { name: "先试一次身手，再慢慢准备远行" })
    .waitFor();
  assert.equal((await state()).inventory.gold, 32);
  check(
    "real starter claim reveals departure briefing without duplicate rewards",
  );
  await layouts("01-briefing", "接下远行来信，开始准备");
  const position = (await read()).player;
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(250);
  await page.keyboard.up("KeyD");
  assert.deepEqual((await read()).player, position);
  check("reading briefing owns keyboard input");
  await page
    .getByRole("button", { name: "接下远行来信，开始准备", exact: true })
    .click();
  await until(async () => (await read()).villageIntro.briefed, "brief saved");
  assert((await state()).village_intro.briefed);
  await page
    .getByRole("button", { name: "标记工坊武备台", exact: true })
    .click();
  assert.deepEqual(
    (await read()).player,
    position,
    "marking does not teleport",
  );
  await worldClick(352, 180);
  await until(
    async () => (await read()).location === "workshop",
    "enter workshop",
  );
  await axes(376, 280);
  await page.keyboard.press("KeyE");
  await until(async () => (await read()).mode === "armory", "open armory");
  await page
    .getByRole("button", { name: "购买 · 24 金币", exact: true })
    .click();
  await until(
    async () => (await read()).inventory.stone_sword === 1,
    "purchase saved",
  );
  assert.equal((await state()).inventory.gold, 8);
  await shot("02-owned-not-equipped");
  await page.getByRole("button", { name: "装备这件武器", exact: true }).click();
  await until(
    async () => (await read()).combat.equipped === "stone_sword",
    "equipment saved",
  );
  assert.equal((await state()).combat.equipped, "stone_sword");
  assert.equal((await state()).knowledge_growth.magic, 0);
  await shot("03-equipped-next-cave");
  check(
    "zero-level initial sword bought and explicitly equipped; guidance advances",
  );
  await page.keyboard.press("Escape");
  await reload();
  assert((await read()).villageIntro.briefed);
  await page.getByRole("button", { name: "展开任务追踪", exact: true }).click();
  await page.getByRole("button", { name: "暂时收起引导", exact: true }).click();
  await until(
    async () => (await read()).villageIntro.dismissed,
    "guide dismissed",
  );
  assert((await state()).village_intro.dismissed);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "主菜单", exact: true }).click();
  await page.getByRole("button", { name: /^旅人指南/ }).click();
  await page.getByRole("button", { name: "继续初探引导", exact: true }).click();
  await until(
    async () => !(await read()).villageIntro.dismissed,
    "guide resumed",
  );
  await page.keyboard.press("Escape");
  check(
    "reload, optional dismissal and explicit resumption preserve milestones",
  );
  await page.getByRole("button", { name: "收起任务追踪", exact: true }).click();
  await axes(240, 310);
  await page.keyboard.press("KeyE");
  await until(
    async () => (await read()).location === "overworld",
    "exit workshop",
  );
  await walk(304, 464);
  await walk(240, 640);
  await walk(240, 832);
  await walk(304, 1008);
  await axes(304, 1130);
  await page.keyboard.press("KeyE");
  await until(async () => (await read()).mode === "cave", "open cave entrance");
  await layouts("04-cave-preparation", "进入第1层");
  await page.getByRole("button", { name: "进入第1层", exact: true }).click();
  await until(
    async () => (await read()).location === "cave_1",
    "enter first floor",
  );
  await shot("05-first-floor-goal");
  await fightFirst();
  await shot("06-first-floor-cleared");
  let s = await state();
  assert(s.village_intro.first_clear && !s.village_intro.returned);
  assert.equal(s.inventory.gel, 3);
  assert.equal(s.inventory.gold, 14);
  check(
    "actual keyboard sword combat clears 3 enemies and awards only original loot",
  );
  await page.getByRole("button", { name: "带材料回洞口", exact: true }).click();
  await until(
    async () => (await read()).location === "overworld",
    "return to quarry entrance",
  );
  await shot("07-return-guide");
  await walk(304, 1008);
  await walk(240, 832);
  await walk(240, 640);
  await walk(304, 464);
  await walk(352, 280);
  await worldClick(352, 180);
  await until(
    async () => (await read()).location === "workshop",
    "walk back to workshop",
  );
  await axes(376, 280);
  await page.keyboard.press("KeyE");
  await until(async () => (await read()).mode === "armory", "review at armory");
  assert((await state()).village_intro.returned);
  await page.getByRole("button", { name: "初探手记", exact: true }).click();
  await layouts("08-material-review", "记下这次初探");
  const before = (await state()).inventory;
  let reject = true;
  await page.route("**/api/command", async (route) => {
    if (reject && route.request().postDataJSON().action === "intro_review") {
      reject = false;
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ detail: "测试：暂时断联，请重试" }),
      });
    } else await route.continue();
  });
  await page.getByRole("button", { name: "记下这次初探", exact: true }).click();
  await until(async () => !reject, "review rejection");
  assert(!(await state()).village_intro.reviewed);
  await shot("09-review-retry");
  await page.getByRole("button", { name: "记下这次初探", exact: true }).click();
  await until(
    async () => (await state()).village_intro.reviewed,
    "review retry succeeds",
  );
  assert.deepEqual((await state()).inventory, before);
  await page.unroute("**/api/command");
  const key = randomUUID(),
    data = { action: "intro_review", data: {}, request_id: key };
  const first = await page.request.post(base + "/api/command", { data });
  const second = await page.request.post(base + "/api/command", { data });
  assert.equal(first.status(), 200);
  assert((await second.json()).replayed);
  assert.deepEqual((await state()).inventory, before);
  await reload();
  assert((await read()).villageIntro.reviewed);
  assert.equal((await read()).canvasCount, 1);
  await shot("10-complete-restored");
  await context.storageState({ path: new URL("storage.json", out).pathname });
  check(
    "physical return, failed/retried/replayed recap and refresh never mint or consume resources",
  );
  assert.deepEqual(errors, []);
} catch (error) {
  if (page) await shot("failure").catch(() => {});
  throw error;
} finally {
  if (page) await keys([]).catch(() => {});
  await Promise.allSettled(contexts.map((context) => context.close()));
  await browser.close();
  await fs.writeFile(
    new URL("report.json", out),
    JSON.stringify({ checks, shots, errors }, null, 2),
  );
}
