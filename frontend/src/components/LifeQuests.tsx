import { useEffect, useRef, useState, type RefObject } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  Clock3,
  Footprints,
  Hammer,
  MapPin,
  Leaf,
  ScrollText,
  Sprout,
  X,
} from "lucide-react";
import { serverNow, useGame, activityNames } from "../stores/game";
import { api } from "../services/api";
import type { LifeTask } from "../types";
import { CommissionIcon } from "./CommissionIcon";
import { ContractHourglass } from "./ContractHourglass";

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
export function LifeQuota() {
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
function CommissionRules() {
  return (
    <details
      className="life-commission-rules"
      onKeyDown={(event) => {
        if (event.key === "Escape" && event.currentTarget.open) {
          event.preventDefault();
          event.stopPropagation();
          event.currentTarget.open = false;
          event.currentTarget.querySelector("summary")?.focus();
        }
      }}
    >
      <summary>
        <ScrollText size={17} aria-hidden="true" />
        委托规则
      </summary>
      <div>
        <p>
          每小时 1 点，学习、运动、工作每日合计最多 5
          点；同一时间只能进行一份委托。
        </p>
        <p>
          领取时预留额度，取消不获点数并释放预留。按中国标准时间的领取日计算额度，跨天仍可结算。
        </p>
        <p>
          关闭页面仍继续计时。到时回诺亚身边结算；等待时间不代表现实行为已被验证。
        </p>
      </div>
    </details>
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
function CommissionContract({
  task,
  now,
  busy,
  heading,
  claim,
  act,
}: {
  task: LifeTask;
  now: number;
  busy: boolean;
  heading: RefObject<HTMLHeadingElement | null>;
  claim: () => Promise<void>;
  act: (action: string, data: Record<string, unknown>) => Promise<boolean>;
}) {
  const open = useGame((s) => s.open);
  const seconds = Math.max(
    0,
    Math.min(task.hours * 3600, Math.ceil(task.ready_at - now)),
  );
  const ready = seconds === 0;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const time = `${hours ? `${hours}小时` : ""}${minutes}分${String(seconds % 60).padStart(2, "0")}秒`;
  const title =
    task.kind === "study" ? "研习" : task.kind === "exercise" ? "活力" : "专注";
  const number = ["", "一", "两", "三", "四", "五"][task.hours] || task.hours;
  return (
    <section
      className="life-contract-conversation"
      aria-label="现实委托"
      data-ready={ready}
    >
      <div className="life-contract-scroll">
        <div className="contract-ribbon" role="status" aria-atomic="true">
          <Leaf size={20} aria-hidden="true" />
          {ready ? "可结算" : "进行中"}
        </div>
        <header className="contract-heading">
          <span>与诺亚的约定</span>
          <h3 ref={heading} tabIndex={-1}>
            {number}小时的{title}
          </h3>
          <p>
            {paths[task.kind].name}委托 · 约定 {task.hours} 小时
          </p>
        </header>
        <div className="contract-stage">
          <div className="contract-signature">
            <p>
              {ready ? (
                <>
                  约定时间到了，
                  <br />
                  回来收下这份成长吧。
                </>
              ) : (
                <>
                  约定已记下，
                  <br />
                  安心去做吧。
                </>
              )}
            </p>
            <span>
              <Leaf size={19} aria-hidden="true" />— 诺亚
            </span>
          </div>
          <div className="contract-hourglass-wrap">
            <ContractHourglass
              remainingRatio={Math.max(
                0,
                Math.min(
                  1,
                  (task.ready_at - now) /
                    Math.max(1, task.ready_at - task.accepted_at),
                ),
              )}
            />
            <p
              className="contract-time-note"
              role="timer"
              aria-live="off"
              aria-label={
                ready ? "约定时间已到，可以结算" : `距可结算还需 ${time}`
              }
            >
              {ready ? (
                "约定时间已到"
              ) : (
                <>
                  还需 <span>{time}</span>
                </>
              )}
            </p>
          </div>
          <aside
            className="contract-reward"
            aria-label={`约定报酬 ${task.hours} ${paths[task.kind].point}，待结算`}
          >
            <div className="contract-wax-seal" aria-hidden="true">
              <CommissionIcon kind={task.kind} />
            </div>
            <span>约定报酬</span>
            <strong>
              +{task.hours} {paths[task.kind].point}
            </strong>
            <small>待结算</small>
          </aside>
        </div>
        <p className="contract-deadline">
          {ready
            ? "回到诺亚身边，即可结算这份约定。"
            : `${stamp(task.ready_at)} 后，回来找诺亚结算。`}
        </p>
      </div>
      <div className="contract-actions">
        <button
          className="rq-button rq-button--primary life-main-action"
          disabled={busy}
          onClick={() => (ready ? void claim() : open(null))}
        >
          {busy
            ? "正在记下…"
            : ready
              ? `结算委托 · 领取 ${task.hours} ${paths[task.kind].point}`
              : "收起委托"}
          <ArrowRight size={18} aria-hidden="true" />
        </button>
        <CancelTask key={task.id} task={task} act={act} compact />
        <CommissionRules />
      </div>
      <small className="contract-footer-note">
        离开村庄或关闭页面，计时仍会继续。
      </small>
    </section>
  );
}
function CancelTask({
  task,
  act,
  compact = false,
}: {
  task: LifeTask;
  act: (action: string, data: Record<string, unknown>) => Promise<boolean>;
  compact?: boolean;
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
          aria-label="取消这份委托"
          disabled={busy}
          onClick={() => setConfirm(true)}
        >
          <X size={16} aria-hidden="true" />
          {compact ? "取消约定" : "取消这份委托"}
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
  if (active)
    return (
      <CommissionContract
        task={active}
        now={now}
        busy={busy}
        heading={heading}
        act={act}
        claim={async () => {
          if (await act("life_claim", { target: "noah", task_id: active.id }))
            setReceipt(active);
        }}
      />
    );
  return (
    <section className="life-conversation" aria-label="现实委托">
      <h3 ref={heading} tabIndex={-1}>
        {receipt
          ? "这份成长，我替你记下了"
          : remaining
            ? "选择一份今日委托"
            : "今天的五枚成长印记，集齐了"}
      </h3>
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
      {remaining > 0 ? (
        <>
          <div
            className="life-paths"
            role="group"
            aria-label="选择现实任务类型"
          >
            {Object.entries(paths).map(([id, path]) => {
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
                  <span className="life-selected-stamp" aria-hidden="true">
                    <Check size={13} />
                  </span>
                  <CommissionIcon kind={id as LifeTask["kind"]} />
                  <span>
                    <strong>{path.name}</strong>
                    <small>{path.point}</small>
                  </span>
                </button>
              );
            })}
          </div>
          <h4 className="life-hours-heading">
            <Sprout size={17} aria-hidden="true" />
            约定时长
          </h4>
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
          <div
            className="life-reward-preview"
            aria-live="polite"
            aria-atomic="true"
          >
            <CommissionIcon kind={kind} />
            <span>
              完成 {duration} 小时{paths[kind].name}
            </span>
            <strong>
              +{duration} {paths[kind].point}
            </strong>
          </div>
          <p className="life-accept-note">
            领取后开始计时，到时回诺亚处结算。
            <br />
            每小时 1 点 · 三类每日合计最多 5 点
          </p>
          <div className="life-accept-footer">
            <button
              className="rq-button rq-button--primary life-main-action"
              disabled={busy}
              onClick={() => void accept()}
            >
              {busy ? "正在记下约定…" : "领取这份委托"}
              <ArrowRight size={18} aria-hidden="true" />
            </button>
            <CommissionRules />
          </div>
          <small className="life-accept-footnote">
            取消不获点数 · 按领取日计算额度
          </small>
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
          <CommissionRules />
        </div>
      )}
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
      <LifeQuota />
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
