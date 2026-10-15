import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
const base = process.env.REALQUEST_URL || "http://127.0.0.1:5205";
const output = new URL(
  process.env.REALQUEST_TEST_OUTPUT || "../../output/life-commissions/",
  import.meta.url,
);
const db = process.env.REALQUEST_TEST_DB;
assert(
  db?.includes("/output/life-commissions/"),
  "Only the dedicated test database may be changed",
);
const python = new URL("../../backend/.venv/bin/python", import.meta.url)
  .pathname;
const imagePython = process.env.REALQUEST_IMAGE_PYTHON;
const textureContrasts = [];
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [],
  shots = [],
  contrasts = [];
let expectedFailure = false;
const c = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: {
    dir: new URL("recordings/", output).pathname,
    size: { width: 1440, height: 900 },
  },
});
const p = await c.newPage();
p.on("pageerror", (e) => errors.push(e.message));
p.on("console", (m) => {
  if (m.type() === "error" && !expectedFailure) errors.push(m.text());
});
const read = () => p.evaluate(() => JSON.parse(window.render_game_to_text()));
const state = async () =>
  (await (await c.request.get(base + "/api/state")).json()).state;
async function wait(check) {
  for (let i = 0; i < 100; i++) {
    const s = await read();
    if (check(s)) return s;
    await p.waitForTimeout(100);
  }
  throw Error("Timed out: " + JSON.stringify(await read()));
}
async function command(action, data = {}) {
  const r = await c.request.post(base + "/api/command", {
    data: { request_id: crypto.randomUUID(), action, data },
  });
  assert.equal(r.status(), 200, await r.text());
  return (await r.json()).state;
}
function fixture(saveId, taskId = null, dueIn = -1) {
  // Explicit isolated fixture: relocate only this test guest, or make their task due.
  execFileSync(python, [
    "-c",
    `import sqlite3,json,sys,time
conn=sqlite3.connect(sys.argv[1]); key=sys.argv[2]; task=sys.argv[3]
s=json.loads(conn.execute('select state from players where id=?',(key,)).fetchone()[0])
if task:
 t=s['life_tasks'][task]; t['ready_at']=time.time()+float(sys.argv[4]); t['accepted_at']=t['ready_at']-t['hours']*3600
else:
 s['position']={'x':576,'y':420}; s['location']='overworld'
s['revision']+=1
conn.execute('update players set state=? where id=?',(json.dumps(s),key));conn.commit();conn.close()`,
    db,
    saveId,
    taskId || "",
    String(dueIn),
  ]);
}
async function talk() {
  const s = await read();
  if (s.mode !== "explore") await p.keyboard.press("Escape");
  await p.waitForTimeout(250);
  const v = await read(),
    box = await p.locator("canvas").boundingBox();
  await p.mouse.click(
    box.x + (576 - v.camera.viewX) * v.camera.zoom,
    box.y + (374 - v.camera.viewY) * v.camera.zoom,
  );
  await p.getByRole("group", { name: "对话话题" }).waitFor();
  await p.getByRole("button", { name: "现实委托", exact: true }).click();
}
async function shot(name) {
  await p.waitForTimeout(200);
  await p.screenshot({ path: new URL(name + ".png", output).pathname });
  const dialog = p.locator("dialog[open]");
  assert.equal(
    await dialog.evaluate((e) => e.scrollWidth > e.clientWidth + 2),
    false,
    name + " overflow",
  );
  const small = await dialog
    .locator("button")
    .evaluateAll((es) =>
      es
        .filter(
          (e) =>
            e.checkVisibility() &&
            (e.getBoundingClientRect().height < 43 ||
              e.getBoundingClientRect().width < 43),
        )
        .map((e) => e.textContent),
    );
  assert.deepEqual(small, [], name + " touch target");
  const contrast = await dialog.evaluate((root) => {
    const rgb = (v) => v.match(/[\d.]+/g)?.map(Number) || [0, 0, 0];
    const lum = (c) =>
      c
        .slice(0, 3)
        .map((v) => v / 255)
        .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
        .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
    return [...root.querySelectorAll("*")]
      .filter(
        (e) =>
          e.checkVisibility() &&
          e.getBoundingClientRect().width > 2 &&
          e.getBoundingClientRect().height > 2 &&
          !e.closest('[aria-hidden="true"],button:disabled') &&
          // Image-backed parchment is measured against captured pixels below.
          !e.closest(".life-contract-scroll,.talk-letter") &&
          [...e.childNodes].some(
            (n) => n.nodeType === 3 && n.textContent.trim(),
          ),
      )
      .map((e) => {
        const colors = [];
        let node = e;
        while (node) {
          const c = rgb(getComputedStyle(node).backgroundColor);
          colors.push(c);
          if (c.length === 3 || c[3] === 1) break;
          node = node.parentElement;
        }
        let bg = [244, 239, 222];
        for (const c of colors.reverse()) {
          const alpha = c[3] ?? 1;
          bg = bg.map((v, i) => c[i] * alpha + v * (1 - alpha));
        }
        const fg = rgb(getComputedStyle(e).color);
        const a = lum(fg),
          b = lum(bg);
        return {
          text: e.textContent.trim().slice(0, 60),
          ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
        };
      });
  });
  contrasts.push({
    name,
    min: Math.min(...contrast.map((t) => t.ratio)),
    runs: contrast.length,
  });
  assert.deepEqual(
    contrast.filter((t) => t.ratio < 4.5),
    [],
    name + " text contrast",
  );
  await p.screenshot({ path: new URL(name + ".png", output).pathname });
  if (
    imagePython &&
    (await p
      .locator(
        ".life-contract-conversation,.life-offer,.life-settlement,.noah-talk",
      )
      .count())
  ) {
    const text = await p
      .locator(
        ".life-contract-conversation,.life-offer,.life-settlement,.noah-talk",
      )
      .evaluate((root) =>
        [...root.querySelectorAll("*")]
          .filter(
            (el) =>
              el.checkVisibility() &&
              !el.closest('[aria-hidden="true"],button:disabled'),
          )
          .flatMap((el) =>
            [...el.childNodes]
              .filter(
                (n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim(),
              )
              .flatMap((n) => {
                const range = document.createRange();
                range.selectNodeContents(n);
                return [...range.getClientRects()]
                  .filter(
                    (r) =>
                      r.width > 1 &&
                      r.height > 1 &&
                      // Offscreen/clipped lines have no visible paper pixels to sample.
                      r.top >=
                        Math.max(
                          0,
                          root.closest("dialog").getBoundingClientRect().top,
                        ) &&
                      r.bottom <=
                        Math.min(
                          innerHeight,
                          root.closest("dialog").getBoundingClientRect().bottom,
                        ) &&
                      r.left >= 0 &&
                      r.right <= innerWidth &&
                      // The floating close latch can cover a scrolled text run.
                      // Exclude that occluded run rather than sampling its ink
                      // against a different control's dark background.
                      ![
                        ...root.closest("dialog").querySelectorAll(".hp-close"),
                      ].some((button) => {
                        const b = button.getBoundingClientRect();
                        return (
                          r.left < b.right &&
                          r.right > b.left &&
                          r.top < b.bottom &&
                          r.bottom > b.top
                        );
                      }),
                  )
                  .map((r) => ({
                    text: n.textContent.trim(),
                    color: getComputedStyle(el).color,
                    rect: [r.x, r.y, r.width, r.height],
                  }));
              }),
          ),
      );
    const folder = new URL("contrast-" + name + "/", output);
    await fs.mkdir(folder, { recursive: true });
    const hide = await p.addStyleTag({
      content:
        ":is(.life-contract-conversation,.life-offer,.life-settlement,.noah-talk) *,:is(.life-contract-conversation,.life-offer,.life-settlement,.noah-talk) *::before,:is(.life-contract-conversation,.life-offer,.life-settlement,.noah-talk) *::after{color:transparent!important;text-shadow:none!important;}",
    });
    try {
      await p.screenshot({
        path: new URL("contrast-background.png", folder).pathname,
      });
    } finally {
      await hide.evaluate((el) => el.remove());
    }
    await fs.writeFile(
      new URL("contrast-text.json", folder),
      JSON.stringify(text, null, 2),
    );
    execFileSync(imagePython, [
      new URL("../../tools/check_character_contrast.py", import.meta.url)
        .pathname,
      "--output",
      folder.pathname,
    ]);
    const values = JSON.parse(
      await fs.readFile(new URL("contrast-result.json", folder), "utf8"),
    );
    textureContrasts.push({
      name,
      runs: values.length,
      min: Math.min(...values.map((v) => v.minimum_ratio)),
    });
  }
  shots.push(name);
}
try {
  await p.goto(base);
  await p.getByLabel("你的名字").fill("现实委托试行旅人");
  await p.click("#start-btn");
  await p.waitForSelector("canvas");
  const session = await (await c.request.post(base + "/api/session")).json();
  fixture(session.save_id);
  await p.reload();
  await p.waitForSelector("canvas");
  await p.getByRole("button", { name: "现实成长", exact: true }).click();
  await shot("empty-1440");
  const start = (await read()).player;
  await p.getByRole("button", { name: "标记诺亚的位置", exact: true }).click();
  assert.deepEqual((await read()).player, start);
  assert.equal((await read()).navigation.targetId, "noah");
  await talk();
  await shot("choices-1440");
  await p.getByText("委托规则", { exact: true }).click();
  await p.getByText(/等待时间不代表现实行为已被验证/).waitFor();
  await shot("rules-open-1440");
  await p.keyboard.press("Escape");
  assert.equal(
    await p.locator(".life-commission-rules").evaluate((e) => e.open),
    false,
  );
  assert.equal((await read()).mode, "npc");
  const close = p.getByRole("button", { name: "关闭面板", exact: true });
  await close.focus();
  await p.keyboard.press("Shift+Tab");
  assert.equal(
    await p
      .locator(".life-commission-rules summary")
      .evaluate((e) => e === document.activeElement),
    true,
  );
  await p.keyboard.press("Tab");
  assert.equal(await close.evaluate((e) => e === document.activeElement), true);
  await p.getByRole("button", { name: "村庄闲谈", exact: true }).click();
  await p.getByText("预设剧情对话", { exact: true }).waitFor();
  assert.equal(
    await p.locator(".life-quota").count(),
    0,
    "Story does not show reality quota",
  );
  const reveal = p.getByRole("button", { name: "显示完整对话" });
  if (await reveal.count()) await reveal.click();
  await shot("story-1440");
  await p.setViewportSize({ width: 390, height: 844 });
  await shot("story-390");
  await p.getByRole("button", { name: "聊聊这份委托", exact: true }).click();
  await p.getByRole("button", { name: "接受委托", exact: true }).click();
  await wait(
    (s) => s.quests.find((q) => q.id === "forest_path").status === "active",
  );
  await shot("story-accepted-390");
  await p.getByRole("button", { name: "收起信件", exact: true }).click();
  await p.waitForFunction(
    () =>
      document.querySelector(".talk-actions .life-main-action") ===
      document.activeElement,
  );
  // Deterministic progress only for the newly created isolated guest. Actions and
  // rewards still go through the real UI and server rules, never the owner save.
  execFileSync(python, [
    "-c",
    `import sqlite3,json,sys
conn=sqlite3.connect(sys.argv[1]); key=sys.argv[2]
s=json.loads(conn.execute('select state from players where id=?',(key,)).fetchone()[0])
s['stats']['stone']=6
if 'discovered_grove' not in s['events']: s['events'].append('discovered_grove')
s['revision']+=1
conn.execute('update players set state=? where id=?',(json.dumps(s),key));conn.commit();conn.close()`,
    db,
    session.save_id,
  ]);
  await p.reload();
  await p.waitForSelector("canvas");
  await talk();
  await p.getByRole("button", { name: "村庄闲谈", exact: true }).click();
  await p
    .getByRole("button", { name: "显示完整对话" })
    .click()
    .catch(() => {});
  await shot("story-ready-390");
  await p.setViewportSize({ width: 1440, height: 900 });
  await shot("story-ready-1440");
  const beforeStory = await state();
  await p.getByRole("button", { name: "聊聊这份委托", exact: true }).click();
  await p
    .getByRole("button", { name: "交付委托，领取回礼", exact: true })
    .click();
  await wait(
    (s) => s.quests.find((q) => q.id === "forest_path").status === "claimed",
  );
  assert.equal((await state()).inventory.gold, beforeStory.inventory.gold + 25);
  await shot("story-completed-1440");
  await p.getByRole("button", { name: "收起信件", exact: true }).click();
  await p
    .locator(".talk-letter")
    .getByText("已完成", { exact: true })
    .waitFor();
  await p.getByRole("button", { name: "改天再聊", exact: true }).click();
  assert.equal((await read()).mode, "explore");
  await talk();
  for (const [w, h] of [
    [1920, 1080],
    [768, 1024],
    [390, 844],
    [375, 812],
    [720, 450],
  ]) {
    await p.setViewportSize({ width: w, height: h });
    await shot("choices-" + w);
    if (w === 720) {
      await p.locator(".life-main-action").scrollIntoViewIfNeeded();
      const closeBox = await close.boundingBox();
      assert(
        closeBox.y >= 0 && closeBox.y + closeBox.height <= h,
        "close remains visible while scrolling",
      );
      await shot("choices-720-scrolled");
    }
  }
  await p.setViewportSize({ width: 1440, height: 900 });
  const position = (await read()).player;
  await p.keyboard.press("d");
  await p.keyboard.press("e");
  assert.deepEqual((await read()).player, position);
  await p
    .getByRole("group", { name: "选择现实任务类型" })
    .getByRole("button", { name: /工作/ })
    .click();
  await p
    .getByRole("group", { name: "选择委托时长" })
    .getByRole("button", { name: "5 小时", exact: true })
    .click();
  // Rejection retains choices; no task is written.
  expectedFailure = true;
  await p.route("**/api/command", async (route) => {
    if (route.request().postDataJSON().action === "life_accept")
      await route.fulfill({
        status: 422,
        contentType: "application/json",
        body: JSON.stringify({ detail: "测试拒绝：请重试这份约定" }),
      });
    else await route.continue();
  });
  await p.getByRole("button", { name: /领取这份委托/ }).click();
  await p.getByRole("alert").filter({ hasText: "测试拒绝" }).waitFor();
  assert.equal((await state()).life_journal.tasks.length, 0);
  await shot("rejected");
  await p.unroute("**/api/command");
  expectedFailure = false;
  // Lost response is retried with the same request, and is only accepted once.
  let dropped = false;
  expectedFailure = true;
  await p.route("**/api/command", async (route) => {
    if (!dropped && route.request().postDataJSON().action === "life_accept") {
      dropped = true;
      await route.fetch();
      await route.abort("failed");
    } else await route.continue();
  });
  await p.getByRole("button", { name: /领取这份委托/ }).click();
  await wait((s) => s.lifeJournal.tasks.length === 1);
  await p.unroute("**/api/command");
  expectedFailure = false;
  assert.equal((await state()).life_journal.reserved, 5);
  await shot("active-1440");
  for (const [width, height] of [
    [1920, 1080],
    [768, 1024],
    [390, 844],
    [375, 812],
    [720, 450],
  ]) {
    await p.setViewportSize({ width, height });
    await shot("active-" + width);
    if (width === 720) {
      await p
        .getByRole("button", { name: "收起委托", exact: true })
        .scrollIntoViewIfNeeded();
      await shot("active-720-scrolled");
    }
  }
  await p.setViewportSize({ width: 1440, height: 900 });
  await p.locator(".life-commission-rules summary").click();
  await shot("active-rules-1440");
  await p
    .locator(".life-commission-rules > div p:last-child")
    .scrollIntoViewIfNeeded();
  await shot("active-rules-scrolled-1440");
  await p.keyboard.press("Escape");
  assert.equal(
    await p.getByRole("button", { name: "收起委托", exact: true }).isEnabled(),
    true,
  );
  const active = (await state()).life_journal.tasks[0];
  await p.getByRole("button", { name: "收起委托", exact: true }).click();
  assert.equal((await read()).mode, "explore");
  assert.equal((await state()).life_journal.tasks[0].id, active.id);
  await talk();
  assert.equal(
    await p.getByRole("button", { name: /结算委托 · 领取/ }).count(),
    0,
  );
  const early = await c.request.post(base + "/api/command", {
    data: {
      request_id: crypto.randomUUID(),
      action: "life_claim",
      data: { target: "noah", task_id: active.id, now: 9999999999 },
    },
  });
  assert.equal(early.status(), 422);
  fixture(session.save_id, active.id, active.hours * 1800);
  await p.reload();
  await p.waitForSelector("canvas");
  await talk();
  const ratio = Number(
    await p.locator(".contract-hourglass").getAttribute("data-remaining-ratio"),
  );
  assert(ratio > 0.49 && ratio < 0.51);
  await shot("active-half-1440");
  await p.getByRole("button", { name: "取消这份委托", exact: true }).click();
  await p.keyboard.press("Escape");
  assert.equal((await read()).mode, "npc");
  assert.equal(
    await p.getByRole("button", { name: "确认取消委托", exact: true }).count(),
    0,
  );
  await p.getByRole("button", { name: "取消这份委托", exact: true }).click();
  await p.getByRole("button", { name: "确认取消委托", exact: true }).click();
  await wait((s) => s.lifeJournal.remaining === 5);
  await p
    .getByRole("group", { name: "选择现实任务类型" })
    .getByRole("button", { name: /学习/ })
    .click();
  await p
    .getByRole("group", { name: "选择委托时长" })
    .getByRole("button", { name: "2 小时", exact: true })
    .click();
  await p.getByRole("button", { name: /领取这份委托/ }).click();
  await wait((s) => s.lifeJournal.reserved === 2);
  await p.reload();
  await p.waitForSelector("canvas");
  await p.getByRole("button", { name: "现实成长", exact: true }).click();
  await shot("history-active-1440");
  for (const [w, h] of [
    [390, 844],
    [375, 812],
    [720, 450],
  ]) {
    await p.setViewportSize({ width: w, height: h });
    await shot("history-active-" + w);
  }
  await p.setViewportSize({ width: 1440, height: 900 });
  const study = (await state()).life_journal.tasks.find(
    (t) => t.status === "active",
  );
  fixture(session.save_id, study.id, 3);
  await p.reload();
  await p.waitForSelector("canvas");
  await talk();
  await p
    .getByRole("button", { name: "结算委托 · 领取 2 知识点", exact: true })
    .waitFor();
  assert.equal(
    await p.locator(".contract-hourglass").getAttribute("data-remaining-ratio"),
    "0.0000",
  );
  await shot("ready");
  expectedFailure = true;
  await p.route("**/api/command", async (route) => {
    if (route.request().postDataJSON().action === "life_claim")
      await route.fulfill({
        status: 422,
        contentType: "application/json",
        body: JSON.stringify({ detail: "测试拒绝：暂时无法结算，请重试" }),
      });
    else await route.continue();
  });
  await p
    .getByRole("button", { name: "结算委托 · 领取 2 知识点", exact: true })
    .click();
  await p.getByRole("alert").filter({ hasText: "暂时无法结算" }).waitFor();
  assert.equal((await state()).knowledge_points, 0);
  await shot("settlement-rejected");
  await p.unroute("**/api/command");
  // The server commits but its response is lost: reconciliation must show
  // the confirmed receipt, never a fabricated credit or a second claim.
  await p.route("**/api/command", async (route) => {
    if (route.request().postDataJSON().action === "life_claim") {
      const response = await route.fetch();
      assert.equal(response.status(), 200);
      await route.abort("failed");
    } else await route.continue();
  });
  await p
    .getByRole("button", { name: "结算委托 · 领取 2 知识点", exact: true })
    .click();
  await wait((s) => s.knowledgePoints === 2);
  await p.getByRole("button", { name: "再约一份委托" }).waitFor();
  await p.unroute("**/api/command");
  expectedFailure = false;
  await shot("claimed-two");
  for (const [width, height] of [
    [1920, 1080],
    [768, 1024],
    [390, 844],
    [375, 812],
    [720, 450],
  ]) {
    await p.setViewportSize({ width, height });
    await shot("receipt-" + width);
  }
  await p.setViewportSize({ width: 1440, height: 900 });
  await p.getByRole("button", { name: "村庄闲谈", exact: true }).click();
  await p.getByRole("button", { name: "现实委托", exact: true }).click();
  await p.getByRole("button", { name: "再约一份委托" }).click();
  assert.equal(
    await p
      .getByRole("group", { name: "选择委托时长" })
      .getByRole("button")
      .count(),
    3,
  );
  await command("life_claim", { target: "noah", task_id: study.id });
  assert.equal((await state()).knowledge_points, 2);
  await p
    .getByRole("group", { name: "选择现实任务类型" })
    .getByRole("button", { name: /运动/ })
    .click();
  await p
    .getByRole("group", { name: "选择委托时长" })
    .getByRole("button", { name: "3 小时", exact: true })
    .click();
  await p.getByRole("button", { name: /领取这份委托/ }).click();
  await wait((s) => s.lifeJournal.reserved === 3);
  const exercise = (await state()).life_journal.tasks.find(
    (t) => t.status === "active",
  );
  fixture(session.save_id, exercise.id);
  await p.reload();
  await p.waitForSelector("canvas");
  await talk();
  await p
    .getByRole("button", { name: "结算委托 · 领取 3 健康点", exact: true })
    .click();
  await wait((s) => s.healthPoints === 3);
  await shot("daily-cap");
  assert.equal(await p.getByRole("group", { name: "选择委托时长" }).count(), 0);
  await p.getByRole("button", { name: "翻看成长手记", exact: true }).click();
  await shot("history-complete-1440");
  await p
    .getByRole("group", { name: "筛选任务记录" })
    .getByRole("button", { name: "已取消", exact: true })
    .click();
  assert.equal(await p.locator(".life-memories li").count(), 1);
  await p
    .getByRole("group", { name: "筛选任务记录" })
    .getByRole("button", { name: "全部", exact: true })
    .click();
  for (const [w, h] of [
    [1920, 1080],
    [768, 1024],
    [390, 844],
    [375, 812],
    [720, 450],
  ]) {
    await p.setViewportSize({ width: w, height: h });
    await shot("history-complete-" + w);
  }
  await p.emulateMedia({ reducedMotion: "reduce" });
  await p.addStyleTag({ content: ".life-journal{font-size:20px!important}" });
  await shot("large-text-reduced-motion");
  await p.setViewportSize({ width: 1440, height: 900 });
  await p.getByRole("button", { name: /知识研修/ }).click();
  await p.getByRole("button", { name: /投入 1 知识点/ }).click();
  await wait((s) => s.knowledgePoints === 1);
  await p.keyboard.press("Escape");
  await p.getByRole("button", { name: "现实成长", exact: true }).click();
  await p.getByRole("button", { name: /体力培养/ }).click();
  await p
    .getByRole("button", { name: "投入 1 健康点 · 提升体力", exact: true })
    .click();
  await wait((s) => s.healthPoints === 2);
  assert.equal((await state()).life_journal.remaining, 0);
  await p.keyboard.press("Escape");
  await p.getByRole("button", { name: "现实成长", exact: true }).click();
  await p.keyboard.press("Escape");
  assert.equal(
    await p
      .getByRole("button", { name: "现实成长", exact: true })
      .evaluate((e) => e === document.activeElement),
    true,
  );
  // Separate actual touch context, work-point settlement, orientation and cancellation from history.
  const mobile = await browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });
  try {
    const m = await mobile.newPage();
    m.on("pageerror", (e) => errors.push(e.message));
    await m.goto(base);
    await m.getByLabel("你的名字").fill("触屏委托旅人");
    await m.locator("#start-btn").tap();
    await m.waitForSelector("canvas");
    const ms = await (await mobile.request.post(base + "/api/session")).json();
    fixture(ms.save_id);
    await m.reload();
    await m.waitForSelector("canvas");
    await m.waitForTimeout(350);
    await m.locator(".interact").tap();
    await m.getByRole("group", { name: "对话话题" }).waitFor();
    await m
      .getByRole("group", { name: "选择现实任务类型" })
      .getByRole("button", { name: /工作/ })
      .tap();
    await m.getByRole("button", { name: /领取这份委托/ }).tap();
    await m.getByRole("button", { name: "收起委托", exact: true }).waitFor();
    const active = (
      await (await mobile.request.get(base + "/api/state")).json()
    ).state.life_journal.tasks[0];
    fixture(ms.save_id, active.id);
    await m.reload();
    await m.waitForSelector("canvas");
    await m.waitForTimeout(350);
    await m.locator(".interact").tap();
    await m
      .getByRole("button", { name: "结算委托 · 领取 1 技能点", exact: true })
      .tap();
    await m.getByText("+1 技能点", { exact: true }).waitFor();
    await m.screenshot({
      path: new URL("touch-work-375.png", output).pathname,
    });
    shots.push("touch-work-375");
    await m.getByRole("button", { name: "再约一份委托" }).tap();
    await m.getByRole("button", { name: /领取这份委托/ }).tap();
    await m.getByRole("button", { name: "收起委托", exact: true }).waitFor();
    await m.getByRole("button", { name: "关闭面板", exact: true }).tap();
    await m.getByRole("button", { name: "现实成长", exact: true }).tap();
    await m.getByRole("button", { name: "取消这份委托", exact: true }).tap();
    await m.getByRole("button", { name: "确认取消委托", exact: true }).tap();
    await m.setViewportSize({ width: 844, height: 390 });
    await m.screenshot({
      path: new URL("touch-landscape.png", output).pathname,
    });
    shots.push("touch-landscape");
    const end = (await (await mobile.request.get(base + "/api/state")).json())
      .state;
    assert.equal(end.skill_points, 1);
    assert.equal(end.life_journal.remaining, 4);
    assert.equal(
      end.life_journal.tasks.filter((t) => t.status === "cancelled").length,
      1,
    );
  } finally {
    await mobile.close();
  }
  assert.deepEqual(errors, []);
  await fs.writeFile(
    new URL("result.json", output),
    JSON.stringify(
      {
        shots,
        errors,
        contrasts,
        textureContrasts,
        isolatedMaturityFixture: true,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ captures: shots.length, errors }));
} finally {
  await c.close();
  await browser.close();
}
