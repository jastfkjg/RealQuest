import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const base = process.env.REALQUEST_URL || "http://127.0.0.1:5173";
const browser = await chromium.launch({ headless: true });
const output = new URL("../../output/smoke/", import.meta.url);
await fs.mkdir(output, { recursive: true });
const errors = [],
  contexts = [];
let currentPage;
const state = async (p) =>
  JSON.parse(await p.evaluate(() => window.render_game_to_text()));
const snap = async (p, name) =>
  p.screenshot({
    animations: "disabled",
    path: new URL(`${name}.png`, output).pathname,
    fullPage: true,
  });
async function ready(p, check, label) {
  for (let i = 0; i < 80; i++) {
    const s = await state(p);
    if (check(s)) return s;
    await p.waitForTimeout(100);
  }
  throw new Error(`${label}: ${JSON.stringify(await state(p))}`);
}
async function newPage(options = {}) {
  const context = await browser.newContext(options),
    page = await context.newPage();
  contexts.push(context);
  currentPage = page;
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto(base);
  await page.getByRole("button", { name: "进入回响大陆" }).click();
  await page.waitForSelector("canvas");
  await page.waitForTimeout(600);
  return { page, context };
}
async function close(p) {
  await p.keyboard.press("Escape");
  await p.waitForTimeout(150);
}
async function moveTo(p, x, y) {
  await p.locator(".game-canvas").focus();
  for (const [axis, target] of [
    ["x", x],
    ["y", y],
  ]) {
    for (let i = 0; i < 160; i++) {
      const diff = target - (await state(p)).player[axis];
      if (Math.abs(diff) <= 4) break;
      const key =
        axis === "x"
          ? diff > 0
            ? "ArrowRight"
            : "ArrowLeft"
          : diff > 0
            ? "ArrowDown"
            : "ArrowUp";
      await p.keyboard.down(key);
      await p.waitForTimeout(
        Math.min(160, Math.max(18, (Math.abs(diff) / 160) * 1000 - 8)),
      );
      await p.keyboard.up(key);
      if (i === 159)
        throw new Error(
          `Blocked at ${axis}=${target}: ${JSON.stringify((await state(p)).player)}`,
        );
    }
  }
  await p.waitForTimeout(180);
}
async function clickWorld(p, id) {
  const s = await state(p),
    o = s.objects.find((o) => o.id === id),
    b = await p.locator("canvas").boundingBox();
  assert.ok(o, `Object ${id} exists in ${s.location}`);
  const x = (o.x - s.camera.viewX) * s.camera.zoom,
    y = (o.y - s.camera.viewY) * s.camera.zoom;
  assert.ok(
    x > 0 && y > 0 && x < b.width && y < b.height,
    `Object ${id} on screen (${x},${y})`,
  );
  await p.locator("canvas").click({ position: { x, y } });
}
async function interact(p) {
  await p.keyboard.press("e");
  await p.waitForTimeout(400);
}
async function exitRoom(p) {
  await moveTo(p, 240, 298);
  await interact(p);
  await ready(p, (s) => s.location === "overworld", "exit room");
  await p.waitForTimeout(350);
}
const card = (p, title) =>
  p
    .locator(".quest-entry")
    .filter({ has: p.getByRole("heading", { name: title, exact: true }) });
async function accept(p, title) {
  await card(p, title).getByRole("button", { name: "接取任务" }).click();
  await p.waitForTimeout(200);
}
async function claim(p, title) {
  await card(p, title)
    .getByRole("button", { name: "交付任务 · 领取奖励" })
    .click();
  await p.waitForTimeout(200);
}
try {
  if (process.env.REALQUEST_TEST_SCOPE !== "mobile") {
    const { page: p, context } = await newPage({
      viewport: { width: 1440, height: 960 },
    });
    assert.equal(
      (await state(p)).quests.find((q) => q.id === "settle_in").status,
      "active",
    );
    await snap(p, "desktop");
    await p.getByRole("button", { name: "指引我的下一步" }).click();
    await clickWorld(p, "home");
    await ready(p, (s) => s.location === "home", "enter home");
    await p.waitForTimeout(400);
    assert.equal(await p.locator(".navigation-hint").count(), 0);
    await snap(p, "home");
    await clickWorld(p, "home_chest");
    await ready(p, (s) => s.mode === "storage", "approach storage");
    const seedRow = p.locator(".shop-row").filter({ hasText: "种子" });
    await seedRow.getByRole("button", { name: "存入" }).click();
    await p.waitForTimeout(200);
    assert.equal((await state(p)).storage.seed, 1);
    await seedRow.getByRole("button", { name: "取回" }).click();
    await p.waitForTimeout(200);
    assert.equal((await state(p)).inventory.seed, 6);
    await close(p);
    await p.reload();
    await p.waitForSelector("canvas");
    await p.waitForTimeout(400);
    assert.equal((await state(p)).location, "home");
    await clickWorld(p, "home_bed");
    await ready(p, (s) => s.events.includes("rested_home"), "approach bed");
    await exitRoom(p);
    await moveTo(p, 328, 352);
    await interact(p);
    assert.equal((await state(p)).inventory.wood, 3);
    await clickWorld(p, "board");
    await ready(p, (s) => s.mode === "board", "board");
    await claim(p, "给新生活一个落脚点");
    assert.equal(
      (await state(p)).quests.find((q) => q.id === "settle_in").status,
      "claimed",
    );
    await accept(p, "土地的第一份回礼");
    await accept(p, "让家园焕然一新");
    await snap(p, "quest-board");
    await close(p);
    await moveTo(p, 232, 432);
    await interact(p);
    assert.ok((await state(p)).plots.plot_2);
    await p.getByRole("button", { name: "记录现实成长", exact: true }).click();
    await p.getByLabel("主题或备注").fill("浏览器验收：学习记录");
    await p.getByRole("button", { name: "保存这次成长" }).click();
    await p.waitForTimeout(250);
    assert.equal((await state(p)).attributes.wisdom, 25);
    await p.getByLabel("学习主题").fill("计时恢复测试");
    await p.getByRole("button", { name: "开始专注" }).click();
    await p.waitForTimeout(1200);
    await p.getByRole("button", { name: "暂停", exact: true }).click();
    await p.waitForTimeout(200);
    const elapsed = (await state(p)).timer.elapsed;
    assert.ok(elapsed >= 1);
    await p.reload();
    await p.waitForSelector("canvas");
    await p.waitForTimeout(350);
    assert.equal((await state(p)).timer.elapsed, elapsed);
    await p.getByRole("button", { name: "现实成长", exact: true }).click();
    await p.getByRole("button", { name: "继续", exact: true }).click();
    await p.waitForTimeout(200);
    assert.equal((await state(p)).timer.running, true);
    await p.getByRole("button", { name: "结束并记录" }).click();
    await p.waitForTimeout(200);
    await close(p);
    await moveTo(p, 400, 352);
    await moveTo(p, 580, 352);
    await moveTo(p, 580, 382);
    await interact(p);
    await accept(p, "沿着风去森林");
    await close(p);
    await moveTo(p, 592, 280);
    await interact(p);
    await accept(p, "纸页间沉睡的秘密");
    await close(p);
    await clickWorld(p, "library");
    await ready(p, (s) => s.location === "library", "library");
    await p.waitForTimeout(400);
    await snap(p, "library");
    await clickWorld(p, "library_desk");
    await ready(p, (s) => s.mode === "building", "library desk");
    await close(p);
    await exitRoom(p);
    await moveTo(p, 704, 288);
    await moveTo(p, 868, 288);
    await moveTo(p, 868, 178);
    await interact(p);
    assert.ok((await state(p)).events.includes("rune_awakened"));
    await moveTo(p, 868, 288);
    await moveTo(p, 624, 288);
    await interact(p);
    await claim(p, "纸页间沉睡的秘密");
    await close(p);
    await moveTo(p, 624, 288);
    await moveTo(p, 1088, 288);
    await moveTo(p, 1200, 288);
    await moveTo(p, 1200, 560);
    await moveTo(p, 1088, 560);
    await interact(p);
    await ready(p, (s) => s.location === "guild", "guild");
    await p.waitForTimeout(350);
    await clickWorld(p, "guild_board");
    await ready(p, (s) => s.mode === "board", "guild board");
    await accept(p, "小路之外的风景");
    await close(p);
    await snap(p, "guild");
    await exitRoom(p);
    await moveTo(p, 1200, 564);
    await moveTo(p, 1200, 352);
    await moveTo(p, 1584, 352);
    await interact(p);
    assert.ok((await state(p)).events.includes("discovered_grove"));
    assert.ok(
      (await state(p)).camera.viewX > 0,
      "Camera follows into the forest at the current integer zoom",
    );
    await snap(p, "forest");
    await p.getByRole("button", { name: "地图", exact: true }).click();
    await snap(p, "atlas");
    await p.getByRole("button", { name: /林间小屋/ }).click();
    await ready(p, (s) => s.mode === "explore", "map waypoint");
    await moveTo(p, 580, 352);
    await moveTo(p, 580, 432);
    await moveTo(p, 680, 432);
    await interact(p);
    assert.equal((await state(p)).inventory.wood, 6);
    await moveTo(p, 744, 432);
    await moveTo(p, 744, 508);
    await interact(p);
    await moveTo(p, 580, 508);
    await moveTo(p, 580, 352);
    await moveTo(p, 328, 352);
    await interact(p);
    assert.equal((await state(p)).inventory.wood, 9);
    await moveTo(p, 376, 410);
    await interact(p);
    assert.equal((await state(p)).inventory.stone, 6);
    await moveTo(p, 232, 430);
    const planted = await (
      await context.request.get(`${base}/api/state`)
    ).json();
    await p.waitForTimeout(
      Math.max(
        0,
        (planted.state.plots.plot_2.ready_at - planted.server_time) * 1000,
      ) + 300,
    );
    await interact(p);
    assert.equal((await state(p)).inventory.crop, 2);
    await moveTo(p, 352, 242);
    await interact(p);
    await ready(p, (s) => s.location === "workshop", "workshop");
    await p.waitForTimeout(350);
    await snap(p, "workshop");
    await clickWorld(p, "workshop_counter");
    await ready(p, (s) => s.mode === "building", "workshop counter");
    await p.getByRole("button", { name: "升级建筑", exact: true }).click();
    await p.waitForTimeout(200);
    assert.equal((await state(p)).buildings.workshop, 2);
    await p.getByRole("button", { name: "出售", exact: true }).click();
    await p.waitForTimeout(200);
    assert.equal((await state(p)).inventory.crop, 1);
    await p.getByRole("button", { name: "制作", exact: true }).click();
    await p.waitForTimeout(200);
    assert.equal((await state(p)).inventory.plank, 1);
    await snap(p, "economy");
    await close(p);
    await exitRoom(p);
    await moveTo(p, 256, 270);
    await interact(p);
    await claim(p, "土地的第一份回礼");
    await claim(p, "让家园焕然一新");
    await close(p);
    await p.getByRole("button", { name: "任务日志", exact: true }).click();
    await snap(p, "journal");
    await close(p);
    const saved = await state(p);
    await p.reload();
    await p.waitForSelector("canvas");
    await p.waitForTimeout(400);
    assert.equal(
      (await state(p)).quests.filter((q) => q.status === "claimed").length,
      4,
    );
    assert.deepEqual((await state(p)).inventory, saved.inventory);
    console.log(
      "PASS desktop: four interiors, quests, camera, navigation, storage, rest, timers, harvesting, economy, persistence",
    );
  }
  const { page: m } = await newPage({
    viewport: { width: 375, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });
  assert.equal((await state(m)).inventory.wood, 0);
  const start = (await state(m)).player.x;
  const b = await m.getByRole("button", { name: "向右移动" }).boundingBox();
  await m.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await m.mouse.down();
  await m.waitForTimeout(550);
  await m.mouse.up();
  await m.waitForTimeout(250);
  assert.ok((await state(m)).player.x > start + 30);
  await m.locator(".interact").click();
  await m.waitForTimeout(300);
  assert.equal((await state(m)).inventory.wood, 3);
  assert.equal(
    await m.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
  );
  await snap(m, "mobile");
  await m.getByRole("button", { name: "现实成长", exact: true }).click();
  await snap(m, "mobile-activity");
  await close(m);
  await m.setViewportSize({ width: 844, height: 390 });
  await m.waitForTimeout(350);
  assert.equal(
    await m.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
  );
  const landscapeStart = (await state(m)).player.x;
  const left = await m.getByRole("button", { name: "向左移动" }).boundingBox();
  assert.ok(left && left.y + left.height <= 390, "Landscape controls visible");
  await m.mouse.move(left.x + left.width / 2, left.y + left.height / 2);
  await m.mouse.down();
  await m.waitForTimeout(300);
  await m.mouse.up();
  await m.waitForTimeout(200);
  assert.ok(
    (await state(m)).player.x < landscapeStart - 20,
    "Landscape touch movement",
  );
  await snap(m, "mobile-landscape");
  assert.deepEqual(errors, []);
  await fs.writeFile(
    new URL("result.json", output),
    JSON.stringify(
      {
        passed: true,
        scope: process.env.REALQUEST_TEST_SCOPE || "all",
        errors,
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS mobile: touch movement, interaction, isolated guest, portrait/landscape, clean console",
  );
} catch (error) {
  if (currentPage) {
    await snap(currentPage, "failure").catch(() => {});
    await fs
      .writeFile(
        new URL("failure.json", output),
        JSON.stringify(await state(currentPage), null, 2),
      )
      .catch(() => {});
  }
  throw error;
} finally {
  for (const c of contexts) {
    await c.request.delete(`${base}/api/session`).catch(() => {});
    await c.close();
  }
  await browser.close();
}
