import { chromium } from "playwright";
import fs from "node:fs/promises";
const base = process.env.REALQUEST_URL || "http://127.0.0.1:5207",
  out = new URL("../../output/character-points/", import.meta.url);
const b = await chromium.launch({ headless: true });
try {
  const c = await b.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  try {
    const p = await c.newPage();
    await p.goto(base);
    await p.click("#start-btn");
    await p.waitForSelector("canvas");
    await p.getByRole("button", { name: "角色", exact: true }).click();
    await p.locator(".hc-dossier").waitFor();
    await p.evaluate(async () => {
      const i = new Image();
      i.src = "/assets/hearthwood/character-dossier-v1.webp";
      await i.decode();
    });
    const text = await p.locator(".hc-dossier").evaluate((root) =>
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
    await p.addStyleTag({
      content:
        "dialog *,dialog *::before,dialog *::after {color:transparent!important;text-shadow:none!important;}",
    });
    await p.screenshot({
      path: new URL("contrast-background.png", out).pathname,
    });
    await fs.writeFile(
      new URL("contrast-text.json", out),
      JSON.stringify(text, null, 2),
    );
    console.log(
      "Captured actual textured backgrounds under",
      text.length,
      "text runs",
    );
  } finally {
    await c.request.delete(base + "/api/session").catch(() => {});
    await c.close();
  }
} finally {
  await b.close();
}
