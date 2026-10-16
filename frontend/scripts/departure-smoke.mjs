import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
const base = process.env.REALQUEST_URL || "http://127.0.0.1:5402";
const out = new URL("../../output/departure/", import.meta.url);
const db = process.env.REALQUEST_TEST_DB;
assert.equal(
  db,
  new URL("test.db", out).pathname,
  "Seed only this task’s explicit isolated test DB",
);
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const contexts = [],
  errors = [],
  checks = [],
  shots = [];
let page,
  save,
  world,
  expectedRejection = false;
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
  for (let n = 0; n < 200; n++) {
    if (await fn()) return;
    await page.waitForTimeout(75);
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
  await page.waitForTimeout(350);
}
async function shot(name) {
  await page.waitForTimeout(250);
  await page.screenshot({ path: new URL(name + ".png", out).pathname });
  shots.push(name);
}
function check(name) {
  checks.push(name);
  console.log("PASS " + name);
}
async function seed(patch) {
  await page.goto("about:blank");
  execFileSync(
    new URL("../../backend/.venv/bin/python", import.meta.url).pathname,
    [
      "-c",
      `
import sqlite3,json,sys,time
p,key,patch=sys.argv[1:];assert p.endswith('/output/departure/test.db')
c=sqlite3.connect(p);s=json.loads(c.execute('select state from players where id=?',(key,)).fetchone()[0]);s.update(json.loads(patch));s['revision']+=1
if 'world_clock' in s:s['world_clock'].update(updated_at=time.time(),running_until=0)
c.execute('update players set state=? where id=?',(json.dumps(s),key));c.commit();c.close()
`,
      db,
      save,
      JSON.stringify(patch),
    ],
  );
  await load();
}
// Setup walks use only public move commands over the authoritative colliders.
// Actual travel, selection, NPC service, bed and map interaction use browser UI.
async function near(id) {
  await page.goto("about:blank");
  let s = await state();
  const m =
    s.location === "overworld"
      ? world
      : world.areas[s.location] || world.interiors[s.location];
  const o = m.objects.find((o) => o.id === id);
  assert(o, id);
  const pass = (x, y) =>
    x >= 24 &&
    x <= m.width - 24 &&
    y >= 32 &&
    y <= m.height - 24 &&
    !m.obstacles.some(
      ([a, b, w, h]) =>
        x > a - 9 && x < a + w + 9 && y > b - 7 && y < b + h + 7,
    );
  const start = [
      Math.round(s.position.x / 8) * 8,
      Math.round(s.position.y / 8) * 8,
    ],
    key = (p) => p.join(",");
  const queue = [start],
    parent = new Map(),
    seen = new Set([key(start)]);
  let found;
  for (let i = 0; i < queue.length; i++) {
    const a = queue[i];
    if (Math.hypot(a[0] - o.x, a[1] - o.y) <= 58) {
      found = a;
      break;
    }
    for (const [dx, dy] of [
      [8, 0],
      [-8, 0],
      [0, 8],
      [0, -8],
    ]) {
      const p = [a[0] + dx, a[1] + dy];
      if (!seen.has(key(p)) && pass(...p)) {
        seen.add(key(p));
        parent.set(key(p), a);
        queue.push(p);
      }
    }
  }
  assert(found, "reachable " + id);
  const path = [];
  let at = found;
  while (parent.has(key(at))) {
    path.unshift(at);
    at = parent.get(key(at));
  }
  // Consolidate only straight runs, under the public move distance cap.
  for (let i = 0; i < path.length;) {
    let j = i;
    const prev = i ? path[i - 1] : start,
      dx = path[i][0] - prev[0],
      dy = path[i][1] - prev[1];
    while (
      j + 1 < path.length &&
      j - i < 18 &&
      path[j + 1][0] - path[j][0] === dx &&
      path[j + 1][1] - path[j][1] === dy
    )
      j++;
    await command("move", {
      x: path[j][0],
      y: path[j][1],
      location: s.location,
    });
    i = j + 1;
  }
  await load();
  const t = await read();
  assert.equal(t.sceneLocation, s.location);
  if (await page.evaluate(() => matchMedia("(pointer: coarse)").matches)) {
    await until(
      async () => (await read()).nearest?.id === id,
      "touch interaction anchor",
    );
    await page.locator(".interact").tap();
  } else {
    const b = await page.locator("canvas").boundingBox();
    await page.mouse.click(
      b.x + (o.x - t.camera.viewX) * t.camera.zoom,
      b.y + (o.y - t.camera.viewY) * t.camera.zoom,
    );
  }
  await until(
    async () => ["travel", "sleep", "board"].includes((await read()).mode),
    "open " + id,
  );
}
async function choice(label) {
  await page
    .getByRole("region", { name: label, exact: true })
    .getByRole("button")
    .click();
  await page.waitForTimeout(200);
}
async function arrive(location) {
  await until(
    async () =>
      (await read()).location === location &&
      (await read()).sceneLocation === location,
    "arrive " + location,
  );
  await page.waitForTimeout(300);
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
    if (m.type() === "error" && !expectedRejection) errors.push(m.text());
  });
  await page.goto(base);
  await page.getByRole("button", { name: "进入回响大陆", exact: true }).click();
  await page.locator("canvas").waitFor();
  let r = await (await page.request.post(base + "/api/session")).json();
  save = r.save_id;
  world = r.world;
  const inv = { ...r.state.inventory, gold: 20 },
    quests = {
      ...r.state.quests,
      settle_in: { status: "claimed", accepted_at: 0 },
    };
  await seed({
    position: { x: 256, y: 296 },
    quests,
    inventory: inv,
    events: ["visited_home"],
    stats: { wood: 3 },
  });
  await near("board");
  const q = page.locator(".quest-card").filter({ hasText: "山那边，灯火正亮" });
  // Quest list buttons are scoped by their containing task when available.
  const accept = page.getByRole("button", { name: "接取任务", exact: true });
  if (await q.count())
    await q.getByRole("button", { name: "接取任务", exact: true }).click();
  else await accept.last().click();
  await until(
    async () => (await state()).quests.leave_valley?.status === "active",
    "main quest accepted",
  );
  check("existing save accepts departure after settle-in");
  await page.keyboard.press("Escape");
  await near("village_departure");
  await shot("01-departure");
  await choice("走向苇风渡口");
  await arrive("crossing");
  await shot("02-crossing-world");
  await near("river_bridge");
  assert(
    await page
      .getByRole("region", { name: "亲手修复旧桥", exact: true })
      .getByRole("button")
      .isDisabled(),
  );
  await shot("03-bridge-shortfalls");
  await page.keyboard.press("Escape");
  await near("adu");
  await shot("04-adu-services");
  await choice("购置登山绳索");
  assert.equal((await state()).inventory.gold, 14);
  await choice("乘船到东岸");
  await arrive("mountain");
  assert.equal((await state()).inventory.gold, 8);
  check("unique boatman, rope and ferry payments reach east bank");
  await shot("05-mountain-world");
  await near("mountain_pass");
  await shot("06-climb-quote");
  await choice("翻越苍脊山脉");
  await arrive("city");
  assert.equal((await state()).stamina.current, 40);
  await shot("07-city-world");
  check("mountain checks current stamina and changes map");
  await page.keyboard.press("m");
  await page.getByRole("region", { name: "离村远行地图" }).waitFor();
  await shot("08-journey-atlas");
  await page
    .getByRole("button", { name: /苇风渡口/ })
    .first()
    .click();
  assert((await read()).navigation);
  assert.equal((await read()).location, "city");
  check("cross-region map marks direction without teleporting");
  await near("to_inn");
  await choice("进入灯穗旅店");
  await arrive("inn");
  await shot("09-inn-world");
  await near("inn_bed");
  assert(
    await page.getByRole("button", { name: "请先向岚姨订房" }).isDisabled(),
  );
  await shot("10-unpaid-bed");
  await page.keyboard.press("Escape");
  await near("lanya");
  await shot("11-lanya-services");
  await choice("交付村庄来信");
  assert.equal((await state()).inventory.gold, 20);
  assert(
    await page
      .getByRole("region", { name: "交付村庄来信", exact: true })
      .getByRole("button")
      .isDisabled(),
  );
  // Drop a response after the server commits; the client must replay the same receipt.
  let drops = 0;
  await page.route("**/api/command", async (route) => {
    const b = route.request().postDataJSON();
    if (b.action === "travel" && b.data.option === "book" && drops++ === 0) {
      await route.fetch();
      expectedRejection = true;
      await route.abort("failed");
    } else await route.continue();
  });
  await choice("订下今晚的客房");
  await until(
    async () => (await state()).departure.booking_day === 1,
    "paid booking",
  );
  await page.unroute("**/api/command");
  expectedRejection = false;
  assert.equal((await state()).inventory.gold, 12);
  await shot("12-booked-once");
  check("letter and retried room payment settle once");
  await page.keyboard.press("Escape");
  await near("inn_bed");
  await page.getByRole("button", { name: "睡到明早 · 房费已付" }).click();
  await until(
    async () => (await state()).world_clock.last_night?.kind === "sleep",
    "inn morning",
  );
  await arrive("inn");
  assert.equal((await state()).stamina.current, 100);
  await shot("13-inn-morning");
  check("paid inn sleep wakes in inn with restored stamina");
  await page.reload();
  await page.locator("canvas").waitFor();
  await page.waitForTimeout(500);
  assert.equal((await read()).location, "inn");
  assert((await read()).events.includes("slept_inn"));
  check("city bed and quest progress persist on reload");
  await near("inn_exit");
  await choice("回到南门街");
  await arrive("city");
  await near("to_mountain");
  await choice("翻山返回东岸");
  await arrive("mountain");
  await near("to_crossing");
  await choice("返回西岸渡口");
  await arrive("crossing");
  await near("to_village");
  await choice("回到回响村庄");
  await arrive("overworld");
  await near("board");
  await page
    .getByRole("button", { name: "交付任务 · 领取奖励", exact: true })
    .click();
  await until(
    async () => (await state()).quests.leave_valley.status === "claimed",
    "return claim",
  );
  assert.equal((await state()).quests.leave_valley.status, "claimed");
  assert.equal((await state()).inventory.gold, 26);
  await shot("14-return-claim");
  check("return chapter claims once and preserves home");
  // Independent bridge fixture, no change to any real player save.
  await seed({
    location: "crossing",
    position: { x: 400, y: 272 },
    inventory: { ...inv, gold: 20, plank: 6, stone: 4 },
    departure: {
      bridge_repaired: false,
      rope_ready: true,
      letter_delivered: true,
      booking_day: 1,
    },
    world_clock: {
      version: 2,
      start_minute: 360,
      elapsed: 1800,
      updated_at: 0,
      running_until: 0,
      day_seconds: 1800,
      last_night: null,
    },
  });
  await near("river_bridge");
  await choice("请工匠一起修桥");
  assert((await state()).departure.bridge_repaired);
  assert.equal((await state()).inventory.gold, 10);
  await shot("15-bridge-built");
  await choice("走过旧桥");
  await arrive("mountain");
  await near("to_crossing");
  await choice("返回西岸渡口");
  await arrive("crossing");
  assert.equal((await state()).inventory.gold, 10);
  check("assisted bridge persists and is free both directions");
  await seed({
    location: "mountain",
    position: { x: 720, y: 208 },
    stamina: { current: 59, max: 150, updated_at: Date.now() / 1000 },
  });
  await near("mountain_pass");
  assert(
    await page
      .getByRole("region", { name: "翻越苍脊山脉", exact: true })
      .getByRole("button")
      .isDisabled(),
  );
  await shot("16-insufficient-stamina");
  check("stamina shortfall visible even with raised capacity");
  await seed({
    location: "city",
    position: { x: 352, y: 288 },
    inventory: { ...inv, gold: 0 },
    stamina: { current: 100, max: 100, updated_at: Date.now() / 1000 },
  });
  await near("to_inn");
  await choice("进入灯穗旅店");
  await arrive("inn");
  await near("lanya");
  assert(
    await page
      .getByRole("region", { name: "订下今晚的客房", exact: true })
      .getByRole("button")
      .isDisabled(),
  );
  await choice("帮旅店整理布草");
  await choice("订下今晚的客房");
  assert.equal((await state()).inventory.gold, 4);
  check("no money has reachable work and paid room fallback");
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 844, height: 390 });
  await near("lanya");
  await shot("17-landscape-services");
  await choice("吃一份热食");
  assert.equal((await state()).inventory.gold, 1);
  await shot("20-landscape-scrolled-action");
  await page.keyboard.press("Escape");
  await page.keyboard.press("e");
  await page.getByRole("region", { name: "旅途安排", exact: true }).waitFor();
  const frozen = (await read()).player;
  await page.keyboard.down("ArrowRight");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(220);
  assert.deepEqual((await read()).player, frozen, "held key cleared on close");
  await page.keyboard.up("ArrowRight");
  assert.equal((await read()).keyboardListeners, 1);
  await page.keyboard.press("e");
  await page.getByRole("region", { name: "旅途安排", exact: true }).waitFor();
  await page.keyboard.press("Escape");
  await page.keyboard.press("m");
  await shot("18-landscape-atlas");
  assert.equal((await read()).canvasCount, 1);
  check("landscape scroll-to-action, keyboard focus and held input ownership");
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 1440, height: 900 });
  const desktopPage = page;
  await desktopPage.goto("about:blank");
  const touch = await browser.newContext({
    viewport: { width: 844, height: 390 },
    deviceScaleFactor: 2,
    hasTouch: true,
    reducedMotion: "reduce",
    storageState: await c.storageState(),
  });
  contexts.push(touch);
  page = await touch.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await near("lanya");
  await page
    .getByRole("region", { name: "订下今晚的客房", exact: true })
    .getByRole("button")
    .scrollIntoViewIfNeeded();
  await shot("21-touch-lodging");
  await page.getByRole("button", { name: "关闭面板", exact: true }).tap();
  await near("inn_bed");
  const sleepButton = page.getByRole("button", {
    name: "睡到明早 · 房费已付",
    exact: true,
  });
  await sleepButton.scrollIntoViewIfNeeded();
  const box = await sleepButton.boundingBox();
  assert(box.height >= 44);
  await sleepButton.tap();
  await until(
    async () => (await state()).world_clock.last_night?.day === 2,
    "touch inn sleep",
  );
  await shot("22-touch-morning");
  assert.equal(
    await page.locator(".quest-compass").isVisible(),
    false,
    "morning does not overlap short-screen quest compass",
  );
  await page.getByRole("button", { name: "收起今晨状态", exact: true }).tap();
  await until(
    async () => await page.locator(".quest-compass").isVisible(),
    "quest compass returns after dismiss",
  );
  await shot("23-touch-dismissed");
  assert.equal((await read()).canvasCount, 1);
  assert.equal((await read()).location, "inn");
  check("DPR2 touch landscape, reduced motion and paid sleep action");
  await touch.close();
  contexts.splice(contexts.indexOf(touch), 1);
  page = desktopPage;
  await load();
  const s = await state();
  await seed({
    location: "city",
    position: { x: 160, y: 480 },
    stamina: { current: 17, max: 100, updated_at: Date.now() / 1000 },
    vitality: { current: 75, max: 100 },
    world_clock: {
      ...s.world_clock,
      elapsed: ((2 - 1) * 1440 + 1499 - 360) * 1.25,
      updated_at: 0,
      running_until: 0,
      last_night: null,
    },
  });
  await until(
    async () => (await state()).world_clock.last_night?.kind === "faint",
    "city faint",
  );
  assert.equal((await state()).location, "home");
  assert.equal((await state()).stamina.current, 17);
  assert.equal((await state()).vitality.current, 65);
  await shot("19-city-faint-home");
  check("city 01:00 faint returns home without stamina recovery");
  assert.deepEqual(errors, []);
  await fs.writeFile(
    new URL("report.json", out),
    JSON.stringify({ checks, shots, errors }, null, 2),
  );
} finally {
  for (const c of contexts) await c.close();
  await browser.close();
}
