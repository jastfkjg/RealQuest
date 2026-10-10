import { chromium } from "playwright";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const out = new URL("../../output/arrival-reference/", import.meta.url);
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ reducedMotion: "reduce" });
  await page.goto(process.env.REALQUEST_URL || "http://127.0.0.1:5187");
  await page.getByLabel("你的名字").waitFor();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      ["arrival-village-v1", "arrival-register-v1"].map(async (name) => {
        const image = new Image();
        image.src = `/assets/hearthwood/${name}.webp`;
        await image.decode();
      }),
    );
  });
  for (const [width, height] of [
    [1440, 900],
    [390, 844],
    [768, 1024],
    [1920, 1080],
    [720, 450],
  ]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement)
        document.activeElement.blur();
      scrollTo(0, 0);
    });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    await page.screenshot({
      path: new URL(`arrival-${width}.png`, out).pathname,
    });
    console.log(width, await page.locator(".welcome-register").boundingBox());
    await page.locator("#start-btn").focus();
    await page.locator("#start-btn").scrollIntoViewIfNeeded();
    assert.equal(
      await page.locator("#start-btn").evaluate((el) => {
        const r = el.getBoundingClientRect();
        return (
          r.height >= 44 &&
          r.width >= 44 &&
          el.contains(
            document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2),
          )
        );
      }),
      true,
    );
    if (width === 720)
      await page.screenshot({
        path: new URL("arrival-720-scrolled.png", out).pathname,
      });
  }
} finally {
  await browser.close();
}
