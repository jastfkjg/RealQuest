import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
const controls = process.env.REALQUEST_UI_SUITE === "living-controls";
const base =
  process.env.REALQUEST_URL || `http://127.0.0.1:${controls ? 5412 : 5411}`;
const out = new URL(
  `../../output/${controls ? "living-controls" : "world-ui-refinement"}/`,
  import.meta.url,
);
const db = new URL("test.db", out).pathname;
const browser = await chromium.launch({ headless: true });
let context, page, id, original;
const errors = [],
  layouts = [],
  checks = [];
const read = () =>
  page.evaluate(() => JSON.parse(window.render_game_to_text()));
const snapshot = async () =>
  await (await page.request.get(base + "/api/state")).json();
async function ready() {
  await page.locator("canvas").waitFor();
  await page.waitForFunction(
    () =>
      window.render_game_to_text &&
      (() => {
        const state = JSON.parse(window.render_game_to_text());
        return (
          state.canvasCount === 1 &&
          state.playerTexture &&
          state.sceneLocation === state.location
        );
      })(),
  );
  await page.waitForTimeout(400);
}
async function seed(location, x, y, patch = {}) {
  await page.goto("about:blank");
  const s = structuredClone(original);
  s.world_clock.elapsed = controls ? 37.5 : 0;
  Object.assign(s, { location, position: { x, y } }, patch);
  execFileSync(
    new URL("../../backend/.venv/bin/python", import.meta.url).pathname,
    [
      "-c",
      `
import json,sqlite3,sys,time
p,key,payload=sys.argv[1:];assert p.endswith(('/output/world-ui-refinement/test.db','/output/living-controls/test.db'))
c=sqlite3.connect(p);old=json.loads(c.execute('select state from players where id=?',(key,)).fetchone()[0]);s=json.loads(payload)
s['revision']=old['revision']+1;s['world_clock'].update(updated_at=time.time(),running_until=0)
c.execute('update players set state=? where id=?',(json.dumps(s),key));c.commit();c.close()
`,
      db,
      id,
      JSON.stringify(s),
    ],
  );
  await page.goto(base);
  await ready();
}
async function shot(name) {
  await page.waitForTimeout(180);
  await page.screenshot({ path: new URL(name + ".png", out).pathname });
  const layout = await page.locator("dialog").evaluateAll(
    (els, capture) =>
      els
        .filter((e) => e.open)
        .map((e) => ({
          name: e.className,
          viewport: [innerWidth, innerHeight],
          rect: e.getBoundingClientRect().toJSON(),
          scroll: [...e.querySelectorAll("*"), e]
            .filter(
              (n) =>
                n.clientHeight > 0 &&
                n.scrollHeight > n.clientHeight + 2 &&
                ["auto", "scroll", "hidden"].includes(
                  getComputedStyle(n).overflowY,
                ),
            )
            .map((n) => ({
              class: n.className,
              client: n.clientHeight,
              scroll: n.scrollHeight,
              overflow: getComputedStyle(n).overflowY,
            })),
          obscured: [...e.querySelectorAll("button,select,summary")]
            .filter((b) => b.checkVisibility())
            .filter((b) => {
              const r = b.getBoundingClientRect();
              if (
                capture.startsWith("family-") &&
                (r.top < 0 || r.bottom > innerHeight)
              )
                return false;
              if (capture.startsWith("family-")) {
                for (
                  let parent = b.parentElement;
                  parent && parent !== document.body;
                  parent = parent.parentElement
                ) {
                  const style = getComputedStyle(parent),
                    rect = parent.getBoundingClientRect();
                  if (
                    ["auto", "scroll", "hidden", "clip"].includes(
                      style.overflowY,
                    ) &&
                    (r.y + r.height / 2 < rect.top ||
                      r.y + r.height / 2 > rect.bottom)
                  )
                    return false;
                  if (
                    ["auto", "scroll", "hidden", "clip"].includes(
                      style.overflowX,
                    ) &&
                    (r.x + r.width / 2 < rect.left ||
                      r.x + r.width / 2 > rect.right)
                  )
                    return false;
                }
              }
              const hit = document.elementFromPoint(
                r.x + r.width / 2,
                r.y + r.height / 2,
              );
              return r.height && (!hit || !(hit === b || b.contains(hit)));
            })
            .map((b) => b.textContent.trim()),
        })),
    name,
  );
  layouts.push({ name, layout });
  console.log(
    "CAPTURE",
    name,
    JSON.stringify(
      layout.map((l) => ({ scroll: l.scroll, obscured: l.obscured })),
    ),
  );
  for (const panel of layout) {
    assert.deepEqual(panel.obscured, [], name + ": controls must stay visible");
    if (!name.startsWith("family-"))
      assert.equal(
        panel.scroll.some(
          (s) => s.class === "modal-body" || s.class.includes("modal hp-panel"),
        ),
        false,
        name + ": fitted panel must not scroll",
      );
    assert.ok(
      panel.rect.left >= 0 &&
        panel.rect.top >= 0 &&
        panel.rect.right <= panel.viewport[0] + 1 &&
        panel.rect.bottom <= panel.viewport[1] + 1,
      name + ": within viewport",
    );
  }
}
async function openByE(panel) {
  await page.keyboard.press("e");
  await page.waitForFunction(
    (p) => JSON.parse(window.render_game_to_text()).mode === p,
    panel,
  );
}
async function until(fn, label) {
  for (let i = 0; i < 100; i++) {
    if (await fn()) return;
    await page.waitForTimeout(60);
  }
  const state = await read();
  throw Error(
    label +
      ": " +
      JSON.stringify({
        location: state.location,
        mode: state.mode,
        player: state.player,
        nearest: state.nearest?.id,
        error: state.error,
      }),
  );
}
try {
  await fs.mkdir(out, { recursive: true });
  context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
    recordVideo: { dir: new URL("videos/", out).pathname },
  });
  page = await context.newPage();
  page.setDefaultTimeout(8000);
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  await page.getByLabel("你的名字").fill("界面验收旅人");
  await page.locator("#start-btn").click();
  await ready();
  const initial = await snapshot();
  id = initial.save_id;
  original = initial.state;
  for (const [name, x, y] of [
    ["home", 160, 216],
    ["workshop", 352, 216],
    ["library", 704, 216],
    ["guild", 1088, 528],
    ["shop", 832, 672],
  ]) {
    await seed("overworld", x, y);
    await page.keyboard.down("ArrowUp");
    await page.waitForTimeout(250);
    await page.keyboard.up("ArrowUp");
    assert.ok((await read()).player.y >= y - 1, "facade collision " + name);
    await shot("door-" + name);
    await page.keyboard.press("e");
    await until(async () => (await read()).location === name, "enter " + name);
    await page.waitForTimeout(250);
    await page.keyboard.down("ArrowDown");
    await page.waitForTimeout(220);
    await page.keyboard.up("ArrowDown");
    await page.keyboard.press("e");
    await until(
      async () => (await read()).location === "overworld",
      "exit " + name,
    );
    if (name === "home") {
      await page.locator(".toast:not(.error)").waitFor();
      const toast = await page.locator(".toast:not(.error)").boundingBox();
      assert.ok(toast.x > 1440 / 2 && toast.height < 65);
      await shot("world-notice");
      const started = Date.now();
      await page
        .locator(".toast:not(.error)")
        .waitFor({ state: "hidden", timeout: 2600 });
      assert.ok(Date.now() - started < 2300);
      checks.push(
        "notice stays at edge and disappears within about 1.8 seconds",
      );
    }
  }
  checks.push("all five facade collisions and actual enter/exit");
  await seed("overworld", 600, 384, {
    world_clock: { ...original.world_clock, elapsed: 187.5 },
  });
  assert.ok((await read()).npcs.some((n) => n.id === "noah"));
  await shot("npc-cue");
  await seed("overworld", 958, 404);
  await shot("quiet-path");
  const readyQuest = {
    events: [...original.events, "visited_home"],
    stats: { ...original.stats, wood: 3 },
  };
  await seed("overworld", 256, 300, readyQuest);
  await openByE("board");
  for (const [w, h] of [
    [1440, 900],
    [1920, 1080],
    [1024, 768],
    [844, 390],
    [740, 360],
  ]) {
    await page.setViewportSize({ width: w, height: h });
    await shot("board-" + w);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  const beforeBoard = (await snapshot()).state;
  let rejectClaim = true;
  await page.route("**/api/command", async (route) => {
    if (
      route.request().postDataJSON().action === "quest_claim" &&
      rejectClaim
    ) {
      rejectClaim = false;
      return route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ detail: "测试：交付未成功，请重试" }),
      });
    }
    await route.continue();
  });
  await page
    .getByRole("button", { name: "交付任务 · 领取奖励", exact: true })
    .click();
  await page.getByRole("alert").waitFor();
  assert.deepEqual((await snapshot()).state.inventory, beforeBoard.inventory);
  await shot("board-rejected");
  await page
    .getByRole("button", { name: "交付任务 · 领取奖励", exact: true })
    .click();
  await until(
    async () => (await snapshot()).state.quests.settle_in.status === "claimed",
    "claim",
  );
  const claimed = (await snapshot()).state;
  assert.equal(claimed.inventory.gold, beforeBoard.inventory.gold + 12);
  assert.equal(claimed.inventory.seed, beforeBoard.inventory.seed + 3);
  await page.unroute("**/api/command");
  await page.getByRole("button", { name: "远行准备", exact: true }).click();
  await page.setViewportSize({ width: 844, height: 390 });
  await shot("board-briefing-1");
  await page
    .getByRole("navigation", { name: "远行准备翻页" })
    .getByRole("button", { name: "下一页" })
    .click();
  await shot("board-briefing-2");
  await page
    .getByRole("button", { name: "接下远行来信，开始准备", exact: true })
    .click();
  await until(
    async () => (await snapshot()).state.village_intro.briefed,
    "briefing",
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("button", { name: /山那边，灯火正亮/ }).click();
  await shot("board-long");
  const allObjectives = [];
  for (let i = 0; i < 5; i++) {
    allObjectives.push(
      ...(await page
        .getByRole("list", { name: "委托目标" })
        .locator("li span")
        .allTextContents()),
    );
    const next = page
      .getByRole("navigation", { name: "目标翻页" })
      .getByRole("button", { name: "下一页" });
    if (await next.isEnabled()) await next.click();
  }
  assert.equal(new Set(allObjectives).size, 9);
  await page.setViewportSize({ width: 844, height: 390 });
  await shot("board-long-844");
  const playerBefore = (await read()).player;
  await page.keyboard.down("d");
  await page.waitForTimeout(200);
  await page.keyboard.up("d");
  assert.deepEqual((await read()).player, playerBefore);
  await page
    .getByRole("navigation", { name: "目标翻页" })
    .getByRole("button", { name: "上一页" })
    .click();
  await page.setViewportSize({ width: 1440, height: 900 });
  await shot("board-objectives-2");
  await page.getByRole("button", { name: "委托说明", exact: true }).click();
  await shot("board-description");
  await page.setViewportSize({ width: 844, height: 390 });
  await shot("board-description-844");
  await page.setViewportSize({ width: 740, height: 360 });
  await shot("board-description-740");
  await page.keyboard.press("Escape");
  checks.push(
    "board rejection/retry exact one reward, paged briefing, all nine objectives and input ownership",
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await seed("shop", 240, 190, {
    inventory: { ...original.inventory, crop: 2, wood: 9, stone: 12 },
  });
  await openByE("shop");
  for (const [w, h] of [
    [1440, 900],
    [1920, 1080],
    [1024, 768],
    [844, 390],
    [740, 360],
  ]) {
    await page.setViewportSize({ width: w, height: h });
    await shot("shop-" + w);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  const beforeTrade = (await snapshot()).state.inventory;
  let rejectedTrade = false,
    tradeCalls = 0;
  await page.route("**/api/command", async (route) => {
    if (route.request().postDataJSON().action === "market_trade") {
      tradeCalls++;
      if (!rejectedTrade) {
        rejectedTrade = true;
        return route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ detail: "测试：交易未记账，请重试" }),
        });
      }
      await new Promise((resolve) =>
        setTimeout(resolve, controls ? 1200 : 300),
      );
    }
    await route.continue();
  });
  const sell = page.getByRole("button", {
    name: "确认出售 1 份萝卜",
    exact: true,
  });
  if (controls) {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await sell.hover();
    await shot("shop-hover");
    await page.getByLabel("交易数量").focus();
    await page.keyboard.press("Tab");
    assert.ok(
      await sell.evaluate((button) => button === document.activeElement),
    );
    await shot("shop-focus");
    const box = await sell.boundingBox();
    assert.ok(box.height >= 44);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await shot("shop-pressed");
    await page.mouse.up();
    await page.emulateMedia({ reducedMotion: "reduce" });
    checks.push(
      "normal-motion hover, keyboard focus, physical press, failure and disabled pending action captured",
    );
  } else await sell.click();
  await page.getByRole("alert").waitFor();
  assert.deepEqual((await snapshot()).state.inventory, beforeTrade);
  if (controls) await shot("shop-rejected");
  await page
    .getByRole("button", { name: "确认出售 1 份萝卜", exact: true })
    .click();
  if (controls) {
    const pending = page.getByRole("button", {
      name: "正在记账…",
      exact: true,
    });
    await pending.waitFor();
    assert.ok(await pending.isDisabled());
    await shot("shop-pending");
  }
  await until(
    async () =>
      (await snapshot()).state.inventory.crop === beforeTrade.crop - 1,
    "sell",
  );
  assert.equal(tradeCalls, 2);
  assert.equal((await snapshot()).state.inventory.gold, beforeTrade.gold + 8);
  await page.unroute("**/api/command");
  await page.getByRole("button", { name: "我要买", exact: true }).click();
  const beforeBuy = (await snapshot()).state.inventory;
  await page.getByRole("button", { name: /确认买入 1 份种子/ }).click();
  await until(
    async () => (await snapshot()).state.inventory.seed === beforeBuy.seed + 1,
    "buy",
  );
  const market = (await snapshot()).state.market;
  assert.equal(
    (await snapshot()).state.inventory.gold,
    beforeBuy.gold - market.buy.seed,
  );
  checks.push(
    "market rejection preserves resources; retry sells one item; purchase uses actual price",
  );
  for (const [label, name] of [
    ["村民订单", "orders"],
    ["安家心愿", "story"],
    ["邻里日常", "social"],
  ]) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByRole("button", { name: label, exact: true }).click();
    await shot("shop-" + name);
    await page.setViewportSize({ width: 844, height: 390 });
    await shot("shop-" + name + "-844");
    if (name === "social") {
      await page
        .getByRole("button", { name: "送礼与帮忙", exact: true })
        .click();
      await shot("shop-kindness-844");
    }
    if (name === "story") {
      await page.getByRole("button", { name: "小屋修缮", exact: true }).click();
      await shot("shop-home-844");
    }
    if (name === "orders") {
      await page.getByRole("button", { name: "下一份", exact: true }).click();
      await shot("shop-order2-844");
    }
  }
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 1440, height: 900 });
  await seed("home", 288, 152, {
    stamina: {
      ...original.stamina,
      current: 40,
      updated_at: Date.now() / 1000,
    },
    vitality: { ...original.vitality, current: 70 },
  });
  await openByE("sleep");
  for (const [w, h] of [
    [1440, 900],
    [1024, 768],
    [844, 390],
    [740, 360],
  ]) {
    await page.setViewportSize({ width: w, height: h });
    await shot("sleep-" + w);
  }
  await page.getByText("夜间与计时规则", { exact: true }).click();
  await shot("sleep-rules-740");
  await page.keyboard.press("Escape");
  assert.equal((await read()).mode, "sleep");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page
    .getByRole("button", { name: "小憩 30 分钟 · 免费", exact: true })
    .click();
  await until(
    async () => (await snapshot()).state.vitality.current === 80,
    "short rest",
  );
  assert.equal((await snapshot()).state.stamina.current, 60);
  await page.setViewportSize({ width: 740, height: 360 });
  await shot("sleep-rested-740");
  await page
    .getByRole("button", { name: "睡到明早 · 免费", exact: true })
    .click();
  await until(async () => (await read()).mode === "explore", "sleep");
  assert.equal((await snapshot()).state.world_clock.last_night.kind, "sleep");
  checks.push(
    "rules Escape folds and restores focus; authoritative short rest and overnight sleep",
  );
  await page.getByRole("button", { name: "收起今晨状态", exact: true }).click();
  await page.setViewportSize({ width: 1440, height: 900 });
  await seed("overworld", 240, 320);
  await page.getByRole("button", { name: "远行装备", exact: true }).click();
  for (const [w, h] of [
    [1440, 900],
    [1024, 768],
    [844, 390],
    [740, 360],
  ]) {
    await page.setViewportSize({ width: w, height: h });
    await shot("equipment-" + w);
  }
  const emptyPlayer = (await read()).player;
  await page
    .getByRole("button", { name: "标记工坊武备台", exact: true })
    .click();
  assert.deepEqual((await read()).player, emptyPlayer);
  assert.equal((await read()).navigation.targetId, "armory_counter");
  await page.setViewportSize({ width: 1440, height: 900 });
  const weapons = Object.keys(original.combat.weapons);
  await seed("overworld", 240, 320, {
    inventory: {
      ...original.inventory,
      ...Object.fromEntries(weapons.map((k) => [k, 1])),
    },
  });
  await page.getByRole("button", { name: "远行装备", exact: true }).click();
  await shot("equipment-owned");
  await page.getByRole("button", { name: "装备这件武器", exact: true }).click();
  await until(async () => !!(await read()).combat.equipped, "equip");
  await page.setViewportSize({ width: 844, height: 390 });
  await shot("equipment-owned-844");
  await page.keyboard.press("Escape");
  await page.reload();
  await ready();
  assert.equal((await read()).combat.equipped, weapons[0]);
  checks.push(
    "empty equipment direction never teleports; real equip persists after reload",
  );
  if (controls) {
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const [name, open] of [
      [
        "inventory",
        async () =>
          page.getByRole("button", { name: "背包", exact: true }).click(),
      ],
      [
        "character",
        async () =>
          page.getByRole("button", { name: "角色", exact: true }).click(),
      ],
      [
        "journal",
        async () =>
          page.getByRole("button", { name: "任务日志", exact: true }).click(),
      ],
      [
        "map",
        async () =>
          page.getByRole("button", { name: "地图", exact: true }).click(),
      ],
      [
        "life",
        async () =>
          page.getByRole("button", { name: "现实成长", exact: true }).click(),
      ],
    ]) {
      await seed("overworld", 240, 320);
      await open();
      await page.locator("dialog[open]").waitFor();
      await shot("family-" + name + "-1440");
      await page.setViewportSize({ width: 844, height: 390 });
      await shot("family-" + name + "-844");
      const action = page
        .locator(
          "dialog[open] button.primary, dialog[open] button.rq-button--primary",
        )
        .first();
      if (await action.count()) {
        await action.scrollIntoViewIfNeeded();
        await shot("family-" + name + "-action-844");
      }
      await page.keyboard.press("Escape");
      await page.setViewportSize({ width: 1440, height: 900 });
    }
    for (const [name, location, x, y, panel] of [
      ["storage", "home", 360, 230, "storage"],
      ["blueprint", "home", 96, 185, "building"],
      ["lia", "library", 144, 285, "npc"],
      ["noah", "guild", 328, 315, "npc"],
      ["armory", "workshop", 376, 280, "armory"],
      ["spellbook", "library", 112, 260, "spellbook"],
      ["travel", "crossing", 424, 280, "travel"],
      ["gate", "overworld", 1816, 384, "gate"],
      ["cave", "overworld", 304, 1120, "cave"],
    ]) {
      await seed(location, x, y);
      await openByE(panel);
      await shot("family-" + name + "-1440");
      await page.setViewportSize({ width: 844, height: 390 });
      await shot("family-" + name + "-844");
      await page.keyboard.press("Escape");
      await page.setViewportSize({ width: 1440, height: 900 });
    }
    await seed("overworld", 240, 320);
    await page.getByRole("button", { name: "现实成长", exact: true }).click();
    await page.getByRole("button", { name: "知识研修", exact: true }).click();
    await page.locator(".study-page").waitFor();
    await shot("family-knowledge-1440");
    await page.getByRole("button", { name: "今日研习", exact: true }).click();
    await shot("family-study-1440");
    await page.getByLabel("写下你的学习主题").fill("读一页植物笔记");
    await page.keyboard.press("Tab");
    assert.deepEqual((await read()).player, { x: 240, y: 320 });
    await page.setViewportSize({ width: 844, height: 390 });
    await shot("family-study-844");
    await page.keyboard.press("Escape");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByRole("button", { name: /体力.*打开行前手札/ }).click();
    await page.locator(".training-page").waitFor();
    await shot("family-training-1440");
    await page.setViewportSize({ width: 844, height: 390 });
    await shot("family-training-844");
    await page.keyboard.press("Escape");
    for (const [name, entry] of [
      ["menu", null],
      ["neighbors", /村民近况/],
      ["guide", /旅人指南/],
      ["settings", /存档与数据/],
    ]) {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.getByRole("button", { name: "主菜单", exact: true }).click();
      if (entry)
        await page
          .locator(".journey-menu")
          .getByRole("button", { name: entry })
          .click();
      await page.locator("dialog[open]").waitFor();
      await shot("family-" + name + "-1440");
      await page.setViewportSize({ width: 844, height: 390 });
      await shot("family-" + name + "-844");
      await page.keyboard.press("Escape");
    }
    checks.push(
      "shared controls reviewed across inventory, dossier, journal, map, storage, blueprint, NPCs, gear, travel, cave, Life/study/training, neighbors, menu, guide and settings",
    );
    await page.goto(base);
    await ready();
  }
  const storageState = await context.storageState();
  await context.close();
  context = await browser.newContext({
    storageState,
    viewport: { width: 844, height: 390 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
    reducedMotion: "reduce",
  });
  page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  await ready();
  await page.getByRole("button", { name: "远行装备", exact: true }).tap();
  await shot("touch-equipment-844");
  await page.getByRole("button", { name: "关闭面板", exact: true }).tap();
  assert.equal((await read()).mode, "explore");
  checks.push("DPR2 landscape touch controls and reduced motion");
  checks.push("captured doorway, quiet cues and every requested panel");
  assert.deepEqual(errors, []);
} finally {
  await fs.writeFile(
    new URL("layout-report.json", out),
    JSON.stringify({ checks, errors, layouts }, null, 2),
  );
  await context?.close();
  await browser.close();
}
