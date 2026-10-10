import { chromium } from "playwright";
import fs from "node:fs/promises";

const output = new URL("../../output/inventory-pass-a/", import.meta.url);
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  try {
    const page = await context.newPage();
    await page.goto(process.env.REALQUEST_URL || "http://127.0.0.1:5187");
    await page.getByLabel("你的名字").fill("林间旅人");
    await page.click("#start-btn");
    await page.waitForSelector("canvas");
    await page.waitForTimeout(800);
    await page.getByRole("button", { name: "背包", exact: true }).click();
    for (const [width, height] of [
      [1440, 900],
      [390, 844],
    ]) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(250);
      await page.screenshot({
        path: new URL(`before-${width}.png`, output).pathname,
      });
    }
    await fs.writeFile(
      new URL("baseline-state.json", output),
      await page.evaluate(() => window.render_game_to_text()),
    );
    await context.storageState({
      path: new URL("starter-session.json", output).pathname,
    });
  } finally {
    await context.close();
  }
} finally {
  await browser.close();
}
