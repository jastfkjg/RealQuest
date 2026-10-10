import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const base = process.env.REALQUEST_URL || "http://127.0.0.1:5187",
  out = new URL("../../output/character-reference/", import.meta.url);
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const read = (p) => p.evaluate(() => JSON.parse(window.render_game_to_text()));
async function until(p, fn) {
  for (let i = 0; i < 160; i++) {
    const s = await read(p);
    if (fn(s)) return s;
    await p.waitForTimeout(100);
  }
  throw Error("State timeout: " + JSON.stringify(await read(p)));
}
async function click(p, x, y) {
  const s = await read(p);
  await p
    .locator("canvas")
    .click({
      position: {
        x: (x - s.camera.viewX) * s.camera.zoom,
        y: (y - s.camera.viewY) * s.camera.zoom,
      },
    });
}
const snap = (p, n) =>
  p.screenshot({ path: new URL(n + ".png", out).pathname });
try {
  const c = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  try {
    const p = await c.newPage(),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(base);
    await p.getByLabel("你的名字").fill("档案回归旅人");
    await p.getByRole("button", { name: "外观 2" }).click();
    await p.click("#start-btn");
    await p.waitForSelector("canvas");
    await p.waitForTimeout(500);
    const initial = await read(p);
    async function panel(attr = "学识") {
      const s = await read(p);
      if (s.mode !== "explore") await p.keyboard.press("Escape");
      await p.getByRole("button", { name: "角色", exact: true }).click();
      await p
        .getByRole("button", { name: new RegExp("^" + attr + "，") })
        .click();
    }
    async function form(attr, kind) {
      await panel(attr);
      const primary = p.locator(".hc-skill-actions button").first();
      if (
        await p.getByRole("button", { name: "继续成长", exact: true }).count()
      )
        await p.getByRole("button", { name: "继续成长", exact: true }).click();
      else await primary.click();
      assert.equal(await p.getByLabel("活动类型").inputValue(), kind);
    }
    async function record(attr, kind, amount, expected) {
      await form(attr, kind);
      await p.getByLabel("时长（分钟）").fill(String(amount));
      await p.getByRole("button", { name: "保存这次成长" }).click();
      await until(p, (s) => s.attributes[expected[0]] === expected[1]);
    }
    await record("学识", "study", 24, ["wisdom", 24]);
    await panel();
    assert.equal(
      await p
        .getByRole("progressbar", { name: "古代符文解读解锁进度" })
        .getAttribute("aria-valuenow"),
      "24",
    );
    await snap(p, "real-wisdom-24");
    // Existing activity command rejection and retry must not grant XP twice.
    await form("学识", "study");
    await p.getByLabel("时长（分钟）").fill("1");
    let phase = "reject";
    const requests = [];
    await p.route("**/api/command", async (route) => {
      const body = route.request().postDataJSON();
      if (body.action !== "activity") return route.continue();
      requests.push(body);
      if (phase === "reject")
        return route.fulfill({
          status: 422,
          contentType: "application/json",
          body: JSON.stringify({
            detail: "记录暂未保存，请重试（隔离测试注入）",
          }),
        });
      if (phase === "lose") {
        phase = "retry";
        const r = await route.fetch();
        assert.equal(r.status(), 200);
        await new Promise((resolve) => setTimeout(resolve, 350));
        return route.abort("failed");
      }
      return route.continue();
    });
    await p.getByRole("button", { name: "保存这次成长" }).click();
    await p.getByRole("alert").waitFor();
    assert.equal((await read(p)).attributes.wisdom, 24);
    await snap(p, "activity-rejected");
    phase = "lose";
    await p.getByRole("button", { name: "保存这次成长" }).click();
    assert.equal(
      await p.getByRole("button", { name: "保存这次成长" }).isDisabled(),
      true,
    );
    await p
      .getByRole("button", { name: "保存这次成长" })
      .evaluate((el) => el.click());
    await until(p, (s) => s.attributes.wisdom === 25);
    assert.equal(requests.length, 3);
    assert.equal(requests[1].request_id, requests[2].request_id);
    await p.unroute("**/api/command");
    await panel();
    assert.equal(
      await p.getByText("探索能力 · 已掌握", { exact: true }).count(),
      1,
    );
    assert.equal(await p.locator(".hc-portrait .person-1").count(), 1);
    await snap(p, "real-wisdom-25");
    await p.getByRole("button", { name: "标记古代遗迹" }).click();
    assert.equal((await read(p)).navigation.targetId, "ruins");
    assert.deepEqual((await read(p)).player, initial.player);
    await record("体魄", "exercise", 49, ["strength", 49]);
    await panel("体魄");
    assert.equal(
      await p
        .getByRole("progressbar", { name: "熟练采集解锁进度" })
        .getAttribute("aria-valuenow"),
      "49",
    );
    await snap(p, "real-strength-49");
    await record("体魄", "exercise", 1, ["strength", 50]);
    await panel("体魄");
    assert.equal(
      await p.getByText("被动能力 · 已掌握", { exact: true }).count(),
      1,
    );
    await snap(p, "real-strength-50");
    await record("创造", "creative", 25, ["craft", 25]);
    await panel("创造");
    assert.equal((await read(p)).xp, 100);
    assert.equal(
      await p
        .getByRole("progressbar", { name: "旅程经验", exact: true })
        .getAttribute("aria-valuenow"),
      "0",
    );
    assert.equal(await p.locator(".hc-title").innerText(), "逐光的旅人");
    await snap(p, "real-level-2");
    await record("学识", "study", 25, ["wisdom", 50]);
    await panel();
    assert.equal(
      await p
        .getByRole("button", { name: "学识，等级 2，累计 50 EXP" })
        .count(),
      1,
    );
    assert.equal(
      await p.getByText("探索能力 · 已掌握", { exact: true }).count(),
      1,
    );
    await form("经营", "management");
    await panel("联结");
    await p.getByRole("button", { name: "标记莉亚的位置" }).click();
    assert.equal((await read(p)).navigation.targetId, "lia");
    await p.reload();
    await p.waitForSelector("canvas");
    await p.waitForTimeout(400);
    const persisted = await read(p);
    assert.equal(persisted.xp, 125);
    assert.equal(persisted.attributes.strength, 50);
    assert.equal(persisted.attributes.wisdom, 50);
    assert.deepEqual(persisted.inventory, initial.inventory);
    assert.equal(persisted.canvasCount, 1);
    await click(p, 328, 352);
    await until(p, (s) => s.inventory.wood === 4);
    await panel("体魄");
    await snap(p, "real-bonus-gather");
    await p.setViewportSize({ width: 390, height: 844 });
    await p.locator(".hc-skill").scrollIntoViewIfNeeded();
    await snap(p, "real-unlocked-390");
    assert.deepEqual(errors, []);
    await fs.writeFile(
      new URL("growth-result.json", out),
      JSON.stringify(
        {
          passed: true,
          checks: [
            "wisdom 24→25",
            "strength 49→50",
            "XP100 level2, remainder0",
            "wisdom50 attributelevel2",
            "growth preselect study/exercise/creative/management",
            "NPC, ruins markers do not move player",
            "rejection preserves XP",
            "pending repeated click blocked",
            "lost response same UUID adds1 only",
            "reload preserves125XP",
            "unlocked collection grants4 wood",
            "appearance2 preserved",
          ],
          requests: requests.map(({ action, request_id }) => ({
            action,
            request_id,
          })),
          errors,
        },
        null,
        2,
      ),
    );
    console.log(
      "PASS character real growth, unlocks, retry, persistence, collection bonus",
    );
  } catch (e) {
    const p = c.pages()[0];
    if (p) await snap(p, "growth-failure").catch(() => {});
    throw e;
  } finally {
    await c.request.delete(base + "/api/session").catch(() => {});
    await c.close();
  }
} finally {
  await browser.close();
}
