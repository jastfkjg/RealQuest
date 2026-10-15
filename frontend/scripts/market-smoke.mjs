import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";

const base = process.env.REALQUEST_URL || "http://127.0.0.1:5295";
const out = new URL("../../output/village-market/", import.meta.url);
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const contexts = [],
  errors = [],
  captures = [],
  checks = [];
let page;
const read = () =>
  page.evaluate(() => JSON.parse(window.render_game_to_text()));
const state = async () =>
  (await (await page.request.get(base + "/api/state")).json()).state;
async function command(action, data = {}) {
  const r = await page.request.post(base + "/api/command", {
    data: { action, data, request_id: randomUUID() },
  });
  assert.equal(
    r.status(),
    200,
    action + " " + JSON.stringify(data) + " " + (await r.text()),
  );
  return (await r.json()).state;
}
async function until(fn, label) {
  for (let i = 0; i < 200; i++) {
    if (await fn()) return;
    await page.waitForTimeout(100);
  }
  throw Error(label + ": " + JSON.stringify(await read()));
}
async function shot(name) {
  await page.waitForTimeout(180);
  await page.screenshot({ path: new URL(name + ".png", out).pathname });
  captures.push(name);
}
async function reload() {
  await page.goto(base);
  await page.locator("canvas").waitFor();
  await page.waitForTimeout(400);
}
async function worldClick(x, y) {
  if (x === 240 && y === 188) {
    await until(
      async () => (await read()).objects?.some((o) => o.id === "mira"),
      "shop scene ready",
    );
    await page.waitForTimeout(350);
  }
  const s = await read();
  await page.mouse.click(
    (x - s.camera.viewX) * s.camera.zoom,
    (y - s.camera.viewY) * s.camera.zoom,
  );
}
// Setup walks use only public movement commands, with A* over server geography.
// The new door, counter, UI, exits, focus and persistence are exercised in browser.
async function walk(map, tx, ty) {
  if (page.url() !== "about:blank") await page.goto("about:blank");
  const s = await state(),
    size = 16,
    cols = Math.ceil(map.width / size),
    key = (x, y) => `${x},${y}`;
  const pass = (x, y) =>
    x >= 24 &&
    x <= map.width - 24 &&
    y >= 32 &&
    y <= map.height - 24 &&
    !map.obstacles.some(
      ([a, b, w, h]) =>
        x > a - 9 && x < a + w + 9 && y > b - 7 && y < b + h + 7,
    );
  const start = [
    Math.floor(s.position.x / size),
    Math.floor(s.position.y / size),
  ];
  const target = [Math.floor(tx / size), Math.floor(ty / size)],
    open = [start],
    parent = new Map(),
    seen = new Set([key(...start)]);
  let found;
  while (open.length) {
    const a = open.shift();
    if (a[0] === target[0] && a[1] === target[1]) {
      found = a;
      break;
    }
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const b = [a[0] + dx, a[1] + dy],
        k = key(...b);
      if (!seen.has(k) && pass(b[0] * size + 8, b[1] * size + 8)) {
        seen.add(k);
        parent.set(k, a);
        open.push(b);
      }
    }
  }
  assert.ok(found, `walkable destination ${tx},${ty}`);
  await command("move", {
    x: start[0] * size + 8,
    y: start[1] * size + 8,
    location: s.location,
  });
  const path = [];
  while (parent.has(key(...found))) {
    path.unshift({ x: found[0] * size + 8, y: found[1] * size + 8 });
    found = parent.get(key(...found));
  }
  let previous = { x: start[0] * size + 8, y: start[1] * size + 8 };
  for (let i = 0; i < path.length;) {
    let j = i;
    while (
      j + 1 < path.length &&
      j - i < 10 &&
      ((path[j + 1].x === previous.x && path[j].x === previous.x) ||
        (path[j + 1].y === previous.y && path[j].y === previous.y))
    )
      j++;
    await command("move", { ...path[j], location: s.location });
    previous = path[j];
    i = j + 1;
  }
}
try {
  const c = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: new URL("videos/", out).pathname },
  });
  contexts.push(c);
  page = await c.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().includes("422"))
      errors.push(m.text());
  });
  await page.goto(base);
  await page.locator("#start-btn").click();
  await page.locator("canvas").waitFor();
  const world = (await (await page.request.post(base + "/api/session")).json())
    .world;
  for (const id of ["wood_1", "wood_2", "wood_3", "stone_1", "stone_2"]) {
    const o = world.objects.find((o) => o.id === id);
    await walk(world, o.x, o.y);
    await command("gather", { target: id });
  }
  for (const id of ["plot_0", "plot_1"]) {
    const o = world.objects.find((o) => o.id === id);
    await walk(world, o.x, o.y);
    await command("plant", { target: id });
  }
  const readyAt = (await state()).plots.plot_1.ready_at;
  await walk(world, 960, 720);
  await reload();
  await shot("road-to-shop");
  await worldClick(840, 728);
  await until(
    async () =>
      Math.hypot((await read()).player.x - 840, (await read()).player.y - 728) <
      20,
    "walk shop approach",
  );
  await shot("shop-exterior");
  await page.keyboard.press("e");
  await until(async () => (await read()).location === "shop", "shop door");
  await shot("shop-interior");
  await worldClick(240, 188);
  await page.getByRole("dialog", { name: "风铃杂货铺" }).waitFor();
  assert.equal((await read()).inputEnabled, false);
  const pos = (await read()).player;
  await page.keyboard.press("ArrowLeft");
  assert.deepEqual((await read()).player, pos);
  await page.getByRole("button", { name: "安家心愿", exact: true }).click();
  await page.getByRole("button", { name: "接受委托", exact: true }).click();
  await until(
    async () => (await state()).quests.market_neighbor?.status === "active",
    "accept story",
  );
  await page.getByRole("button", { name: "买卖物品", exact: true }).click();
  await page.getByRole("button", { name: "选择木材，每份 2 金币" }).click();
  let before = await state();
  let rejected = false;
  await page.route("**/api/command", async (route) => {
    if (
      !rejected &&
      route.request().postDataJSON()?.action === "market_trade"
    ) {
      rejected = true;
      await route.fulfill({
        status: 422,
        contentType: "application/json",
        body: JSON.stringify({ detail: "测试：柜台暂时无法结算，请重试" }),
      });
    } else await route.continue();
  });
  await page
    .getByRole("button", { name: "确认出售 1 份木材", exact: true })
    .click();
  await page.getByText("测试：柜台暂时无法结算，请重试").waitFor();
  assert.deepEqual((await state()).inventory, before.inventory);
  await shot("trade-rejected");
  await page.unroute("**/api/command");
  await page
    .getByRole("button", { name: "确认出售 1 份木材", exact: true })
    .click();
  await until(
    async () => (await state()).inventory.gold === before.inventory.gold + 2,
    "sale",
  );
  assert.equal((await state()).inventory.wood, before.inventory.wood - 1);
  await page.getByRole("button", { name: "安家心愿", exact: true }).click();
  await page.getByRole("button", { name: "交付委托，领取回礼" }).click();
  await until(
    async () => (await state()).quests.market_neighbor.status === "claimed",
    "claim story",
  );
  await page.getByRole("button", { name: "接受委托", exact: true }).click();
  await shot("home-goal");
  await page.getByRole("button", { name: "村民订单", exact: true }).click();
  before = await state();
  await page
    .getByRole("article", { name: "给货架添一层木香" })
    .getByRole("button", { name: "交付这份订单" })
    .click();
  await until(async () => (await state()).stats.deliveries === 1, "delivery");
  assert.equal((await state()).inventory.wood, before.inventory.wood - 6);
  assert.equal((await state()).inventory.gold, before.inventory.gold + 18);
  await page
    .getByRole("article", { name: "补好门前的小石路" })
    .getByRole("button", { name: "交付这份订单" })
    .click();
  await until(
    async () => (await state()).stats.deliveries === 2,
    "stone delivery",
  );
  await shot("orders-completed");
  await page.getByRole("button", { name: "买卖物品", exact: true }).click();
  await page.getByRole("button", { name: "我要买", exact: true }).click();
  await page.getByLabel("交易数量", { exact: true }).selectOption("5");
  before = await state();
  let lost = false;
  await page.route("**/api/command", async (route) => {
    if (!lost && route.request().postDataJSON()?.action === "market_trade") {
      lost = true;
      await route.fetch();
      await route.abort("failed");
    } else await route.continue();
  });
  await page
    .getByRole("button", { name: "确认买入 5 份种子", exact: true })
    .click();
  await until(
    async () => (await state()).inventory.seed === before.inventory.seed + 5,
    "lost response retry",
  );
  await page.unroute("**/api/command");
  assert.equal((await state()).inventory.gold, before.inventory.gold - 10);
  checks.push(
    "rejection, exact sale, story settlement, orders, lost-response idempotency",
  );
  await page.keyboard.press("Escape");
  await until(async () => (await read()).mode === "explore", "escape");
  await page.keyboard.down("ArrowDown");
  await page.waitForTimeout(500);
  await page.keyboard.up("ArrowDown");
  await page.keyboard.press("e");
  await until(async () => (await read()).location === "overworld", "shop exit");
  // Crops mature by real elapsed time, without changing any player/database clock.
  await walk(world, 136, 440);
  if (Date.now() / 1000 < readyAt)
    await page.waitForTimeout((readyAt - Date.now() / 1000) * 1000 + 200);
  await command("harvest", { target: "plot_0" });
  await walk(world, 184, 440);
  await command("harvest", { target: "plot_1" });
  await walk(world, 832, 728);
  await reload();
  await page.keyboard.press("e");
  await until(async () => (await read()).location === "shop", "return");
  await worldClick(240, 188);
  await page.getByRole("dialog", { name: "风铃杂货铺" }).waitFor();
  await page.getByRole("button", { name: "村民订单", exact: true }).click();
  await page
    .getByRole("article", { name: "今晚的蔬菜浓汤" })
    .getByRole("button", { name: "交付这份订单" })
    .click();
  await until(
    async () => (await state()).stats.deliveries === 3,
    "crop delivery",
  );
  assert.equal((await state()).inventory.crop, 0);
  checks.push("plant, actual 60-second growth, harvest, all three orders");
  await reload();
  await worldClick(240, 188);
  await page.getByRole("dialog", { name: "风铃杂货铺" }).waitFor();
  await page.getByRole("button", { name: "村民订单", exact: true }).click();
  assert.equal(
    await page.getByRole("button", { name: "今日已交付" }).count(),
    3,
  );
  checks.push("reload persistence");
  await walk(world.interiors.shop, 240, 328);
  await command("exit", { target: "shop_exit" });
  for (const id of ["wood_1", "wood_2", "stone_1"]) {
    const o = world.objects.find((o) => o.id === id);
    await walk(world, o.x, o.y);
    await command("gather", { target: id });
  }
  await walk(world, 160, 248);
  await command("enter", { target: "home" });
  await walk(world.interiors.home, 96, 184);
  await reload();
  await page.keyboard.press("e");
  await page.getByRole("button", { name: "开始修缮", exact: true }).click();
  await until(
    async () => (await state()).buildings.home === 2,
    "earned gold home upgrade",
  );
  await shot("earned-home-upgrade");
  await walk(world.interiors.home, 240, 328);
  await command("exit", { target: "home_exit" });
  await walk(world, 832, 728);
  await reload();
  await page.keyboard.press("e");
  await until(async () => (await read()).location === "shop", "goal return");
  await worldClick(240, 188);
  await page.getByRole("dialog", { name: "风铃杂货铺" }).waitFor();
  await page.getByRole("button", { name: "安家心愿", exact: true }).click();
  before = await state();
  await page.getByRole("button", { name: "交付委托，领取回礼" }).click();
  await until(
    async () => (await state()).quests.village_supplier.status === "claimed",
    "home goal settled",
  );
  assert.equal((await state()).inventory.gold, before.inventory.gold + 50);
  checks.push("earned income funds home level2; supplier goal claimed once");
  for (const [w, h] of [
    [1440, 900],
    [1920, 1080],
    [768, 1024],
    [390, 844],
    [720, 450],
  ]) {
    await page.setViewportSize({ width: w, height: h });
    for (const [label, name] of [
      ["买卖物品", "trade"],
      ["村民订单", "orders"],
      ["安家心愿", "goals"],
    ]) {
      await page.getByRole("button", { name: label, exact: true }).click();
      await shot(`${name}-${w}`);
      assert.ok(
        await page
          .locator("dialog")
          .evaluate((el) => el.scrollWidth <= el.clientWidth + 2),
        "dialog horizontal overflow",
      );
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("button", { name: "买卖物品", exact: true }).click();
  await page.getByRole("button", { name: "关闭面板" }).focus();
  await page.keyboard.press("Shift+Tab");
  assert.ok(
    await page
      .locator("dialog")
      .evaluate((el) => el.contains(document.activeElement)),
  );
  await page.keyboard.press("Tab");
  assert.equal(
    await page
      .getByRole("button", { name: "关闭面板" })
      .evaluate((el) => el === document.activeElement),
    true,
  );
  checks.push("focus wrap, keyboard isolation, responsive layouts");
  await page.keyboard.press("Escape");
  await page.keyboard.press("m");
  await page.getByRole("button", { name: /选择风铃杂货铺/ }).click();
  await shot("map-shop");
  const p = (await read()).player;
  await page.getByRole("button", { name: "标记方向并返回" }).click();
  assert.deepEqual((await read()).player, p);
  checks.push("map marking never teleports");
  const touch = await browser.newContext({
    storageState: await c.storageState(),
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });
  contexts.push(touch);
  page = await touch.newPage();
  await page.goto(base);
  await page.locator("canvas").waitFor();
  await page.waitForTimeout(400);
  const s = await read();
  await page.touchscreen.tap(
    (240 - s.camera.viewX) * s.camera.zoom,
    (188 - s.camera.viewY) * s.camera.zoom,
  );
  await page.getByRole("dialog", { name: "风铃杂货铺" }).waitFor();
  await page.getByRole("button", { name: "村民订单", exact: true }).tap();
  await shot("orders-touch-dpr2");
  await page.getByRole("button", { name: "买卖物品", exact: true }).tap();
  await page.getByRole("button", { name: "我要买", exact: true }).tap();
  before = await state();
  await page
    .getByRole("button", { name: "确认买入 1 份种子", exact: true })
    .tap();
  await until(
    async () => (await state()).inventory.gold === before.inventory.gold - 2,
    "touch trade",
  );
  await shot("trade-touch-dpr2");
  checks.push("DPR2 touch purchase, reduced motion");
  // One deliberately lost response produces an expected network console line.
  assert.deepEqual(
    errors.filter((e) => !e.includes("net::ERR_FAILED")),
    [],
  );
  await fs.writeFile(
    new URL("result.json", out),
    JSON.stringify({ checks, captures, errors }, null, 2),
  );
  console.log(
    JSON.stringify({ checks, captures: captures.length, errors }, null, 2),
  );
} catch (error) {
  console.error(error);
  if (page && !page.isClosed()) {
    await shot("failure");
    await fs.writeFile(
      new URL("failure-state.json", out),
      JSON.stringify(
        await page.evaluate(() =>
          window.render_game_to_text
            ? JSON.parse(window.render_game_to_text())
            : { location: location.href },
        ),
        null,
        2,
      ),
    );
  }
  throw error;
} finally {
  for (const c of contexts) await c.close();
  await browser.close();
}
