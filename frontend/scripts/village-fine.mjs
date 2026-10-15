import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const base = process.env.REALQUEST_URL || "http://127.0.0.1:5211";
const out = new URL("../../output/village-fine/", import.meta.url);
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const contexts = [],
  errors = [],
  captures = [];
const read = (p) => p.evaluate(() => JSON.parse(window.render_game_to_text()));
async function until(p, predicate, label) {
  for (let i = 0; i < 160; i++) {
    const s = await read(p);
    if (predicate(s)) return s;
    await p.waitForTimeout(100);
  }
  throw new Error(label + ": " + JSON.stringify(await read(p)));
}
async function shot(p, name) {
  await p.screenshot({ path: new URL(name + ".png", out).pathname });
  captures.push(name);
}
async function clickWorld(p, x, y) {
  const s = await read(p);
  await p
    .locator("canvas")
    .click({
      position: {
        x: (x - s.camera.viewX) * s.camera.zoom,
        y: (y - s.camera.viewY) * s.camera.zoom,
      },
    });
}
try {
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    reducedMotion: "reduce",
    recordVideo: {
      dir: new URL("recordings/", out).pathname,
      size: { width: 1440, height: 900 },
    },
  });
  contexts.push(context);
  const p = await context.newPage();
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  p.on("response", (r) => {
    if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
  });
  await p.goto(base);
  await p.getByLabel("你的名字").fill("林间旅人");
  await p.locator("#start-btn").click();
  await p.waitForSelector("canvas");
  await p.waitForTimeout(800);
  assert.equal((await read(p)).canvasCount, 1);
  assert.deepEqual((await read(p)).art.actorFrame, [48, 64]);
  await shot(p, "village-spawn-1920");
  // Execute the existing physical route across the bridge, then real NPC talk.
  await clickWorld(p, 480, 350);
  await until(
    p,
    (s) => !s.walking.length && Math.abs(s.player.x - 480) < 8,
    "bridge approach",
  );
  await clickWorld(p, 576, 384);
  await until(p, (s) => s.mode === "npc", "Noah talk");
  await shot(p, "noah-dialogue");
  await p.keyboard.press("Escape");
  await p.waitForTimeout(5800);
  const beside = await read(p);
  assert.ok(
    Math.hypot(beside.player.x - 576, beside.player.y - 384) >= 25,
    "NPC silhouettes stay separated",
  );
  await shot(p, "village-bridge-1920");
  const before = await read(p);
  // A real held-key burst must display multiple limb poses, then return to idle.
  await p.keyboard.down("d");
  const movingFrames = new Set();
  for (let i = 0; i < 5; i++) {
    await p.waitForTimeout(65);
    movingFrames.add((await read(p)).frame);
  }
  await shot(p, "walking-right");
  await p.keyboard.up("d");
  assert.ok(movingFrames.size > 1, "walking changes actual sprite poses");
  await p.keyboard.down("a");
  await p.waitForTimeout(330);
  await p.keyboard.up("a");
  await p.waitForTimeout(250);
  const settled = await read(p);
  for (const [w, h, name] of [
    [1440, 900, "1440"],
    [768, 1024, "768"],
    [390, 844, "390"],
    [720, 450, "720"],
  ]) {
    await p.setViewportSize({ width: w, height: h });
    await p.waitForTimeout(250);
    assert.equal(
      await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    await shot(p, "village-bridge-" + name);
    assert.equal((await read(p)).canvasCount, 1);
  }
  await p.setViewportSize({ width: 1440, height: 900 });
  await p.getByRole("button", { name: "背包", exact: true }).click();
  await p.keyboard.down("d");
  await p.waitForTimeout(200);
  await p.keyboard.up("d");
  assert.deepEqual(
    (await read(p)).player,
    settled.player,
    "panel owns movement",
  );
  await p.keyboard.press("Escape");
  await p.getByRole("button", { name: "现实成长", exact: true }).click();
  await p.keyboard.press("Escape");
  assert.equal((await read(p)).keyboardListeners, 1);
  await p.reload();
  await p.waitForSelector("canvas");
  await p.waitForTimeout(450);
  const restored = (await read(p)).player;
  assert.ok(
    Math.hypot(restored.x - settled.player.x, restored.y - settled.player.y) <=
      1.5,
    "authoritative fractional position survives reload within debug pixel rounding",
  );
  assert.equal((await read(p)).playerTexture, "villager-0");
  await shot(p, "village-reloaded");
  // Walk with keys to the canopy; the fixed interaction prompt covers this
  // ground point at some viewports, so a mouse click would be inappropriate.
  await p.keyboard.down("d");
  await until(p,s=>s.player.x>=604,"canopy east");await p.keyboard.up("d");
  await p.keyboard.down("s");
  await until(p,s=>s.player.y>=444,"canopy south");await p.keyboard.up("s");
  await p.waitForTimeout(250);
  await shot(p, "tree-occlusion");
  await clickWorld(p,608,300);await until(p,s=>!s.walking.length,"library roof approach");
  async function visit(id, x, y) {
    await clickWorld(p, x, y);
    await until(p, (s) => s.location === id, `enter ${id}`);
    await p.waitForTimeout(200);
    await shot(p, `inside-${id}`);
    await p.keyboard.press("e");
    await until(p, (s) => s.location === "overworld", `exit ${id}`);
    await p.waitForTimeout(220);
  }
  await visit("library", 704, 80);
  await clickWorld(p, 900, 350);
  await until(p, (s) => !s.walking.length, "guild approach");
  await visit("guild", 1088, 460);
  await clickWorld(p, 900, 350);
  await until(p, (s) => !s.walking.length, "return route east");
  await clickWorld(p, 640, 350);
  await until(p, (s) => !s.walking.length, "return route bridge");
  await visit("workshop", 352, 140);
  await visit("home", 160, 100);
  const touch = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    reducedMotion: "reduce",
    storageState: await context.storageState(),
  });
  contexts.push(touch);
  const t = await touch.newPage();
  t.on("pageerror", (e) => errors.push(e.message));
  await t.goto(base);
  await t.waitForSelector("canvas");
  await t.waitForTimeout(400);
  const button = await t
    .getByRole("button", { name: "向右移动", exact: true })
    .boundingBox();
  assert.ok(button);
  const previous = (await read(t)).player;
  const cdp = await touch.newCDPSession(t);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: button.x + button.width / 2, y: button.y + button.height / 2 },
    ],
  });
  await t.waitForTimeout(180);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await t.waitForTimeout(200);
  assert.ok(
    (await read(t)).player.x > previous.x + 5,
    "real emulated touch moves player",
  );
  await shot(t, "village-touch-dpr2");
  await touch.close();
  // The actual welcome control must retain all six persisted IDs and match HUD.
  for (let id = 0; id < 6; id++) {
    const c = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      reducedMotion: "reduce",
    });
    contexts.push(c);
    const q = await c.newPage();
    q.on("pageerror", (e) => errors.push(e.message));
    await q.goto(base);
    await q
      .getByRole("button", { name: `外观 ${id + 1}`, exact: true })
      .click();
    await q.getByLabel("你的名字").fill("旅人" + id);
    await q.locator("#start-btn").click();
    await q.waitForSelector("canvas");
    await q.waitForTimeout(350);
    assert.equal((await read(q)).playerTexture, `villager-${id}`);
    assert.deepEqual((await read(q)).art.actorFrame, [48, 64]);
    await shot(q, "appearance-" + id);
    await c.close();
  }
  assert.deepEqual(errors, []);
  await fs.writeFile(
    new URL("result.json", out),
    JSON.stringify(
      {
        captures,
        errors,
        checks: [
          "real bridge route and separated Noah interaction",
          "actual walking limb poses",
          "canopy occlusion capture",
          "all four building entrances/exits, including new roof bounds",
          "five viewport layouts",
          "DPR2 emulated touch movement",
          "six saved appearance IDs",
          "one canvas/listener",
          "panel input ownership",
          "mode switching",
          "save reload",
        ],
      },
      null,
      2,
    ),
  );
  console.log("PASS fine village", captures.length, "captures");
} catch (e) {
  for (const c of contexts)
    for (const p of c.pages()) await shot(p, "failure").catch(() => {});
  throw e;
} finally {
  for (const c of contexts) await c.close().catch(() => {});
  await browser.close();
}
