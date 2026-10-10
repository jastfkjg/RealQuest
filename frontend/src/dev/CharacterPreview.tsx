import { useState } from "react";
import { CharacterView } from "../components/CharacterView";
import type { GameState } from "../types";

const fixtures = {
  starter: "初到大陆",
  near: "临近解锁",
  unlocked: "能力已掌握",
  veteran: "高等级与已解读",
  long: "长名称",
};
type Fixture = keyof typeof fixtures;
export default function CharacterPreview() {
  const [fixture, setFixture] = useState<Fixture>("starter");
  const [feedback, setFeedback] = useState("");
  const attributes: GameState["attributes"] =
    fixture === "near"
      ? { strength: 49, wisdom: 24, craft: 0, stewardship: 0, bond: 0 }
      : ["unlocked", "veteran"].includes(fixture)
        ? { strength: 50, wisdom: 25, craft: 15, stewardship: 10, bond: 5 }
        : { strength: 0, wisdom: 0, craft: 0, stewardship: 0, bond: 0 };
  if (fixture === "veteran")
    Object.keys(attributes).forEach((key) => {
      attributes[key as keyof typeof attributes] += 100;
    });
  const xp = Object.values(attributes).reduce((sum, value) => sum + value, 0);
  return (
    <main className="rq-theme hc-preview">
      <nav className="hc-preview-controls" aria-label="预览样例">
        <p>
          Hearthwood · 冒险者档案候选 · 开发样例，不连接服务器、不保存数据。
        </p>
        {Object.entries(fixtures).map(([id, label]) => (
          <button
            key={id}
            className="rq-button"
            aria-pressed={id === fixture}
            onClick={() => {
              setFixture(id as Fixture);
              setFeedback("");
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="hc-preview-stage">
        <header className="hc-preview-head">
          <h2>冒险者档案</h2>
        </header>
        <CharacterView
          key={fixture}
          character={{
            name:
              fixture === "long"
                ? "沿着林间溪流寻找远方星光的旅人"
                : "林间旅人",
            appearance: fixture === "near" ? 1 : fixture === "unlocked" ? 2 : 0,
          }}
          xp={xp}
          attributes={attributes}
          events={fixture === "veteran" ? ["rune_awakened"] : []}
          onRecord={() =>
            setFeedback("开发预览：这里会打开现有成长记录表单，不保存样例。")
          }
          onNavigate={() =>
            setFeedback("开发预览：这里会标记世界目标，不移动角色。")
          }
          onMap={() => setFeedback("开发预览：这里会打开现有地图。")}
        />
      </div>
      {feedback && (
        <p role="status" className="hc-preview-feedback">
          {feedback}
        </p>
      )}
    </main>
  );
}
