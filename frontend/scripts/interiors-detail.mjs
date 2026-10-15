import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const base = process.env.REALQUEST_URL || "http://127.0.0.1:5211";
const out = new URL("../../output/hud-interiors/rooms/", import.meta.url);
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [],
  captures = [];
let context, p;
const read = () => p.evaluate(() => JSON.parse(window.render_game_to_text()));
async function until(check, label) {
  for (let i = 0; i < 160; i++) {
    const s = await read();
    if (check(s)) return s;
    await p.waitForTimeout(100);
  }
  throw Error(`${label}: ${JSON.stringify(await read())}`);
}
async function point(x, y) {
  const s = await read();
  await p.locator("canvas").click({
    position: {
      x: (x - s.camera.viewX) * s.camera.zoom,
      y: (y - s.camera.viewY) * s.camera.zoom,
    },
  });
}
async function walk(x, y) {
  await point(x, y);
  await until(
    (s) => !s.walking.length && Math.hypot(s.player.x - x, s.player.y - y) < 14,
    `walk ${x},${y}`,
  );
}
async function shot(name) {
  await p.waitForTimeout(260);
  assert.equal(
    await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
  );
  assert.equal((await read()).canvasCount, 1);
  await p.screenshot({ path: new URL(name + ".png", out).pathname });
  captures.push(name);
}
async function visit(id, x, y, station, mode) {
  await point(x, y);
  await until((s) => s.location === id, `enter ${id}`);
  await p.waitForTimeout(600);
  assert.equal(await p.locator(".interact").innerText(), "回到户外\nE");
  for (const [width, height] of [
    [1920, 1080],
    [1440, 900],
    [768, 1024],
    [390, 844],
    [720, 450],
  ]) {
    await p.setViewportSize({ width, height });
    await shot(`${id}-${width}`);
    assert.ok((await read()).camera.zoom >= 1.5, "readable room camera");
  }
  await p.setViewportSize({ width: 1440, height: 900 });
  await p.waitForTimeout(300);
  if (station) {
    await point(station[0], station[1]);
    await until((s) => s.mode === mode, `${id} station`);
    const before = await read();
    await p.keyboard.press("ArrowRight");
    assert.deepEqual(
      (await read()).player,
      before.player,
      "station owns input",
    );
    await shot(`${id}-action`);
    await p.keyboard.press("Escape");
    await until((s) => s.mode === "explore", "close station");
    // Approach above the fixed prompt, then use the advertised interaction key.
    await walk(240, 280);
  }
  await p.keyboard.press("e");
  await until((s) => s.location === "overworld", `exit ${id}`);
  await p.waitForTimeout(300);
}
try {
  context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  p = await context.newPage();
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
  await p.waitForTimeout(600);
  await walk(480, 350);
  await walk(640, 350);
  await walk(608, 300);
  await visit("library", 704, 80, [240, 208], "building");
  await walk(900, 350);
  await visit("guild", 1088, 460, [240, 170], "board");
  await walk(900, 350);
  await walk(640, 350);
  await visit("workshop", 352, 140, [240, 196], "building");
  await visit("home", 160, 100);
  await p.reload();
  await p.waitForSelector("canvas");
  await p.waitForTimeout(400);
  assert.equal((await read()).location, "overworld");
  assert.equal((await read()).keyboardListeners, 1);
  assert.deepEqual(errors, []);
  await fs.writeFile(
    new URL("result.json", out),
    JSON.stringify(
      {
        captures,
        errors,
        checks: [
          "four rooms at five viewports",
          "all physical doors",
          "guild/workshop/library actions",
          "native camera density",
          "one exit caption",
          "panel input ownership",
          "reload",
        ],
      },
      null,
      2,
    ),
  );
  console.log(
    `PASS interior detail: ${captures.length} captures; zero browser errors`,
  );
} catch (e) {
  if (p && !p.isClosed()) await shot("failure").catch(() => {});
  throw e;
} finally {
  await context?.close();
  await browser.close();
}
