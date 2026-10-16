import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const base = process.env.REALQUEST_URL || "http://127.0.0.1:5295";
const out = new URL("../../output/npc-life/visual/", import.meta.url),
  root = new URL("../../", import.meta.url).pathname;
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [],
  captures = [];
async function capture(page, name) {
  const folder = new URL(name + "/", out);
  await fs.mkdir(folder, { recursive: true });
  await page.screenshot({ path: new URL("view.png", folder).pathname });
  const text = await page.locator("dialog").evaluate((root) =>
    Array.from(root.querySelectorAll("*"))
      .filter(
        (el) =>
          el.checkVisibility() &&
          !el.closest(
            "button:disabled,select:disabled,fieldset:disabled,[aria-hidden=true]",
          ),
      )
      .flatMap((el) =>
        Array.from(el.childNodes)
          .filter((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim())
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
              .filter((b) =>
                [b.top + 1, b.bottom - 1].every((y) => {
                  const hit = document.elementFromPoint(b.x + b.width / 2, y);
                  return hit && (hit === el || el.contains(hit));
                }),
              )
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
      "dialog,dialog *{color:transparent!important;text-shadow:none!important}",
  });
  await page.screenshot({
    path: new URL("contrast-background.png", folder).pathname,
  });
  await hide.evaluate((e) => e.remove());
  await fs.writeFile(
    new URL("contrast-text.json", folder),
    JSON.stringify(text, null, 2),
  );
  captures.push(name);
  assert.ok(
    await page
      .locator("dialog")
      .evaluate((e) => e.scrollWidth <= e.clientWidth + 2),
    name + " horizontal overflow",
  );
  const close = await page
    .getByRole("button", { name: "关闭面板", exact: true })
    .boundingBox();
  assert.ok(
    close &&
      close.y >= 0 &&
      close.y + close.height <= page.viewportSize().height,
    name + " close visible",
  );
}
try {
  const fixture = await fetch(base + "/api/npc-fixture");
  assert.equal(
    fixture.status,
    200,
    "Explicit isolated NPC fixture server required",
  );
  assert.equal((await fixture.json()).fixture, "npc-life-v1");
  for (const [w, h] of [
    [1440, 900],
    [1920, 1080],
    [844, 390],
  ]) {
    for (const id of ["lia", "noah", "mira"]) {
      const c = await browser.newContext({
        viewport: { width: w, height: h },
        reducedMotion: "reduce",
      });
      try {
        const session = await (
          await c.request.post(base + "/api/session")
        ).json();
        execFileSync(root + "backend/.venv/bin/python", [
          "-c",
          `import json,sqlite3,sys,time
p=sys.argv[1];assert p.endswith('/output/npc-life/test.db')
c=sqlite3.connect(p);s=json.loads(c.execute('select state from players where id=?',(sys.argv[2],)).fetchone()[0])
id=sys.argv[3];s.update(character={'name':'村民视觉验收','appearance':0},world_clock={'elapsed':0,'updated_at':time.time(),'running_until':0,'day_seconds':1800},npc_encounter=None,location='shop' if id=='mira' else 'overworld',position={'x':240,'y':240} if id=='mira' else {'x':624,'y':312} if id=='lia' else {'x':576,'y':424})
s['inventory'].update(gold=20,wood=6,stone=6,plank=2,crop=6,seed=6);s['relationships'].update(lia=1,noah=1,mira=1)
c.execute('update players set state=? where id=?',(json.dumps(s),sys.argv[2]));c.commit();c.close()`,
          root + "output/npc-life/test.db",
          session.save_id,
          id,
        ]);
        const page = await c.newPage();
        page.on("pageerror", (e) => errors.push(e.message));
        await page.goto(base);
        await page.locator("canvas").waitFor();
        await page.waitForTimeout(600);
        await page.keyboard.press("e");
        await page.getByRole("dialog").waitFor();
        if (id === "noah" || id === "mira")
          await page
            .getByRole("button", { name: "邻里日常", exact: true })
            .click();
        await page
          .getByRole("button", { name: "你喜欢什么", exact: true })
          .click();
        await page
          .getByRole("button", { name: "聊聊近况", exact: true })
          .hover();
        await capture(page, `${id}-${w}-top`);
        await page
          .getByRole("button", { name: "你喜欢什么", exact: true })
          .hover();
        await capture(page, `${id}-${w}-selected-hover`);
        const help = page.getByRole("button", {
          name: "搭把手 · 4 体力",
          exact: true,
        });
        await help.scrollIntoViewIfNeeded();
        await capture(page, `${id}-${w}-actions`);
        const sizes = await page
          .locator(".npc-social button:visible,.npc-social select:visible")
          .evaluateAll((es) =>
            es.map((e) => ({
              name: e.textContent,
              h: e.getBoundingClientRect().height,
              w: e.getBoundingClientRect().width,
            })),
          );
        assert.deepEqual(
          sizes.filter((s) => s.h < 44 || s.w < 44),
          [],
          id + " controls",
        );
        await page.keyboard.press("Escape");
        await page.getByRole("dialog").waitFor({ state: "detached" });
        if (id === "lia") {
          await page
            .getByRole("button", { name: "查看村民近况和日常作息" })
            .click();
          for (const npc of ["莉亚", "诺亚", "米拉"]) {
            await page.getByRole("button", { name: new RegExp(npc) }).click();
            await capture(
              page,
              `book-${w}-${npc === "莉亚" ? "lia" : npc === "诺亚" ? "noah" : "mira"}`,
            );
          }
        }
      } finally {
        await c.close();
      }
    }
  }
  assert.deepEqual(errors, []);
  await fs.writeFile(
    new URL("result.json", out),
    JSON.stringify({ captures, errors }, null, 2),
  );
  console.log(
    `PASS ${captures.length} NPC/book layout and texture cases; 44px controls; close and scroll`,
  );
} finally {
  await browser.close();
}
