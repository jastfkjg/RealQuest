import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowUpFromLine,
  ArrowRight,
  Archive,
  Hammer,
  Home,
  Leaf,
  Sparkles,
  Backpack,
  Check,
  MapPin,
} from "lucide-react";
import { useGame } from "../stores/game";
import { itemDefinitions, itemNames } from "../game/items";
import { PixelPerson } from "./PixelPerson";
import { QuestDetails } from "./Quests";
import { questStatuses } from "../game/questPresentation";

export function MaterialIcon({ item }: { item: string }) {
  const src =
    item === "gold"
      ? "/assets/ninja-adventure/icons/gold.png"
      : itemDefinitions[item]?.icon;
  return src ? (
    <img className="hp-item-icon" src={src} width={32} height={32} alt="" />
  ) : null;
}

export function StoragePanel() {
  const { state, command, busy } = useGame();
  const [selectedItem, selectItem] = useState("seed");
  if (!state) return null;
  const items = Object.keys(state.storage);
  const item = items.includes(selectedItem) ? selectedItem : items[0];
  return (
    <div className="ha-transfer">
      <p className="ha-transfer-hint">选中物品，在背包与家中之间存取。</p>
      <div className="ha-containers">
        {(["inventory", "storage"] as const).map((side) => (
          <section
            key={side}
            className={`ha-container ha-container--${side}`}
            aria-label={side === "inventory" ? "随身背包" : "家园箱子"}
          >
            <h3>
              {side === "inventory" ? (
                <Backpack size={22} />
              ) : (
                <Archive size={22} />
              )}{" "}
              {side === "inventory" ? "随身背包" : "家园箱子"}
              <small>
                {items.filter((id) => state[side][id] > 0).length} 类物品
              </small>
            </h3>
            <div className="ha-item-grid">
              {items.map((id) => (
                <button
                  key={id}
                  className="ha-item-slot"
                  data-empty={!state[side][id]}
                  aria-pressed={item === id}
                  aria-label={`${side === "inventory" ? "背包" : "箱中"}${itemNames[id]}，${state[side][id]} 份`}
                  onClick={() => selectItem(id)}
                >
                  <MaterialIcon item={id} />
                  <span>{itemNames[id]}</span>
                  <b>{state[side][id]}</b>
                </button>
              ))}
            </div>
            <p>
              {side === "inventory"
                ? "随身携带，供旅途使用"
                : "留在家里，随存档保存"}
            </p>
          </section>
        ))}
      </div>
      {item && (
        <section className="ha-transfer-action" aria-label="选中物品存取">
          <div className="ha-transfer-item">
            <MaterialIcon item={item} />
            <div>
              <h3>{itemNames[item]}</h3>
              <p aria-live="polite">
                背包 {state.inventory[item]} <span aria-hidden="true">↔</span>{" "}
                箱中 {state.storage[item]}
              </p>
            </div>
          </div>
          <div className="button-row">
            <button
              className="primary"
              aria-label={`存入 1 ${itemNames[item]}`}
              disabled={busy || !state.inventory[item]}
              onClick={() =>
                void command("store", { target: "home_chest", item, amount: 1 })
              }
            >
              存入 1 <ArrowRight size={16} />
            </button>
            <button
              aria-label={`取回 1 ${itemNames[item]}`}
              disabled={busy || !state.storage[item]}
              onClick={() =>
                void command("withdraw", {
                  target: "home_chest",
                  item,
                  amount: 1,
                })
              }
            >
              <ArrowUpFromLine size={16} />
              取回 1
            </button>
          </div>
        </section>
      )}
      <p className="hp-footnote">
        {busy ? "正在保存这次移动…" : "每次移动 1 份物品"}
      </p>
    </div>
  );
}

export function BuildingPanel() {
  const { selected, state, command, busy } = useGame();
  if (!selected || !state) return null;
  const building = selected.building || selected.id || "home",
    level = state.buildings[building] || 1;
  const effect = (stage: number) =>
    building === "home"
      ? `新作物成熟 ${stage >= 2 ? 45 : 60} 秒`
      : building === "workshop"
        ? `萝卜售价 ${8 + stage - 1} 金币`
        : `首次解读奖励 ${stage * 3} 知识碎片`;
  const materials: [string, number][] = [
    ["wood", level * 6],
    ["stone", level * 3],
    ["gold", level * 10],
  ];
  const enough = materials.every(([id, cost]) => state.inventory[id] >= cost);
  return (
    <div className="hp-workorder">
      <div className="ha-blueprint">
        <div className="ha-blueprint-heading">
          <Hammer size={18} />
          <span>修缮蓝图</span>
          <small>
            {building === "home"
              ? "林间小屋"
              : building === "workshop"
                ? "木作工坊"
                : "回响图书馆"}
          </small>
        </div>
        <div className="ha-blueprint-drawing" aria-hidden="true">
          <span className="ha-dimension ha-dimension--top" />
          <div className="hp-house-sketch">
            {building === "home" || building === "library" ? (
              <img
                src={`/assets/ninja-adventure/house-${building}.png`}
                width={80}
                height={80}
                alt=""
              />
            ) : (
              <Home size={80} strokeWidth={1} />
            )}
          </div>
          <span className="ha-dimension ha-dimension--bottom" />
        </div>
        <div className="ha-stages">
          <div>
            <small>当前 · Lv.{level}</small>
            <strong>{effect(level)}</strong>
          </div>
          <ArrowRight size={22} />
          <div>
            <small>
              {level < 3 ? `下一阶段 · Lv.${level + 1}` : "修缮完成"}
            </small>
            <strong>{level < 3 ? effect(level + 1) : "已达最高等级"}</strong>
          </div>
        </div>
      </div>
      <section className="hp-materials">
        <h4>{level < 3 ? "备好这些材料" : "已达最高等级"}</h4>
        {level < 3 && (
          <div className="hp-material-list">
            {materials.map(([id, cost]) => (
              <div
                key={id}
                className="hp-material"
                data-enough={state.inventory[id] >= cost}
              >
                <MaterialIcon item={id} />
                <div>
                  <b>
                    {cost} {itemNames[id]}
                  </b>
                  <small>
                    {state.inventory[id] >= cost ? (
                      <>
                        <Check size={13} />
                        已备齐
                      </>
                    ) : (
                      `还缺 ${cost - state.inventory[id]}`
                    )}
                  </small>
                  <span className="ha-material-count">
                    持有 {state.inventory[id]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      <button
        className="primary hp-upgrade-action"
        disabled={busy || level >= 3 || !enough}
        onClick={() => void command("upgrade", { target: selected.id })}
      >
        {busy
          ? "修缮中…"
          : level >= 3
            ? "修缮已完成"
            : enough
              ? "开始修缮"
              : "材料尚未备齐"}
        <ArrowRight size={16} />
      </button>
      {building === "workshop" && (
        <section className="hp-counter">
          <h4>
            <Hammer size={18} />
            工坊柜台
          </h4>
          {[
            {
              item: "crop",
              name: "出售萝卜",
              recipe: `1 萝卜 → ${8 + level - 1} 金币`,
              action: "sell",
              verb: "出售",
              disabled: !state.inventory.crop,
            },
            {
              item: "seed",
              name: "购买种子",
              recipe: "2 金币 → 1 种子",
              action: "buy_seed",
              verb: "购买",
              disabled: state.inventory.gold < 2,
            },
            {
              item: "plank",
              name: "制作木板",
              recipe: "3 木材 → 1 木板",
              action: "craft",
              verb: "制作",
              disabled: state.inventory.wood < 3,
            },
          ].map((row) => (
            <div className="shop-row" key={row.action}>
              <MaterialIcon item={row.item} />
              <span>
                {row.name}
                <small>{row.recipe}</small>
              </span>
              <button
                disabled={busy || row.disabled}
                onClick={() =>
                  void command(row.action, { target: "workshop_counter" })
                }
              >
                {row.verb}
              </button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

export function ConversationPanel({ children }: { children: ReactNode }) {
  const { selected, state, open } = useGame();
  const [showRequest, setShowRequest] = useState(false);
  const requestRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (showRequest)
      requestRef.current
        ?.querySelector<HTMLButtonElement>("button:not(:disabled)")
        ?.focus();
  }, [showRequest]);
  if (!selected || !state) return null;
  const librarian = selected.id === "lia";
  const quests = state.quest_log.filter((q) => q.giver === selected.id);
  const quest =
    quests.find((q) => ["ready", "active", "available"].includes(q.status)) ||
    quests[0];
  return (
    <div className="ha-encounter">
      <aside className="ha-npc-identity">
        <span className="ha-eyebrow">林间相逢</span>
        <div className="ha-npc-vignette">
          <PixelPerson variant={librarian ? 0 : 2} />
          <Leaf size={24} />
        </div>
        <h3>{selected.name}</h3>
        <p>{librarian ? "图书管理员" : "森林向导"}</p>
        <span className="ha-npc-place">
          <MapPin size={14} />
          {librarian ? "回响图书馆前" : "回响村庄 · 河岸"}
        </span>
        <small>关系值 {state.relationships[selected.id] || 0}</small>
      </aside>
      <div className="ha-dialogue-scene">
        <div className="ha-dialogue-label">{selected.name}说</div>
        <div className="hp-speech">
          {children}
          <small className="hp-story-label">预设剧情对话</small>
        </div>
        {quest && (
          <section className="ha-encounter-request">
            <div className="ha-request-teaser">
              <Sparkles size={18} />
              <div>
                <small>{questStatuses[quest.status]}</small>
                <h4>{quest.title}</h4>
              </div>
            </div>
            {showRequest && (
              <div className="ha-request-details" ref={requestRef}>
                <QuestDetails quest={quest} conversational />
              </div>
            )}
          </section>
        )}
        <div className="ha-dialogue-actions">
          {quest && !showRequest && (
            <button className="primary" onClick={() => setShowRequest(true)}>
              继续 · 聊聊这份委托 <ArrowRight size={16} />
            </button>
          )}
          <button className="hp-farewell" onClick={() => open(null)}>
            暂时离开
          </button>
        </div>
      </div>
    </div>
  );
}
