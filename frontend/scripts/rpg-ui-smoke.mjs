import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const base = process.env.REALQUEST_URL || "http://127.0.0.1:5185";
const output = new URL("../../output/rpg-polish/", import.meta.url);
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [];
const read = (p) => p.evaluate(() => JSON.parse(window.render_game_to_text()));
const snap = (p, name) =>
  p.screenshot({
    path: new URL(name + ".png", output).pathname,
    fullPage: true,
  });
async function until(p, fn) {
  for (let i = 0; i < 120; i++) {
    const s = await read(p);
    if (fn(s)) return s;
    await p.waitForTimeout(100);
  }
  throw new Error("State not reached: " + JSON.stringify(await read(p)));
}
async function go(p, x, y) {
  const s = await read(p);
  await p.locator("canvas").click({
    position: {
      x: (x - s.camera.viewX) * s.camera.zoom,
      y: (y - s.camera.viewY) * s.camera.zoom,
    },
  });
  await until(
    p,
    (s) =>
      Math.hypot(s.player.x - x, s.player.y - y) < 16 && s.walking.length === 0,
  );
  await p.waitForTimeout(200);
}
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
    await p.waitForSelector("#start-btn");
    await p.getByRole("button", { name: "外观 2" }).click();
    assert.ok(await p.locator(".stage-person .person-1").count());
    await p.getByLabel("你的名字").fill("林间旅人");
    await snap(p, "create-selected");
    await p.click("#start-btn");
    await p.waitForSelector("canvas");
    await p.waitForTimeout(650);
    assert.equal((await read(p)).camera.zoom, 3);
    await p.waitForTimeout(5000);
    await snap(p, "world-final");
    await p.keyboard.press("1");
    await until(p, (s) => s.mode === "inventory");
    assert.equal((await read(p)).selectedItem, "seed");
    assert.equal(await p.locator(".hw-tray .hw-slot").count(), 24);
    assert.equal(await p.locator(".hw-tray button.hw-slot").count(), 1);
    assert.equal(await p.locator(".hw-tray .hw-slot.gold").count(), 0);
    await p.getByRole("button", { name: "材料", exact: true }).click();
    assert.equal(await p.locator(".hw-tray button.hw-slot").count(), 0);
    await p.getByRole("button", { name: "全部", exact: true }).click();
    await p.getByRole("button", { name: "将种子放入快捷栏 2" }).click();
    assert.deepEqual((await read(p)).quickItems, [
      "wood",
      "seed",
      "stone",
      "crop",
    ]);
    await snap(p, "inventory-final");
    await p.reload();
    await p.waitForSelector("canvas");
    await p.waitForTimeout(400);
    assert.deepEqual((await read(p)).quickItems, [
      "wood",
      "seed",
      "stone",
      "crop",
    ]);
    await p.keyboard.press("2");
    await until(p, (s) => s.mode === "inventory");
    assert.equal((await read(p)).selectedItem, "seed");
    await p.getByRole("button", { name: "标记家园农田" }).click();
    assert.equal((await read(p)).navigation.targetId, "plot_2");
    assert.equal((await read(p)).mode, "explore");
    await go(p, 280, 360);
    await go(p, 232, 400);
    await p.keyboard.press("2");
    await until(p, (s) => s.mode === "inventory");
    await p.getByRole("button", { name: "种下一颗种子" }).click();
    await until(p, (s) => s.inventory.seed === 5 && !!s.plots.plot_2);
    await p.keyboard.press("Escape");
    // Real gathering and crafting, via scene movement then the new bag actions.
    await go(p, 328, 352);
    await p.keyboard.press("e");
    await until(p, (s) => s.inventory.wood === 3);
    await p.keyboard.press("1");
    await until(p, (s) => s.mode === "inventory");
    await p.getByRole("button", { name: "标记工坊柜台" }).click();
    assert.equal((await read(p)).navigation.targetId, "workshop_counter");
    await go(p, 352, 248);
    await p.keyboard.press("e");
    await until(p, (s) => s.location === "workshop");
    await p.waitForTimeout(400);
    await go(p, 240, 236);
    await p.keyboard.press("1");
    await until(p, (s) => s.mode === "inventory");
    await p.getByRole("button", { name: "制作 1 块木板" }).click();
    await until(p, (s) => s.inventory.plank === 1 && s.inventory.wood === 0);
    assert.equal(
      await p.getByRole("button", { name: "制作 1 块木板" }).isDisabled(),
      true,
    );
    await p.getByRole("button", { name: "木板，数量 1" }).click();
    await snap(p, "inventory-crafted");
    await p.keyboard.press("Escape");
    await p.keyboard.press("c");
    await until(p, (s) => s.mode === "character");
    assert.ok(await p.getByText("古代符文解读", { exact: true }).count());
    await p.getByRole("button", { name: "记录学习，积累经验" }).click();
    assert.equal(await p.getByLabel("活动类型").inputValue(), "study");
    await p.getByRole("button", { name: "保存这次成长" }).click();
    await until(p, (s) => s.attributes.wisdom === 25);
    await p.keyboard.press("Escape");
    await p.keyboard.press("c");
    await until(p, (s) => s.mode === "character");
    assert.ok(await p.getByText("探索能力 · 已掌握", { exact: true }).count());
    await snap(p, "character-unlocked");
    await p.getByRole("button", { name: "标记古代遗迹" }).click();
    assert.equal((await read(p)).navigation.targetId, "ruins");
    await p.keyboard.press("c");
    await until(p, (s) => s.mode === "character");
    await p.getByRole("button", { name: /体魄/ }).click();
    await p.getByRole("button", { name: "记录步行或运动，积累经验" }).click();
    assert.equal(await p.getByLabel("活动类型").inputValue(), "exercise");
    await p.getByLabel("时长（分钟）").fill("50");
    await p.getByRole("button", { name: "保存这次成长" }).click();
    await until(p, (s) => s.attributes.strength === 50);
    await p.keyboard.press("Escape");
    await p.keyboard.press("c");
    await until(p, (s) => s.mode === "character");
    await p.getByRole("button", { name: /体魄/ }).click();
    assert.ok(await p.getByText("被动能力 · 已掌握", { exact: true }).count());
    await snap(p, "character-gather-unlocked");
    await p.keyboard.press("Escape");
    // Navigation retains the correct destination through an interior exit.
    assert.equal((await read(p)).navigation.targetId, "ruins");
    assert.equal((await read(p)).canvasCount, 1);
    await go(p, 240, 294);
    await p.keyboard.press("e");
    await until(p, (s) => s.location === "overworld");
    await p.waitForTimeout(450);
    await go(p, 352, 300);
    await go(p, 280, 352);
    await go(p, 232, 400);
    // Let the real server clock mature the crop; no fabricated rewards or time warp.
    const planted = await (await c.request.get(`${base}/api/state`)).json();
    await p.waitForTimeout(
      Math.max(
        0,
        (planted.state.plots.plot_2.ready_at - planted.server_time) * 1000,
      ) + 200,
    );
    await p.keyboard.press("e");
    await until(p, (s) => s.inventory.crop === 2);
    await go(p, 280, 352);
    await go(p, 352, 248);
    await p.keyboard.press("e");
    await until(p, (s) => s.location === "workshop");
    await p.waitForTimeout(450);
    await go(p, 240, 236);
    await p.keyboard.press("4");
    await until(p, (s) => s.mode === "inventory");
    await p.getByRole("button", { name: "出售 · +8 金币" }).click();
    await until(p, (s) => s.inventory.crop === 1 && s.inventory.gold === 28);
    await snap(p, "inventory-sold");
  } finally {
    try {
      await c.request.delete(`${base}/api/session`);
    } finally {
      await c.close();
    }
  }
  for (const [width, height] of [
    [390, 844],
    [375, 812],
    [768, 1024],
    [844, 390],
    [1920, 1080],
  ]) {
    const touch = width < 1000;
    const c = await browser.newContext({
      viewport: { width, height },
      hasTouch: touch,
      isMobile: touch,
      reducedMotion: "reduce",
    });
    try {
      const p = await c.newPage();
      p.on("pageerror", (e) => errors.push(e.message));
      await p.goto(base);
      await p.waitForSelector("#start-btn");
      await snap(p, `arrival-${width}`);
      await p.click("#start-btn");
      await p.waitForSelector("canvas");
      await p.waitForTimeout(600);
      assert.equal(
        await p.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      const hud = await p.locator(".game-status").boundingBox(),
        menu = await p.locator(".app-header").boundingBox();
      assert.ok(hud.x + hud.width <= menu.x, `HUD collision at ${width}`);
      await p.getByRole("button", { name: "背包", exact: true }).click();
      await snap(p, `bag-${width}`);
      if (width <= 700)
        await p
          .getByRole("button", { name: "查看所选物品", exact: true })
          .click();
      const action = await p
        .getByRole("button", { name: "标记家园农田" })
        .boundingBox();
      assert.ok(
        action.y >= 0 && action.y + action.height <= height,
        "Bag action visible without scrolling",
      );
      assert.equal(
        await p
          .locator(".modal-body")
          .evaluate((el) => el.scrollWidth > el.clientWidth),
        false,
      );
      if (width < 600) {
        await p.locator(".hw-item-notes summary").click();
        await p.locator(".hw-item-use").scrollIntoViewIfNeeded();
        await snap(p, `bag-detail-${width}`);
      }
      await p.keyboard.press("Escape");
      await p.getByRole("button", { name: "角色", exact: true }).click();
      await snap(p, `character-${width}`);
      await p.getByRole("button", { name: /创造/ }).click();
      await p.getByRole("button", { name: "标记工坊柜台" }).click();
      assert.equal((await read(p)).navigation.targetId, "workshop_counter");
    } finally {
      try {
        await c.request.delete(`${base}/api/session`);
      } finally {
        await c.close();
      }
    }
  }
  assert.deepEqual(errors, []);
  await fs.writeFile(
    new URL("rpg-result.json", output),
    JSON.stringify(
      {
        passed: true,
        errors,
        features: [
          "character selection",
          "24 slots",
          "filters",
          "quick slots persistence",
          "numeric shortcuts",
          "navigation",
          "real crafting",
          "real planting, maturation, harvest and sale",
          "locked to unlocked abilities",
          "activity linking",
          "mobile sticky actions",
          "six viewport bounds",
        ],
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS RPG inventory, crafting, shortcuts, growth unlocks, mobile actions and six viewport layouts",
  );
} finally {
  await browser.close();
}
