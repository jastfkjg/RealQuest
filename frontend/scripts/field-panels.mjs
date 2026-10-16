import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
const base = process.env.REALQUEST_URL || "http://127.0.0.1:5413";
const out = new URL("../../output/field-panels/", import.meta.url);
const db = new URL("test.db", out).pathname;
const strict = process.env.REALQUEST_REVIEW !== "1";
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
let context, page, original, save;
const errors = [],
  expectedErrors = [],
  layouts = [],
  checks = [];
const read = () =>
  page.evaluate(() => JSON.parse(window.render_game_to_text()));
const snapshot = async () =>
  (await (await page.request.get(base + "/api/state")).json()).state;
const watch = () => {
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error")
      (m.text().includes("503") ? expectedErrors : errors).push(m.text());
  });
};
async function ready() {
  await page.locator("canvas").waitFor();
  await page.waitForFunction(() => {
    if (!window.render_game_to_text) return false;
    const s = JSON.parse(window.render_game_to_text());
    return (
      s.canvasCount === 1 && s.playerTexture && s.sceneLocation === s.location
    );
  });
  await page.waitForTimeout(200);
}
async function seed(location, x, y, patch = {}) {
  await page.goto("about:blank");
  const s = structuredClone(original);
  s.world_clock.elapsed = 37.5;
  Object.assign(s, { location, position: { x, y } }, patch);
  execFileSync(
    new URL("../../backend/.venv/bin/python", import.meta.url).pathname,
    [
      "-c",
      `
import sys,json,sqlite3,time
path,key,payload=sys.argv[1:];assert path.endswith('/output/field-panels/test.db')
c=sqlite3.connect(path);old=json.loads(c.execute('select state from players where id=?',(key,)).fetchone()[0]);s=json.loads(payload);s['revision']=old['revision']+1;s['world_clock'].update(updated_at=time.time(),running_until=0)
c.execute('update players set state=? where id=?',(json.dumps(s),key));c.commit();c.close()
`,
      db,
      save,
      JSON.stringify(s),
    ],
  );
  await page.goto(base);
  await ready();
}
async function interact(mode) {
  await page.keyboard.press("e");
  await page.waitForFunction(
    (mode) => JSON.parse(window.render_game_to_text()).mode === mode,
    mode,
  );
  await page.locator("dialog[open]").waitFor();
}
async function until(fn, label) {
  for (let n = 0; n < 100; n++) {
    if (await fn()) return;
    await page.waitForTimeout(70);
  }
  throw Error(label);
}
async function shot(name, fitted = true) {
  await page.waitForTimeout(140);
  const d = page.locator("dialog[open]");
  await d.waitFor();
  const m = await d.evaluate((e) => {
    const r = e.getBoundingClientRect(),
      body = e.querySelector(".modal-body");
    const controls = [...e.querySelectorAll("button,select,summary")].filter(
      (b) => b.checkVisibility(),
    );
    const obscured = controls
      .filter((b) => {
        const r = b.getBoundingClientRect();
        if (!r.width || !r.height) return false;
        const hit = document.elementFromPoint(
          r.x + r.width / 2,
          r.y + r.height / 2,
        );
        return !hit || !(hit === b || b.contains(hit));
      })
      .map((b) => b.textContent.trim() || b.getAttribute("aria-label"));
    const overflow = [
      ...e.querySelectorAll(
        ".field-paper,.gear-detail,.gear-rack,.field-page-content,.ha-container,.travel-actions",
      ),
    ]
      .filter((n) => {
        const a = n.getBoundingClientRect(),
          b = body.getBoundingClientRect();
        return a.bottom > b.bottom + 2 || a.right > b.right + 2;
      })
      .map((n) => n.className);
    return {
      viewport: [innerWidth, innerHeight],
      rect: r.toJSON(),
      bodyScroll: body.scrollHeight > body.clientHeight + 2,
      obscured,
      overflow,
    };
  });
  layouts.push({ name, ...m });
  await page.screenshot({ path: new URL(name + ".png", out).pathname });
  console.log(
    "CAPTURE",
    name,
    JSON.stringify({
      scroll: m.bodyScroll,
      obscured: m.obscured,
      overflow: m.overflow,
    }),
  );
  assert.ok(
    m.rect.x >= 0 &&
      m.rect.y >= 0 &&
      m.rect.right <= m.viewport[0] + 1 &&
      m.rect.bottom <= m.viewport[1] + 1,
    name + " bounds",
  );
  if (strict && fitted) {
    assert.equal(m.bodyScroll, false, name + " body scroll");
    assert.deepEqual(m.obscured, [], name + " covered controls");
    assert.deepEqual(m.overflow, [], name + " content overflow");
  }
}
async function sizes(name) {
  for (const [w, h] of [
    [1440, 900],
    [1920, 1080],
    [1024, 768],
    [844, 390],
    [740, 360],
  ]) {
    await page.setViewportSize({ width: w, height: h });
    await shot(name + "-" + w);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
}
async function menu(entry) {
  await page.getByRole("button", { name: "主菜单", exact: true }).click();
  if (entry)
    await page
      .locator(".journey-menu")
      .getByRole("button", { name: entry })
      .click();
}
try {
  context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
    recordVideo: { dir: new URL("videos/", out).pathname },
  });
  page = await context.newPage();
  page.setDefaultTimeout(7000);
  watch();
  await page.goto(base);
  await page.getByLabel("你的名字").fill("工坊验收旅人");
  await page.locator("#start-btn").click();
  await ready();
  const initial = await (await page.request.get(base + "/api/state")).json();
  original = initial.state;
  save = initial.save_id;
  const settled = {
    ...original.quests,
    settle_in: { ...original.quests.settle_in, status: "claimed" },
  };
  const bag = (patch) => ({ ...original.inventory, ...patch });
  await seed("workshop", 376, 280, {
    quests: settled,
    inventory: bag({ gold: 32 }),
  });
  await interact("armory");
  await sizes("armory-buy");
  await page.getByRole("button", { name: "图纸打造", exact: true }).click();
  await shot("armory-craft-short");
  await page.setViewportSize({ width: 844, height: 390 });
  await shot("armory-craft-short-844");
  await page.getByRole("button", { name: "初探手记", exact: true }).click();
  await shot("armory-notes-844");
  await page.setViewportSize({ width: 1440, height: 900 });
  await shot("armory-notes");
  await page.getByRole("button", { name: "选购", exact: true }).click();
  const before = await snapshot();
  let rejected = false,
    calls = 0;
  await page.route("**/api/command", async (r) => {
    if (r.request().postDataJSON().action === "gear_buy") {
      calls++;
      if (!rejected) {
        rejected = true;
        return r.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ detail: "测试：未完成记账，请重试" }),
        });
      }
      await new Promise((resolve) => setTimeout(resolve, 900));
    }
    await r.continue();
  });
  const buyAction = page.getByRole("button", {
    name: "购买 · 24 金币",
    exact: true,
  });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await buyAction.hover();
  await shot("armory-hover");
  await page.getByRole("button", { name: "关闭面板", exact: true }).focus();
  for (
    let n = 0;
    n < 16 && !(await buyAction.evaluate((b) => b === document.activeElement));
    n++
  )
    await page.keyboard.press("Tab");
  assert.ok(
    await buyAction.evaluate(
      (b) => b === document.activeElement && b.matches(":focus-visible"),
    ),
  );
  await shot("armory-focus");
  const frozen = (await read()).player;
  await page.keyboard.press("ArrowUp");
  assert.deepEqual((await read()).player, frozen);
  const box = await buyAction.boundingBox();
  assert.ok(box.height >= 44);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await shot("armory-pressed");
  await page.mouse.up();
  await page.emulateMedia({ reducedMotion: "reduce" });
  checks.push(
    "Normal-motion hover, keyboard focus, physical press and dialog input ownership.",
  );
  await page.getByRole("alert").waitFor();
  await shot("armory-rejected");
  await page.setViewportSize({ width: 740, height: 360 });
  await shot("armory-rejected-740");
  await page.setViewportSize({ width: 1440, height: 900 });
  assert.deepEqual((await snapshot()).inventory, before.inventory);
  await page
    .getByRole("button", { name: "购买 · 24 金币", exact: true })
    .click();
  await page.getByRole("button", { name: "正在保存…", exact: true }).waitFor();
  await shot("armory-pending");
  await until(
    async () => (await snapshot()).inventory.stone_sword === 1,
    "buy sword",
  );
  assert.equal((await snapshot()).inventory.gold, 8);
  assert.equal(calls, 2);
  await page.unroute("**/api/command");
  await page.getByRole("button", { name: "装备这件武器", exact: true }).click();
  await until(
    async () => (await snapshot()).combat.equipped === "stone_sword",
    "equip",
  );
  await page
    .getByRole("button", { name: "购买 1 份菜汤", exact: true })
    .click();
  await until(async () => (await snapshot()).inventory.soup === 1, "soup");
  assert.equal((await snapshot()).inventory.gold, 0);
  await shot("armory-owned");
  await page.reload();
  await ready();
  assert.equal((await snapshot()).combat.equipped, "stone_sword");
  checks.push(
    "Armory selection, handbook, actual failed/retried purchase, soup, equip and reload conserve resources.",
  );
  const rich = bag({
    gold: 300,
    plank: 10,
    stone: 20,
    crystal: 5,
    gel: 5,
    shell: 5,
  });
  await seed("workshop", 376, 280, {
    inventory: rich,
    skill_growth: { ...original.skill_growth, building: 1 },
    knowledge_growth: { science: 1, magic: 2 },
  });
  await interact("armory");
  await page
    .locator(".gear-rack")
    .getByRole("button", { name: /微光短杖/ })
    .click();
  await page.getByRole("button", { name: "图纸打造", exact: true }).click();
  await shot("armory-craft-ready");
  await page.setViewportSize({ width: 844, height: 390 });
  await shot("armory-craft-ready-844");
  const craftBefore = await snapshot(),
    cost = craftBefore.combat.weapons.glow_staff.costs;
  await page
    .getByRole("button", { name: "确认打造 1 件", exact: true })
    .click();
  await until(
    async () => (await snapshot()).inventory.glow_staff === 1,
    "craft staff",
  );
  const craftAfter = await snapshot();
  for (const [id, n] of Object.entries(cost))
    assert.equal(craftAfter.inventory[id], craftBefore.inventory[id] - n);
  checks.push(
    "Craft page shows actual gates; ready crafting consumes exact listed materials once.",
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await seed("library", 112, 260);
  await interact("spellbook");
  await sizes("spell-locked");
  await seed("library", 112, 260, {
    knowledge_growth: { science: 0, magic: 1 },
    inventory: bag({ gold: 32 }),
  });
  await interact("spellbook");
  await shot("spell-ready");
  await page
    .getByRole("button", { name: "学习火花术 · 8金币", exact: true })
    .click();
  await until(async () => (await snapshot()).combat.spark_learned, "learn");
  assert.equal((await snapshot()).inventory.gold, 24);
  await shot("spell-learned");
  checks.push(
    "Spell locked, ready and learned states preserve level/price and server-owned learning.",
  );
  await seed("overworld", 304, 1120, { quests: settled });
  await interact("cave");
  await sizes("cave-entry");
  if (
    await page.getByRole("button", { name: "行前手记", exact: true }).count()
  ) {
    await page.getByRole("button", { name: "行前手记", exact: true }).click();
    await shot("cave-notes");
    await page.setViewportSize({ width: 844, height: 390 });
    await shot("cave-notes-844");
    await page.getByRole("button", { name: "路线与准备", exact: true }).click();
  }
  await page.getByRole("button", { name: "进入第1层", exact: true }).click();
  await until(async () => (await read()).location === "cave_1", "enter cave");
  assert.equal((await read()).mode, "explore");
  await page.keyboard.press("e");
  await page.locator("dialog[open]").waitFor();
  await shot("cave-return-844");
  await page.getByRole("button", { name: "返回洞口", exact: true }).click();
  await until(
    async () => (await read()).location === "overworld",
    "leave cave",
  );
  checks.push(
    "Cave routes/handbook remain readable and actual first-floor entry/retreat work.",
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await seed("overworld", 1816, 384, { quests: settled });
  await interact("gate");
  await sizes("gate-locked");
  if (
    await page.getByRole("button", { name: "行前手记", exact: true }).count()
  ) {
    await page.getByRole("button", { name: "行前手记", exact: true }).click();
    await shot("gate-notes");
    await page.setViewportSize({ width: 844, height: 390 });
    await shot("gate-notes-844");
    await page.getByRole("button", { name: "下一页", exact: true }).click();
    await shot("gate-notes-2-844");
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await seed("overworld", 1816, 384, {
    quests: settled,
    inventory: bag({ gate_stone: 1 }),
    knowledge_growth: { science: 0, magic: 3 },
    village_combat: { ...original.village_combat, boss_first: true },
  });
  await interact("gate");
  await shot("gate-ready");
  await page
    .getByRole("button", { name: "嵌入魔法石 · 永久开门", exact: true })
    .click();
  await until(async () => (await read()).mode === "travel", "gate travel");
  assert.equal((await snapshot()).combat.gate_open, true);
  assert.equal((await snapshot()).inventory.gate_stone, 0);
  await shot("gate-open-travel");
  checks.push(
    "Gate requirement pages and actual permanent opening consume one stone and lead to travel.",
  );
  await seed("home", 360, 230, { inventory: bag({ seed: 6, wood: 3 }) });
  await interact("storage");
  await sizes("storage");
  const stored = await snapshot();
  await page.getByRole("button", { name: "存入 1 种子", exact: true }).click();
  await until(
    async () => (await snapshot()).storage.seed === stored.storage.seed + 1,
    "store",
  );
  await page.getByRole("button", { name: "取回 1 种子", exact: true }).click();
  await until(
    async () => (await snapshot()).storage.seed === stored.storage.seed,
    "withdraw",
  );
  assert.equal((await snapshot()).inventory.seed, stored.inventory.seed);
  let p = 1;
  while (
    await page.getByRole("button", { name: "下一页", exact: true }).isEnabled()
  ) {
    await page.getByRole("button", { name: "下一页", exact: true }).click();
    p++;
    await page.setViewportSize({ width: 844, height: 390 });
    await shot("storage-page-" + p + "-844");
  }
  checks.push(
    "All storage pages reachable; real deposit/withdraw preserve total possessions.",
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await seed("home", 96, 185, {
    inventory: bag({ wood: 6, stone: 3, gold: 20 }),
  });
  await interact("building");
  await sizes("building");
  await page.getByRole("button", { name: "开始修缮", exact: true }).click();
  await until(async () => (await snapshot()).buildings.home === 2, "upgrade");
  assert.equal((await snapshot()).inventory.wood, 0);
  assert.equal((await snapshot()).inventory.stone, 0);
  assert.equal((await snapshot()).inventory.gold, 10);
  await shot("building-upgraded");
  await seed("workshop", 240, 225, {
    inventory: bag({ wood: 6, crop: 1, gold: 20 }),
  });
  await interact("building");
  await page.getByRole("button", { name: "加工与买卖", exact: true }).click();
  await shot("counter");
  await page.setViewportSize({ width: 844, height: 390 });
  await shot("counter-844");
  await page
    .locator(".shop-row")
    .filter({ hasText: "制作木板" })
    .getByRole("button", { name: "制作", exact: true })
    .click();
  await until(async () => (await snapshot()).inventory.plank === 1, "plank");
  assert.equal((await snapshot()).inventory.wood, 3);
  checks.push(
    "Building plan and separate counter use real upgrade/craft actions with exact costs.",
  );
  for (const [name, loc, x, y] of [
    ["bridge", "crossing", 424, 280],
    ["boat", "crossing", 352, 352],
    ["inn", "inn", 176, 235],
    ["climb", "mountain", 736, 216],
  ]) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await seed(loc, x, y, { quests: settled });
    await interact("travel");
    await shot("travel-" + name);
    await page.setViewportSize({ width: 844, height: 390 });
    await shot("travel-" + name + "-844");
    let n = 1;
    const next = page.getByRole("button", { name: "下一方案", exact: true });
    while ((await next.count()) && (await next.isEnabled())) {
      await next.click();
      n++;
      await shot("travel-" + name + "-" + n + "-844");
    }
  }
  checks.push(
    "All bridge/boat/inn/mountain options remain available through explicit pages and show exact shortfalls.",
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await seed("crossing", 352, 352, { inventory: bag({ gold: 20 }) });
  await interact("travel");
  await page.getByRole("button", { name: "启程", exact: true }).click();
  await until(async () => (await read()).location === "mountain", "ferry");
  assert.equal((await snapshot()).inventory.gold, 14);
  checks.push("Real selected ferry option spends6 gold and reaches mountain.");
  await seed("overworld", 240, 320);
  for (const [name, entry] of [
    ["menu", null],
    ["guide", /旅人指南/],
    ["settings", /存档与数据/],
    ["ai", /AI 旅途伙伴/],
  ]) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await menu(entry);
    await shot(name);
    await page.setViewportSize({ width: 844, height: 390 });
    await shot(name + "-844");
    if (name === "guide")
      for (const [label, slug] of [
        ["家园与生计", "home"],
        ["洞穴与远行", "cave"],
        ["现实成长", "life"],
      ]) {
        await page
          .locator("dialog[open]")
          .getByRole("button", { name: label, exact: true })
          .click();
        await shot("guide-" + slug + "-844");
      }
    if (name === "settings")
      for (const [label, slug] of [
        ["旅程凭证", "recovery"],
        ["数据管理", "data"],
      ]) {
        await page
          .locator("dialog[open]")
          .getByRole("button", { name: label, exact: true })
          .click();
        await shot("settings-" + slug + "-844");
        await page.setViewportSize({ width: 1440, height: 900 });
        await shot("settings-" + slug);
        await page.setViewportSize({ width: 844, height: 390 });
      }
    await page.keyboard.press("Escape");
  }
  checks.push(
    "Menu, guide and settings pages keep native actions and readable content; destructive controls were not executed.",
  );
  const saved = await context.storageState();
  await context.close();
  context = await browser.newContext({
    storageState: saved,
    viewport: { width: 844, height: 390 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 2,
    reducedMotion: "reduce",
  });
  page = await context.newPage();
  watch();
  await page.goto(base);
  await ready();
  await menu(/旅人指南/);
  await page.getByRole("button", { name: "家园与生计", exact: true }).tap();
  await shot("touch-guide-844");
  await page.getByRole("button", { name: "关闭面板", exact: true }).tap();
  assert.equal((await read()).mode, "explore");
  checks.push(
    "DPR2 landscape touch, reduced motion and return to single-canvas world.",
  );
  assert.deepEqual(errors, []);
} finally {
  await fs.writeFile(
    new URL("report.json", out),
    JSON.stringify({ checks, errors, expectedErrors, layouts }, null, 2),
  );
  await context?.close();
  await browser.close();
}
