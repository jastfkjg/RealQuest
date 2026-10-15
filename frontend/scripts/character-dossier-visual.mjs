import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const base = process.env.REALQUEST_URL || "http://127.0.0.1:5293";
const out = new URL("../../output/character-dossier/visual/", import.meta.url);
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [],
  evidence = [];
try {
  for (const [width, height] of [
    [1440, 900],
    [1920, 1080],
    [1128, 830],
    [768, 1024],
    [390, 844],
    [720, 450],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      reducedMotion: "reduce",
    });
    try {
      const p = await context.newPage();
      p.on("pageerror", (e) => errors.push(e.message));
      p.on("console", (m) => {
        if (m.type() === "error") errors.push(m.text());
      });
      await p.goto(base);
      await p.getByLabel("你的名字").fill("唤醒者");
      await p.locator("#start-btn").click();
      await p.waitForSelector("canvas");
      await p.getByRole("button", { name: "角色", exact: true }).click();
      await p.locator(".hc-dossier").waitFor();
      await p.evaluate(async () => {
        await Promise.all(
          Array.from(document.querySelectorAll(".hc-dossier img"), (i) =>
            i.decode(),
          ),
        );
        const image = new Image();
        image.src = "/assets/hearthwood/character-dossier-v1.webp";
        await image.decode();
      });
      for (const state of [
        "top",
        "selected",
        ...(width === 1440 || width === 390 ? ["help", "large-text"] : []),
      ]) {
        if (state === "selected")
          await p
            .getByRole("button", { name: "种植，等级 0", exact: true })
            .click();
        if (state === "help")
          await p
            .getByRole("button", { name: "查看工作委托", exact: true })
            .click();
        if (state === "large-text") {
          await p.keyboard.press("Escape");
          await p.addStyleTag({
            content:
              ".hc-dossier {font-size:20px}.hc-dossier p,.hc-dossier button {font-size:18px;line-height:1.6}.hc-dossier h3 {font-size:28px;line-height:1.5}",
          });
          await p.locator(".hc-upgrade").scrollIntoViewIfNeeded();
        }
        await p.waitForTimeout(100);
        const dialog = p.locator("dialog[open]");
        assert(
          await dialog.evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
          `${width}-${state}: overflow`,
        );
        assert(
          await p.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        );
        if (width === 1440 && state === "top") {
          const footer = await p.locator(".hc-footer").boundingBox();
          assert(
            footer.y + footer.height <= height - 12,
            "Desktop footer and primary action must fit",
          );
        }
        const folder = new URL(`${width}-${state}/`, out);
        await fs.mkdir(folder, { recursive: true });
        await p.screenshot({ path: new URL("screen.png", folder).pathname });
        const runs = await p.locator(".hc-dossier").evaluate((root) => {
          const clip = root.closest("dialog").getBoundingClientRect();
          return Array.from(root.querySelectorAll("*"))
            .filter(
              (el) =>
                getComputedStyle(el).visibility !== "hidden" &&
                el.checkVisibility(),
            )
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
                        r.top >= Math.max(0, clip.top) &&
                        r.bottom <= Math.min(innerHeight, clip.bottom),
                    )
                    .map((r) => ({
                      text: n.textContent.trim(),
                      color: getComputedStyle(el).color,
                      rect: [r.x, r.y, r.width, r.height],
                    }));
                }),
            );
        });
        const hide = await p.addStyleTag({
          content:
            "dialog *,dialog *::before,dialog *::after {color:transparent!important;text-shadow:none!important;}",
        });
        await p.screenshot({
          path: new URL("contrast-background.png", folder).pathname,
        });
        await fs.writeFile(
          new URL("contrast-text.json", folder),
          JSON.stringify(runs, null, 2),
        );
        await hide.evaluate((e) => e.remove());
        evidence.push({ width, height, state, runs: runs.length });
      }
    } finally {
      await context.close();
    }
  }
  assert.deepEqual(errors, []);
  await fs.writeFile(
    new URL("result.json", out),
    JSON.stringify({ evidence, errors }, null, 2),
  );
  console.log(
    JSON.stringify({ status: "pass", captures: evidence.length, errors }),
  );
} finally {
  await browser.close();
}
