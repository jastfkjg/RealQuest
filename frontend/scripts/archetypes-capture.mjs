import { chromium } from "playwright";
import fs from "node:fs/promises";
import assert from "node:assert/strict";

const phase = process.env.PHASE || "after";
const base = process.env.REALQUEST_URL || "http://127.0.0.1:5189";
const out = new URL(`../../output/archetypes/${phase}/`, import.meta.url);
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [],
  checks = [];
try {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  try {
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    for (const [width, height] of [
      [1440, 900],
      [390, 844],
      [768, 1024],
      [1920, 1080],
      [720, 450],
    ]) {
      await page.setViewportSize({ width, height });
      for (const panel of [
        "map",
        "board",
        "npc",
        "storage",
        "building",
        "activity",
      ]) {
        await page.goto(`${base}/dev/dialogs?panel=${panel}`);
        await page.locator("dialog").waitFor();
        if (
          panel === "npc" &&
          (await page.getByRole("button", { name: "显示完整对话" }).count())
        )
          await page.getByRole("button", { name: "显示完整对话" }).click();
        await page.evaluate(() =>
          Promise.all(
            [...document.images].map((i) => i.decode().catch(() => {})),
          ),
        );
        await page.screenshot({
          path: new URL(`${panel}-${width}.png`, out).pathname,
        });
        assert.equal(
          await page
            .locator("dialog")
            .evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
          true,
          `${panel}/${width} overflow`,
        );
        if (phase === "after") {
          const small = await page.locator("dialog button").evaluateAll((es) =>
            es
              .filter((e) => e.checkVisibility())
              .map((e) => ({
                name: e.getAttribute("aria-label") || e.textContent,
                w: e.getBoundingClientRect().width,
                h: e.getBoundingClientRect().height,
              }))
              .filter((e) => e.w < 43.9 || e.h < 43.9),
          );
          assert.deepEqual(small, [], `${panel}/${width} targets`);
        }
        checks.push(`${panel}/${width}: screenshot, no overflow`);
      }
    }
  } finally {
    await context.close();
  }
  assert.deepEqual(errors, []);
  await fs.writeFile(
    new URL("results.json", out),
    JSON.stringify({ checks, errors }, null, 2),
  );
  console.log(`PASS ${phase}: ${checks.length} captures; no page errors`);
} finally {
  await browser.close();
}
