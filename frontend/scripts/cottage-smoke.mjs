import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const base = process.env.REALQUEST_URL || "http://127.0.0.1:5197";
const out = new URL("../../output/cottage-prototype/", import.meta.url);
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [],
  cases = [],
  contexts = [];
let current;
const read = (p) => p.evaluate(() => JSON.parse(window.render_game_to_text()));
async function until(p, check, label) {
  for (let i = 0; i < 120; i++) {
    const s = await read(p);
    if (check(s)) return s;
    await p.waitForTimeout(80);
  }
  throw Error(label + ": " + JSON.stringify(await read(p)));
}
async function shot(p, name) {
  assert.equal(
    await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
    name,
  );
  await p.screenshot({ path: new URL(name + ".png", out).pathname });
  cases.push(name);
}
async function point(p, x, y, touch = false) {
  const s = await read(p),
    b = await p.locator("canvas").boundingBox();
  const at = {
    x: (x - s.camera.viewX) * s.camera.zoom,
    y: (y - s.camera.viewY) * s.camera.zoom,
  };
  assert.ok(
    at.x >= 0 && at.x < b.width && at.y >= 0 && at.y < b.height,
    `visible (${x},${y}) ${JSON.stringify(at)}`,
  );
  if (touch) await p.touchscreen.tap(b.x + at.x, b.y + at.y);
  else await p.locator("canvas").click({ position: at });
}
async function object(p, id, touch = false) {
  const s = await read(p),
    o = s.objects.find((o) => o.id === id);
  assert.ok(o, id);
  const x = o.hitbox ? o.hitbox[0] + o.hitbox[2] / 2 : o.x;
  const y = o.hitbox
    ? o.hitbox[1] + o.hitbox[3] / 2
    : o.kind === "building"
      ? o.y - 42
      : o.y;
  await point(p, x, y, touch);
}
async function room(p, touch = false) {
  await object(p, "home", touch);
  await until(
    p,
    (s) =>
      s.location === "home" && s.objects.some((o) => o.id === "home_reading"),
    "enter home",
  );
  await p.waitForTimeout(400);
}
async function close(p) {
  await p.keyboard.press("Escape");
  await until(p, (s) => s.mode === "explore", "close");
  await p.waitForTimeout(200);
}
async function make(options = {}) {
  const c = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: {
      dir: new URL("recordings/", out).pathname,
      size: { width: 1440, height: 900 },
    },
    ...options,
  });
  contexts.push(c);
  const p = await c.newPage();
  current = p;
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => {
    if (m.type() === "error" && !/422/.test(m.text())) errors.push(m.text());
  });
  await p.goto(base);
  await p.getByLabel("你的名字").fill("林间旅人");
  await p.click("#start-btn");
  await p.waitForSelector("canvas");
  await p.waitForTimeout(5800);
  return { p, c };
}
try {
  const { p } = await make();
  const commands = [];
  p.on("request", (r) => {
    if (r.url().endsWith("/api/command")) commands.push(r.postDataJSON());
  });
  await shot(p, "yard-1440");
  for (const [width, height] of [
    [1920, 1080],
    [768, 1024],
    [390, 844],
    [720, 450],
  ]) {
    await p.setViewportSize({ width, height });
    await p.waitForTimeout(400);
    await shot(p, `yard-${width}`);
  }
  await p.setViewportSize({ width: 1440, height: 900 });
  await p.waitForTimeout(350);
  await room(p);
  await p.waitForTimeout(5600);
  const roomState = await read(p);
  assert.equal(roomState.canvasCount, 1);
  assert.equal(roomState.keyboardListeners, 1);
  await shot(p, "room-1440");
  await point(p, 400, 280);
  await p.waitForTimeout(70);
  await p.keyboard.press("Escape");
  const cancelled = (await read(p)).player;
  await p.waitForTimeout(160);
  assert.deepEqual((await read(p)).player, cancelled, "Escape cancels walking");
  await point(p, 240, 294);
  await until(p, (s) => s.walking.length === 0, "return to doorway");
  for (const [width, height] of [
    [1920, 1080],
    [768, 1024],
    [390, 844],
    [720, 450],
  ]) {
    await p.setViewportSize({ width, height });
    await p.waitForTimeout(400);
    await shot(p, `room-${width}`);
  }
  await p.setViewportSize({ width: 1440, height: 900 });
  await p.waitForTimeout(350);
  // The reading book is a real object with a walkable approach and the existing journal.
  const before = await read(p);
  await object(p, "home_reading");
  await until(p, (s) => s.mode === "study", "reading corner");
  assert.equal((await read(p)).inventory.gold, before.inventory.gold);
  assert.equal((await read(p)).xp, before.xp);
  assert.ok(
    commands.some((c) => c.action === "move"),
    "physical approach, not teleport",
  );
  await shot(p, "reading-journal-1440");
  const atDesk = (await read(p)).player;
  await p.getByLabel("写下你的学习主题").fill("窗边读一页植物图鉴 wasd");
  await p.keyboard.press("ArrowLeft");
  await p.keyboard.press("e");
  assert.deepEqual(
    (await read(p)).player,
    atDesk,
    "typing does not move or interact",
  );
  await p.getByLabel("写下你的学习主题").fill("窗边读一页植物图鉴");
  await p.getByRole("button", { name: "记下这项研习", exact: true }).click();
  await p.getByRole("button", { name: "开始研习", exact: true }).click();
  await until(p, (s) => s.timer?.running, "study timer");
  await p.waitForTimeout(1200);
  await p.getByRole("button", { name: "歇一会儿", exact: true }).click();
  await until(p, (s) => s.timer && !s.timer.running, "pause");
  await close(p);
  assert.equal(
    await p
      .locator(".game-canvas")
      .evaluate((el) => el === document.activeElement),
    true,
    "return focus to world",
  );
  assert.deepEqual((await read(p)).player, atDesk, "return to same place");
  await p.waitForTimeout(5600);
  await shot(p, "reading-corner-1440");
  // E reopens the journal; no extra study rewards for opening or leaving.
  await p.keyboard.press("e");
  await until(p, (s) => s.mode === "study", "keyboard reading");
  assert.equal((await read(p)).xp, 0);
  await close(p);
  await object(p, "home_desk");
  await until(p, (s) => s.mode === "building", "separate upgrade manual");
  await shot(p, "home-manual");
  await close(p);
  await object(p, "home_chest");
  await until(p, (s) => s.mode === "storage", "storage");
  await p.getByRole("button", { name: "存入 1 种子", exact: true }).click();
  await until(
    p,
    (s) => s.storage.seed === 1 && s.inventory.seed === 5,
    "store",
  );
  await p.getByRole("button", { name: "取回 1 种子", exact: true }).click();
  await until(
    p,
    (s) => s.storage.seed === 0 && s.inventory.seed === 6,
    "withdraw",
  );
  await shot(p, "storage");
  await close(p);
  await object(p, "home_bed");
  await until(p, (s) => s.events.includes("rested_home"), "rest");
  await shot(p, "rest-feedback");
  // Approach the exit and make a second trip to expose listener/remount issues.
  await object(p, "home_exit");
  await until(
    p,
    (s) => s.location === "overworld" && s.objects.some((o) => o.id === "home"),
    "exit",
  );
  await p.waitForTimeout(400);
  await room(p);
  assert.equal((await read(p)).keyboardListeners, 1);
  await object(p, "home_exit");
  await until(
    p,
    (s) =>
      s.location === "overworld" && s.objects.some((o) => o.id === "wood_1"),
    "exit again",
  );
  await p.waitForTimeout(400);
  // Rejection, pending, held key and accepted feedback use real command state.
  let rejected = false;
  await p.route("**/api/command", async (r) => {
    if (r.request().postDataJSON().action === "gather" && !rejected) {
      rejected = true;
      await r.fulfill({
        status: 422,
        contentType: "application/json",
        body: JSON.stringify({ detail: "测试：落枝暂时无法拾取" }),
      });
    } else if (r.request().postDataJSON().action === "gather") {
      await p.waitForTimeout(450);
      await r.continue();
    } else await r.continue();
  });
  await object(p, "wood_1");
  await until(p, (s) => s.error.includes("落枝"), "gather rejected");
  assert.equal((await read(p)).inventory.wood, 0);
  await shot(p, "gather-rejected");
  await p.keyboard.press("e");
  await until(
    p,
    (s) => s.objectResponse?.phase === "pending",
    "pending feedback",
  );
  await shot(p, "gather-pending");
  await p.keyboard.down("e");
  await until(p, (s) => s.inventory.wood === 3, "gather accepted");
  await p.waitForTimeout(150);
  await p.keyboard.up("e");
  await shot(p, "gather-accepted");
  assert.equal(
    commands.filter((c) => c.action === "gather").length,
    2,
    "one rejected + one accepted only",
  );
  assert.ok((await read(p)).interaction.reason.includes("恢复"));
  assert.ok(await p.locator(".interact").isDisabled());
  await p.unroute("**/api/command");
  // Life Mode stays available away from home, with the same input lifecycle.
  await p.getByRole("button", { name: "现实成长", exact: true }).click();
  await until(p, (s) => s.mode === "activity", "quick life entry");
  await close(p);
  await p.keyboard.down("d");
  await p.waitForTimeout(80);
  await p.evaluate(() => window.dispatchEvent(new Event("blur")));
  const frozen = (await read(p)).player;
  await p.waitForTimeout(150);
  assert.deepEqual((await read(p)).player, frozen);
  await p.keyboard.up("d");
  const { p: m } = await make({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });
  await shot(m, "touch-yard");
  await room(m, true);
  await m.waitForTimeout(5600);
  await shot(m, "touch-room");
  const left = await m
    .getByRole("button", { name: "向左移动", exact: true })
    .boundingBox();
  assert.ok(left && left.width >= 44 && left.height >= 44);
  await m.mouse.move(left.x + left.width / 2, left.y + left.height / 2);
  await m.mouse.down();
  await m.waitForTimeout(240);
  await m.mouse.up();
  const shifted = (await read(m)).player;
  assert.ok(shifted.x < 230, "touch movement pans room at readable scale");
  await object(m, "home_reading", true);
  await until(m, (s) => s.mode === "study", "touch reading");
  await shot(m, "touch-journal");
  await m.getByRole("button", { name: "返回世界", exact: true }).tap();
  await until(m, (s) => s.mode === "explore", "touch return");
  const target = await m.locator(".interact").boundingBox();
  assert.ok(target.width >= 44 && target.height >= 44);
  await shot(m, "touch-reading-corner");
  for (const [width, height] of [
    [375, 812],
    [844, 390],
  ]) {
    await m.setViewportSize({ width, height });
    await m.waitForTimeout(400);
    await shot(m, `touch-room-${width}`);
  }
  assert.equal((await read(m)).camera.playerPixels >= 48, true);
  assert.equal((await read(m)).keyboardListeners, 1);
  await m.locator(".game-canvas").focus();
  await m.keyboard.down("ArrowLeft");
  await m.waitForTimeout(900);
  await m.keyboard.up("ArrowLeft");
  assert.ok((await read(m)).player.x >= 57, "left wall collision");
  await m.keyboard.down("ArrowRight");
  await m.waitForTimeout(200);
  await m.keyboard.up("ArrowRight");
  assert.ok((await read(m)).player.x > 70, "can leave wall without trapping");
  await point(m, 240, 264, true);
  await until(m, s => s.walking.length === 0 && s.nearest?.id === "home_exit", "walk to doorway on touch");
  await m.locator(".interact").tap();
  await until(
    m,
    (s) => s.location === "overworld" && s.objects.some((o) => o.id === "home"),
    "landscape exit",
  );
  await m.waitForTimeout(400);
  await room(m, true);
  const entry = await read(m);
  const playerBottom =
    (entry.player.y - entry.camera.viewY) * entry.camera.zoom;
  const navTop = (await m.locator(".bottom-nav").boundingBox()).y;
  assert.ok(
    playerBottom < navTop,
    "landscape doorway keeps player above quickbar",
  );
  await shot(m, "touch-landscape-entry");
  assert.deepEqual(errors, []);
  await fs.writeFile(
    new URL("result.json", out),
    JSON.stringify(
      {
        passed: true,
        cases,
        errors,
        checks: [
          "mouse approach/door/exit",
          "study entry and timer/pause",
          "keyboard input and world focus",
          "storage conservation",
          "retained home manual",
          "rest accepted",
          "rejection/pending/held key/accepted gather",
          "quick life entry",
          "blur reset",
          "DPR2 touch/readable indoor camera",
          "single canvas/listener across remounts",
        ],
      },
      null,
      2,
    ),
  );
  console.log("PASS cottage:", cases.length, "captures; no browser errors");
} catch (e) {
  if (current && !current.isClosed()) {
    await current.screenshot({ path: new URL("failure.png", out).pathname });
    await fs.writeFile(
      new URL("failure-state.json", out),
      JSON.stringify(await read(current), null, 2),
    );
  }
  throw e;
} finally {
  for (const c of contexts) await c.close();
  await browser.close();
}
