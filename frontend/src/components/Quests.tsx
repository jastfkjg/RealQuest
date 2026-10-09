import {
  Check,
  Flag,
  MapPin,
  ArrowRight,
  BookOpen,
  Circle,
  LockKeyhole,
} from "lucide-react";
import { useGame, itemNames } from "../stores/game";
import { questTarget } from "../game/navigation";
import type { Quest } from "../types";
const statuses = {
  available: "可接取",
  locked: "尚未解锁",
  active: "进行中",
  ready: "可交付",
  claimed: "已完成",
};
export function QuestList({ giver }: { giver?: string }) {
  const { state, selected, command, busy, navigate, open } = useGame();
  if (!state) return null;
  const quests = state.quest_log.filter((q) => !giver || q.giver === giver);
  return (
    <div className="quest-cards">
      {quests.map((q) => {
        const atGiver = selected?.id === q.giver;
        return (
          <article className={`quest-entry quest-${q.status}`} key={q.id}>
            <div className="quest-entry-title">
              <h3>{q.title}</h3>
              <span className="quest-status">{statuses[q.status]}</span>
            </div>
            <small>
              <MapPin size={12} />
              {q.giver_name}
            </small>
            <p>{q.description}</p>
            <ul>
              {q.objectives.map((item, i) => (
                <li key={item} className={q.checks[i] ? "complete" : ""}>
                  {q.checks[i] ? <Check size={14} /> : <Circle size={12} />}{" "}
                  {item}
                </li>
              ))}
            </ul>
            <div className="quest-reward">
              奖励：
              {Object.entries(q.reward)
                .map(([k, v]) => `${v} ${itemNames[k]}`)
                .join(" · ")}{" "}
              · {q.xp} EXP
            </div>
            <div className="quest-actions">
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
                  className="primary"
                  disabled={busy}
                  onClick={() =>
                    void command("quest_accept", { quest_id: q.id })
                  }
                >
                  接取任务 <Flag size={15} />
                </button>
              ) : q.status === "ready" && atGiver ? (
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() =>
                    void command("quest_claim", { quest_id: q.id })
                  }
                >
                  交付任务 · 领取奖励
                </button>
              ) : (
                <button
                  onClick={() => {
                    const target = questTarget(q, state);
                    if (target) navigate(target);
                  }}
                >
                  <MapPin size={15} />
                  {q.status === "ready"
                    ? "前往交付"
                    : q.status === "available"
                      ? "找到委托人"
                      : "标记下一步"}
                </button>
              )}
              {q.status === "active" && (
                <button
                  disabled={busy || state.tracked_quest === q.id}
                  onClick={() =>
                    void command("track_quest", { quest_id: q.id })
                  }
                >
                  {state.tracked_quest === q.id ? "正在追踪" : "追踪任务"}
                </button>
              )}
              {q.id === "rune_research" &&
                q.status === "active" &&
                !q.checks[1] && (
                  <button onClick={() => open("activity")}>
                    记录学习 <BookOpen size={14} />
                  </button>
                )}
            </div>
          </article>
        );
      })}
      {!quests.length && <p className="muted">这里暂时没有新的委托。</p>}
    </div>
  );
}
export function QuestTracker() {
  const { state, open, navigate } = useGame();
  if (!state) return null;
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
