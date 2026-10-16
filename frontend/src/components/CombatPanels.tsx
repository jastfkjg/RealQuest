import { useState } from "react";
import {
  Hammer,
  Swords,
  Sparkles,
  Shield,
  Footprints,
  Coins,
  Soup,
  Mountain,
  DoorOpen,
  Check,
} from "lucide-react";
import { useGame } from "../stores/game";
import { itemDefinitions, itemNames } from "../game/items";
import { caveSight, combatInput } from "../game/cave";
import { mapById } from "../game/navigation";

export function GearPanel() {
  const { state, panel, busy, command, navigate } = useGame();
  const [selected, select] = useState("stone_sword"),
    [tab, setTab] = useState("buy");
  if (!state?.combat) return null;
  const c = state.combat,
    equipment = panel === "equipment";
  const ids = Object.keys(c.weapons).filter(
    (id) => !equipment || state.inventory[id] > 0,
  );
  const id = ids.includes(selected) ? selected : ids[0];
  const weapon = c.weapons[id];
  const atCounter =
    state.location === "workshop" &&
    Math.hypot(state.position.x - 376, state.position.y - 280) <= 72;
  const act = (action: string, item: string) =>
    void command(action, { target: "armory_counter", item });
  const reasons =
    weapon?.craft_reasons.map((r) =>
      Object.entries(itemNames).reduce(
        (text, [key, name]) => text.replace(key, name),
        r,
      ),
    ) || [];
  return (
    <div className="gear-workbench">
      <p className="gear-intro">
        {equipment
          ? "选择随身武器并装备。洞内空格攻击，Q施法，R喝汤；点怪物可选择目标。"
          : "买一件带走，或用你的建造与知识亲手完成。购买不要求制造等级。"}
      </p>
      <div className="gear-wallet">
        <Coins size={18} />
        <b>{state.inventory.gold} 金币</b>
        <span>
          建造 {state.skill_growth?.building || 0} · 科学{" "}
          {state.knowledge_growth?.science || 0} · 魔法{" "}
          {state.knowledge_growth?.magic || 0}
        </span>
      </div>
      {!equipment && (
        <div className="gear-tabs" role="group" aria-label="武备台操作">
          <button aria-pressed={tab === "buy"} onClick={() => setTab("buy")}>
            选购
          </button>
          <button
            aria-pressed={tab === "craft"}
            onClick={() => setTab("craft")}
          >
            图纸打造
          </button>
        </div>
      )}
      {ids.length ? (
        <div className="gear-layout">
          <div
            className="gear-rack"
            aria-label={equipment ? "已持有武器" : "武器目录"}
          >
            {ids.map((key) => (
              <button
                key={key}
                aria-pressed={id === key}
                onClick={() => select(key)}
              >
                <img
                  src={itemDefinitions[key].icon}
                  alt=""
                  width="56"
                  height="56"
                />
                <span>
                  <b>{c.weapons[key].name}</b>
                  <small>
                    {equipment
                      ? `持有 ${state.inventory[key]}`
                      : `${c.weapons[key].price} 金币`}{" "}
                    {c.equipped === key && state.inventory[key] > 0
                      ? "· 已装备"
                      : ""}
                  </small>
                </span>
              </button>
            ))}
          </div>
          <section className="gear-detail" aria-label="选中武器详情">
            <div className="gear-heading">
              <img
                src={itemDefinitions[id].icon}
                alt=""
                width="96"
                height="96"
              />
              <div>
                <small>{weapon.magic ? "法器 · 远程" : "物理武器"}</small>
                <h3>{weapon.name}</h3>
                <span>实际持有 {state.inventory[id]} 件</span>
              </div>
            </div>
            <dl className="gear-stats">
              <div>
                <dt>伤害</dt>
                <dd>
                  {weapon.damage} {weapon.magic ? "魔法" : "物理"}
                </dd>
              </div>
              <div>
                <dt>攻击间隔</dt>
                <dd>{weapon.interval} 秒</dd>
              </div>
              <div>
                <dt>攻击距离</dt>
                <dd>{weapon.reach}</dd>
              </div>
              <div>
                <dt>每次体力</dt>
                <dd>{weapon.stamina}</dd>
              </div>
            </dl>
            {!equipment && tab === "craft" && (
              <div className="gear-recipe">
                <h4>
                  <Hammer size={16} /> 打造条件
                </h4>
                <p>
                  建造1级 ＋{" "}
                  {weapon.either
                    ? "科学1或魔法1"
                    : weapon.science
                      ? `科学${weapon.science}`
                      : `魔法${weapon.magic_level}`}
                  级
                </p>
                <ul>
                  {Object.entries(weapon.costs).map(([item, n]) => (
                    <li
                      key={item}
                      data-short={(state.inventory[item] || 0) < n}
                    >
                      {itemNames[item] || item}
                      <span>
                        {state.inventory[item] || 0} / {n}
                      </span>
                    </li>
                  ))}
                </ul>
                {reasons.length > 0 && (
                  <p className="gear-shortfall">{reasons.join("；")}</p>
                )}
              </div>
            )}
            <div className="gear-buttons">
              {!equipment && (
                <button
                  className="primary"
                  disabled={
                    busy ||
                    !atCounter ||
                    (tab === "buy"
                      ? state.inventory.gold < weapon.price
                      : !!reasons.length)
                  }
                  onClick={() =>
                    act(tab === "buy" ? "gear_buy" : "gear_craft", id)
                  }
                >
                  {busy
                    ? "正在保存…"
                    : tab === "buy"
                      ? `购买 · ${weapon.price} 金币`
                      : "确认打造 1 件"}
                </button>
              )}
              <button
                disabled={
                  busy || !state.inventory[id] || c.equipped === id || !!c.cast
                }
                onClick={() => void command("gear_equip", { item: id })}
              >
                {c.equipped === id ? "已装备" : "装备这件武器"}
              </button>
              {!equipment && (
                <button
                  disabled={
                    busy || !atCounter || !state.inventory[id] || !!c.cast
                  }
                  onClick={() => act("gear_sell", id)}
                >
                  出售 1 件 · +{weapon.price / 4}金币
                </button>
              )}
            </div>
            {c.cast && <p>动作进行中，返回世界完成后再切换装备。</p>}
            {!equipment && !atCounter && <p>请走近工坊右侧的武备台办理。</p>}
          </section>
        </div>
      ) : (
        <div className="gear-empty">
          <Swords size={40} />
          <h3>还没有随身武器</h3>
          <p>安家后已有的32金币，足够购买24金币的石刃短剑。</p>
          <button
            onClick={() =>
              navigate({ mapId: "workshop", targetId: "armory_counter" })
            }
          >
            标记工坊武备台
          </button>
        </div>
      )}
      {!equipment && (
        <div className="gear-supplies">
          <Soup size={26} />
          <div>
            <b>便携菜汤 · 8金币</b>
            <small>
              持有 {state.inventory.soup} · 恢复20生命＋15体力 ·
              动作1.2秒，受击中断
            </small>
          </div>
          <button
            disabled={busy || !atCounter || state.inventory.gold < 8}
            onClick={() => act("gear_buy", "soup")}
          >
            购买 1 份菜汤
          </button>
        </div>
      )}
    </div>
  );
}

export function SpellPanel() {
  const { state, command, busy, open } = useGame();
  if (!state?.combat) return null;
  const known = state.combat.spark_learned,
    level = state.knowledge_growth?.magic || 0;
  return (
    <div className="spell-leaf">
      <Sparkles size={44} />
      <small>入门术式 · 魔法1级</small>
      <h3>火花术</h3>
      <p>一道短促的微光，为近战提供一次远程选择。</p>
      <dl className="gear-stats">
        <div>
          <dt>伤害</dt>
          <dd>12 魔法</dd>
        </div>
        <div>
          <dt>距离</dt>
          <dd>96</dd>
        </div>
        <div>
          <dt>体力</dt>
          <dd>4</dd>
        </div>
        <div>
          <dt>冷却</dt>
          <dd>4 秒</dd>
        </div>
      </dl>
      <p>
        当前魔法 {level} 级 ·{" "}
        {known ? "已学会" : `学习费8金币 · 当前${state.inventory.gold}金币`}
      </p>
      <button
        className="primary"
        disabled={busy || known || level < 1 || state.inventory.gold < 8}
        onClick={() => void command("spark_learn", { target: "spell_desk" })}
      >
        {known ? "已学会 · 洞内按Q施放" : "学习火花术 · 8金币"}
      </button>
      {level < 1 && <button onClick={() => open("study")}>前往知识研修</button>}
      <p className="muted">
        魔法等级通过投入知识点提升；学会法术与持有短杖是两件事。施法占用动作，不能与武器同时命中。
      </p>
    </div>
  );
}

export function GatePanel() {
  const { state, selected, busy, command, open, navigate } = useGame();
  if (!state?.combat) return null;
  const c = state.combat,
    magic = state.knowledge_growth?.magic || 0,
    stone = state.inventory.gate_stone || 0;
  const ready = c.boss_first && stone > 0 && magic >= 3;
  return (
    <div className="stone-gate-panel">
      <div className="gate-emblem">
        <DoorOpen size={56} />
      </div>
      <small>村庄东行出口</small>
      <h3>{c.gate_open ? "石门已永久开启" : "门心缺少一束回响"}</h3>
      <p>
        洞穴底层守卫保管着门钥魔法石。取得它，再以魔法3级唤醒石门，便能走向渡口。
      </p>
      <ul className="gate-requirements">
        <li data-ready={c.boss_first}>
          <Check />
          击败石壳守卫<span>{c.boss_first ? "已完成" : "山洞第5层"}</span>
        </li>
        <li data-ready={stone > 0}>
          <Shield />
          门钥魔法石<span>{stone} / 1</span>
        </li>
        <li data-ready={magic >= 3}>
          <Sparkles />
          启门魔法等级<span>{magic} / 3</span>
        </li>
      </ul>
      <button
        className="primary"
        disabled={busy || (!ready && !c.gate_open)}
        onClick={async () => {
          if (c.gate_open) {
            open("travel", selected || undefined);
            return;
          }
          if (await command("gate_open", {}))
            open("travel", selected || undefined);
        }}
      >
        {c.gate_open ? "查看渡口旅途安排" : "嵌入魔法石 · 永久开门"}
      </button>
      <div className="button-row">
        <button
          onClick={() =>
            navigate({ mapId: "overworld", targetId: "cave_entry" })
          }
        >
          标记石根山洞
        </button>
        <button onClick={() => open("study")}>知识研修</button>
      </div>
      <p className="muted">
        科技主修也须满足启门魔法要求。魔法石只嵌入一次，回村与再次出发无需重新挑战。
      </p>
    </div>
  );
}

export function CavePanel() {
  const { state, selected, busy, command, open, navigate } = useGame();
  if (!state?.combat || !selected) return null;
  const c = state.combat,
    entry = selected.id === "cave_entry",
    shortcut =
      selected.id === "cave_rope"
        ? c.unlocked >= 4
        : selected.id === "cave_deep"
          ? c.unlocked >= 5
          : true;
  const allowed = selected.id !== "cave_down" || c.floor === 5 || c.cleared;
  const label = entry
    ? "进入第1层"
    : selected.id === "cave_rest"
      ? "短休30分钟 · +20体力 / +10生命"
      : selected.id === "cave_exit" || c.floor === 5
        ? "返回洞口"
        : selected.name;
  return (
    <div className="cave-route-panel">
      <Mountain size={44} />
      <small>石根山洞 · 5层</small>
      <h3>{entry ? "石根之下，有微光在呼吸" : selected.name}</h3>
      <p>
        怪物只在洞穴内出现。普通移动不耗体力，随时可以撤离；未击败的Boss会恢复，已获材料与打通的通路保留。
      </p>
      <div className="cave-route-stages">
        <span>
          1–2层
          <br />
          苔团与洞穴蝠
        </span>
        <span>
          3–4层
          <br />
          石壳虫与混合战斗
        </span>
        <span>
          第5层
          <br />
          石壳守卫 · 魔法石
        </span>
      </div>
      <p>
        当前装备：
        {c.equipped && state.inventory[c.equipped] > 0
          ? itemNames[c.equipped]
          : "未装备"}{" "}
        · 生命 {state.vitality?.current}/{state.vitality?.max} · 体力{" "}
        {state.stamina?.current}/{state.stamina?.max}
      </p>
      {!shortcut && <p role="status">先清理对应层数，才能使用这条通路。</p>}
      {!allowed && (
        <p role="status">本层还有怪物，清理后可继续向下；仍可从洞口撤离。</p>
      )}
      <button
        className="primary"
        disabled={busy || !shortcut || !allowed}
        onClick={async () => {
          if (await command("cave_interact", { target: selected.id }))
            open(null);
        }}
      >
        {label}
      </button>
      {entry && (
        <div className="button-row">
          <button onClick={() => open("equipment")}>检查装备</button>
          <button
            onClick={() =>
              navigate({ mapId: "workshop", targetId: "armory_counter" })
            }
          >
            标记武备台
          </button>
          <button
            disabled={
              busy ||
              !c.boss_first ||
              c.gate_open ||
              !!state.inventory.gate_stone
            }
            onClick={() => void command("stone_recover", {})}
          >
            核实并补领魔法石
          </button>
        </div>
      )}
      <p className="muted">
        空格攻击当前目标，点怪选择目标。Q火花术，R菜汤。3层平台可免费短休，菜单与现实成长会暂停整场战斗。
      </p>
    </div>
  );
}

export function CombatHud() {
  const { state, world, panel, open, command, busy } = useGame();
  if (!state?.combat || !world || panel) return null;
  const c = state.combat,
    inside = c.floor > 0,
    w =
      c.equipped && state.inventory[c.equipped] > 0
        ? c.weapons[c.equipped]
        : null;
  if (!inside)
    return (
      <button
        className="equipment-shortcut rq-theme"
        onClick={() => open("equipment")}
      >
        <Swords size={17} />
        远行装备
      </button>
    );
  const boss = c.enemies.find((e) => e.kind === "boss" && e.hp > 0),
    target = c.enemies.find((e) => e.id === combatInput.target && e.hp > 0);
  const blocked =
    target &&
    !caveSight(mapById(world, state.location), state.position, target);
  const far =
    target &&
    w &&
    Math.hypot(target.x - state.position.x, target.y - state.position.y) >
      w.reach + (target.kind === "boss" ? 20 : 10);
  const hint =
    state.position.x < 166
      ? "安全入口 · 向右走入战斗区"
      : blocked
        ? "石柱挡住目标 · 绕行后再攻击"
        : far
          ? "目标超出武器射程 · 再走近一些"
          : c.message || "攻击后退让，观察金色预兆";
  const next = () => {
    const alive = c.enemies.filter((e) => e.hp > 0),
      i = alive.findIndex((e) => e.id === combatInput.target);
    combatInput.target = alive[(i + 1) % alive.length]?.id || null;
  };
  return (
    <>
      <div className="cave-status rq-theme">
        <div>
          <Shield size={17} />
          <b>
            生命 {state.vitality?.current}/{state.vitality?.max}
          </b>
          <span>
            体力 {Math.floor(state.stamina?.current || 0)}/{state.stamina?.max}
          </span>
        </div>
        <small>
          {w?.name || "尚未装备"} ·{" "}
          {c.cleared
            ? "本层已清理"
            : `剩余 ${c.enemies.filter((e) => e.hp > 0).length} 只`}
        </small>
        <p>
          {c.cast?.kind === "soup"
            ? "正在喝汤，受击会中断…"
            : target
              ? `当前目标：${target.name} ${target.hp}/${target.max_hp}`
              : "可从路标离开或继续前进"}
        </p>
        <small role="status">{hint}</small>
      </div>
      {boss && (
        <div
          className="boss-meter rq-theme"
          aria-label={`石壳守卫生命${boss.hp}/${boss.max_hp}`}
        >
          <b>
            石壳守卫{" "}
            <small>
              {boss.hp} / {boss.max_hp}
            </small>
          </b>
          <progress max={boss.max_hp} value={boss.hp} />
          <span>
            {boss.phase === "windup"
              ? "蓄力中 · 移开预兆区域"
              : boss.hp <= 80
                ? "核心微亮 · 留意晶屑点射"
                : "观察动作，留出退让空间"}
          </span>
        </div>
      )}
      <div
        className="cave-actions rq-theme"
        role="group"
        aria-label="洞穴战斗操作"
      >
        <button
          className="attack-action"
          disabled={!w}
          onClick={() => (combatInput.pulse = true)}
          onPointerDown={(e) => {
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            combatInput.attack = true;
          }}
          onPointerUp={() => (combatInput.attack = false)}
          onPointerCancel={() => (combatInput.attack = false)}
          onLostPointerCapture={() => (combatInput.attack = false)}
        >
          <Swords />
          攻击 <kbd>空格</kbd>
        </button>
        <button
          disabled={
            !c.spark_learned ||
            !!c.cast ||
            c.time < c.spark_at ||
            (state.stamina?.current || 0) < 4
          }
          onClick={() => (combatInput.spark = true)}
        >
          <Sparkles />
          火花术 <kbd>Q</kbd>
        </button>
        <button
          disabled={
            !state.inventory.soup ||
            !!c.cast ||
            c.time < c.soup_at ||
            (c.floor === 5 && c.soups_used >= 2)
          }
          onClick={() => (combatInput.soup = true)}
        >
          <Soup />
          菜汤 {state.inventory.soup}
          <kbd>R</kbd>
        </button>
        <button onClick={next}>切换目标</button>
        <button onClick={() => open("equipment")}>装备 / 暂停</button>
        <button
          disabled={busy}
          onClick={() => void command("cave_retreat", {})}
        >
          <Footprints />
          撤至洞口
        </button>
      </div>
    </>
  );
}
