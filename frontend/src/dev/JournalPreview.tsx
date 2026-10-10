import { useEffect, useState } from "react";
import { JournalView } from "../components/JournalView";
import type { GameState, Quest } from "../types";
import sourceQuests from "./journal-fixtures.json";

const fixtures = {
  starter: "起步委托",
  ready: "可交付",
  completed: "已完成",
  growth: "成长记录",
  long: "长文压力",
  rejected: "拒绝与重试",
};
type Fixture = keyof typeof fixtures;

function FixtureJournal({ fixture }: { fixture: Fixture }) {
  const [phase, setPhase] = useState("idle");
  useEffect(() => {
    if (phase !== "pending") return;
    const timer = setTimeout(
      () => setPhase(fixture === "rejected" ? "rejected" : "success"),
      900,
    );
    return () => clearTimeout(timer);
  }, [phase, fixture]);
  const quests = structuredClone(sourceQuests) as Quest[];
  if (fixture === "ready" || fixture === "completed") {
    quests[0].checks = [true, true];
    quests[0].status = fixture === "ready" ? "ready" : "claimed";
  }
  if (fixture === "completed")
    quests
      .filter((q) => q.requires === "settle_in")
      .forEach((q) => {
        q.status = "available";
      });
  if (fixture === "long") {
    quests[0].title = "【长名称样例】把沿途发现的小事写进这本陪伴旅途的手账";
    quests[0].description =
      "这是一段仅用于开发预览的长文，检查纸页在窄屏上的换行和滚动。".repeat(10);
    quests[0].objectives[0] +=
      "（长目标样例：沿着溪流、树林与村庄小路，寻找足够详细的方向）";
  }
  const activities: GameState["activities"] =
    fixture === "growth"
      ? [
          {
            kind: "study",
            amount: 25,
            date: "2026-10-10",
            source: "timer",
            verified: false,
            note: "开发样例：读完今天的一章，记下最想继续探索的问题。",
            xp: 25,
          },
          {
            kind: "management",
            amount: 1,
            date: "2026-10-10",
            source: "manual",
            verified: false,
            note: "开发样例：整理桌面。",
            xp: 15,
          },
        ]
      : [];
  return (
    <JournalView
      quests={quests}
      trackedId={quests[0].status === "claimed" ? null : "settle_in"}
      activities={activities}
      onRecordGrowth={() => setPhase("record")}
      renderActions={(q) => (
        <div className="hj-actions">
          {q.status === "locked" ? (
            <small>先完成「给新生活一个落脚点」</small>
          ) : q.status === "claimed" ? (
            <span>已交付，奖励已领取</span>
          ) : (
            <button
              className="rq-button rq-button--primary"
              disabled={phase === "pending"}
              onClick={() => setPhase("pending")}
            >
              {phase === "pending"
                ? "处理中…"
                : phase === "rejected"
                  ? "重试预览操作"
                  : "模拟操作"}
            </button>
          )}
        </div>
      )}
      feedback={
        phase === "rejected" ? (
          <p className="hj-feedback hj-error" role="alert">
            预览操作被拒绝，请重试。没有修改任务或奖励。
          </p>
        ) : ["success", "record"].includes(phase) ? (
          <p className="hj-feedback" role="status">
            仅预览反馈，没有连接服务器或保存记录。
          </p>
        ) : undefined
      }
    />
  );
}

export default function JournalPreview() {
  const [fixture, setFixture] = useState<Fixture>("starter");
  return (
    <main className="rq-theme hj-preview">
      <nav className="hj-preview-toolbar" aria-label="预览样例">
        <p>
          Hearthwood · 手账候选 ·
          开发样例，不连接游戏服务器、不保存数据。完成篇章与成长记录请点击对应书签。
        </p>
        {Object.entries(fixtures).map(([id, name]) => (
          <button
            key={id}
            className="rq-button"
            aria-pressed={id === fixture}
            onClick={() => setFixture(id as Fixture)}
          >
            {name}
          </button>
        ))}
      </nav>
      <div className="hj-preview-stage">
        <header className="hj-preview-head">
          <h2>冒险日志</h2>
        </header>
        <FixtureJournal fixture={fixture} key={fixture} />
      </div>
    </main>
  );
}
