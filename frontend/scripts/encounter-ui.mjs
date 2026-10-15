import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const base = process.env.REALQUEST_URL || "http://127.0.0.1:5291";
const out = new URL("../../output/encounter-ui/", import.meta.url);
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const contexts = [],
  errors = [],
  captures = [],
  checks = [];
let page;
const read = (p) => p.evaluate(() => JSON.parse(window.render_game_to_text()));
const state = async (p) =>
  (await (await p.request.get(base + "/api/state")).json()).state;
async function until(p, predicate, label) {
  for (let i = 0; i < 180; i++) {
    const s = await read(p);
    if (predicate(s)) return s;
    await p.waitForTimeout(100);
  }
  throw Error(label + ": " + JSON.stringify(await read(p)));
}
async function worldClick(p, x, y) {
  const s = await read(p);
  // Use the actual pointer hit target: nearby interaction prompts can overlap
  // their world object, and are the public touch/mouse alternative to E.
  await p.mouse.click(
    (x - s.camera.viewX) * s.camera.zoom,
    (y - s.camera.viewY) * s.camera.zoom,
  );
}
async function go(p, x, y) {
  await worldClick(p, x, y);
  await until(
    p,
    (s) => !s.walking.length && Math.hypot(s.player.x - x, s.player.y - y) < 18,
    "walk",
  );
  await p.waitForTimeout(250);
}
async function walkAxes(p, x, y) {
  for (const [axis, target, negative, positive] of [
    ["x", x, "ArrowLeft", "ArrowRight"],
    ["y", y, "ArrowUp", "ArrowDown"],
  ]) {
    for (let i = 0; i < 35; i++) {
      const distance = target - (await read(p)).player[axis];
      if (Math.abs(distance) < 7) break;
      const key = distance < 0 ? negative : positive;
      await p.keyboard.down(key);
      await p.waitForTimeout(
        Math.min(250, Math.max(45, (Math.abs(distance) / 160) * 1000)),
      );
      await p.keyboard.up(key);
    }
  }
  await p.waitForTimeout(220);
}
async function shot(p, name) {
  await p.waitForTimeout(160);
  await p.screenshot({ path: new URL(name + ".png", out).pathname });
  captures.push(name);
  if (
    [
      "board-1440",
      "board-390",
      "lia-1440",
      "lia-390",
      "lia-request-1440",
      "lia-request-390",
    ].includes(name)
  ) {
    const text = await p.locator("dialog").evaluate((root) => {
      const bounds = root.getBoundingClientRect();
      return Array.from(root.querySelectorAll("*"))
        .filter((el) => el.checkVisibility() && !el.closest("button:disabled"))
        .flatMap((el) =>
          Array.from(el.childNodes)
            .filter(
              (n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim(),
            )
            .flatMap((n) => {
              const range = document.createRange();
              range.selectNodeContents(n);
              return Array.from(range.getClientRects())
                .filter(
                  (r) =>
                    r.width > 2 &&
                    r.height > 2 &&
                    r.top >= Math.max(0, bounds.top) &&
                    r.bottom <= Math.min(innerHeight, bounds.bottom),
                )
                .filter((r) => {
                  const hit = document.elementFromPoint(
                    r.x + r.width / 2,
                    r.y + r.height / 2,
                  );
                  return hit && (hit === el || el.contains(hit));
                })
                .map((r) => ({
                  text: n.textContent.trim(),
                  color: getComputedStyle(el).color,
                  rect: [r.x, r.y, r.width, r.height],
                }));
            }),
        );
    });
    const folder = new URL("contrast-" + name + "/", out);
    await fs.mkdir(folder, { recursive: true });
    await fs.writeFile(
      new URL("contrast-text.json", folder),
      JSON.stringify(text, null, 2),
    );
    const hide = await p.addStyleTag({
      content:
        "dialog, dialog * {color:transparent!important;text-shadow:none!important;}",
    });
    await p.screenshot({
      path: new URL("contrast-background.png", folder).pathname,
    });
    await hide.evaluate((e) => e.remove());
  }
}
async function loadArt(p) {
  await p.evaluate(async () => {
    const srcs = [
      "/assets/hearthwood/encounters/notice-paper.webp",
      "/assets/hearthwood/encounters/library-stage.webp",
      "/assets/hearthwood/encounters/lia-portrait.webp",
      ...Array.from(document.images, (i) => i.src),
    ];
    await Promise.all(
      srcs.map((src) => {
        const image = new Image();
        image.src = src;
        return image.decode();
      }),
    );
  });
}
async function layout(p, name) {
  const metrics = await p.locator("dialog").evaluate((dialog) => {
    const buttons = Array.from(dialog.querySelectorAll("button")).filter(
      (e) => e.getClientRects().length,
    );
    return {
      overflow: dialog.scrollWidth > dialog.clientWidth + 2,
      pageOverflow: document.documentElement.scrollWidth > innerWidth,
      undersized: buttons
        .map((b) => ({
          text: b.innerText,
          width: b.getBoundingClientRect().width,
          height: b.getBoundingClientRect().height,
        }))
        .filter((b) => b.width < 43 || b.height < 43),
    };
  });
  assert.equal(metrics.overflow, false, name + ": dialog overflow");
  assert.equal(metrics.pageOverflow, false, name + ": page overflow");
  assert.deepEqual(metrics.undersized, [], name + ": touch target");
  await shot(p, name);
}
try {
  const c = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
    recordVideo: {
      dir: new URL("recordings/", out).pathname,
      size: { width: 1440, height: 900 },
    },
  });
  contexts.push(c);
  page = await c.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !/503/.test(m.text())) errors.push(m.text());
  });
  await page.goto(base);
  await page.getByLabel("你的名字").fill("布告栏试阅旅人");
  await page.locator("#start-btn").click();
  await page.waitForSelector("canvas");
  await page.waitForTimeout(700);
  console.log("guest started");
  await worldClick(page, 256, 272);
  await until(page, (s) => s.mode === "board", "initial board");
  await loadArt(page);
  await shot(page, "board-initial-1440");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  // Complete starter objectives through the real world, without writing fixture state.
  await worldClick(page, 160, 180);
  await until(page, (s) => s.location === "home", "enter home");
  await page.waitForTimeout(400);
  await page.keyboard.press("e");
  await until(page, (s) => s.location === "overworld", "exit home");
  await page.waitForTimeout(800);
  await go(page, 240, 320);
  await walkAxes(page, 328, 352);
  await page.keyboard.press("e");
  await until(page, (s) => s.inventory.wood === 3, "gather");
  await worldClick(page, 256, 272);
  await until(page, (s) => s.mode === "board", "open board");
  await loadArt(page);
  console.log("board opened");
  const initial = await state(page);
  assert.equal(
    initial.quest_log.find((q) => q.id === "settle_in").status,
    "ready",
  );
  await layout(page, "board-1440");
  for (const [width, height] of [
    [1920, 1080],
    [768, 1024],
    [390, 844],
    [720, 450],
  ]) {
    await page.setViewportSize({ width, height });
    await page.locator("dialog").evaluate((e) => (e.scrollTop = 0));
    await layout(page, "board-" + width);
    if (width === 390) {
      await page.getByRole("button", { name: /土地的第一份回礼/ }).click();
      await page.getByRole("heading", { name: "土地的第一份回礼" }).waitFor();
      assert.equal(
        await page.getByRole("button", { name: /接取任务|交付任务/ }).count(),
        0,
      );
      await shot(page, "board-locked-390");
      await page.getByRole("button", { name: /给新生活一个落脚点/ }).click();
      await page
        .getByRole("button", { name: "交付任务 · 领取奖励" })
        .scrollIntoViewIfNeeded();
      await shot(page, "board-action-390");
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  const claim = page.getByRole("button", {
    name: "交付任务 · 领取奖励",
    exact: true,
  });
  let reject = true,
    release,
    calls = 0;
  await page.route("**/api/command", async (route) => {
    if (route.request().postDataJSON().action !== "quest_claim")
      return route.continue();
    calls++;
    if (reject) {
      reject = false;
      return route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ detail: "测试：交付未成功，请重试" }),
      });
    }
    await new Promise((resolve) => (release = resolve));
    await route.continue();
  });
  await claim.click();
  await page.getByRole("alert").waitFor();
  assert.deepEqual((await state(page)).inventory, initial.inventory);
  await shot(page, "board-rejected");
  await claim.click();
  await until(page, () => !!release, "pending gate");
  assert.equal(
    await page.getByRole("button", { name: "处理中…" }).isDisabled(),
    true,
  );
  await page
    .getByRole("button", { name: "处理中…" })
    .evaluate((e) => e.click());
  assert.equal(calls, 2);
  await shot(page, "board-pending");
  release();
  await until(
    page,
    (s) => s.inventory.gold === initial.inventory.gold + 12,
    "claim",
  );
  await page.unroute("**/api/command");
  const claimed = await state(page);
  assert.equal(claimed.inventory.seed, initial.inventory.seed + 3);
  assert.equal(claimed.xp, initial.xp + 10);
  await shot(page, "board-claimed");
  await page.keyboard.press("Escape");
  await page.reload();
  await page.waitForSelector("canvas");
  await page.waitForTimeout(650);
  assert.equal((await state(page)).inventory.gold, initial.inventory.gold + 12);
  checks.push(
    "real starter objectives, selection, locked status, rejected claim, pending duplicate guard, retry, exact rewards and reload",
  );

  // Walk across the bridge and talk to the actual moving Lia actor.
  await walkAxes(page, 400, 344);
  await walkAxes(page, 560, 344);
  await walkAxes(page, 600, 300);
  await page.keyboard.press("e");
  await until(page, (s) => s.mode === "npc", "Lia conversation");
  await page.locator(".library-encounter").waitFor();
  await loadArt(page);
  await layout(page, "lia-1440");
  console.log("Lia opened");
  const beforeView = await state(page);
  for (const [width, height] of [
    [1920, 1080],
    [768, 1024],
    [390, 844],
    [720, 450],
  ]) {
    await page.setViewportSize({ width, height });
    await page.locator("dialog").evaluate((e) => (e.scrollTop = 0));
    await layout(page, "lia-" + width);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  const reply = page.getByRole("button", { name: "继续 · 聊聊这份委托" });
  await reply.click();
  await page.getByRole("region", { name: "委托详情" }).waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "接受委托", exact: true })
      .evaluate((e) => e === document.activeElement),
    true,
  );
  await shot(page, "lia-request-1440");
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("dialog").isVisible(), true);
  assert.equal(await reply.evaluate((e) => e === document.activeElement), true);
  assert.deepEqual((await state(page)).inventory, beforeView.inventory);
  await reply.click();
  await page.getByRole("button", { name: "接受委托", exact: true }).click();
  await until(
    page,
    (s) => s.quests.find((q) => q.id === "rune_research").status === "active",
    "accept Lia request",
  );
  assert.deepEqual((await state(page)).inventory, beforeView.inventory);
  for (const [width, height] of [
    [1440, 900],
    [390, 844],
    [720, 450],
  ]) {
    await page.setViewportSize({ width, height });
    await page
      .getByRole("button", { name: "收起委托" })
      .scrollIntoViewIfNeeded();
    await layout(page, "lia-request-" + width);
  }
  await page.getByRole("button", { name: "收起委托" }).click();
  await page.getByRole("button", { name: "暂时离开" }).click();
  await until(page, (s) => s.mode === "explore", "farewell");
  await page.reload();
  await page.waitForSelector("canvas");
  assert.equal(
    (await state(page)).quest_log.find((q) => q.id === "rune_research").status,
    "active",
  );
  checks.push(
    "actual Lia approach, truthful portrait/player identity, request reveal/focus, Escape collapse/focus return, acceptance and persistence without reward",
  );
  const touch = await browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    reducedMotion: "no-preference",
    storageState: await c.storageState(),
  });
  contexts.push(touch);
  const tp = await touch.newPage();
  tp.on("pageerror", (e) => errors.push(e.message));
  await tp.goto(base);
  await tp.waitForSelector("canvas");
  await tp.waitForTimeout(250);
  await tp.keyboard.press("e");
  await tp.locator(".library-encounter").waitFor();
  const touchReply = tp.getByRole("button", { name: "继续 · 聊聊这份委托" });
  await tp.getByRole("button", { name: "显示完整对话" }).waitFor();
  await touchReply.tap();
  assert.equal(await tp.getByRole("region", { name: "委托详情" }).count(), 0);
  await touchReply.tap();
  await tp.getByRole("region", { name: "委托详情" }).waitFor();
  await tp.getByRole("button", { name: "收起委托" }).tap();
  await loadArt(tp);
  await tp.locator("dialog").evaluate((e) => (e.scrollTop = 0));
  await layout(tp, "lia-touch-375-dpr2");
  await tp.getByRole("button", { name: "关闭面板" }).focus();
  await tp.keyboard.press("Shift+Tab");
  assert.equal(
    await tp
      .getByRole("button", { name: "暂时离开" })
      .evaluate((e) => e === document.activeElement),
    true,
  );
  await tp.keyboard.press("Tab");
  assert.equal(
    await tp
      .getByRole("button", { name: "关闭面板" })
      .evaluate((e) => e === document.activeElement),
    true,
  );
  await tp.locator("dialog").evaluate((root) => {
    const elements = Array.from(root.querySelectorAll("*")).filter((el) =>
      Array.from(el.childNodes).some(
        (n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim(),
      ),
    );
    const sizes = elements.map(
      (el) => parseFloat(getComputedStyle(el).fontSize) * 1.25,
    );
    elements.forEach((el, i) => (el.style.fontSize = sizes[i] + "px"));
    root.scrollTop = 0;
  });
  await layout(tp, "lia-large-text-375");
  await tp.getByRole("button", { name: "暂时离开" }).tap();
  await until(tp, (s) => s.mode === "explore", "touch farewell");
  await tp.keyboard.press("ArrowLeft");
  assert.equal((await read(tp)).canvasCount, 1);
  checks.push(
    "DPR2 touch replies/farewell, normal typewriter first-continue reveal, focus wrap, 125% text reflow, reduced-motion desktop and one retained game canvas",
  );
  assert.deepEqual(errors, []);
} catch (error) {
  if (page && !page.isClosed()) await shot(page, "failure").catch(() => {});
  if (page && !page.isClosed())
    await fs.writeFile(
      new URL("failure-state.json", out),
      JSON.stringify(await read(page).catch(() => ({})), null, 2),
    );
  throw error;
} finally {
  await Promise.all(contexts.map((c) => c.close()));
  await browser.close();
  await fs.writeFile(
    new URL("result.json", out),
    JSON.stringify({ checks, captures, errors }, null, 2),
  );
}
console.log(JSON.stringify({ checks, captures: captures.length, errors }));
