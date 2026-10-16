import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";

const base = process.env.REALQUEST_URL || "http://127.0.0.1:5404";
const out = new URL("../../output/first-expedition/", import.meta.url);
const db = process.env.REALQUEST_TEST_DB;
assert.equal(
  db,
  new URL("test.db", out).pathname,
  "Only this task's isolated database may be seeded",
);
const browser = await chromium.launch({ headless: true });
const contexts = [],
  checks = [],
  shots = [],
  errors = [];
let page, id, original;
const read = () =>
  page.evaluate(() => JSON.parse(window.render_game_to_text()));
const get = async () =>
  await (await page.request.get(base + "/api/state")).json();
async function ready() {
  await page.locator("canvas").waitFor();
  await page.waitForFunction(
    () =>
      window.render_game_to_text &&
      JSON.parse(window.render_game_to_text()).canvasCount === 1,
  );
  await page.waitForTimeout(300);
}
async function seed(patch) {
  await page.goto("about:blank");
  const s = structuredClone(original);
  s.quests = {
    settle_in: { status: "claimed", accepted_at: 1 },
    leave_valley: { status: "active", accepted_at: 1 },
  };
  s.tracked_quest = "leave_valley";
  s.village_intro.briefed = true;
  Object.assign(s, patch);
  execFileSync(
    new URL("../../backend/.venv/bin/python", import.meta.url).pathname,
    [
      "-c",
      `
import sqlite3,json,sys,time
db,key,payload=sys.argv[1:];assert db.endswith('/output/first-expedition/test.db')
c=sqlite3.connect(db);old=json.loads(c.execute('select state from players where id=?',(key,)).fetchone()[0])
s=json.loads(payload);s['revision']=old['revision']+1;s['world_clock'].update(updated_at=time.time(),running_until=0)
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
  await page.screenshot({ path: new URL(name + ".png", out).pathname });
  shots.push(name);
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
}
function check(name) {
  checks.push(name);
  console.log("PASS " + name);
}

try {
  const c = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  contexts.push(c);
  page = await c.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(base);
  await page.getByLabel("你的名字").fill("初探边界夹具");
  await page.locator("#start-btn").click();
  await ready();
  const snapshot = await get();
  id = snapshot.save_id;
  original = snapshot.state;
  const inventory = { ...original.inventory, gold: 0 };
  await seed({ inventory });
  const before = (await read()).player;
  await page
    .getByRole("button", { name: "指引我的下一步", exact: true })
    .click();
  assert.equal((await read()).navigation.targetId, "wood_1");
  assert.deepEqual((await read()).player, before);
  await shot("controls-shortage");
  check("shortage gives an actionable source and marker never teleports");
  await seed({ inventory: { ...inventory, wood: 6 } });
  await page
    .getByRole("button", { name: "指引我的下一步", exact: true })
    .click();
  assert.equal((await read()).navigation.targetId, "shop");
  check("sellable materials direct a poor player to the shop");
  const owned = { ...inventory, stone_sword: 1 };
  await seed({ inventory: owned });
  await page.getByRole("button", { name: "任务日志", exact: true }).click();
  await page.getByRole("button", { name: "打开随身装备", exact: true }).click();
  await page.waitForFunction(
    () => JSON.parse(window.render_game_to_text()).mode === "equipment",
  );
  const stopped = (await read()).player;
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(250);
  await page.keyboard.up("KeyD");
  assert.deepEqual((await read()).player, stopped);
  await page.keyboard.press("Escape");
  check(
    "journal opens equipment for an unequipped weapon and the dialog owns movement input",
  );
  await page.getByRole("button", { name: "展开任务追踪", exact: true }).click();
  await shot("controls-expanded-guide");
  const textRuns = await page.locator(".intro-tracker").evaluate((root) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const runs = [];
    while (walker.nextNode()) {
      const node = walker.currentNode,
        el = node.parentElement;
      if (!node.textContent.trim() || !el.checkVisibility()) continue;
      const style = getComputedStyle(el),
        range = document.createRange();
      range.selectNodeContents(node);
      for (const r of range.getClientRects()) {
        if (r.width && r.height)
          runs.push({
            text: node.textContent.trim(),
            color: style.color,
            size: parseFloat(style.fontSize),
            rect: { x: r.x, y: r.y, width: r.width, height: r.height },
          });
      }
    }
    return runs;
  });
  assert(
    textRuns.every((r) => r.size >= 14 || /^\d$/.test(r.text)),
    "readable guide copy; compact step numerals excepted: " +
      JSON.stringify(
        textRuns.filter((r) => r.size < 14 && !/^\d$/.test(r.text)),
      ),
  );
  assert(
    await page
      .locator(".intro-tracker button")
      .evaluateAll((buttons) =>
        buttons.every((b) => b.getBoundingClientRect().height >= 44),
      ),
    "44px guide actions",
  );
  await fs.writeFile(
    new URL("contrast-runs.json", out),
    JSON.stringify(textRuns, null, 2),
  );
  const hidden = await page.addStyleTag({
    content:
      ".intro-tracker,.intro-tracker *{color:transparent!important;text-shadow:none!important}.intro-tracker svg{visibility:hidden!important}",
  });
  await page.screenshot({
    path: new URL("contrast-background.png", out).pathname,
  });
  await hidden.evaluate((el) => el.remove());
  await page.getByRole("button", { name: "收起任务追踪", exact: true }).click();
  const equipped = { ...original.village_combat, equipped: "stone_sword" };
  await seed({
    inventory: owned,
    village_combat: equipped,
    stamina: { ...original.stamina, current: 5, updated_at: Date.now() / 1000 },
  });
  await page
    .getByRole("button", { name: "指引我的下一步", exact: true })
    .click();
  assert.equal((await read()).navigation.targetId, "home_bed");
  check("low stamina recommends free home recovery");
  const cleared = {
    ...original.village_intro,
    briefed: true,
    first_clear: true,
  };
  await seed({
    inventory: owned,
    village_intro: cleared,
    storage: { ...original.storage, gel: 3 },
  });
  await page
    .getByRole("button", { name: "指引我的下一步", exact: true })
    .click();
  assert.equal((await read()).navigation.targetId, "home_chest");
  assert(!(await get()).state.village_intro.returned);
  check(
    "stored first loot guides retrieval without falsely completing the return",
  );
  await seed({
    inventory: owned,
    tracked_quest: "first_harvest",
    quests: {
      settle_in: { status: "claimed", accepted_at: 1 },
      leave_valley: { status: "active", accepted_at: 1 },
      first_harvest: { status: "active", accepted_at: 1 },
    },
  });
  assert(
    !(
      await page.getByRole("complementary", { name: "下一步引导" }).innerText()
    ).includes("第一次初探"),
  );
  await page
    .getByRole("button", { name: "指引我的下一步", exact: true })
    .click();
  assert.equal((await read()).navigation.targetId, "plot_0");
  check("explicit side-quest tracking retains ownership of the compass");

  await seed({
    inventory: { ...owned, gel: 3 },
    village_intro: cleared,
    location: "workshop",
    position: { x: 376, y: 280 },
  });
  const storageState = await c.storageState();
  await page.goto("about:blank");
  const touch = await browser.newContext({
    storageState,
    viewport: { width: 844, height: 390 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 2,
    reducedMotion: "reduce",
  });
  contexts.push(touch);
  page = await touch.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(base);
  await ready();
  await page.getByRole("button", { name: /武备台 · 购买与打造/ }).tap();
  await page.getByRole("button", { name: "初探手记", exact: true }).tap();
  await page
    .getByRole("button", { name: "记下这次初探", exact: true })
    .scrollIntoViewIfNeeded();
  const b = await page
    .getByRole("button", { name: "记下这次初探", exact: true })
    .boundingBox();
  assert(b.height >= 44 && b.width >= 44);
  await shot("controls-touch-recap");
  const items = (await get()).state.inventory;
  await page.getByRole("button", { name: "记下这次初探", exact: true }).tap();
  await page.waitForFunction(
    () => JSON.parse(window.render_game_to_text()).villageIntro.reviewed,
  );
  assert.deepEqual((await get()).state.inventory, items);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "现实成长", exact: true }).tap();
  assert.equal((await read()).canvasCount, 1);
  await page.keyboard.press("Escape");
  assert.equal((await read()).canvasCount, 1);
  await shot("controls-touch-complete");
  check(
    "DPR2 landscape touch/reduced motion recap, close and Life Mode keep one canvas and original resources",
  );
  assert.deepEqual(errors, []);
} catch (e) {
  if (page) await shot("controls-failure").catch(() => {});
  throw e;
} finally {
  await Promise.allSettled(contexts.map((c) => c.close()));
  await browser.close();
  await fs.writeFile(
    new URL("controls-report.json", out),
    JSON.stringify(
      {
        checks,
        shots,
        errors,
        fixture:
          "isolated UI conditions only; no new real activity or combat verification",
      },
      null,
      2,
    ),
  );
}
