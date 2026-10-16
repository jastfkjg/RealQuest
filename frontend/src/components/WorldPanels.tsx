import type { LifeTask } from "../types";
import { residentPlace } from "../game/residents";
import { NpcPerson } from "./NpcPerson";
import { NpcSocial } from "./Residents";
import { LifeQuestDialogue, LifeQuota } from "./LifeQuests";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowUpFromLine,
  ArrowRight,
  Archive,
  Hammer,
  Leaf,
  Sparkles,
  Backpack,
  Check,
  MapPin,
} from "lucide-react";
import { useGame } from "../stores/game";
import { itemDefinitions, itemNames } from "../game/items";
import { QuestDetails } from "./Quests";
import { questStatuses } from "../game/questPresentation";
import { LibraryEncounter } from "./LibraryEncounter";

export function MaterialIcon({ item }: { item: string }) {
  const src =
    item === "gold"
      ? "/assets/hearthwood/detail/items/gold.png"
      : itemDefinitions[item]?.icon;
  return src ? (
    <img className="hp-item-icon" src={src} width={32} height={32} alt="" />
  ) : null;
}

export function StoragePanel() {
  const { state, command, busy } = useGame();
  const [selectedItem, selectItem] = useState("seed");
  const [page, turnPage] = useState(0);
  if (!state) return null;
  const items = Object.keys(state.storage);
  const item = items.includes(selectedItem) ? selectedItem : items[0];
  const pages = Math.max(1, Math.ceil(items.length / 6));
  const turn = (next: number) => {
    turnPage(next);
    selectItem(items[next * 6]);
  };
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
              <img
                className="ha-container-art"
                src={
                  side === "inventory"
                    ? "/assets/hearthwood/detail/items/backpack.png"
                    : "/assets/hearthwood/detail/interiors/chest-open.png"
                }
                alt=""
              />
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
              {items.slice(page * 6, page * 6 + 6).map((id) => (
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
      {pages > 1 && (
        <nav className="field-pager" aria-label="储物物品翻页">
          <button disabled={page === 0} onClick={() => turn(page - 1)}>
            上一页
          </button>
          <span>
            物品 {page + 1} / {pages}
          </span>
          <button disabled={page + 1 >= pages} onClick={() => turn(page + 1)}>
            下一页
          </button>
        </nav>
      )}
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
  const [page, turn] = useState("plan");
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
      {building === "workshop" && (
        <nav className="field-tabs" aria-label="工坊书页">
          <button aria-pressed={page === "plan"} onClick={() => turn("plan")}>
            修缮蓝图
          </button>
          <button
            aria-pressed={page === "counter"}
            onClick={() => turn("counter")}
          >
            加工与买卖
          </button>
        </nav>
      )}
      {page === "plan" && (
        <div className="field-workorder-main">
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
                <img
                  src={`/assets/hearthwood/village/${building}.png`}
                  width={128}
                  height={128}
                  alt=""
                />
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
                <strong>
                  {level < 3 ? effect(level + 1) : "已达最高等级"}
                </strong>
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
        </div>
      )}
      {building === "workshop" && page === "counter" && (
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
  const selected = useGame((s) => s.selected);
  return selected?.id === "lia" ? (
    <LibraryEncounter>{children}</LibraryEncounter>
  ) : (
    <OtherConversationPanel>{children}</OtherConversationPanel>
  );
}

function OtherConversationPanel({ children }: { children: ReactNode }) {
  const { selected, state, world, open, navigate } = useGame();
  const [showRequest, setShowRequest] = useState(false);
  const [receipt, setReceipt] = useState<LifeTask | null>(null);
  const [life, setLife] = useState(selected?.id === "noah");
  const [social, setSocial] = useState(false);
  const requestRef = useRef<HTMLDivElement>(null);
  const replyRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (showRequest)
      requestRef.current
        ?.querySelector<HTMLButtonElement>("button:not(:disabled)")
        ?.focus();
    else replyRef.current?.focus();
  }, [showRequest]);
  if (!selected || !state) return null;
  const librarian = selected.id === "lia";
  const noah = selected.id === "noah";
  const activeCommission = state.life_journal?.tasks.some(
    (task) => task.status === "active",
  );
  const quests = state.quest_log.filter((q) => q.giver === selected.id);
  const quest =
    quests.find((q) => ["ready", "active", "available"].includes(q.status)) ||
    quests[0];
  return (
    <div
      className={`ha-encounter ${noah ? "ha-commission" : ""}`}
      data-contract={noah && life && activeCommission ? "true" : undefined}
      data-commission-phase={
        noah
          ? social
            ? "daily"
            : !life
              ? "talk"
              : activeCommission
                ? "active"
                : receipt
                  ? "receipt"
                  : "offer"
          : undefined
      }
    >
      {noah && (
        <h2 className="commission-title" aria-hidden="true">
          <Leaf size={22} aria-hidden="true" />
          林间委托
        </h2>
      )}
      {noah ? (
        <aside className="commission-host" aria-label="森林向导诺亚">
          <div
            className="commission-riverside"
            data-indoor={selected.location !== "overworld"}
            aria-hidden="true"
          >
            <NpcPerson id="noah" />
          </div>
          <div className="commission-host-paper">
            <h3>{selected.name}</h3>
            <p>森林向导</p>
            <div className="commission-host-line" aria-hidden="true">
              ✧
            </div>
            <blockquote>
              {!life ? (
                "不急，坐下来聊聊。"
              ) : receipt && !activeCommission ? (
                <>
                  这份约定，辛苦了。
                  <br />
                  你的成长，我记下了。
                </>
              ) : activeCommission ? (
                <>
                  去忙你的吧。
                  <br />
                  我替你守着这份约定。
                </>
              ) : (
                <>
                  给好奇心留一段时间。
                  <br />
                  今天，想做些什么？
                </>
              )}
            </blockquote>
            <small>
              <MapPin size={13} aria-hidden="true" />
              {world
                ? residentPlace(world, selected.location || state.location)
                : "今日相逢"}{" "}
              · 熟悉度 {state.relationships[selected.id] || 0}
            </small>
          </div>
        </aside>
      ) : (
        <aside className="ha-npc-identity">
          <span className="ha-eyebrow">林间相逢</span>
          <div className="ha-npc-vignette">
            <NpcPerson id={selected.id} />
            <Leaf size={24} />
          </div>
          <h3>{selected.name}</h3>
          <p>{librarian ? "图书管理员" : noah ? "森林向导" : "杂货铺店主"}</p>
          <span className="ha-npc-place">
            <MapPin size={14} />
            {world
              ? residentPlace(world, selected.location || state.location)
              : "村庄相逢"}
          </span>
          <small>熟悉度 {state.relationships[selected.id] || 0}</small>
        </aside>
      )}
      <div className="ha-dialogue-scene">
        {noah && (
          <div className="life-paper-heading">
            <div
              className="life-dialogue-tabs"
              role="group"
              aria-label="对话话题"
            >
              <button
                aria-pressed={life && !social}
                onClick={() => {
                  setLife(true);
                  setSocial(false);
                }}
              >
                现实委托
              </button>
              <button
                aria-pressed={!life && !social}
                onClick={() => {
                  setLife(false);
                  setSocial(false);
                }}
              >
                村庄闲谈
              </button>
              <button
                aria-pressed={social}
                onClick={() => {
                  setSocial(true);
                  setLife(false);
                }}
              >
                邻里日常
              </button>
            </div>
            {life ? (
              <LifeQuota />
            ) : (
              <span className="commission-place">
                <MapPin size={16} aria-hidden="true" />
                诺亚的村庄日常
              </span>
            )}
          </div>
        )}
        {social && noah ? (
          <section className="noah-daily-paper" aria-label="诺亚的日常相逢">
            <header>
              <NpcPerson id="noah" portrait />
              <div>
                <small>森林向导 · 邻里日常</small>
                <h3>路上的事，生活的事</h3>
              </div>
            </header>
            <div className="npc-reply">{children}</div>
            <NpcSocial id="noah" />
            <small className="npc-social-footnote">
              预设村庄对话 · 游戏内互动
            </small>
            <button className="talk-farewell" onClick={() => open(null)}>
              改天再聊
            </button>
          </section>
        ) : life && selected.id === "noah" ? (
          <LifeQuestDialogue receipt={receipt} onReceipt={setReceipt} />
        ) : noah ? (
          <section className="noah-talk" aria-label="与诺亚闲谈">
            <div className="life-contract-scroll talk-parchment">
              <div className="talk-nameplate">
                <Leaf size={18} aria-hidden="true" />
                <strong>{selected.name}</strong>
                <span>森林向导</span>
              </div>
              <div className="hp-speech">{children}</div>
              <p className="talk-signature">
                想听听我最近的发现吗？ <span>— 诺亚</span>
              </p>
            </div>
            {quest && !showRequest && (
              <div className="talk-letter" aria-label="诺亚的剧情委托">
                <img
                  src="/assets/hearthwood/commission-letter-v1.webp"
                  alt=""
                />
                <div>
                  <span>诺亚的委托</span>
                  <h4>{quest.title}</h4>
                  <small>{questStatuses[quest.status]}</small>
                </div>
              </div>
            )}
            {quest && showRequest && (
              <div className="talk-quest-details" ref={requestRef}>
                <header>
                  <h4>{quest.title}</h4>
                  <small>{questStatuses[quest.status]}</small>
                </header>
                <QuestDetails quest={quest} conversational />
                <button
                  className="life-text-button"
                  onClick={() => {
                    setShowRequest(false);
                  }}
                >
                  收起信件
                </button>
              </div>
            )}
            <div className="contract-actions talk-actions">
              {quest && !showRequest && (
                <button
                  className="rq-button rq-button--primary life-main-action"
                  ref={replyRef}
                  onClick={() => setShowRequest(true)}
                >
                  聊聊这份委托 <ArrowRight size={18} aria-hidden="true" />
                </button>
              )}
              <button
                className="rq-button talk-farewell"
                onClick={() => open(null)}
              >
                改天再聊
              </button>
            </div>
            <small className="hp-story-label">
              <Leaf size={14} aria-hidden="true" />
              预设剧情对话
            </small>
          </section>
        ) : (
          <>
            <div className="ha-dialogue-label">{selected.name}说</div>
            <NpcSocial id={selected.id} />
            {!noah && !librarian && (
              <button
                onClick={() =>
                  navigate({ mapId: "overworld", targetId: "shop" })
                }
              >
                标记风铃杂货铺
              </button>
            )}
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
          </>
        )}
        {!noah && (
          <div className="ha-dialogue-actions">
            {!life && quest && !showRequest && (
              <button className="primary" onClick={() => setShowRequest(true)}>
                继续 · 聊聊这份委托 <ArrowRight size={16} />
              </button>
            )}
            <button className="hp-farewell" onClick={() => open(null)}>
              暂时离开
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
