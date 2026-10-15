import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const base = process.env.REALQUEST_URL || "http://127.0.0.1:5295";
const out = new URL("../../output/village-market/", import.meta.url);
const root = new URL("../../", import.meta.url).pathname;
const browser = await chromium.launch({ headless: true });
try {
  const c = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  try {
    const session = await (await c.request.post(base + "/api/session")).json();
    // Explicit isolated visual fixture; never accepts a player database path.
    execFileSync(root + "backend/.venv/bin/python", [
      "-c",
      `import json,sqlite3,sys
p=sys.argv[1]
assert p.endswith('/output/village-market/test.db')
c=sqlite3.connect(p)
s=json.loads(c.execute('select state from players where id=?',(sys.argv[2],)).fetchone()[0])
s.update(character={'name':'小铺验收','appearance':0},location='shop',position={'x':240,'y':240},save_version=3)
s['inventory'].update(gold=64,wood=6,stone=4,crop=4,plank=1)
s['quests']={'market_neighbor':{'status':'claimed','accepted_at':0},'village_supplier':{'status':'claimed','accepted_at':0}}
s['stats']={'market_sold':1,'deliveries':3}
s['events']=['visited_shop']
s['buildings']['home']=2
c.execute('update players set state=? where id=?',(json.dumps(s),sys.argv[2]));c.commit();c.close()`,
      root + "output/village-market/test.db",
      session.save_id,
    ]);
    const page = await c.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base);
    await page.locator("canvas").waitFor();
    await page.waitForTimeout(500);
    await page.keyboard.press("e");
    await page.getByRole("dialog", { name: "风铃杂货铺" }).waitFor();
    for (const [w, h] of [
      [1440, 900],
      [390, 844],
      [375, 812],
    ]) {
      await page.setViewportSize({ width: w, height: h });
      for (const [label, name] of [
        ["买卖物品", "trade"],
        ["村民订单", "orders"],
        ["安家心愿", "goals"],
      ]) {
        await page.getByRole("button", { name: label, exact: true }).click();
        if (label === "买卖物品")
          await page
            .getByRole("button", { name: "选择木材，每份 2 金币" })
            .click();
        await page.waitForTimeout(200);
        const folder = new URL(`contrast-${name}-${w}/`, out);
        await fs.mkdir(folder, { recursive: true });
        await page.screenshot({
          path: new URL(`layout-${name}-${w}.png`, out).pathname,
        });
        if (name === "goals") {
          const marker = page.getByRole("button", { name: "标记家园升级手册" });
          await marker.scrollIntoViewIfNeeded();
          await page.screenshot({
            path: new URL(`layout-goals-bottom-${w}.png`, out).pathname,
          });
          const bounds = await marker.boundingBox();
          assert.ok(bounds && bounds.y >= 0 && bounds.y + bounds.height <= h);
        }
        const text = await page.locator("dialog").evaluate((root) =>
          Array.from(root.querySelectorAll("*"))
            .filter(
              (el) => el.checkVisibility() && !el.closest("button:disabled"),
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
                      (b) =>
                        b.width > 2 &&
                        b.height > 2 &&
                        b.top >= 0 &&
                        b.bottom <= innerHeight,
                    )
                    .filter((b) => {
                      // Exclude text cut by a scrolling ancestor; outside pixels
                      // are not the background beneath visible glyphs.
                      return [b.top + 1, b.bottom - 1].every((y) => {
                        const hit = document.elementFromPoint(
                          b.x + b.width / 2,
                          y,
                        );
                        return hit && (hit === el || el.contains(hit));
                      });
                    })
                    .map((b) => ({
                      text: n.textContent.trim(),
                      color: getComputedStyle(el).color,
                      rect: [b.x, b.y, b.width, b.height],
                    }));
                }),
            ),
        );
        const hide = await page.addStyleTag({
          content:
            "dialog, dialog * { color:transparent!important; text-shadow:none!important; }",
        });
        await page.screenshot({
          path: new URL("contrast-background.png", folder).pathname,
        });
        await fs.writeFile(
          new URL("contrast-text.json", folder),
          JSON.stringify(text, null, 2),
        );
        await hide.evaluate((el) => el.remove());
        assert.ok(
          await page
            .locator("dialog")
            .evaluate((el) => el.scrollWidth <= el.clientWidth + 2),
        );
        const sizes = await page
          .locator(
            ".market-content button:visible,.market-content select:visible",
          )
          .evaluateAll((es) =>
            es.map((e) => ({
              name: e.textContent.trim(),
              h: e.getBoundingClientRect().height,
              w: e.getBoundingClientRect().width,
            })),
          );
        assert.deepEqual(
          sizes.filter((e) => e.h < 44 || e.w < 44),
          [],
        );
      }
    }
    await page.getByRole("button", { name: "买卖物品", exact: true }).click();
    // Native DOM enlarged-text reflow proxy, recorded separately from OS zoom.
    await page.addStyleTag({
      content:
        ".panel-shop { font-size:20px!important } .panel-shop button,.panel-shop select {font-size:18px!important} .market-note,.market-selected p {font-size:17px!important}",
    });
    await page.screenshot({
      path: new URL("large-text-375.png", out).pathname,
    });
    assert.ok(
      await page
        .locator("dialog")
        .evaluate((el) => el.scrollWidth <= el.clientWidth + 2),
    );
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("dialog").count(), 0);
    assert.deepEqual(errors, []);
    console.log(
      "PASS 9 layout/texture cases; >=44px controls; 375px enlarged text and Escape",
    );
  } finally {
    await c.close();
  }
} finally {
  await browser.close();
}
