import { chromium } from "playwright";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const base = process.env.REALQUEST_URL || "http://127.0.0.1:5193";
const out = new URL("../../output/study-reference/", import.meta.url);
const browser = await chromium.launch({ headless: true });
try {
  const c = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  try {
    const p = await c.newPage();
    await p.goto(base);
    await p.click("#start-btn");
    await p.waitForSelector("canvas");
    await p.getByRole("button", { name: "现实成长", exact: true }).click();
    await p.getByRole("button", { name: "今日研习", exact: true }).click();
    await p.evaluate(async () => {
      const i = new Image();
      i.src = "/assets/hearthwood/journal-spread-v1.webp";
      await i.decode();
    });
    const cases = [];
    async function capture(name) {
      await p.screenshot({ path: new URL('final-' + name + '.png', out).pathname });
      const text = await p.locator(".study-page").evaluate((root) =>
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
      const hide = await p.addStyleTag({
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
        JSON.stringify(text, null, 2),
      );
      await hide.evaluate((el) => el.remove());
      cases.push({ name, runs: text.length });
    }
    for (const stage of ["draft", "completed"]) {
      if (stage === "completed") {
        await p.getByLabel("写下你的学习主题").fill("在林间读懂一片叶子");
        await p.getByRole("button", { name: "记下这项研习" }).click();
        await p
          .getByRole("button", { name: "开始研习", exact: true })
          .waitFor();
        const record = await c.request.post(base + "/api/command", {
          data: {
            request_id: crypto.randomUUID(),
            action: "activity",
            data: {
              kind: "study",
              amount: 25,
              note: "植物笔记 · 隔离测试记录",
            },
          },
        });
        assert.equal(record.status(), 200);
        const saved = (await record.json()).state;
        const link = await c.request.post(base + "/api/command", {
          data: {
            request_id: crypto.randomUUID(),
            action: "study_link",
            data: {
              task_id: saved.study_task_log[0].id,
              activity_id: saved.activities.at(-1).id,
            },
          },
        });
        assert.equal(link.status(), 200);
        await p.reload();
        await p.getByRole("button", { name: "写下下一项研习" }).waitFor();
      }
      for (const [width, height] of [
        [1440, 900],
        [390, 844],
      ]) {
        await p.setViewportSize({ width, height });
        await p.locator(".study-page").evaluate((el) => el.scrollTo(0, 0));
        await p.mouse.move(0, 0);
        await capture(`${stage}-${width}-default`);
        if (stage === "completed") {
          await p.getByRole("button", { name: "写下下一项研习" }).hover();
          await capture(`${stage}-${width}-hover`);
        }
        await p
          .locator(".study-page")
          .evaluate((el) => el.scrollTo(0, el.scrollHeight));
        await capture(`${stage}-${width}-bottom`);
      }
    }
    await fs.writeFile(
      new URL("contrast-cases.json", out),
      JSON.stringify(cases, null, 2),
    );
    console.log("Captured", cases.length, "actual-texture contrast cases.");
    // Small phone, landscape and enlarged DOM text. Physical-device/browser-menu zoom remains unverified.
    for (const [width, height] of [
      [375, 812],
      [844, 390],
    ]) {
      await p.setViewportSize({ width, height });
      const overflow = await p
        .locator(".study-page")
        .evaluate((el) => el.scrollWidth > el.clientWidth + 1);
      assert.equal(overflow, false);
      await p.screenshot({
        path: new URL(`reflow-${width}.png`, out).pathname,
      });
    }
    await p.setViewportSize({ width: 720, height: 450 });
    const resize = await p.addStyleTag({
      content:
        ".study-page{font-size:20px}.study-page p,.study-page button,.study-page small{font-size:20px!important}",
    });
    assert.equal(
      await p
        .locator(".study-page")
        .evaluate((el) => el.scrollWidth > el.clientWidth + 1),
      false,
    );
    await p.getByRole("button", { name: "返回世界" }).focus();
    for (let i = 0; i < 18; i++) {
      await p.keyboard.press("Tab");
      assert.equal(
        await p.evaluate(() => !!document.activeElement.closest(".study-page")),
        true,
      );
    }
    await p.screenshot({
      path: new URL("larger-text-keyboard.png", out).pathname,
    });
    await resize.evaluate((el) => el.remove());
    await p.locator(".study-page").evaluate((el) => el.scrollTo(0, 0));
    assert.equal(
      await p
        .locator(".study-book")
        .evaluate((el) => getComputedStyle(el).animationName),
      "none",
    );
  } finally {
    await c.request.delete(base + "/api/session").catch(() => {});
    await c.close();
  }
} finally {
  await browser.close();
}
