import { chromium } from "playwright";
import fs from "node:fs/promises";
const base = process.env.REALQUEST_URL || "http://127.0.0.1:5187",
  out = new URL("../../output/archetypes/contrast/", import.meta.url);
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
      const p = await context.newPage();
      for (const panel of [
        "board",
        "npc",
        "map",
        "storage",
        "building",
        "activity",
      ]) {
        await p.goto(`${base}/dev/dialogs?panel=${panel}`);
        await p.locator("dialog").waitFor();
        if (await p.getByRole("button", { name: "显示完整对话" }).count())
          await p.getByRole("button", { name: "显示完整对话" }).click();
        for (const phase of ["default", "hover", "bottom"]) {
          if (phase === "hover") {
            const button = p
              .locator("dialog button.primary:not(:disabled)")
              .first();
            if (await button.count()) await button.hover();
          }
          if (phase === "bottom")
            await p
              .locator("dialog")
              .evaluate((e) => (e.scrollTop = e.scrollHeight));
          const text = await p.locator("dialog").evaluate((root) => {
            const bounds = root.getBoundingClientRect();
            return [...root.querySelectorAll("*")]
              .filter(
                (el) =>
                  el.checkVisibility({ visibilityProperty: true }) &&
                  getComputedStyle(el).clipPath !== "inset(50%)" &&
                  !el.closest('[aria-hidden="true"]'),
              )
              .flatMap((el) =>
                [...el.childNodes]
                  .filter(
                    (n) =>
                      n.nodeType === Node.TEXT_NODE && n.textContent.trim(),
                  )
                  .flatMap((n) => {
                    const range = document.createRange();
                    range.selectNodeContents(n);
                    return [...range.getClientRects()]
                      .filter(
                        (r) =>
                          r.width > 1 &&
                          r.height > 1 &&
                          r.top >= Math.max(0, bounds.top) &&
                          r.bottom <= Math.min(innerHeight, bounds.bottom),
                      )
                      .map((r) => {
                        let left = Math.max(0, r.left),
                          right = Math.min(innerWidth, r.right),
                          top = Math.max(0, r.top),
                          bottom = Math.min(innerHeight, r.bottom);
                        for (
                          let parent = el.parentElement;
                          parent;
                          parent = parent.parentElement
                        ) {
                          const style = getComputedStyle(parent),
                            box = parent.getBoundingClientRect();
                          if (
                            /(auto|hidden|scroll|clip)/.test(style.overflowX)
                          ) {
                            left = Math.max(left, box.left);
                            right = Math.min(right, box.right);
                          }
                          if (
                            /(auto|hidden|scroll|clip)/.test(style.overflowY)
                          ) {
                            top = Math.max(top, box.top);
                            bottom = Math.min(bottom, box.bottom);
                          }
                        }
                        return {
                          text: n.textContent.trim(),
                          color:
                            el instanceof SVGElement
                              ? getComputedStyle(el).fill
                              : getComputedStyle(el).color,
                          rect: [
                            left,
                            top,
                            Math.max(0, right - left),
                            Math.max(0, bottom - top),
                          ],
                        };
                      });
                  }),
              );
          });
          const hide = await p.addStyleTag({
            content:
              "dialog *,dialog *::before,dialog *::after {color:transparent!important;text-shadow:none!important;}dialog text{fill:transparent!important;}",
          });
          const folder = new URL(`contrast-${panel}-${width}-${phase}/`, out);
          await fs.mkdir(folder, { recursive: true });
          await p.screenshot({
            path: new URL("contrast-background.png", folder).pathname,
          });
          await fs.writeFile(
            new URL("contrast-text.json", folder),
            JSON.stringify(text, null, 2),
          );
          await hide.evaluate((e) => e.remove());
        }
      }
    } finally {
      await context.close();
    }
  }
  console.log("Captured 36 actual-material DOM/SVG text contrast cases.");
} finally {
  await browser.close();
}
