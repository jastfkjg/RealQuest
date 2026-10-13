import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const base = process.env.REALQUEST_URL || "http://127.0.0.1:5189";
const out = new URL("../../output/archetypes/after/", import.meta.url);
const browser = await chromium.launch();
const errors = [],
  api = [];
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  try {
    const p = await context.newPage();
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("request", (r) => {
      if (r.url().includes("/api/")) api.push(r.url());
    });
    await p.goto(base + "/dev/dialogs?panel=map");
    const grove = p.getByRole("button", { name: /^选择微光林地/ });
    assert.match(await grove.getAttribute("aria-label"), /尚未探索/);
    await grove.click();
    assert.equal(await grove.getAttribute("aria-pressed"), "true");
    assert.equal(await p.getByRole("dialog").count(), 1);
    assert.equal(
      await p
        .getByRole("region", { name: "所选目的地" })
        .getByRole("heading", { name: "微光林地" })
        .count(),
      1,
    );
    await p.screenshot({
      path: new URL("map-selected-1440.png", out).pathname,
    });
    await p.getByRole("button", { name: "放大地图" }).click();
    assert.equal(
      await p.getByRole("button", { name: "放大地图" }).isDisabled(),
      true,
    );
    await p.getByRole("button", { name: "缩小地图" }).click();
    await p.evaluate(async () => {
      const loaded = performance.getEntriesByType("resource").find(r=>new URL(r.name).pathname==="/src/stores/game.ts");
      if(!loaded) throw Error("Rendered store module was not loaded");
      const { useGame } = await import(loaded.name);
      const s = useGame.getState().state;
      useGame.setState({
        state: {
          ...s,
          events: ["discovered_grove", "visited_home", "rune_awakened"],
        },
      });
    });
    await p.getByRole("button", { name: /^选择微光林地，已探索/ }).waitFor();
    assert.match(await grove.getAttribute("aria-label"), /已探索/);
    assert.equal(await grove.getAttribute("data-unknown"), "false");
    assert.match(
      await p
        .getByRole("button", { name: /^选择林间小屋/ })
        .getAttribute("aria-label"),
      /已到访/,
    );
    assert.match(
      await p
        .getByRole("button", { name: /^选择沉睡的符文/ })
        .getAttribute("aria-label"),
      /已解读/,
    );
    await p.goto(base + "/dev/dialogs?panel=board");
    await p.getByRole("button", { name: /土地的第一份回礼/ }).click();
    assert.equal(
      await p
        .getByRole("article", { name: "选中的委托" })
        .getByRole("heading", { name: "土地的第一份回礼" })
        .count(),
      1,
    );
    assert.equal(
      await p.getByRole("button", { name: "接取任务", exact: true }).count(),
      0,
    );
    await p.goto(base + "/dev/dialogs?panel=npc");
    assert.equal(await p.getByRole("button", { name: "接受委托" }).count(), 0);
    await p.getByRole("button", { name: "继续 · 聊聊这份委托" }).click();
    await p.waitForFunction(() =>
      document.activeElement?.textContent?.includes("接受委托"),
    );
    assert.equal(
      await p
        .getByRole("button", { name: "接受委托" })
        .evaluate((e) => e === document.activeElement),
      true,
    );
    await p.screenshot({ path: new URL("npc-request-1440.png", out).pathname });
    await p.getByRole("button", { name: "接受委托" }).click();
    await p.getByRole("status").waitFor();
    await p.getByRole("button", { name: "暂时离开" }).click();
    assert.equal(await p.getByRole("dialog").count(), 0);
    assert.deepEqual(api, []);
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
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
    await p.goto(base + "/dev/dialogs?panel=map");
    await p.getByRole("button", { name: /^选择风铃湖/ }).tap();
    assert.equal(
      await p
        .getByRole("button", { name: /^选择风铃湖/ })
        .getAttribute("aria-pressed"),
      "true",
    );
    await p.getByRole("button", { name: "标记方向并返回" }).tap();
    await p.getByRole("status").waitFor();
    await p.screenshot({
      path: new URL("map-touch-selected.png", out).pathname,
    });
  } finally {
    await touch.close();
  }
  console.log(
    "PASS landmark selection/zoom/discovery, locked notice, dialogue focus/accept/leave, DPR2 touch map; fixture has no API writes",
  );
} finally {
  await browser.close();
}
