import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Feather,
  Leaf,
  MapPin,
  Pause,
  Play,
  Plus,
  Square,
  Star,
} from "lucide-react";
import { serverNow, useGame } from "../stores/game";
import { api } from "../services/api";
import { StudyLibrary } from "./StudyLibrary";
import { KnowledgeStudy } from "./KnowledgeStudy";
import { RecoveryPanel } from "./RecoveryPanel";
import type { StudyTask } from "../types";
import { PixelPerson } from "./PixelPerson";
import { chime, unlockSound } from "../game/feel";

function Hourglass({ running }: { running: boolean }) {
  return (
    <svg
      className={`study-hourglass ${running ? "is-running" : ""}`}
      viewBox="0 0 112 136"
      aria-hidden="true"
    >
      <path
        className="glass"
        d="M29 22h54c0 24-9 36-23 46 14 10 23 22 23 46H29c0-24 9-36 23-46C38 58 29 46 29 22Z"
      />
      <path
        className="sand"
        d="M36 40h40c-4 12-11 17-20 23-9-6-16-11-20-23Zm-1 66 21-24 21 24Z"
      />
      <path className="sand-stream" d="M56 65v21" />
      <path className="frame" d="M21 17h70M21 119h70M25 25v86M87 25v86" />
    </svg>
  );
}

export function StudyPage() {
  const { state, command, open, busy, error, notice, noticePanel } = useGame();
  const worldEntry = useRef(useGame.getState().selected?.kind === "study");
  const tasks = state!.study_task_log || [];
  const plans = state!.study_plan_log || [];
  const [view, setView] = useState<
    "today" | "plans" | "growth" | "history" | "save"
  >(() => {
    if (useGame.getState().studyEntry === "growth") return "growth";
    try {
      const saved = sessionStorage.getItem("realquest-study-view");
      if (["today", "plans", "growth", "history", "save"].includes(saved || ""))
        return saved as "today";
    } catch {
      /* Optional view preference. */
    }
    return state!.timer ? "today" : plans.length ? "plans" : "today";
  });
  const visibleTasks = tasks.filter(
    (t) =>
      !t.archived_at && !plans.find((p) => p.id === t.plan_id)?.archived_at,
  );
  function turnTo(next: typeof view) {
    setView(next);
    try {
      sessionStorage.setItem("realquest-study-view", next);
    } catch {
      /* Optional. */
    }
    dialog.current?.scrollTo(0, 0);
  }
  const [selected, setSelected] = useState(() => {
    try {
      return sessionStorage.getItem("realquest-study-selected") || "";
    } catch {
      return "";
    }
  });
  const [draft, setDraft] = useState(visibleTasks.length === 0);
  const [title, setTitle] = useState("");
  const [minutes, setMinutes] = useState(25);
  const [customDuration, setCustomDuration] = useState(false);
  const [linking, setLinking] = useState(false);
  const [now, setNow] = useState(serverNow);
  const [showNotice, setShowNotice] = useState(false);
  const draftId = useRef(crypto.randomUUID());
  const dialog = useRef<HTMLDialogElement>(null);
  const titleInput = useRef<HTMLInputElement>(null);
  const taskHeading = useRef<HTMLHeadingElement>(null);
  const timer = state!.timer;
  const task =
    tasks.find((t) => t.id === selected) ||
    tasks.find((t) => t.id === timer?.study_task_id) ||
    visibleTasks[0] ||
    tasks[0];
  const taskPlan = plans.find((p) => p.id === task?.plan_id);
  const archived = !!task?.archived_at || !!taskPlan?.archived_at;
  const today = new Date(now * 1000).toLocaleDateString("en-CA", {
    timeZone: "Asia/Shanghai",
  });
  const bound = !!timer && !draft && timer.study_task_id === task?.id;
  const completed = !draft && !!task && task.completed_at !== null && !timer;
  const elapsed = timer
    ? Math.max(
        0,
        Math.floor(
          timer.elapsed + (timer.running ? now - timer.started_at : 0),
        ),
      )
    : 0;
  const recorded = task
    ? state!.activities.filter((a) => a.study_task_id === task.id)
    : [];
  const linkable = task
    ? state!.activities.filter(
        (a) =>
          a.id &&
          a.kind === "study" &&
          !a.study_task_id &&
          a.date === task.date,
      )
    : [];
  const dateLabel = new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
    timeZone: "Asia/Shanghai",
  }).format(now * 1000);
  useEffect(() => {
    dialog.current?.showModal();
    if (useGame.getState().studyEntry) {
      useGame.setState({ studyEntry: null });
      try {
        sessionStorage.setItem("realquest-study-view", "growth");
      } catch {
        /* Optional preference. */
      }
    }
    const ticker = window.setInterval(() => setNow(serverNow()), 1000);
    return () => {
      window.clearInterval(ticker);
      requestAnimationFrame(() =>
        document
          .querySelector<HTMLButtonElement>(
            worldEntry.current
              ? ".game-canvas"
              : '.nav-actions [aria-label="现实成长"]',
          )
          ?.focus(),
      );
    };
  }, []);
  useEffect(() => {
    if (draft && view === "today") titleInput.current?.focus();
  }, [draft, view]);
  useEffect(() => {
    setShowNotice(!!notice && noticePanel === "study");
    const id = window.setTimeout(() => setShowNotice(false), 4200);
    return () => window.clearTimeout(id);
  }, [notice, noticePanel]);
  function choose(id: string) {
    turnTo("today");
    setSelected(id);
    setDraft(false);
    setLinking(false);
    dialog.current?.scrollTo(0, 0);
    try {
      sessionStorage.setItem("realquest-study-selected", id);
    } catch {
      /* Optional view preference. */
    }
  }
  async function act(action: string, data: Record<string, unknown> = {}) {
    unlockSound();
    const ok = await command(action, data);
    if (ok)
      chime(
        action === "timer_finish" || action === "knowledge_spend"
          ? "reward"
          : "interact",
      );
    else {
      // Resolve an uncertain response using authoritative state, without replaying rewards.
      await api("state")
        .then((r) => useGame.getState().accept(r))
        .catch(() => undefined);
    }
    return ok;
  }
  async function create(event: React.FormEvent) {
    event.preventDefault();
    const id = draftId.current;
    if (
      await act("study_create", { task_id: id, title, target_minutes: minutes })
    ) {
      choose(id);
      setTitle("");
      draftId.current = crypto.randomUUID();
      requestAnimationFrame(() => {
        dialog.current
          ?.querySelector<HTMLButtonElement>(".study-focus-leaf .study-primary")
          ?.focus({ preventScroll: true });
        dialog.current?.scrollTo(0, 0);
      });
    }
  }
  function timerAction(action: string) {
    void act(action, { timer_id: timer?.id });
  }
  function newPage() {
    draftId.current = crypto.randomUUID();
    setTitle("");
    setMinutes(25);
    setCustomDuration(false);
    setDraft(true);
    setLinking(false);
  }
  return (
    <dialog
      ref={dialog}
      className="study-page rq-theme"
      aria-labelledby="study-page-title"
      onCancel={(e) => {
        e.preventDefault();
        open(null);
      }}
      onKeyDown={(e) => {
        if (["Enter", "Escape"].includes(e.key) && e.nativeEvent.isComposing)
          e.preventDefault();
        if (e.key !== "Tab") return;
        const controls = Array.from(
          e.currentTarget.querySelectorAll<HTMLElement>(
            "button:not(:disabled), input:not(:disabled), summary, [tabindex='0']",
          ),
        ).filter((el) => el.getClientRects().length);
        if (e.shiftKey && document.activeElement === controls[0]) {
          e.preventDefault();
          controls.at(-1)?.focus();
        } else if (!e.shiftKey && document.activeElement === controls.at(-1)) {
          e.preventDefault();
          controls[0]?.focus();
        }
      }}
    >
      <div className="study-shell">
        <header className="study-header">
          <button className="rq-button study-back" onClick={() => open(null)}>
            <ArrowLeft aria-hidden="true" size={18} /> 返回世界
          </button>
          <div>
            <span className="study-eyebrow">现实成长 · 研习手札</span>
            <h1 id="study-page-title">
              {view === "today"
                ? "今日研习"
                : view === "plans"
                  ? "研习计划"
                  : view === "growth"
                    ? "知识研修"
                    : view === "history"
                      ? "归档回看"
                      : "旅程存档"}
            </h1>
          </div>
          <span className="study-date">
            {dateLabel}
            <small>上海时间</small>
          </span>
        </header>
        <nav className="study-sections" aria-label="研习手札章节">
          {(
            [
              ["today", "今日研习"],
              ["plans", "研习计划"],
              ["growth", "知识研修"],
              ["history", "归档回看"],
              ["save", "存档与恢复"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              aria-current={view === id ? "page" : undefined}
              onClick={() => turnTo(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        {view === "growth" && <KnowledgeStudy act={act} onRead={choose} />}
        {(view === "plans" || view === "history") && (
          <StudyLibrary
            initialPlanId={task?.plan_id}
            mode={view}
            today={today}
            act={act}
            onRead={choose}
          />
        )}
        {view === "save" && (
          <main className="study-book study-save-book">
            <section className="study-leaf">
              <RecoveryPanel />
            </section>
            <section
              className="study-leaf study-save-illustration"
              aria-label="自动存档说明"
            >
              <BookOpen size={84} strokeWidth={1.2} aria-hidden="true" />
              <h2>书页会为你留下</h2>
              <p>计划、计时、手记和世界进度， 都随每次操作自动保存。</p>
              <p>正在运行的计时会在离开后继续。 需要休息时，先暂停再合上书。</p>
            </section>
          </main>
        )}
        {view === "today" && (
          <>
            {visibleTasks.length > 0 && (
              <nav className="study-bookmarks" aria-label="研习任务">
                {visibleTasks.slice(0, 6).map((t) => (
                  <button
                    key={t.id}
                    aria-current={
                      !draft && task?.id === t.id ? "page" : undefined
                    }
                    onClick={() => choose(t.id)}
                  >
                    {t.completed_at !== null ? (
                      <Check aria-hidden="true" size={16} />
                    ) : (
                      <BookOpen aria-hidden="true" size={16} />
                    )}
                    <span>{t.title}</span>
                    {t.date !== today && <small>{t.date.slice(5)}</small>}
                  </button>
                ))}
                <button
                  className="study-new"
                  aria-current={draft ? "page" : undefined}
                  onClick={newPage}
                  disabled={busy}
                >
                  <Plus aria-hidden="true" size={16} /> 写下一项
                </button>
              </nav>
            )}
            <main className={`study-book ${draft ? "is-draft" : "is-reading"}`}>
              <section
                className="study-leaf study-task-leaf"
                aria-label={draft ? "写下学习任务" : "当前学习任务"}
              >
                <span className="study-eyebrow">
                  <Feather aria-hidden="true" size={15} />{" "}
                  {draft
                    ? "新的一页"
                    : task?.date === today
                      ? "今天的小小约定"
                      : `${task?.date} · 留在手记里的书页`}
                </span>
                {draft ? (
                  <form
                    onSubmit={(e) => void create(e)}
                    className="study-compose"
                  >
                    <h2>今天，想读懂什么？</h2>
                    <label htmlFor="study-title">写下你的学习主题</label>
                    <input
                      ref={titleInput}
                      id="study-title"
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        draftId.current = crypto.randomUUID();
                      }}
                      placeholder="例如：读完一章植物笔记"
                      required
                      maxLength={80}
                      autoComplete="off"
                      disabled={busy}
                    />
                    <fieldset disabled={busy}>
                      <legend>为它留一点时间</legend>
                      <div className="study-durations">
                        {[5, 15, 25].map((n) => (
                          <button
                            type="button"
                            key={n}
                            aria-pressed={!customDuration && minutes === n}
                            onClick={() => {
                              setMinutes(n);
                              setCustomDuration(false);
                              draftId.current = crypto.randomUUID();
                            }}
                          >
                            {n}
                            <small> 分钟</small>
                          </button>
                        ))}
                        <button
                          type="button"
                          aria-pressed={customDuration}
                          onClick={() => setCustomDuration(true)}
                        >
                          自定
                        </button>
                      </div>
                      {customDuration && (
                        <label className="study-custom">
                          目标分钟数
                          <input
                            type="number"
                            min={1}
                            max={120}
                            required
                            value={minutes}
                            onChange={(e) => {
                              setMinutes(Number(e.target.value));
                              draftId.current = crypto.randomUUID();
                            }}
                          />
                        </label>
                      )}
                    </fieldset>
                    <button
                      className="rq-button rq-button--primary study-primary"
                      disabled={busy || !title.trim()}
                    >
                      <Feather aria-hidden="true" size={17} />{" "}
                      {busy ? "正在记下…" : "记下这项研习"}
                    </button>
                    <p className="study-clock-note">
                      手札保留学习记录。知识点请到诺亚处领取并结算学习委托。
                    </p>
                    {tasks.length > 0 && (
                      <button
                        type="button"
                        className="study-text-button"
                        onClick={() => setDraft(false)}
                      >
                        先回到上一页
                      </button>
                    )}
                  </form>
                ) : (
                  task && (
                    <>
                      {taskPlan && (
                        <button
                          className="study-text-button"
                          onClick={() => turnTo("plans")}
                        >
                          <BookOpen size={16} aria-hidden="true" />{" "}
                          {taskPlan.title}
                        </button>
                      )}
                      <h2
                        ref={taskHeading}
                        tabIndex={-1}
                        className="study-task-title"
                      >
                        {task.title}
                      </h2>
                      <p className="study-pledge">
                        留给好奇心的 <strong>{task.target_minutes} 分钟</strong>
                      </p>
                      {task.completed_at === null && (
                        <p className="study-knowledge-promise">
                          <Star size={16} aria-hidden="true" />{" "}
                          知识点来自诺亚的学习委托
                        </p>
                      )}
                      <div
                        className={`study-seal ${task.completed_at !== null ? "is-complete" : ""}`}
                      >
                        {task.completed_at !== null ? (
                          <>
                            <Check aria-hidden="true" size={22} />
                            <span>研习完成</span>
                          </>
                        ) : (
                          <>
                            <Feather aria-hidden="true" size={20} />
                            <span>
                              {task.minutes
                                ? "一点一点，读懂更多"
                                : "从这一页开始"}
                            </span>
                          </>
                        )}
                      </div>
                      <div
                        className="study-written"
                        aria-label="已记录的学习进度"
                      >
                        <span>
                          {task.minutes} / {task.target_minutes} 分钟已记入
                        </span>
                        <div
                          role="progressbar"
                          aria-label="研习进度"
                          aria-valuenow={Math.min(
                            task.minutes,
                            task.target_minutes,
                          )}
                          aria-valuemin={0}
                          aria-valuemax={task.target_minutes}
                        >
                          <i
                            style={{
                              width: `${Math.min(100, (task.minutes / task.target_minutes) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                      {recorded.length > 0 && (
                        <p className="study-earned">
                          <Leaf aria-hidden="true" size={16} /> 关联记录已获得{" "}
                          {task.earned_xp} 点学识经验
                        </p>
                      )}
                      <details className="study-records">
                        <summary>
                          这一页的记录
                          {recorded.length ? ` · ${recorded.length}` : ""}
                        </summary>
                        {recorded.length ? (
                          <ul>
                            {[...recorded].reverse().map((a) => (
                              <li key={a.id}>
                                <span>
                                  {a.source === "timer" ? "计时" : "手动"} ·{" "}
                                  {a.amount} 分钟
                                  <small>
                                    {a.date} · {a.note}
                                  </small>
                                </span>
                                <b>+{a.xp} 学识</b>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p>结束专注后，学习经历会记在这里。</p>
                        )}
                        <p>
                          计时和手动记录均不代表行为已验证。完成任务不另发经验。
                        </p>
                      </details>
                      <button
                        disabled={archived}
                        className="study-text-button"
                        onClick={() => setLinking(!linking)}
                        aria-expanded={linking}
                      >
                        已有学习记录？{linking ? "收起" : "记入这一页"}
                      </button>
                      {linking && !archived && (
                        <div className="study-link-records">
                          <p>关联 {task.date} 的记录，保留原有成长。</p>
                          {linkable.length ? (
                            linkable.map((a) => (
                              <button
                                className="rq-button"
                                key={a.id}
                                disabled={busy}
                                onClick={() =>
                                  void act("study_link", {
                                    task_id: task.id,
                                    activity_id: a.id,
                                  })
                                }
                              >
                                <span>
                                  {a.note || "学习记录"}
                                  <small>
                                    {a.source === "timer" ? "计时" : "手动"} ·{" "}
                                    {a.amount} 分钟
                                  </small>
                                </span>
                                <Plus aria-hidden="true" size={18} />
                              </button>
                            ))
                          ) : (
                            <p>这一天没有可关联的学习记录。</p>
                          )}
                        </div>
                      )}
                      <TaskCare
                        key={task.id}
                        task={task}
                        planArchived={!!taskPlan?.archived_at}
                        act={act}
                      />
                    </>
                  )
                )}
                <div className="study-traveler">
                  <PixelPerson variant={state!.character!.appearance} />
                  <span>
                    {state!.character!.name}的研习手札
                    <small>慢慢来，休息也不丢失成长。</small>
                  </span>
                </div>
              </section>
              <section
                className="study-leaf study-focus-leaf"
                aria-label="学习计时"
              >
                <span className="study-eyebrow">
                  {timer
                    ? timer.running
                      ? "为好奇心留一盏灯"
                      : "歇一会儿，书页还在"
                    : completed
                      ? "新的理解，留在旅程里"
                      : "一段安静的时光"}
                </span>
                {!draft && task && (
                  <h2 className="study-mobile-title">
                    {bound ? timer.topic : task.title}
                    <small>这项研习 · {task.target_minutes} 分钟</small>
                  </h2>
                )}
                {completed ? (
                  <div className="study-finished">
                    <BookOpen aria-hidden="true" size={72} strokeWidth={1.3} />
                    <strong>这一页，写好了</strong>
                  </div>
                ) : (
                  <>
                    <Hourglass running={!!timer?.running} />
                    <div
                      className="study-clock"
                      role="timer"
                      aria-label="本次学习已计时"
                      aria-live="off"
                    >
                      {String(Math.floor(elapsed / 60)).padStart(2, "0")}
                      <span>:</span>
                      {String(elapsed % 60).padStart(2, "0")}
                    </div>
                  </>
                )}
                <p className="study-clock-label">
                  {timer
                    ? timer.running
                      ? "专注中 · 已用时间"
                      : "已暂停"
                    : completed
                      ? "学习已记录，成长已结算"
                      : "准备好了，就翻开书吧"}
                </p>
                {completed && task && (
                  <div className="study-knowledge-reward">
                    <span role="status">
                      <Star size={20} aria-hidden="true" />
                      {task.knowledge_reward
                        ? "这一页获得了 1 知识点"
                        : "学习已记录 · 点数由现实委托结算"}
                    </span>
                    <small>
                      可用知识点 {state!.knowledge_points || 0} · 科学{" "}
                      {state!.knowledge_growth?.science || 0} · 魔法{" "}
                      {state!.knowledge_growth?.magic || 0}
                    </small>
                    <button
                      className="rq-button rq-button--primary study-primary"
                      onClick={() => turnTo("growth")}
                    >
                      翻开知识研修 <ArrowRight size={18} aria-hidden="true" />
                    </button>
                  </div>
                )}
                {timer ? (
                  <>
                    {!bound && (
                      <p className="study-other-timer">
                        正在计时：{timer.topic}
                        <small>
                          {timer.study_task_id
                            ? "结束后记入它所属的研习任务"
                            : "结束后可将这条记录关联到任务"}
                        </small>
                        {timer.study_task_id && (
                          <button
                            className="study-text-button"
                            onClick={() => choose(timer.study_task_id!)}
                          >
                            回到正在研习的一页
                          </button>
                        )}
                      </p>
                    )}
                    <div className="study-focus-actions">
                      <button
                        className="rq-button"
                        disabled={busy}
                        onClick={() =>
                          timerAction(
                            timer.running ? "timer_pause" : "timer_resume",
                          )
                        }
                      >
                        {timer.running ? (
                          <Pause aria-hidden="true" size={17} />
                        ) : (
                          <Play aria-hidden="true" size={17} />
                        )}
                        {timer.running ? "歇一会儿" : "继续研习"}
                      </button>
                      <button
                        className="rq-button rq-button--primary"
                        disabled={busy}
                        onClick={() => timerAction("timer_finish")}
                      >
                        <Square aria-hidden="true" size={15} />{" "}
                        {busy ? "正在保存…" : "结束并记下"}
                      </button>
                    </div>
                    <p className="study-clock-note">
                      {elapsed < 60
                        ? "满 1 分钟后可记入成长；现在结束不会发放奖励。"
                        : "按实际整分钟记入；达到目标后可自行结束。"}
                      <br />
                      离开或刷新后仍可继续，暂停才会停止计时。
                    </p>
                  </>
                ) : !draft && task ? (
                  <>
                    <button
                      className={
                        completed
                          ? "study-text-button"
                          : "rq-button rq-button--primary study-primary"
                      }
                      disabled={busy || archived}
                      onClick={() =>
                        task.completed_at !== null
                          ? task.plan_id
                            ? turnTo("plans")
                            : newPage()
                          : void act("timer_start", { task_id: task.id })
                      }
                    >
                      {task.completed_at !== null ? (
                        <Plus aria-hidden="true" size={18} />
                      ) : (
                        <Play aria-hidden="true" size={18} />
                      )}
                      {busy
                        ? "正在翻开书页…"
                        : archived
                          ? "书页已归档"
                          : task.completed_at !== null
                            ? task.plan_id
                              ? "收好书签，明日继续"
                              : "写下下一项研习"
                            : task.minutes
                              ? "继续这项研习"
                              : "开始研习"}
                    </button>
                    <p className="study-clock-note">
                      {archived
                        ? "先从左页取回书页或从书架取回计划。"
                        : task.completed_at !== null
                          ? task.plan_id
                            ? "每天一页。明天翻开计划，就能接着学。"
                            : "这一页已经写好，也可以回世界走走。"
                          : "可分几次完成，结束时才记入成长。"}
                    </p>
                  </>
                ) : (
                  <p className="study-clock-note">
                    先写下一项学习任务，
                    <br />
                    让今天的专注有个去处。
                  </p>
                )}
                <div className="study-world-echo">
                  <BookOpen aria-hidden="true" size={22} />
                  <div>
                    <strong>
                      {state!.attributes.wisdom >= 25
                        ? "古代符文 · 已能解读"
                        : "书页之外，还有新的发现"}
                    </strong>
                    <p>
                      {state!.attributes.wisdom >= 25
                        ? "你已满足学识条件，去图书馆东侧探索符文。"
                        : `再积累 ${25 - state!.attributes.wisdom} 点学识经验，就能解读图书馆东侧的符文。`}
                    </p>
                    {state!.attributes.wisdom >= 25 &&
                      !state!.events.includes("rune_awakened") && (
                        <button
                          className="study-text-button"
                          onClick={() => {
                            open(null);
                            useGame.getState().navigate({
                              mapId: "overworld",
                              targetId: "ruins",
                            });
                          }}
                        >
                          <MapPin aria-hidden="true" size={15} /> 标记古代遗迹{" "}
                          <ArrowRight aria-hidden="true" size={15} />
                        </button>
                      )}
                    {state!.events.includes("rune_awakened") && (
                      <small>这处符文已在旅程中解读。</small>
                    )}
                  </div>
                </div>
              </section>
            </main>
          </>
        )}
        <footer className="study-footer">
          <span>
            每个属性每日最多获得 100 点现实活动经验 · 跨天计时归结束当天
          </span>
          <button onClick={() => open("activity")}>
            记录其他成长 <ArrowRight aria-hidden="true" size={15} />
          </button>
        </footer>
        {view !== "growth" && (error || (showNotice && !completed)) && (
          <div
            className={`study-feedback ${error ? "is-error" : ""}`}
            role={error ? "alert" : "status"}
          >
            {error || notice}
            <button
              aria-label="关闭研习提示"
              onClick={() => {
                setShowNotice(false);
                useGame.setState({ error: "" });
              }}
            >
              ×
            </button>
          </div>
        )}
      </div>
    </dialog>
  );
}

function TaskCare({
  task,
  planArchived,
  act,
}: {
  task: StudyTask;
  planArchived: boolean;
  act: (action: string, data?: Record<string, unknown>) => Promise<boolean>;
}) {
  const { busy, state } = useGame();
  const [title, setTitle] = useState(task.title);
  const [minutes, setMinutes] = useState(task.target_minutes);
  const bound = state!.timer?.study_task_id === task.id;
  return (
    <details className="study-records">
      <summary>整理这一页</summary>
      {task.completed_at === null && !task.archived_at && !planArchived && (
        <form
          className="study-compose"
          onSubmit={async (e) => {
            e.preventDefault();
            await act("study_edit", {
              task_id: task.id,
              title,
              target_minutes: minutes,
            });
          }}
        >
          <label htmlFor="study-edit-title">这一页的主题</label>
          <input
            id="study-edit-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            required
            disabled={busy || bound}
          />
          <label htmlFor="study-edit-minutes">目标分钟</label>
          <input
            id="study-edit-minutes"
            type="number"
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
            min={1}
            max={120}
            required
            disabled={busy || bound}
          />
          <button className="rq-button" disabled={busy || bound}>
            保存书页修改
          </button>
        </form>
      )}
      <button
        className="study-text-button"
        disabled={busy || bound || planArchived}
        onClick={() =>
          void act("study_archive", {
            task_id: task.id,
            archived: !task.archived_at,
          })
        }
      >
        {task.archived_at ? "取回这一页" : "收进归档手记"}
      </button>
      <p>
        {bound
          ? "请先结束这一页的计时。"
          : planArchived
            ? "先从计划书架取回所属计划。"
            : "记录与成长都会保留，已完成的约定不再修改。"}
      </p>
    </details>
  );
}
