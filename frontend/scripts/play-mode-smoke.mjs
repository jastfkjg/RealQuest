import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const base = process.env.REALQUEST_URL || "http://127.0.0.1:5185";
const output = new URL("../../output/ux-v0.2/", import.meta.url);
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
});
const p = await context.newPage();
const errors = [],
  commands = [];
p.on("pageerror", (e) => errors.push(e.message));
p.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
p.on("request", (r) => {
  if (r.url().endsWith("/api/command")) commands.push(r.postDataJSON());
});
const read = () => p.evaluate(() => JSON.parse(window.render_game_to_text()));
const screenshot = (name) =>
  p.screenshot({ path: new URL(`${name}.png`, output).pathname });
async function until(check, label) {
  for (let n = 0; n < 100; n++) {
    const state = await read();
    if (check(state)) return state;
    await p.waitForTimeout(100);
  }
  throw new Error(`${label}: ${JSON.stringify(await read())}`);
}
async function click(x, y) {
  const s = await read();
  await p.locator("canvas").click({
    position: {
      x: (x - s.camera.viewX) * s.camera.zoom,
      y: (y - s.camera.viewY) * s.camera.zoom,
    },
  });
}
try {
  await p.goto(base);
  await p.getByRole("button", { name: "进入回响大陆" }).click();
  await p.waitForSelector("canvas");
  await p.waitForTimeout(800);
  // A visible roof is a target; far interaction must walk to the door first.
  const start = await read();
  assert.ok(Math.hypot(start.player.x - 160, start.player.y - 232) > 65);
  await click(160, 180);
  const walking = await read();
  assert.equal(walking.location, "overworld");
  assert.equal(walking.clickTarget, "home");
  await until((s) => s.location === "home", "roof click walks to home");
  await p.waitForTimeout(400);
  assert.equal(commands.filter((c) => c.action === "enter").length, 1);
  assert.equal((await read()).keyboardListeners, 1);
  await screenshot("home-interior");
  await p.keyboard.press("e");
  await until((s) => s.location === "overworld", "exit home");
  await p.waitForTimeout(400);
  await click(328, 352);
  await until((s) => s.inventory.wood === 3, "walk and gather");
  await screenshot("gather-feedback");
  assert.ok((await read()).interaction.reason.includes("恢复"));
  assert.ok(await p.locator(".interact").isDisabled());
  await p.keyboard.down("e");
  await p.waitForTimeout(700);
  await p.keyboard.up("e");
  assert.equal(
    commands.filter((c) => c.action === "gather").length,
    1,
    "Cooldown and held E don't submit duplicate gathers",
  );
  // Opening and closing a modal cancels held input and click-to-walk intent.
  await p.keyboard.down("d");
  await p.waitForTimeout(70);
  await p.getByRole("button", { name: "背包", exact: true }).click();
  const frozen = (await read()).player;
  await p.keyboard.press("Escape");
  await p.waitForTimeout(300);
  assert.deepEqual(
    (await read()).player,
    frozen,
    "Held key doesn't leak across a panel",
  );
  await p.keyboard.up("d");
  assert.equal((await read()).keyboardListeners, 1);
  // Complete the real first quest and verify the feedback and persisted reward.
  await click(256, 272);
  await until((s) => s.mode === "board", "board interaction");
  await p.getByRole("button", { name: "交付任务 · 领取奖励" }).click();
  await until(
    (s) => s.quests.find((q) => q.id === "settle_in").status === "claimed",
    "first quest reward",
  );
  await p.keyboard.press("Escape");
  await screenshot("quest-reward-feedback");
  const reward = await read();
  assert.equal(reward.inventory.gold, 32);
  assert.equal(reward.xp, 10);
  await p.reload();
  await p.waitForSelector("canvas");
  await p.waitForTimeout(500);
  assert.equal((await read()).inventory.gold, 32);
  assert.equal((await read()).xp, 10);
  // The Life shortcut now opens read-only commission history, without rewarding a view.
  const beforeHistory = await read();
  await p.keyboard.press("l");
  await until((s) => s.mode === "activity", "Life shortcut");
  await p.getByRole("region", { name: "历史现实任务" }).waitFor();
  assert.equal(await p.locator("dialog input, dialog select").count(), 0);
  await p.keyboard.press("d");
  assert.deepEqual((await read()).player, beforeHistory.player);
  assert.equal((await read()).xp, beforeHistory.xp);
  await screenshot("life-history");
  await p.keyboard.press("Escape");
  // Blur cancels movement; verify recovery with a fresh physical keypress.
  await p.keyboard.down("d");
  await p.waitForTimeout(80);
  await p.evaluate(() => window.dispatchEvent(new Event("blur")));
  const blurPosition = (await read()).player;
  await p.waitForTimeout(180);
  assert.deepEqual((await read()).player, blurPosition);
  await p.keyboard.up("d");
  await p.keyboard.down("d");
  await p.waitForTimeout(100);
  await p.keyboard.up("d");
  assert.ok((await read()).player.x > blurPosition.x);
  assert.deepEqual(errors, []);
  const result = {
    passed: true,
    assertions: [
      "roof target approach",
      "range gating",
      "single enter after restart",
      "server-backed gather",
      "cooldown",
      "held-key reset",
      "quest reward",
      "save restore",
      "read-only commission history",
      "blur recovery",
    ],
    errors,
  };
  await fs.writeFile(
    new URL("play-mode-result.json", output),
    JSON.stringify(result, null, 2),
  );
  console.log("PASS Milestone A focused flow", result.assertions.join(", "));
} catch (error) {
  await screenshot("play-mode-failure").catch(() => {});
  throw error;
} finally {
  await context.request.delete(`${base}/api/session`).catch(() => {});
  await context.close();
  await browser.close();
}
