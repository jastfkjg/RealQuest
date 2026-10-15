import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const base = process.env.REALQUEST_URL || "http://127.0.0.1:5211";
const out = new URL("../../output/hud-interiors/hud/", import.meta.url);
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const contexts = [],
  errors = [],
  cases = [];
let current;
const read = (p) => p.evaluate(() => JSON.parse(window.render_game_to_text()));
async function until(p, predicate, label) {
  for (let i = 0; i < 80; i++) {
    const s = await read(p);
    if (predicate(s)) return s;
    await p.waitForTimeout(100);
  }
  throw new Error(label + ": " + JSON.stringify(await read(p)));
}
async function create(options = {}) {
  const c = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: {
      dir: new URL("recordings/", out).pathname,
      size: { width: 1440, height: 900 },
    },
    ...options,
  });
  contexts.push(c);
  const p = await c.newPage();
  current = p;
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await p.goto(base);
  await p.getByLabel("你的名字").fill("唤醒者");
  await p.click("#start-btn");
  await p.waitForSelector("canvas");
  await p.waitForTimeout(600);
  await p.screenshot({
    path: new URL(`welcome-toast-${p.viewportSize().width}.png`, out).pathname,
  });
  await p.waitForTimeout(4200);
  return { c, p };
}
async function bounds(p) {
  const result = await p.evaluate(() => {
    const roots = [
      ...document.querySelectorAll(
        ".game-status,.header-actions,.bottom-nav,.quest-compass",
      ),
    ];
    const controls = roots
      .flatMap((r) => [...r.querySelectorAll("button")])
      .filter((b) => b.checkVisibility());
    return {
      overflow: document.documentElement.scrollWidth > innerWidth,
      controls: controls.map((b) => {
        const r = b.getBoundingClientRect();
        return {
          name: b.ariaLabel || b.textContent,
          w: r.width,
          h: r.height,
          inView:
            r.x >= 0 &&
            r.y >= 0 &&
            r.right <= innerWidth &&
            r.bottom <= innerHeight,
          uncovered: b.contains(
            document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2),
          ),
        };
      }),
    };
  });
  assert.equal(result.overflow, false, "document overflow");
  for (const b of result.controls) {
    assert.ok(b.w >= 44 && b.h >= 44, JSON.stringify(b));
    assert.ok(b.inView && b.uncovered, JSON.stringify(b));
  }
}
async function shot(p, name) {
  await bounds(p);
  await p.screenshot({ path: new URL(name + ".png", out).pathname });
  cases.push(name);
}
async function close(p) {
  await p.keyboard.press("Escape");
  await until(p, (s) => s.mode === "explore", "close");
  await p.waitForTimeout(180);
}
try {
  const { p, c } = await create();
  const initial = await read(p);
  for (const [width, height] of [
    [1440, 900],
    [1920, 1080],
    [768, 1024],
    [390, 844],
    [720, 450],
  ]) {
    await p.setViewportSize({ width, height });
    await p.waitForTimeout(250);
    await shot(p, `world-${width}`);
  }
  await p.setViewportSize({ width: 1440, height: 900 });
  await p.waitForTimeout(250);
  // Every reskinned entry opens its original panel, freezes movement and restores focus.
  for (const [name, mode, key] of [
    ["背包", "inventory", "i"],
    ["角色", "character", "c"],
    ["任务日志", "journal", "j"],
    ["现实成长", "activity", "l"],
  ]) {
    const opener = p.getByRole("button", { name, exact: true });
    await opener.click();
    await until(p, (s) => s.mode === mode, name);
    const position = (await read(p)).player;
    await p.keyboard.press("ArrowRight");
    await p.waitForTimeout(120);
    assert.deepEqual((await read(p)).player, position, "panel owns movement");
    await close(p);
    assert.equal(
      await opener.evaluate((el) => el === document.activeElement),
      true,
      "opener focus " + name,
    );
    await p.keyboard.press(key);
    await until(p, (s) => s.mode === mode, "shortcut " + key);
    await close(p);
  }
  assert.deepEqual(
    (await read(p)).inventory,
    initial.inventory,
    "menus do not consume items",
  );
  for (let i = 0; i < 4; i++) {
    await p.locator(".quick-inventory button").nth(i).click();
    const s = await until(p, (s) => s.mode === "inventory", "quick item");
    assert.equal(s.selectedItem, s.quickItems[i]);
    assert.deepEqual(s.inventory, initial.inventory);
    await close(p);
  }
  await p.getByRole("button", { name: "背包", exact: true }).click();
  await p.waitForTimeout(250);
  await p.screenshot({
    path: new URL("inventory-items-1440.png", out).pathname,
  });
  await close(p);
  await p.locator(".quick-inventory button").first().click();
  await p
    .getByRole("button", { name: "将种子放入快捷栏 2", exact: true })
    .click();
  await close(p);
  assert.equal((await read(p)).quickItems[1], "seed");
  assert.deepEqual((await read(p)).inventory, initial.inventory);
  await p.reload();
  await p.waitForSelector("canvas");
  await p.waitForTimeout(800);
  assert.equal((await read(p)).quickItems[1], "seed");
  assert.deepEqual((await read(p)).inventory, initial.inventory);
  await p.getByRole("button", { name: "查看角色成长" }).click();
  await until(p, (s) => s.mode === "character", "nameplate");
  await close(p);
  const sound = p.locator(".sound-toggle");
  const was = await sound.getAttribute("aria-pressed");
  await sound.click();
  assert.notEqual(await sound.getAttribute("aria-pressed"), was);
  await p.reload();
  await p.waitForSelector("canvas");
  await p.waitForTimeout(800);
  assert.notEqual(await sound.getAttribute("aria-pressed"), was);
  await p.getByRole("button", { name: "地图", exact: true }).click();
  await until(p, (s) => s.mode === "map", "map");
  await close(p);
  await p.getByRole("button", { name: "主菜单", exact: true }).click();
  await until(p, (s) => s.mode === "menu", "menu");
  await close(p);
  const beforeGuide = (await read(p)).player;
  await p.getByRole("button", { name: "指引我的下一步" }).click();
  assert.ok((await read(p)).navigation);
  assert.deepEqual((await read(p)).player, beforeGuide, "guide only marks");
  await p.getByRole("button", { name: "展开任务追踪" }).click();
  await p.getByRole("button", { name: "收起任务追踪" }).click();
  await bounds(p);
  await p.locator(".nav-actions button").first().focus();
  await p.keyboard.press("Tab");
  assert.ok(
    await p
      .locator(".nav-actions button")
      .nth(1)
      .evaluate((el) => el.matches(":focus-visible")),
  );
  await shot(p, "keyboard-focus");
  await p.locator(".nav-actions button").first().hover();
  await shot(p, "hover");
  await p.keyboard.down("d");
  await p.waitForTimeout(80);
  await p.getByRole("button", { name: "背包", exact: true }).click();
  const stopped = (await read(p)).player;
  await close(p);
  await p.waitForTimeout(150);
  assert.deepEqual((await read(p)).player, stopped);
  await p.keyboard.up("d");
  await p.getByRole("button", { name: "现实成长", exact: true }).click();
  const typing = (await read(p)).player;
  await p.keyboard.press("j");
  assert.equal((await read(p)).mode, "activity");
  assert.deepEqual((await read(p)).player, typing);
  await close(p);
  // Near-object prompt retains actual range gating, pending state and cooldown.
  const s = await read(p);
  const obj =
    s.objects.find((o) => o.id === "branch_1") ||
    s.objects.find((o) => o.kind === "wood");
  if (obj) {
    await p.locator("canvas").click({
      position: {
        x: (obj.x - s.camera.viewX) * s.camera.zoom,
        y: (obj.y - 40 - s.camera.viewY) * s.camera.zoom,
      },
    });
    await until(
      p,
      (v) => !v.walking.length && v.nearest?.id === obj.id,
      "wood approach above prompt",
    );
    await p.keyboard.press("e");
    await until(p, (v) => v.inventory.wood > initial.inventory.wood, "gather");
    await shot(p, "depleted-world-prompt");
    assert.ok(await p.locator(".interact").isDisabled());
  }
  assert.equal((await read(p)).canvasCount, 1);
  assert.equal((await read(p)).keyboardListeners, 1);
  await c.close();
  const mobile = await create({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });
  for (const [width, height] of [
    [390, 844],
    [375, 812],
    [844, 390],
  ]) {
    await mobile.p.setViewportSize({ width, height });
    await mobile.p.waitForTimeout(300);
    await shot(mobile.p, `touch-${width}`);
  }
  await mobile.p.setViewportSize({ width: 390, height: 844 });
  for (const [name, mode] of [
    ["背包", "inventory"],
    ["角色", "character"],
    ["任务日志", "journal"],
    ["现实成长", "activity"],
  ]) {
    await mobile.p.getByRole("button", { name, exact: true }).tap();
    await until(mobile.p, (s) => s.mode === mode, "touch " + name);
    await mobile.p.getByRole("button", { name: "关闭面板" }).tap();
    await until(mobile.p, (s) => s.mode === "explore", "touch close");
  }
  await mobile.p.getByRole("button", { name: "展开任务追踪" }).tap();
  await mobile.p.getByRole("button", { name: "收起任务追踪" }).tap();
  await mobile.p.getByRole("button", { name: "主菜单", exact: true }).tap();
  await close(mobile.p);
  await mobile.c.close();
  // A real allowed long player name is isolated to this new test guest.
  const long = await browser.newContext({
    viewport: { width: 375, height: 812 },
    reducedMotion: "reduce",
  });
  contexts.push(long);
  const lp = await long.newPage();
  current = lp;
  await lp.goto(base);
  await lp.getByLabel("你的名字").fill("正在林间寻找新生活的旅行者");
  await lp.click("#start-btn");
  await lp.waitForSelector("canvas");
  await lp.waitForTimeout(4500);
  await shot(lp, "long-name");
  assert.deepEqual(errors, []);
  await fs.writeFile(
    new URL("result.json", out),
    JSON.stringify(
      {
        passed: true,
        cases,
        errors,
        checks: [
          "all menus and shortcuts",
          "focus restoration",
          "panel input ownership (current readonly Life journal)",
          "quick item selection/depleted/assignment/persistence",
          "sound persistence",
          "marker-only quest navigation",
          "tracking expand/collapse",
          "nameplate click",
          "single canvas/listeners",
          "emulated touch/DPR2/reduced motion",
          "long name",
        ],
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS HUD:",
    cases.length,
    "captures; all navigation and input checks",
  );
} catch (e) {
  if (current)
    await current
      .screenshot({ path: new URL("failure.png", out).pathname })
      .catch(() => {});
  throw e;
} finally {
  for (const c of contexts) {
    await c.close();
  }
  await browser.close();
}
