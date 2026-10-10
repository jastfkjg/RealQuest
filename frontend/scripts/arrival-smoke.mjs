import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const base = process.env.REALQUEST_URL || "http://127.0.0.1:5187";
const out = new URL("../../output/arrival-reference/", import.meta.url);
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const checks = [],
  errors = [];
const read = async (page) =>
  (await (await page.request.get(base + "/api/state")).json()).state;
const game = (page) =>
  page.evaluate(() => JSON.parse(window.render_game_to_text()));
const watch = (page) => {
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !/503|ERR_FAILED/.test(m.text()))
      errors.push(m.text());
  });
};
const snap = (page, name) =>
  page.screenshot({ path: new URL(`${name}.png`, out).pathname });
try {
  // Each guest has a new browser context against a separate test database.
  for (let id = 0; id < 6; id++) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      reducedMotion: "reduce",
    });
    try {
      const page = await context.newPage();
      watch(page);
      await page.goto(base);
      const input = page.getByLabel("你的名字");
      await input.waitFor();
      const before = await read(page);
      assert.equal(before.character, null);
      assert.equal(await page.locator(".welcome-portrait").count(), 6);
      await page
        .getByRole("button", { name: `外观 ${id + 1}`, exact: true })
        .click();
      assert.equal(
        await page.locator(".welcome-traveler").getAttribute("data-appearance"),
        String(id),
      );
      await input.fill(`林间旅人${id}`);
      await page.locator("#start-btn").click();
      await page.waitForSelector("canvas");
      await page.waitForFunction(() =>
        JSON.parse(window.render_game_to_text()).playerTexture?.startsWith(
          "villager-",
        ),
      );
      const after = await read(page);
      assert.deepEqual(after.character, {
        name: `林间旅人${id}`,
        appearance: id,
      });
      for (const key of ["inventory", "attributes", "xp", "energy"])
        assert.deepEqual(after[key], before[key]);
      assert.equal((await game(page)).playerTexture, `villager-${id}`);
      await page.reload();
      await page.waitForSelector("canvas");
      assert.equal((await read(page)).character.appearance, id);
      assert.equal(await page.locator(".arrival-welcome").count(), 0);
      await page.getByRole("button", { name: "角色", exact: true }).click();
      assert.match(
        await page
          .locator(
            ".hc-portrait .pixel-person, .hc-identity .pixel-person, .hc-dossier .pixel-person",
          )
          .first()
          .getAttribute("style"),
        new RegExp(`character-${id}.png`),
      );
      await page.keyboard.press("Escape");
      for (const [key, direction] of [
        ["ArrowRight", 2],
        ["ArrowDown", 0],
        ["ArrowLeft", 1],
        ["ArrowUp", 3],
      ]) {
        await page.keyboard.down(key);
        await page.waitForTimeout(160);
        await page.keyboard.up(key);
        assert.equal((await game(page)).direction, direction);
        assert.equal((await game(page)).playerTexture, `villager-${id}`);
      }
      if (id >= 3) await snap(page, `world-appearance-${id}`);
    } finally {
      await context.close();
    }
  }
  checks.push(
    "six appearance IDs: selected preview, real creation, unchanged starter balances, reload, dossier and four walking directions",
  );

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
    recordVideo: {
      dir: new URL("video/", out).pathname,
      size: { width: 1440, height: 900 },
    },
  });
  try {
    const page = await context.newPage();
    watch(page);
    await page.goto(base);
    await page.getByLabel("你的名字").waitFor();
    const input = page.getByLabel("你的名字"),
      start = page.locator("#start-btn");
    let calls = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/command")) calls++;
    });
    await input.fill("   ");
    assert.equal(await start.isDisabled(), true);
    await input.fill("春天的旅人");
    await input.focus();
    await input.dispatchEvent("compositionstart");
    await page.keyboard.press("Enter");
    assert.equal(calls, 0);
    assert.equal((await read(page)).character, null);
    await input.dispatchEvent("compositionend");
    await input.press("Tab");
    assert.equal(
      await page
        .getByRole("button", { name: "外观 1", exact: true })
        .evaluate((el) => el === document.activeElement),
      true,
    );
    await page.keyboard.press("Space");
    await page.getByRole("button", { name: "外观 6", exact: true }).focus();
    await page.keyboard.press("Space");
    assert.equal(
      await page
        .getByRole("button", { name: "外观 6", exact: true })
        .getAttribute("aria-pressed"),
      "true",
    );
    await page.keyboard.press("Tab");
    assert.equal(
      await start.evaluate((el) => el === document.activeElement),
      true,
    );
    await snap(page, "arrival-keyboard-focus");
    let reject = true;
    await page.route("**/api/command", async (route) => {
      if (reject) {
        reject = false;
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ detail: "连接失败，请稍后重试" }),
        });
      } else {
        await new Promise((r) => setTimeout(r, 650));
        await route.continue();
      }
    });
    await start.click();
    await page.getByRole("alert").waitFor();
    assert.equal(await input.inputValue(), "春天的旅人");
    assert.equal((await read(page)).character, null);
    await snap(page, "arrival-rejected");
    await start.click();
    assert.equal(await start.isDisabled(), true);
    assert.equal(await input.isDisabled(), true);
    assert.equal(
      await page
        .getByRole("button", { name: "外观 1", exact: true })
        .isDisabled(),
      true,
    );
    await page.locator(".welcome-register").dispatchEvent("submit");
    await snap(page, "arrival-pending");
    await page.waitForSelector("canvas");
    assert.equal(calls, 2);
    assert.equal((await read(page)).character.appearance, 5);
    checks.push(
      "blank-name guard, keyboard order/Space/focus, IME Enter, retained fields after failure, pending controls and duplicate-submit guard, retry succeeds",
    );
  } finally {
    await context.close();
  }

  const retryContext = await browser.newContext();
  try {
    const page = await retryContext.newPage();
    watch(page);
    await page.goto(base);
    await page.getByLabel("你的名字").waitFor();
    const ids = [];
    await page.route("**/api/command", async (route) => {
      ids.push(route.request().postDataJSON().request_id);
      if (ids.length === 1) {
        await route.fetch();
        await route.abort("failed");
      } else await route.continue();
    });
    await page.locator("#start-btn").click();
    await page.waitForSelector("canvas");
    assert.equal(ids.length, 2);
    assert.equal(ids[0], ids[1]);
    assert.equal((await read(page)).inventory.gold, 20);
    checks.push(
      "lost create response retried with same request ID and no duplicate grant",
    );
  } finally {
    await retryContext.close();
  }

  const phone = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
    reducedMotion: "reduce",
  });
  try {
    const page = await phone.newPage();
    watch(page);
    await page.goto(base);
    await page.getByLabel("你的名字").waitFor();
    await page.getByRole("button", { name: "外观 5", exact: true }).tap();
    assert.equal(
      await page
        .getByRole("button", { name: "外观 5", exact: true })
        .getAttribute("aria-pressed"),
      "true",
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    const bounds = await page.locator("#start-btn").boundingBox();
    assert.ok(bounds.y + bounds.height < 844);
    const undersized = await page
      .locator(".arrival-welcome button, .arrival-welcome input")
      .evaluateAll((es) =>
        es
          .filter((el) => el.offsetWidth < 44 || el.offsetHeight < 44)
          .map((el) => el.textContent),
      );
    assert.deepEqual(undersized, []);
    assert.equal(
      await page
        .locator(".welcome-register")
        .evaluate((el) => getComputedStyle(el).animationName),
      "none",
    );
    await snap(page, "arrival-390-touch");
    await page.locator("#start-btn").tap();
    await page.waitForSelector("canvas");
    assert.equal((await read(page)).character.appearance, 4);
    checks.push(
      "390×844 DPR2 touch: six 44px choices, no overflow, CTA above fold, reduced motion and real create",
    );
  } finally {
    await phone.close();
  }

  const preview = await browser.newContext();
  try {
    const page = await preview.newPage();
    let apiCalls = 0;
    page.on("request", (req) => {
      if (req.url().includes("/api/")) apiCalls++;
    });
    await page.goto(base + "/dev/welcome");
    await page.getByLabel("你的名字").fill("预览");
    await page.getByRole("button", { name: "外观 4", exact: true }).click();
    await page.locator("#start-btn").click();
    assert.equal(apiCalls, 0);
    assert.deepEqual(await preview.cookies(), []);
    checks.push(
      "development preview explicitly labeled, no API calls or cookies",
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
