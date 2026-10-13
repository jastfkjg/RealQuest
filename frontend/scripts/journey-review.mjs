import { chromium } from "playwright";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const base = process.env.REALQUEST_URL || "http://127.0.0.1:5195";
const out = new URL("../../output/study-journey/", import.meta.url);
const browser = await chromium.launch({ headless: true });
const cases = [];
try {
  const c = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  try {
    const p = await c.newPage();
    const errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    const command = async (action, data = {}) => {
      const r = await c.request.post(base + "/api/command", {
        data: { request_id: crypto.randomUUID(), action, data },
      });
      assert.equal(r.status(), 200);
      return (await r.json()).state;
    };
    await p.goto(base);
    await p.click("#start-btn");
    await p.waitForSelector("canvas");
    const plan = crypto.randomUUID();
    await command("study_plan_create", {
      plan_id: plan,
      title: "读懂林间植物图鉴",
      daily_minutes: 25,
    });
    let s = await command("study_plan_today", { plan_id: plan });
    const task = s.study_task_log[0].id;
    await command("study_edit", {
      task_id: task,
      title: "第一章 · 叶片的纹路",
      target_minutes: 25,
    });
    s = await command("activity", {
      kind: "study",
      amount: 25,
      note: "读完叶片结构，记下三种叶脉。",
    });
    await command("study_link", {
      task_id: task,
      activity_id: s.activities.at(-1).id,
    });
    await p.reload();
    await p.getByRole("button", { name: "现实成长", exact: true }).click();
    await p.getByRole("button", { name: "今日研习", exact: true }).click();
    const nav = (name) =>
      p
        .getByRole("navigation", { name: "研习手札章节" })
        .getByRole("button", { name, exact: true });
    await p.evaluate(async () => {
      const i = new Image();
      i.src = "/assets/hearthwood/journal-spread-v1.webp";
      await i.decode();
    });
    async function capture(name) {
      await p.screenshot({
        path: new URL("final-" + name + ".png", out).pathname,
      });
      const samples = await p.locator(".study-page").evaluate((root) =>
        [...root.querySelectorAll("*")]
          .filter(
            (el) => el.checkVisibility() && !el.closest('[aria-hidden="true"]'),
          )
          .flatMap((el) =>
            [...el.childNodes]
              .filter(
                (n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim(),
              )
              .flatMap((n) => {
                const range = document.createRange();
                range.selectNodeContents(n);
                return [...range.getClientRects()]
                  .filter(
                    (r) =>
                      r.width > 1 &&
                      r.height > 1 &&
                      r.top >= 0 &&
                      r.bottom <= innerHeight &&
                      r.x >= 0 &&
                      r.right <= innerWidth,
                  )
                  .map((r) => ({
                    text: n.textContent.trim(),
                    color: getComputedStyle(el).color,
                    rect: [r.x, r.y, r.width, r.height],
                  }));
              }),
          ),
      );
      const hidden = await p.addStyleTag({
        content:
          ".study-page *,.study-page *::before,.study-page *::after{color:transparent!important;text-shadow:none!important;} .study-page input::placeholder{color:transparent!important;}",
      });
      const folder = new URL("contrast-" + name + "/", out);
      await fs.mkdir(folder, { recursive: true });
      await p.screenshot({
        path: new URL("contrast-background.png", folder).pathname,
      });
      await fs.writeFile(
        new URL("contrast-text.json", folder),
        JSON.stringify(samples, null, 2),
      );
      await hidden.evaluate((e) => e.remove());
      cases.push({ name, runs: samples.length });
    }
    for (const [mode, label] of [
      ["plan", "研习计划"],
      ["history", "归档回看"],
      ["save", "存档与恢复"],
    ]) {
      await nav(label).click();
      for (const [width, height] of [
        [1440, 900],
        [390, 844],
      ]) {
        await p.setViewportSize({ width, height });
        await p.locator(".study-page").evaluate((e) => e.scrollTo(0, 0));
        await p.waitForTimeout(200);
        await capture(`${mode}-${width}-default`);
        if (mode === "plan") {
          await p
            .getByRole("button", { name: "翻开今天这一页", exact: true })
            .hover();
          await capture(`${mode}-${width}-hover`);
          await p.mouse.move(1, 1);
        }
        if (width === 390) {
          await p
            .locator(".study-page")
            .evaluate((e) => e.scrollTo(0, e.scrollHeight));
          await capture(`${mode}-${width}-bottom`);
        }
      }
    }
    await nav("研习计划").click();
    await p.getByRole("button", { name: "装订新计划", exact: true }).click();
    await p.setViewportSize({ width: 390, height: 844 });
    await p.locator(".study-page").evaluate((e) => e.scrollTo(0, 0));
    await capture("create-390");
    await p.getByRole("button", { name: "先回到书架", exact: true }).click();
    // One history page and one book per six entries: no endless bookmark strip.
    for (let i = 0; i < 7; i++)
      await command("study_create", {
        task_id: crypto.randomUUID(),
        title: `往日手记样本 ${i + 1}`,
        target_minutes: 5,
      });
    await p.reload();
    await nav("归档回看").click();
    assert.equal(
      await p
        .getByRole("navigation", { name: "选择往日书页" })
        .getByRole("button")
        .count(),
      6,
    );
    await p.getByRole("button", { name: "后页", exact: true }).click();
    assert.equal(
      await p
        .getByRole("navigation", { name: "选择往日书页" })
        .getByRole("button")
        .count(),
      2,
    );
    // Focus stays inside the book even through collapsed details and page changes.
    await p.getByRole("button", { name: "返回世界", exact: true }).focus();
    for (let i = 0; i < 24; i++) {
      await p.keyboard.press("Tab");
      assert.equal(
        await p.evaluate(() => !!document.activeElement.closest(".study-page")),
        true,
      );
    }
    assert.equal(
      await p
        .locator(".study-book")
        .evaluate((e) => getComputedStyle(e).animationName),
      "none",
    );
    const style = await p.addStyleTag({
      content:
        ".study-page p,.study-page button,.study-page small{font-size:20px!important}",
    });
    for (const [width, height] of [
      [375, 812],
      [844, 390],
    ]) {
      await p.setViewportSize({ width, height });
      assert.equal(
        await p
          .locator(".study-page")
          .evaluate((e) => e.scrollWidth > e.clientWidth + 1),
        false,
      );
      await p.screenshot({
        path: new URL(`large-text-${width}.png`, out).pathname,
      });
    }
    await style.evaluate((e) => e.remove());
    assert.deepEqual(errors, []);
    await fs.writeFile(
      new URL("review-cases.json", out),
      JSON.stringify({ cases, errors }, null, 2),
    );
    console.log(JSON.stringify({ cases: cases.length, errors }));
  } finally {
    await c.close();
  }
} finally {
  await browser.close();
}
