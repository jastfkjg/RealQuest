import { useEffect, useRef, useState, type RefObject } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  Footprints,
  Hammer,
  MapPin,
  Leaf,
  ScrollText,
  Sprout,
  X,
} from "lucide-react";
import { serverNow, useGame } from "../stores/game";
import { api } from "../services/api";
import type { LifeTask } from "../types";
import { CommissionIcon } from "./CommissionIcon";
import { ContractHourglass } from "./ContractHourglass";
import { LifeJournal } from "./LifeJournal";

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
  onCancelled,
}: {
  task: LifeTask;
  act: (action: string, data: Record<string, unknown>) => Promise<boolean>;
  compact?: boolean;
  onCancelled?: () => void;
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
              onClick={async () => {
                if (await act("life_cancel", { task_id: task.id }))
                  onCancelled?.();
              }}
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
const contractTitle = (kind: LifeTask["kind"], hours: number) =>
  `${["", "一", "两", "三", "四", "五"][hours] || hours}小时的${kind === "study" ? "研习" : kind === "exercise" ? "活力" : "专注"}`;

function PromiseReward({
  kind,
  hours,
}: {
  kind: LifeTask["kind"];
  hours: number;
}) {
  return (
    <aside
      className="contract-reward"
      aria-label={`约定报酬 ${hours} ${paths[kind].point}，结算时获得`}
    >
      <div className="contract-wax-seal" aria-hidden="true">
        <CommissionIcon kind={kind} />
      </div>
      <span>约定报酬</span>
      <strong>
        +{hours} {paths[kind].point}
      </strong>
      <small>结算时获得</small>
    </aside>
  );
}

export function LifeQuestDialogue({
  receipt,
  onReceipt,
}: {
  receipt: LifeTask | null;
  onReceipt: (task: LifeTask | null) => void;
}) {
  const { state, busy, open } = useGame();
  const act = useAction();
  const now = useClock();
  const [kind, setKind] = useState<LifeTask["kind"]>("study");
  const [hours, setHours] = useState(1);
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
      onReceipt(null);
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
          await act("life_claim", { target: "noah", task_id: active.id });
          // A receipt exists only after the authoritative state confirms credit,
          // including reconciliation when a committed response was lost.
          const confirmed = useGame
            .getState()
            .state?.life_journal?.tasks.find(
              (t) => t.id === active.id && t.status === "claimed",
            );
          if (confirmed) {
            useGame.setState({ error: "" });
            onReceipt(confirmed);
          }
        }}
      />
    );
  if (receipt)
    return (
      <section className="life-settlement" aria-label="现实委托结算回执">
        <div className="life-contract-scroll">
          <header className="contract-heading">
            <span>约定已结算</span>
            <h3 ref={heading} tabIndex={-1}>
              {contractTitle(receipt.kind, receipt.hours)}
            </h3>
          </header>
          <div className="settlement-stage">
            <img
              className="settlement-ledger"
              src="/assets/hearthwood/commission-ledger-v1.webp"
              alt=""
            />
            <div
              className="settlement-receipt"
              role="status"
              aria-atomic="true"
            >
              <span>林间委托回执</span>
              <h4>
                {paths[receipt.kind].name} · {receipt.hours} 小时
              </h4>
              <strong>
                +{receipt.reward} {paths[receipt.kind].point}
              </strong>
              <small>已入账</small>
              <span className="settlement-seal">
                <Check size={20} aria-hidden="true" />
                已结算
              </span>
            </div>
          </div>
          <p className="settlement-note">这份成长，已记入手记。</p>
          <p className="settlement-signature">
            一点一滴，也在向前。 <span>— 诺亚</span>
          </p>
        </div>
        <div className="contract-actions">
          {remaining > 0 && (
            <button
              className="rq-button rq-button--primary life-main-action"
              onClick={() => onReceipt(null)}
            >
              再约一份委托 <ArrowRight size={18} aria-hidden="true" />
            </button>
          )}
          <button
            className={
              remaining
                ? "life-text-button"
                : "rq-button rq-button--primary life-main-action"
            }
            onClick={() => open("activity")}
          >
            <BookOpen size={18} aria-hidden="true" />
            翻看成长手记
          </button>
          <button className="life-text-button" onClick={() => open(null)}>
            收起回执
          </button>
        </div>
        {!remaining && (
          <p className="contract-footer-note">
            今天的五枚成长印记，集齐了。明天再来吧。
          </p>
        )}
      </section>
    );
  return (
    <section className="life-offer" aria-label="现实委托">
      {remaining > 0 ? (
        <>
          <div
            className="commission-slips"
            role="group"
            aria-label="选择现实任务类型"
          >
            {Object.entries(paths).map(([id, path]) => (
              <button
                key={id}
                disabled={busy}
                aria-pressed={kind === id}
                onClick={() => {
                  setKind(id as LifeTask["kind"]);
                  draft.current = crypto.randomUUID();
                }}
              >
                <CommissionIcon kind={id as LifeTask["kind"]} />
                <span>
                  <strong>{path.name}</strong>
                  <small>{path.point}</small>
                </span>
                {kind === id && (
                  <span className="slip-seal" aria-hidden="true">
                    <Leaf size={15} />
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="life-contract-scroll">
            <header className="contract-heading">
              <span>与诺亚立下约定</span>
              <h3 ref={heading} tabIndex={-1}>
                {contractTitle(kind, duration)}
              </h3>
            </header>
            <div className="offer-stage" aria-live="polite" aria-atomic="true">
              <img
                className="offer-illustration"
                src={`/assets/hearthwood/commission-${kind}-v1.webp`}
                alt=""
              />
              <PromiseReward kind={kind} hours={duration} />
            </div>
            <div className="offer-duration">
              <p>想留出多久？</p>
              <div
                className="life-hours"
                role="group"
                aria-label="选择委托时长"
              >
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
            </div>
            <p className="offer-promise">
              完成 {duration} 小时{paths[kind].name}，回来收下这份成长。
            </p>
          </div>
          <div className="contract-actions">
            <button
              className="rq-button rq-button--primary life-main-action"
              aria-label={busy ? "正在记下约定…" : "领取这份委托"}
              disabled={busy}
              onClick={() => void accept()}
            >
              {busy ? "正在记下约定…" : "签下约定 · 领取委托"}
              <ArrowRight size={18} aria-hidden="true" />
            </button>
            <CommissionRules />
          </div>
          <p className="contract-footer-note">
            领取后开始计时 · 每小时 1 点 · 三类每日合计最多 5 点
          </p>
        </>
      ) : (
        <>
          <div className="life-contract-scroll life-rest">
            <header className="contract-heading">
              <span>今日约定已记满</span>
              <h3 ref={heading} tabIndex={-1}>
                五枚成长印记，集齐了
              </h3>
            </header>
            <img src="/assets/hearthwood/commission-ledger-v1.webp" alt="" />
            <p>
              辛苦了，剩下的时间留给自己。
              <br />
              明天零点后，再来约定新的旅程。
            </p>
          </div>
          <div className="contract-actions">
            <button
              className="rq-button rq-button--primary life-main-action"
              onClick={() => open("activity")}
            >
              翻看成长手记
            </button>
            <CommissionRules />
          </div>
        </>
      )}
    </section>
  );
}
export function LifeQuestHistory() {
  const state = useGame((s) => s.state);
  const act = useAction();
  const now = useClock();
  if (!state) return null;
  return (
    <LifeJournal
      state={state}
      now={now}
      marker={() => <NoahMarker />}
      cancel={(task, onCancelled) => (
        <CancelTask
          key={task.id}
          task={task}
          act={act}
          compact
          onCancelled={onCancelled}
        />
      )}
    />
  );
}
