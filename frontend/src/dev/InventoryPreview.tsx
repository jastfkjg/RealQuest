import { useEffect, useState } from "react";
import {
  GameButton,
  InventoryView,
  InventoryWallet,
  ItemSlot,
} from "../components/InventoryView";
import { itemDefinitions } from "../game/items";

const fixtures = {
  starter: "稀疏起步",
  full: "满格压力",
  long: "长名称",
  rejected: "操作被拒绝",
  depleted: "已用尽",
};
type Fixture = keyof typeof fixtures;
const initialQuick = ["seed", "wood", "stone", "crop"];

function FixtureInventory({ fixture }: { fixture: Fixture }) {
  const [selectedId, setSelectedId] = useState("seed");
  const [quickItems, setQuickItems] = useState(initialQuick);
  const [phase, setPhase] = useState("idle");
  useEffect(() => {
    if (phase !== "pending") return;
    const timeout = setTimeout(
      () => setPhase(fixture === "rejected" ? "rejected" : "success"),
      1000,
    );
    return () => clearTimeout(timeout);
  }, [phase, fixture]);
  const definitions = { ...itemDefinitions };
  const quantities: Record<string, number> = {
    seed: fixture === "depleted" ? 0 : 6,
    gold: 20,
  };
  if (fixture === "long")
    definitions.seed = {
      ...definitions.seed,
      name: "来自林间小屋的春日萝卜种子（长名称测试）",
    };
  if (fixture === "full") {
    Object.keys(definitions).forEach((id, index) => {
      quantities[id] = (index + 1) * 12;
    });
    for (let i = 0; i < 19; i++) {
      // Deliberate visual stress stacks, never game IDs or persisted inventory.
      const id = `preview-stack-${i}`;
      definitions[id] = {
        ...itemDefinitions[Object.keys(itemDefinitions)[i % 5]],
      };
      quantities[id] = i === 18 ? 123456 : i + 1;
    }
  }
  return (
    <InventoryView
      quantities={quantities}
      selectedId={selectedId}
      quickItems={quickItems}
      onSelect={setSelectedId}
      onBind={(id, index) => {
        setQuickItems((current) => {
          const result = [...current];
          const old = result.indexOf(id);
          if (old >= 0) result[old] = result[index];
          result[index] = id;
          return result;
        });
      }}
      growthSeconds={60}
      definitions={definitions}
      pending={phase === "pending"}
      error={
        phase === "rejected"
          ? "这块农田已被占用。物品数量未改变，请重新选择。"
          : undefined
      }
      notice={
        phase === "success"
          ? "预览操作已完成；没有保存，也没有消耗物品。"
          : undefined
      }
      action={{
        label: phase === "rejected" ? "重试预览操作" : "模拟操作",
        run: () => setPhase("pending"),
        disabled: !quantities[selectedId],
        reason: !quantities[selectedId]
          ? "暂未持有，收集后再使用或分配快捷栏。"
          : undefined,
        hint: "仅预览反馈，不连接游戏服务器。",
      }}
    />
  );
}

export default function InventoryPreview() {
  const [fixture, setFixture] = useState<Fixture>("starter");
  return (
    <main className="rq-theme hw-preview">
      <header>
        <h1>Hearthwood · 背包候选</h1>
        <p>开发预览 · 所有数量与反馈均为隔离样例，不读取或修改存档。</p>
      </header>
      <nav className="hw-preview-controls" aria-label="预览样例">
        {Object.entries(fixtures).map(([id, label]) => (
          <GameButton
            key={id}
            aria-pressed={id === fixture}
            onClick={() => setFixture(id as Fixture)}
          >
            {label}
          </GameButton>
        ))}
      </nav>
      <p className="hw-preview-controls hw-support">
        {fixture === "full"
          ? "压力样例将已有图标重复到 24 格；游戏当前只有 5 种物品，不支持拆分堆叠。"
          : "可使用鼠标、Tab / Enter 和触摸操作。"}
      </p>
      <section className="hw-preview-sheet">
        <div className="hw-preview-head">
          <h2>旅行背包</h2>
          <InventoryWallet
            gold={fixture === "full" ? 123456 : 20}
            energy={fixture === "full" ? 48 : 0}
            shards={fixture === "full" ? 12 : 0}
          />
        </div>
        <FixtureInventory key={fixture} fixture={fixture} />
      </section>
      <section className="hw-state-preview" aria-label="组件状态">
        <h2>组件状态</h2>
        <p className="hw-support">
          悬停、按下和焦点示例固定展示；实际按钮也支持对应交互。
        </p>
        <div className="hw-state-row">
          <GameButton className="rq-button--primary">默认</GameButton>
          <GameButton className="rq-button--primary hw-preview-state-hover">
            悬停
          </GameButton>
          <GameButton className="rq-button--primary hw-preview-state-pressed">
            按下
          </GameButton>
          <GameButton className="rq-button--primary hw-preview-state-focus">
            焦点
          </GameButton>
          <GameButton disabled>暂未持有</GameButton>
          <GameButton pending>确认</GameButton>
        </div>
        <div className="hw-state-row">
          <figure>
            <ItemSlot />
            <figcaption>空格</figcaption>
          </figure>
          <figure>
            <ItemSlot item={itemDefinitions.seed} count={6} />
            <figcaption>持有</figcaption>
          </figure>
          <figure>
            <ItemSlot item={itemDefinitions.seed} count={6} selected />
            <figcaption>选中</figcaption>
          </figure>
          <figure>
            <ItemSlot item={itemDefinitions.seed} count={6} binding={2} />
            <figcaption>已绑定</figcaption>
          </figure>
          <figure>
            <ItemSlot item={itemDefinitions.seed} count={0} />
            <figcaption>已用尽 · 仅展示</figcaption>
          </figure>
        </div>
        <p className="hw-feedback">分配成功，物品数量不变。</p>
        <p className="hw-feedback hw-error">农田已被占用，未消耗种子。</p>
      </section>
    </main>
  );
}
