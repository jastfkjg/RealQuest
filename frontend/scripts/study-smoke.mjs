import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const base = process.env.REALQUEST_URL || "http://127.0.0.1:5193";
const out = new URL("../../output/study-reference/", import.meta.url);
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [],
  requests = [],
  layouts = [];
const read = (p) => p.evaluate(() => JSON.parse(window.render_game_to_text()));
const state = async (p) =>
  (await (await p.request.get(base + "/api/state")).json()).state;
async function until(p, predicate, seconds = 12) {
  for (let n = 0; n < seconds * 5; n++) {
    const value = await read(p);
    if (predicate(value)) return value;
    await p.waitForTimeout(200);
  }
  throw Error("State timeout: " + JSON.stringify(await read(p)));
}
async function snap(p, name) {
  await p.screenshot({ path: new URL(name + ".png", out).pathname });
}
async function inspectLayout(p, label) {
  const result = await p.locator(".study-page").evaluate((el) => ({
    overflow: el.scrollWidth > el.clientWidth + 1,
    controls: [...el.querySelectorAll("button, input, summary")]
      .filter(
        (e) =>
          e.getClientRects().length &&
          e.closest("details:not([open])") === null,
      )
      .filter((e) => e.getBoundingClientRect().height < 43)
      .map((e) => e.textContent || e.id),
    width: innerWidth,
    height: innerHeight,
  }));
  assert.equal(result.overflow, false, label);
  assert.deepEqual(result.controls, [], label);
  layouts.push({ label, ...result });
}
async function enter(p) {
  await p.getByRole("button", { name: "现实成长", exact: true }).click();
  await p.getByRole("button", { name: "今日研习", exact: true }).click();
  await p.getByRole("dialog", { name: "今日研习", exact: true }).waitFor();
}
try {
  const c = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
    recordVideo: {
      dir: new URL("recordings/", out).pathname,
      size: { width: 1440, height: 900 },
    },
  });
  try {
    const p = await c.newPage();
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("console", (m) => {
      if (
        m.type() === "error" &&
        !/422|ERR_FAILED|Failed to fetch/.test(m.text())
      )
        errors.push(m.text());
    });
    await p.goto(base);
    await p.getByLabel("你的名字").fill("研习旅人");
    await p.click("#start-btn");
    await p.waitForSelector("canvas");
    await p.waitForTimeout(600);
    const initial = await state(p);
    await enter(p);
    for (const [width, height] of [
      [1440, 900],
      [390, 844],
      [768, 1024],
      [1920, 1080],
      [720, 450],
    ]) {
      await p.setViewportSize({ width, height });
      await p.locator(".study-page").evaluate((el) => el.scrollTo(0, 0));
      await p.waitForTimeout(180);
      await inspectLayout(p, "draft-" + width);
      await snap(p, "draft-" + width);
    }
    await p.setViewportSize({ width: 1440, height: 900 });
    await p.getByLabel("写下你的学习主题").fill("读一页植物笔记");
    await p.getByRole("button", { name: "自定", exact: true }).click();
    await p.getByLabel("目标分钟数").fill("1");
    const pos = (await read(p)).player;
    await p.getByLabel("写下你的学习主题").press("End");
    await p.keyboard.type("wasd");
    await p.getByLabel("写下你的学习主题").fill("读一页植物笔记");
    assert.deepEqual((await read(p)).player, pos);
    await p.getByLabel("写下你的学习主题").evaluate((el) =>
      el.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter",
          isComposing: true,
          bubbles: true,
        }),
      ),
    );
    assert.equal((await state(p)).study_task_log.length, 0);
    let phase = "reject";
    await p.route("**/api/command", async (route) => {
      const body = route.request().postDataJSON();
      if (body.action !== "study_create") return route.continue();
      requests.push(body);
      if (phase === "reject")
        return route.fulfill({
          status: 422,
          contentType: "application/json",
          body: JSON.stringify({ detail: "这页暂未保存，请重试（隔离测试）" }),
        });
      if (phase === "lose") {
        phase = "retry";
        const r = await route.fetch();
        assert.equal(r.status(), 200);
        await new Promise((r) => setTimeout(r, 450));
        return route.abort("failed");
      }
      return route.continue();
    });
    await p.getByRole("button", { name: "记下这项研习" }).click();
    await p.getByRole("alert").waitFor();
    await snap(p, "create-rejected");
    assert.equal((await state(p)).study_task_log.length, 0);
    phase = "lose";
    await p.getByRole("button", { name: "记下这项研习" }).click();
    await p.getByRole("button", { name: "正在记下…" }).waitFor();
    assert.equal(
      await p.getByRole("button", { name: "正在记下…" }).isDisabled(),
      true,
    );
    await p
      .getByRole("button", { name: "正在记下…" })
      .evaluate((el) => el.click());
    await until(p, (s) => s.studyTasks.length === 1);
    await p.getByRole("button", { name: "开始研习", exact: true }).waitFor();
    assert.equal(requests.length, 3);
    assert.equal(requests[1].request_id, requests[2].request_id);
    await p.unroute("**/api/command");
    await snap(p, "ready-1440");
    assert.deepEqual((await state(p)).inventory, initial.inventory);
    await p.getByRole("button", { name: "开始研习", exact: true }).click();
    await until(p, (s) => !!s.timer);
    await p.waitForTimeout(1300);
    await p.getByRole("button", { name: "歇一会儿" }).click();
    await until(p, (s) => s.timer && !s.timer.running);
    const paused = (await state(p)).timer;
    await p.reload();
    await p.getByRole("dialog", { name: "今日研习", exact: true }).waitFor();
    assert.equal((await state(p)).timer.elapsed, paused.elapsed);
    assert.equal((await read(p)).canvasCount, 1);
    await snap(p, "paused-reloaded");
    // A modal owns shortcuts; no world movement or second overlay.
    await p.getByRole("button", { name: "继续研习", exact: true }).focus();
    for (const key of ["m", "i", "j", "1", "ArrowRight"])
      await p.keyboard.press(key);
    assert.equal((await read(p)).mode, "study");
    assert.deepEqual((await read(p)).player, pos);
    await p.getByRole("button", { name: "继续研习", exact: true }).click();
    await until(p, (s) => s.timer?.running);
    console.log("Real timer running: waiting for one actual server minute.");
    for (const [width, height] of [
      [1440, 900],
      [390, 844],
      [768, 1024],
      [1920, 1080],
      [720, 450],
    ]) {
      await p.setViewportSize({ width, height });
      await p.locator(".study-page").evaluate((el) => el.scrollTo(0, 0));
      await p.waitForTimeout(150);
      await inspectLayout(p, "timer-" + width);
      await snap(p, "timer-" + width);
      if (width === 390) {
        await p
          .getByRole("button", { name: "结束并记下" })
          .scrollIntoViewIfNeeded();
        await snap(p, "timer-390-controls");
      }
    }
    await p.setViewportSize({ width: 1440, height: 900 });
    for (let n = 0; n < 70; n++) {
      const s = await state(p),
        t = s.timer;
      const now = (await (await p.request.get(base + "/api/state")).json())
        .server_time;
      if (t.elapsed + now - t.started_at >= 61) break;
      await p.waitForTimeout(1000);
    }
    let loseFinish = true;
    const finishRequests = [];
    await p.route("**/api/command", async (route) => {
      const body = route.request().postDataJSON();
      if (body.action !== "timer_finish") return route.continue();
      finishRequests.push(body);
      if (loseFinish) {
        loseFinish = false;
        const r = await route.fetch();
        assert.equal(r.status(), 200);
        await new Promise((r) => setTimeout(r, 350));
        return route.abort("failed");
      }
      return route.continue();
    });
    await p.getByRole("button", { name: "结束并记下" }).click();
    await until(p, (s) => !s.timer && s.studyTasks[0].completed_at !== null);
    // Foreground polling may observe the commit before the lost-response retry finishes.
    // Wait for the public pending state to settle before removing interception.
    await p.getByRole("button", { name: "写下下一项研习", exact: true }).waitFor();
    await p.unroute("**/api/command");
    assert.equal(finishRequests.length, 2);
    assert.equal(finishRequests[0].request_id, finishRequests[1].request_id);
    let saved = await state(p);
    assert.equal(saved.xp, 1);
    assert.equal(saved.activities.length, 1);
    assert.equal(saved.activities[0].source, "timer");
    assert.equal(saved.study_task_log[0].minutes, 1);
    assert.deepEqual(saved.inventory, initial.inventory);
    await snap(p, "completed-timer");
    await p.reload();
    await p.getByRole("button", { name: "写下下一项研习" }).waitFor();
    assert.equal((await state(p)).xp, 1);
    // Associate ordinary manual learning records through real UI, with no additional reward.
    await p.getByRole("button", { name: "记录其他成长" }).click();
    await p.getByLabel("活动类型").selectOption("study");
    await p.getByLabel("时长（分钟）").fill("25");
    await p.getByLabel("主题或备注").fill("整理植物笔记");
    await p.getByRole("button", { name: "保存这次成长" }).click();
    await until(p, (s) => s.attributes.wisdom === 26);
    await p.getByRole("button", { name: "今日研习", exact: true }).click();
    await p.getByRole("button", { name: "写下一项", exact: true }).click();
    await p.getByLabel("写下你的学习主题").fill("整理植物笔记");
    await p.getByRole("button", { name: "记下这项研习" }).click();
    await p.getByRole("button", { name: "开始研习", exact: true }).waitFor();
    await p.getByRole("button", { name: "已有学习记录？记入这一页" }).click();
    await p
      .locator(".study-link-records")
      .getByRole("button", { name: /整理植物笔记/ })
      .click();
    await until(
      p,
      (s) => s.studyTasks.filter((t) => t.completed_at !== null).length === 2,
    );
    saved = await state(p);
    assert.equal(saved.xp, 26);
    assert.equal(saved.knowledge_shard, 1);
    assert.equal(saved.activities.length, 2);
    await p.getByRole("button", { name: "已有学习记录？收起" }).click();
    await p
      .locator(".study-records summary")
      .filter({ hasText: /^这一页的记录/ })
      .click();
    await snap(p, "linked-completed-1440");
    await p.setViewportSize({ width: 390, height: 844 });
    await p.locator(".study-page").evaluate((el) => el.scrollTo(0, 0));
    await snap(p, "linked-completed-390");
    await p
      .getByRole("button", { name: "标记古代遗迹" })
      .scrollIntoViewIfNeeded();
    await snap(p, "world-unlock-390");
    const beforePosition = (await state(p)).position;
    await p.getByRole("button", { name: "标记古代遗迹" }).click();
    assert.equal((await read(p)).navigation.targetId, "ruins");
    assert.deepEqual((await state(p)).position, beforePosition);
    assert.equal(new URL(p.url()).hash, "");
    await p.setViewportSize({ width: 1440, height: 900 });
    await enter(p);
    await p.keyboard.press("Escape");
    await until(p, (s) => s.mode === "explore");
    await p.waitForTimeout(100);
    assert.equal(
      await p
        .getByRole("button", { name: "现实成长", exact: true })
        .evaluate((el) => el === document.activeElement),
      true,
    );
    assert.deepEqual(errors, []);
    await c.request.delete(base + "/api/session");
  } finally {
    await c.close();
  }
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });
  try {
    const p = await mobile.newPage();
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(base);
    await p.getByLabel("你的名字").fill("掌中旅人");
    await p.locator("#start-btn").tap();
    await p.waitForSelector("canvas");
    await enter(p);
    await p
      .getByLabel("写下你的学习主题")
      .fill("学习植物的叶片形状并整理一页笔记，记下今天在林间看见的新发现");
    await p.getByRole("button", { name: "15 分钟", exact: true }).tap();
    await p.getByRole("button", { name: "记下这项研习" }).tap();
    await p.getByRole("button", { name: "开始研习", exact: true }).waitFor();
    await p.getByRole("button", { name: "开始研习", exact: true }).tap();
    await until(p, (s) => !!s.timer);
    await p.getByRole("button", { name: "歇一会儿" }).tap();
    await until(p, (s) => !s.timer.running);
    await inspectLayout(p, "touch-long-title");
    await snap(p, "touch-long-title");
    await p.getByRole("button", { name: "结束并记下" }).tap();
    await until(p, (s) => !s.timer);
    assert.equal((await state(p)).activities.length, 0);
    await mobile.request.delete(base + "/api/session");
  } finally {
    await mobile.close();
  }
  assert.deepEqual(errors, []);
  await fs.writeFile(
    new URL("results.json", out),
    JSON.stringify(
      {
        passed: true,
        layouts,
        errors,
        checks: [
          "actual minute timer",
          "pause/reload/resume",
          "stable task create and lost-response retry",
          "finish once after lost response",
          "link without second reward",
          "wisdom unlock marker without teleport",
          "modal keyboard and IME ownership",
          "Escape focus return",
          "touch, long title, subminute no reward",
        ],
      },
      null,
      2,
    ),
  );
  console.log("Study browser flow passed.");
} finally {
  await browser.close();
}
