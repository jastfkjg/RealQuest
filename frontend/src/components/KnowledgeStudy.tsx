import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Compass,
  Sparkles,
  Star,
} from "lucide-react";
import { useGame } from "../stores/game";

const paths = {
  science: {
    name: "科学",
    title: "读懂万物的规律",
    description: "从观察与推演出发，把新的理解留在科学之路上。",
    icon: Compass,
  },
  magic: {
    name: "魔法",
    title: "探寻符文的奥秘",
    description: "让想象与灵感相遇，把新的理解留在魔法之路上。",
    icon: Sparkles,
  },
};
type Branch = keyof typeof paths;

export function KnowledgeStudy({
  act,
  onRead,
}: {
  act: (action: string, data: Record<string, unknown>) => Promise<boolean>;
  onRead: (id: string) => void;
}) {
  const { state, busy, error } = useGame();
  const [branch, setBranch] = useState<Branch>("science");
  const [result, setResult] = useState<{
    branch: Branch;
    level: number;
  } | null>(null);
  const lock = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const resultMessage = useRef<HTMLParagraphElement>(null);
  const errorMessage = useRef<HTMLParagraphElement>(null);
  const growth = state!.knowledge_growth || { science: 0, magic: 0 };
  const points = state!.knowledge_points || 0;
  const level = growth[branch];
  const markStart = Math.max(0, Math.floor((level - 1) / 5) * 5);
  const path = paths[branch];
  const Icon = path.icon;
  const earned = (state!.study_task_log || []).filter(
    (t) => t.knowledge_reward,
  );
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, []);
  async function invest() {
    if (lock.current) return;
    lock.current = true;
    setResult(null);
    const chosen = branch;
    try {
      const ok = await act("knowledge_spend", {
        branch: chosen,
        expected_invested: growth.science + growth.magic,
      });
      if (ok) {
        setResult({
          branch: chosen,
          level: useGame.getState().state!.knowledge_growth![chosen],
        });
      }
      requestAnimationFrame(() =>
        (ok ? resultMessage.current : errorMessage.current)?.focus(),
      );
    } finally {
      lock.current = false;
    }
  }
  return (
    <main className="study-book knowledge-book">
      <section className="study-leaf knowledge-atlas" aria-label="选择研修方向">
        <span className="study-eyebrow">
          <BookOpen size={16} aria-hidden="true" /> 知识的两条去路
        </span>
        <h2 ref={heading} tabIndex={-1}>
          将理解，化作力量
        </h2>
        <div className="knowledge-chart">
          <div className="knowledge-source" aria-label={`可用知识点 ${points}`}>
            <Star size={24} aria-hidden="true" />
            <strong>{points}</strong>
            <span>可用知识点</span>
          </div>
          <svg
            className="knowledge-lines"
            viewBox="0 0 320 64"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path d="M160 0v18M80 64V36Q80 18 98 18H222Q240 18 240 36v28" />
            <circle cx="160" cy="18" r="5" />
          </svg>
          <div className="knowledge-paths" role="group" aria-label="研修方向">
            {(Object.keys(paths) as Branch[]).map((key) => {
              const PathIcon = paths[key].icon;
              return (
                <button
                  key={key}
                  aria-pressed={branch === key}
                  disabled={busy}
                  onClick={() => {
                    setBranch(key);
                    setResult(null);
                  }}
                >
                  <PathIcon size={38} strokeWidth={1.3} aria-hidden="true" />
                  <strong>{paths[key].name}</strong>
                  <span>{growth[key]} 级</span>
                  <small>
                    {branch === key ? (
                      <>
                        <Check size={14} aria-hidden="true" /> 已选择
                      </>
                    ) : (
                      "选择方向"
                    )}
                  </small>
                </button>
              );
            })}
          </div>
        </div>
        <p className="knowledge-caption">
          选择只翻开书页，投入才会消耗知识点。
        </p>
      </section>
      <section
        className="study-leaf knowledge-detail"
        aria-label={`${path.name}研修`}
      >
        <span className="study-eyebrow">
          {branch === "science" ? "观察 · 推演 · 创造" : "感知 · 想象 · 共鸣"}
        </span>
        <div className="knowledge-emblem" key={branch} aria-hidden="true">
          <Icon size={62} strokeWidth={1.1} />
        </div>
        <h2>{path.title}</h2>
        <p className="knowledge-description">{path.description}</p>
        <div
          className="knowledge-level"
          aria-label={`${path.name}当前 ${level} 级，投入后 ${level + 1} 级`}
        >
          <span>{path.name}等级</span>
          <strong>{level}</strong>
          <ArrowRight size={22} aria-hidden="true" />
          <b>{level + 1}</b>
        </div>
        <div
          className="knowledge-marks"
          aria-label={`第 ${markStart + 1} 至 ${markStart + 5} 级，当前 ${level} 级`}
        >
          {Array.from({ length: 5 }, (_, i) => (
            <span
              key={markStart + i}
              data-lit={level >= markStart + i + 1}
              aria-hidden="true"
            >
              {level >= markStart + i + 1 ? (
                <Check size={18} />
              ) : (
                <Star size={16} />
              )}
              <small>{markStart + i + 1}</small>
            </span>
          ))}
        </div>
        <p className="knowledge-cost">
          每投入 1 知识点，点亮 1 级。两个方向可自由分配。
        </p>
        {error && (
          <p
            ref={errorMessage}
            tabIndex={-1}
            className="knowledge-error"
            role="alert"
          >
            {/Failed to fetch|NetworkError|Load failed/i.test(error)
              ? "暂时连接不上，请重试。已保存的成长会自动核对。"
              : error}
          </p>
        )}
        <button
          className="rq-button rq-button--primary knowledge-invest"
          disabled={busy || points < 1}
          onClick={() => void invest()}
        >
          <Star size={18} aria-hidden="true" />
          {busy
            ? "正在刻下成长…"
            : points
              ? `投入 1 知识点 · ${path.name} +1`
              : "还需要 1 知识点"}
        </button>
        {result && (
          <p
            key={`${result.branch}-${result.level}`}
            className="knowledge-result"
            ref={resultMessage}
            tabIndex={-1}
            role="status"
          >
            <Check size={18} aria-hidden="true" />
            {paths[result.branch].name}已提升至 {result.level} 级
          </p>
        )}
        <button
          className="study-text-button knowledge-return"
          onClick={() => useGame.getState().open("activity")}
        >
          <ArrowLeft size={16} aria-hidden="true" />
          查看现实委托
        </button>
        <p className="knowledge-future">
          科学与魔法等级会永久保留。相应道具与法术的使用效果将在后续开放。
        </p>
        <details className="study-records knowledge-sources">
          <summary>
            知识从哪里来{earned.length ? ` · ${earned.length} 页` : ""}
          </summary>
          <p>
            在诺亚处结算学习委托，每小时获得 1 知识点。三类委托每日合计最多 5
            点；旧手札不再发放点数。
          </p>
          {earned.slice(0, 4).map((task) => (
            <button
              key={task.id}
              className="study-text-button"
              onClick={() => onRead(task.id)}
            >
              <span>
                {task.title}
                <small>{task.date} · 已获得 1 知识点</small>
              </span>
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          ))}
          <p>
            旧日已完成书页保留原有成长，不补发知识点；学识经验与知识碎片仍各自保留。
          </p>
        </details>
      </section>
    </main>
  );
}
