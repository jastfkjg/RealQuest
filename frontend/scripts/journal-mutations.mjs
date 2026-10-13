import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const base = process.env.REALQUEST_URL || "http://127.0.0.1:5187";
const out = new URL("../../output/journal-reference/", import.meta.url);
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const read = (p) => p.evaluate(() => JSON.parse(window.render_game_to_text()));
async function until(p, fn) {
  for (let i = 0; i < 160; i++) {
    const s = await read(p);
    if (fn(s)) return s;
    await p.waitForTimeout(100);
  }
  throw Error("State not reached: " + JSON.stringify(await read(p)));
}
async function click(p, x, y) {
  const s = await read(p);
  await p.locator("canvas").click({
    position: {
      x: (x - s.camera.viewX) * s.camera.zoom,
      y: (y - s.camera.viewY) * s.camera.zoom,
    },
  });
}
async function go(p, x, y) {
  await click(p, x, y);
  await until(
    p,
    (s) => Math.hypot(s.player.x - x, s.player.y - y) < 18 && !s.walking.length,
  );
  await p.waitForTimeout(200);
}
const snap = (p, name) =>
  p.screenshot({ path: new URL(name + ".png", out).pathname });
try {
  const c = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  try {
    const p = await c.newPage();
    const errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(base);
    await p.getByLabel("你的名字").fill("手账回归旅人");
    await p.click("#start-btn");
    await p.waitForSelector("canvas");
    await p.waitForTimeout(650);
    await click(p, 160, 180);
    await until(p, (s) => s.location === "home");
    await p.waitForTimeout(350);
    await p.keyboard.press("e");
    await until(p, (s) => s.location === "overworld");
    await p.waitForTimeout(350);
    await click(p, 328, 352);
    await until(p, (s) => s.inventory.wood === 3);
    await p.waitForTimeout(250);
    await p.getByRole("button", { name: "任务日志", exact: true }).click();
    assert.equal(await p.locator(".hj-status").innerText(), "可交付");
    assert.equal(
      await p.locator(".hj-objectives [data-complete=true]").count(),
      2,
    );
    assert.equal(
      await p.getByRole("button", { name: "交付任务 · 领取奖励" }).count(),
      0,
    );
    await snap(p, "journal-ready");
    await p.getByRole("button", { name: "标记交付地点" }).click();
    await click(p, 256, 272);
    await until(p, (s) => s.mode === "board");
    await p.getByRole("button", { name: "交付任务 · 领取奖励" }).click();
    await until(
      p,
      (s) => s.quests.find((q) => q.id === "settle_in").status === "claimed",
    );
    assert.equal((await read(p)).inventory.gold, 32);
    assert.equal((await read(p)).xp, 10);
    await p.getByRole("button", { name: /土地的第一份回礼/ }).click();
    await p.getByRole("button", { name: "接取任务" }).click();
    await until(
      p,
      (s) => s.quests.find((q) => q.id === "first_harvest").status === "active",
    );
    await p.keyboard.press("Escape");
    await p.getByRole("button", { name: "任务日志", exact: true }).click();
    await p.getByRole("button", { name: "完成篇章", exact: true }).click();
    assert.equal(await p.getByText("已交付，奖励已领取").count(), 1);
    await snap(p, "journal-completed");
    await p.reload();
    await p.waitForSelector("canvas");
    await p.waitForTimeout(500);
    assert.equal((await read(p)).inventory.gold, 32);
    assert.equal((await read(p)).xp, 10);
    await go(p, 392, 360);
    await go(p, 520, 376);
    await click(p, 576, 384);
    await until(p, (s) => s.mode === "npc");
    await p.getByRole("button", { name: "继续 · 聊聊这份委托" }).click();
    await p.getByRole("button", { name: "接受委托" }).click();
    await until(
      p,
      (s) => s.quests.find((q) => q.id === "forest_path").status === "active",
    );
    await p.keyboard.press("Escape");
    await p.getByRole("button", { name: "任务日志", exact: true }).click();
    await p.getByRole("button", { name: /查看任务：土地的/ }).click();
    const before = (await (await c.request.get(base + "/api/state")).json())
      .state;
    assert.notEqual(before.tracked_quest, "first_harvest");
    let phase = "reject";
    const requests = [];
    await p.route("**/api/command", async (route) => {
      const body = route.request().postDataJSON();
      if (body.action !== "track_quest") return route.continue();
      requests.push(body);
      if (phase === "reject") {
        await new Promise((r) => setTimeout(r, 350));
        return route.fulfill({
          status: 422,
          contentType: "application/json",
          body: JSON.stringify({
            detail: "暂时无法追踪，请重试（隔离测试注入）",
          }),
        });
      }
      if (phase === "lose-response") {
        phase = "retry";
        const response = await route.fetch();
        assert.equal(response.status(), 200);
        await new Promise((r) => setTimeout(r, 400));
        return route.abort("failed");
      }
      return route.continue();
    });
    await p.getByRole("button", { name: "追踪任务", exact: true }).click();
    await p.getByRole("alert").waitFor();
    await snap(p, "journal-rejected");
    const rejected = (await (await c.request.get(base + "/api/state")).json())
      .state;
    assert.equal(rejected.tracked_quest, before.tracked_quest);
    assert.deepEqual(rejected.inventory, before.inventory);
    phase = "lose-response";
    await p.getByRole("button", { name: "追踪任务", exact: true }).click();
    assert.equal(
      await p.getByRole("button", { name: "处理中…" }).isDisabled(),
      true,
    );
    await p
      .getByRole("button", { name: "处理中…" })
      .evaluate((el) => el.click());
    await snap(p, "journal-pending");
    await p.getByRole("button", { name: "正在追踪", exact: true }).waitFor();
    assert.equal(requests.length, 3);
    assert.equal(requests[1].request_id, requests[2].request_id);
    const after = (await (await c.request.get(base + "/api/state")).json())
      .state;
    assert.equal(after.tracked_quest, "first_harvest");
    assert.deepEqual(after.inventory, before.inventory);
    assert.equal(after.xp, before.xp);
    await p.reload();
    await p.waitForSelector("canvas");
    await p.waitForTimeout(400);
    await p.getByRole("button", { name: "任务日志", exact: true }).click();
    assert.equal(
      await p.locator(".hj-page-title").innerText(),
      "土地的第一份回礼",
    );
    await p.getByRole("button", { name: "成长记录", exact: true }).click();
    await p
      .locator(".hj-detail")
      .getByRole("button", { name: "记录一次成长" })
      .click();
    await until(p, (s) => s.mode === "activity");
    await p
      .getByLabel("主题或备注")
      .fill("隔离测试记录：读完一章，记下一个新问题。");
    await p.getByRole("button", { name: "保存这次成长" }).click();
    await until(p, (s) => s.attributes.wisdom === 25);
    await p.keyboard.press("Escape");
    await p.getByRole("button", { name: "任务日志", exact: true }).click();
    await p.getByRole("button", { name: "成长记录", exact: true }).click();
    assert.equal(
      await p.getByText("隔离测试记录：读完一章，记下一个新问题。").count(),
      1,
    );
    assert.ok(
      (await p.locator(".hj-history").innerText()).includes(
        "手动填报 · 未验证",
      ),
    );
    await snap(p, "journal-growth");
    await p.setViewportSize({ width: 390, height: 844 });
    await p.getByRole("button", { name: /查看 .* 的成长记录/ }).click();
    await snap(p, "journal-growth-390");
    assert.deepEqual(errors, []);
    await fs.writeFile(
      new URL("mutations-result.json", out),
      JSON.stringify(
        {
          passed: true,
          checks: [
            "real home/gather → ready",
            "giver-only claim → 32 gold / 10 XP",
            "completed chapter / reload",
            "board/NPC accept",
            "rejected tracking preserves state",
            "lost response retries same request ID",
            "pending click deduplicated",
            "tracking persists",
            "real manual growth / provenance",
            "mobile growth",
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
      "PASS journal actual mutations, rewards, retry, persistence and growth",
    );
  } catch (error) {
    const p = c.pages()[0];
    if (p) await snap(p, "mutation-failure").catch(() => {});
    throw error;
  } finally {
    await c.request.delete(base + "/api/session").catch(() => {});
    await c.close();
  }
} finally {
  await browser.close();
}
