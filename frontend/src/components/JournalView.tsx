import { useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookOpen,
  Check,
  CheckCheck,
  Feather,
  Flag,
  Leaf,
  LockKeyhole,
  MapPin,
} from "lucide-react";
import { itemDefinitions, itemNames } from "../game/items";
import { activityNames } from "../game/activities";
import { questStatuses } from "../game/questPresentation";
import type { GameState, Quest } from "../types";

type Chapter = "journey" | "completed" | "growth";
export interface JournalViewProps {
  quests: Quest[];
  trackedId: string | null;
  activities: GameState["activities"];
  renderActions: (quest: Quest) => ReactNode;
  feedback?: ReactNode;
  onRecordGrowth: () => void;
}
const chapters = [
  { id: "journey", label: "旅途委托", Icon: Flag },
  { id: "completed", label: "完成篇章", Icon: CheckCheck },
  { id: "growth", label: "成长记录", Icon: Leaf },
] as const;

export function JournalView({
  quests,
  trackedId,
  activities,
  renderActions,
  feedback,
  onRecordGrowth,
}: JournalViewProps) {
  const [chapter, setChapter] = useState<Chapter>("journey");
  const [selectedId, setSelectedId] = useState(trackedId || "");
  const [selectedDate, setSelectedDate] = useState("");
  const [mobileView, setMobileView] = useState("index");
  const detailTitleId = useId();
  const backRef = useRef<HTMLButtonElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);
  const bookRef = useRef<HTMLDivElement>(null);
  const entries = quests.filter((q) =>
    chapter === "completed" ? q.status === "claimed" : q.status !== "claimed",
  );
  const quest =
    entries.find((q) => q.id === selectedId) ||
    entries.find((q) => q.id === trackedId) ||
    entries.find((q) => q.status === "ready") ||
    entries[0];
  const recent = [...activities].reverse();
  const dates = [...new Set(recent.map((a) => a.date))];
  const date = dates.includes(selectedDate) ? selectedDate : dates[0];
  const records = recent.filter((a) => a.date === date);
  const completed = quest?.checks.filter(Boolean).length || 0;
  const toDetails = () => {
    if (!window.matchMedia("(max-width: 700px)").matches) return;
    setMobileView("entry");
    requestAnimationFrame(() => {
      backRef.current?.focus({ preventScroll: true });
      bookRef.current?.closest("dialog")?.scrollTo({ top: 0 });
    });
  };
  return (
    <div ref={bookRef} className="hj-journal" data-mobile-view={mobileView}>
      <nav className="hj-bookmarks" aria-label="日志章节">
        {chapters.map(({ id, label, Icon }) => (
          <button
            key={id}
            aria-pressed={chapter === id}
            onClick={() => {
              setChapter(id);
              setMobileView("index");
            }}
          >
            <Icon size={16} aria-hidden="true" />
            {label}
          </button>
        ))}
      </nav>
      <div className="hj-book">
        <section
          className="hj-index"
          aria-label={chapter === "growth" ? "成长日期索引" : "任务索引"}
        >
          <div className="hj-index-heading">
            <span className="hj-eyebrow">
              {chapter === "growth"
                ? "现实里的每一步"
                : chapter === "completed"
                  ? "已经走过的旅程"
                  : "大陆的回响"}
            </span>
            <h3>
              {chapter === "growth"
                ? "成长记录"
                : chapter === "completed"
                  ? "完成篇章"
                  : "旅途委托"}
            </h3>
          </div>
          {chapter === "growth" ? (
            dates.length ? (
              <ol className="hj-entries">
                {dates.map((day) => (
                  <li key={day}>
                    <button
                      ref={day === date ? selectedRef : undefined}
                      aria-pressed={date === day}
                      aria-label={`查看 ${day} 的成长记录`}
                      onClick={() => {
                        setSelectedDate(day);
                        toDetails();
                      }}
                    >
                      <Feather
                        className="hj-entry-icon"
                        size={18}
                        aria-hidden="true"
                      />
                      <span>
                        <b>{day}</b>
                        <small>
                          {recent.filter((a) => a.date === day).length} 条记录
                        </small>
                      </span>
                      <ArrowRight size={16} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="hj-index-empty">
                <Feather size={28} aria-hidden="true" />
                <p>还没有成长记录。</p>
                <button className="rq-button" onClick={onRecordGrowth}>
                  记录一次成长
                </button>
              </div>
            )
          ) : entries.length ? (
            <ol className="hj-entries">
              {entries.map((q) => (
                <li key={q.id}>
                  <button
                    ref={q.id === quest?.id ? selectedRef : undefined}
                    aria-pressed={q.id === quest?.id}
                    aria-label={`查看任务：${q.title}，${questStatuses[q.status]}`}
                    onClick={() => {
                      setSelectedId(q.id);
                      toDetails();
                    }}
                  >
                    <span className="hj-entry-icon" aria-hidden="true">
                      {q.status === "locked" ? (
                        <LockKeyhole size={17} />
                      ) : q.status === "claimed" ? (
                        <Check size={18} />
                      ) : q.id === trackedId ? (
                        <Bookmark size={18} />
                      ) : (
                        <Feather size={18} />
                      )}
                    </span>
                    <span>
                      <b>{q.title}</b>
                      <small>
                        {questStatuses[q.status]}
                        {["active", "ready"].includes(q.status) &&
                          ` · ${q.checks.filter(Boolean).length}/${q.objectives.length} 步`}
                        {q.id === trackedId &&
                          q.status === "active" &&
                          " · 追踪中"}
                      </small>
                    </span>
                    <ArrowRight size={16} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <div className="hj-index-empty">
              <BookOpen size={28} aria-hidden="true" />
              <p>
                {chapter === "completed"
                  ? "还没有完成的委托。"
                  : "当前没有待办委托。"}
              </p>
            </div>
          )}
          <p className="hj-page-foot">
            {chapter === "growth"
              ? `${activities.length} 条成长记录`
              : `${entries.length} 份委托`}
            <span aria-hidden="true">·</span> 目录
          </p>
        </section>
        <section className="hj-detail" aria-label="日志正文">
          <button
            ref={backRef}
            className="hj-back"
            onClick={() => {
              setMobileView("index");
              requestAnimationFrame(() => selectedRef.current?.focus());
            }}
          >
            <ArrowLeft size={16} />
            返回目录
          </button>
          {chapter === "growth" ? (
            <div className="hj-page-content" key={`growth-${date}`}>
              <span className="hj-eyebrow">
                <Feather size={16} aria-hidden="true" />
                现实成长记录
              </span>
              <h3 className="hj-page-title">{date || "新的一页"}</h3>
              {records.length ? (
                <ol className="hj-history">
                  {records.map((a, i) => (
                    <li key={i}>
                      <div className="hj-history-title">
                        <h4>{activityNames[a.kind] || a.kind}</h4>
                        <span>+{a.xp} EXP</span>
                      </div>
                      <p>
                        {a.kind === "management"
                          ? "已完成"
                          : `${a.amount}${a.kind === "steps" ? " 步" : " 分钟"}`}
                      </p>
                      <small>
                        {a.date} ·{" "}
                        {a.source === "timer"
                          ? "学习计时"
                          : a.source === "manual"
                            ? "手动填报"
                            : a.source}{" "}
                        · {a.verified ? "已验证" : "未验证"}
                      </small>
                      {a.note && <p className="hj-record-note">{a.note}</p>}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="hj-empty-copy">
                  还没有记录。旅程不必赶路，从一件小事开始。
                </p>
              )}
              <button
                className="rq-button hj-record-action"
                onClick={onRecordGrowth}
              >
                记录一次成长 <ArrowRight size={16} />
              </button>
            </div>
          ) : quest ? (
            <article
              className="hj-page-content"
              key={quest.id}
              aria-labelledby={detailTitleId}
            >
              <div className="hj-detail-kicker">
                <span className="hj-status" data-status={quest.status}>
                  {quest.status === "claimed" ? (
                    <Check size={16} />
                  ) : quest.status === "locked" ? (
                    <LockKeyhole size={16} />
                  ) : (
                    <Feather size={16} />
                  )}
                  {questStatuses[quest.status]}
                </span>
                {quest.id === trackedId && (
                  <span className="hj-tracked">
                    <Bookmark size={14} />
                    正在追踪
                  </span>
                )}
              </div>
              <h3 className="hj-page-title" id={detailTitleId}>
                {quest.title}
              </h3>
              <p className="hj-giver">
                <MapPin size={14} aria-hidden="true" />
                {quest.giver_name}
              </p>
              <p className="hj-description">{quest.description}</p>
              <div className="hj-objective-title">
                <h4>旅途中的小事</h4>
                <span>
                  {completed} / {quest.objectives.length}
                </span>
              </div>
              <ol className="hj-objectives" aria-label="任务目标">
                {quest.objectives.map((objective, i) => (
                  <li key={i} data-complete={!!quest.checks[i]}>
                    <span className="hj-tick" aria-hidden="true">
                      {quest.checks[i] && <Check size={17} />}
                    </span>
                    <span>
                      <span className="hj-sr-only">
                        {quest.checks[i] ? "已完成：" : "未完成："}
                      </span>
                      {objective}
                    </span>
                  </li>
                ))}
              </ol>
              <div className="hj-rewards">
                <h4>
                  {quest.status === "claimed"
                    ? "已经收下的回礼"
                    : "完成这份委托可得"}
                </h4>
                <div>
                  {Object.entries(quest.reward).map(([id, amount]) => {
                    const icon =
                      id === "gold"
                        ? "/assets/hearthwood/detail/items/gold.png"
                        : itemDefinitions[id]?.icon;
                    return (
                      <span key={id}>
                        {icon && (
                          <img
                            className="rq-pixel-art"
                            src={icon}
                            width={32}
                            height={32}
                            alt=""
                          />
                        )}
                        <b>{amount}</b> {itemNames[id] || id}
                      </span>
                    );
                  })}
                  <span className="hj-xp">+{quest.xp} EXP</span>
                </div>
              </div>
              <div className="hj-action-area">
                {renderActions(quest)}
                {["active", "ready", "available"].includes(quest.status) && (
                  <p className="hj-action-hint">
                    标记只指引方向，请走近后互动。
                  </p>
                )}
              </div>
              <p className="hj-page-foot">
                {quest.giver_name}
                <span aria-hidden="true">·</span> 委托手记
              </p>
            </article>
          ) : (
            <div className="hj-empty-page">
              <BookOpen size={40} aria-hidden="true" />
              <h3>
                {chapter === "completed"
                  ? "把完成的旅程，留在这里"
                  : "这一页，暂时留白"}
              </h3>
              <p>
                {chapter === "completed"
                  ? "交付过的委托会收录在这一章。"
                  : "有新的委托时，再把它写进手账。"}
              </p>
            </div>
          )}
          {feedback}
        </section>
      </div>
    </div>
  );
}
