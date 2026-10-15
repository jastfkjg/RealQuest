import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const base = process.env.REALQUEST_URL || "http://127.0.0.1:5391";
const out = new URL("../../output/world-map/review/", import.meta.url);
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch();
const errors = [];
const captures = [];
try {
  for (const [width, height] of [
    [1440, 900],
    [1920, 1080],
    [390, 844],
    [768, 1024],
    [720, 450],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      reducedMotion: "reduce",
      hasTouch: width === 390,
      isMobile: width === 390,
      deviceScaleFactor: width === 390 ? 2 : 1,
    });
    try {
      const page = await context.newPage();
      const requests = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      page.on("request", (request) => {
        if (request.url().includes("/api/")) requests.push(request.url());
      });
      await page.goto(`${base}/dev/dialogs?panel=map`);
      const dialog = page.getByRole("dialog");
      await dialog.waitFor();
      await page.locator(".ha-terrain").evaluate(async (image) => {
        await image.decode();
        assertImage(image);
        function assertImage(element) {
          if (!element.naturalWidth || !element.naturalHeight)
            throw Error("Map terrain failed to decode");
        }
      });
      const heroClipped = await page
        .locator(".ha-destination-hero")
        .evaluate((hero) => {
          const image = hero.querySelector("img");
          if (!image) return false;
          const bounds = hero.getBoundingClientRect();
          const art = image.getBoundingClientRect();
          return art.height > bounds.height + 1 || art.width > bounds.width + 1;
        });
      assert.equal(heroClipped, false, `Destination art clipped at ${width}`);
      assert.equal(
        await page
          .getByRole("region", { name: "所选目的地" })
          .getByRole("heading", { name: "回响图书馆" })
          .count(),
        1,
      );
      assert.equal(
        await page
          .getByRole("button", { name: /^选择回响图书馆/ })
          .getAttribute("aria-pressed"),
        "true",
      );
      await page.screenshot({
        path: new URL(`map-${width}.png`, out).pathname,
      });
      captures.push(`map-${width}.png`);

      const size = await page.evaluate(() => ({
        bodyOverflow: document.documentElement.scrollWidth > innerWidth + 1,
        dialogOverflow:
          document.querySelector("dialog").scrollWidth >
          document.querySelector("dialog").clientWidth + 1,
        mapWidth: document.querySelector(".ha-map-world").clientWidth,
      }));
      assert.equal(size.bodyOverflow, false, `body overflow at ${width}`);
      assert.equal(size.dialogOverflow, false, `dialog overflow at ${width}`);
      assert.ok(size.mapWidth >= 960 || width > 950);
      assert.deepEqual(requests, [], "Fixture must not read or mutate the API");
      const small = await page
        .locator("dialog button, dialog summary")
        .evaluateAll((items) =>
          items
            .filter((item) => item.checkVisibility())
            .map((item) => {
              const rect = item.getBoundingClientRect();
              return {
                text: item.textContent?.trim(),
                width: rect.width,
                height: rect.height,
              };
            })
            .filter((item) => item.width < 43.9 || item.height < 43.9),
        );
      assert.deepEqual(small, [], `undersized controls at ${width}`);

      await page.getByRole("button", { name: "放大地图" }).click();
      assert.equal(
        await page.getByRole("button", { name: "放大地图" }).isDisabled(),
        true,
      );
      if (width === 1440) {
        const viewport = page.locator(".ha-map-viewport");
        const before = await viewport.evaluate((el) => el.scrollLeft);
        const box = await viewport.boundingBox();
        await page.mouse.move(
          box.x + box.width * 0.6,
          box.y + box.height * 0.68,
        );
        await page.mouse.down();
        await page.mouse.move(
          box.x + box.width * 0.42,
          box.y + box.height * 0.68,
          { steps: 6 },
        );
        await page.mouse.up();
        const after = await viewport.evaluate((el) => el.scrollLeft);
        assert.ok(after > before, "Mouse drag pans the zoomed map");
      }
      await page.getByRole("button", { name: "缩小地图" }).click();
      if (width === 1440) {
        await page.locator(".ha-map-viewport").hover();
        await page.mouse.wheel(0, -220);
        await page.waitForTimeout(70);
        assert.equal(
          await page.getByRole("button", { name: "放大地图" }).isDisabled(),
          true,
        );
        await page.mouse.wheel(0, 220);
        await page.waitForTimeout(70);
      }
      await page.getByRole("button", { name: "定位自己" }).click();
      await page.getByText("地点索引", { exact: false }).first().click();
      await page
        .getByRole("navigation", { name: "地图目的地" })
        .getByRole("button", { name: /微光林地/ })
        .click();
      assert.equal(
        await page
          .getByRole("region", { name: "所选目的地" })
          .getByRole("heading", { name: "微光林地" })
          .count(),
        1,
      );
      if (width === 1440 || width === 390) {
        await page.screenshot({
          path: new URL(`map-selected-${width}.png`, out).pathname,
        });
        captures.push(`map-selected-${width}.png`);
      }
      assert.match(
        await page
          .getByRole("button", { name: /^选择微光林地/ })
          .getAttribute("aria-label"),
        /尚未探索/,
      );
      await page.evaluate(async () => {
        const loaded = performance
          .getEntriesByType("resource")
          .find(
            (entry) => new URL(entry.name).pathname === "/src/stores/game.ts",
          );
        if (!loaded) throw Error("Game store module not loaded");
        const { useGame } = await import(loaded.name);
        const s = useGame.getState().state;
        useGame.setState({
          state: { ...s, events: [...s.events, "discovered_grove"] },
        });
      });
      assert.match(
        await page
          .getByRole("button", { name: /^选择微光林地/ })
          .getAttribute("aria-label"),
        /已探索/,
      );
      assert.equal(
        await page
          .getByRole("button", { name: /^选择微光林地/ })
          .getAttribute("data-unknown"),
        "false",
      );
      if (width === 390) {
        await dialog.evaluate((element) =>
          element.scrollTo({ top: element.scrollHeight }),
        );
        await page.screenshot({
          path: new URL("map-details-390.png", out).pathname,
        });
        captures.push("map-details-390.png");
      }
      await page.getByRole("button", { name: "标记方向并返回" }).click();
      assert.equal(
        await page.getByRole("dialog").count(),
        1,
        "Development fixture reports navigation without leaving the dialog",
      );
      assert.ok(
        (await page.getByRole("status").allTextContents())
          .join(" ")
          .includes("不会传送"),
      );
      await page.evaluate(async () => {
        const loaded = performance
          .getEntriesByType("resource")
          .find(
            (entry) => new URL(entry.name).pathname === "/src/stores/game.ts",
          );
        const { useGame } = await import(loaded.name);
        useGame.setState({
          navigate: (target) =>
            useGame.setState({ navigation: target, panel: null }),
        });
      });
      const positionBefore = await page.evaluate(async () => {
        const loaded = performance
          .getEntriesByType("resource")
          .find(
            (entry) => new URL(entry.name).pathname === "/src/stores/game.ts",
          );
        const { useGame } = await import(loaded.name);
        return useGame.getState().state.position;
      });
      await page.getByRole("button", { name: "标记方向并返回" }).click();
      const result = await page.evaluate(async () => {
        const loaded = performance
          .getEntriesByType("resource")
          .find(
            (entry) => new URL(entry.name).pathname === "/src/stores/game.ts",
          );
        const { useGame } = await import(loaded.name);
        const s = useGame.getState();
        return {
          navigation: s.navigation,
          position: s.state.position,
          panel: s.panel,
        };
      });
      assert.equal(result.navigation.targetId, "grove");
      assert.deepEqual(
        result.position,
        positionBefore,
        "Marking direction does not teleport",
      );
      assert.equal(result.panel, null);
      await page.evaluate(async () => {
        const loaded = performance
          .getEntriesByType("resource")
          .find(
            (entry) => new URL(entry.name).pathname === "/src/stores/game.ts",
          );
        const { useGame } = await import(loaded.name);
        useGame.getState().open("map");
      });
      await page.keyboard.press("Escape");
      assert.equal(
        await page.getByRole("dialog").count(),
        0,
        "Escape closes the map",
      );
    } finally {
      await context.close();
    }
  }
  assert.deepEqual(errors, []);
  await fs.writeFile(
    new URL("results.json", out),
    JSON.stringify({ captures, errors }, null, 2),
  );
  console.log(
    `PASS world map: ${captures.length} captures across five viewports; selection/zoom/recenter/discovery/marker; no browser errors`,
  );
} finally {
  await browser.close();
}
