import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  Clock3,
  Footprints,
  Hammer,
  MapPin,
  Sprout,
  X,
} from "lucide-react";
import { serverNow, useGame, activityNames } from "../stores/game";
import { api } from "../services/api";
import type { LifeTask } from "../types";

const paths = {
  study: {
    name: "学习",
    point: "知识点",
    icon: BookOpen,
    line: "给好奇心留一段时间。",
  },
  exercise: {
    name: "运动",
    point: "健康点",
    icon: Footprints,
    line: "让现实中的脚步，也带来成长。",
  },
  work: {
    name: "工作",
    point: "技能点",
    icon: Hammer,
    line: "专心完成手头的一件事。",
  },
};
const stamp = (seconds: number) =>
  new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(seconds * 1000);
function useClock() {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    const id = setInterval(() => setNow(serverNow()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}
export function NoahMarker() {
  const { open, navigate } = useGame();
  return (
    <button
      className="rq-button"
      onClick={() => {
        open(null);
        navigate({ mapId: "overworld", targetId: "noah" });
      }}
    >
      <MapPin size={17} aria-hidden="true" /> 标记诺亚的位置
    </button>
  );
}
function Quota() {
  const journal = useGame((s) => s.state?.life_journal);
  if (!journal) return null;
  return (
    <div className="life-quota">
      <span>
        今日成长{" "}
        <b>
          {journal.claimed} / {journal.limit}
        </b>
      </span>
      <span className="life-seeds" aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => (
          <i
            key={i}
            data-state={
              i < journal.claimed
                ? "claimed"
                : i < journal.claimed + journal.reserved
                  ? "reserved"
                  : "free"
            }
          >
            <Sprout size={18} />
          </i>
        ))}
      </span>
      <small>
        {journal.reserved ? `进行中预留 ${journal.reserved} 点 · ` : ""}还可领取{" "}
        {journal.remaining} 点
      </small>
    </div>
  );
}
function Countdown({ task, now }: { task: LifeTask; now: number }) {
  const remaining = Math.max(0, Math.ceil(task.ready_at - now));
  const value = [
    Math.floor(remaining / 3600),
    Math.floor((remaining % 3600) / 60),
    remaining % 60,
  ]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
  return (
    <div className="life-clock">
      <Clock3 size={22} aria-hidden="true" />
      <div>
        <strong>{remaining ? value : "约定时间已到"}</strong>
        <small>
          {remaining ? "距可结算还有" : "可以找诺亚结算了"} ·{" "}
          {stamp(task.ready_at)} 起
        </small>
      </div>
    </div>
  );
}
function CancelTask({
  task,
  act,
}: {
  task: LifeTask;
  act: (action: string, data: Record<string, unknown>) => Promise<boolean>;
}) {
  const busy = useGame((s) => s.busy);
  const [confirm, setConfirm] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (confirm) first.current?.focus();
  }, [confirm]);
  const back = () => {
    setConfirm(false);
    requestAnimationFrame(() => button.current?.focus());
  };
  return (
    <div
      className="life-cancel"
      onKeyDown={(e) => {
        if (e.key === "Escape" && confirm) {
          e.preventDefault();
          e.stopPropagation();
          back();
        }
      }}
    >
      {confirm ? (
        <div role="group" aria-label="确认取消委托">
          <p>取消这份约定？本次不获点数，预留的 {task.hours} 点额度将释放。</p>
          <div className="life-actions">
            <button
              ref={first}
              className="rq-button"
              disabled={busy}
              onClick={back}
            >
              继续这份约定
            </button>
            <button
              className="rq-button life-danger"
              disabled={busy}
              onClick={() => void act("life_cancel", { task_id: task.id })}
            >
              {busy ? "正在取消…" : "确认取消委托"}
            </button>
          </div>
        </div>
      ) : (
        <button
          ref={button}
          className="life-text-button"
          disabled={busy}
          onClick={() => setConfirm(true)}
        >
          <X size={16} aria-hidden="true" />
          取消这份委托
        </button>
      )}
    </div>
  );
}
function useAction() {
  const command = useGame((s) => s.command);
  return async (action: string, data: Record<string, unknown>) => {
    const ok = await command(action, data);
    if (
      !ok &&
      /fetch|NetworkError|Load failed|timeout/i.test(useGame.getState().error)
    )
      useGame.setState({ error: "暂时连不上村庄。约定的选择仍保留，请重试。" });
    if (!ok)
      await api("state")
        .then((r) => useGame.getState().accept(r))
        .catch(() => undefined);
    return ok;
  };
}
export function LifeQuestDialogue() {
  const { state, busy, open } = useGame();
  const act = useAction();
  const now = useClock();
  const [kind, setKind] = useState<LifeTask["kind"]>("study");
  const [hours, setHours] = useState(1);
  const [receipt, setReceipt] = useState<LifeTask | null>(null);
  const draft = useRef(crypto.randomUUID());
  const heading = useRef<HTMLHeadingElement>(null);
  const journal = state?.life_journal;
  const active = journal?.tasks.find((t) => t.status === "active");
  const remaining = journal?.remaining ?? 0;
  const duration = Math.max(1, Math.min(hours, remaining));
  useEffect(() => {
    heading.current?.focus();
  }, [active?.id, receipt?.id]);
  if (!journal) return <p>正在翻开委托册，请稍候…</p>;
  async function accept() {
    if (
      await act("life_accept", {
        target: "noah",
        task_id: draft.current,
        kind,
        hours: duration,
      })
    ) {
      draft.current = crypto.randomUUID();
      setReceipt(null);
    }
  }
  return (
    <section className="life-conversation" aria-label="现实委托">
      <span className="life-eyebrow">诺亚的现实委托</span>
      <h3 ref={heading} tabIndex={-1}>
        {active
          ? "约定在身，安心去做吧"
          : receipt
            ? "这份成长，我替你记下了"
            : remaining
              ? "今天，想在哪条路上前进一步？"
              : "今天的五枚成长印记，集齐了"}
      </h3>
      <Quota />
      {receipt && !active && (
        <div className="life-receipt" role="status">
          <Check size={25} aria-hidden="true" />
          <div>
            <strong>
              +{receipt.hours} {paths[receipt.kind].point}
            </strong>
            <p>
              {paths[receipt.kind].name}委托已结算 · {receipt.hours} 小时
            </p>
          </div>
        </div>
      )}
      {active ? (
        <>
          <p className="life-promise">
            <strong>
              {paths[active.kind].name} · {active.hours} 小时
            </strong>
            <span>
              完成后获得 {active.hours} {paths[active.kind].point}
            </span>
          </p>
          <Countdown task={active} now={now} />
          <p>去专心做约定的事吧。离开村庄或关闭页面，时间都会继续。</p>
          <button
            className="rq-button rq-button--primary life-main-action"
            disabled={busy || now < active.ready_at}
            onClick={async () => {
              if (
                await act("life_claim", { target: "noah", task_id: active.id })
              )
                setReceipt(active);
            }}
          >
            {busy
              ? "正在结算…"
              : now < active.ready_at
                ? "约定时间未到，暂不可结算"
                : `结算委托 · 领取 ${active.hours} ${paths[active.kind].point}`}
          </button>
          <CancelTask key={active.id} task={active} act={act} />
        </>
      ) : remaining > 0 ? (
        <>
          <div
            className="life-paths"
            role="group"
            aria-label="选择现实任务类型"
          >
            {Object.entries(paths).map(([id, path]) => {
              const Icon = path.icon;
              return (
                <button
                  key={id}
                  disabled={busy}
                  aria-pressed={kind === id}
                  onClick={() => {
                    setKind(id as LifeTask["kind"]);
                    draft.current = crypto.randomUUID();
                  }}
                >
                  <Icon size={23} aria-hidden="true" />
                  <strong>{path.name}</strong>
                  <small>{path.point}</small>
                </button>
              );
            })}
          </div>
          <p className="life-choice-line">
            “{paths[kind].line}你想为它留几个小时？”
          </p>
          <div className="life-hours" role="group" aria-label="选择委托时长">
            {Array.from({ length: remaining }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                aria-label={`${n} 小时`}
                disabled={busy}
                aria-pressed={duration === n}
                onClick={() => {
                  setHours(n);
                  draft.current = crypto.randomUUID();
                }}
              >
                {n}
                <small>小时</small>
              </button>
            ))}
          </div>
          <p className="life-summary">
            约定{" "}
            <strong>
              {duration} 小时{paths[kind].name}
            </strong>
            ，结算{" "}
            <strong>
              {duration} {paths[kind].point}
            </strong>
            <small>领取后开始计时 · 每日三类合计最多 5 点</small>
          </p>
          <button
            className="rq-button rq-button--primary life-main-action"
            disabled={busy}
            onClick={() => void accept()}
          >
            {busy ? "正在记下约定…" : "就这么约定 · 领取委托"}
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </>
      ) : (
        <div className="life-rest">
          <Sprout size={32} aria-hidden="true" />
          <p>
            辛苦了，剩下的时间留给自己。
            <br />
            明天零点后，再来约定新的旅程。
          </p>
          <button className="rq-button" onClick={() => open("activity")}>
            翻看成长手记
          </button>
        </div>
      )}
      <small className="life-rules">
        中国标准时间 · 每小时 1 点 · 取消不获点数
        <br />
        跨天归领取日；结算检查等待时间，不验证现实行为。
      </small>
    </section>
  );
}
export function LifeQuestHistory() {
  const { state, open } = useGame();
  const act = useAction();
  const now = useClock();
  const journal = state?.life_journal;
  const active = journal?.tasks.find((t) => t.status === "active");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  if (!state) return null;
  const closed = (journal?.tasks || []).filter(
    (t) => t.status !== "active" && (filter === "all" || t.status === filter),
  );
  return (
    <div className="life-journal">
      <header className="life-journal-intro">
        <div>
          <span className="life-eyebrow">HEARTHWOOD · 成长手记</span>
          <h3>现实里的努力，旅途中的回响</h3>
          <p>与河岸的诺亚约定一段时间，回来收下成长。</p>
        </div>
        <NoahMarker />
      </header>
      <div className="life-wallet" aria-label="成长点数">
        <span>
          <BookOpen size={18} aria-hidden="true" />
          知识点 <b>{state.knowledge_points || 0}</b>
        </span>
        <span>
          <Footprints size={18} aria-hidden="true" />
          健康点 <b>{state.health_points || 0}</b>
        </span>
        <span>
          <Hammer size={18} aria-hidden="true" />
          技能点 <b>{state.skill_points || 0}</b>
        </span>
      </div>
      <Quota />
      {active && (
        <section className="life-current" aria-label="当前现实委托">
          <span className="life-eyebrow">尚未落款的约定</span>
          <div className="life-current-heading">
            <h3>
              {paths[active.kind].name} · {active.hours} 小时
            </h3>
            <span>
              {active.hours} {paths[active.kind].point}
            </span>
          </div>
          <Countdown task={active} now={now} />
          <p>领取于 {stamp(active.accepted_at)} · 到期后找诺亚结算</p>
          <CancelTask task={active} act={act} />
        </section>
      )}
      <section className="life-memories" aria-label="历史现实任务">
        <div className="life-history-heading">
          <h3>已经走过的路</h3>
          <div role="group" aria-label="筛选任务记录">
            {[
              ["all", "全部"],
              ["claimed", "已结算"],
              ["cancelled", "已取消"],
            ].map(([id, label]) => (
              <button
                key={id}
                aria-pressed={filter === id}
                onClick={() => {
                  setFilter(id);
                  setPage(1);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {closed.length ? (
          <ol>
            {closed.slice(0, page * 10).map((task) => {
              const Icon = paths[task.kind].icon;
              return (
                <li key={task.id}>
                  <Icon size={24} aria-hidden="true" />
                  <div>
                    <strong>
                      {paths[task.kind].name}委托 · {task.hours} 小时
                    </strong>
                    <small>
                      {stamp(task.accepted_at)} 领取 →{" "}
                      {stamp(task.claimed_at ?? task.cancelled_at!)}{" "}
                      {task.status === "claimed" ? "结算" : "取消"}
                    </small>
                    <small>归属 {task.date} · 现实委托 / 等待计时</small>
                  </div>
                  <span
                    className="life-record-stamp"
                    data-cancelled={task.status === "cancelled"}
                  >
                    {task.status === "claimed"
                      ? `+${task.reward} ${paths[task.kind].point}`
                      : "已取消 · 0 点"}
                  </span>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="life-empty">
            {filter === "all"
              ? "手记里还没有结束的委托。和诺亚聊聊，让今天留下第一枚印记。"
              : "还没有这类记录。"}
          </p>
        )}
        {closed.length > page * 10 && (
          <button className="rq-button" onClick={() => setPage((p) => p + 1)}>
            再翻十条记录
          </button>
        )}
      </section>
      <footer className="life-journal-footer">
        <button
          className="life-text-button"
          onClick={() => {
            useGame.setState({ studyEntry: "growth" });
            open("study");
          }}
        >
          知识研修 <ArrowRight size={16} aria-hidden="true" />
        </button>
        <button className="life-text-button" onClick={() => open("training")}>
          体力培养 <ArrowRight size={16} aria-hidden="true" />
        </button>
        <small>技能点已存入旅程，后续用于技能成长。</small>
      </footer>
      {(state.activities.length > 0 ||
        (state.study_task_log || []).length > 0 ||
        (state.exercise_task_log || []).length > 0) && (
        <details className="life-legacy">
          <summary>翻阅旧日记录</summary>
          <p>旧记录与已获奖励仍保留；旧手记不再发放成长点数。</p>
          <button className="rq-button" onClick={() => open("study")}>
            打开旧研习手札
          </button>
          {state.activities
            .slice()
            .reverse()
            .map((a, i) => (
              <p key={a.id || i}>
                {a.date} · {a.note || activityNames[a.kind]} · {a.amount}{" "}
                {a.kind === "steps"
                  ? "步"
                  : a.kind === "management"
                    ? "次"
                    : "分钟"}{" "}
                · {a.source === "timer" ? "计时" : "手动记录"} · {a.xp} EXP
              </p>
            ))}
        </details>
      )}
      <p className="life-rules">
        每日上限按领取日计算（中国标准时间）。取消释放预留额度，已结算点数不会因使用而恢复额度。
      </p>
    </div>
  );
}
