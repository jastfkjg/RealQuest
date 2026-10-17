import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
const root = new URL("../../", import.meta.url).pathname,
  out = root + "output/cave-polish",
  db = out + "/test.db";
const baseline = process.argv.includes("--baseline");
const browser = await chromium.launch({ headless: true });
const checks = [],
  errors = [],
  shots = [],
  expectedErrors = [];
let expectedNetwork = 0;
let page, engine, save, context;
function watch() {
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    if (expectedNetwork && /net::ERR_FAILED/.test(m.text())) {
      expectedNetwork--;
      expectedErrors.push(m.text());
    } else errors.push(engine + ": " + m.text());
  });
}
const read = () =>
  page.evaluate(() => JSON.parse(window.render_game_to_text()));
async function until(fn, label, timeout = 12000) {
  for (const start = Date.now(); Date.now() - start < timeout;) {
    const s = await read();
    if (await fn(s)) return s;
    await page.waitForTimeout(70);
  }
  throw Error(label + ": " + JSON.stringify(await read()));
}
async function ccClick(id) {
  const s = await until(
      (s) => s.controls.some((c) => c.id === id && !c.disabled),
      id,
    ),
    c = s.controls.find((c) => c.id === id);
  await page.mouse.click(c.x, c.y);
  await page.waitForTimeout(100);
}
async function load() {
  await page.goto("http://127.0.0.1:" + (engine === "web" ? 5430 : 5431));
  await page.waitForFunction(() => window.render_game_to_text);
  if (engine === "cocos") {
    await until((s) => s.loaded, "loaded");
    await ccClick("start");
    await until((s) => s.mode === "world" && !s.busy, "started");
  } else
    await until(
      (s) =>
        s.canvasCount === 1 &&
        s.sceneLocation === s.location &&
        s.playerTexture,
      "Web ready",
    );
  await page.waitForTimeout(250);
}
async function seed(
  location = "cave_1",
  position = { x: 64, y: 352 },
  extra = "",
) {
  await page.goto("about:blank");
  execFileSync(root + "backend/.venv/bin/python", [
    "-c",
    `import sqlite3,json,sys,time,uuid
p,key,loc,pos=sys.argv[1:];assert p.endswith('/output/cave-polish/test.db')
c=sqlite3.connect(p);s=json.loads(c.execute('select state from players where id=?',(key,)).fetchone()[0]);s['location']=loc;s['position']=json.loads(pos);s['revision']+=1;s['inventory'].update(glow_staff=1,soup=3);s['vitality'].update(current=100,max=100);s['stamina'].update(current=100,max=100,updated_at=time.time());s['village_combat'].update(equipped='glow_staff',spark_learned=True,encounter=str(uuid.uuid4()),input_seq=0,floors={},time=0,last_tick=0,cast=None,effects=[],projectiles=[]);s['world_clock'].update(updated_at=time.time(),running_until=0,elapsed=187.5)
${extra}
c.execute('update players set state=? where id=?',(json.dumps(s),key));c.commit();c.close()`,
    db,
    save,
    location,
    JSON.stringify(position),
  ]);
  await load();
}
async function shot(name) {
  await page.waitForTimeout(100);
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
            dir: out + "/recordings",
            size: { width: 1440, height: 900 },
          },
        }),
  });
  page = await context.newPage();
  page.on("pageerror", (e) => errors.push(which + ": " + e.message));
  watch();
  if (which === "web") {
    const base = "http://127.0.0.1:5430";
    save = (await (await page.request.post(base + "/api/session")).json())
      .save_id;
    const r = await page.request.post(base + "/api/command", {
      data: {
        request_id: crypto.randomUUID(),
        action: "create",
        data: { name: "洞穴检查", appearance: 0 },
      },
    });
    assert.equal(r.status(), 200);
    await seed();
  } else {
    await load();
    save = (await read()).saveId;
    await seed();
  }
}
function check(name) {
  checks.push(engine + ": " + name);
  console.log("PASS " + engine + ": " + name);
}
async function action(id) {
  if (engine === "cocos") return ccClick(id);
  const names = {
    attack: /^攻击/,
    spark: /^火花术/,
    soup: /^菜汤/,
    target: /^切换目标/,
    pause: "装备 / 暂停",
    retreat: /撤.*洞口|带材料回洞口/,
  };
  await page.getByRole("button", { name: names[id] }).click();
}
async function pointer(id) {
  if (engine === "cocos") {
    const s = await read();
    return s.controls.find((c) => c.id === id);
  }
  const b = await page
    .getByRole("button", { name: id === "attack" ? /^攻击/ : /^火花术/ })
    .boundingBox();
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}
async function worldClick(x, y) {
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
  await page.mouse.click(px, py);
}
async function walk(x, y) {
  await worldClick(x, y);
  await until(
    (s) =>
      Math.hypot(
        (s.savedPosition || s.player).x - x,
        (s.savedPosition || s.player).y - y,
      ) < 20,
    "walk",
    15000,
  );
  await page.waitForTimeout(180);
}
async function actualFlow() {
  await seed("cave_1", { x: 208, y: 344 });
  await worldClick(408, 240);
  await until((s) => s.combatTarget === "1-1", "select target");
  await page.waitForTimeout(250);
  assert.equal((await read()).combat.enemies[1].hp, 18);
  assert.equal((await read()).stamina.current, 100);
  await page.keyboard.press("t");
  await until((s) => s.combatTarget === "1-2", "cycle target");
  await worldClick(240, 344);
  await until((s) => s.combatTarget === "1-0", "select first");
  check("selection/cycling is pure and never spends stamina or attacks");
  let attempts = [],
    lost = false,
    abortBudget = 0;
  await page.route("**/api/command", async (route) => {
    const b = route.request().postDataJSON();
    if (
      b.action === "cave_tick" &&
      b.data.attack &&
      (!lost || attempts[0]?.request_id === b.request_id)
    ) {
      attempts.push(b);
      if (!lost) {
        lost = true;
        abortBudget++;
        expectedNetwork++;
        await route.fetch();
        return route.abort("failed");
      }
    }
    return route.continue();
  });
  const c = await pointer("attack");
  const start = Date.now();
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await until((s) => s.combat.enemies[0].hp < 18, "confirmed hit");
  await until(
    (s) =>
      (s.cavePresentation?.confirmedFeedback ??
        s.presentation?.confirmedFeedback) > 0,
    "confirmed feedback visible",
  );
  if (engine === "cocos") {
    assert(
      await page.evaluate(async () => {
        const cc = await System.import("cc");
        const canvas = cc.director.getScene().getChildByName("Canvas");
        const feedback = canvas.getChildByName("ConfirmedCombatFeedback");
        return (
          feedback.getSiblingIndex() >
            canvas.getChildByName("World").getSiblingIndex() &&
          feedback.getSiblingIndex() <
            canvas.getChildByName("HUD").getSiblingIndex()
        );
      }),
      "confirmed text must render above the world and below HUD",
    );
  }
  await shot(engine + "-confirmed-hit");
  await page.waitForTimeout(Math.max(0, 1400 - (Date.now() - start)));
  await page.mouse.up();
  await until((s) => s.inventory.gel === 1, "first loot");
  assert.equal((await read()).inventory.gold, 22);
  assert.equal(attempts[0].request_id, attempts[1].request_id);
  assert.equal(attempts[0].data.seq, attempts[1].data.seq);
  await page.unroute("**/api/command");
  await page.waitForTimeout(900);
  const stopped = await read();
  assert.equal(stopped.stamina.current, 96);
  assert.equal(stopped.combat.enemies[1].hp, 18);
  check(
    "held attack survives receipts/lost reply, exact two hits/one loot; release adds no attack",
  );
  await walk(368, 240);
  const before = (await read()).combat.enemies[1].hp;
  await worldClick(
    (await read()).combat.enemies[1].x,
    (await read()).combat.enemies[1].y,
  );
  await action("spark");
  await until((s) => s.combat.cast?.kind === "spark", "spark cast");
  await shot(engine + "-spark-cast");
  await until(
    (s) => s.combat.enemies[1].hp === Math.max(0, before - 12),
    "server spell hit",
  );
  await shot(engine + "-spark-cooldown");
  await walk(96, 352);
  await action("soup");
  await until((s) => s.combat.cast?.kind === "soup", "soup cast");
  await shot(engine + "-soup-cast");
  await until((s) => s.inventory.soup === 2, "soup completes");
  check(
    "cast progress, spell hit/cooldown and safe soup consumption use server results",
  );
  if (engine === "cocos") {
    await ccClick("menu");
    await ccClick("menu-equipment");
  } else await action("pause");
  await page.waitForTimeout(200);
  const paused = (await read()).combat.time;
  await page.waitForTimeout(600);
  assert.equal((await read()).combat.time, paused);
  await shot(engine + "-paused");
  for (let i = 0; i < 4; i++) {
    if (["world", "explore"].includes((await read()).mode)) break;
    await page.keyboard.press("Escape");
    await page.waitForTimeout(100);
  }
  await until((s) => ["world", "explore"].includes(s.mode), "resume");
  await page.keyboard.down("d");
  await page.waitForTimeout(140);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await page.keyboard.up("d");
  await page.waitForTimeout(250);
  const pos = (await read()).player;
  await page.waitForTimeout(350);
  assert(
    Math.hypot(
      (await read()).player.x - pos.x,
      (await read()).player.y - pos.y,
    ) < 0.5,
  );
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  check("panels and blur pause battle and clear held input");
  if (engine === "cocos") {
    await ccClick("menu");
    await ccClick("menu-equipment");
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await walk(96, 384);
    await ccClick("interact");
    await ccClick("cave-retreat");
  } else await action("retreat");
  await until((s) => s.location === "overworld", "retreat");
  assert.equal((await read()).inventory.gel, 1);
  await shot(engine + "-retreated");
  check("safe retreat preserves earned loot");
}
async function gallery() {
  for (const floor of [1, 2, 3, 5]) {
    await seed("cave_" + floor, { x: 64, y: 352 });
    await shot(engine + "-floor-" + floor);
  }
  await seed(
    "cave_5",
    { x: 320, y: 300 },
    "s['village_combat']['floors']={'5':[dict(id='5-0',kind='boss',x=400,y=224,hp=70,phase='windup',until=1,ready=4,tx=320,ty=300,move=3,style='shot')]}",
  );
  await shot(engine + "-boss-shot");
  await seed(
    "cave_5",
    { x: 320, y: 300 },
    "s['village_combat']['floors']={'5':[dict(id='5-0',kind='boss',x=400,y=224,hp=100,phase='windup',until=1,ready=4,tx=320,ty=300,move=2,style='sweep')]}",
  );
  await shot(engine + "-boss-sweep");
  for (const size of [
    { width: 1920, height: 1080 },
    { width: 1024, height: 768 },
    { width: 844, height: 390 },
    { width: 740, height: 360 },
  ]) {
    await page.setViewportSize(size);
    await page.waitForTimeout(400);
    await shot(engine + "-layout-" + size.width);
    if (engine === "cocos") {
      const s = await read();
      for (const c of s.controls) {
        assert(c.x - c.w / 2 >= 0 && c.x + c.w / 2 <= size.width);
        assert(c.y - c.h / 2 >= 0 && c.y + c.h / 2 <= size.height);
      }
    } else {
      const bad = await page
        .locator(".cave-actions button,.bottom-nav button,.village-clock")
        .evaluateAll((nodes) =>
          nodes
            .filter((n) => n.checkVisibility())
            .filter((n) => {
              const r = n.getBoundingClientRect();
              const hit = document.elementFromPoint(
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
    "four monster families/route objects and desktop/landscape HUD controls render within usable bounds",
  );
}
async function touchFlow() {
  const recording = page.video();
  await context.close();
  if (recording) await recording.saveAs(out + "/" + engine + "-flow.webm");
  context = await browser.newContext({
    viewport: { width: 844, height: 390 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });
  page = await context.newPage();
  page.on("pageerror", (e) => errors.push(engine + ": " + e.message));
  watch();
  if (engine === "web") {
    const base = "http://127.0.0.1:5430";
    save = (await (await page.request.post(base + "/api/session")).json())
      .save_id;
    assert.equal(
      (
        await page.request.post(base + "/api/command", {
          data: {
            request_id: crypto.randomUUID(),
            action: "create",
            data: { name: "触控检查", appearance: 0 },
          },
        })
      ).status(),
      200,
    );
    await seed();
  } else {
    await load();
    save = (await read()).saveId;
    await seed();
  }
  const cdp = await context.newCDPSession(page);
  let right, up;
  if (engine === "cocos") {
    const s = await read();
    right = s.controls.find((c) => c.id === "right");
    up = s.controls.find((c) => c.id === "up");
  } else {
    const r = await page
        .getByRole("button", { name: "向右移动", exact: true })
        .boundingBox(),
      u = await page
        .getByRole("button", { name: "向上移动", exact: true })
        .boundingBox();
    right = { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    up = { x: u.x + u.width / 2, y: u.y + u.height / 2 };
  }
  const r = { id: 1, x: right.x, y: right.y },
    u = { id: 2, x: up.x, y: up.y };
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [r],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [r, u],
  });
  await page.waitForTimeout(200);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [u],
  });
  await page.waitForTimeout(180);
  const one = (await read()).player;
  await page.waitForTimeout(220);
  const two = (await read()).player;
  assert(two.x > one.x + 10);
  assert(Math.abs(two.y - one.y) < 3);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await page.waitForTimeout(350);
  const released = (await read()).player;
  await page.waitForTimeout(250);
  assert(
    Math.hypot(
      (await read()).player.x - released.x,
      (await read()).player.y - released.y,
    ) < 0.5,
  );
  check(
    "real DPR2 multi-touch retains remaining direction and clears every released finger",
  );
  await seed("cave_1", { x: 208, y: 344 });
  await shot(engine + "-reduced-touch");
  const attack = await pointer("attack");
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ id: 4, x: attack.x, y: attack.y }],
  });
  await until((s) => s.inventory.gel === 1, "touch held kills once");
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await page.waitForTimeout(1100);
  assert.equal((await read()).inventory.gel, 1);
  await shot(engine + "-touch-result");
  check(
    "real held-touch attack/release and reduced-motion confirmed feedback work",
  );
  await cdp.detach();
}
try {
  for (const which of ["web", "cocos"]) {
    await setup(which);
    await shot(which + (baseline ? "-before-entry" : "-entry"));
    await seed("cave_1", { x: 208, y: 344 });
    await shot(which + (baseline ? "-before-combat" : "-combat"));
    await page.setViewportSize({ width: 740, height: 360 });
    await page.waitForTimeout(450);
    await shot(which + (baseline ? "-before-landscape" : "-landscape"));
    if (!baseline) {
      await page.setViewportSize({ width: 1440, height: 900 });
      await actualFlow();
      await gallery();
      await touchFlow();
    }
    await context.close();
  }
  await fs.writeFile(
    out + (baseline ? "/baseline.json" : "/result.json"),
    JSON.stringify({ checks, shots, errors, expectedErrors }, null, 2),
  );
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ checks, shots, errors, expectedErrors }));
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
  await browser.close();
}
