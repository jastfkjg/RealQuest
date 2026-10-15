import { useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Leaf,
  Sprout,
} from "lucide-react";
import { activityNames, useGame } from "../stores/game";
import type { GameState, LifeTask } from "../types";
import {
  calendarDays,
  dailyQuota,
  dateValue,
  lifeDate,
  moveDay,
  moveMonth,
} from "../game/lifeJournalDates";
import { CommissionIcon } from "./CommissionIcon";
import { ContractHourglass } from "./ContractHourglass";

const kinds = {
  study: { name: "学习", point: "知识点" },
  exercise: { name: "运动", point: "健康点" },
  work: { name: "工作", point: "技能点" },
};
const weekdays = [
  "星期日",
  "星期一",
  "星期二",
  "星期三",
  "星期四",
  "星期五",
  "星期六",
];
const time = (seconds: number) =>
  new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(seconds * 1000);
const longDate = (date: string) =>
  `${Number(date.slice(0, 4))}年${Number(date.slice(5, 7))}月${Number(date.slice(8))}日`;
const shortDate = (date: string) =>
  `${Number(date.slice(5, 7))}月${Number(date.slice(8))}日`;

function Quota({
  tasks,
  today,
  limit,
}: {
  tasks: LifeTask[];
  today: string;
  limit: number;
}) {
  const quota = dailyQuota(tasks, today, limit);
  return (
    <div
      className="lj-quota"
      aria-label={`今日成长 ${quota.claimed} / ${limit}，进行中预留 ${quota.reserved} 点，还可领取 ${quota.remaining} 点`}
    >
      <strong>
        今日成长{" "}
        <b>
          {quota.claimed} / {limit}
        </b>
      </strong>
      <span className="life-seeds" aria-hidden="true">
        {Array.from({ length: limit }, (_, index) => (
          <i
            key={index}
            data-state={
              index < quota.claimed
                ? "claimed"
                : index < quota.claimed + quota.reserved
                  ? "reserved"
                  : "free"
            }
          >
            <Sprout size={20} />
          </i>
        ))}
      </span>
      <small>
        {quota.reserved > 0 && `预留 ${quota.reserved} 点 · `}还可领取{" "}
        {quota.remaining} 点
      </small>
    </div>
  );
}

function Calendar({
  month,
  selected,
  today,
  tasks,
  onMonth,
  onSelect,
}: {
  month: string;
  selected: string;
  today: string;
  tasks: LifeTask[];
  onMonth: (month: string) => void;
  onSelect: (date: string, focus?: boolean) => void;
}) {
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const byDate = new Map<string, LifeTask[]>();
  for (const task of tasks)
    byDate.set(task.date, [...(byDate.get(task.date) || []), task]);
  function keyboard(
    event: React.KeyboardEvent<HTMLButtonElement>,
    date: string,
  ) {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[
      event.key
    ];
    let next: string | undefined;
    if (step) next = moveDay(date, step);
    if (event.key === "Home")
      next = moveDay(date, -((dateValue(date).getUTCDay() + 6) % 7));
    if (event.key === "End")
      next = moveDay(date, 6 - ((dateValue(date).getUTCDay() + 6) % 7));
    if (event.key === "PageUp" || event.key === "PageDown") {
      const nextMonth = moveMonth(date, event.key === "PageUp" ? -1 : 1);
      const last = Number(
        moveDay(`${moveMonth(`${nextMonth}-01`, 1)}-01`, -1).slice(8),
      );
      next = `${nextMonth}-${String(Math.min(Number(date.slice(8)), last)).padStart(2, "0")}`;
    }
    if (!next) return;
    event.preventDefault();
    event.stopPropagation();
    onSelect(next);
    requestAnimationFrame(() => buttons.current.get(next!)?.focus());
  }
  const focusDate = selected.startsWith(month)
    ? selected
    : today.startsWith(month)
      ? today
      : `${month}-01`;
  return (
    <section className="lj-calendar" aria-label="成长日期索引">
      <h3>按日翻阅</h3>
      <div className="lj-month">
        <button
          aria-label="上个月"
          onClick={() => onMonth(moveMonth(`${month}-01`, -1))}
        >
          <ChevronLeft size={20} aria-hidden="true" />
        </button>
        <strong aria-live="polite">
          {Number(month.slice(0, 4))}年{Number(month.slice(5))}月
        </strong>
        <button
          aria-label="下个月"
          onClick={() => onMonth(moveMonth(`${month}-01`, 1))}
        >
          <ChevronRight size={20} aria-hidden="true" />
        </button>
      </div>
      <div className="lj-calendar-week" aria-hidden="true">
        {["一", "二", "三", "四", "五", "六", "日"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div
        className="lj-calendar-days"
        role="group"
        aria-label={`${month}日期，方向键切换日期，翻页键切换月份`}
      >
        {calendarDays(month).map((date, index) => {
          if (!date)
            return (
              <span className="lj-calendar-blank" key={`blank-${index}`} />
            );
          const records = byDate.get(date) || [];
          const active = records.some((task) => task.status === "active");
          const claimed = records.filter(
            (task) => task.status === "claimed",
          ).length;
          const cancelled = records.filter(
            (task) => task.status === "cancelled",
          ).length;
          return (
            <button
              key={date}
              ref={(button) => {
                if (button) buttons.current.set(date, button);
                else buttons.current.delete(date);
              }}
              tabIndex={date === focusDate ? 0 : -1}
              aria-pressed={date === selected}
              aria-current={date === today ? "date" : undefined}
              aria-label={`${longDate(date)}${date === today ? "，今天" : ""}，${records.length}份约定${records.length ? `，进行中${active ? 1 : 0}，已结算${claimed}，已取消${cancelled}` : ""}`}
              data-future={date > today}
              data-records={records.length > 0}
              data-active={active}
              onKeyDown={(event) => keyboard(event, date)}
              onClick={() => onSelect(date, true)}
            >
              <span>{Number(date.slice(8))}</span>
              {records.length > 0 && <i aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      <div className="lj-calendar-legend">
        <span>
          <i aria-hidden="true" />
          有任务记录
        </span>
        <button onClick={() => onSelect(today, true)}>
          <Clock3 size={16} aria-hidden="true" />
          回到今天
        </button>
      </div>
    </section>
  );
}

export function LifeJournal({
  state,
  now,
  marker,
  cancel,
}: {
  state: GameState;
  now: number;
  marker: () => ReactNode;
  cancel: (task: LifeTask, onCancelled: () => void) => ReactNode;
}) {
  const today = lifeDate(now);
  const [selection, setSelection] = useState<string | null>(null);
  const selected = selection || today;
  const [browsedMonth, setMonth] = useState<string | null>(null);
  const month = browsedMonth || selected.slice(0, 7);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const heading = useRef<HTMLHeadingElement>(null);
  const open = useGame((s) => s.open);
  const error = useGame((s) => s.error);
  const notice = useGame((s) => (s.noticePanel === "activity" ? s.notice : ""));
  const tasks = state.life_journal?.tasks || [];
  const active = tasks.find((task) => task.status === "active");
  const dayTasks = tasks
    .filter((task) => task.date === selected)
    .sort((a, b) => b.accepted_at - a.accepted_at);
  const current = dayTasks.find((task) => task.status === "active");
  const closed = dayTasks.filter(
    (task) =>
      task.status !== "active" && (filter === "all" || task.status === filter),
  );
  const limit = state.life_journal?.limit || 5;
  const focusHeading = () =>
    requestAnimationFrame(() =>
      heading.current?.focus({ preventScroll: true }),
    );
  const select = (date: string, focus = false) => {
    setSelection(date === today ? null : date);
    setMonth(date === today ? null : date.slice(0, 7));
    setFilter("all");
    setPage(1);
    if (focus) {
      setCalendarOpen(false);
      focusHeading();
      if (window.matchMedia("(max-width: 1050px)").matches)
        requestAnimationFrame(() =>
          heading.current?.scrollIntoView({ block: "nearest" }),
        );
    }
  };
  const remaining = current
    ? Math.max(0, Math.ceil(current.ready_at - now))
    : 0;
  const duration = current ? current.hours * 3600 : 1;
  const ratio = Math.min(1, remaining / duration);
  const timer = [
    Math.floor(remaining / 3600),
    Math.floor((remaining % 3600) / 60),
    remaining % 60,
  ]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
  return (
    <div className="life-journal lj-book">
      <header className="lj-header">
        <div className="lj-title">
          <Sprout size={32} aria-hidden="true" />
          <h3>
            现实成长 <small>· 成长手记</small>
          </h3>
        </div>
        <div className="life-wallet lj-wallet" aria-label="成长点数">
          {(["study", "exercise", "work"] as const).map((kind) => (
            <span key={kind}>
              <CommissionIcon kind={kind} />
              {kinds[kind].point}{" "}
              <b>
                {state[
                  kind === "study"
                    ? "knowledge_points"
                    : kind === "exercise"
                      ? "health_points"
                      : "skill_points"
                ] || 0}
              </b>
            </span>
          ))}
        </div>
      </header>
      <button
        className="lj-calendar-toggle"
        aria-expanded={calendarOpen}
        aria-controls="life-date-index"
        onClick={() => setCalendarOpen((value) => !value)}
      >
        <CalendarDays size={18} aria-hidden="true" />
        {calendarOpen ? "收起月历" : "选择日期"}
        <span>{longDate(selected)}</span>
      </button>
      <div className="lj-spread">
        <aside
          id="life-date-index"
          className={`lj-index${calendarOpen ? " is-open" : ""}`}
        >
          <Calendar
            month={month}
            selected={selected}
            today={today}
            tasks={tasks}
            onMonth={setMonth}
            onSelect={select}
          />
          <Quota tasks={tasks} today={today} limit={limit} />
          <img
            className="lj-ledger"
            src="/assets/hearthwood/commission-ledger-v1.webp"
            width="1536"
            height="1024"
            alt=""
          />
        </aside>
        <section className="lj-day" aria-label="当日现实任务">
          <div className="lj-day-heading">
            <div>
              <h3 ref={heading} tabIndex={-1}>
                {shortDate(selected)}
              </h3>
              <span>{weekdays[dateValue(selected).getUTCDay()]}</span>
              {selected === today && <span className="lj-today">今天</span>}
            </div>
            <nav aria-label="切换任务日期">
              <button
                aria-label="前一天"
                onClick={() => select(moveDay(selected, -1))}
              >
                <ChevronLeft size={20} aria-hidden="true" />
              </button>
              <button
                aria-label="后一天"
                onClick={() => select(moveDay(selected, 1))}
              >
                <ChevronRight size={20} aria-hidden="true" />
              </button>
            </nav>
          </div>
          <p className="lj-day-summary" role="status" aria-live="polite">
            {dayTasks.length} 份约定 · 进行中{" "}
            {dayTasks.filter((task) => task.status === "active").length} ·
            已结算 {dayTasks.filter((task) => task.status === "claimed").length}{" "}
            · 已取消{" "}
            {dayTasks.filter((task) => task.status === "cancelled").length}
          </p>
          <div className="lj-mobile-quota">
            <Quota tasks={tasks} today={today} limit={limit} />
          </div>
          {active && active.date !== selected && (
            <div className="lj-other-active">
              <Clock3 size={18} aria-hidden="true" />
              <span>{shortDate(active.date)}领取的约定仍在进行</span>
              <button onClick={() => select(active.date, true)}>
                查看当前约定
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          )}
          <div className="life-history-heading lj-filters">
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
          <div className="lj-day-content" key={selected}>
            {current && filter === "all" && (
              <section
                className="life-current lj-current"
                aria-label="当前现实委托"
                data-ready={remaining === 0}
              >
                <div className="lj-task-heading">
                  <CommissionIcon kind={current.kind} />
                  <h4>
                    {kinds[current.kind].name} · {current.hours}小时
                  </h4>
                  <span className="lj-task-status">
                    {remaining ? "进行中" : "待结算"}
                  </span>
                  <div className="lj-expected">
                    <strong>
                      +{current.hours} {kinds[current.kind].point}
                    </strong>
                    <small>结算后获得</small>
                  </div>
                </div>
                <div className="lj-task-body">
                  <div className="lj-task-clock">
                    <span>
                      <Clock3 size={20} aria-hidden="true" />
                      {remaining ? "距可结算还有" : "约定时间已到"}
                    </span>
                    <strong
                      className="lj-countdown"
                      role="timer"
                      aria-label={
                        remaining ? `距可结算还有 ${timer}` : "约定时间已到"
                      }
                    >
                      {remaining ? timer : "可以结算了"}
                    </strong>
                    <progress
                      max={duration}
                      value={duration - Math.min(duration, remaining)}
                      aria-label="约定等待进度"
                    />
                    <small>
                      {time(current.accepted_at)} 领取 ·{" "}
                      {lifeDate(current.ready_at) !== selected
                        ? `${shortDate(lifeDate(current.ready_at))} `
                        : ""}
                      {time(current.ready_at)} 起可结算
                    </small>
                  </div>
                  <ContractHourglass remainingRatio={ratio} />
                </div>
                <p className="lj-task-hint">
                  {remaining
                    ? "到期后，前往诺亚处结算。"
                    : "前往诺亚处，结算这份约定。"}
                </p>
                <div className="lj-task-actions">
                  {marker()}
                  {cancel(current, focusHeading)}
                </div>
                <small className="lj-provenance">
                  现实委托 · 等待计时，未验证现实行为
                </small>
              </section>
            )}
            {error && (
              <p className="lj-feedback lj-feedback--error" role="alert">
                {error}
              </p>
            )}
            {!error && notice && (
              <p className="lj-feedback" role="status">
                {notice}
              </p>
            )}
            <section
              className="life-memories lj-records"
              aria-label="历史现实任务"
            >
              <h4>{filter === "cancelled" ? "已取消的约定" : "当日手记"}</h4>
              {closed.length > 0 ? (
                <ol>
                  {closed.slice(0, page * 10).map((task) => (
                    <li key={task.id} data-status={task.status}>
                      <time
                        dateTime={new Date(
                          task.accepted_at * 1000,
                        ).toISOString()}
                      >
                        {time(task.accepted_at)}
                      </time>
                      <CommissionIcon kind={task.kind} />
                      <div>
                        <strong>
                          {kinds[task.kind].name}委托 · {task.hours} 小时
                        </strong>
                        <small>
                          {task.status === "claimed" ? "已结算" : "已取消"} ·{" "}
                          {task.claimed_at || task.cancelled_at
                            ? `${lifeDate((task.claimed_at || task.cancelled_at)!) !== selected ? `${shortDate(lifeDate((task.claimed_at || task.cancelled_at)!))} ` : ""}${time((task.claimed_at || task.cancelled_at)!)}`
                            : "时间未记录"}
                        </small>
                        <small>现实委托 · 等待计时</small>
                      </div>
                      <span
                        className="life-record-stamp"
                        data-cancelled={task.status === "cancelled"}
                      >
                        {task.status === "claimed"
                          ? `+${task.reward} ${kinds[task.kind].point}`
                          : "已取消 · 0 点"}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="lj-empty">
                  <Sprout size={26} aria-hidden="true" />
                  <p>
                    {dayTasks.length === 0
                      ? selected === today
                        ? "今天还没有约定"
                        : "这一天没有委托记录"
                      : filter === "cancelled"
                        ? "这一天没有已取消的委托"
                        : "这一天还没有已结算的委托"}
                  </p>
                  {dayTasks.length === 0 && selected === today && (
                    <>
                      {marker()}
                      <small>与诺亚交谈，领取学习、运动或工作的约定。</small>
                    </>
                  )}
                </div>
              )}
              {closed.length > page * 10 && (
                <button
                  className="rq-button lj-more"
                  onClick={() => setPage((value) => value + 1)}
                >
                  再翻十条记录
                </button>
              )}
            </section>
          </div>
          <footer className="life-journal-footer lj-footer">
            {dayTasks.length > 0 && (!current || filter !== "all") && marker()}
            <button
              className="life-text-button"
              onClick={() => {
                useGame.setState({ studyEntry: "growth" });
                open("study");
              }}
            >
              知识研修
              <ArrowRight size={16} aria-hidden="true" />
            </button>
            <button
              className="life-text-button"
              onClick={() => open("training")}
            >
              体力培养
              <ArrowRight size={16} aria-hidden="true" />
            </button>
            <span>按领取日期归档 · 记录会自动保留</span>
          </footer>
          <details className="lj-notes">
            <summary>
              <Leaf size={16} aria-hidden="true" />
              归档与成长规则
            </summary>
            <p>
              每日上限按领取日计算（中国标准时间），跨天仍可结算。取消释放预留额度，已结算点数不会因使用而恢复额度。技能点保存在旅程中，可在角色档案分配。
            </p>
          </details>
          {(state.activities.length > 0 ||
            (state.study_task_log || []).length > 0 ||
            (state.exercise_task_log || []).length > 0) && (
            <details className="life-legacy lj-notes">
              <summary>翻阅旧日记录</summary>
              <p>旧记录与已获奖励仍保留；旧手记不再发放成长点数。</p>
              <button className="rq-button" onClick={() => open("study")}>
                打开旧研习手札
              </button>
              {state.activities
                .slice()
                .reverse()
                .map((activity, index) => (
                  <p key={activity.id || index}>
                    {activity.date} ·{" "}
                    {activity.note || activityNames[activity.kind]} ·{" "}
                    {activity.amount}{" "}
                    {activity.kind === "steps"
                      ? "步"
                      : activity.kind === "management"
                        ? "次"
                        : "分钟"}{" "}
                    · {activity.source === "timer" ? "计时" : "手动记录"} ·{" "}
                    {activity.xp} EXP
                  </p>
                ))}
            </details>
          )}
        </section>
      </div>
    </div>
  );
}
