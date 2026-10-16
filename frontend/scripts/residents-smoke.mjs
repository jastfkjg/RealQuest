import { execFileSync } from "node:child_process";
import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";

const base = process.env.REALQUEST_URL || "http://127.0.0.1:5295";
const out = new URL("../../output/npc-life/", import.meta.url);
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
  await page.waitForFunction(
    () =>
      window.render_game_to_text &&
      JSON.parse(window.render_game_to_text()).canvasCount === 1,
  );
  await page.waitForTimeout(450);
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

const clockFile = new URL("clock-offset.txt", out);
let world;
async function openNpc(id) {
  if (page.url() === "about:blank") await reload();
  let snapshot = await read();
  const npc = snapshot.residentLocations.find((r) => r.id === id);
  if (snapshot.location !== "overworld" && snapshot.location !== npc.location) {
    await walk(world.interiors[snapshot.location], 240, 328);
    await command("exit", { target: snapshot.location + "_exit" });
    await reload();
    snapshot = await read();
  }
  if (npc.location !== "overworld" && snapshot.location !== npc.location) {
    const door = world.objects.find((o) => o.id === npc.location);
    await walk(world, door.x, door.y + 8);
    await command("enter", { target: npc.location });
  }
  await walk(
    npc.location === "overworld" ? world : world.interiors[npc.location],
    npc.x,
    npc.y + 40,
  );
  await reload();
  await until(async () => (await read()).nearest?.id === id, "nearest " + id);
  await page.keyboard.press("e");
  await page.getByRole("dialog").waitFor();
  if (id === "noah")
    await page.getByRole("button", { name: "邻里日常", exact: true }).click();
  if (id === "mira" && npc.location === "shop")
    await page.getByRole("button", { name: "邻里日常", exact: true }).click();
  await page
    .getByRole("region", {
      name:
        (id === "lia" ? "莉亚" : id === "noah" ? "诺亚" : "米拉") +
        "的邻里日常",
    })
    .waitFor();
}
async function closeNpc() {
  await page.keyboard.press("Escape");
  await until(async () => !(await state()).npc_encounter, "encounter release");
}
async function outdoors() {
  const s = await state();
  if (s.location !== "overworld") {
    await walk(world.interiors[s.location], 240, 328);
    await command("exit", { target: s.location + "_exit" });
  }
}
async function villageTime(minute, cycles = 0) {
  await page.goto("about:blank");
  const save = (await (await page.request.post(base + "/api/session")).json())
    .save_id;
  execFileSync(
    new URL("../../backend/.venv/bin/python", import.meta.url).pathname,
    [
      "-c",
      `import json,sqlite3,sys,time
p=sys.argv[1];assert p.endswith('/output/npc-life/test.db')
c=sqlite3.connect(p);s=json.loads(c.execute('select state from players where id=?',(sys.argv[2],)).fetchone()[0])
s['world_clock']={'elapsed':float(sys.argv[3]),'updated_at':time.time(),'running_until':0,'day_seconds':1800};s['npc_encounter']=None
c.execute('update players set state=? where id=?',(json.dumps(s),sys.argv[2]));c.commit();c.close()`,
      new URL("test.db", out).pathname,
      save,
      String((minute - 510) * 1.25 + cycles * 1800),
    ],
  );
  await reload();
}
try {
  const fixture = await fetch(base + "/api/npc-fixture");
  assert.equal(
    fixture.status,
    200,
    "Explicit isolated NPC fixture server required",
  );
  assert.equal((await fixture.json()).fixture, "npc-life-v1");
  await fs.writeFile(clockFile, "0");
  const c = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: new URL("videos/", out).pathname },
  });
  contexts.push(c);
  page = await c.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (
      m.type() === "error" &&
      !m.text().includes("422") &&
      !m.text().includes("ERR_FAILED")
    )
      errors.push(m.text());
  });
  await page.goto(base);
  await page.locator("#start-btn").click();
  await page.locator("canvas").waitFor();
  world = (await (await page.request.post(base + "/api/session")).json()).world;
  await shot("morning-village");
  for (const id of ["lia", "noah", "mira"]) {
    await openNpc(id);
    const s = await read();
    assert.ok(
      s.npcs.some((n) => n.id === id && n.texture === `villager-${id}`),
    );
    const before = await state();
    const social = page.getByRole("region", {
      name:
        (id === "lia" ? "莉亚" : id === "noah" ? "诺亚" : "米拉") +
        "的邻里日常",
    });
    await social
      .getByRole("button", { name: "你喜欢什么", exact: true })
      .click();
    await until(
      async () =>
        (await read()).notice.includes(
          id === "lia" ? "木板" : id === "noah" ? "萝卜" : "萝卜",
        ),
      "interest topic",
    );
    await social.getByRole("combobox").selectOption("seed");
    if (id === "lia") {
      let rejected = false;
      await page.route("**/api/command", async (route) => {
        if (
          !rejected &&
          route.request().postDataJSON()?.action === "npc_gift"
        ) {
          rejected = true;
          await route.fulfill({
            status: 422,
            contentType: "application/json",
            body: JSON.stringify({ detail: "测试：礼物未能交付，请重试" }),
          });
        } else await route.continue();
      });
      await social
        .getByRole("button", { name: "送出 1 份", exact: true })
        .click();
      await page
        .getByText("测试：礼物未能交付，请重试", { exact: true })
        .waitFor();
      assert.equal((await state()).inventory.seed, before.inventory.seed);
      await shot("lia-gift-rejected");
      await page.unroute("**/api/command");
      let lost = false;
      await page.route("**/api/command", async (route) => {
        if (!lost && route.request().postDataJSON()?.action === "npc_gift") {
          lost = true;
          const response = await route.fetch();
          assert.equal(response.status(), 200);
          await route.abort("failed");
        } else await route.continue();
      });
    }
    await social
      .getByRole("button", { name: "送出 1 份", exact: true })
      .click();
    await social
      .getByRole("button", { name: "今天已送过", exact: true })
      .waitFor();
    await page.unroute("**/api/command");
    assert.equal((await state()).inventory.seed, before.inventory.seed - 1);
    await social
      .getByRole("button", { name: "搭把手 · 4 体力", exact: true })
      .click();
    await social
      .getByRole("button", { name: "今天已一起忙过", exact: true })
      .waitFor();
    assert.equal((await state()).relationships[id], 3);
    assert.equal(
      await social
        .getByRole("button", { name: "心里的故事 · 熟悉度 5", exact: true })
        .isDisabled(),
      true,
    );
    const position = (await read()).player;
    await page.keyboard.press("ArrowRight");
    assert.deepEqual((await read()).player, position);
    const buttons = page.locator(
      "dialog button:visible:not(:disabled),dialog select:visible:not(:disabled)",
    );
    await buttons.last().focus();
    await page.keyboard.press("Tab");
    assert.equal(
      await buttons.first().evaluate((e) => e === document.activeElement),
      true,
    );
    const reveal = page.getByRole("button", {
      name: "显示完整对话",
      exact: true,
    });
    if (await reveal.count()) await reveal.first().click();
    await page.locator("dialog").evaluate((e) => {
      e.scrollTop = 0;
      const body = e.querySelector(".modal-body");
      if (body) body.scrollTop = 0;
    });
    await shot(id + "-daily");
    await closeNpc();
  }
  checks.push(
    "all three unique actors, topics, finite gifts/help, rejection and committed-response retry, focus and world input isolation",
  );
  await reload();
  await page.getByRole("button", { name: "查看村民近况和日常作息" }).click();
  for (const name of ["莉亚", "诺亚", "米拉"]) {
    await page.getByRole("button", { name: new RegExp(name) }).click();
    await shot("roster-" + { 莉亚: "lia", 诺亚: "noah", 米拉: "mira" }[name]);
  }
  const beforeMarker = await state();
  await page
    .getByRole("button", { name: "标记方向并返回", exact: true })
    .click();
  assert.deepEqual((await state()).position, beforeMarker.position);
  assert.equal((await read()).navigation.targetId, "mira");
  await page.keyboard.press("m");
  await page.getByRole("button", { name: /选择米拉，/ }).click();
  await shot("map-mira-inside");
  await page.keyboard.press("Escape");
  checks.push(
    "resident book, actual room locations and non-teleporting live map markers",
  );
  await villageTime(11 * 60 + 8);
  let routeBefore = (await read()).residentLocations.find(
    (n) => n.id === "noah",
  );
  assert.equal(routeBefore.walking, true);
  await page.getByRole("button", { name: "查看村民近况和日常作息" }).click();
  await until(
    async () => (await read()).worldClock.running_until === 0,
    "reading pauses world",
  );
  const paused = (await read()).residentLocations;
  await page.waitForTimeout(1200);
  assert.deepEqual((await read()).residentLocations, paused);
  await page.keyboard.press("Escape");
  await until(
    async () => (await read()).worldClock.running_until > 0,
    "world resumes",
  );
  await page.waitForTimeout(1200);
  const routeAfter = (await read()).residentLocations.find(
    (n) => n.id === "noah",
  );
  assert.ok(
    Math.hypot(routeAfter.x - routeBefore.x, routeAfter.y - routeBefore.y) > 10,
  );
  // Follow the moving guide in the actual scene for a visible walking capture.
  await outdoors();
  await walk(world, routeAfter.x, routeAfter.y);
  await reload();
  await shot("noah-walking");
  checks.push(
    "server-derived continuous outdoor movement; reading pauses world; explicit game-time fixture",
  );
  await page.goto("about:blank");
  await until(
    async () => (await state()).world_clock.running_until === 0,
    "pagehide pauses world",
  );
  const offline = (await state()).world_clock.elapsed;
  await page.waitForTimeout(1200);
  assert.equal((await state()).world_clock.elapsed, offline);
  checks.push(
    "leaving page pauses game time; real-time deadlines remain independent",
  );
  await villageTime(13 * 60 + 30);
  await outdoors();
  await walk(world, 640, 352);
  await reload();
  await shot("neighbors-midday");
  const midday = (await read()).residentLocations;
  assert.equal(
    midday.filter((n) => n.location === "overworld" && n.y < 330 && n.x < 750)
      .length,
    3,
  );
  await openNpc("mira");
  await shot("mira-outside");
  await closeNpc();
  // Store remains usable while Mira is outdoors; use only public door/position commands.
  await walk(world, 832, 696);
  await command("enter", { target: "shop" });
  await walk(world.interiors.shop, 240, 232);
  await reload();
  await page.keyboard.press("e");
  await page.getByRole("dialog", { name: "风铃杂货铺" }).waitFor();
  await page.getByRole("button", { name: "我要买", exact: true }).click();
  let previous = await state();
  await page
    .getByRole("button", { name: "确认买入 1 份种子", exact: true })
    .click();
  await until(
    async () => (await state()).inventory.gold === previous.inventory.gold - 2,
    "unattended purchase",
  );
  await shot("unattended-counter");
  await page.keyboard.press("Escape");
  checks.push(
    "midday gathering, Mira outdoor encounter and unattended store purchase",
  );
  // CST next day, same village phase: no relationship decay, real daily flags reset.
  await page.goto("about:blank");
  const offset = Number(await fs.readFile(clockFile, "utf8"));
  await fs.writeFile(clockFile, String(offset + 86400));
  await reload();
  await openNpc("mira");
  const social = page.getByRole("region", { name: "米拉的邻里日常" });
  await social.getByRole("combobox").selectOption("seed");
  await social.getByRole("button", { name: "送出 1 份", exact: true }).click();
  await social
    .getByRole("button", { name: "今天已送过", exact: true })
    .waitFor();
  assert.equal((await state()).relationships.mira, 5);
  await social.getByRole("button", { name: "心里的故事", exact: true }).click();
  await until(
    async () => (await read()).notice.includes("第一天只卖出"),
    "unlocked memory",
  );
  await shot("mira-memory");
  await closeNpc();
  await reload();
  assert.equal((await state()).relationships.mira, 5);
  checks.push("real-day reset, friendship story unlock and reload persistence");
  await villageTime(21 * 60);
  await openNpc("noah");
  await shot("noah-evening-guild");
  await page.getByRole("button", { name: "现实委托", exact: true }).click();
  await shot("noah-commission-away");
  await page.getByRole("button", { name: "领取这份委托", exact: true }).click();
  await until(
    async () =>
      Object.values((await state()).life_tasks).some(
        (t) => t.status === "active",
      ),
    "indoor commission acceptance",
  );
  await closeNpc();
  await page.goto("about:blank");
  const commissionOffset = Number(await fs.readFile(clockFile, "utf8"));
  await fs.writeFile(clockFile, String(commissionOffset + 3601));
  await reload();
  await openNpc("noah");
  await page.getByRole("button", { name: "现实委托", exact: true }).click();
  await page
    .getByRole("button", { name: /结算.*领取|收下.*成长|结算委托/ })
    .click();
  await until(
    async () => (await state()).knowledge_points === 1,
    "indoor commission claim",
  );
  await shot("noah-indoor-receipt");
  await closeNpc();
  const storage = await c.storageState();
  const touch = await browser.newContext({
    viewport: { width: 844, height: 390 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
    reducedMotion: "reduce",
    storageState: storage,
    recordVideo: { dir: new URL("videos/", out).pathname },
  });
  contexts.push(touch);
  page = await touch.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await reload();
  await page.getByRole("button", { name: "查看村民近况和日常作息" }).tap();
  await shot("roster-landscape-dpr2");
  await page.getByRole("button", { name: /诺亚/ }).tap();
  const marker = page.getByRole("button", {
    name: "标记方向并返回",
    exact: true,
  });
  await marker.scrollIntoViewIfNeeded();
  await marker.tap();
  await openNpc("noah");
  await shot("noah-landscape-dpr2");
  const topics = page.getByRole("group", { name: "邻里话题" });
  await topics.getByRole("button", { name: "平时去哪儿", exact: true }).tap();
  await shot("noah-landscape-topic");
  assert.ok(
    await page
      .locator("dialog")
      .evaluate((e) => e.scrollWidth <= e.clientWidth + 2),
  );
  await page.keyboard.press("Escape");
  checks.push(
    "evening indoor guide, existing reality commission surface, DPR2 touch landscape and reduced motion",
  );
  assert.deepEqual(errors, []);
  await fs.writeFile(
    new URL("result.json", out),
    JSON.stringify({ checks, captures, errors }, null, 2),
  );
  console.log(
    "PASS resident flows; " +
      captures.length +
      " captures; no unexpected errors",
  );
} finally {
  await fs.writeFile(clockFile, "0");
  for (const c of contexts) await c.close();
  await browser.close();
}
