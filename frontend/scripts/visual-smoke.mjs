import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const base = process.env.REALQUEST_URL || "http://127.0.0.1:5185";
const output = new URL("../../output/ux-v0.2/", import.meta.url);
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [];
const read = (p) => p.evaluate(() => JSON.parse(window.render_game_to_text()));
const screenshot = (p, name) =>
  p.screenshot({
    path: new URL(`${name}.png`, output).pathname,
    fullPage: true,
  });
async function until(p, predicate) {
  for (let n = 0; n < 100; n++) {
    const s = await read(p);
    if (predicate(s)) return s;
    await p.waitForTimeout(100);
  }
  throw new Error(`Unreached state: ${JSON.stringify(await read(p))}`);
}
const reports = [];
try {
  for (const [width, height, touch] of [
    [1440, 900, false],
    [1920, 1080, false],
    [390, 844, true],
    [768, 1024, true],
    [844, 390, true],
  ]) {
    const c = await browser.newContext({
      viewport: { width, height },
      hasTouch: touch,
      isMobile: touch,
      reducedMotion: "reduce",
    });
    const p = await c.newPage();
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    p.on("response", (r) => {
      if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
    });
    try {
      await p.goto(base);
      await p.getByRole("button", { name: "进入回响大陆" }).click();
      await p.waitForSelector("canvas");
      await p.waitForTimeout(800);
      const bounds = await p.locator("canvas").boundingBox();
      assert.equal(Math.round(bounds.width), width);
      assert.equal(Math.round(bounds.height), height);
      assert.equal(
        await p.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      const hud = await p.locator(".game-status").boundingBox(),
        menu = await p.locator(".app-header").boundingBox();
      assert.ok(
        hud.x + hud.width <= menu.x,
        `HUD and menu don't overlap at ${width}`,
      );
      assert.ok(
        Number.isInteger((await read(p)).camera.zoom),
        "Outdoor zoom is an integer",
      );
      assert.equal(await p.locator(".dpad").isVisible(), touch);
      if (touch) {
        const settings = await p
          .getByRole("button", { name: "主菜单" })
          .boundingBox();
        assert.ok(
          settings && settings.width >= 44 && settings.height >= 44,
          "Touch settings target is at least 44px",
        );
        const up = await p
          .getByRole("button", { name: "向上移动" })
          .boundingBox();
        assert.ok(
          up && up.width >= 44 && up.height >= 44,
          "Touch move target is at least 44px",
        );
      }
      await p.waitForTimeout(5200);
      await screenshot(p, `after-${width}x${height}`);
      await p.locator(".game-canvas").focus();
      for (const [key, direction, column] of [
        ["d", 2, 3],
        ["s", 0, 0],
        ["a", 1, 2],
        ["w", 3, 1],
      ]) {
        const from = (await read(p)).player;
        await p.keyboard.down(key);
        await p.waitForTimeout(140);
        const walking = await read(p);
        await p.keyboard.up(key);
        assert.equal(walking.direction, direction, `Facing ${key}`);
        assert.equal(
          Number(walking.frame) % 4,
          column,
          `Directional animation column ${key}`,
        );
        assert.ok(
          Math.hypot(walking.player.x - from.x, walking.player.y - from.y) > 8,
          `Move ${key}`,
        );
      }
      await p.getByRole("button", { name: "背包", exact: true }).click();
      const frozen = (await read(p)).player;
      await p.keyboard.down("d");
      await p.waitForTimeout(250);
      await p.keyboard.up("d");
      assert.deepEqual((await read(p)).player, frozen, "Panel locks movement");
      await screenshot(p, `inventory-${width}x${height}`);
      await p.getByRole("button", { name: "关闭面板" }).click();
      await p.keyboard.down("d");
      await p.waitForTimeout(150);
      await p.keyboard.up("d");
      assert.ok(
        (await read(p)).player.x > frozen.x + 10,
        "Closing panel restores movement",
      );
      if (width === 1440) {
        await p.locator(".game-canvas").focus();
        await p.keyboard.down("d");
        await p.waitForTimeout(1200);
        await p.keyboard.up("d");
        await p.waitForTimeout(250);
        const s = await read(p),
          o = s.objects.find((o) => o.id === "lia");
        await p.locator("canvas").click({
          position: {
            x: (o.x - s.camera.viewX) * s.camera.zoom,
            y: (o.y - s.camera.viewY) * s.camera.zoom,
          },
        });
        await until(p, (s) => s.mode === "npc");
        assert.equal(
          await p.getByRole("button", { name: "显示完整对话" }).count(),
          0,
          "Reduced motion reveals dialogue immediately",
        );
        await screenshot(p, "dialogue");
        const conversation = await read(p),
          npc = conversation.npcs.find((n) => n.id === "lia");
        assert.equal(
          npc.direction,
          [3, 2, 1, 0][conversation.direction],
          "NPC and player face each other",
        );
        await p.keyboard.press("Escape");
        await until(p, (s) => s.mode === "explore");
        await p.getByRole("button", { name: "主菜单" }).click();
        await p.getByRole("button", { name: /存档与数据/ }).click();
        await p.getByLabel("减少动态效果").uncheck();
        await p
          .getByRole("checkbox", { name: "开启游戏音效", exact: true })
          .check();
        await p.keyboard.press("Escape");
        await p.reload();
        await p.waitForSelector("canvas");
        await p.waitForTimeout(500);
        await p.getByRole("button", { name: "主菜单" }).click();
        await p.getByRole("button", { name: /存档与数据/ }).click();
        assert.equal(
          await p
            .getByRole("checkbox", { name: "开启游戏音效", exact: true })
            .isChecked(),
          true,
        );
        assert.equal(await p.getByLabel("减少动态效果").isChecked(), false);
        await p.keyboard.press("Escape");
        const s2 = await read(p),
          n = s2.objects.find((o) => o.id === "lia");
        await p.locator("canvas").click({
          position: {
            x: (n.x - s2.camera.viewX) * s2.camera.zoom,
            y: (n.y - s2.camera.viewY) * s2.camera.zoom,
          },
        });
        await until(p, (s) => s.mode === "npc");
        await p.getByRole("button", { name: "显示完整对话" }).click();
        const text = await p.locator(".dialogue-text blockquote").innerText();
        assert.ok(text.length > 20, "Dialogue can be revealed");
        await p.keyboard.press("Escape");
        await p.locator(".game-canvas").focus();
        await p.keyboard.press("f");
        await p.waitForTimeout(250);
        assert.equal(
          await p.evaluate(() =>
            document.fullscreenElement?.classList.contains("app-shell"),
          ),
          true,
          "Fullscreen contains game HUD",
        );
        await p.keyboard.press("f");
        await p.reload();
        await p.waitForSelector("canvas");
        await p.waitForTimeout(500);
        assert.equal(
          (await read(p)).location,
          "overworld",
          "Save restores after refresh",
        );
      }
      await p.getByRole("button", { name: "展开任务追踪" }).click();
      assert.ok(
        await p.locator(".sidebar").isVisible(),
        "Task detail available on every screen",
      );
      const sidebar = await p.locator(".sidebar").boundingBox();
      assert.ok(
        sidebar.y >= 0 && sidebar.y + sidebar.height <= height,
        "Tracker within viewport",
      );
      await p.getByRole("button", { name: "收起任务追踪" }).click();
      await p.getByRole("button", { name: "角色", exact: true }).click();
      await screenshot(p, `character-${width}x${height}`);
      await p.keyboard.press("Escape");
      await p.evaluate(
        () => (window.__uxCanvas = document.querySelector("canvas")),
      );
      for (let turn = 0; turn < 3; turn++) {
        await p.getByRole("button", { name: "现实成长", exact: true }).click();
        const origin = (await read(p)).player;
        assert.equal(
          (await read(p)).inputEnabled,
          false,
          "Panel releases Phaser keyboard ownership",
        );
        await p.getByLabel("学习主题").fill("wasd efmcijl 输入不移动");
        await p.getByLabel("学习主题").press("ArrowRight");
        assert.deepEqual(
          (await read(p)).player,
          origin,
          "Typing doesn't move character",
        );
        if (!turn) await screenshot(p, `life-entry-${width}x${height}`);
        await p.keyboard.press("Escape");
        await p.waitForTimeout(100);
        assert.equal((await read(p)).inputEnabled, true);
        assert.equal(
          await p.evaluate(
            () => document.querySelector("canvas") === window.__uxCanvas,
          ),
          true,
        );
        assert.equal((await read(p)).keyboardListeners, 1);
        assert.equal((await read(p)).canvasCount, 1);
      }
      if (touch) {
        const from = (await read(p)).player;
        const right = await p
          .getByRole("button", { name: "向右移动" })
          .boundingBox();
        await p.mouse.move(
          right.x + right.width / 2,
          right.y + right.height / 2,
        );
        await p.mouse.down();
        await p.waitForTimeout(220);
        await p.mouse.up();
        assert.ok((await read(p)).player.x > from.x + 12, "Touch moves");
      }
      const current = await read(p);
      assert.ok(
        current.camera.playerPixels >= 64,
        "Character at least 64 CSS px",
      );
      assert.ok(
        current.camera.viewX >= -1 && current.camera.viewY >= -1,
        "No negative world view",
      );
      assert.ok(
        current.camera.viewX + current.camera.width <= 1921 &&
          current.camera.viewY + current.camera.height <= 1281,
        "Camera bounded by map",
      );
      reports.push({
        width,
        height,
        touch,
        zoom: current.camera.zoom,
        playerPixels: current.camera.playerPixels,
        passed: true,
      });
    } finally {
      await c.request.delete(`${base}/api/session`);
      await c.close();
    }
  }
  assert.deepEqual(errors, []);
  await fs.writeFile(
    new URL("visual-result.json", output),
    JSON.stringify({ passed: true, reports, errors }, null, 2),
  );
  console.log(
    "PASS five viewports: full canvas, sharp zoom, HUD bounds, four directions, panel movement lock, NPC facing, dialogue, preferences, fullscreen, save restore, clean console",
  );
} finally {
  await browser.close();
}
