// Regression of existing inventory actions, not the deferred Pass B targeting flow.
import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const base = process.env.REALQUEST_URL || "http://127.0.0.1:5187";
const out = new URL("../../output/inventory-satchel/", import.meta.url);
const browser = await chromium.launch({ headless: true });
const read = (p) => p.evaluate(() => JSON.parse(window.render_game_to_text()));
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
    (s) => Math.hypot(s.player.x - x, s.player.y - y) < 16 && !s.walking.length,
  );
  await p.waitForTimeout(250);
}
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  try {
    const p = await context.newPage();
    const errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(base);
    await p.click("#start-btn");
    await p.waitForSelector("canvas");
    await p.waitForTimeout(600);
    await go(p, 280, 360);
    await go(p, 232, 400);
    await p.keyboard.press("i");
    await until(p, (s) => s.mode === "inventory");
    const initial = await read(p);
    assert.equal(initial.inventory.seed, 6);
    let phase = "reject";
    const requests = [];
    await p.route("**/api/command", async (route) => {
      const body = route.request().postDataJSON();
      if (body.action !== "plant") return route.continue();
      requests.push(body);
      if (phase === "reject") {
        await new Promise((resolve) => setTimeout(resolve, 400));
        return route.fulfill({
          status: 422,
          contentType: "application/json",
          body: JSON.stringify({
            detail: "农田暂不可用，请重试（隔离测试注入）",
          }),
        });
      }
      if (phase === "lose-response") {
        phase = "retry";
        const response = await route.fetch();
        assert.equal(response.status(), 200);
        await new Promise((resolve) => setTimeout(resolve, 600));
        // Server has committed; losing the response must retry the SAME request ID.
        return route.abort("failed");
      }
      return route.continue();
    });
    await p.getByRole("button", { name: "种下一颗种子" }).click();
    await p.getByRole("alert").waitFor();
    assert.equal((await read(p)).inventory.seed, 6);
    assert.deepEqual((await read(p)).plots, {});
    await p.screenshot({ path: new URL("real-rejected.png", out).pathname });
    phase = "lose-response";
    await p.getByRole("button", { name: "种下一颗种子" }).click();
    assert.equal(await p.locator(".hw-item-action").isDisabled(), true);
    // DOM activation while pending cannot submit another action.
    await p.locator(".hw-item-action").evaluate((button) => button.click());
    await p.screenshot({ path: new URL("real-pending.png", out).pathname });
    await until(
      p,
      (s) => s.inventory.seed === 5 && Object.keys(s.plots).length === 1,
    );
    assert.equal(requests.length, 3);
    assert.equal(requests[1].request_id, requests[2].request_id);
    const committed = await read(p);
    await p.screenshot({ path: new URL("real-planted.png", out).pathname });
    await p.keyboard.press("Escape");
    await p.keyboard.press("l");
    await until(p, (s) => s.mode === "activity");
    await p.keyboard.press("Escape");
    await p.keyboard.press("i");
    await until(p, (s) => s.mode === "inventory");
    assert.equal((await read(p)).inventory.seed, 5);
    await p.reload();
    await p.waitForSelector("canvas");
    await p.waitForTimeout(400);
    assert.equal((await read(p)).inventory.seed, 5);
    assert.deepEqual((await read(p)).plots, committed.plots);
    assert.equal((await read(p)).canvasCount, 1);
    assert.deepEqual(errors, []);
    await fs.writeFile(
      new URL("mutations-result.json", out),
      JSON.stringify(
        {
          passed: true,
          requests: requests.map((r) => ({
            action: r.action,
            request_id: r.request_id,
          })),
          seedBefore: 6,
          seedAfter: 5,
          plots: committed.plots,
          errors,
          coverage: [
            "injected 422 retains inventory/plot",
            "pending disables repeated activation",
            "committed response loss retries with same ID",
            "one seed and one plot",
            "Life panel return and reload preserve committed state",
          ],
        },
        null,
        2,
      ),
    );
    console.log(
      "PASS existing inventory action: rejection, pending, idempotent network retry, mode switch and reload",
    );
  } finally {
    await context.close();
  }
} finally {
  await browser.close();
}
