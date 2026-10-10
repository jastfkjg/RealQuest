import { useState } from "react";
import {
  ArrowRight,
  Backpack,
  BookOpen,
  Check,
  ChevronRight,
  Hammer,
  Heart,
  Leaf,
  LockKeyhole,
  Map,
  MapPin,
  Sparkles,
  Sprout,
  Zap,
} from "lucide-react";
import { attributeNames, itemNames, useGame } from "../stores/game";
import { currentMap } from "../game/navigation";
import type { Attribute } from "../types";

export function PixelPerson({ variant = 0 }: { variant?: number }) {
  return (
    <div aria-hidden="true" className={`pixel-person person-${variant}`} />
  );
}

export function CharacterStage({
  appearance,
  large = false,
}: {
  appearance: number;
  large?: boolean;
}) {
  return (
    <div
      className={`character-stage ${large ? "stage-large" : ""}`}
      aria-hidden="true"
    >
      <div className="stage-halo" />
      <div className="stage-tree tree-left" />
      <div className="stage-tree tree-right" />
      <div className="stage-ground" />
      <div className="stage-path" />
      <div className="stage-flower flower-left" />
      <div className="stage-flower flower-right" />
      <div className="stage-person" key={appearance}>
        <PixelPerson variant={appearance} />
      </div>
      <i className="stage-mote mote-one" />
      <i className="stage-mote mote-two" />
      <i className="stage-mote mote-three" />
    </div>
  );
}

const items: Record<
  string,
  { group: string; description: string; source: string; use: string }
> = {
  wood: {
    group: "材料",
    description: "带着树脂香气的结实木材。家园的一梁一柱，都从这里开始。",
    source: "林间落枝 · 每 30 秒恢复",
    use: "3 木材 → 1 木板",
  },
  stone: {
    group: "材料",
    description: "从岩堆中采集的石料，是加固小屋与工坊的基础材料。",
    source: "岩石采集点 · 每 30 秒恢复",
    use: "用于小屋、工坊和图书馆升级",
  },
  seed: {
    group: "种植",
    description: "一小袋萝卜种子。种进家门口的空地，等待新生活破土而出。",
    source: "工坊购买 · 收获时留种",
    use: "1 种子 → 2 萝卜 + 1 种子",
  },
  crop: {
    group: "收获",
    description: "刚从泥土中拔出的新鲜萝卜。带去工坊，为下一次冒险换些金币。",
    source: "家园农田 · 成熟后收获",
    use: "在工坊柜台出售",
  },
  plank: {
    group: "材料",
    description: "细心打磨的木板，保留着温暖的木纹。也是完成工匠委托的证明。",
    source: "工坊制作 · 消耗 3 木材",
    use: "完成制作相关委托",
  },
};

export function Wallet() {
  const { state } = useGame();
  if (!state) return null;
  return (
    <div className="rpg-wallet" aria-label="随身货币与特殊资源">
      <span>
        <i className="item-icon gold" /> <b>{state.inventory.gold}</b>
        <small>金币</small>
      </span>
      <span>
        <Zap size={15} />
        <b>{state.energy}</b>
        <small>能量</small>
      </span>
      <span>
        <Sparkles size={15} />
        <b>{state.knowledge_shard}</b>
        <small>知识碎片</small>
      </span>
    </div>
  );
}

export function InventoryPanel() {
  const {
    state,
    world,
    inventoryItem,
    selectItem,
    quickItems,
    pinItem,
    navigate,
    command,
    busy,
    open,
  } = useGame();
  const [filter, setFilter] = useState("全部");
  if (!state || !world) return null;
  const owned = Object.keys(items).filter((key) => state.inventory[key] > 0);
  const visible = owned.filter(
    (key) => filter === "全部" || items[key].group === filter,
  );
  const item = inventoryItem || owned[0] || "seed",
    info = items[item] || items.seed;
  const count = state.inventory[item] || 0;
  const map = currentMap(world, state);
  const nearby = (id: string) => {
    const object = map.objects.find((o) => o.id === id);
    return (
      object &&
      Math.hypot(object.x - state.position.x, object.y - state.position.y) <= 65
    );
  };
  const plot = world.objects
    .filter((o) => o.kind === "plot" && !state.plots[o.id])
    .sort(
      (a, b) =>
        Math.hypot(a.x - state.position.x, a.y - state.position.y) -
        Math.hypot(b.x - state.position.x, b.y - state.position.y),
    )[0];
  const atCounter = !!nearby("workshop_counter");
  let actionLabel = "查看相关委托",
    action = () => open("journal"),
    disabled = false;
  if (item === "seed") {
    actionLabel = plot && nearby(plot.id) ? "种下一颗种子" : "前往家园播种";
    disabled = !count || !plot;
    action = () => {
      if (!plot) return;
      if (nearby(plot.id)) void command("plant", { target: plot.id });
      else navigate({ mapId: "overworld", targetId: plot.id });
    };
  } else if (item === "wood") {
    actionLabel = atCounter ? "制作 1 块木板" : "前往工坊制作";
    disabled = atCounter && count < 3;
    action = () => {
      if (atCounter) void command("craft", { target: "workshop_counter" });
      else navigate({ mapId: "workshop", targetId: "workshop_counter" });
    };
  } else if (item === "crop") {
    actionLabel = atCounter
      ? `出售 · +${7 + state.buildings.workshop} 金币`
      : "前往工坊出售";
    disabled = !count;
    action = () => {
      if (atCounter) void command("sell", { target: "workshop_counter" });
      else navigate({ mapId: "workshop", targetId: "workshop_counter" });
    };
  } else if (item === "stone") {
    actionLabel = "前往小屋升级";
    action = () => navigate({ mapId: "home", targetId: "home_desk" });
  }
  return (
    <div className="inventory-panel">
      <Wallet />
      <div className="inventory-layout">
        <section className="bag-compartment" aria-label="物品格子">
          <div className="bag-heading">
            <span>
              <Backpack size={16} /> 随身物品
            </span>
            <small>{owned.length} / 24 格</small>
          </div>
          <div className="bag-filters" aria-label="物品分类">
            {["全部", "材料", "种植", "收获"].map((label) => (
              <button
                key={label}
                aria-pressed={filter === label}
                onClick={() => setFilter(label)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="bag-slots">
            {Array.from({ length: 24 }, (_, index) => {
              const key = visible[index];
              return key ? (
                <button
                  key={key}
                  className={`bag-slot ${item === key ? "is-selected" : ""}`}
                  aria-label={`${itemNames[key]}，数量 ${state.inventory[key]}`}
                  aria-pressed={item === key}
                  onClick={() => selectItem(key)}
                >
                  <span className={`item-icon ${key}`} />
                  <b>{state.inventory[key]}</b>
                  {quickItems.includes(key) && (
                    <small>{quickItems.indexOf(key) + 1}</small>
                  )}
                </button>
              ) : (
                <div
                  className="bag-slot empty-slot"
                  key={`empty-${index}`}
                  aria-hidden="true"
                >
                  <i />
                </div>
              );
            })}
          </div>
          <p className="bag-caption">
            {visible.length
              ? "选择物品查看用途 · 左上角数字为快捷栏位置"
              : "这个口袋还空着，去世界里收集一些吧。"}
          </p>
          <div className="belt-heading">
            <span>快捷口袋</span>
            <small>按 1–4 查看物品</small>
          </div>
          <div className="belt-slots">
            {quickItems.map((key, index) => (
              <button
                key={index}
                aria-label={`将${itemNames[item]}放入快捷栏 ${index + 1}`}
                title={`放入${itemNames[item]}`}
                className={key === item ? "is-selected" : ""}
                onClick={() => pinItem(item, index)}
              >
                <kbd>{index + 1}</kbd>
                <span className={`item-icon ${key}`} />
                <small>{itemNames[key]}</small>
                {key === item && <Check size={12} />}
              </button>
            ))}
          </div>
          <p className="bag-caption">点击一个快捷口袋，放入当前选中的物品。</p>
        </section>
        <aside className="item-inspector" aria-label="物品详情">
          <div className="item-display">
            <span className={`item-icon ${item}`} />
          </div>
          <span className="rpg-eyebrow">普通 · {info.group}</span>
          <h3>{itemNames[item]}</h3>
          <span className="item-owned">持有 {count} 份</span>
          <p>{info.description}</p>
          <div className="item-use">
            <span>用途</span>
            <b>{info.use}</b>
            {item === "seed" && (
              <small>
                {state.buildings.home >= 2 ? 45 : 60} 秒成熟 · 离线也会生长
              </small>
            )}
          </div>
          <div className="item-source">
            <MapPin size={14} />
            <span>{info.source}</span>
          </div>
          {item === "seed" && !plot && (
            <small>农田已种满，等待成熟后收获。</small>
          )}
          {item === "wood" && atCounter && count < 3 && (
            <small>还需要 {3 - count} 份木材。</small>
          )}
        </aside>
      </div>
      <div className="bag-action-footer">
        <span>
          <span className={`item-icon ${item}`} />
          {itemNames[item]} <small>× {count}</small>
        </span>
        <button
          className="primary item-action"
          disabled={busy || disabled}
          onClick={action}
        >
          {actionLabel}
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

const growth: Record<
  Attribute,
  {
    icon: typeof Heart;
    skill: string;
    threshold: number;
    type: string;
    effect: string;
    activity: string;
    kind: string;
    destination: { mapId: string; targetId: string };
    action: string;
  }
> = {
  strength: {
    icon: Heart,
    skill: "熟练采集",
    threshold: 50,
    type: "被动能力",
    effect: "每次采集木材或石料，额外获得 1 份材料。",
    activity: "步行或运动",
    kind: "exercise",
    destination: { mapId: "overworld", targetId: "wood_1" },
    action: "前往林间采集",
  },
  wisdom: {
    icon: BookOpen,
    skill: "古代符文解读",
    threshold: 25,
    type: "探索能力",
    effect: "解读图书馆东侧的沉睡符文，找回古代手稿与知识碎片。",
    activity: "学习",
    kind: "study",
    destination: { mapId: "overworld", targetId: "ruins" },
    action: "前往遗迹使用",
  },
  craft: {
    icon: Hammer,
    skill: "木板制作",
    threshold: 0,
    type: "基础技艺",
    effect: "在工坊柜台将 3 份木材制作成 1 块木板，推进工匠委托。",
    activity: "创造与工作",
    kind: "creative",
    destination: { mapId: "workshop", targetId: "workshop_counter" },
    action: "前往工坊制作",
  },
  stewardship: {
    icon: Sprout,
    skill: "家园种植",
    threshold: 0,
    type: "基础技艺",
    effect: "播种、收获并留下种子。小屋升至 2 级后，作物成熟时间缩短至 45 秒。",
    activity: "生活管理",
    kind: "management",
    destination: { mapId: "overworld", targetId: "plot_0" },
    action: "前往家园农田",
  },
  bond: {
    icon: Sparkles,
    skill: "旅人之谊",
    threshold: 0,
    type: "日常能力",
    effect: "每天首次与每位村民交谈，增加 1 点好感与 5 点联结经验。",
    activity: "村民交谈与委托",
    kind: "",
    destination: { mapId: "overworld", targetId: "lia" },
    action: "去和莉亚聊聊",
  },
};

export function CharacterPanel() {
  const { state, navigate, open } = useGame();
  const [attribute, setAttribute] = useState<Attribute>("wisdom");
  if (!state?.character) return null;
  const data = growth[attribute],
    value = state.attributes[attribute];
  const level = 1 + Math.floor(value / 50),
    unlocked = value >= data.threshold;
  const Icon = data.icon;
  const studied =
    attribute === "wisdom" && state.events.includes("rune_awakened");
  const activity = () => {
    if (data.kind) {
      useGame.setState({ activityKind: data.kind });
      open("activity");
    } else navigate(data.destination);
  };
  return (
    <div className="character-layout">
      <section className="traveler-profile">
        <span className="rpg-eyebrow">ECHOES OF YOUR JOURNEY</span>
        <h3>{state.character.name}</h3>
        <p className="traveler-title">
          {state.xp >= 100 ? "逐光的旅人" : "初生的唤醒者"}
        </p>
        <CharacterStage appearance={state.character.appearance} />
        <div className="hero-level">
          <span>Lv.</span>
          <b>{1 + Math.floor(state.xp / 100)}</b>
          <small>冒险等级</small>
        </div>
        <div className="hero-experience">
          <span>
            旅程经验<b>{state.xp % 100} / 100</b>
          </span>
          <div className="rpg-meter">
            <i style={{ width: `${state.xp % 100}%` }} />
          </div>
          <small>再获得 {100 - (state.xp % 100)} EXP，迎接下一等级</small>
        </div>
        <div className="traveler-kit">
          <span className="rpg-eyebrow">随身装束与工具</span>
          <div className="outfit-row">
            <PixelPerson variant={state.character.appearance} />
            <span>
              {
                ["林间旅行装", "轻装旅行服", "远行者装束"][
                  state.character.appearance
                ]
              }
              <small>当前穿着 · 无属性加成</small>
            </span>
            <Check size={14} />
          </div>
          <div className="kit-actions">
            <button
              onClick={() =>
                navigate({ mapId: "overworld", targetId: "wood_1" })
              }
            >
              <Hammer size={17} />
              徒手采集
            </button>
            <button onClick={() => open("map")}>
              <Map size={17} />
              随身地图
            </button>
          </div>
        </div>
      </section>
      <section className="growth-profile">
        <div className="growth-heading">
          <div>
            <span className="rpg-eyebrow">日常积累，点亮新的能力</span>
            <h3>成长轨迹</h3>
          </div>
          <Leaf size={25} />
        </div>
        <div className="growth-attributes" aria-label="选择成长属性">
          {(Object.keys(growth) as Attribute[]).map((key) => {
            const AttributeIcon = growth[key].icon,
              xp = state.attributes[key];
            return (
              <button
                key={key}
                className={`growth-attribute ${key === attribute ? "is-selected" : ""}`}
                aria-pressed={key === attribute}
                onClick={() => setAttribute(key)}
              >
                <AttributeIcon size={18} />
                <span className="growth-attribute-name">
                  {attributeNames[key]}
                  <small>Lv.{1 + Math.floor(xp / 50)}</small>
                </span>
                <div>
                  <span className="attribute-progress-label">
                    {xp % 50} / 50 EXP
                  </span>
                  <div className="rpg-meter">
                    <i style={{ width: `${(xp % 50) * 2}%` }} />
                  </div>
                </div>
                <ChevronRight size={14} />
              </button>
            );
          })}
        </div>
        <div className="skill-detail" aria-live="polite">
          <div className="skill-topline">
            <span>
              {attributeNames[attribute]} Lv.{level}
              <ArrowRight size={13} /> Lv.{level + 1}
            </span>
            <small>
              {value % 50} / 50 EXP · 还差 {50 - (value % 50)}
            </small>
          </div>
          <div className="skill-heading">
            <div className={`skill-emblem ${unlocked ? "unlocked" : ""}`}>
              <Icon size={27} />
              {!unlocked && <LockKeyhole size={12} />}
            </div>
            <div>
              <small>
                {unlocked
                  ? data.type + " · 已掌握"
                  : "下一项能力 · 累计 " + data.threshold + " EXP 解锁"}
              </small>
              <h4>{data.skill}</h4>
            </div>
          </div>
          <p>{data.effect}</p>
          {!unlocked ? (
            <div className="skill-unlock">
              <div className="rpg-meter">
                <i style={{ width: `${(value / data.threshold) * 100}%` }} />
              </div>
              <p>
                再获得 <b>{data.threshold - value} EXP</b> 即可解锁，可通过
                {data.activity}获得。
              </p>
            </div>
          ) : (
            <p className="skill-earned">
              <Check size={14} />
              {studied
                ? "已完成这处遗迹的解读"
                : data.threshold
                  ? "能力已生效，可以在世界中使用"
                  : "启程时掌握的能力"}
            </p>
          )}
          <div className="skill-actions">
            <button
              className="primary"
              onClick={unlocked ? () => navigate(data.destination) : activity}
            >
              {unlocked
                ? studied
                  ? "重访古代遗迹"
                  : data.action
                : `记录${data.activity}，积累经验`}
              <ArrowRight size={16} />
            </button>
            {unlocked && data.kind && (
              <button className="text-button" onClick={activity}>
                继续成长
              </button>
            )}
          </div>
          {unlocked && (
            <small className="skill-level-note">
              下一属性等级记录你的积累，当前能力效果保持不变。
            </small>
          )}
        </div>
        <small className="growth-note">
          这是旅途的成长记录，不是对现实能力的评分。
        </small>
      </section>
    </div>
  );
}
