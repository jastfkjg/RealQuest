import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const out = new URL("../../output/inventory-satchel/", import.meta.url);
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    storageState: new URL("starter-session.json", out).pathname,
  });
  try {
    const p = await context.newPage();
    await p.goto(process.env.REALQUEST_URL || "http://127.0.0.1:5187");
    await p.waitForSelector("canvas");
    await p.getByRole("button", { name: "背包", exact: true }).click();
    const samples = await p.locator(".panel-inventory").evaluate((root) => {
      const luma = (color) => {
        const c = color
          .match(/[\d.]+/g)
          .slice(0, 3)
          .map(Number)
          .map((v) => {
            v /= 255;
            return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
          });
        return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
      };
      return Array.from(root.querySelectorAll("*"))
        .filter(
          (el) =>
            el.checkVisibility() &&
            !el.closest(".hw-sr-only") &&
            Array.from(el.childNodes).some(
              (n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim(),
            ),
        )
        .map((el) => {
          const style = getComputedStyle(el);
          let parent = el;
          let background;
          do {
            background = getComputedStyle(parent).backgroundColor;
            parent = parent.parentElement;
          } while (background === "rgba(0, 0, 0, 0)" && parent);
          const a = luma(style.color),
            b = luma(background);
          return {
            text: el.textContent.trim().slice(0, 40),
            foreground: style.color,
            background,
            ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
            fontSize: style.fontSize,
          };
        });
    });
    await fs.writeFile(
      new URL("contrast.json", out),
      JSON.stringify(samples, null, 2),
    );
    for (const sample of samples)
      assert.ok(sample.ratio >= 4.5, JSON.stringify(sample));
    console.log(
      `PASS ${samples.length} rendered text colors, minimum ${Math.min(...samples.map((s) => s.ratio)).toFixed(2)}:1`,
    );
  } finally {
    await context.close();
  }
} finally {
  await browser.close();
}
