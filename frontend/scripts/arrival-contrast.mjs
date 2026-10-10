import { chromium } from "playwright";
import fs from "node:fs/promises";
const out = new URL("../../output/arrival-reference/", import.meta.url);
const browser = await chromium.launch({ headless: true });
try {
  for (const [width, height] of [
    [1440, 900],
    [390, 844],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      reducedMotion: "reduce",
    });
    try {
      const page = await context.newPage();
      await page.goto(
        (process.env.REALQUEST_URL || "http://127.0.0.1:5187") + "/dev/welcome",
      );
      await page.getByLabel("你的名字").waitFor();
      await page.evaluate(async () => {
        await Promise.all(
          ["arrival-village-v1", "arrival-register-v1"].map(async (name) => {
            const i = new Image();
            i.src = `/assets/hearthwood/${name}.webp`;
            await i.decode();
          }),
        );
      });
      for (const state of ["default", "hover"]) {
        if (state === "hover") await page.locator("#start-btn").hover();
        const text = await page.locator(".arrival-welcome").evaluate((root) =>
          Array.from(root.querySelectorAll("*"))
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
            ".arrival-welcome *,.arrival-welcome *::before,.arrival-welcome *::after {color:transparent!important;text-shadow:none!important;}",
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
