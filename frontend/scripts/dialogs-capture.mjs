import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const base = process.env.REALQUEST_URL || "http://127.0.0.1:5187";
const out = new URL("../../output/archetypes/real/", import.meta.url);
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [],
  checks = [];
const read = (p) => p.evaluate(() => JSON.parse(window.render_game_to_text()));
async function until(p, predicate) {
  for (let i = 0; i < 150; i++) {
    const s = await read(p);
    if (predicate(s)) return s;
    await p.waitForTimeout(100);
  }
  throw Error("State not reached");
}
async function go(p, x, y) {
  const s = await read(p);
  await p.locator("canvas").click({
    position: {
      x: (x - s.camera.viewX) * s.camera.zoom,
      y: (y - s.camera.viewY) * s.camera.zoom,
    },
  });
  await until(
    p,
    (s) => Math.hypot(s.player.x - x, s.player.y - y) < 18 && !s.walking.length,
  );
  await p.waitForTimeout(200);
}
async function open(p, panel) {
  await p.evaluate(async (panel) => {
    const { useGame } = await import("/src/stores/game.ts");
    const s = useGame.getState();
    const ids = {
      board: "board",
      npc: "noah",
      storage: "home_chest",
      building: "home_desk",
    };
    const objects = [
      ...s.world.objects,
      ...Object.values(s.world.interiors).flatMap((m) => m.objects),
    ];
    s.open(
      panel,
      objects.find((o) => o.id === ids[panel]),
    );
  }, panel);
  await p.locator("dialog").waitFor();
  if (
    panel === "npc" &&
    (await p.getByRole("button", { name: "显示完整对话" }).count())
  )
    await p.getByRole("button", { name: "显示完整对话" }).click();
}
try {
  const c = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
    recordVideo: {
      dir: new URL("recordings/", out).pathname,
      size: { width: 1440, height: 900 },
    },
  });
  try {
    const p = await c.newPage();
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await p.goto(base);
    await p.getByLabel("你的名字").fill("林间旅人");
    await p.click("#start-btn");
    await p.waitForSelector("canvas");
    await p.waitForTimeout(650);
    await go(p, 160, 248);
    await p.keyboard.press("e");
    await until(p, (s) => s.location === "home");
    await p.waitForTimeout(400);
    await p.keyboard.press("e");
    await until(p, (s) => s.location === "overworld");
    await p.waitForTimeout(400);
    await go(p, 328, 352);
    await p.keyboard.press("e");
    await until(p, (s) => s.inventory.wood === 3);
    await go(p, 400, 344);
    await go(p, 560, 344);
    await go(p, 576, 352);
    await p.keyboard.press("e");
    await until(p, (s) => s.mode === "npc");
    await p.keyboard.press("Escape");
    const before = await read(p);
    for (const panel of [
      "inventory",
      "board",
      "npc",
      "map",
      "storage",
      "building",
      "activity",
    ]) {
      await p.setViewportSize({ width: 1440, height: 900 });
      await p.waitForTimeout(300);
      if (panel === "board") {
        await go(p, 560, 344);
        await go(p, 400, 344);
        await go(p, 256, 300);
      }
      if (panel === "npc") {
        await go(p, 400, 344);
        await go(p, 560, 344);
        await go(p, 576, 352);
      }
      if (panel === "storage") {
        await go(p, 560, 344);
        await go(p, 400, 344);
        await go(p, 280, 344);
        await go(p, 160, 248);
        await p.keyboard.press("e");
        await until(p, (s) => s.location === "home");
        await p.waitForTimeout(400);
        await go(p, 360, 232);
      }
      if (panel === "building") {
        await go(p, 128, 208);
      }
      for (const [width, height] of [
        [1440, 900],
        [390, 844],
        [768, 1024],
        [1920, 1080],
        [720, 450],
      ]) {
        await p.setViewportSize({ width, height });
        await open(p, panel);
        await p.waitForTimeout(200);
        await p.locator("dialog").evaluate((e) => (e.scrollTop = 0));
        assert.equal(
          await p.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
          `${panel}/${width}: page overflow`,
        );
        assert.equal(
          await p
            .locator("dialog")
            .evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
          true,
          `${panel}/${width}: dialog overflow`,
        );
        const small = await p.locator("dialog button").evaluateAll((es) =>
          es
            .filter((e) => e.checkVisibility())
            .map((e) => ({
              text: e.textContent,
              w: e.getBoundingClientRect().width,
              h: e.getBoundingClientRect().height,
            }))
            .filter((e) => e.w < 43.9 || e.h < 43.9),
        );
        assert.deepEqual(small, [], `${panel}/${width}: small buttons`);
        await p.screenshot({
          path: new URL(`${panel}-${width}.png`, out).pathname,
        });
        if (width === 390) {
          await p
            .locator("dialog")
            .evaluate((e) => (e.scrollTop = e.scrollHeight));
          await p.screenshot({
            path: new URL(`${panel}-${width}-bottom.png`, out).pathname,
          });
        }
        await p.keyboard.press("Escape");
      }
      checks.push(
        `${panel}: five viewports, overflow, 44px controls, mobile scroll`,
      );
    }
    const after = await read(p);
    for (const k of ["inventory", "xp", "attributes", "events"])
      assert.deepEqual(after[k], before[k]);
    await p.setViewportSize({ width: 1440, height: 900 });
    await open(p, "board");
    await p.getByRole("button", { name: /土地的第一份回礼/ }).click();
    assert.equal(
      await p
        .getByRole("article", { name: "选中的委托" })
        .getByRole("heading", { name: "土地的第一份回礼" })
        .count(),
      1,
    );
    await p.keyboard.press("Escape");
    await open(p, "map");
    const at = (await read(p)).player;
    await p.getByRole("button", { name: /^选择回响图书馆/ }).focus();
    await p.keyboard.press("Enter");
    assert.equal((await read(p)).mode, "map");
    assert.deepEqual((await read(p)).player, at);
    await p.getByRole("button", { name: "标记方向并返回" }).click();
    await until(p, (s) => s.mode === "explore");
    assert.equal((await read(p)).navigation.targetId, "library");
    assert.deepEqual((await read(p)).player, at);
    checks.push(
      "paper expansion, spatial map keyboard marker, navigation does not teleport",
    );
    assert.deepEqual(errors, []);
  } finally {
    await c.request.delete(base + "/api/session").catch(() => {});
    await c.close();
  }
  await fs.writeFile(
    new URL("capture-results.json", out),
    JSON.stringify({ checks, errors }, null, 2),
  );
  console.log("PASS", checks);
} finally {
  await browser.close();
}
