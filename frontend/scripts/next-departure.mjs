import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

const base = process.env.REALQUEST_URL || "http://127.0.0.1:5414";
const out = new URL("../../output/next-departure/", import.meta.url);
const db = process.env.REALQUEST_TEST_DB;
assert.equal(
  db,
  new URL("test.db", out).pathname,
  "Only the isolated task database may be seeded",
);
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const contexts = [],
  checks = [],
  captures = [],
  errors = [],
  expected = [];
let page, save, original;
const read = () =>
  page.evaluate(() => JSON.parse(window.render_game_to_text()));
const get = async () =>
  await (await page.request.get(base + "/api/state")).json();
const check = (name) => {
  checks.push(name);
  console.log("PASS", name);
};
const today = (at) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at * 1000);
async function ready() {
  await page.locator("canvas").waitFor();
  await page.waitForFunction(
    () =>
      window.render_game_to_text &&
      JSON.parse(window.render_game_to_text()).canvasCount === 1 &&
      JSON.parse(window.render_game_to_text()).sceneLocation ===
        JSON.parse(window.render_game_to_text()).location,
  );
  await page.waitForTimeout(200);
}
async function seed(patch = {}, bookmark = false) {
  await page.goto("about:blank");
  const s = structuredClone(original);
  Object.assign(
    s,
    {
      quests: {
        ...s.quests,
        settle_in: { status: "claimed", accepted_at: 1 },
        leave_valley: { status: "active", accepted_at: 1 },
      },
      tracked_quest: "leave_valley",
      location: "workshop",
      position: { x: 376, y: 280 },
      inventory: { ...s.inventory, gold: 110, stone_sword: 1, gel: 3 },
      village_intro: {
        ...s.village_intro,
        briefed: true,
        first_clear: true,
        returned: true,
        reviewed: true,
        dismissed: false,
      },
      village_combat: {
        ...s.village_combat,
        unlocked: 2,
        equipped: "stone_sword",
      },
    },
    patch,
  );
  execFileSync(
    new URL("../../backend/.venv/bin/python", import.meta.url).pathname,
    [
      "-c",
      `
import json,sqlite3,sys,time
path,key,payload=sys.argv[1:];assert path.endswith('/output/next-departure/test.db')
c=sqlite3.connect(path);row=c.execute('select state from players where id=?',(key,)).fetchone();assert row
old=json.loads(row[0]);s=json.loads(payload);s['revision']=old['revision']+1;s['world_clock'].update(elapsed=37.5,updated_at=time.time(),running_until=0)
c.execute('update players set state=? where id=?',(json.dumps(s),key));c.commit();c.close()
`,
      db,
      save,
      JSON.stringify(s),
    ],
  );
  await page.goto(base);
  await ready();
  if (bookmark) {
    await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
    await page.evaluate(
      ({ save, at }) =>
        localStorage.setItem(
          `realquest-return-v1:${save}`,
          JSON.stringify({ version: 1, at, depth: 1, magic: 0 }),
        ),
      { save, at: Date.now() / 1000 - 600 },
    );
    await page.reload();
    await ready();
  }
}
async function openNotes() {
  if (await page.locator("dialog[open]").count())
    await page.keyboard.press("Escape");
  const slip = page.getByRole("button", {
    name: "看看这次的准备",
    exact: true,
  });
  if (await slip.isVisible()) await slip.click();
  else {
    await page.getByRole("button", { name: "主菜单", exact: true }).click();
    await page
      .locator(".journey-menu")
      .getByRole("button", { name: /^再出发手记/ })
      .click();
  }
  await page.getByRole("dialog", { name: "再出发手记" }).waitFor();
}
async function topic(name) {
  await page
    .getByRole("navigation", { name: "整备书页" })
    .getByRole("button", { name, exact: true })
    .click();
}
async function shot(name, modal = true) {
  await page.waitForTimeout(320);
  const metrics = await page.evaluate((modal) => {
    const d = modal
      ? document.querySelector("dialog[open]")
      : document.querySelector(".return-journey-slip");
    const r = d?.getBoundingClientRect();
    const controls = [
      ...(d?.querySelectorAll(
        modal
          ? ".modal-head button,.departure-bookmarks button,.departure-page-actions button,.departure-binding button"
          : "button",
      ) || []),
    ];
    return {
      viewport: [innerWidth, innerHeight],
      rect: r?.toJSON(),
      bodyScroll: document.documentElement.scrollHeight > innerHeight + 1,
      panelScroll:
        !!d?.querySelector(".modal-body") &&
        d.querySelector(".modal-body").scrollHeight >
          d.querySelector(".modal-body").clientHeight + 1,
      pageScroll:
        !!d?.querySelector(".departure-page") &&
        d.querySelector(".departure-page").scrollHeight >
          d.querySelector(".departure-page").clientHeight + 1,
      obscured: controls
        .filter((e) => {
          const r = e.getBoundingClientRect();
          const hit = document.elementFromPoint(
            r.x + r.width / 2,
            r.y + r.height / 2,
          );
          return !hit || !(e === hit || e.contains(hit));
        })
        .map((e) => e.textContent || e.getAttribute("aria-label")),
    };
  }, modal);
  captures.push({ name, ...metrics });
  await page.screenshot({ path: new URL(name + ".png", out).pathname });
  assert.ok(
    metrics.rect &&
      metrics.rect.x >= 0 &&
      metrics.rect.y >= 0 &&
      metrics.rect.right <= metrics.viewport[0] + 1 &&
      metrics.rect.bottom <= metrics.viewport[1] + 1,
    name + " bounds",
  );
  assert.equal(metrics.bodyScroll, false, name + " body scroll");
  assert.equal(metrics.panelScroll, false, name + " panel scroll");
  assert.deepEqual(metrics.obscured, [], name + " covered fixed actions");
  if (metrics.viewport[1] >= 700)
    assert.equal(metrics.pageScroll, false, name + " desktop page scroll");
  console.log(
    "CAPTURE",
    name,
    metrics.pageScroll ? "reading leaf scrolls" : "fitted",
  );
}
async function waitState(predicate) {
  for (let n = 0; n < 100; n++) {
    const s = (await get()).state;
    if (predicate(s)) return s;
    await page.waitForTimeout(80);
  }
  throw Error("Expected server state not reached");
}
async function ageBookmark() {
  await page.evaluate(
    ({ save, at }) =>
      localStorage.setItem(
        `realquest-return-v1:${save}`,
        JSON.stringify({ version: 1, at, depth: 1, magic: 0 }),
      ),
    { save, at: Date.now() / 1000 - 600 },
  );
}
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: new URL("videos/", out).pathname },
  });
  contexts.push(context);
  page = await context.newPage();
  page.setDefaultTimeout(7000);
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error")
      (m.text().includes("503") ? expected : errors).push(m.text());
  });
  await page.goto(base);
  await page.getByLabel("你的名字").fill("再出发验收旅人");
  await page.locator("#start-btn").click();
  await ready();
  const reply = await get();
  original = reply.state;
  save = reply.save_id;
  await seed({
    village_intro: {
      ...original.village_intro,
      briefed: true,
      first_clear: true,
      returned: true,
      reviewed: false,
      dismissed: false,
    },
  });
  await page.keyboard.press("e");
  await page.getByRole("button", { name: "初探手记", exact: true }).click();
  const beforeReview = (await get()).state.inventory;
  await page.getByRole("button", { name: "记下这次初探", exact: true }).click();
  await page.getByRole("dialog", { name: "再出发手记" }).waitFor();
  assert.deepEqual((await get()).state.inventory, beforeReview);
  check(
    "actual workshop recap opens preparation and grants or consumes nothing",
  );
  for (const name of ["整备行囊", "洞穴路标", "成长约定"]) {
    await topic(name);
    for (const [w, h] of [
      [1440, 900],
      [1920, 1080],
      [1024, 768],
      [844, 390],
      [740, 360],
    ]) {
      await page.setViewportSize({ width: w, height: h });
      await shot(`${name}-${w}`);
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await topic("整备行囊");
  await page.getByRole("button", { name: "微光短杖", exact: true }).click();
  await shot("gear-staff");
  assert.deepEqual(
    (await get()).state.inventory,
    beforeReview,
    "selection and comparison stay read-only",
  );
  const pos = (await read()).player;
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(250);
  await page.keyboard.up("KeyD");
  assert.deepEqual((await read()).player, pos);
  await page.getByRole("button", { name: "弹簧长矛", exact: true }).focus();
  await page.keyboard.press("Tab");
  assert.ok(
    await page.evaluate(() =>
      document.querySelector("dialog[open]").contains(document.activeElement),
    ),
  );
  await topic("洞穴路标");
  await page
    .getByRole("button", { name: "标记石根山洞 · 再次出发", exact: true })
    .click();
  assert.equal((await read()).navigation.targetId, "cave_entry");
  assert.deepEqual((await read()).player, pos);
  check(
    "bookmarks, comparisons, focus and navigation preserve resources and world position",
  );

  // Use the existing armory for the actual mutation, including an injected rejection.
  await page.keyboard.press("e");
  await page.getByRole("button", { name: /加固短剑/ }).click();
  let reject = true;
  const rejectPurchase = async (route) => {
    const data = route.request().postDataJSON();
    if (data.action === "gear_buy" && reject) {
      reject = false;
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ detail: "临时无法保存，请重试" }),
      });
    } else await route.continue();
  };
  await page.route("**/api/command", rejectPurchase);
  await page
    .getByRole("button", { name: "购买 · 96 金币", exact: true })
    .click();
  await page.getByRole("alert").waitFor();
  assert.deepEqual((await get()).state.inventory, beforeReview);
  await page
    .getByRole("button", { name: "购买 · 96 金币", exact: true })
    .click();
  let actual = await waitState((s) => s.inventory.reinforced_sword === 1);
  assert.equal(actual.inventory.gold, beforeReview.gold - 96);
  await page.unroute("**/api/command", rejectPurchase);
  await page.getByRole("button", { name: "装备这件武器", exact: true }).click();
  await waitState((s) => s.combat.equipped === "reinforced_sword");
  await page.reload();
  await ready();
  await openNotes();
  assert.match(
    await page.locator(".departure-equipped").innerText(),
    /加固短剑/,
  );
  check(
    "real rejected purchase conserves inventory; retry buys once and equip persists after reload",
  );

  const taskId = randomUUID(),
    now = Date.now() / 1000;
  const promise = {
    id: taskId,
    kind: "study",
    hours: 1,
    date: today(now),
    giver: "noah",
    accepted_at: now - 3600,
    ready_at: now + 3600,
    status: "active",
    claimed_at: null,
    cancelled_at: null,
    reward: 0,
    source: "npc_elapsed",
    verified: false,
  };
  await seed({ life_tasks: { [taskId]: promise } });
  await openNotes();
  await topic("成长约定");
  await shot("promise-pending");
  assert.equal((await get()).state.knowledge_points, 0);
  await topic("洞穴路标");
  assert.equal(
    await page
      .getByRole("button", { name: "标记石根山洞 · 再次出发", exact: true })
      .isEnabled(),
    true,
  );
  check(
    "pending real-life learning remains unclaimed and cave exploration stays available",
  );

  promise.ready_at = now - 1;
  promise.accepted_at = now - 3601;
  await seed({ life_tasks: { [taskId]: promise } }, true);
  await page.getByRole("complementary", { name: "归来续接" }).waitFor();
  await shot("return-ready", false);
  assert.equal((await get()).state.knowledge_points, 0);
  await openNotes();
  await shot("promise-ready");
  await page
    .getByRole("button", { name: "标记诺亚 · 结算约定", exact: true })
    .click();
  assert.equal((await read()).navigation.targetId, "noah");
  check(
    "return from simulated absence uses refreshed server deadline and only marks Noah",
  );

  const n = (await read()).residentLocations.find((n) => n.id === "noah");
  assert.ok(n);
  await seed({
    life_tasks: { [taskId]: promise },
    location: n.location,
    position: { x: n.x, y: n.y },
  });
  await page.keyboard.press("e");
  await page
    .getByRole("button", { name: "结算委托 · 领取 1 知识点", exact: true })
    .click();
  actual = await waitState((s) => s.knowledge_points === 1);
  assert.equal(
    actual.life_journal.tasks.find((t) => t.id === taskId).status,
    "claimed",
  );
  await openNotes();
  await topic("成长约定");
  await shot("knowledge-unspent");
  await page.getByRole("button", { name: "翻开魔法研修", exact: true }).click();
  assert.equal(
    await page.getByRole("button", { name: /魔法/, pressed: true }).count(),
    1,
  );
  let rejectGrowth = true;
  const failGrowth = async (route) => {
    if (
      route.request().postDataJSON().action === "knowledge_spend" &&
      rejectGrowth
    ) {
      rejectGrowth = false;
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ detail: "研修暂未保存，请重试" }),
      });
    } else await route.continue();
  };
  await page.route("**/api/command", failGrowth);
  const invest = page.getByRole("button", {
    name: "投入 1 知识点 · 魔法 +1",
    exact: true,
  });
  await invest.click();
  await page.getByRole("alert").waitFor();
  assert.equal((await get()).state.knowledge_points, 1);
  await invest.click();
  actual = await waitState((s) => s.knowledge_growth.magic === 1);
  assert.equal(actual.knowledge_points, 0);
  await page.unroute("**/api/command", failGrowth);
  await page.reload();
  await ready();
  await openNotes();
  await topic("成长约定");
  await shot("magic-invested");
  check(
    "existing NPC settlement and explicit magic research preserve one-hour one-point rules; rejected spend retries once",
  );

  await seed({
    village_combat: {
      ...original.village_combat,
      unlocked: 4,
      equipped: "stone_sword",
    },
  });
  await openNotes();
  await topic("洞穴路标");
  await shot("rope-route");
  assert.equal(
    await page.locator('.departure-route li[data-cleared="true"]').count(),
    3,
  );
  await seed({ vitality: { current: 20, max: 100 } });
  await openNotes();
  await page.getByRole("button", { name: "标记家中床铺", exact: true }).click();
  assert.equal((await read()).navigation.targetId, "home_bed");
  await seed({
    inventory: { ...original.inventory, gold: 32, stone_sword: 1 },
    village_combat: { ...original.village_combat, equipped: null, unlocked: 2 },
  });
  assert.equal((await read()).nextDeparture.panel, "equipment");
  await seed({
    village_combat: {
      ...original.village_combat,
      unlocked: 5,
      equipped: "stone_sword",
      boss_first: true,
    },
    inventory: { ...original.inventory, stone_sword: 1, gate_stone: 1 },
    knowledge_growth: { science: 0, magic: 3 },
  });
  await openNotes();
  await topic("洞穴路标");
  await shot("gate-ready");
  await page.getByRole("button", { name: "标记东行石门", exact: true }).click();
  assert.equal((await read()).navigation.targetId, "village_departure");
  check(
    "permanent third-floor route, low-health recovery, unequipped weapon and gate readiness follow real state",
  );

  await seed();
  await openNotes();
  await page
    .getByRole("button", { name: "暂时收起下一程引导", exact: true })
    .click();
  await waitState((s) => s.village_intro.dismissed);
  await ageBookmark();
  await page.reload();
  await ready();
  assert.equal(
    await page.getByRole("complementary", { name: "归来续接" }).count(),
    0,
  );
  await openNotes();
  await page
    .getByRole("button", { name: "继续下一程引导", exact: true })
    .click();
  await waitState((s) => !s.village_intro.dismissed);
  await seed({
    tracked_quest: "first_harvest",
    quests: {
      ...original.quests,
      settle_in: { status: "claimed" },
      first_harvest: { status: "active" },
      leave_valley: { status: "active" },
    },
  });
  assert.equal(
    await page.locator(".quest-compass").getByText("下一次出发").count(),
    0,
  );
  check(
    "dismiss/resume persists and manual side-quest tracking keeps HUD ownership",
  );

  // Same-page return must wait for fresh state, preserve another open page and retry online.
  await seed();
  await openNotes();
  await topic("整备行囊");
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await ageBookmark();
  await page.waitForTimeout(15500);
  assert.equal(
    (await read()).returnCue,
    null,
    "background polling must not consume absence",
  );
  let rejectState = true;
  const offline = async (route) => {
    if (rejectState)
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: "{}",
      });
    else await route.continue();
  };
  await page.route("**/api/state", offline);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await page.waitForTimeout(200);
  assert.equal((await read()).returnCue, null);
  rejectState = false;
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await page.waitForTimeout(300);
  assert.ok((await read()).returnCue);
  assert.equal((await read()).mode, "preparation");
  assert.equal(await page.locator(".return-journey-slip").count(), 0);
  await page.unroute("**/api/state", offline);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await page.waitForTimeout(200);
  assert.equal(await page.locator(".return-journey-slip").count(), 0);
  check(
    "failed refresh creates no stale return claim; online retry keeps the open page and dismissed slip stays quiet",
  );

  const touch = await browser.newContext({
    viewport: { width: 844, height: 390 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
    storageState: await context.storageState(),
  });
  contexts.push(touch);
  page = await touch.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(base);
  await ready();
  await openNotes();
  await topic("洞穴路标");
  await shot("touch-route-844");
  await page.locator(".departure-page").evaluate((e) => {
    e.scrollTop = e.scrollHeight;
    e.dispatchEvent(new Event("scroll"));
  });
  await page.getByRole("button", { name: "需要恢复？标记家中床铺" }).waitFor();
  await shot("touch-route-read-844");
  await page.getByRole("button", { name: "成长约定", exact: true }).tap();
  assert.equal(
    await page
      .locator(".departure-page")
      .evaluate((e) => getComputedStyle(e).animationName),
    "none",
  );
  await page.getByRole("button", { name: "关闭面板", exact: true }).tap();
  assert.equal((await read()).canvasCount, 1);
  await context.storageState({
    path: new URL("browser-storage.json", out).pathname,
  });
  check("DPR2 landscape touch, reduced motion, close and single canvas");
  assert.deepEqual(errors, []);
  await fs.writeFile(
    new URL("report.json", out),
    JSON.stringify({ checks, captures, errors, expected }, null, 2),
  );
} catch (error) {
  if (page) {
    await page
      .screenshot({ path: new URL("failure.png", out).pathname })
      .catch(() => {});
    await fs.writeFile(
      new URL("failure-state.json", out),
      JSON.stringify(await read().catch(() => ({})), null, 2),
    );
  }
  throw error;
} finally {
  if (contexts[0])
    await contexts[0]
      .storageState({ path: new URL("browser-storage.json", out).pathname })
      .catch(() => {});
  for (const context of contexts) await context.close();
  await browser.close();
}
