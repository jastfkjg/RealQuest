import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const base = process.env.REALQUEST_URL || "http://127.0.0.1:5187";
const out = new URL("../../output/journal-reference/", import.meta.url);
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = { passed: false, viewports: [], errors: [] };
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  try {
    const p = await context.newPage();
    p.on("pageerror", (e) => results.errors.push(e.message));
    p.on("console", (m) => {
      if (m.type() === "error") results.errors.push(m.text());
    });
    await p.goto(base);
    await p.getByLabel("你的名字").fill("林间旅人");
    await p.click("#start-btn");
    await p.waitForSelector("canvas");
    await p.waitForTimeout(600);
    const read = () =>
      p.evaluate(() => JSON.parse(window.render_game_to_text()));
    const before = await read();
    await p.getByRole("button", { name: "任务日志", exact: true }).click();
    await p.locator(".hj-book").waitFor();
    await p.evaluate(async () => {
      const image = new Image();
      image.src = "/assets/hearthwood/journal-spread-v1.webp";
      await image.decode();
    });
    for (const [width, height] of [
      [1440, 900],
      [390, 844],
      [768, 1024],
      [1920, 1080],
      [720, 450],
    ]) {
      await p.setViewportSize({ width, height });
      await p.waitForTimeout(250);
      assert.equal(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
      const dialog = p.locator("dialog");
      assert.equal(
        await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
        true,
      );
      await p.screenshot({
        path: new URL(`journal-${width}.png`, out).pathname,
      });
      const small = await p
        .locator("dialog button:not(:disabled)")
        .evaluateAll((buttons) =>
          buttons
            .filter((b) => b.checkVisibility())
            .map((b) => ({
              label: b.textContent.trim(),
              height: b.getBoundingClientRect().height,
              width: b.getBoundingClientRect().width,
            }))
            .filter((b) => b.height < 44 || b.width < 44),
        );
      assert.deepEqual(small, [], "Visible controls meet 44px");
      results.viewports.push({ width, height, minimumControlSize: 44 });
      if (width === 390) {
        assert.equal(await p.locator(".hj-detail").isVisible(), false);
        await p.getByRole("button", { name: /查看任务：给新生活/ }).click();
        await p.waitForFunction(() =>
          document.activeElement?.classList.contains("hj-back"),
        );
        assert.equal(await p.locator(".hj-index").isVisible(), false);
        await p.screenshot({
          path: new URL("journal-390-detail.png", out).pathname,
        });
        await p.getByRole("button", { name: "返回目录" }).click();
        await p.waitForFunction(() =>
          document.activeElement?.closest(".hj-entries"),
        );
      }
    }
    await p.setViewportSize({ width: 1440, height: 900 });
    await p.getByRole("button", { name: "完成篇章", exact: true }).click();
    assert.equal(await p.getByText("还没有完成的委托。").count(), 1);
    await p.getByRole("button", { name: "成长记录", exact: true }).click();
    assert.equal(await p.getByText("还没有成长记录。").count(), 1);
    await p.screenshot({
      path: new URL("journal-growth-empty.png", out).pathname,
    });
    await p.getByRole("button", { name: "旅途委托", exact: true }).click();
    await p.getByRole("button", { name: /查看任务：土地的/ }).click();
    assert.equal(await p.locator(".hj-actions button").count(), 0);
    await p.screenshot({ path: new URL("journal-locked.png", out).pathname });
    await p.getByRole("button", { name: /查看任务：纸页间/ }).click();
    assert.equal(
      await p.getByRole("button", { name: "标记委托人" }).count(),
      1,
    );
    assert.equal(
      await p.getByRole("button", { name: "接取任务", exact: true }).count(),
      0,
    );
    await p.keyboard.press("d");
    await p.waitForTimeout(150);
    const selected = await read();
    assert.deepEqual(selected.player, before.player);
    assert.deepEqual(selected.inventory, before.inventory);
    assert.deepEqual(selected.quests, before.quests);
    assert.equal(selected.xp, before.xp);
    // Keyboard focus stays in the native dialog, Escape restores the launcher.
    await p.getByRole("button", { name: "关闭面板" }).focus();
    await p.keyboard.press("Shift+Tab");
    assert.equal(
      await p.evaluate(() => !!document.activeElement.closest("dialog")),
      true,
    );
    await p.keyboard.press("Tab");
    assert.equal(
      await p.evaluate(() => !!document.activeElement.closest("dialog")),
      true,
    );
    await p.keyboard.press("Escape");
    assert.equal(
      await p
        .getByRole("button", { name: "任务日志", exact: true })
        .evaluate((el) => el === document.activeElement),
      true,
    );
    await p.getByRole("button", { name: "任务日志", exact: true }).click();
    await p.getByRole("button", { name: /查看任务：纸页间/ }).click();
    await p.getByRole("button", { name: "标记委托人" }).click();
    assert.equal(await p.locator("dialog").count(), 0);
    assert.deepEqual((await read()).player, before.player);
    await p.waitForTimeout(500);
    assert.deepEqual((await read()).player, before.player);
    await p.reload();
    await p.waitForSelector("canvas");
    await p.waitForTimeout(500);
    assert.deepEqual((await read()).inventory, before.inventory);
    assert.equal((await read()).canvasCount, 1);
  } finally {
    await context.request.delete(base + "/api/session").catch(() => {});
    await context.close();
  }
  const touch = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
    reducedMotion: "reduce",
  });
  try {
    const p = await touch.newPage();
    await p.goto(base + "/dev/journal");
    await p.locator(".hj-book").waitFor();
    await p.getByRole("button", { name: /查看任务：给新生活/ }).tap();
    await p.getByRole("button", { name: "返回目录" }).waitFor();
    assert.equal(await p.locator(".hj-index").isVisible(), false);
    await p.getByRole("button", { name: "返回目录" }).tap();
    assert.equal(await p.locator(".hj-index").isVisible(), true);
    await p.getByRole("button", { name: "完成篇章", exact: true }).tap();
    assert.equal(await p.getByText("还没有完成的委托。").count(), 1);
    assert.equal(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    results.emulatedTouchDpr2 = true;
  } finally {
    await touch.close();
  }
  results.passed = true;
  assert.deepEqual(results.errors, []);
  await fs.writeFile(
    new URL("journal-result.json", out),
    JSON.stringify(results, null, 2),
  );
  console.log(JSON.stringify(results));
} finally {
  await browser.close();
}
