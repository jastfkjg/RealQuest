import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const base = process.env.REALQUEST_URL || "http://127.0.0.1:5187";
const out = new URL("../../output/inventory-satchel/", import.meta.url);
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [],
  failed = [],
  checks = [];
const read = (p) => p.evaluate(() => JSON.parse(window.render_game_to_text()));
const snapshot = async (p, name) => {
  await p.evaluate(async () => {
    await Promise.all(Array.from(document.images, (img) => img.decode()));
  });
  return p.screenshot({
    path: new URL(name + ".png", out).pathname,
    fullPage: p.url().includes("/dev/ui"),
  });
};
async function until(p, predicate) {
  for (let i = 0; i < 120; i++) {
    const state = await read(p);
    if (predicate(state)) return state;
    await p.waitForTimeout(100);
  }
  throw new Error("State not reached: " + JSON.stringify(await read(p)));
}
function observe(p) {
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => {
    if (
      m.type() === "error" &&
      !m.text().includes("422") &&
      !m.text().includes("ERR_FAILED")
    )
      errors.push(m.text());
  });
  p.on("requestfailed", (r) => {
    if (!r.url().includes("/api/command")) failed.push(r.url());
  });
}
async function bounds(p) {
  assert.equal(
    await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
    "document overflow",
  );
  assert.equal(
    await p
      .locator(".panel-inventory")
      .evaluate((el) => el.scrollWidth > el.clientWidth),
    false,
    "inventory overflow",
  );
  assert.equal(
    await p.locator(".panel-inventory .hw-wallet").evaluate((el) => {
      const box = el.getBoundingClientRect();
      return el.contains(
        document.elementFromPoint(
          box.x + box.width / 2,
          box.y + box.height / 2,
        ),
      );
    }),
    true,
    "Currency label is visible, not covered by the title",
  );
  const targets = await p
    .locator(".panel-inventory button:visible")
    .evaluateAll((buttons) =>
      buttons.map((b) => ({
        label: b.getAttribute("aria-label") || b.textContent,
        w: b.getBoundingClientRect().width,
        h: b.getBoundingClientRect().height,
      })),
    );
  for (const b of targets) assert.ok(b.w >= 44 && b.h >= 44, JSON.stringify(b));
}
try {
  const sessionPath = new URL("starter-session.json", out).pathname;
  const hasBaseline = await fs.access(sessionPath).then(
    () => true,
    () => false,
  );
  let baseline = hasBaseline
    ? JSON.parse(await fs.readFile(new URL("baseline-state.json", out), "utf8"))
    : null;
  const c = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    storageState: hasBaseline ? sessionPath : undefined,
    reducedMotion: "reduce",
    recordVideo: {
      dir: new URL("recordings/", out).pathname,
      size: { width: 1440, height: 900 },
    },
  });
  try {
    const p = await c.newPage();
    observe(p);
    await p.goto(base);
    if (!hasBaseline) await p.click("#start-btn");
    await p.waitForSelector("canvas");
    await p.waitForTimeout(500);
    if (!baseline) {
      baseline = await read(p);
      await c.storageState({ path: sessionPath });
      await fs.writeFile(
        new URL("baseline-state.json", out),
        JSON.stringify(baseline),
      );
    }
    await p.getByRole("button", { name: "背包", exact: true }).click();
    assert.deepEqual((await read(p)).inventory, baseline.inventory);
    assert.deepEqual((await read(p)).player, baseline.player);
    assert.equal(await p.locator(".hw-tray .hw-slot").count(), 24);
    assert.equal(await p.locator(".hw-tray button.hw-slot").count(), 1);
    for (const [width, height] of [
      [1440, 900],
      [390, 844],
      [1920, 1080],
      [768, 1024],
    ]) {
      await p.setViewportSize({ width, height });
      await p.waitForTimeout(250);
      await bounds(p);
      await snapshot(p, `after-${width}`);
      if (width === 390) {
        assert.equal(
          await p
            .locator(".hw-slots")
            .evaluate(
              (el) =>
                getComputedStyle(el).gridTemplateColumns.split(" ").length,
            ),
          4,
        );
        await p
          .getByRole("button", { name: "查看所选物品", exact: true })
          .click();
        await snapshot(p, "after-390-details");
        const a = await p
          .getByRole("button", { name: "标记家园农田" })
          .boundingBox();
        assert.ok(a.y >= 0 && a.y + a.height <= height);
        await p.getByRole("button", { name: "返回物品", exact: true }).click();
      }
    }
    checks.push(
      "Matched starter inventory/position; 1440/390/1920/768 bounds and 44px controls",
    );
    await p.setViewportSize({ width: 1440, height: 900 });
    const notes = p.locator(".hw-item-notes summary");
    await notes.focus();
    await p.keyboard.press("Enter");
    assert.equal(
      await p
        .getByText("1 种子 → 2 萝卜 + 1 种子", { exact: true })
        .isVisible(),
      true,
    );
    assert.deepEqual((await read(p)).inventory, baseline.inventory);
    await p.keyboard.press("Enter");
    await p.getByRole("button", { name: "材料", exact: true }).click();
    assert.equal(await p.locator(".hw-tray button.hw-slot").count(), 0);
    await p.getByRole("button", { name: "全部", exact: true }).click();
    await p.getByRole("button", { name: /^种子，数量 6/ }).focus();
    await p.keyboard.press("Enter");
    await p.getByRole("button", { name: "将种子放入快捷栏 2" }).focus();
    await snapshot(p, "keyboard-focus");
    await p.keyboard.press("Enter");
    assert.deepEqual((await read(p)).quickItems, [
      "wood",
      "seed",
      "stone",
      "crop",
    ]);
    assert.deepEqual((await read(p)).inventory, baseline.inventory);
    const position = (await read(p)).player;
    await p.keyboard.down("ArrowRight");
    await p.waitForTimeout(200);
    await p.keyboard.up("ArrowRight");
    assert.deepEqual((await read(p)).player, position);
    // Native modal focus trap and return to opener.
    for (let i = 0; i < 18; i++) {
      await p.keyboard.press("Tab");
      assert.equal(
        await p.evaluate(() => !!document.activeElement.closest("dialog")),
        true,
      );
    }
    await p.keyboard.press("Escape");
    assert.equal(
      await p
        .getByRole("button", { name: "背包", exact: true })
        .evaluate((el) => el === document.activeElement),
      true,
    );
    await p.reload();
    await p.waitForSelector("canvas");
    await p.waitForTimeout(400);
    await p.keyboard.press("2");
    await until(p, (s) => s.mode === "inventory");
    assert.deepEqual((await read(p)).quickItems, [
      "wood",
      "seed",
      "stone",
      "crop",
    ]);
    assert.deepEqual((await read(p)).inventory, baseline.inventory);
    await p.keyboard.press("Escape");
    await p.keyboard.press("1");
    await until(p, (s) => s.mode === "inventory");
    assert.equal(
      await p.getByRole("button", { name: "标记工坊柜台" }).isDisabled(),
      true,
    );
    assert.equal(
      await p.getByRole("button", { name: "将木材放入快捷栏 1" }).isDisabled(),
      true,
    );
    assert.equal(await p.locator(".hw-tray button.hw-slot").count(), 1);
    await snapshot(p, "depleted-real");
    await p.keyboard.press("Escape");
    await p.keyboard.press("l");
    await until(p, (s) => s.mode === "activity");
    const input = p.getByLabel("时长（分钟）");
    await input.focus();
    await input.dispatchEvent("compositionstart");
    await p.keyboard.press("d");
    await p.keyboard.press("1");
    await input.dispatchEvent("compositionend");
    assert.equal((await read(p)).mode, "activity");
    assert.deepEqual((await read(p)).player, position);
    await p.keyboard.press("Escape");
    await p.keyboard.press("2");
    await until(p, (s) => s.mode === "inventory");
    assert.deepEqual((await read(p)).inventory, baseline.inventory);
    await p.getByRole("button", { name: "标记家园农田" }).click();
    assert.equal((await read(p)).mode, "explore");
    assert.deepEqual((await read(p)).player, position);
    checks.push(
      "Selection, keyboard binding, no consumption, reload, stale shortcuts, modal focus, typing/IME, Life panel return, marker does not move player",
    );
    // DOM reflow equivalent to a 1440 viewport at 200% desktop zoom, plus HiDPI separately.
    await p.setViewportSize({ width: 720, height: 450 });
    await p.keyboard.press("i");
    await until(p, (s) => s.mode === "inventory");
    await bounds(p);
    await snapshot(p, "reflow-720");
  } finally {
    await c.close();
  }

  const touch = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 2,
    storageState: sessionPath,
    reducedMotion: "reduce",
  });
  try {
    const p = await touch.newPage();
    observe(p);
    await p.goto(base);
    await p.waitForSelector("canvas");
    await p.waitForTimeout(400);
    await p.getByRole("button", { name: "背包", exact: true }).tap();
    await p.getByRole("button", { name: /^种子，数量 6/ }).tap();
    await p.getByRole("button", { name: "将种子放入快捷栏 3" }).tap();
    assert.equal((await read(p)).quickItems[2], "seed");
    assert.equal((await read(p)).inventory.seed, 6);
    await bounds(p);
    await snapshot(p, "touch-hidpi-details");
    checks.push(
      "Emulated touch select/bind, DPR2, reduced motion; physical touch unverified",
    );
  } finally {
    await touch.close();
  }

  const preview = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  try {
    const p = await preview.newPage();
    observe(p);
    const calls = [];
    p.on("request", (r) => {
      if (r.url().includes("/api/")) calls.push(r.url());
    });
    await p.goto(base + "/dev/ui");
    await p.getByRole("heading", { name: "Hearthwood · 背包候选" }).waitFor();
    for (const name of [
      "稀疏起步",
      "满格压力",
      "长名称",
      "操作被拒绝",
      "已用尽",
    ]) {
      await p.getByRole("button", { name, exact: true }).click();
      if (name === "满格压力") {
        assert.equal(await p.locator(".hw-tray button.hw-slot").count(), 24);
        await p.setViewportSize({ width: 390, height: 844 });
        const wallet = await p.locator(".hw-wallet").boundingBox();
        const title = await p.locator(".hw-preview-head h2").boundingBox();
        const filters = await p.locator(".hw-filters").boundingBox();
        assert.ok(
          wallet.y >= title.y + title.height &&
            wallet.y + wallet.height <= filters.y,
          "All earned resources stay between title and tabs",
        );
        assert.equal(
          await p.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
        );
        await snapshot(p, "preview-full-mobile");
        await p.setViewportSize({ width: 1440, height: 900 });
      }
      if (name === "操作被拒绝") {
        await p.getByRole("button", { name: "模拟操作", exact: true }).click();
        assert.equal(await p.locator(".hw-item-action").isDisabled(), true);
        await snapshot(p, "preview-pending");
        await p.getByRole("button", { name: "重试预览操作" }).waitFor();
        assert.equal(await p.getByRole("alert").count(), 1);
      }
      await snapshot(
        p,
        `preview-${{ 稀疏起步: "starter", 满格压力: "full", 长名称: "long", 操作被拒绝: "rejected", 已用尽: "depleted" }[name]}`,
      );
    }
    await p.getByRole("button", { name: "稀疏起步", exact: true }).click();
    await p.getByRole("button", { name: "模拟操作", exact: true }).click();
    await p.getByText("预览操作已完成；没有保存，也没有消耗物品。").waitFor();
    await p
      .getByRole("button", { name: "快捷栏说明" })
      .filter({ visible: true })
      .focus();
    await snapshot(p, "preview-tooltip");
    await p.getByRole("heading", { name: "组件状态" }).scrollIntoViewIfNeeded();
    await snapshot(p, "preview-component-states");
    await p.setViewportSize({ width: 390, height: 844 });
    await p.getByRole("button", { name: "长名称", exact: true }).click();
    await p.getByRole("button", { name: "查看所选物品", exact: true }).click();
    assert.equal(
      await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    await snapshot(p, "preview-long-mobile");
    assert.deepEqual(calls, []);
    assert.equal(await p.evaluate(() => localStorage.length), 0);
    checks.push(
      "Preview: sparse/full/long/rejected/depleted/pending/success/tooltip/states; zero API calls or localStorage writes",
    );
  } finally {
    await preview.close();
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(failed, []);
  await fs.writeFile(
    new URL("result.json", out),
    JSON.stringify({ passed: true, checks, errors, failed }, null, 2),
  );
  console.log("PASS inventory reference:", checks.join("\n"));
} finally {
  await browser.close();
}
