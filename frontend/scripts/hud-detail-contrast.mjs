import { chromium } from "playwright";
import fs from "node:fs/promises";
const out = new URL("../../output/hud-interiors/contrast/", import.meta.url);
const browser = await chromium.launch({ headless: true });
try {
  for (const [width, height] of [
    [1440, 900],
    [768, 1024],
    [390, 844],
    [720, 450],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      reducedMotion: "reduce",
    });
    try {
      const page = await context.newPage();
      await page.goto(process.env.REALQUEST_URL || "http://127.0.0.1:5211");
      await page.getByLabel("你的名字").waitFor();
      await page.getByLabel("你的名字").fill("林间旅人");
      await page.locator("#start-btn").click();
      await page.waitForSelector("canvas");
      await page.waitForTimeout(650);
      for (const state of ["default", "hover"]) {
        if (state === "hover")
          await page.getByRole("button", { name: "角色", exact: true }).hover();
        const text = await page.locator(".playing").evaluate((root) =>
          Array.from(
            root.querySelectorAll(
              ".game-status *,.header-actions *,.bottom-nav *,.quest-compass *,.interact *,.toast *",
            ),
          )
            .filter((el) => el.checkVisibility())
            .flatMap((el) =>
              Array.from(el.childNodes)
                .filter(
                  (n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim(),
                )
                .flatMap((n) => {
                  const r = document.createRange();
                  r.selectNodeContents(n);
                  return Array.from(r.getClientRects())
                    .filter(
                      (r) =>
                        r.width > 1 &&
                        r.height > 1 &&
                        r.top >= 0 &&
                        r.bottom <= innerHeight,
                    )
                    .map((r) => ({
                      text: n.textContent.trim(),
                      color: getComputedStyle(el).color,
                      rect: [r.x, r.y, r.width, r.height],
                    }));
                }),
            ),
        );
        const hide = await page.addStyleTag({
          content:
            ".game-status *,.header-actions *,.bottom-nav *,.quest-compass *,.interact *,.toast * {color:transparent!important;text-shadow:none!important;}",
        });
        const folder = new URL(`contrast-${width}-${state}/`, out);
        await fs.mkdir(folder, { recursive: true });
        await page.screenshot({
          path: new URL("contrast-background.png", folder).pathname,
        });
        await fs.writeFile(
          new URL("contrast-text.json", folder),
          JSON.stringify(text, null, 2),
        );
        await hide.evaluate((el) => el.remove());
      }
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
