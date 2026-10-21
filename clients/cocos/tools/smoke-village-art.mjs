import { browserConfig, launchBrowser, closeBrowser } from "../../../tools/cocos-browser-config.mjs";
import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
import "node:crypto";
const root = new URL("../../../", import.meta.url).pathname, test = await browserConfig("village-art", { baseURL: "http://127.0.0.1:5435", directory: "output/village-polish" }), out = test.directory, db = test.database, baseline = process.argv.includes("--baseline"), browser = await launchBrowser(chromium, { headless: !0 }), checks = [], shots = [], errors = [], expectedErrors = [];
let allowed422 = 0, allowedLost = 0, page, context, engine, save;
const read = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
async function until(fn, label, timeout = 12e3) {
  for (const start = Date.now(); Date.now() - start < timeout; ) {
    try {
      const s = await read();
      if (await fn(s))
        return s;
    } catch (e) {
      if (!String(e).includes("render_game_to_text") && !String(e).includes("reading 'main'"))
        throw e;
    }
    await page.waitForTimeout(75);
  }
  throw Error(label + ": " + JSON.stringify(await read()));
}
async function ccClick(id) {
  const s = await until((s2) => s2.controls?.some((c2) => c2.id === id && !c2.disabled), id), c = s.controls.find((c2) => c2.id === id);
  await page.mouse.click(c.x, c.y), await page.waitForTimeout(150);
}
async function load() {
  await page.goto(test.baseURL), await until((s) => s.loaded, "loaded"), await ccClick("start"), await until((s) => s.mode === "world" && !s.busy, "world"), await page.waitForTimeout(350);
}
async function seed(location, position, minute = 510) {
  await page.goto("about:blank"), await page.waitForTimeout(120), execFileSync(root + "backend/.venv/bin/python", [
    "-c",
    `import sqlite3,json,sys,time
p,key,loc,pos,minute=sys.argv[1:];sys.path.insert(0,'clients/cocos/tools');from test_guard import assert_fixture;assert_fixture(p,['output/village-polish/test.db'])
c=sqlite3.connect(p);s=json.loads(c.execute('select state from players where id=?',(key,)).fetchone()[0]);s['location']=loc;s['position']=json.loads(pos);s['revision']+=1;s['world_clock'].update(updated_at=time.time(),running_until=0,elapsed=(float(minute)-s['world_clock'].get('start_minute',360))*s['world_clock'].get('day_seconds',1800)/1440)
if s.get('village_intro'):s['village_intro']['dismissed']=True
c.execute('update players set state=? where id=?',(json.dumps(s),key));c.commit();c.close()`,
    db,
    save,
    location,
    JSON.stringify(position),
    String(minute)
  ]), await load();
}
async function shot(name) {
  await page.screenshot({ path: out + "/" + name + ".png" }), shots.push(name);
}
async function setup(which) {
  engine = which, context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ...baseline ? {} : {
      recordVideo: {
        dir: out + "/raw-recordings",
        size: { width: 1440, height: 900 }
      }
    }
  }), page = await context.newPage(), page.on("pageerror", (e) => errors.push(which + ": " + e.message)), page.on("console", (m) => {
    m.type() === "error" && (allowed422 && m.text().includes("422") ? (allowed422--, expectedErrors.push(m.text())) : allowedLost && m.text().includes("ERR_FAILED") ? (allowedLost--, expectedErrors.push(m.text())) : errors.push(which + ": " + m.text()));
  }), await load(), save = (await read()).saveId;
}
function check(label) {
  checks.push(engine + ": " + label), console.log("PASS " + engine + ": " + label);
}
function routeOf(s) {
  return s.walking || s.route || [];
}
function clockOf(s) {
  return s.worldClock || s.serverClock;
}
async function worldClick(x, y, touch = !1) {
  const s = await read();
  let px, py;
  px = s.camera.width / 2 + s.camera.x + x * s.camera.zoom, py = s.camera.height / 2 - s.camera.y + y * s.camera.zoom, touch ? await page.touchscreen.tap(px, py) : await page.mouse.click(px, py);
}
async function close() {
  await ccClick("close"), await until((s) => ["world", "explore"].includes(s.mode), "closed"), await page.waitForTimeout(220);
}
async function transfer(which, touch = !1) {
  {
    const id = (which === "store" ? "store-" : "withdraw-") + "seed", s = await until((s2) => s2.controls.some((c2) => c2.id === id && !c2.disabled), id), c = s.controls.find((c2) => c2.id === id);
    touch ? await page.touchscreen.tap(c.x, c.y) : await page.mouse.click(c.x, c.y);
  }
}
async function actualFlow() {
  await seed("overworld", { x: 160, y: 352 }), await worldClick(160, 192), await until((s) => routeOf(s).length > 0, "route starts"), await shot(engine + "-route"), await page.keyboard.press("Escape"), await page.waitForTimeout(350);
  const p = (await read()).player;
  await page.waitForTimeout(350), assert(Math.hypot((await read()).player.x - p.x, (await read()).player.y - p.y) < 0.5), assert.equal((await read()).location, "overworld"), check("selected route is visible and Escape stops without entering"), await worldClick(160, 192), await until((s) => s.location === "home" && ["world", "explore"].includes(s.mode), "actual walk/enter", 18e3), await shot(engine + "-entered"), assert.equal((await read()).inventory.seed, 6), check("clicking the real facade approaches and enters once, without teleport or invented possessions"), await worldClick(360, 174), await until((s) => s.mode === "storage", "chest approach", 18e3), await shot(engine + "-storage"), await ccClick("storage-pick-inventory-wood"), assert((await read()).controls.find((c) => c.id === "store-wood").disabled), await ccClick("storage-next"), assert((await read()).controls.some((c) => c.id === "storage-pick-inventory-reinforced_sword")), await ccClick("storage-prev"), await ccClick("storage-pick-storage-seed");
  const paused = clockOf(await read()).elapsed;
  await page.keyboard.press("d"), await page.waitForTimeout(350), assert.equal(clockOf(await read()).elapsed, paused), check("furniture hit area opens storage and panels own movement/world clock"), allowed422++;
  let rejected = !1;
  await page.route("**/api/command", async (route) => route.request().postDataJSON().action === "store" && !rejected ? (rejected = !0, route.fulfill({
    status: 422,
    contentType: "application/json",
    body: JSON.stringify({ detail: "\u672C\u6B21\u5B58\u53D6\u88AB\u62D2\u7EDD\uFF08\u6D4B\u8BD5\uFF09" })
  })) : route.continue()), await transfer("store"), await until((s) => !s.busy && (s.error || s.notice || "").includes("\u6D4B\u8BD5"), "rejected transfer"), assert.equal((await read()).inventory.seed, 6), assert.equal((await read()).storage.seed, 0), await shot(engine + "-storage-rejected"), await page.unroute("**/api/command");
  const attempts = [];
  let lost = !1;
  await page.route("**/api/command", async (route) => {
    const b = route.request().postDataJSON();
    return b.action === "store" && (attempts.push(b), !lost) ? (lost = !0, allowedLost++, await route.fetch(), await page.waitForTimeout(300), route.abort("failed")) : route.continue();
  }), await transfer("store"), await until((s) => s.inventory.seed === 5 && s.storage.seed === 1 && !s.busy, "confirmed transfer"), assert(attempts.length >= 2), assert.equal(attempts[0].request_id, attempts[1].request_id), await page.unroute("**/api/command"), await shot(engine + "-storage-confirmed"), await transfer("withdraw"), await until((s) => s.inventory.seed === 6 && s.storage.seed === 0 && !s.busy, "withdraw"), check("rejected/lost-reply/retried transfers conserve exact quantities and replay one request ID"), await close(), await worldClick(144, 152), await until((s) => s.mode === "life", "reading approach", 18e3), await shot(engine + "-reading");
  const position = (await read()).player;
  await page.keyboard.press("w"), await page.waitForTimeout(250), assert(Math.hypot((await read()).player.x - position.x, (await read()).player.y - position.y) < 0.5), await page.keyboard.press("Escape"), await until((s) => ["world", "explore"].includes(s.mode), "reading return"), check("reading corner enters existing study/Life and Escape returns input to world"), await worldClick(336, 112), await until((s) => s.mode === "sleep", "bed approach", 18e3);
  const before = clockOf(await read()).elapsed;
  await ccClick("short-rest"), await until((s) => clockOf(s).elapsed >= before + 37, "actual short rest"), assert.equal((await read()).inventory.seed, 6), await shot(engine + "-rest"), await until((s) => s.mode === "world", "rest returns to world"), check("bed action uses actual short-rest settlement without changing possessions"), await worldClick(240, 328), await until((s) => s.location === "overworld" && ["world", "explore"].includes(s.mode), "actual walk/exit", 18e3), await shot(engine + "-returned"), await load(), assert.equal((await read()).location, "overworld"), assert.equal((await read()).inventory.seed, 6), assert.equal((await read()).storage.seed, 0), check("real doorway exit and reload preserve committed storage/location"), await worldClick(352, 208), await until((s) => routeOf(s).length > 0, "manual route"), await page.keyboard.down("d"), await page.waitForTimeout(180), await page.keyboard.up("d"), assert.equal(routeOf(await read()).length, 0), await page.evaluate(() => window.dispatchEvent(new Event("blur"))), await page.waitForTimeout(200);
  const stop = (await read()).player;
  await page.waitForTimeout(250), assert(Math.hypot((await read()).player.x - stop.x, (await read()).player.y - stop.y) < 0.5), await page.evaluate(() => window.dispatchEvent(new Event("focus"))), check("manual movement and blur cancel a pending route/held input");
}
async function layouts() {
  for (const location of [
    "home",
    "workshop",
    "library",
    "guild",
    "shop",
    "inn"
  ])
    await seed(location, { x: 240, y: 270 }), await shot(engine + "-room-" + location);
  for (const size of [
    { width: 1920, height: 1080 },
    { width: 1024, height: 768 },
    { width: 844, height: 390 },
    { width: 740, height: 360 }
  ]) {
    await seed("home", { x: 240, y: 270 }), await page.setViewportSize(size), await page.waitForTimeout(450), await shot(engine + "-layout-" + size.width);
    {
      const s = await read();
      for (const c of s.controls)
        assert(c.x - c.w / 2 >= 0 && c.x + c.w / 2 <= size.width), assert(c.y - c.h / 2 >= 0 && c.y + c.h / 2 <= size.height);
    }
  }
  check("six existing rooms and desktop/landscape layouts render with reachable primary controls"), await page.setViewportSize({ width: 1440, height: 900 }), await seed("overworld", { x: 592, y: 400 }, 900), await until((s) => s.npcPresentation?.noah?.frame >= 4, "actual scheduled walking pose"), await shot("cocos-resident-walking"), await page.keyboard.down("d"), await page.waitForTimeout(180), await page.keyboard.up("d"), await page.waitForTimeout(240), assert((await read()).actorFrame < 4), check("existing scheduled NPC walk frames play and released player returns to idle");
}
async function touchFlow() {
  const video = page.video();
  await context.close(), video && await video.saveAs(out + "/" + engine + "-flow.webm"), context = await browser.newContext({
    viewport: { width: 844, height: 390 },
    deviceScaleFactor: 2,
    isMobile: !0,
    hasTouch: !0,
    reducedMotion: "reduce"
  }), page = await context.newPage(), page.on("pageerror", (e) => errors.push(engine + ": " + e.message)), page.on("console", (m) => {
    m.type() === "error" && errors.push(engine + ": " + m.text());
  }), await load(), save = (await read()).saveId, await seed("home", { x: 240, y: 294 }), await worldClick(312, 216, !0), await until((s) => Math.hypot(s.player.x - 312, s.player.y - 216) < 20, "touch walking", 15e3), await page.waitForTimeout(250);
  {
    const c = (await read()).controls.find((c2) => c2.id === "interact");
    await page.touchscreen.tap(c.x, c.y);
  }
  await until((s) => s.mode === "storage", "touch storage"), await shot(engine + "-touch-storage"), await transfer("store", !0), await until((s) => s.inventory.seed === 5 && s.storage.seed === 1 && !s.busy, "touch store"), await transfer("withdraw", !0), await until((s) => s.inventory.seed === 6 && s.storage.seed === 0 && !s.busy, "touch withdrawal"), await close(), await shot(engine + "-touch-room"), check("DPR2 touch walking/storage and reduced-motion cues retain truthful counts and reachable controls");
}
try {
  for (const which of ["cocos"]) {
    if (await setup(which), baseline)
      for (const [location, position] of [
        ["overworld", { x: 160, y: 292 }],
        ["home", { x: 240, y: 270 }],
        ["workshop", { x: 240, y: 260 }]
      ])
        await seed(location, position), await shot(which + "-before-" + location), location === "home" && (await page.setViewportSize({ width: 740, height: 360 }), await page.waitForTimeout(450), await shot(which + "-before-home-740"), await page.setViewportSize({ width: 1440, height: 900 }));
    else
      await actualFlow(), await layouts(), await touchFlow();
    await context.close();
  }
  const result = { checks, shots, errors, expectedErrors };
  await fs.writeFile(out + (baseline ? "/baseline.json" : "/result.json"), JSON.stringify(result, null, 2)), assert.deepEqual(errors, []), console.log(JSON.stringify(result));
} catch (e) {
  throw page && !page.isClosed() && (await page.screenshot({ path: out + "/failure.png" }), await fs.writeFile(out + "/failure-state.json", JSON.stringify(await read(), null, 2))), await fs.writeFile(out + "/partial.json", JSON.stringify({ checks, shots, errors, error: String(e) }, null, 2)), e;
} finally {
  await closeBrowser(browser);
}
