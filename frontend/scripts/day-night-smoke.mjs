import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

const base = process.env.REALQUEST_URL || "http://127.0.0.1:5401";
const out = new URL("../../output/day-night/", import.meta.url);
const db = process.env.REALQUEST_TEST_DB;
assert.equal(
  db,
  new URL("test.db", out).pathname,
  "Only the explicit isolated day-night database may be seeded",
);
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const contexts = [],
  errors = [],
  shots = [],
  checks = [];
let page,
  context,
  save,
  injecting = false;
const read = () =>
  page.evaluate(() => JSON.parse(window.render_game_to_text()));
const state = async () =>
  (await (await page.request.get(base + "/api/state")).json()).state;
async function until(check, label) {
  for (let n = 0; n < 150; n++) {
    if (await check()) return;
    await page.waitForTimeout(100);
  }
  throw Error(label + ": " + JSON.stringify(await read()));
}
async function load() {
  await page.goto(base);
  await page.locator("canvas").waitFor();
  await page.waitForFunction(
    () =>
      window.render_game_to_text &&
      JSON.parse(window.render_game_to_text()).canvasCount === 1,
  );
  await page.waitForTimeout(400);
}
async function shot(name) {
  await page.waitForTimeout(400);
  await page.screenshot({ path: new URL(name + ".png", out).pathname });
  shots.push(name);
}
async function seed(
  hour,
  location = "home",
  stamina = 37,
  hp = 75,
  day = 1,
  legacy = false,
) {
  await page.goto("about:blank");
  execFileSync(
    new URL("../../backend/.venv/bin/python", import.meta.url).pathname,
    [
      "-c",
      `
import json,sqlite3,sys,time
p,key,hour,location,stamina,hp,day,legacy=sys.argv[1:]
assert p.endswith('/output/day-night/test.db')
c=sqlite3.connect(p); row=c.execute('select state from players where id=?',(key,)).fetchone();assert row
s=json.loads(row[0]);now=time.time();hour=float(hour);day=int(day)
s['world_clock']={'version':2,'start_minute':360,'elapsed':((day-1)*1440+hour*60-360)*1.25,'updated_at':now,'running_until':0,'day_seconds':1800,'last_night':None}
if legacy=='true':s.pop('world_clock')
s['location']=location;s['position']={'x':288,'y':152} if location=='home' else {'x':240,'y':320}
s['stamina'].update(current=int(stamina),updated_at=now);s['vitality']['current']=int(hp);s['npc_encounter']=None;s['revision']+=1
c.execute('update players set state=? where id=?',(json.dumps(s),key));c.commit();c.close()
`,
      db,
      save,
      String(hour),
      location,
      String(stamina),
      String(hp),
      String(day),
      String(legacy),
    ],
  );
  await load();
}
async function bed() {
  await until(
    async () => (await read()).nearest?.id === "home_bed",
    "bed reachable",
  );
  await page.keyboard.press("e");
  await page.getByRole("region", { name: "床边休息选择" }).waitFor();
  await until(
    async () => (await state()).world_clock.running_until === 0,
    "bed pause",
  );
}
async function step(name) {
  checks.push(name);
  console.log("PASS " + name);
}
try {
  context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: new URL("videos/", out).pathname },
  });
  contexts.push(context);
  page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (
      m.type() === "error" &&
      !(injecting && /422|ERR_FAILED|ERR_INTERNET_DISCONNECTED/.test(m.text()))
    )
      errors.push(m.text());
  });
  await page.goto(base);
  await page.locator("#start-btn").click();
  await page.locator("canvas").waitFor();
  await until(async () => !!(await read()).gameTime, "initial clock");
  save = (await (await page.request.post(base + "/api/session")).json())
    .save_id;
  assert.equal((await read()).gameTime.day, 1);
  assert.ok(
    (await read()).gameTime.minute >= 360 &&
      (await read()).gameTime.minute < 363,
  );
  await shot("morning-1440");
  const first = (await state()).world_clock.elapsed;
  await page.waitForTimeout(3500);
  assert.ok((await state()).world_clock.elapsed > first);
  const r = await read();
  await page.locator("canvas").click({
    position: {
      x: (160 - r.camera.viewX) * r.camera.zoom,
      y: (180 - r.camera.viewY) * r.camera.zoom,
    },
  });
  await until(
    async () => (await read()).location === "home",
    "actual home entrance",
  );
  await step("new journey clock and actual home entrance");

  await seed(22);
  await bed();
  const before = await read();
  await page.keyboard.press("ArrowDown");
  assert.deepEqual((await read()).player, before.player);
  await shot("sleep-1440");
  await page.setViewportSize({ width: 1920, height: 1080 });
  await shot("sleep-1920");
  await page.setViewportSize({ width: 844, height: 390 });
  await shot("sleep-landscape");
  assert.ok(
    await page
      .getByRole("button", { name: "睡到明早 · 免费", exact: true })
      .isVisible(),
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await page
    .getByRole("button", { name: "小憩 30 分钟 · 免费", exact: true })
    .click();
  await until(
    async () => (await read()).stamina.current === 57,
    "short rest accepted",
  );
  assert.equal((await read()).vitality.current, 85);
  assert.ok(
    (await read()).gameTime.minute >= 1350 &&
      (await read()).gameTime.minute < 1352,
  );
  await shot("short-rest-1440");
  await step("bed choices, input ownership, short rest and responsive layout");

  injecting = true;
  await page.route("**/api/command", async (route) => {
    if (route.request().postDataJSON()?.action === "rest")
      await route.fulfill({
        status: 422,
        contentType: "application/json",
        body: JSON.stringify({ detail: "测试：暂时没能保存，请再试一次。" }),
      });
    else await route.continue();
  });
  await page
    .getByRole("button", { name: "睡到明早 · 免费", exact: true })
    .click();
  await page
    .getByRole("region", { name: "床边休息选择" })
    .getByRole("alert")
    .filter({ hasText: "暂时没能保存" })
    .waitFor();
  assert.equal((await state()).world_clock.last_night, null);
  assert.equal(
    await page.getByRole("dialog").getByRole("alert").count(),
    1,
    "one clear sleep error",
  );
  assert.equal(
    await page.getByRole("dialog").getByRole("status").count(),
    0,
    "no stale short-rest success alongside failure",
  );
  await shot("sleep-rejected");
  await page.unroute("**/api/command");
  let lost = false;
  await page.route("**/api/command", async (route) => {
    if (route.request().postDataJSON()?.action === "rest" && !lost) {
      lost = true;
      await route.fetch();
      await route.abort("failed");
    } else await route.continue();
  });
  await page
    .getByRole("button", { name: "睡到明早 · 免费", exact: true })
    .click();
  await until(
    async () => (await read()).gameTime.day === 2,
    "sleep with lost response",
  );
  await page.unroute("**/api/command");
  injecting = false;
  assert.equal((await read()).stamina.current, 100);
  assert.equal((await read()).vitality.current, 100);
  await page.getByRole("status", { name: "今晨状态" }).waitFor();
  assert.equal(
    await page.locator(".toast").filter({ hasText: "睡到第" }).count(),
    0,
  );
  await shot("slept-1440");
  await page.getByRole("button", { name: "收起今晨状态" }).click();
  await load();
  assert.equal((await read()).gameTime.day, 2);
  assert.equal((await read()).canvasCount, 1);
  assert.equal(await page.getByRole("status", { name: "今晨状态" }).count(), 0);
  await step("failed sleep, committed lost response retry and day persistence");

  await seed(23.5, "overworld");
  await page.getByRole("status", { name: "夜深提醒" }).waitFor();
  await shot("night-1440");
  const pos = (await state()).position;
  await page.getByRole("button", { name: "标记家中床铺" }).click();
  assert.deepEqual((await state()).position, pos);
  assert.equal((await read()).navigation.targetId, "home_bed");
  await page.setViewportSize({ width: 844, height: 390 });
  await shot("night-landscape");
  await page.setViewportSize({ width: 1440, height: 900 });
  await step("night lighting, bedtime reminder and marker-only navigation");

  await seed(24.9, "overworld");
  await page.getByRole("button", { name: "现实成长", exact: true }).click();
  await until(
    async () => (await state()).world_clock.running_until === 0,
    "Life pauses clock",
  );
  const paused = (await state()).world_clock.elapsed;
  await page.waitForTimeout(8500);
  assert.equal((await state()).world_clock.elapsed, paused);
  assert.equal((await state()).world_clock.last_night, null);
  await shot("life-paused-1440");
  await page.keyboard.press("Escape");
  injecting = true;
  await context.setOffline(true);
  await page.waitForTimeout(12000);
  await context.setOffline(false);
  await until(
    async () =>
      !(await read()).error && (await state()).world_clock.running_until > 0,
    "reconnected",
  );
  assert.equal((await state()).world_clock.last_night, null);
  injecting = false;
  await step("Life and disconnected time do not cause fainting");

  await page.goto("about:blank");
  await until(
    async () => (await state()).world_clock.running_until === 0,
    "pagehide pause",
  );
  const away = (await state()).world_clock.elapsed;
  await page.waitForTimeout(1800);
  assert.equal((await state()).world_clock.elapsed, away);
  await step("pagehide keepalive freezes the persisted world clock");

  await seed(24.97, "overworld", 37, 75);
  await until(async () => (await read()).gameTime.day === 2, "deadline faint");
  await until(async () => {
    const s = await read();
    return (
      s.sceneLocation === "home" && s.player.x === 288 && s.player.y === 152
    );
  }, "home scene settled");
  const faint = await read();
  assert.equal(faint.location, "home");
  assert.equal(faint.vitality.current, 65);
  assert.equal(faint.stamina.current, 37);
  assert.equal(faint.worldClock.last_night.kind, "faint");
  assert.deepEqual(faint.player, { x: 288, y: 152 });
  await shot("fainted-1440");
  await page.setViewportSize({ width: 844, height: 390 });
  await shot("fainted-landscape");
  assert.ok(
    await page.locator(".village-clock").evaluate((el) => {
      const r = el.getBoundingClientRect();
      return el.contains(
        document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2),
      );
    }),
    "morning outcome must not cover the clock",
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("button", { name: "收起今晨状态" }).click();
  await bed();
  await page
    .getByRole("button", { name: "小憩 30 分钟 · 免费", exact: true })
    .click();
  await until(
    async () => (await read()).stamina.current === 57,
    "post-faint recovery",
  );
  await page.keyboard.press("Escape");
  await load();
  assert.equal((await read()).vitality.current, 75);
  await step(
    "01:00 faint, HP loss, unchanged stamina, safe home return and recovery",
  );

  await seed(24.6);
  await bed();
  assert.ok(
    await page
      .getByRole("button", { name: "临近 01:00，请睡到明早" })
      .isDisabled(),
  );
  await shot("late-bed");
  await page.keyboard.press("Escape");
  await seed(22, "home", 0, 5, 1, true);
  assert.ok((await read()).worldClock.version === 2);
  assert.equal((await read()).stamina.current, 0);
  await bed();
  await page
    .getByRole("button", { name: "小憩 30 分钟 · 免费", exact: true })
    .click();
  await until(
    async () => (await read()).stamina.current === 20,
    "legacy zero-stamina recovery",
  );
  assert.equal((await read()).vitality.current, 15);
  await shot("legacy-recovered");
  await step("late short rest rejection and pre-clock save migration");

  context = await browser.newContext({
    viewport: { width: 844, height: 390 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
    reducedMotion: "reduce",
  });
  contexts.push(context);
  page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  await page.locator("#start-btn").tap();
  await page.locator("canvas").waitFor();
  save = (await (await page.request.post(base + "/api/session")).json())
    .save_id;
  await seed(21, "home", 0, 5);
  await until(
    async () => (await read()).nearest?.id === "home_bed",
    "touch bed proximity",
  );
  await page.getByRole("button", { name: /上床休息/ }).tap();
  await page.getByRole("region", { name: "床边休息选择" }).waitFor();
  const touchRest = page.getByRole("button", {
    name: "小憩 30 分钟 · 免费",
    exact: true,
  });
  const bounds = await touchRest.boundingBox();
  assert.ok(bounds.height >= 44 && bounds.y + bounds.height <= 390);
  await shot("sleep-touch-landscape");
  await touchRest.tap();
  await until(
    async () => (await read()).stamina.current === 20,
    "touch short rest",
  );
  await page
    .getByRole("button", { name: "睡到明早 · 免费", exact: true })
    .tap();
  await until(async () => (await read()).gameTime.day === 2, "touch sleep");
  await shot("slept-touch-landscape");
  await step(
    "DPR2 touch landscape, reduced motion and visible 44px sleep actions",
  );
  assert.deepEqual(errors, []);
  await fs.writeFile(
    new URL("result.json", out),
    JSON.stringify({ checks, shots, errors }, null, 2),
  );
  console.log(
    JSON.stringify({
      checks: checks.length,
      screenshots: shots.length,
      errors,
    }),
  );
} finally {
  for (const c of contexts) await c.close();
  await browser.close();
}
