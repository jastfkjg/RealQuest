import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const base = process.env.REALQUEST_URL || "http://127.0.0.1:5391";
const out = new URL("../../output/world-map/real/", import.meta.url);
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch();
const contexts = [];
const errors = [];
const read = (page) =>
  page.evaluate(() => JSON.parse(window.render_game_to_text()));
try {
  const desktop = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
    recordVideo: {
      dir: new URL("recordings/", out).pathname,
      size: { width: 1440, height: 900 },
    },
  });
  contexts.push(desktop);
  const page = await desktop.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto(base);
  const name = page.getByLabel("你的名字");
  await name.waitFor({ state: "visible" });
  await name.fill("地图测试旅人");
  const enter = page.locator("#start-btn");
  await enter.click();
  await page
    .locator("canvas")
    .waitFor({ timeout: 15000 })
    .catch(async () => {
      await page.screenshot({
        path: new URL("startup-failed.png", out).pathname,
      });
      throw new Error(
        "Game did not start: " +
          (await page.locator("body").innerText()).slice(0, 1400),
      );
    });
  const initial = await read(page);
  assert.equal(initial.location, "overworld");
  const mapButton = page.getByRole("button", { name: "地图", exact: true });
  if (await mapButton.count()) await mapButton.click();
  else await page.keyboard.press("m");
  await page.getByRole("dialog").waitFor();
  assert.equal((await read(page)).mode, "map");
  await page.screenshot({ path: new URL("map-1440.png", out).pathname });
  await page.getByRole("button", { name: /^选择微光林地/ }).click();
  assert.equal(
    await page
      .getByRole("region", { name: "所选目的地" })
      .getByRole("heading", { name: "微光林地" })
      .count(),
    1,
  );
  await page.getByRole("button", { name: "标记方向并返回" }).click();
  const marked = await read(page);
  assert.equal(marked.mode, "explore");
  assert.equal(marked.navigation.targetId, "grove");
  assert.deepEqual(marked.player, initial.player);
  assert.deepEqual(marked.inventory, initial.inventory);
  assert.equal(marked.xp, initial.xp);
  assert.equal(marked.canvasCount, 1);
  await page.screenshot({ path: new URL("direction-1440.png", out).pathname });
  const touch = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    reducedMotion: "reduce",
    storageState: await desktop.storageState(),
  });
  contexts.push(touch);
  const phone = await touch.newPage();
  phone.on("pageerror", (error) => errors.push(error.message));
  await phone.goto(base);
  await phone.locator("canvas").waitFor();
  const phoneMap = phone.getByRole("button", { name: "地图", exact: true });
  if (await phoneMap.count()) await phoneMap.click();
  else await phone.keyboard.press("m");
  await phone.getByRole("dialog").waitFor();
  await phone.screenshot({ path: new URL("map-390.png", out).pathname });
  await phone.keyboard.press("Escape");
  assert.equal((await read(phone)).mode, "explore");
  assert.deepEqual(errors, []);
  console.log(
    "PASS real game map: open/select/mark/return, position and resources unchanged, phone/Escape, no page errors",
  );
} finally {
  for (const context of contexts) await context.close();
  await browser.close();
}
