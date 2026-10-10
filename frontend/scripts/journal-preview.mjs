import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const base = process.env.REALQUEST_URL || "http://127.0.0.1:5187";
const out = new URL("../../output/journal-reference/", import.meta.url);
const browser = await chromium.launch({ headless: true });
try {
  const c = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  try {
    const p = await c.newPage(),
      calls = [],
      errors = [];
    p.on("request", (r) => {
      if (r.url().includes("/api/")) calls.push(r.url());
    });
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(base + "/dev/journal");
    await p.locator(".hj-book").waitFor();
    await p.evaluate(async () => {
      const i = new Image();
      i.src = "/assets/hearthwood/journal-spread-v1.webp";
      await i.decode();
    });
    for (const name of [
      "起步委托",
      "可交付",
      "已完成",
      "成长记录",
      "长文压力",
      "拒绝与重试",
    ]) {
      await p
        .getByRole("navigation", { name: "预览样例" })
        .getByRole("button", { name, exact: true })
        .click();
      if (name === "已完成")
        await p.getByRole("button", { name: "完成篇章", exact: true }).click();
      if (name === "成长记录")
        await p
          .getByRole("navigation", { name: "日志章节" })
          .getByRole("button", { name: "成长记录", exact: true })
          .click();
      if (name === "拒绝与重试") {
        await p.getByRole("button", { name: "模拟操作" }).click();
        assert.equal(
          await p.getByRole("button", { name: "处理中…" }).isDisabled(),
          true,
        );
        await p.getByRole("alert").waitFor();
        await p.getByRole("button", { name: "重试预览操作" }).click();
        await p.getByRole("alert").waitFor();
      }
      await p.screenshot({
        path: new URL("preview-" + name + ".png", out).pathname,
        fullPage: true,
      });
      if (name === "长文压力") {
        await p.setViewportSize({ width: 390, height: 844 });
        await p.getByRole("button", { name: /查看任务：【长名称/ }).click();
        await p.getByRole("button", { name: "返回目录" }).waitFor();
        assert.equal(
          await p.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
        );
        await p
          .getByRole("button", { name: "模拟操作" })
          .scrollIntoViewIfNeeded();
        await p.screenshot({
          path: new URL("preview-long-mobile-bottom.png", out).pathname,
        });
        await p
          .getByRole("button", { name: "返回目录" })
          .scrollIntoViewIfNeeded();
        await p.screenshot({
          path: new URL("preview-long-mobile-top.png", out).pathname,
        });
        await p.setViewportSize({ width: 1440, height: 900 });
      }
    }
    await p.getByRole("button", { name: "起步委托" }).click();
    await p.getByRole("button", { name: "模拟操作" }).click();
    await p.getByRole("status").waitFor();
    assert.deepEqual(calls, []);
    assert.deepEqual(errors, []);
    assert.equal(await p.evaluate(() => localStorage.length), 0);
    await fs.writeFile(
      new URL("preview-result.json", out),
      JSON.stringify(
        {
          passed: true,
          apiCalls: calls,
          errors,
          fixtures: 6,
          pending: true,
          rejectionRetry: true,
          longMobileScroll: true,
        },
        null,
        2,
      ),
    );
    console.log("PASS journal isolated fixtures");
  } finally {
    await c.close();
  }
} finally {
  await browser.close();
}
