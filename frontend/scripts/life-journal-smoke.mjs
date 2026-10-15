import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";

const base = process.env.REALQUEST_URL || "http://127.0.0.1:5217";
const db = process.env.REALQUEST_TEST_DB;
assert(
  db?.includes("/output/life-commissions/journal-ui/"),
  "Only this task's isolated database is allowed",
);
const output = new URL(
  "../../output/playwright/life-journal/daily/",
  import.meta.url,
);
const python = new URL("../../backend/.venv/bin/python", import.meta.url)
  .pathname;
const imagePython = process.env.REALQUEST_IMAGE_PYTHON;
const backend = new URL("../../backend/", import.meta.url).pathname;
const snapshots = [],
  contrasts = [],
  errors = [];
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  ...(process.env.REALQUEST_RECORD_VIDEO === "1"
    ? {
        recordVideo: {
          dir: new URL("recordings/", output).pathname,
          size: { width: 1440, height: 900 },
        },
      }
    : {}),
});
const page = await context.newPage();
page.on("pageerror", (error) => errors.push(error.message));
let expectedFailure = false;
page.on("console", (message) => {
  if (
    message.type() === "error" &&
    !expectedFailure &&
    !message.location().url.endsWith("favicon.ico")
  )
    errors.push(message.text());
});
const state = async () =>
  (await (await context.request.get(base + "/api/state")).json()).state;
const dateLabel = (date) =>
  `${Number(date.slice(0, 4))}年${Number(date.slice(5, 7))}月${Number(date.slice(8))}日`;
const dateButton = (p, date) =>
  p.getByRole("button", { name: new RegExp("^" + dateLabel(date) + "，") });
const previous = (date) =>
  new Date(Date.parse(date + "T00:00:00Z") - 86400000)
    .toISOString()
    .slice(0, 10);
const game = () =>
  page.evaluate(() => JSON.parse(window.render_game_to_text()));

function fixture(saveId, mode = "days") {
  return JSON.parse(
    execFileSync(
      python,
      [
        "-c",
        `
import sqlite3,json,sys,time,uuid
from datetime import datetime,timedelta
from zoneinfo import ZoneInfo
from app.rules import apply
conn=sqlite3.connect(sys.argv[1]); key=sys.argv[2]
s=json.loads(conn.execute('select state from players where id=?',(key,)).fetchone()[0])
assert s['character']['name']=='成长日历验证', 'Only the newly created fixture guest may change'
s['location']='overworld';s['position']={'x':576,'y':420}
now=time.time(); today=datetime.fromtimestamp(now,ZoneInfo('Asia/Shanghai')).date(); yesterday=today-timedelta(days=1)
def at(day,hour): return datetime(day.year,day.month,day.day,hour,tzinfo=ZoneInfo('Asia/Shanghai')).timestamp()
def take(kind,hours,when,status,end):
 tid=str(uuid.uuid4());apply(s,'life_accept',{'target':'noah','kind':kind,'hours':hours,'task_id':tid},when)
 if status: apply(s,'life_'+status,{'target':'noah','task_id':tid},end)
 return tid
if sys.argv[3]=='days':
 old=today.replace(day=1)-timedelta(days=1)
 take('work',1,at(old,9),'claim',at(old,10))
 for i in range(12): take('exercise',1,at(yesterday,8)+i*60,'cancel',at(yesterday,8)+i*60+30)
 take('work',3,at(yesterday,23),'claim',at(yesterday,23)+10800)
 take('exercise',1,at(today,7),'claim',at(today,8))
 take('work',1,at(today,9),'cancel',at(today,9)+60)
 active=take('study',1,now-180,None,None)
else:
 for t in s['life_tasks'].values():
  if t['status']=='active':
   if sys.argv[3]=='overnight': t['accepted_at']=at(yesterday,23);t['ready_at']=now+600;t['date']=yesterday.isoformat()
   elif sys.argv[3]=='ready': t['accepted_at']=now-3601;t['ready_at']=now-1;t['date']=today.isoformat()
   else: t['accepted_at']=now-180;t['ready_at']=now+3420;t['date']=today.isoformat()
s['revision']+=1
conn.execute('update players set state=? where id=?',(json.dumps(s),key));conn.commit();conn.close()
print(json.dumps({'today':today.isoformat(),'yesterday':yesterday.isoformat(),'old':(today.replace(day=1)-timedelta(days=1)).isoformat()}))
`,
        db,
        saveId,
        mode,
      ],
      { cwd: backend },
    ).toString(),
  );
}

async function shot(name, p = page) {
  const root = p.locator(".lj-book");
  await root.evaluate(async (element) => {
    await Promise.all(
      element
        .getAnimations({ subtree: true })
        .filter(
          (animation) => animation.effect?.getTiming().iterations !== Infinity,
        )
        .map((animation) => animation.finished.catch(() => undefined)),
    );
  });
  await p.screenshot({
    path: new URL(name + ".png", output).pathname,
    scale: "css",
  });
  assert.equal(
    await p
      .locator("dialog[open]")
      .evaluate((el) => el.scrollWidth > el.clientWidth + 2),
    false,
    name + " horizontal overflow",
  );
  const small = await root.locator("button").evaluateAll((buttons) =>
    buttons
      .filter(
        (button) =>
          button.checkVisibility() &&
          (button.getBoundingClientRect().width < 43 ||
            button.getBoundingClientRect().height < 43),
      )
      .map((button) => ({
        label: button.getAttribute("aria-label") || button.textContent,
        width: button.getBoundingClientRect().width,
        height: button.getBoundingClientRect().height,
      })),
  );
  assert.deepEqual(small, [], name + " minimum touch targets");
  if (imagePython) {
    const text = await root.evaluate((root) =>
      [...root.querySelectorAll("*")]
        .filter(
          (el) =>
            el.checkVisibility() &&
            !el.closest('[aria-hidden="true"],button:disabled'),
        )
        .flatMap((el) =>
          [...el.childNodes]
            .filter(
              (node) =>
                node.nodeType === Node.TEXT_NODE && node.textContent.trim(),
            )
            .flatMap((node) => {
              const range = document.createRange();
              range.selectNodeContents(node);
              const dialog = root.closest("dialog").getBoundingClientRect();
              const close = root
                .closest("dialog")
                .querySelector(".hp-close")
                .getBoundingClientRect();
              return [...range.getClientRects()]
                .filter(
                  (r) =>
                    r.width > 1 &&
                    r.height > 1 &&
                    r.top >= Math.max(0, dialog.top) &&
                    r.bottom <= Math.min(innerHeight, dialog.bottom) &&
                    r.left >= 0 &&
                    r.right <= innerWidth &&
                    !(
                      r.left < close.right &&
                      r.right > close.left &&
                      r.top < close.bottom &&
                      r.bottom > close.top
                    ),
                )
                .map((r) => ({
                  text: node.textContent.trim(),
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
        ".lj-book *,.lj-book *::before,.lj-book *::after{color:transparent!important;text-shadow:none!important;}",
    });
    try {
      await p.screenshot({
        path: new URL("contrast-background.png", folder).pathname,
        scale: "css",
      });
    } finally {
      await hide.evaluate((el) => el.remove());
    }
    await fs.writeFile(
      new URL("contrast-text.json", folder),
      JSON.stringify(text),
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
    contrasts.push({
      name,
      runs: values.length,
      min: Math.min(...values.map((value) => value.minimum_ratio)),
    });
  }
  snapshots.push(name);
}

try {
  await page.goto(base);
  await page.getByLabel("你的名字").fill("成长日历验证");
  await page.getByRole("button", { name: "进入回响大陆", exact: true }).click();
  await page.waitForSelector("canvas");
  const session = await (
    await context.request.post(base + "/api/session")
  ).json();
  const dates = fixture(session.save_id);
  await page.reload();
  await page.waitForSelector("canvas");
  await page.getByRole("button", { name: "现实成长", exact: true }).click();
  await page.getByRole("region", { name: "当前现实委托" }).waitFor();
  assert.match(
    await page.locator(".lj-day-summary").textContent(),
    /3 份约定 · 进行中 1 · 已结算 1 · 已取消 1/,
  );
  assert.equal(await page.locator(".life-memories li").count(), 2);
  const start = await game();
  await shot("today-active-1440");
  await page
    .locator(".lj-task-body .contract-hourglass")
    .screenshot({ path: new URL("hourglass-detail.png", output).pathname });
  await dateButton(page, dates.today).focus();
  await page.keyboard.press("ArrowLeft");
  assert.equal(
    await dateButton(page, dates.yesterday).getAttribute("aria-pressed"),
    "true",
  );
  assert.deepEqual(
    (await game()).player,
    start.player,
    "calendar arrows must not move the world actor",
  );
  assert.match(
    await page.locator(".lj-day-summary").textContent(),
    /13 份约定/,
  );
  assert.equal(await page.locator(".life-memories li").count(), 10);
  await page.getByRole("button", { name: "再翻十条记录" }).click();
  assert.equal(await page.locator(".life-memories li").count(), 13);
  await page.getByRole("button", { name: "已结算", exact: true }).click();
  assert.equal(await page.locator(".life-memories li").count(), 1);
  assert.match(
    await page.locator(".life-record-stamp").textContent(),
    /\+3 技能点/,
  );
  await shot("acceptance-day-history");
  await page.getByRole("button", { name: "上个月", exact: true }).click();
  await dateButton(page, dates.old).click();
  assert.equal(await page.locator(".life-memories li").count(), 1);
  assert.match(
    await page.locator(".life-record-stamp").textContent(),
    /\+1 技能点/,
  );
  await page.getByRole("button", { name: "回到今天", exact: true }).click();
  assert.equal(
    await dateButton(page, dates.today).getAttribute("aria-pressed"),
    "true",
  );
  await page.getByRole("button", { name: "前一天", exact: true }).click();
  await page.getByRole("button", { name: /查看当前约定/ }).click();
  await page.getByRole("region", { name: "当前现实委托" }).waitFor();
  await page.getByRole("button", { name: "取消这份委托", exact: true }).click();
  await page.keyboard.press("Escape");
  assert.equal(
    await page.getByRole("group", { name: "确认取消委托" }).count(),
    0,
  );
  assert.equal(await page.locator("dialog[open]").count(), 1);
  await page.waitForFunction(
    () => document.activeElement?.getAttribute("aria-label") === "取消这份委托",
  );
  assert.equal(
    await page
      .getByRole("button", { name: "取消这份委托", exact: true })
      .evaluate((el) => el === document.activeElement),
    true,
  );
  for (const [width, height] of [
    [1920, 1080],
    [768, 1024],
    [390, 844],
    [375, 812],
    [720, 450],
  ]) {
    await page.setViewportSize({ width, height });
    await page.locator("dialog[open]").evaluate((el) => el.scrollTo(0, 0));
    await shot("active-" + width);
  }
  await page.setViewportSize({ width: 375, height: 812 });
  await page.getByRole("button", { name: /选择日期/ }).click();
  await dateButton(page, dates.today).waitFor();
  await shot("phone-calendar-375");
  await dateButton(page, dates.yesterday).click();
  assert.equal(await page.locator(".lj-index").isVisible(), false);
  assert.match(
    await page.locator(".lj-day-summary").textContent(),
    /13 份约定/,
  );
  await page.getByRole("button", { name: /查看当前约定/ }).click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addStyleTag({
    content:
      ".lj-book{font-size:20px!important}.lj-book button,.lj-task-heading h4,.lj-day-summary{font-size:20px!important}",
  });
  await shot("large-text-phone");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.reload();
  await page.waitForSelector("canvas");
  await page.getByRole("button", { name: "现实成长", exact: true }).click();
  await page.getByRole("button", { name: "取消这份委托", exact: true }).click();
  fixture(session.save_id, "overnight");
  await page.reload();
  await page.waitForSelector("canvas");
  await page.getByRole("button", { name: "现实成长", exact: true }).click();
  assert.equal(
    await page.getByRole("region", { name: "当前现实委托" }).count(),
    0,
  );
  await page.getByRole("button", { name: /查看当前约定/ }).click();
  await page.getByRole("region", { name: "当前现实委托" }).waitFor();
  assert.equal(
    await dateButton(page, dates.yesterday).getAttribute("aria-pressed"),
    "true",
  );
  assert.match(
    await page.locator(".lj-index .lj-quota").getAttribute("aria-label"),
    /预留 0 点/,
  );
  await shot("overnight-acceptance-day");
  const pointsBeforeReady = await state();
  fixture(session.save_id, "ready");
  await page.reload();
  await page.waitForSelector("canvas");
  await page.getByRole("button", { name: "现实成长", exact: true }).click();
  await page.getByRole("timer", { name: "约定时间已到" }).waitFor();
  for (const currency of ["knowledge_points", "health_points", "skill_points"])
    assert.equal((await state())[currency], pointsBeforeReady[currency]);
  await shot("ready-to-settle");
  fixture(session.save_id, "restore");
  await page.reload();
  await page.waitForSelector("canvas");
  await page.getByRole("button", { name: "现实成长", exact: true }).click();
  await page.getByRole("button", { name: "取消这份委托", exact: true }).click();
  expectedFailure = true;
  await page.route("**/api/command", (route) =>
    route.fulfill({
      status: 422,
      contentType: "application/json",
      body: JSON.stringify({ detail: "本次取消未成功，请重试。" }),
    }),
  );
  await page.getByRole("button", { name: "确认取消委托", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "本次取消未成功" }).waitFor();
  assert.equal(
    (await state()).life_journal.tasks.filter(
      (task) => task.status === "active",
    ).length,
    1,
  );
  await shot("cancel-rejected");
  await page.unroute("**/api/command");
  const before = await state();
  let discarded = false;
  await page.route("**/api/command", async (route) => {
    const response = await route.fetch();
    if (!discarded) {
      discarded = true;
      await route.abort("failed");
    } else await route.fulfill({ response });
  });
  await page.getByRole("button", { name: "确认取消委托", exact: true }).click();
  await page
    .getByRole("region", { name: "当前现实委托" })
    .waitFor({ state: "detached" });
  await page.unroute("**/api/command");
  expectedFailure = false;
  const after = await state();
  assert.equal(
    after.life_journal.tasks.length,
    before.life_journal.tasks.length,
  );
  assert.equal(
    after.life_journal.tasks.filter((task) => task.status === "cancelled")
      .length,
    before.life_journal.tasks.filter((task) => task.status === "cancelled")
      .length + 1,
  );
  for (const currency of ["knowledge_points", "health_points", "skill_points"])
    assert.equal(after[currency], before[currency]);
  await page.waitForFunction(() =>
    document.activeElement?.matches(".lj-day-heading h3"),
  );
  assert.equal(
    await page
      .locator(".lj-day-heading h3")
      .evaluate((el) => el === document.activeElement),
    true,
  );
  await shot("cancelled-after-retry");
  await page.keyboard.press("Escape");
  assert.equal(
    await page
      .getByRole("button", { name: "现实成长", exact: true })
      .evaluate((el) => el === document.activeElement),
    true,
  );
  await page.getByRole("button", { name: "现实成长", exact: true }).click();
  const positionBeforeMarker = (await game()).player;
  await page
    .getByRole("button", { name: "标记诺亚的位置", exact: true })
    .click();
  assert.deepEqual((await game()).player, positionBeforeMarker);
  assert.equal((await game()).navigation.targetId, "noah");
  const mobile = await browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    storageState: await context.storageState(),
  });
  try {
    const p = await mobile.newPage();
    await p.goto(base);
    await p.waitForSelector("canvas");
    await p.getByRole("button", { name: "现实成长", exact: true }).tap();
    await shot("touch-375-dpr2", p);
    await p.getByRole("button", { name: /选择日期/ }).tap();
    await dateButton(p, dates.yesterday).tap();
    assert.match(await p.locator(".lj-day-summary").textContent(), /13 份约定/);
    await p.setViewportSize({ width: 812, height: 375 });
    await shot("touch-landscape-812", p);
  } finally {
    await mobile.close();
  }
  assert.deepEqual(errors, []);
  await fs.writeFile(
    new URL("result.json", output),
    JSON.stringify(
      {
        snapshots,
        contrasts,
        errors,
        fixture:
          "Isolated new guest; historical records generated via authoritative rules, never player data",
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      captures: snapshots.length,
      contrastRuns: contrasts.reduce((n, c) => n + c.runs, 0),
      minimumContrast: Math.min(...contrasts.map((c) => c.min)),
      errors,
    }),
  );
} finally {
  try {
    await context.close();
  } finally {
    await browser.close();
  }
}
