import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const base = process.env.REALQUEST_URL || "http://127.0.0.1:5187",
  out = new URL("../../output/character-reference/", import.meta.url);
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [],
  checks = [];
const read = (p) => p.evaluate(() => JSON.parse(window.render_game_to_text()));
const snap = (p, n) =>
  p.screenshot({ path: new URL(n + ".png", out).pathname });
try {
  const c = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  try {
    const p = await c.newPage();
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await p.goto(base);
    await p.getByLabel("你的名字").fill("林间旅人");
    await p.click("#start-btn");
    await p.waitForSelector("canvas");
    await p.waitForTimeout(500);
    const before = await read(p);
    await p.getByRole("button", { name: "角色", exact: true }).click();
    await p.locator(".hc-dossier").waitFor();
    await p.evaluate(async () => {
      const i = new Image();
      i.src = "/assets/hearthwood/character-dossier-v1.webp";
      await i.decode();
    });
    assert.equal(
      await p
        .getByRole("progressbar", { name: "旅程经验", exact: true })
        .getAttribute("aria-valuenow"),
      "0",
    );
    assert.equal(
      await p
        .getByRole("progressbar", { name: "古代符文解读解锁进度" })
        .getAttribute("aria-valuemax"),
      "25",
    );
    for (const [width, height] of [
      [1440, 900],
      [390, 844],
      [768, 1024],
      [1920, 1080],
      [720, 450],
    ]) {
      await p.setViewportSize({ width, height });
      await p.waitForTimeout(200);
      await p.locator("dialog").evaluate((el) => (el.scrollTop = 0));
      assert.equal(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
      assert.equal(
        await p
          .locator("dialog")
          .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
        true,
      );
      const small = await p.locator("dialog button").evaluateAll((es) =>
        es
          .filter((e) => e.checkVisibility())
          .map((e) => ({
            label: e.textContent,
            w: e.getBoundingClientRect().width,
            h: e.getBoundingClientRect().height,
          }))
          .filter((e) => e.w < 44 || e.h < 44),
      );
      assert.deepEqual(small, []);
      await snap(p, "character-" + width);
      if (width === 390) {
        await p
          .getByRole("button", { name: "随身地图" })
          .scrollIntoViewIfNeeded();
        await snap(p, "character-390-bottom");
      }
    }
    checks.push(
      "five viewports, 44px controls, no horizontal overflow, phone scroll",
    );
    await p.setViewportSize({ width: 1440, height: 900 });
    for (const [name, skill] of [
      ["体魄", "熟练采集"],
      ["创造", "木板制作"],
      ["经营", "家园种植"],
      ["联结", "旅人之谊"],
      ["学识", "古代符文解读"],
    ]) {
      await p
        .getByRole("button", { name: new RegExp("^" + name + "，") })
        .click();
      assert.equal(
        await p.getByRole("heading", { name: skill, exact: true }).count(),
        1,
      );
    }
    await p.keyboard.press("d");
    await p.waitForTimeout(100);
    const after = await read(p);
    for (const k of ["player", "inventory", "xp", "attributes", "events"])
      assert.deepEqual(after[k], before[k]);
    await p.getByRole("button", { name: "关闭面板" }).focus();
    await p.keyboard.press("Shift+Tab");
    assert.equal(
      await p
        .getByRole("button", { name: "随身地图" })
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
        .getByRole("button", { name: "角色", exact: true })
        .evaluate((e) => e === document.activeElement),
      true,
    );
    await p.getByRole("button", { name: "角色", exact: true }).click();
    await p.getByRole("button", { name: /^创造，/ }).click();
    await p.getByRole("button", { name: "标记工坊柜台" }).click();
    assert.equal((await read(p)).navigation.targetId, "workshop_counter");
    await p.waitForTimeout(300);
    assert.deepEqual((await read(p)).player, before.player);
    await p.keyboard.press("c");
    await p.getByRole("button", { name: "随身地图" }).click();
    assert.equal((await read(p)).mode, "map");
    await p.keyboard.press("Escape");
    await p.keyboard.press("c");
    await p.getByRole("button", { name: "标记徒手采集点" }).click();
    assert.equal((await read(p)).navigation.targetId, "wood_1");
    await p.reload();
    await p.waitForSelector("canvas");
    await p.waitForTimeout(400);
    assert.deepEqual((await read(p)).attributes, before.attributes);
    assert.equal((await read(p)).canvasCount, 1);
    checks.push(
      "all attributes / no mutation / modal input / focus cycle / Escape restore / map and marker semantics / reload",
    );
  } finally {
    await c.request.delete(base + "/api/session").catch(() => {});
    await c.close();
  }
  const preview = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    hasTouch: true,
    deviceScaleFactor: 2,
    reducedMotion: "reduce",
  });
  try {
    const p = await preview.newPage(),
      calls = [];
    p.on("request", (r) => {
      if (r.url().includes("/api/")) calls.push(r.url());
    });
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(base + "/dev/character");
    await p.locator(".hc-dossier").waitFor();
    for (const name of [
      "初到大陆",
      "临近解锁",
      "能力已掌握",
      "高等级与已解读",
      "长名称",
    ]) {
      await p
        .getByRole("navigation", { name: "预览样例" })
        .getByRole("button", { name, exact: true })
        .click();
      if (name === "临近解锁") {
        assert.equal(
          await p
            .getByRole("progressbar", { name: "古代符文解读解锁进度" })
            .getAttribute("aria-valuenow"),
          "24",
        );
        await p.getByRole("button", { name: /^体魄，/ }).click();
        assert.equal(
          await p
            .getByRole("progressbar", { name: "熟练采集解锁进度" })
            .getAttribute("aria-valuenow"),
          "49",
        );
      }
      if (name === "高等级与已解读")
        assert.equal(
          await p.getByText("已完成这处遗迹的解读", { exact: true }).count(),
          1,
        );
      await snap(p, "preview-" + name);
      if (name === "长名称") {
        await p.setViewportSize({ width: 390, height: 844 });
        await p.getByRole("button", { name: /^经营，/ }).tap();
        await p
          .getByRole("button", { name: "标记家园农田" })
          .scrollIntoViewIfNeeded();
        assert.equal(
          await p.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
        );
        await snap(p, "preview-long-mobile-bottom");
        await p.locator(".hc-name-block").scrollIntoViewIfNeeded();
        await snap(p, "preview-long-mobile-top");
      }
    }
    await p.getByRole("button", { name: "标记家园农田" }).tap();
    await p.getByRole("status").waitFor();
    assert.deepEqual(calls, []);
    assert.equal(await p.evaluate(() => localStorage.length), 0);
    checks.push(
      "isolated starter/near/unlocked/high/long fixtures, zero API/storage writes, DPR2 touch",
    );
  } finally {
    await preview.close();
  }
  assert.deepEqual(errors, []);
  await fs.writeFile(
    new URL("character-result.json", out),
    JSON.stringify({ passed: true, checks, errors }, null, 2),
  );
  console.log("PASS character", checks);
} finally {
  await browser.close();
}
