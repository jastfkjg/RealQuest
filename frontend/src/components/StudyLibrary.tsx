import { useEffect, useRef, useState } from "react";
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Feather,
  Plus,
} from "lucide-react";
import { useGame } from "../stores/game";
import type { StudyPlan } from "../types";

type Act = (action: string, data?: Record<string, unknown>) => Promise<boolean>;
export function StudyLibrary({
  mode,
  today,
  act,
  onRead,
  initialPlanId,
}: {
  mode: "plans" | "history";
  today: string;
  initialPlanId?: string | null;
  act: Act;
  onRead: (id: string) => void;
}) {
  const { state, busy } = useGame();
  const plans = state!.study_plan_log || [];
  const tasks = state!.study_task_log || [];
  const [selected, setSelected] = useState(initialPlanId || plans[0]?.id || "");
  const [archived, setArchived] = useState(
    !!plans.find((p) => p.id === initialPlanId)?.archived_at,
  );
  const [creating, setCreating] = useState(
    plans.length === 0 && mode === "plans",
  );
  const [page, setPage] = useState(0);
  const [historyId, setHistoryId] = useState(tasks[0]?.id || "");
  const heading = useRef<HTMLHeadingElement>(null);
  const visible = plans.filter((p) => Boolean(p.archived_at) === archived);
  const plan = visible.find((p) => p.id === selected) || visible[0];
  const leaves = tasks.filter((t) => t.plan_id === plan?.id);
  const historyTask = tasks.find((t) => t.id === historyId) || tasks[0];
  const current = leaves.find((t) => t.date === today);
  const running = tasks.find(
    (t) => t.id === state!.timer?.study_task_id && t.plan_id === plan?.id,
  );
  const entries = mode === "history" ? tasks : visible;
  const maxPage = Math.max(0, Math.ceil(entries.length / 6) - 1);
  const shownPage = Math.min(page, maxPage);
  useEffect(() => {
    setPage(0);
    setCreating(mode === "plans" && plans.length === 0);
  }, [mode, plans.length]);
  function revealChapter() {
    requestAnimationFrame(() => {
      heading.current?.focus({ preventScroll: true });
      if (window.matchMedia("(max-width: 650px)").matches)
        heading.current
          ?.closest(".study-chapter")
          ?.scrollIntoView({ block: "start" });
    });
  }
  async function todayPage() {
    if (!plan) return;
    if (running) {
      onRead(running.id);
      return;
    }
    if (await act("study_plan_today", { plan_id: plan.id })) {
      // Use the server date returned by the command, including a midnight rollover.
      const updated = useGame
        .getState()
        .state!.study_task_log?.find((t) => t.plan_id === plan.id);
      if (updated) onRead(updated.id);
    }
  }
  return (
    <main
      className={`study-book study-library study-library--${mode} ${creating ? "is-composing" : ""}`}
    >
      <section
        className="study-leaf study-index"
        aria-label={mode === "history" ? "手记目录" : "计划书架"}
      >
        <span className="study-eyebrow">
          <BookOpen size={16} aria-hidden="true" />{" "}
          {mode === "history" ? "每一步，都留在纸上" : "放在手边的书"}
        </span>
        <h2>{mode === "history" ? "走过的书页" : "你的研习计划"}</h2>
        {mode === "plans" && (
          <>
            <div className="study-shelf-tabs" aria-label="书架位置">
              <button
                aria-pressed={!archived}
                onClick={() => {
                  setArchived(false);
                  setPage(0);
                  setCreating(false);
                }}
              >
                正在研习
              </button>
              <button
                aria-pressed={archived}
                onClick={() => {
                  setArchived(true);
                  setPage(0);
                  setCreating(false);
                }}
              >
                已归档
              </button>
            </div>
            <nav className="study-spines" aria-label="选择研习计划">
              {visible
                .slice(shownPage * 6, shownPage * 6 + 6)
                .map((p, index) => (
                  <button
                    key={p.id}
                    aria-current={
                      !creating && plan?.id === p.id ? "page" : undefined
                    }
                    onClick={() => {
                      setSelected(p.id);
                      setCreating(false);
                      revealChapter();
                    }}
                  >
                    <span className="study-spine-number">
                      {String(shownPage * 6 + index + 1).padStart(2, "0")}
                    </span>
                    <span>{p.title}</span>
                    <BookOpen size={18} aria-hidden="true" />
                  </button>
                ))}
            </nav>
            {!visible.length && (
              <p className="study-empty">
                {archived
                  ? "暂时没有收起的计划。"
                  : "为一件想慢慢读懂的事，留一本手札。"}
              </p>
            )}
            <button
              className="study-text-button"
              disabled={busy}
              onClick={() => {
                setArchived(false);
                setCreating(true);
              }}
            >
              <Plus size={17} aria-hidden="true" /> 装订新计划
            </button>
          </>
        )}
        {mode === "history" && (
          <nav className="study-history-index" aria-label="选择往日书页">
            {tasks.slice(shownPage * 6, shownPage * 6 + 6).map((t) => (
              <button
                key={t.id}
                aria-current={historyTask?.id === t.id ? "page" : undefined}
                onClick={() => {
                  setHistoryId(t.id);
                  revealChapter();
                }}
              >
                <time>{t.date.slice(5).replace("-", " / ")}</time>
                <span>
                  {t.title}
                  <small>
                    {t.completed_at !== null ? "研习完成" : "仍可继续"}
                    {t.archived_at ? " · 已归档" : ""}
                  </small>
                </span>
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            ))}
            {!tasks.length && (
              <p className="study-empty">
                第一次研习之后，这里就会有你的故事。
              </p>
            )}
          </nav>
        )}
        {maxPage > 0 && (
          <nav className="study-pagination" aria-label="目录翻页">
            <button
              className="study-text-button"
              disabled={shownPage === 0}
              onClick={() => setPage(shownPage - 1)}
            >
              <ArrowLeft size={16} aria-hidden="true" /> 前页
            </button>
            <span>
              {shownPage + 1} / {maxPage + 1}
            </span>
            <button
              className="study-text-button"
              disabled={shownPage === maxPage}
              onClick={() => setPage(shownPage + 1)}
            >
              后页 <ArrowRight size={16} aria-hidden="true" />
            </button>
          </nav>
        )}
        <p className="study-index-note">
          休息几天也没关系。
          <br />
          书签会替你留在这里。
        </p>
      </section>
      <section
        className="study-leaf study-chapter"
        aria-label={mode === "history" ? "书页回看" : "计划章节"}
      >
        {mode === "plans" && creating ? (
          <>
            <PlanCompose
              act={act}
              onSaved={(id) => {
                setSelected(id);
                setCreating(false);
                requestAnimationFrame(() => heading.current?.focus());
              }}
            />
            {plans.length > 0 && (
              <button
                className="study-text-button"
                onClick={() => setCreating(false)}
              >
                先回到书架
              </button>
            )}
          </>
        ) : mode === "plans" && plan ? (
          <>
            <span className="study-eyebrow">
              {plan.archived_at ? "暂时收起的一段旅程" : "一章一章，慢慢读懂"}
            </span>
            <BookOpen
              className="study-chapter-art"
              size={68}
              strokeWidth={1.2}
              aria-hidden="true"
            />
            <h2 ref={heading} tabIndex={-1}>
              {plan.title}
            </h2>
            <p className="study-chapter-pledge">
              每次留出 {plan.daily_minutes} 分钟
            </p>
            {leaves[0] && (
              <p className="study-last-leaf">
                上次读到 <strong>{leaves[0].title}</strong>
                <small>
                  {leaves[0].date} · 已记下 {leaves[0].minutes} 分钟
                </small>
              </p>
            )}
            {plan.archived_at ? (
              <button
                className="rq-button rq-button--primary study-primary"
                disabled={busy}
                onClick={async () => {
                  if (
                    await act("study_plan_archive", {
                      plan_id: plan.id,
                      archived: false,
                    })
                  ) {
                    setArchived(false);
                    setSelected(plan.id);
                  }
                }}
              >
                取回这本计划
              </button>
            ) : (
              <button
                className="rq-button rq-button--primary study-primary"
                disabled={busy}
                onClick={() => void todayPage()}
              >
                <BookOpen size={18} aria-hidden="true" />
                {busy
                  ? "正在翻页…"
                  : running
                    ? "回到正在计时的一页"
                    : current
                      ? "翻开今天这一页"
                      : leaves.length
                        ? "接着写今天的一页"
                        : "翻开今日研习"}
              </button>
            )}
            {!plan.archived_at && (
              <p className="study-clock-note">
                {current?.completed_at
                  ? "今天已写好。明天回来，从这里继续。"
                  : "每天一页；以前的记录不会被覆盖。"}
              </p>
            )}
            {leaves.length > 0 && (
              <div className="study-chapter-leaves">
                <h3>最近的书页</h3>
                {leaves.slice(0, 3).map((t) => (
                  <button
                    className="study-text-button"
                    key={t.id}
                    onClick={() => onRead(t.id)}
                  >
                    {t.completed_at ? (
                      <Check size={16} aria-hidden="true" />
                    ) : (
                      <Feather size={16} aria-hidden="true" />
                    )}
                    <span>
                      {t.date} · {t.title}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {!plan.archived_at && (
              <details className="study-records" key={plan.id}>
                <summary>整理这本计划</summary>
                <PlanCompose plan={plan} act={act} onSaved={() => undefined} />
                <button
                  className="study-text-button"
                  disabled={busy || !!running}
                  onClick={async () => {
                    if (
                      await act("study_plan_archive", {
                        plan_id: plan.id,
                        archived: true,
                      })
                    )
                      setArchived(true);
                  }}
                >
                  <Archive size={16} aria-hidden="true" /> 收进归档书架
                </button>
                <p>
                  {running
                    ? "结束这本计划的计时后即可归档。"
                    : "归档保留所有记录，也可以随时取回。"}
                </p>
              </details>
            )}
          </>
        ) : mode === "history" && historyTask ? (
          <>
            <span className="study-eyebrow">
              <Feather size={16} aria-hidden="true" /> {historyTask.date} ·
              研习手记
            </span>
            <h2 ref={heading} tabIndex={-1}>
              {historyTask.title}
            </h2>
            <p className="study-chapter-pledge">
              {plans.find((p) => p.id === historyTask.plan_id)?.title ||
                "独立的一页"}
            </p>
            <div
              className={`study-seal ${historyTask.completed_at !== null ? "is-complete" : ""}`}
            >
              <Check size={20} aria-hidden="true" />
              {historyTask.completed_at !== null ? "研习完成" : "记录留存"}
            </div>
            <p>这页记下了 {historyTask.minutes} 分钟的学习。</p>
            <ul className="study-memory-records">
              {state!.activities
                .filter((a) => a.study_task_id === historyTask.id)
                .slice(-8)
                .reverse()
                .map((a) => (
                  <li key={a.id}>
                    <time>{a.date}</time>
                    <p>{a.note || historyTask.title}</p>
                    <small>
                      {a.source === "timer" ? "计时" : "手动"} · {a.amount} 分钟
                      · 已结算 {a.xp} 学识
                    </small>
                  </li>
                ))}
            </ul>
            {!historyTask.record_count && (
              <p className="study-empty">这一页还没有学习记录。</p>
            )}
            <button
              className="rq-button study-primary"
              onClick={() => onRead(historyTask.id)}
            >
              翻开这一页 <ArrowRight size={17} aria-hidden="true" />
            </button>
            <p className="study-clock-note">回看与归档不会再次结算成长。</p>
          </>
        ) : (
          <div className="study-library-empty">
            <BookOpen size={72} strokeWidth={1.1} aria-hidden="true" />
            <p>书页还在，等你慢慢写下。</p>
          </div>
        )}
      </section>
    </main>
  );
}

function PlanCompose({
  plan,
  act,
  onSaved,
}: {
  plan?: StudyPlan;
  act: Act;
  onSaved: (id: string) => void;
}) {
  const busy = useGame((s) => s.busy);
  const [title, setTitle] = useState(plan?.title || "");
  const [minutes, setMinutes] = useState(plan?.daily_minutes || 25);
  const id = useRef(crypto.randomUUID());
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!plan) input.current?.focus();
  }, [plan]);
  return (
    <form
      className="study-compose study-plan-compose"
      onSubmit={async (e) => {
        e.preventDefault();
        const key = plan?.id || id.current;
        if (
          await act(plan ? "study_plan_edit" : "study_plan_create", {
            plan_id: key,
            title,
            daily_minutes: minutes,
          })
        )
          onSaved(key);
      }}
    >
      {!plan && (
        <>
          <span className="study-eyebrow">
            <Feather size={16} aria-hidden="true" /> 装订一段新旅程
          </span>
          <h2>有什么，想慢慢读懂？</h2>
        </>
      )}
      <label htmlFor={plan ? "plan-edit-title" : "plan-title"}>计划名称</label>
      <input
        ref={input}
        id={plan ? "plan-edit-title" : "plan-title"}
        value={title}
        placeholder="例如：读完一本植物图鉴"
        maxLength={80}
        required
        autoComplete="off"
        disabled={busy}
        onChange={(e) => {
          setTitle(e.target.value);
          id.current = crypto.randomUUID();
        }}
      />
      <fieldset disabled={busy}>
        <legend>每天想留出的时间</legend>
        <div className="study-durations">
          {[5, 15, 25].map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={minutes === n}
              onClick={() => {
                setMinutes(n);
                id.current = crypto.randomUUID();
              }}
            >
              {n}
              <small> 分钟</small>
            </button>
          ))}
        </div>
        <label className="study-custom">
          自定分钟
          <input
            type="number"
            min={1}
            max={120}
            required
            value={minutes}
            onChange={(e) => {
              setMinutes(Number(e.target.value));
              id.current = crypto.randomUUID();
            }}
          />
        </label>
      </fieldset>
      <button
        className="rq-button rq-button--primary study-primary"
        disabled={busy || !title.trim()}
      >
        <Feather size={17} aria-hidden="true" />
        {busy ? "正在记下…" : plan ? "保存计划修改" : "装订这本计划"}
      </button>
      <p className="study-clock-note">
        {plan
          ? "名称与默认时长只影响计划和新书页，旧记录保持原样。"
          : "没有截止日期，也不用每天重新填写。"}
      </p>
    </form>
  );
}
