import {browserConfig,launchBrowser,closeBrowser} from "../../tools/cocos-browser-config.mjs";
import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
const root = new URL("../../", import.meta.url).pathname;
const test = await browserConfig("village-art", {baseURL:"http://127.0.0.1:5435",directory:"output/village-polish"});
const out=test.directory, db=test.database;
const requestedEngine = process.argv
  .find((a) => a.startsWith("--engine="))
  ?.split("=")[1];
assert(!requestedEngine || ["web", "cocos"].includes(requestedEngine));
const baseline = process.argv.includes("--baseline"),
  browser = await launchBrowser(chromium,{ headless: true });
const checks = [],
  shots = [],
  errors = [],
  expectedErrors = [];
let allowed422 = 0,
  allowedLost = 0;
let page, context, engine, save;
const read = () =>
  page.evaluate(() => JSON.parse(window.render_game_to_text()));
async function until(fn, label, timeout = 12000) {
  for (const start = Date.now(); Date.now() - start < timeout;) {
    try {
      const s = await read();
      if (await fn(s)) return s;
    } catch (e) {
      if (
        !String(e).includes("render_game_to_text") &&
        !String(e).includes("reading 'main'")
      )
        throw e;
    }
    await page.waitForTimeout(75);
  }
  throw Error(label + ": " + JSON.stringify(await read()));
}
async function ccClick(id) {
  const s = await until(
      (s) => s.controls?.some((c) => c.id === id && !c.disabled),
      id,
    ),
    c = s.controls.find((c) => c.id === id);
  await page.mouse.click(c.x, c.y);
  await page.waitForTimeout(150);
}
async function load() {
  await page.goto(engine === "web" ? "http://127.0.0.1:5434" : test.baseURL);
  if (engine === "cocos") {
    await until((s) => s.loaded, "loaded");
    await ccClick("start");
    await until((s) => s.mode === "world" && !s.busy, "world");
  } else
    await until(
      (s) =>
        s.canvasCount === 1 &&
        s.sceneLocation === s.location &&
        s.playerTexture,
      "Web ready",
    );
  await page.waitForTimeout(350);
}
async function seed(location, position, minute = 510) {
  await page.goto("about:blank");
  await page.waitForTimeout(120);
  execFileSync(root + "backend/.venv/bin/python", [
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
    String(minute),
  ]);
  await load();
}
async function shot(name) {
  await page.screenshot({ path: out + "/" + name + ".png" });
  shots.push(name);
}
async function setup(which) {
  engine = which;
  context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ...(baseline
      ? {}
      : {
          recordVideo: {
            dir: out + "/raw-recordings",
            size: { width: 1440, height: 900 },
          },
        }),
  });
  page = await context.newPage();
  page.on("pageerror", (e) => errors.push(which + ": " + e.message));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    if (allowed422 && m.text().includes("422")) {
      allowed422--;
      expectedErrors.push(m.text());
    } else if (allowedLost && m.text().includes("ERR_FAILED")) {
      allowedLost--;
      expectedErrors.push(m.text());
    } else errors.push(which + ": " + m.text());
  });
  if (engine === "web") {
    const base = "http://127.0.0.1:5434";
    save = (await (await page.request.post(base + "/api/session")).json())
      .save_id;
    assert.equal(
      (
        await page.request.post(base + "/api/command", {
          data: {
            request_id: crypto.randomUUID(),
            action: "create",
            data: { name: "村居检查", appearance: 0 },
          },
        })
      ).status(),
      200,
    );
  } else {
    await load();
    save = (await read()).saveId;
  }
}

function check(label) {
  checks.push(engine + ": " + label);
  console.log("PASS " + engine + ": " + label);
}
function routeOf(s) {
  return s.walking || s.route || [];
}
function clockOf(s) {
  return s.worldClock || s.serverClock;
}
async function worldClick(x, y, touch = false) {
  const s = await read();
  let px, py;
  if (engine === "cocos") {
    px = s.camera.width / 2 + s.camera.x + x * s.camera.zoom;
    py = s.camera.height / 2 - s.camera.y + y * s.camera.zoom;
  } else {
    const b = await page.locator("canvas").boundingBox();
    px = b.x + (x - s.camera.viewX) * s.camera.zoom;
    py = b.y + (y - s.camera.viewY) * s.camera.zoom;
  }
  if (touch) await page.touchscreen.tap(px, py);
  else await page.mouse.click(px, py);
}
async function close() {
  if (engine === "cocos") await ccClick("close");
  else
    await page.getByRole("button", { name: "关闭面板", exact: true }).click();
  await until((s) => ["world", "explore"].includes(s.mode), "closed");
  await page.waitForTimeout(220);
}
async function transfer(which, touch = false) {
  if (engine === "cocos") {
    const id = (which === "store" ? "store-" : "withdraw-") + "seed";
    const s = await until(
        (s) => s.controls.some((c) => c.id === id && !c.disabled),
        id,
      ),
      c = s.controls.find((c) => c.id === id);
    if (touch) await page.touchscreen.tap(c.x, c.y);
    else await page.mouse.click(c.x, c.y);
  } else {
    const b = page.getByRole("button", {
      name: which === "store" ? "存入 1 种子" : "取回 1 种子",
      exact: true,
    });
    if (touch) await b.tap();
    else await b.click();
  }
}
async function actualFlow() {
  await seed("overworld", { x: 160, y: 352 });
  // Aim inside the real facade rather than its floating-point lower edge.
  await worldClick(160, 192);
  await until((s) => routeOf(s).length > 0, "route starts");
  await shot(engine + "-route");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(350);
  const p = (await read()).player;
  await page.waitForTimeout(350);
  assert(
    Math.hypot((await read()).player.x - p.x, (await read()).player.y - p.y) <
      0.5,
  );
  assert.equal((await read()).location, "overworld");
  check("selected route is visible and Escape stops without entering");
  // Aim inside the real facade rather than its floating-point lower edge.
  await worldClick(160, 192);
  await until(
    (s) => s.location === "home" && ["world", "explore"].includes(s.mode),
    "actual walk/enter",
    18000,
  );
  await shot(engine + "-entered");
  assert.equal((await read()).inventory.seed, 6);
  check(
    "clicking the real facade approaches and enters once, without teleport or invented possessions",
  );
  await worldClick(360, 174);
  await until((s) => s.mode === "storage", "chest approach", 18000);
  await shot(engine + "-storage");
  if (engine === "cocos") {
    await ccClick("storage-pick-inventory-wood");
    assert((await read()).controls.find((c) => c.id === "store-wood").disabled);
    await ccClick("storage-next");
    assert(
      (await read()).controls.some(
        (c) => c.id === "storage-pick-inventory-reinforced_sword",
      ),
    );
    await ccClick("storage-prev");
    await ccClick("storage-pick-storage-seed");
  }
  const paused = clockOf(await read()).elapsed;
  await page.keyboard.press("d");
  await page.waitForTimeout(350);
  assert.equal(clockOf(await read()).elapsed, paused);
  check("furniture hit area opens storage and panels own movement/world clock");
  allowed422++;
  let rejected = false;
  await page.route("**/api/command", async (route) => {
    const b = route.request().postDataJSON();
    if (b.action === "store" && !rejected) {
      rejected = true;
      return route.fulfill({
        status: 422,
        contentType: "application/json",
        body: JSON.stringify({ detail: "本次存取被拒绝（测试）" }),
      });
    }
    return route.continue();
  });
  await transfer("store");
  await until(
    (s) => !s.busy && (s.error || s.notice || "").includes("测试"),
    "rejected transfer",
  );
  assert.equal((await read()).inventory.seed, 6);
  assert.equal((await read()).storage.seed, 0);
  await shot(engine + "-storage-rejected");
  await page.unroute("**/api/command");
  const attempts = [];
  let lost = false;
  await page.route("**/api/command", async (route) => {
    const b = route.request().postDataJSON();
    if (b.action === "store") {
      attempts.push(b);
      if (!lost) {
        lost = true;
        allowedLost++;
        await route.fetch();
        await page.waitForTimeout(300);
        return route.abort("failed");
      }
    }
    return route.continue();
  });
  await transfer("store");
  await until(
    (s) => s.inventory.seed === 5 && s.storage.seed === 1 && !s.busy,
    "confirmed transfer",
  );
  assert(attempts.length >= 2);
  assert.equal(attempts[0].request_id, attempts[1].request_id);
  await page.unroute("**/api/command");
  await shot(engine + "-storage-confirmed");
  await transfer("withdraw");
  await until(
    (s) => s.inventory.seed === 6 && s.storage.seed === 0 && !s.busy,
    "withdraw",
  );
  check(
    "rejected/lost-reply/retried transfers conserve exact quantities and replay one request ID",
  );
  await close();
  await worldClick(144, 152);
  await until(
    (s) => (engine === "cocos" ? s.mode === "life" : s.mode === "study"),
    "reading approach",
    18000,
  );
  await shot(engine + "-reading");
  const position = (await read()).player;
  await page.keyboard.press("w");
  await page.waitForTimeout(250);
  assert(
    Math.hypot(
      (await read()).player.x - position.x,
      (await read()).player.y - position.y,
    ) < 0.5,
  );
  await page.keyboard.press("Escape");
  await until((s) => ["world", "explore"].includes(s.mode), "reading return");
  check(
    "reading corner enters existing study/Life and Escape returns input to world",
  );
  await worldClick(336, 112);
  await until((s) => s.mode === "sleep", "bed approach", 18000);
  const before = clockOf(await read()).elapsed;
  if (engine === "cocos") await ccClick("short-rest");
  else await page.getByRole("button", { name: /小憩 30 分钟/ }).click();
  await until((s) => clockOf(s).elapsed >= before + 37, "actual short rest");
  assert.equal((await read()).inventory.seed, 6);
  await shot(engine + "-rest");
  if(engine==='cocos')await until(s=>s.mode==='world','rest returns to world');else await close();
  check(
    "bed action uses actual short-rest settlement without changing possessions",
  );
  await worldClick(240, 328);
  await until(
    (s) => s.location === "overworld" && ["world", "explore"].includes(s.mode),
    "actual walk/exit",
    18000,
  );
  await shot(engine + "-returned");
  await load();
  assert.equal((await read()).location, "overworld");
  assert.equal((await read()).inventory.seed, 6);
  assert.equal((await read()).storage.seed, 0);
  check("real doorway exit and reload preserve committed storage/location");
  await worldClick(352, 208);
  await until((s) => routeOf(s).length > 0, "manual route");
  await page.keyboard.down("d");
  await page.waitForTimeout(180);
  await page.keyboard.up("d");
  assert.equal(routeOf(await read()).length, 0);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await page.waitForTimeout(200);
  const stop = (await read()).player;
  await page.waitForTimeout(250);
  assert(
    Math.hypot(
      (await read()).player.x - stop.x,
      (await read()).player.y - stop.y,
    ) < 0.5,
  );
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  check("manual movement and blur cancel a pending route/held input");
}
async function layouts() {
  for (const location of [
    "home",
    "workshop",
    "library",
    "guild",
    "shop",
    "inn",
  ]) {
    await seed(location, { x: 240, y: 270 });
    await shot(engine + "-room-" + location);
  }
  for (const size of [
    { width: 1920, height: 1080 },
    { width: 1024, height: 768 },
    { width: 844, height: 390 },
    { width: 740, height: 360 },
  ]) {
    await seed("home", { x: 240, y: 270 });
    await page.setViewportSize(size);
    await page.waitForTimeout(450);
    await shot(engine + "-layout-" + size.width);
    if (engine === "cocos") {
      const s = await read();
      for (const c of s.controls) {
        assert(c.x - c.w / 2 >= 0 && c.x + c.w / 2 <= size.width);
        assert(c.y - c.h / 2 >= 0 && c.y + c.h / 2 <= size.height);
      }
    } else {
      const bad = await page
        .locator(
          ".game-status button,.bottom-nav button,.interact,.header-actions button,.village-clock",
        )
        .evaluateAll((nodes) =>
          nodes
            .filter((n) => n.checkVisibility())
            .filter((n) => {
              const r = n.getBoundingClientRect(),
                hit = document.elementFromPoint(
                  r.x + r.width / 2,
                  r.y + r.height / 2,
                );
              return (
                r.x < 0 ||
                r.y < 0 ||
                r.right > innerWidth ||
                r.bottom > innerHeight ||
                !hit ||
                !n.contains(hit)
              );
            })
            .map((n) => n.textContent),
        );
      assert.deepEqual(bad, []);
    }
  }
  check(
    "six existing rooms and desktop/landscape layouts render with reachable primary controls",
  );
  if (engine === "cocos") {
    await page.setViewportSize({ width: 1440, height: 900 });
    await seed("overworld", { x: 592, y: 400 }, 900);
    await until(
      (s) => s.npcPresentation?.noah?.frame >= 4,
      "actual scheduled walking pose",
    );
    await shot("cocos-resident-walking");
    await page.keyboard.down("d");
    await page.waitForTimeout(180);
    await page.keyboard.up("d");
    await page.waitForTimeout(240);
    assert((await read()).actorFrame < 4);
    check(
      "existing scheduled NPC walk frames play and released player returns to idle",
    );
  }
}
async function touchFlow() {
  const video = page.video();
  await context.close();
  if (video) await video.saveAs(out + "/" + engine + "-flow.webm");
  context = await browser.newContext({
    viewport: { width: 844, height: 390 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });
  page = await context.newPage();
  page.on("pageerror", (e) => errors.push(engine + ": " + e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(engine + ": " + m.text());
  });
  if (engine === "web") {
    const base = "http://127.0.0.1:5434";
    save = (await (await page.request.post(base + "/api/session")).json())
      .save_id;
    assert.equal(
      (
        await page.request.post(base + "/api/command", {
          data: {
            request_id: crypto.randomUUID(),
            action: "create",
            data: { name: "触控村居", appearance: 0 },
          },
        })
      ).status(),
      200,
    );
  } else {
    await load();
    save = (await read()).saveId;
  }
  await seed("home", { x: 240, y: 294 });
  await worldClick(312, 216, true);
  await until(
    (s) => Math.hypot(s.player.x - 312, s.player.y - 216) < 20,
    "touch walking",
    15000,
  );
  await page.waitForTimeout(250);
  if (engine === "cocos") {
    const c = (await read()).controls.find((c) => c.id === "interact");
    await page.touchscreen.tap(c.x, c.y);
  } else await page.locator("button.interact").tap();
  await until((s) => s.mode === "storage", "touch storage");
  await shot(engine + "-touch-storage");
  await transfer("store", true);
  await until(
    (s) => s.inventory.seed === 5 && s.storage.seed === 1 && !s.busy,
    "touch store",
  );
  await transfer("withdraw", true);
  await until(
    (s) => s.inventory.seed === 6 && s.storage.seed === 0 && !s.busy,
    "touch withdrawal",
  );
  await close();
  await shot(engine + "-touch-room");
  check(
    "DPR2 touch walking/storage and reduced-motion cues retain truthful counts and reachable controls",
  );
}
try {
  for (const which of requestedEngine ? [requestedEngine] : ["web", "cocos"]) {
    await setup(which);
    if (baseline) {
      for (const [location, position] of [
        ["overworld", { x: 160, y: 292 }],
        ["home", { x: 240, y: 270 }],
        ["workshop", { x: 240, y: 260 }],
      ]) {
        await seed(location, position);
        await shot(which + "-before-" + location);
        if (location === "home") {
          await page.setViewportSize({ width: 740, height: 360 });
          await page.waitForTimeout(450);
          await shot(which + "-before-home-740");
          await page.setViewportSize({ width: 1440, height: 900 });
        }
      }
    } else {
      await actualFlow();
      await layouts();
      await touchFlow();
    }
    await context.close();
  }
  const result = { checks, shots, errors, expectedErrors };
  await fs.writeFile(
    out +
      (baseline
        ? "/baseline.json"
        : requestedEngine
          ? "/result-" + requestedEngine + ".json"
          : "/result.json"),
    JSON.stringify(result, null, 2),
  );
  assert.deepEqual(errors, []);
  console.log(JSON.stringify(result));
} catch (e) {
  if (page && !page.isClosed()) {
    await page.screenshot({ path: out + "/failure.png" });
    await fs.writeFile(
      out + "/failure-state.json",
      JSON.stringify(await read(), null, 2),
    );
  }
  await fs.writeFile(
    out + "/partial.json",
    JSON.stringify({ checks, shots, errors, error: String(e) }, null, 2),
  );
  throw e;
} finally {
  await closeBrowser(browser);
}
