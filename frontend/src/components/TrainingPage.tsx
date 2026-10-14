import { NoahMarker } from "./LifeQuests";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Leaf, Moon } from "lucide-react";
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
  const recordingLock = useRef(false);
  const tasks = state!.exercise_task_log || [];
  const today = new Date(now * 1000).toLocaleDateString("en-CA", {
    timeZone: "Asia/Shanghai",
  });
  const current = staminaNow(state!, now),
    max = state!.stamina?.max || 100;
  const points = state!.health_points || 0;
  const gain = state!.stamina_rules?.capacity_per_point || 5;
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
            <span>现实委托 · 体力培养</span>
            <span>{today}</span>
          </div>
          <h2 ref={heading} tabIndex={-1}>
            把成长带上旅途
          </h2>
          <section className="training-progress">
            <p>
              到河岸找诺亚，领取运动委托。每小时结算 1
              健康点；学习、运动、工作每日合计最多 5 点。
            </p>
            <NoahMarker />
            <button className="training-link" onClick={() => open("activity")}>
              翻看现实委托记录
            </button>
          </section>
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
                    : "结算运动委托，获得健康点"}
              </button>
            </div>
          </section>
          {notice && noticePanel === "training" && (
            <p className="training-message" role="status">
              {notice}
            </p>
          )}
          {tasks.length > 0 && (
            <details className="training-details training-history">
              <summary>旧日锻炼约定</summary>
              <p>旧记录保留，新健康点请通过诺亚的委托获得。</p>
              {tasks.map((t) => (
                <p key={t.id}>
                  {t.date} · {t.title} · {t.minutes} / {t.target_minutes} 分钟 ·{" "}
                  {t.completed_at ? "已达成" : "未完成"}
                </p>
              ))}
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
