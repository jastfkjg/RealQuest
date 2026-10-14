import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
const base = process.env.REALQUEST_URL || "http://127.0.0.1:5207";
const out = new URL("../../output/character-points/", import.meta.url);
const db = process.env.REALQUEST_TEST_DB;
assert(
  db?.endsWith("/output/character-points/test.db"),
  "Use only the isolated character-points database",
);
const python = new URL("../../backend/.venv/bin/python", import.meta.url)
  .pathname;
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [],
  shots = [];
let expectedFailure = false;
const read = (p) => p.evaluate(() => JSON.parse(window.render_game_to_text()));
async function shot(p, name) {
  await p.waitForTimeout(200);
  assert(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  );
  const dialog = p.locator("dialog[open]");
  assert(
    await dialog.evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
    name + ": overflow",
  );
  const small = await dialog.locator("button").evaluateAll((es) =>
    es
      .filter((e) => e.checkVisibility())
      .map((e) => ({
        label: e.textContent,
        width: e.getBoundingClientRect().width,
        height: e.getBoundingClientRect().height,
      }))
      .filter((e) => e.width < 44 || e.height < 44),
  );
  assert.deepEqual(small, [], name + ": small controls");
  await p.screenshot({ path: new URL(name + ".png", out).pathname });
  shots.push(name);
}
function seed(saveId) {
  execFileSync(python, [
    "-c",
    `import json,sqlite3,sys,time
c=sqlite3.connect(sys.argv[1]); key=sys.argv[2]
s=json.loads(c.execute('select state from players where id=?',(key,)).fetchone()[0])
s.update(health_points=3,knowledge_points=2,skill_points=5,knowledge_growth={'science':3,'magic':1},skill_growth={'planting':2,'ranching':0,'building':1},stamina={'current':68,'max':100,'updated_at':time.time()})
s['revision']+=1
c.execute('update players set state=? where id=?',(json.dumps(s),key));c.commit();c.close()`,
    db,
    saveId,
  ]);
}
try {
  const c = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: {
      dir: new URL("recordings/", out).pathname,
      size: { width: 1440, height: 900 },
    },
  });
  try {
    const p = await c.newPage();
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("console", (m) => {
      if (m.type() === "error" && !expectedFailure) errors.push(m.text());
    });
    await p.goto(base);
    await p.getByLabel("你的名字").fill("档案测试旅人");
    await p.locator("#start-btn").click();
    await p.waitForSelector("canvas");
    await p.waitForTimeout(500);
    const baseline = await read(p);
    const open = async () => {
      await p.getByRole("button", { name: "角色", exact: true }).click();
      await p.locator(".hc-dossier").waitFor();
    };
    await open();
    for (const name of ["生命值", "体力值"])
      assert.equal(
        await p
          .getByRole("progressbar", { name, exact: true })
          .getAttribute("aria-valuenow"),
        "100",
      );
    assert(!/EXP|经验/.test(await p.locator(".hc-dossier").innerText()));
    assert(
      await p
        .getByRole("button", { name: "技能点不足 · 还差 1 点" })
        .isDisabled(),
    );
    await shot(p, "starter-1440");
    await p.keyboard.press("d");
    await p.keyboard.press("e");
    assert.deepEqual((await read(p)).player, baseline.player);
    await p.keyboard.press("Escape");
    assert(
      await p
        .getByRole("button", { name: "角色", exact: true })
        .evaluate((e) => e === document.activeElement),
    );
    const session = await (await c.request.get(base + "/api/state")).json();
    seed(session.save_id);
    await p.reload();
    await p.waitForTimeout(500);
    await open();
    for (const [width, height] of [
      [1440, 900],
      [1920, 1080],
      [768, 1024],
      [390, 844],
      [720, 450],
    ]) {
      await p.setViewportSize({ width, height });
      await p.locator("dialog").evaluate((e) => (e.scrollTop = 0));
      await shot(p, "profile-" + width);
      if (width === 390) {
        await p
          .getByRole("button", { name: "种植，等级 2", exact: true })
          .click();
        await shot(p, "profile-390-upgrade");
      }
    }
    if (!process.env.REALQUEST_CAPTURE_ONLY) {
      await p.setViewportSize({ width: 1440, height: 900 });
      await p.locator("dialog").evaluate((e) => (e.scrollTop = 0));
      const before = await read(p);
      await p
        .getByRole("button", { name: "科学，等级 3", exact: true })
        .click();
      await p
        .getByRole("button", { name: "魔法，等级 1", exact: true })
        .click();
      assert.equal((await read(p)).knowledgePoints, before.knowledgePoints);
      await p
        .getByRole("button", { name: "种植，等级 2", exact: true })
        .click();
      let phase = "reject";
      const requests = [];
      await p.route("**/api/command", async (route) => {
        const body = route.request().postDataJSON();
        if (body.action !== "skill_spend") return route.continue();
        requests.push(body);
        if (phase === "reject")
          return route.fulfill({
            status: 422,
            contentType: "application/json",
            body: JSON.stringify({ detail: "隔离测试：升级暂未保存" }),
          });
        if (phase === "lost") {
          phase = "retry";
          const r = await route.fetch();
          assert.equal(r.status(), 200);
          await p.waitForTimeout(600);
          return route.abort("failed");
        }
        return route.continue();
      });
      expectedFailure = true;
      await p.getByRole("button", { name: "消耗 3 技能点 · 升级" }).click();
      await p.getByRole("alert").waitFor();
      assert.equal((await read(p)).skillPoints, 5);
      assert.equal((await read(p)).skillGrowth.planting, 2);
      await shot(p, "purchase-rejected");
      phase = "lost";
      await p.getByRole("button", { name: "消耗 3 技能点 · 升级" }).click();
      await p.getByRole("button", { name: "正在保存…" }).waitFor();
      assert(
        await p
          .getByRole("button", { name: "养殖，等级 0", exact: true })
          .isDisabled(),
      );
      await shot(p, "purchase-pending");
      await p.locator(".hc-result").waitFor();
      assert.equal((await read(p)).skillPoints, 2);
      assert.equal((await read(p)).skillGrowth.planting, 3);
      assert.equal(requests.at(-1).request_id, requests.at(-2).request_id);
      assert(
        await p
          .getByRole("button", { name: "技能点不足 · 还差 2 点" })
          .isDisabled(),
      );
      await shot(p, "purchase-saved");
      await p.unroute("**/api/command");
      expectedFailure = false;
      for (const [name, field] of [
        ["生命", "vitality"],
        ["体力", "stamina"],
      ]) {
        await p
          .getByRole("button", { name: "提升" + name + "上限", exact: true })
          .click();
        await p.getByRole("button", { name: "消耗 1 健康点 · 提升" }).click();
        await p.locator(".hc-result").waitFor();
        assert.equal((await read(p))[field].max, 105);
      }
      assert.equal((await read(p)).healthPoints, 1);
      for (const [name, field, level] of [
        ["科学", "science", 3],
        ["魔法", "magic", 1],
      ]) {
        await p
          .getByRole("button", { name: name + "，等级 " + level, exact: true })
          .click();
        await p.getByRole("button", { name: "消耗 1 知识点 · 升级" }).click();
        await p.locator(".hc-result").waitFor();
        assert.equal((await read(p)).knowledgeGrowth[field], level + 1);
      }
      assert.equal((await read(p)).knowledgePoints, 0);
      await p
        .getByRole("button", { name: "养殖，等级 0", exact: true })
        .click();
      const other = await (await c.request.get(base + "/api/state")).json();
      const quote = other.state.character_growth_options.ranching;
      const response = await c.request.post(base + "/api/command", {
        data: {
          request_id: crypto.randomUUID(),
          action: "skill_spend",
          data: {
            branch: "ranching",
            expected_invested: quote.expected_invested,
          },
        },
      });
      assert.equal(response.status(), 200);
      expectedFailure = true;
      await p.getByRole("button", { name: "消耗 1 技能点 · 升级" }).click();
      await p.getByRole("alert").waitFor();
      assert.equal((await read(p)).skillPoints, 1);
      assert.equal((await read(p)).skillGrowth.ranching, 1);
      await shot(p, "stale-state-synced");
      expectedFailure = false;
      const saved = await read(p);
      assert.equal(saved.xp, before.xp);
      assert.deepEqual(saved.attributes, before.attributes);
      assert.deepEqual(saved.inventory, before.inventory);
      await p.reload();
      await p.waitForTimeout(500);
      await open();
      const restored = await read(p);
      for (const key of [
        "vitality",
        "skillGrowth",
        "knowledgeGrowth",
        "healthPoints",
        "knowledgePoints",
        "skillPoints",
      ])
        assert.deepEqual(restored[key], saved[key]);
      await p.getByRole("button", { name: "关闭面板", exact: true }).focus();
      for (let i = 0; i < 16; i++) {
        await p.keyboard.press("Tab");
        assert(
          await p
            .locator("dialog")
            .evaluate((e) => e.contains(document.activeElement)),
        );
      }
      await p.keyboard.press("Escape");
      assert(
        await p
          .getByRole("button", { name: "角色", exact: true })
          .evaluate((e) => e === document.activeElement),
      );
      await p.getByRole("button", { name: "现实成长", exact: true }).click();
      await p.keyboard.press("Escape");
      await open();
      assert.equal((await read(p)).skillPoints, 1);
      await shot(p, "final-1440");
      await p.addStyleTag({
        content:
          ".hc-growth-row small,.hc-upgrade-note,.hc-accounting > div,.hc-wallet dt small { font-size:18px !important;line-height:1.6 !important }",
      });
      await shot(p, "large-text-1440");
      const touch = await browser.newContext({
        viewport: { width: 375, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        reducedMotion: "reduce",
        storageState: await c.storageState(),
      });
      try {
        const phone = await touch.newPage();
        phone.on("pageerror", (e) => errors.push(e.message));
        await phone.goto(base);
        await phone.waitForSelector("canvas");
        await phone.getByRole("button", { name: "角色", exact: true }).tap();
        await shot(phone, "touch-375");
        await phone
          .getByRole("button", { name: "提升生命上限", exact: true })
          .tap();
        await phone.getByRole("button", { name: "消耗 1 健康点 · 提升" }).tap();
        await phone.locator(".hc-result").waitFor();
        assert.equal((await read(phone)).vitality.max, 110);
        assert.equal((await read(phone)).healthPoints, 0);
        await shot(phone, "touch-upgrade-saved");
      } finally {
        await touch.close();
      }
    }
    assert.deepEqual(errors, []);
    await fs.writeFile(
      new URL("result.json", out),
      JSON.stringify(
        {
          shots,
          errors,
          scope: process.env.REALQUEST_CAPTURE_ONLY
            ? "layout only"
            : "layout, selection, pending, rejection, lost response replay, stale state, health, knowledge, persistence, legacy conservation, focus, touch",
        },
        null,
        2,
      ),
    );
    console.log(
      JSON.stringify({ status: "pass", screenshots: shots.length, errors }),
    );
  } finally {
    await c.close();
  }
} finally {
  await browser.close();
}
