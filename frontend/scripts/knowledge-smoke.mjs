import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const base = process.env.REALQUEST_URL || "http://127.0.0.1:5203";
const out = new URL("../../output/knowledge-growth/", import.meta.url);
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const contexts = [],
  shots = [],
  errors = [],
  contrasts = [];
let expectedNetworkFailure = false;
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
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => {
    if (
      m.type() === "error" &&
      !(
        expectedNetworkFailure &&
        /Failed to load resource|net::ERR|422/.test(m.text())
      )
    )
      errors.push(m.text());
  });
  await p.goto(base);
  await p.getByLabel("你的名字").fill("寻知试行旅人");
  await p.click("#start-btn");
  await p.waitForSelector("canvas");
  return { p, c };
}
async function read(p) {
  await p.waitForFunction(
    () => typeof window.render_game_to_text === "function",
  );
  return p.evaluate(() => JSON.parse(window.render_game_to_text()));
}
async function until(p, check) {
  for (let i = 0; i < 100; i++) {
    const s = await read(p);
    if (check(s)) return s;
    await p.waitForTimeout(100);
  }
  throw Error("State timeout: " + JSON.stringify(await read(p)));
}
async function command(c, action, data = {}) {
  const r = await c.request.post(base + "/api/command", {
    data: { request_id: crypto.randomUUID(), action, data },
  });
  assert.equal(r.status(), 200, await r.text());
  return (await r.json()).state;
}
async function openStudy(p) {
  await p.getByRole("button", { name: "现实成长", exact: true }).click();
  await p.getByRole("button", { name: "今日研习", exact: true }).click();
}
async function chapter(p, name) {
  await p
    .getByRole("navigation", { name: "研习手札章节" })
    .getByRole("button", { name, exact: true })
    .click();
}
async function shot(p, name, contrast = false) {
  await p.waitForTimeout(250);
  const layout = await p.locator(".study-page").evaluate((el) => ({
    overflow: el.scrollWidth > el.clientWidth + 1,
    small: [...el.querySelectorAll("button,input,summary")]
      .filter((e) => e.checkVisibility())
      .filter(
        (e) =>
          e.getBoundingClientRect().height < 43 ||
          e.getBoundingClientRect().width < 43,
      )
      .map((e) => e.textContent),
  }));
  assert.equal(layout.overflow, false, name + " horizontal overflow");
  assert.deepEqual(layout.small, [], name + " touch targets");
  await p.screenshot({ path: new URL(name + ".png", out).pathname });
  shots.push(name);
  if (!contrast) return;
  const text = await p.locator(".study-page").evaluate((root) =>
    [...root.querySelectorAll("*")]
      .filter(
        (e) =>
          e.checkVisibility() &&
          !e.closest('[aria-hidden="true"],button:disabled'),
      )
      .flatMap((el) =>
        [...el.childNodes]
          .filter((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim())
          .flatMap((n) => {
            const range = document.createRange();
            range.selectNodeContents(n);
            return [...range.getClientRects()]
              .filter(
                (r) =>
                  r.width > 1 &&
                  r.height > 1 &&
                  r.top >= 0 &&
                  r.bottom <= innerHeight &&
                  r.x >= 0 &&
                  r.right <= innerWidth,
              )
              .map((r) => ({
                text: n.textContent.trim(),
                color: getComputedStyle(el).color,
                rect: [r.x, r.y, r.width, r.height],
              }));
          }),
      ),
  );
  const hide = await p.addStyleTag({
    content:
      ".study-page *,.study-page *::before,.study-page *::after{color:transparent!important;text-shadow:none!important;}",
  });
  try {
    const folder = new URL("contrast-" + name + "/", out);
    await fs.mkdir(folder, { recursive: true });
    await p.screenshot({
      path: new URL("contrast-background.png", folder).pathname,
    });
    await fs.writeFile(
      new URL("contrast-text.json", folder),
      JSON.stringify(text, null, 2),
    );
    contrasts.push({ name, runs: text.length });
  } finally {
    await hide.evaluate((el) => el.remove());
  }
}
async function earn(c, title = "隔离测试 · 新的一页") {
  const task_id = crypto.randomUUID();
  await command(c, "study_create", { task_id, title, target_minutes: 1 });
  const s = await command(c, "activity", {
    kind: "study",
    amount: 1,
    note: title,
  });
  return command(c, "study_link", {
    task_id,
    activity_id: s.activities.at(-1).id,
  });
}
try {
  const { p, c } = await create();
  const position = (await read(p)).player;
  await openStudy(p);
  await chapter(p, "知识研修");
  assert.ok(
    await p.getByRole("button", { name: "还需要 1 知识点" }).isDisabled(),
  );
  for (const [width, height] of [
    [1440, 900],
    [1920, 1080],
    [768, 1024],
    [390, 844],
    [720, 450],
  ]) {
    await p.setViewportSize({ width, height });
    await p.locator(".study-page").evaluate((el) => el.scrollTo(0, 0));
    await shot(p, "empty-" + width, width === 1440 || width === 390);
  }
  await p.setViewportSize({ width: 1440, height: 900 });
  const paths = p.getByRole("group", { name: "研修方向", exact: true });
  await paths.getByRole("button", { name: /魔法/ }).focus();
  await p.keyboard.press("Enter");
  assert.equal(
    await paths
      .getByRole("button", { name: /魔法/ })
      .getAttribute("aria-pressed"),
    "true",
  );
  assert.deepEqual((await read(p)).knowledgeGrowth, { science: 0, magic: 0 });
  for (const key of ["i", "m", "j", "1", "ArrowRight"])
    await p.keyboard.press(key);
  assert.deepEqual((await read(p)).player, position);
  assert.equal((await read(p)).mode, "study");
  await shot(p, "empty-magic-1440", true);
  await p.getByRole("button", { name: "去完成一页研习" }).click();
  await p.getByLabel("写下你的学习主题").fill("读懂植物的生长");
  await p.getByLabel("写下你的学习主题").dispatchEvent("keydown", {
    key: "Enter",
    isComposing: true,
    bubbles: true,
  });
  assert.equal((await read(p)).studyTasks.length, 0);
  await p.getByRole("button", { name: "记下这项研习", exact: true }).click();
  await p.getByRole("button", { name: "开始研习", exact: true }).waitFor();
  await p.getByRole("button", { name: "记录其他成长" }).click();
  await p.getByLabel("活动类型").selectOption("study");
  await p.getByLabel("时长（分钟）").fill("25");
  await p.getByLabel("主题或备注").fill("读懂植物的生长");
  await p.getByRole("button", { name: "保存这次成长" }).click();
  await until(p, (s) => s.attributes.wisdom === 25);
  await p.getByRole("button", { name: "今日研习", exact: true }).click();
  await p.getByRole("button", { name: "已有学习记录？记入这一页" }).click();
  await p
    .locator(".study-link-records")
    .getByRole("button", { name: /读懂植物的生长/ })
    .click();
  await until(p, (s) => s.knowledgePoints === 1);
  assert.equal((await read(p)).xp, 25);
  for (const [width, height] of [
    [1440, 900],
    [390, 844],
  ]) {
    await p.setViewportSize({ width, height });
    await p.locator(".study-page").evaluate((el) => el.scrollTo(0, 0));
    await shot(p, "completed-" + width, true);
  }
  await p.setViewportSize({ width: 1440, height: 900 });
  await p.getByRole("button", { name: "翻开知识研修", exact: true }).click();
  await shot(p, "available-science", true);
  expectedNetworkFailure = true;
  await p.route("**/api/command", (r) => r.abort("failed"));
  await p
    .getByRole("button", { name: "投入 1 知识点 · 科学 +1", exact: true })
    .click();
  await p.getByRole("alert").waitFor();
  assert.match(await p.getByRole("alert").innerText(), /暂时连接不上/);
  assert.equal((await read(p)).knowledgePoints, 1);
  await shot(p, "failed-investment", true);
  await p.unroute("**/api/command");
  let release,
    first = true;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const requests = [];
  await p.route("**/api/command", async (r) => {
    const body = r.request().postDataJSON();
    requests.push(body);
    if (first) {
      first = false;
      await gate;
      await r.fetch();
      await r.abort("failed");
    } else await r.continue();
  });
  await p
    .getByRole("button", { name: "投入 1 知识点 · 科学 +1", exact: true })
    .click();
  await p.getByRole("button", { name: "正在刻下成长…" }).waitFor();
  assert.ok(await paths.getByRole("button", { name: /魔法/ }).isDisabled());
  await shot(p, "pending-investment");
  release();
  await p
    .getByRole("status")
    .filter({ hasText: "科学已提升至 1 级" })
    .waitFor();
  assert.equal(requests.length, 2);
  assert.equal(requests[0].request_id, requests[1].request_id);
  await p.unroute("**/api/command");
  expectedNetworkFailure = false;
  assert.equal((await read(p)).knowledgePoints, 0);
  await shot(p, "science-invested", true);
  await p.reload();
  await p.getByRole("dialog", { name: "知识研修", exact: true }).waitFor();
  assert.deepEqual((await read(p)).knowledgeGrowth, { science: 1, magic: 0 });
  await p.locator(".knowledge-sources summary").click();
  await shot(p, "sources-1440");
  await p
    .locator(".knowledge-sources")
    .getByRole("button", { name: /读懂植物的生长/ })
    .click();
  await p.getByRole("button", { name: "翻开知识研修", exact: true }).waitFor();
  assert.equal((await read(p)).knowledgePoints, 0);
  await chapter(p, "知识研修");
  await earn(c, "隔离测试 · 符文笔记");
  await p.reload();
  await paths.getByRole("button", { name: /魔法/ }).click();
  await shot(p, "available-magic", true);
  await p
    .getByRole("button", { name: "投入 1 知识点 · 魔法 +1", exact: true })
    .click();
  await p
    .getByRole("status")
    .filter({ hasText: "魔法已提升至 1 级" })
    .waitFor();
  assert.deepEqual((await read(p)).knowledgeGrowth, { science: 1, magic: 1 });
  await shot(p, "magic-invested", true);
  // A second client spends while this page's request is pending: refresh, no second debit.
  await earn(c, "隔离测试 · 同步研习");
  await p.reload();
  let releaseConflict;
  const conflictGate = new Promise((resolve) => {
    releaseConflict = resolve;
  });
  await p.route("**/api/command", async (r) => {
    await conflictGate;
    await r.continue();
  });
  await p
    .getByRole("button", { name: "投入 1 知识点 · 科学 +1", exact: true })
    .click();
  await p.getByRole("button", { name: "正在刻下成长…" }).waitFor();
  await command(c, "knowledge_spend", {
    branch: "magic",
    expected_invested: 2,
  });
  expectedNetworkFailure = true;
  releaseConflict();
  await p.getByRole("alert").waitFor();
  await until(p, (s) => s.knowledgeGrowth.magic === 2);
  assert.equal((await read(p)).knowledgeGrowth.science, 1);
  assert.equal((await read(p)).knowledgePoints, 0);
  await shot(p, "conflict-reconciled");
  await p.unroute("**/api/command");
  expectedNetworkFailure = false;
  await p.keyboard.press("Escape");
  await until(p, (s) => s.mode === "explore");
  await p.getByRole("button", { name: "查看角色成长" }).click();
  await p.getByRole("button", { name: /科学 1 · 魔法 2/ }).click();
  await p.getByRole("dialog", { name: "知识研修", exact: true }).waitFor();
  // Native tab loop stays inside the journal.
  const buttons = p.locator(".study-page button:visible:not(:disabled)");
  await buttons.last().focus();
  await p.keyboard.press("Tab");
  assert.ok(
    await buttons.first().evaluate((e) => e === document.activeElement),
  );
  for (let i = 0; i < 5; i++) {
    await earn(c, i === 4 ? "A".repeat(80) : `隔离测试 · 研修刻度 ${i + 1}`);
    await command(c, "knowledge_spend", {
      branch: "science",
      expected_invested: 3 + i,
    });
  }
  await p.reload();
  await p.getByRole("dialog", { name: "知识研修", exact: true }).waitFor();
  assert.equal((await read(p)).knowledgeGrowth.science, 6);
  await p
    .locator('.knowledge-marks[aria-label="第 6 至 10 级，当前 6 级"]')
    .waitFor();
  await shot(p, "science-level-six");
  await p.setViewportSize({ width: 390, height: 844 });
  await p.locator(".knowledge-sources summary").click();
  await p.locator(".knowledge-sources").scrollIntoViewIfNeeded();
  await shot(p, "long-source-390");
  const touch = await create({
    viewport: { width: 375, height: 812 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 2,
    reducedMotion: "reduce",
  });
  await earn(touch.c);
  await touch.p.reload();
  await touch.p.getByRole("button", { name: "现实成长", exact: true }).tap();
  await touch.p.getByRole("button", { name: "今日研习", exact: true }).tap();
  await chapter(touch.p, "知识研修");
  await touch.p
    .getByRole("group", { name: "研修方向", exact: true })
    .getByRole("button", { name: /魔法/ })
    .tap();
  await shot(touch.p, "touch-375");
  await touch.p
    .getByRole("button", { name: "投入 1 知识点 · 魔法 +1", exact: true })
    .tap();
  await until(touch.p, (s) => s.knowledgeGrowth.magic === 1);
  await touch.p.getByRole("status").scrollIntoViewIfNeeded();
  await shot(touch.p, "touch-invested-375");
  await touch.p.setViewportSize({ width: 844, height: 390 });
  await touch.p.locator(".study-page").evaluate((el) => el.scrollTo(0, 0));
  await shot(touch.p, "touch-844");
  await touch.p.locator(".study-page").evaluate((el) => {
    el.style.fontSize = "20px";
  });
  await shot(touch.p, "large-text-844");
  assert.deepEqual(errors, []);
  await fs.writeFile(
    new URL("results.json", out),
    JSON.stringify({ shots, contrasts, errors }, null, 2),
  );
  console.log(
    JSON.stringify({
      passed: true,
      captures: shots.length,
      contrasts: contrasts.length,
      errors,
    }),
  );
} finally {
  for (const c of contexts) {
    for (const p of c.pages())
      await p.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
    await c.request.delete(base + "/api/session").catch(() => {});
    await c.close();
  }
  await browser.close();
}
