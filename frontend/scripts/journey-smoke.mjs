import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const base = process.env.REALQUEST_URL || "http://127.0.0.1:5195";
const out = new URL("../../output/study-journey/", import.meta.url);
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const cases = [],
  errors = [],
  ids = [];
const state = async (p) =>
  (await (await p.request.get(base + "/api/state")).json()).state;
const nav = (p, name) =>
  p
    .getByRole("navigation", { name: "研习手札章节" })
    .getByRole("button", { name, exact: true });
const button = (p, name) => p.getByRole("button", { name, exact: true });
async function until(p, predicate) {
  for (let i = 0; i < 100; i++) {
    const s = await state(p);
    if (predicate(s)) return s;
    await p.waitForTimeout(100);
  }
  throw Error("State timeout");
}
async function shot(p, name) {
  await p.locator(".study-page").evaluate((e) => e.scrollTo(0, 0));
  await p.waitForTimeout(150);
  const x = await p.locator(".study-page").evaluate((e) => ({
    overflow: e.scrollWidth > e.clientWidth + 1,
    small: [...e.querySelectorAll("button,input,summary")]
      .filter(
        (n) =>
          n.checkVisibility() &&
          !n.closest("details:not([open])") &&
          n.getBoundingClientRect().height < 43,
      )
      .map((n) => n.textContent || n.id),
  }));
  assert.equal(x.overflow, false, name);
  assert.deepEqual(x.small, [], name);
  await p.screenshot({ path: new URL(name + ".png", out).pathname });
  cases.push({ name, ...x });
}
async function sizes(p, stage) {
  for (const [width, height] of [
    [1440, 900],
    [390, 844],
    [768, 1024],
    [1920, 1080],
    [720, 450],
  ]) {
    await p.setViewportSize({ width, height });
    await shot(p, stage + "-" + width);
  }
  await p.setViewportSize({ width: 1440, height: 900 });
}
const file = new URL("recovery-private.json", out).pathname;
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
    await c.addInitScript(() => {
      const realNow = Date.now.bind(Date);
      Date.now = () => realNow() + 172800000;
    });
    const p = await c.newPage();
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("console", (m) => {
      if (
        m.type() === "error" &&
        !/422|ERR_FAILED|ERR_INTERNET_DISCONNECTED|Failed to fetch/.test(
          m.text(),
        )
      )
        errors.push(m.text());
    });
    await p.goto(base);
    await p.getByLabel("你的名字").fill("林间研习者");
    await p.click("#start-btn");
    await p.waitForSelector("canvas");
    await button(p, "现实成长").click();
    await button(p, "今日研习").click();
    await nav(p, "研习计划").click();
    await sizes(p, "new-plan");
    await p.getByLabel("计划名称", { exact: true }).fill("读懂林间植物图鉴");
    await p.getByLabel("自定分钟").fill("1");
    const pos = (await state(p)).position;
    await p.getByLabel("计划名称", { exact: true }).press("End");
    await p.keyboard.type("wasd");
    assert.deepEqual((await state(p)).position, pos);
    await p.getByLabel("计划名称", { exact: true }).fill("读懂林间植物图鉴");
    await p.getByLabel("计划名称", { exact: true }).evaluate((e) =>
      e.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter",
          isComposing: true,
          bubbles: true,
        }),
      ),
    );
    assert.equal((await state(p)).study_plan_log.length, 0);
    let phase = "reject";
    await p.route("**/api/command", async (r) => {
      const b = r.request().postDataJSON();
      if (b.action !== "study_plan_create") return r.continue();
      if (phase === "reject")
        return r.fulfill({
          status: 422,
          contentType: "application/json",
          body: JSON.stringify({ detail: "书页暂未保存，请重试（隔离测试）" }),
        });
      ids.push(b.request_id);
      if (phase === "lose") {
        phase = "retry";
        await r.fetch();
        return r.abort("failed");
      }
      return r.continue();
    });
    await button(p, "装订这本计划").click();
    await p.getByRole("alert").waitFor();
    assert.equal((await state(p)).study_plan_log.length, 0);
    assert.equal(
      await p.getByLabel("计划名称", { exact: true }).inputValue(),
      "读懂林间植物图鉴",
    );
    phase = "lose";
    await button(p, "装订这本计划").click();
    await button(p, "翻开今日研习").waitFor();
    assert.equal(new Set(ids).size, 1);
    assert.equal((await state(p)).study_plan_log.length, 1);
    await p.unroute("**/api/command");
    await sizes(p, "plan");
    await nav(p, "存档与恢复").click();
    const download = p.waitForEvent("download");
    await button(p, "下载旅程凭证").click();
    await (await download).saveAs(file);
    await sizes(p, "save");
    await nav(p, "研习计划").click();
    await button(p, "翻开今日研习").click();
    await button(p, "开始研习").waitFor();
    const task = (await state(p)).study_task_log[0];
    await p.getByText("整理这一页", { exact: true }).click();
    await p.getByLabel("这一页的主题").fill("叶片的纹路与光");
    await button(p, "保存书页修改").click();
    await until(p, (s) => s.study_task_log[0].title === "叶片的纹路与光");
    await p.getByText("整理这一页", { exact: true }).click();
    await button(p, "开始研习").click();
    await until(p, (s) => !!s.timer);
    await sizes(p, "timer");
    await p.evaluate(() => {
      window.originalDateNow = Date.now;
      Date.now = () => window.originalDateNow() + 7200000;
    });
    await p.waitForTimeout(1100);
    assert.match(await p.getByRole("timer").innerText(), /^00:/);
    await p.evaluate(() => {
      Date.now = window.originalDateNow;
    });
    const second = await c.newPage();
    await second.goto(base + "/#study");
    await button(second, "歇一会儿").waitFor();
    const cdp = await c.newCDPSession(p);
    await cdp.send("Page.setWebLifecycleState", { state: "frozen" });
    console.log(
      "Background verification: Chromium page frozen for 62 real seconds.",
    );
    await new Promise((r) => setTimeout(r, 62000));
    await button(second, "歇一会儿").click();
    const paused = await until(second, (s) => s.timer && !s.timer.running);
    assert.ok(paused.timer.elapsed >= 62 && paused.timer.elapsed < 120);
    await cdp.send("Page.setWebLifecycleState", { state: "active" });
    await p.bringToFront();
    await button(p, "继续研习").waitFor({ timeout: 20000 });
    assert.match((await p.getByRole("timer").innerText()).trim(), /^01:/);
    await second.close();
    await cdp.detach();
    await p.reload();
    await button(p, "继续研习").waitFor();
    const clock = await p.getByRole("timer").innerText();
    await p.waitForTimeout(1500);
    assert.equal(await p.getByRole("timer").innerText(), clock);
    await c.setOffline(true);
    await button(p, "继续研习").click();
    await p.getByRole("alert").waitFor();
    await c.setOffline(false);
    await until(p, (s) => s.timer && !s.timer.running);
    let lost = false;
    await p.route("**/api/command", async (r) => {
      if (r.request().postDataJSON().action === "timer_finish" && !lost) {
        lost = true;
        await r.fetch();
        return r.abort("failed");
      }
      return r.continue();
    });
    await button(p, "结束并记下").click();
    await p.getByText("这一页，写好了", { exact: true }).waitFor();
    await p.unroute("**/api/command");
    const done = await state(p);
    assert.equal(done.xp, 1);
    assert.equal(done.activities.length, 1);
    assert.equal(done.activities[0].study_task_id, task.id);
    await sizes(p, "complete");
    await button(p, "收好书签，明日继续").click();
    await p
      .getByText("今天已写好。明天回来，从这里继续。", { exact: true })
      .waitFor();
    await button(p, "翻开今天这一页").click();
    assert.equal((await state(p)).study_task_log.length, 1);
    await nav(p, "研习计划").click();
    await p.getByText("整理这本计划", { exact: true }).click();
    await button(p, "收进归档书架").click();
    await button(p, "取回这本计划").waitFor();
    await sizes(p, "archived");
    await nav(p, "归档回看").click();
    await sizes(p, "history");
    await p.reload();
    await p.getByRole("heading", { name: "归档回看", exact: true }).waitFor();
    assert.equal((await state(p)).xp, 1);
    await p.keyboard.press("Escape");
    await p.waitForSelector(".study-page", { state: "detached" });
    assert.equal(
      await p.evaluate(() =>
        document.activeElement?.getAttribute("aria-label"),
      ),
      "现实成长",
    );
    assert.equal(await p.locator("canvas").count(), 1);
    const recoverContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
      reducedMotion: "reduce",
    });
    try {
      const r = await recoverContext.newPage();
      r.on("pageerror", (e) => errors.push(e.message));
      await r.goto(base);
      await button(r, "已有旅程凭证？找回存档").tap();
      await r.getByLabel("选择旅程凭证文件").setInputFiles({
        name: "bad.json",
        mimeType: "application/json",
        buffer: Buffer.from('{"state":{"xp":9999}}'),
      });
      await r.getByRole("alert").waitFor();
      assert.equal((await state(r)).character, null);
      await r.getByLabel("选择旅程凭证文件").setInputFiles(file);
      await r
        .getByRole("heading", { name: "林间研习者的旅程", exact: true })
        .waitFor();
      await r.screenshot({
        path: new URL("recovery-mobile-preview.png", out).pathname,
        fullPage: true,
      });
      await button(r, "恢复这段旅程").tap();
      await r.waitForSelector(".study-page");
      const recovered = await state(r);
      assert.equal(recovered.xp, 1);
      assert.equal(recovered.activities.length, 1);
      assert.ok(recovered.study_plan_log[0].archived_at);
      await nav(r, "研习计划").tap();
      await button(r, "已归档").tap();
      await button(r, "取回这本计划").tap();
      await button(r, "翻开今天这一页").waitFor();
      assert.equal((await state(r)).xp, 1);
      await r.setViewportSize({ width: 375, height: 812 });
      await shot(r, "recovered-375");
      await r.setViewportSize({ width: 844, height: 390 });
      await shot(r, "recovered-landscape");
      await r.setViewportSize({ width: 390, height: 844 });
      await r.getByText("整理这本计划", { exact: true }).tap();
      await r
        .getByLabel("计划名称", { exact: true })
        .fill(
          "这是一个很长的研习计划名称，用来确认中文主题换行后依然可以继续研习",
        );
      await button(r, "保存计划修改").tap();
      await shot(r, "long-title-mobile");
      assert.equal((await state(r)).xp, 1);
    } finally {
      await recoverContext.close();
    }
    const switchContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    try {
      const r = await switchContext.newPage();
      await r.goto(base);
      await r.getByLabel("你的名字").fill("临时旅人");
      await r.click("#start-btn");
      await r.waitForSelector("canvas");
      await button(r, "现实成长").click();
      await button(r, "今日研习").click();
      await nav(r, "存档与恢复").click();
      await r.getByLabel("选择旅程凭证文件").setInputFiles(file);
      await r
        .getByRole("heading", { name: "林间研习者的旅程", exact: true })
        .waitFor();
      assert.equal(await button(r, "恢复这段旅程").isDisabled(), true);
      const backup = r.waitForEvent("download");
      await button(r, "下载旅程凭证").click();
      await backup;
      await r.getByLabel("我已保存当前旅程凭证").check();
      await button(r, "恢复这段旅程").click();
      await r.waitForSelector(".study-page");
      assert.equal((await state(r)).xp, 1);
      assert.equal((await state(r)).character.name, "林间研习者");
    } finally {
      await switchContext.close();
    }
    assert.deepEqual(errors, []);
    await fs.writeFile(
      new URL("results.json", out),
      JSON.stringify(
        { passed: true, cases, backgroundSeconds: 62, xp: 1, errors },
        null,
        2,
      ),
    );
    console.log(
      JSON.stringify({
        passed: true,
        cases: cases.length,
        backgroundSeconds: 62,
        errors,
      }),
    );
  } finally {
    await c.close();
  }
} finally {
  await fs.rm(file, { force: true });
  await browser.close();
}
