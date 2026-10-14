import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
const base = process.env.REALQUEST_URL || "http://127.0.0.1:5201";
const out = new URL("../../output/health-stamina/", import.meta.url);
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const contexts = [],
  errors = [],
  shots = [];
let expectedNetworkFailure = false;
async function create(options = {}) {
  const c = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: {
      dir: new URL("recordings/", out).pathname,
      size: { width: 1440, height: 900 },
    },
    ...options,
  });
  contexts.push(c);
  const p = await c.newPage();
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => {
    if (
      m.type() === "error" &&
      !(
        expectedNetworkFailure &&
        /Failed to load resource|net::ERR/.test(m.text())
      )
    )
      errors.push(m.text());
  });
  await p.goto(base);
  await p.getByLabel("你的名字").fill("林间试行旅人");
  await p.click("#start-btn");
  await p.waitForSelector("canvas");
  return { p, c };
}
const read = async (p) => {
  await p.waitForFunction(
    () => typeof window.render_game_to_text === "function",
  );
  return p.evaluate(() => JSON.parse(window.render_game_to_text()));
};
async function until(p, check, label) {
  for (let i = 0; i < 150; i++) {
    const s = await read(p);
    if (check(s)) return s;
    await p.waitForTimeout(100);
  }
  throw new Error(label + ": " + JSON.stringify(await read(p)));
}
async function shot(p, name) {
  await p.waitForTimeout(420);
  assert.equal(
    await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
    "page overflow",
  );
  const overflow = await p
    .locator(".training-page")
    .evaluateAll((es) => es.some((e) => e.scrollWidth > e.clientWidth + 1));
  assert.equal(overflow, false, "journal horizontal overflow");
  await p.screenshot({ path: new URL(name + ".png", out).pathname });
  shots.push(name);
}
async function clickWorld(p, x, y) {
  await p.waitForTimeout(350);
  const s = await read(p);
  await p.locator("canvas").click({
    position: {
      x: (x - s.camera.viewX) * s.camera.zoom,
      y: (y - s.camera.viewY) * s.camera.zoom,
    },
  });
}
async function command(c, action, data = {}) {
  const r = await c.request.post(base + "/api/command", {
    data: { request_id: crypto.randomUUID(), action, data },
  });
  assert.equal(r.status(), 200, await r.text());
  return r.json();
}
try {
  const { p, c } = await create();
  await p.getByRole("button", { name: /体力.*打开行前手札/ }).click();
  const position = (await read(p)).player;
  for (const [width, height] of [
    [1440, 900],
    [1920, 1080],
    [768, 1024],
    [390, 844],
    [720, 450],
  ]) {
    await p.setViewportSize({ width, height });
    await shot(p, `pledge-${width}`);
    const buttons = await p
      .locator(".training-page button:visible")
      .evaluateAll((es) =>
        es.map((e) => ({
          name: e.textContent,
          w: e.getBoundingClientRect().width,
          h: e.getBoundingClientRect().height,
        })),
      );
    assert.ok(
      buttons.every((b) => b.w >= 44 && b.h >= 44),
      JSON.stringify(buttons),
    );
  }
  await p.setViewportSize({ width: 1440, height: 900 });
  await p.keyboard.press("ArrowRight");
  assert.deepEqual((await read(p)).player, position);
  await p.locator(".training-pledge summary").click();
  const title = p.getByLabel("约定名称");
  await title.fill("林间散步与舒展");
  await title.dispatchEvent("compositionstart");
  await p.keyboard.press("i");
  await title.dispatchEvent("compositionend");
  assert.equal((await read(p)).mode, "training");
  await title.fill("林间散步与舒展");
  await p.getByRole("button", { name: "立下今日约定 · 10 分钟" }).click();
  await until(p, (s) => s.exerciseTasks?.length === 1, "pledge persisted");
  await shot(p, "active-1440");
  await p.reload();
  await p.getByRole("button", { name: "记下一次锻炼" }).click();
  await p.getByLabel("实际运动分钟数").fill("4");
  expectedNetworkFailure = true;
  await p.route("**/api/command", (r) => r.abort("failed"));
  await p.getByRole("button", { name: "保存运动记录", exact: true }).click();
  await p.getByRole("alert").waitFor();
  assert.match(await p.getByRole("alert").innerText(), /暂时连接不上/);
  assert.equal(await p.getByLabel("实际运动分钟数").inputValue(), "4");
  await shot(p, "failed-record");
  await p.unroute("**/api/command");
  let lost = false;
  await p.route("**/api/command", async (r) => {
    if (r.request().postDataJSON().action === "exercise_record" && !lost) {
      lost = true;
      await r.fetch();
      await r.abort("failed");
    } else await r.continue();
  });
  await p.getByRole("button", { name: "保存运动记录", exact: true }).click();
  await until(
    p,
    (s) => s.exerciseTasks?.[0].minutes === 4,
    "lost response retry",
  );
  assert.equal((await read(p)).xp, 4);
  assert.equal((await read(p)).healthPoints, 0);
  await p.unroute("**/api/command");
  expectedNetworkFailure = false;
  await command(c, "activity", {
    kind: "exercise",
    amount: 6,
    note: "傍晚的另一段散步",
  });
  await p.reload();
  await p.getByText("关联当天已有的运动记录（1）").click();
  await p.getByRole("button", { name: /傍晚的另一段散步/ }).click();
  await until(p, (s) => s.healthPoints === 1, "one health reward");
  assert.equal((await read(p)).xp, 10);
  await shot(p, "completed-1440");
  const snap = (await (await c.request.get(base + "/api/state")).json()).state;
  const record = snap.activities.find((a) => a.amount === 6);
  await command(c, "exercise_link", {
    task_id: snap.exercise_task_log[0].id,
    activity_id: record.id,
  });
  assert.equal(
    (await (await c.request.get(base + "/api/state")).json()).state
      .health_points,
    1,
  );
  let release;
  const gate = new Promise((r) => (release = r));
  await p.route("**/api/command", async (r) => {
    if (r.request().postDataJSON().action === "health_spend") await gate;
    await r.continue();
  });
  await p.getByRole("button", { name: "投入 1 健康点 · 提升体力" }).click();
  await p.getByRole("button", { name: "正在结算…" }).waitFor();
  assert.ok(await p.getByRole("button", { name: "正在结算…" }).isDisabled());
  await shot(p, "pending-investment");
  release();
  await until(p, (s) => s.healthInvested === 1, "invest point");
  await p.unroute("**/api/command");
  assert.equal((await read(p)).stamina.max, 105);
  assert.equal((await read(p)).healthPoints, 0);
  await p.reload();
  await until(p, (s) => s.stamina?.max === 105, "restore capacity");
  await shot(p, "invested-1440");
  await p.setViewportSize({ width: 390, height: 844 });
  await shot(p, "completed-390");
  await p.locator(".training-cultivate").scrollIntoViewIfNeeded();
  await shot(p, "cultivate-390");
  await p.setViewportSize({ width: 1440, height: 900 });
  await p.keyboard.press("Escape");
  await until(p, (s) => s.mode === "explore", "escape");
  assert.ok(
    await p
      .getByRole("button", { name: "现实成长", exact: true })
      .evaluate((e) => e === document.activeElement),
  );
  await clickWorld(p, 328, 352);
  await until(p, (s) => s.inventory.wood === 3, "real gathering");
  assert.equal((await read(p)).stamina.current, 101);
  await shot(p, "gather-1440");
  await clickWorld(p, 160, 180);
  await until(p, (s) => s.location === "home", "enter home");
  await p.waitForTimeout(450);
  const bed = (await read(p)).objects.find((o) => o.id === "home_bed");
  await clickWorld(p, bed.x, bed.y - 8);
  await until(
    p,
    (s) => s.stamina.current === 105 && s.events.includes("rested_home"),
    "bed rest",
  );
  await shot(p, "rested-1440");
  // A separate test save supplies the zero-stamina edge, never an owner database.
  const db = process.env.REALQUEST_TEST_DB;
  if (db) {
    assert.ok(
      db.endsWith("/output/health-stamina/test.db"),
      "fixture DB must be this task isolated DB",
    );
    const save = (await (await c.request.get(base + "/api/state")).json())
      .save_id;
    execFileSync(
      new URL("../../backend/.venv/bin/python", import.meta.url).pathname,
      [
        "-c",
        `import sqlite3,json,time,sys\nc=sqlite3.connect(sys.argv[1]); row=c.execute('select state from players where id=?',(sys.argv[2],)).fetchone(); s=json.loads(row[0]);s['stamina'].update(current=0,updated_at=time.time());s['location']='overworld';s['position']={'x':304,'y':384};s['gathered']={};c.execute('update players set state=? where id=?',(json.dumps(s),sys.argv[2]));c.commit()`,
        db,
        save,
      ],
    );
    await p.reload();
    await until(
      p,
      (s) => s.interaction?.reason?.includes("体力不足"),
      "exhausted prompt",
    );
    assert.ok(await p.locator(".interact").isDisabled());
    await shot(p, "exhausted-1440");
    await p.getByRole("button", { name: /体力.*打开行前手札/ }).click();
    await p
      .getByRole("button", { name: "标记家里的床", exact: true })
      .filter({ visible: true })
      .click();
    await until(
      p,
      (s) => s.mode === "explore" && s.navigation?.targetId === "home_bed",
      "bed direction",
    );
    assert.equal(
      (await read(p)).location,
      "overworld",
      "navigation does not teleport",
    );
    assert.equal(
      new URL(p.url()).hash,
      "",
      "world navigation clears journal URL",
    );
  }
  const touch = await create({
    viewport: { width: 375, height: 812 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    reducedMotion: "reduce",
  });
  await touch.p.getByRole("button", { name: "现实成长", exact: true }).tap();
  await touch.p.getByRole("button", { name: "行前手札", exact: true }).tap();
  await shot(touch.p, "touch-375");
  await touch.p.locator(".training-pledge summary").tap();
  await touch.p.getByLabel("约定名称").fill("按自己的节奏-" + "A".repeat(60));
  await touch.p.getByRole("button", { name: "20 分钟", exact: true }).tap();
  await touch.p.getByRole("button", { name: "立下今日约定 · 20 分钟" }).tap();
  await until(touch.p, (s) => s.exerciseTasks?.length === 1, "touch pledge");
  await touch.p.setViewportSize({ width: 844, height: 390 });
  await shot(touch.p, "touch-844");
  await touch.p.getByRole("button", { name: "记下一次锻炼" }).tap();
  await touch.p.getByLabel("实际运动分钟数").fill("20");
  await touch.p
    .getByRole("button", { name: "保存运动记录", exact: true })
    .tap();
  await until(touch.p, (s) => s.healthPoints === 1, "landscape touch reward");
  await touch.p.getByRole("button", { name: "投入 1 健康点 · 提升体力" }).tap();
  await until(
    touch.p,
    (s) => s.stamina?.max === 105,
    "landscape touch investment",
  );
  await shot(touch.p, "touch-invested-844");
  await touch.p.setViewportSize({ width: 390, height: 844 });
  await touch.p.getByText("翻阅以前的约定", { exact: true }).tap();
  await shot(touch.p, "long-title-390");
  await touch.p.setViewportSize({ width: 844, height: 390 });
  await touch.p
    .locator(".training-page")
    .evaluate((e) => (e.style.fontSize = "20px"));
  await shot(touch.p, "large-text-landscape");
  assert.deepEqual(errors, []);
  await fs.writeFile(
    new URL("browser-results.json", out),
    JSON.stringify({ shots, errors, fixtures: !!db }, null, 2),
  );
  console.log(
    JSON.stringify({ passed: true, captures: shots.length, fixtures: !!db }),
  );
} finally {
  for (const c of contexts) {
    for (const p of c.pages())
      await p.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
    await c.request.delete(base + "/api/session").catch(() => {});
    await c.close();
  }
  await browser.close();
}
