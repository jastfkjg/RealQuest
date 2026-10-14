import { useState } from "react";
import { CharacterView } from "../components/CharacterView";
import type { GrowthOption, GrowthTarget } from "../types";

const fixtures = {
  starter: "初到大陆",
  example: "方案示例",
  long: "长名称与大数值",
};
type Fixture = keyof typeof fixtures;
export default function CharacterPreview() {
  const [fixture, setFixture] = useState<Fixture>("starter");
  const [result, setResult] = useState("");
  const sample = fixture !== "starter";
  const options = Object.fromEntries(
    (
      [
        "vitality",
        "stamina",
        "science",
        "magic",
        "planting",
        "ranching",
        "building",
      ] as GrowthTarget[]
    ).map((key) => {
      const capacity = key === "vitality" || key === "stamina",
        knowledge = key === "science" || key === "magic";
      const current = capacity
        ? 100
        : sample
          ? { science: 3, magic: 1, planting: 2, ranching: 0, building: 1 }[
              key
            ] || 0
          : 0;
      return [
        key,
        {
          current,
          next: current + (capacity ? 5 : 1),
          cost: capacity || knowledge ? 1 : current + 1,
          currency: capacity
            ? "health_points"
            : knowledge
              ? "knowledge_points"
              : "skill_points",
          expected_invested: 0,
        },
      ];
    }),
  ) as Record<GrowthTarget, GrowthOption>;
  return (
    <main className="rq-theme hc-preview">
      <nav className="hc-preview-controls" aria-label="预览样例">
        <p>开发样例 · 不连接服务器，不保存数据；升级按钮仅演示反馈。</p>
        {Object.entries(fixtures).map(([id, label]) => (
          <button
            key={id}
            className="rq-button"
            aria-pressed={id === fixture}
            onClick={() => {
              setFixture(id as Fixture);
              setResult("");
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="hc-preview-stage">
        <CharacterView
          key={fixture}
          preview
          character={{
            name:
              fixture === "long" ? "沿着林间溪流寻找远方星光的旅人" : "唤醒者",
            appearance: 0,
          }}
          vitality={{ current: 100, max: 100 }}
          stamina={{ current: sample ? 68 : 100, max: 100 }}
          balances={{
            health_points: sample ? 3 : 0,
            knowledge_points: sample ? 2 : 0,
            skill_points: fixture === "long" ? 12345 : sample ? 5 : 0,
          }}
          options={options}
          result={result}
          onUpgrade={() =>
            setResult(
              "开发样例：正式页面会由服务器确认扣点与升级。此处不保存数据。",
            )
          }
          onSelectionChange={() => setResult("")}
        />
      </div>
    </main>
  );
}
