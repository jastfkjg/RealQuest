import { useRef, useState } from "react";
import { HudIcon } from "./HudIcon";
import {
  Check,
  Flag,
  MapPin,
  ArrowRight,
  BookOpen,
  Circle,
  LockKeyhole,
  ChevronRight,
} from "lucide-react";
import { useGame, itemNames } from "../stores/game";
import { questTarget } from "../game/navigation";
import type { Quest } from "../types";
import { questStatuses } from "../game/questPresentation";
import { itemDefinitions } from "../game/items";
import { IntroContext, IntroTracker, followIntroStep } from "./VillageIntro";
import { trackedIntroStep, villageIntroStep } from "../game/villageIntro";
export function QuestRewards({ quest: q }: { quest: Quest }) {
  return (
    <div className="quest-reward" aria-label="委托奖励">
      <span>回礼</span>
      {Object.entries(q.reward).map(([id, value]) => (
        <span key={id}>
          <img
            src={
              id === "gold"
                ? "/assets/hearthwood/detail/items/gold.png"
                : itemDefinitions[id]?.icon
            }
            alt=""
            width={16}
            height={16}
          />
          {value} {itemNames[id]}
        </span>
      ))}
      <span>{q.xp} EXP</span>
    </div>
  );
}
export function QuestDetails({
  quest: q,
  conversational = false,
}: {
  quest: Quest;
  conversational?: boolean;
}) {
  return (
    <>
      <p className="ha-quest-description">{q.description}</p>
      <ul className="ha-objectives">
        {q.objectives.map((item, i) => (
          <li key={item} className={q.checks[i] ? "complete" : ""}>
            {q.checks[i] ? <Check size={17} /> : <Circle size={15} />}
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <QuestRewards quest={q} />
      <QuestActions quest={q} conversational={conversational} />
      {["settle_in", "leave_valley"].includes(q.id) && <IntroContext place="board" />}
    </>
  );
}
export function QuestList({ giver }: { giver?: string }) {
  const { state } = useGame();
  const [selectedId, setSelectedId] = useState(() => {
    const entries =
      state?.quest_log.filter((q) => !giver || q.giver === giver) || [];
    return (
      (
        entries.find((q) =>
          ["ready", "active", "available"].includes(q.status),
        ) || entries[0]
      )?.id || ""
    );
  });
  const detailRef = useRef<HTMLElement>(null);
  const [page, setPage] = useState(0);
  if (!state) return null;
  const quests = state.quest_log.filter((q) => !giver || q.giver === giver);
  const selected =
    quests.find((q) => q.id === selectedId) ||
    quests.find((q) => ["ready", "active", "available"].includes(q.status)) ||
    quests[0];
  if (!selected)
    return <p className="hp-board-intro">这里暂时没有新的委托。</p>;
  return (
    <div className="ha-mission-board">
      <nav className="ha-notices" aria-label="告示板委托">
        <div className="ha-board-caption">
          <Flag size={16} /> {quests.length} 份告示 · 选择一份查看
        </div>
        {quests.slice(page * 4, page * 4 + 4).map((q, i) => (
          <button
            key={q.id}
            className="ha-notice"
            data-status={q.status}
            aria-pressed={selected.id === q.id}
            onClick={() => {
              setSelectedId(q.id);
              if (window.matchMedia("(max-width: 750px)").matches)
                requestAnimationFrame(() => {
                  detailRef.current?.focus({ preventScroll: true });
                  detailRef.current?.scrollIntoView({
                    block: "start",
                    behavior: "instant",
                  });
                });
            }}
          >
            <span className="ha-notice-pin" aria-hidden="true" />
            <span className="ha-notice-top">
              <span>委托 {String(page * 4 + i + 1).padStart(2, "0")}</span>
              <span>
                {q.status === "locked" ? (
                  <LockKeyhole size={14} />
                ) : q.status === "claimed" ? (
                  <Check size={14} />
                ) : (
                  <Flag size={14} />
                )}{" "}
                {questStatuses[q.status]}
              </span>
            </span>
            <strong>{q.title}</strong>
            <span className="ha-notice-bottom">
              {q.status === "active" || q.status === "ready"
                ? `${q.checks.filter(Boolean).length} / ${q.checks.length} 项已完成`
                : q.giver_name}
              <ChevronRight size={16} />
            </span>
          </button>
        ))}
        {quests.length > 4 && (
          <div className="ha-board-pages">
            <button disabled={page === 0} onClick={() => setPage(page - 1)}>
              上一页
            </button>
            <button
              disabled={(page + 1) * 4 >= quests.length}
              onClick={() => setPage(page + 1)}
            >
              下一页
            </button>
          </div>
        )}
      </nav>
      <article
        ref={detailRef}
        className="ha-selected-notice"
        key={selected.id}
        aria-label="选中的委托"
        tabIndex={-1}
      >
        <div className="ha-notice-seal" aria-hidden="true">
          <Flag size={24} />
        </div>
        <small>
          {selected.giver_name} · {questStatuses[selected.status]}
        </small>
        <h3>{selected.title}</h3>
        <QuestIllustration quest={selected} />
        <QuestDetails quest={selected} />
      </article>
    </div>
  );
}

function QuestIllustration({ quest }: { quest: Quest }) {
  const image =
    quest.id === "settle_in"
      ? "/assets/hearthwood/village/home.png"
      : quest.id === "craft_home"
        ? "/assets/hearthwood/village/workshop.png"
        : quest.id === "first_harvest"
          ? itemDefinitions.crop.icon
          : null;
  if (!image) return null;
  return (
    <div className="notice-illustration" aria-hidden="true">
      <img className="notice-landmark" src={image} alt="" />
      {quest.id === "settle_in" && (
        <img
          className="notice-material"
          src={itemDefinitions.wood.icon}
          alt=""
        />
      )}
      {quest.id === "craft_home" && (
        <img
          className="notice-material"
          src={itemDefinitions.plank.icon}
          alt=""
        />
      )}
    </div>
  );
}
export function QuestActions({
  quest: q,
  journal = false,
  conversational = false,
}: {
  quest: Quest;
  journal?: boolean;
  conversational?: boolean;
}) {
  const { state, selected, command, busy, navigate, open } = useGame();
  if (!state) return null;
  const atGiver = selected?.id === q.giver;
  const intro = q.id === "leave_valley" && q.status === "active" ? villageIntroStep(state) : null;
  return (
    <div className={`quest-actions ${journal ? "hj-actions" : ""}`}>
      {q.status === "locked" ? (
        <small>
          <LockKeyhole size={12} /> 先完成「
          {state.quest_log.find((p) => p.id === q.requires)?.title}」
        </small>
      ) : q.status === "claimed" ? (
        <span>
          <Check size={15} /> 已交付，奖励已领取
        </span>
      ) : q.status === "available" && atGiver ? (
        <button
          className={journal ? "rq-button rq-button--primary" : "primary"}
          disabled={busy}
          onClick={() => void command("quest_accept", { quest_id: q.id })}
        >
          {busy ? "处理中…" : conversational ? "接受委托" : "接取任务"}{" "}
          <Flag size={15} />
        </button>
      ) : q.status === "ready" && atGiver ? (
        <button
          className={journal ? "rq-button rq-button--primary" : "primary"}
          disabled={busy}
          onClick={() => void command("quest_claim", { quest_id: q.id })}
        >
          {busy
            ? "处理中…"
            : conversational
              ? "交付委托，领取回礼"
              : "交付任务 · 领取奖励"}
        </button>
      ) : (
        <button
          className={journal ? "rq-button rq-button--primary" : undefined}
          disabled={journal && busy}
          onClick={() => {
            if (intro) return followIntroStep(intro);
            const target = questTarget(q, state);
            if (target) navigate(target);
          }}
        >
          <MapPin size={15} />
          {q.status === "ready"
            ? journal
              ? "标记交付地点"
              : "前往交付"
            : q.status === "available"
              ? journal
                ? "标记委托人"
                : "找到委托人"
              : intro?.action || "标记下一步"}
        </button>
      )}
      {q.status === "active" && (
        <button
          disabled={busy || state.tracked_quest === q.id}
          onClick={() => void command("track_quest", { quest_id: q.id })}
        >
          {journal && busy
            ? "处理中…"
            : state.tracked_quest === q.id
              ? "正在追踪"
              : "追踪任务"}
        </button>
      )}
      {q.id === "rune_research" && q.status === "active" && !q.checks[1] && (
        <button onClick={() => open("activity")}>
          记录学习 <BookOpen size={14} />
        </button>
      )}
    </div>
  );
}

export function QuestTracker() {
  const { state, open, navigate } = useGame();
  if (!state) return null;
  if (trackedIntroStep(state)) return <IntroTracker />;
  const quest =
    state.quest_log.find(
      (q) =>
        q.id === state.tracked_quest && ["active", "ready"].includes(q.status),
    ) ||
    state.quest_log.find(
      (q) => q.status === "ready" || q.status === "active",
    ) ||
    state.quest_log.find((q) => q.status === "available");
  if (!quest)
    return (
      <div className="tracked-quest">
        <h3>这一章，圆满落幕。</h3>
        <p>所有委托已完成。继续照顾家园，或在大陆上随意走走。</p>
        <button onClick={() => open("journal")}>查看冒险日志</button>
      </div>
    );
  return (
    <div className="tracked-quest">
      <span className="chapter-label">CHAPTER 01 · 万物生长</span>
      <h2>{quest.title}</h2>
      <p className="quest-giver">{quest.giver_name}</p>
      <ol>
        {quest.objectives.map((item, i) => (
          <li className={quest.checks[i] ? "complete" : ""} key={item}>
            <span>{quest.checks[i] ? <Check size={13} /> : i + 1}</span>
            {item}
          </li>
        ))}
      </ol>
      <div className="next-step">
        <span>{quest.status === "ready" ? "可以交付了" : "接下来"}</span>
        <p>
          {quest.status === "ready"
            ? `回到${quest.giver_name}领取奖励`
            : quest.status === "available"
              ? `在${quest.giver_name}接取这份委托`
              : quest.objectives[quest.checks.findIndex((v) => !v)]}
        </p>
      </div>
      <button
        className="quest-guide"
        onClick={() => {
          if (
            quest.id === "rune_research" &&
            !quest.checks[1] &&
            quest.checks[0]
          )
            open("activity");
          else {
            const target = questTarget(quest, state);
            if (target) navigate(target);
          }
        }}
      >
        <MapPin size={15} />
        {quest.status === "ready" ? "指引我去交付" : "指引我的下一步"}
        <ArrowRight size={15} />
      </button>
      <button className="text-button" onClick={() => open("journal")}>
        全部委托{" "}
        <span>
          {
            state.quest_log.filter((q) =>
              ["active", "ready"].includes(q.status),
            ).length
          }{" "}
          进行中
        </span>
      </button>
    </div>
  );
}

// One actionable next step, using the same authoritative quest checks.
export function QuestCompass() {
  const { state, navigate, open } = useGame();
  if (!state) return null;
  const intro = trackedIntroStep(state);
  const quest =
    state.quest_log.find(
      (q) =>
        q.id === state.tracked_quest && ["active", "ready"].includes(q.status),
    ) ||
    state.quest_log.find((q) =>
      ["ready", "active", "available"].includes(q.status),
    );
  const next = intro ? intro.title : !quest
    ? "照顾家园，或随心探索"
    : quest.status === "ready"
      ? `回到${quest.giver_name}交付`
      : quest.status === "available"
        ? `向${quest.giver_name}接取委托`
        : quest.objectives[quest.checks.findIndex((v) => !v)];
  return (
    <aside className="quest-compass rq-theme" aria-label="下一步引导">
      <button
        className="compass-action"
        aria-label="指引我的下一步"
        onClick={() => {
          if (intro) return followIntroStep(intro);
          if (!quest) return open("journal");
          if (
            quest.id === "rune_research" &&
            quest.checks[0] &&
            !quest.checks[1]
          )
            return open("activity");
          const target = questTarget(quest, state);
          if (target) navigate(target);
        }}
      >
        <span>
          <small>
            {intro ? "第一次初探" : quest?.status === "ready"
              ? "委托已就绪"
              : quest?.title || "自由探索"}
          </small>
          <b>{next}</b>
        </span>
        <HudIcon name="pin" />
      </button>
      <button
        className="compass-expand"
        aria-label="展开任务追踪"
        aria-expanded={false}
        onClick={() => useGame.setState({ tracking: true })}
      >
        <HudIcon name="journal" />
      </button>
    </aside>
  );
}
