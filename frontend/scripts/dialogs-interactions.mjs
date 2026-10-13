import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const base = process.env.REALQUEST_URL || "http://127.0.0.1:5187",
  out = new URL("../../output/dialogs-reference/", import.meta.url);
const browser = await chromium.launch({ headless: true });
const read = (p) => p.evaluate(() => JSON.parse(window.render_game_to_text()));
async function until(p, fn) {
  for (let i = 0; i < 150; i++) {
    const s = await read(p);
    if (fn(s)) return s;
    await p.waitForTimeout(100);
  }
  throw Error("State not reached");
}
async function go(p, x, y) {
  const s = await read(p);
  await p
    .locator("canvas")
    .click({
      position: {
        x: (x - s.camera.viewX) * s.camera.zoom,
        y: (y - s.camera.viewY) * s.camera.zoom,
      },
    });
  await until(
    p,
    (s) => Math.hypot(s.player.x - x, s.player.y - y) < 18 && !s.walking.length,
  );
  await p.waitForTimeout(200);
}
const checks = [],
  errors = [];
try {
  const c = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  try {
    const p = await c.newPage();
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(base);
    await p.click("#start-btn");
    await p.waitForSelector("canvas");
    await p.waitForTimeout(600);
    await go(p, 160, 248);
    await p.keyboard.press("e");
    await until(p, (s) => s.location === "home");
    await p.waitForTimeout(400);
    await go(p, 360, 232);
    await p.keyboard.press("e");
    await until(p, (s) => s.mode === "storage");
    const initial = await read(p);
    let reject = true,
      gate = null,
      calls = 0;
    await p.route("**/api/command", async (r) => {
      if (r.request().postDataJSON().action !== "store") return r.continue();
      calls++;
      if (reject) {
        reject = false;
        return r.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ detail: "测试：存入未成功，请重试" }),
        });
      }
      await new Promise((resolve) => (gate = resolve));
      await r.continue();
    });
    const store = p.getByRole("button", { name: "存入 1 种子", exact: true }),
      take = p.getByRole("button", { name: "取回 1 种子", exact: true });
    await store.click();
    await p.getByRole("alert").waitFor();
    assert.deepEqual((await read(p)).inventory, initial.inventory);
    assert.deepEqual((await read(p)).storage, initial.storage);
    await p.screenshot({ path: new URL("storage-rejected.png", out).pathname });
    await store.click();
    assert.equal(await store.isDisabled(), true);
    assert.equal(await take.isDisabled(), true);
    assert.deepEqual((await read(p)).inventory, initial.inventory);
    await store.evaluate((e) => e.click());
    assert.equal(calls, 2);
    await p.screenshot({ path: new URL("storage-pending.png", out).pathname });
    while (!gate) await p.waitForTimeout(20);
    gate();
    await until(p, (s) => s.storage.seed === 1 && s.inventory.seed === 5);
    assert.equal(calls, 2);
    await p.unroute("**/api/command");
    await take.click();
    await until(p, (s) => s.storage.seed === 0 && s.inventory.seed === 6);
    await p.keyboard.press("Escape");
    await p.reload();
    await p.waitForSelector("canvas");
    await p.waitForTimeout(400);
    assert.deepEqual((await read(p)).inventory, initial.inventory);
    assert.deepEqual((await read(p)).storage, initial.storage);
    checks.push(
      "actual chest: rejection preserves quantities; pending blocks duplicate; retry/store/withdraw conserve items; reload persists",
    );
    await p.getByRole("button", { name: "现实成长", exact: true }).click();
    const before = await read(p);
    await p.getByLabel("学习主题").focus();
    await p.keyboard.type("wasdmjcf");
    await p.waitForTimeout(150);
    assert.equal((await read(p)).mode, "activity");
    assert.deepEqual((await read(p)).player, before.player);
    await p.getByRole("button", { name: "关闭面板" }).focus();
    await p.keyboard.press("Shift+Tab");
    assert.equal(
      await p
        .getByRole("button", { name: "保存这次成长" })
        .evaluate((e) => e === document.activeElement),
      true,
    );
    await p.keyboard.press("Tab");
    assert.equal(
      await p
        .getByRole("button", { name: "关闭面板" })
        .evaluate((e) => e === document.activeElement),
      true,
    );
    await p.keyboard.press("Escape");
    assert.equal(
      await p
        .getByRole("button", { name: "现实成长", exact: true })
        .evaluate((e) => e === document.activeElement),
      true,
    );
    checks.push(
      "form input owns gameplay keys; focus cycles and Escape restores opener",
    );
  } finally {
    await c.request.delete(base + "/api/session").catch(() => {});
    await c.close();
  }
  const touch = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 2,
    reducedMotion: "reduce",
  });
  try {
    const p = await touch.newPage();
    await p.goto(base);
    await p.click("#start-btn");
    await p.waitForSelector("canvas");
    await p.waitForTimeout(600);
    await p.getByRole("button", { name: "现实成长", exact: true }).tap();
    await p.getByLabel("活动类型").selectOption("management");
    await p.getByLabel("主题或备注").fill("测试：整理物品");
    await p
      .getByRole("button", { name: "保存这次成长" })
      .scrollIntoViewIfNeeded();
    await p.getByRole("button", { name: "保存这次成长" }).tap();
    await until(p, (s) => s.attributes.stewardship === 10);
    await p.screenshot({
      path: new URL("activity-touch-saved.png", out).pathname,
    });
    checks.push(
      "DPR2 emulated touch: scroll, activity selection and actual manual record",
    );
  } finally {
    await touch.request.delete(base + "/api/session").catch(() => {});
    await touch.close();
  }
  const preview = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  try {
    const p = await preview.newPage(),
      api = [];
    p.on("request", (r) => {
      if (r.url().includes("/api/")) api.push(r.url());
    });
    await p.goto(base + "/dev/dialogs?panel=storage");
    await p.getByRole("button", { name: "存入 1 种子", exact: true }).click();
    await p.getByRole("status").waitFor();
    assert.deepEqual(api, []);
    assert.equal((await preview.cookies()).length, 0);
    assert.equal(await p.evaluate(() => Object.keys(localStorage).length), 0);
    checks.push(
      "DEV preview reuses actual panels; no API, cookies or localStorage writes",
    );
  } finally {
    await preview.close();
  }
  assert.deepEqual(errors, []);
  await fs.writeFile(
    new URL("interaction-results.json", out),
    JSON.stringify({ checks, errors }, null, 2),
  );
  console.log("PASS", checks);
} finally {
  await browser.close();
}
