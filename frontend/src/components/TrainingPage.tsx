import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Footprints,
  Leaf,
  Link,
  Moon,
  Plus,
} from "lucide-react";
import { serverNow, useGame } from "../stores/game";
import { api } from "../services/api";
import { staminaNow } from "../game/stamina";
import { PixelPerson } from "./PixelPerson";
import { chime, unlockSound } from "../game/feel";

export function TrainingPage() {
  const { state, open, command, busy, error, notice, noticePanel, navigate } =
    useGame();
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef(document.activeElement);
  const heading = useRef<HTMLHeadingElement>(null);
  const [now, setNow] = useState(serverNow);
  const [title, setTitle] = useState("散步与舒展");
  const [target, setTarget] = useState(10);
  const [selected, setSelected] = useState("");
  const [recording, setRecording] = useState(false);
  const [minutes, setMinutes] = useState("");
  const recordId = useRef(crypto.randomUUID());
  const recordingLock = useRef(false);
  const tasks = state!.exercise_task_log || [];
  const today = new Date(now * 1000).toLocaleDateString("en-CA", {
    timeZone: "Asia/Shanghai",
  });
  const task = tasks.find((t) => t.id === (selected || `exercise-${today}`));
  const done = task?.completed_at != null;
  const current = staminaNow(state!, now),
    max = state!.stamina?.max || 100;
  const points = state!.health_points || 0;
  const gain = state!.stamina_rules?.capacity_per_point || 5;
  const linkable = task
    ? state!.activities.filter(
        (a) =>
          a.kind === "exercise" && a.date === task.date && !a.exercise_task_id,
      )
    : [];
  const old = task && task.date < today;
  const canRecord =
    !task ||
    new Date(`${today}T00:00:00+08:00`).getTime() -
      new Date(`${task.date}T00:00:00+08:00`).getTime() <=
      7 * 86400000;
  useEffect(() => {
    dialog.current?.showModal();
    heading.current?.focus();
    const interval = setInterval(() => setNow(serverNow()), 1000);
    return () => {
      clearInterval(interval);
      requestAnimationFrame(() => {
        if (
          opener.current instanceof HTMLElement &&
          opener.current !== document.body &&
          opener.current.isConnected
        )
          opener.current.focus();
        else
          document
            .querySelector<HTMLButtonElement>(
              '.nav-actions [aria-label="现实成长"]',
            )
            ?.focus();
      });
    };
  }, []);
  useEffect(() => {
    setRecording(false);
    setMinutes("");
    recordId.current = crypto.randomUUID();
  }, [task?.id]);
  async function act(action: string, data: Record<string, unknown>) {
    if (recordingLock.current) return false;
    recordingLock.current = true;
    unlockSound();
    try {
      const ok = await command(action, data);
      if (ok) {
        chime(action === "health_spend" ? "reward" : "interact");
        if (action === "exercise_link" || action === "health_spend")
          heading.current?.focus();
      } else
        await api("state")
          .then((r) => useGame.getState().accept(r))
          .catch(() => undefined);
      return ok;
    } finally {
      recordingLock.current = false;
    }
  }
  async function record(event: React.FormEvent) {
    event.preventDefault();
    if (
      await act("exercise_record", {
        task_id: task!.id,
        activity_id: recordId.current,
        minutes: Number(minutes),
      })
    ) {
      setRecording(false);
      setMinutes("");
      recordId.current = crypto.randomUUID();
      heading.current?.focus();
    }
  }
  function choose(id: string) {
    setSelected(id);
    heading.current?.focus();
  }
  function markBed() {
    open(null);
    navigate({ mapId: "home", targetId: "home_bed" });
  }
  return (
    <dialog
      ref={dialog}
      className="training-page rq-theme"
      aria-labelledby="training-title"
      onCancel={() => open(null)}
      onKeyDown={(e) => {
        if (e.key !== "Tab") return;
        const controls = Array.from(
          e.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled),input:not(:disabled),summary,[tabindex="0"]',
          ),
        ).filter((el) => el.getClientRects().length);
        const first = controls[0],
          last = controls.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }}
    >
      <header className="training-header">
        <button className="rq-button" onClick={() => open(null)}>
          <ArrowLeft size={18} aria-hidden="true" /> 返回旅途
        </button>
        <span>现实中的脚步 · 旅途中的力量</span>
        <span className="training-date">
          {today.slice(5).replace("-", " / ")}
        </span>
      </header>
      <div className="training-spread">
        <aside className="training-journey" aria-label="旅人体力">
          <div className="training-caption">
            <span>HEARTHWOOD · FIELD NOTES</span>
            <h1 id="training-title">行前手札</h1>
            <p>为下一次远行，积攒一点力量。</p>
          </div>
          <div className="training-scenery" aria-hidden="true">
            <div className="training-traveler">
              <PixelPerson variant={state!.character!.appearance} />
            </div>
            <span className="training-sign">小屋外的路，还很长</span>
          </div>
          <div className="training-stamina">
            <span>
              <Leaf size={20} aria-hidden="true" /> {state!.character!.name}
              的体力{" "}
              <b>
                {current}
                <small> / {max}</small>
              </b>
            </span>
            <div
              role="progressbar"
              aria-label="当前体力"
              aria-valuemin={0}
              aria-valuemax={max}
              aria-valuenow={current}
            >
              <i style={{ transform: `scaleX(${current / max})` }} />
            </div>
            <p>
              {current < 6
                ? "先歇歇脚吧，走路和交谈仍然自由。"
                : "带上这份精神，去林间走走。"}
            </p>
          </div>
          <div className="training-rest">
            <Moon size={20} aria-hidden="true" />
            <div>
              <strong>一张床，一场好觉</strong>
              <p>回家睡觉补满体力。离线也会自然恢复，每小时 5 点。</p>
              <button className="training-link" onClick={markBed}>
                标记家里的床 <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        </aside>
        <main className="training-leaf">
          <div className="training-leaf-top">
            <span>每日约定</span>
            <span>{task?.date || today} · 中国标准时间</span>
          </div>
          <h2 ref={heading} tabIndex={-1}>
            {done
              ? "这一步，已经留下回响"
              : task
                ? task.title
                : "今天，想怎样动一动？"}
          </h2>
          {!task ? (
            <form
              className="training-pledge"
              onSubmit={async (e) => {
                e.preventDefault();
                if (
                  await act("exercise_prepare", {
                    title,
                    target_minutes: target,
                    date: today,
                  })
                )
                  heading.current?.focus();
              }}
            >
              <p>选一个适合自己的约定，完成后收下健康点。</p>
              <div
                className="training-choices"
                role="group"
                aria-label="选择锻炼约定"
              >
                {["散步与舒展", "一次喜欢的运动", "按自己的节奏"].map(
                  (name, i) => (
                    <button
                      key={name}
                      type="button"
                      aria-pressed={title === name}
                      onClick={() => setTitle(name)}
                    >
                      <span className="training-choice-number">0{i + 1}</span>
                      <span>{name}</span>
                      {title === name ? (
                        <Check size={19} aria-hidden="true" />
                      ) : (
                        <Plus size={19} aria-hidden="true" />
                      )}
                    </button>
                  ),
                )}
              </div>
              <div
                className="training-duration"
                role="group"
                aria-label="约定时长"
              >
                {[10, 20, 30].map((n) => (
                  <button
                    className="rq-button"
                    type="button"
                    key={n}
                    aria-pressed={target === n}
                    onClick={() => setTarget(n)}
                  >
                    {n} 分钟
                  </button>
                ))}
              </div>
              <details className="training-details">
                <summary>亲手写下约定 · 自定时长</summary>
                <label>
                  约定名称
                  <input
                    value={title}
                    maxLength={80}
                    required
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </label>
                <label>
                  约定分钟数
                  <input
                    type="number"
                    min={1}
                    max={120}
                    required
                    value={target}
                    onChange={(e) => setTarget(Number(e.target.value))}
                  />
                </label>
              </details>
              <button
                className="rq-button rq-button--primary training-primary"
                disabled={busy}
              >
                {busy ? "正在写入…" : `立下今日约定 · ${target} 分钟`}
                <Footprints size={18} aria-hidden="true" />
              </button>
              <small>每天一项，完成获得 1 健康点。休息不会扣除成长。</small>
            </form>
          ) : (
            <section className="training-promise" aria-label="当前锻炼约定">
              {done ? (
                <div className="training-finished">
                  <span className="training-seal">
                    <Check size={32} aria-hidden="true" />
                    约定达成
                  </span>
                  <div>
                    <strong>{task.title}</strong>
                    <p>已获得 1 健康点</p>
                    <small>来自你亲手记录的 {task.minutes} 分钟运动</small>
                  </div>
                </div>
              ) : (
                <>
                  <p>
                    {old
                      ? "这页约定留在原来的日期，不会因跨天失去进度。"
                      : "完成现实中的运动后，回来记下一笔。可以分次完成。"}
                  </p>
                  <div className="training-path" aria-hidden="true">
                    {Array.from({ length: 6 }, (_, i) => (
                      <span
                        key={i}
                        data-done={
                          task.minutes / task.target_minutes >= (i + 1) / 6
                        }
                      >
                        <Footprints size={22} />
                      </span>
                    ))}
                  </div>
                  <div className="training-progress">
                    <span>
                      已记录 <b>{task.minutes}</b> / {task.target_minutes} 分钟
                    </span>
                    <span>
                      完成后 <b>＋1 健康点</b>
                    </span>
                  </div>
                  {!recording ? (
                    <button
                      className="rq-button rq-button--primary training-primary"
                      disabled={busy || !canRecord}
                      onClick={() => setRecording(true)}
                    >
                      记下一次锻炼 <Plus size={18} aria-hidden="true" />
                    </button>
                  ) : (
                    <form className="training-record" onSubmit={record}>
                      <label>
                        这次实际运动了多久？
                        <span>
                          <input
                            aria-label="实际运动分钟数"
                            autoFocus
                            type="number"
                            min={1}
                            max={480}
                            value={minutes}
                            required
                            onChange={(e) => setMinutes(e.target.value)}
                          />{" "}
                          分钟
                        </span>
                      </label>
                      <small>
                        手动记录 · 记在 {task.date} · 不代表系统验证
                      </small>
                      <div>
                        <button
                          className="rq-button rq-button--primary"
                          disabled={busy}
                        >
                          {busy ? "正在保存…" : "保存运动记录"}
                        </button>
                        <button
                          type="button"
                          className="rq-button"
                          disabled={busy}
                          onClick={() => setRecording(false)}
                        >
                          暂不记录
                        </button>
                      </div>
                    </form>
                  )}
                  {!canRecord && (
                    <p>
                      这页已超过七天补记期限，仍为你保留。今天可以开启新约定。
                    </p>
                  )}
                  <details className="training-details">
                    <summary>
                      <Link size={16} aria-hidden="true" />{" "}
                      关联当天已有的运动记录
                      {linkable.length ? `（${linkable.length}）` : ""}
                    </summary>
                    {linkable.length ? (
                      linkable.map((a) => (
                        <button
                          key={a.id}
                          className="training-record-link"
                          disabled={busy}
                          onClick={() =>
                            void act("exercise_link", {
                              task_id: task.id,
                              activity_id: a.id,
                            })
                          }
                        >
                          <span>
                            {a.note || "运动"}
                            <small>{a.amount} 分钟 · 手动记录</small>
                          </span>
                          <span>
                            装订进这页{" "}
                            <ArrowRight size={16} aria-hidden="true" />
                          </span>
                        </button>
                      ))
                    ) : (
                      <p>当天没有尚未关联的运动记录。</p>
                    )}
                    <small>关联只推进约定，不重复获得活动经验。</small>
                  </details>
                </>
              )}
              {old && (
                <button className="training-link" onClick={() => choose("")}>
                  翻到今天 <ArrowRight size={16} aria-hidden="true" />
                </button>
              )}
            </section>
          )}
          {error && (
            <p className="training-message training-error" role="alert">
              {/Failed to fetch|NetworkError|Load failed/i.test(error)
                ? "暂时连接不上。填写的内容还在，请重试；已保存的进度会自动核对。"
                : error}
            </p>
          )}
          <section className="training-cultivate" aria-label="体力培养">
            <div className="training-token" aria-hidden="true">
              <Leaf size={30} />
              <b>{points}</b>
            </div>
            <div>
              <span>可用健康点 · {points}</span>
              <h3>让脚步更从容</h3>
              <p>
                体力上限{" "}
                <b>
                  {max} → {max + gain}
                </b>
              </p>
              <small>投入 1 点，上限与当前体力各增加 {gain}。</small>
              <button
                className="rq-button rq-button--primary"
                disabled={busy || points < 1}
                onClick={() =>
                  void act("health_spend", {
                    expected_invested: state!.health_invested || 0,
                  })
                }
              >
                {busy
                  ? "正在结算…"
                  : points
                    ? "投入 1 健康点 · 提升体力"
                    : done && task?.date === today
                      ? "今日已达成，明天再来"
                      : "完成约定，获得健康点"}
              </button>
            </div>
          </section>
          {notice && noticePanel === "training" && (
            <p className="training-message" role="status">
              {notice}
            </p>
          )}
          {!!tasks.length && (
            <details className="training-details training-history">
              <summary>翻阅以前的约定</summary>
              {tasks.map((t) => (
                <button
                  key={t.id}
                  className="training-record-link"
                  onClick={() => choose(t.id)}
                  aria-pressed={task?.id === t.id}
                >
                  <span>
                    {t.title}
                    <small>{t.date}</small>
                  </span>
                  <span>
                    {t.completed_at
                      ? "已达成"
                      : `${t.minutes} / ${t.target_minutes} 分钟`}
                  </span>
                </button>
              ))}
              {old && (
                <button className="training-link" onClick={() => choose("")}>
                  回到今天
                </button>
              )}
            </details>
          )}
          <div className="training-mobile-rest">
            <p>回家睡觉补满体力。离线也会恢复，每小时 5 点。</p>
            <button className="training-link" onClick={markBed}>
              <Moon size={16} aria-hidden="true" /> 标记家里的床
            </button>
          </div>
        </main>
      </div>
    </dialog>
  );
}
