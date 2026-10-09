import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  ArrowRight,
  Backpack,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  Compass,
  Download,
  Feather,
  Flag,
  Hammer,
  Heart,
  Leaf,
  Map,
  Pause,
  Play,
  Plus,
  Settings,
  Sparkles,
  Sprout,
  Timer,
  Trees,
  User,
  X,
  Zap,
} from "lucide-react";
import { QuestList, QuestTracker } from "./components/Quests";
import { Atlas } from "./components/Atlas";
import { GameCanvas } from "./game/GameCanvas";
import {
  activityNames,
  attributeNames,
  itemNames,
  serverNow,
  useGame,
} from "./stores/game";
import { api } from "./services/api";
import type { Attribute, Panel } from "./types";
const attrIcons = {
  strength: Heart,
  wisdom: BookOpen,
  craft: Hammer,
  stewardship: Sprout,
  bond: Sparkles,
};
function PixelPerson({ variant = 0 }: { variant?: number }) {
  return (
    <div aria-hidden="true" className={`pixel-person person-${variant}`}>
      <i />
      <b />
      <span />
      <em />
    </div>
  );
}
function Modal({ title, children }: { title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null),
    open = useGame((s) => s.open);
  useEffect(() => {
    ref.current?.showModal();
    const previous = document.activeElement;
    return () => {
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={() => open(null)}
      onClick={(event) => {
        if (event.target === event.currentTarget) open(null);
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label="关闭面板"
          onClick={() => open(null)}
        >
          <X size={20} />
        </button>
      </div>
      <div className="modal-body">{children}</div>
    </dialog>
  );
}
function Welcome() {
  const [name, setName] = useState("唤醒者"),
    [appearance, setAppearance] = useState(0),
    { command, busy, error } = useGame();
  return (
    <main className="welcome">
      <div className="welcome-art">
        <Trees size={46} />
        <span>YOUR LIFE, A LITTLE MORE MAGICAL.</span>
        <h1>
          生活的每一步，
          <br />
          世界的每一处回响。
        </h1>
        <p>
          从一间林间小屋开始，
          <br />
          在现实中成长，在回响大陆展开冒险。
        </p>
        <div className="welcome-land">
          <PixelPerson variant={appearance} />
          <Sprout size={70} />
        </div>
      </div>
      <form
        className="welcome-form"
        onSubmit={async (e) => {
          e.preventDefault();
          await command("create", { name, appearance });
        }}
      >
        <span className="eyebrow">一段新旅程</span>
        <h2>你好，唤醒者。</h2>
        <p>这片沉睡的土地，正等待你的到来。</p>
        <label>
          你的名字
          <input
            value={name}
            maxLength={16}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <label>选择旅行伙伴的模样</label>
        <div className="appearances">
          {[0, 1, 2].map((i) => (
            <button
              type="button"
              key={i}
              aria-label={`外观 ${i + 1}`}
              aria-pressed={appearance === i}
              className={appearance === i ? "selected" : ""}
              onClick={() => setAppearance(i)}
            >
              <PixelPerson variant={i} />
              {appearance === i && <Check size={16} />}
            </button>
          ))}
        </div>
        <button className="primary" id="start-btn" disabled={busy}>
          进入回响大陆 <ArrowRight size={18} />
        </button>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <small>
          游客存档保存在服务端，并通过当前浏览器识别。
          <br />
          清除浏览器 Cookie 后将无法找回此存档。
        </small>
      </form>
    </main>
  );
}
function ActivityPanel() {
  const { state, command, busy } = useGame(),
    [kind, setKind] = useState("study"),
    [amount, setAmount] = useState("25"),
    [note, setNote] = useState(""),
    [topic, setTopic] = useState(""),
    [date, setDate] = useState(
      new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" }),
    ),
    [, tick] = useState(0);
  useEffect(() => {
    const handle = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(handle);
  }, []);
  const timer = state!.timer,
    seconds = timer
      ? Math.max(
          0,
          Math.floor(
            timer.elapsed +
              (timer.running ? serverNow() - timer.started_at : 0),
          ),
        )
      : 0;
  async function record(e: FormEvent) {
    e.preventDefault();
    if (
      await command("activity", {
        kind,
        amount: kind === "management" ? 1 : Number(amount),
        date,
        note,
      })
    )
      setNote("");
  }
  return (
    <>
      <div className="section-label">
        <Timer size={17} /> 专注学习
      </div>
      <div className="timer-block">
        <span>{timer?.topic || "为好奇心留一点时间"}</span>
        <strong>
          {String(Math.floor(seconds / 60)).padStart(2, "0")}
          <b>:</b>
          {String(seconds % 60).padStart(2, "0")}
        </strong>
        {!timer ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void command("timer_start", { topic });
            }}
          >
            <label>
              学习主题
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                maxLength={80}
                placeholder="今天想学些什么？"
                required
              />
            </label>
            <button className="primary" disabled={busy}>
              <Play size={16} /> 开始专注
            </button>
          </form>
        ) : (
          <div className="button-row">
            <button
              onClick={() =>
                void command(timer.running ? "timer_pause" : "timer_resume")
              }
              disabled={busy}
            >
              {timer.running ? <Pause size={16} /> : <Play size={16} />}{" "}
              {timer.running ? "暂停" : "继续"}
            </button>
            <button
              className="primary"
              onClick={() => void command("timer_finish")}
              disabled={busy}
            >
              结束并记录
            </button>
          </div>
        )}
        <small>暂停时间不计入学习时长，刷新后可以继续。</small>
      </div>
      <div className="section-label">
        <Plus size={17} /> 手动记录
      </div>
      <form className="form-grid" onSubmit={record}>
        <label>
          活动类型
          <select
            value={kind}
            onChange={(e) => {
              setKind(e.target.value);
              setAmount(e.target.value === "steps" ? "3000" : "25");
            }}
          >
            {Object.entries(activityNames).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label>
          日期（中国标准时间）
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </label>
        {kind !== "management" && (
          <label>
            {kind === "steps" ? "当天累计步数" : "时长（分钟）"}
            <input
              type="number"
              min="1"
              max={kind === "steps" ? 100000 : 480}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </label>
        )}
        <label className="full-width">
          {kind === "exercise" ? "运动类型与备注" : "主题或备注"}
          <input
            value={note}
            maxLength={200}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              kind === "management"
                ? "例如：完成本周预算检查"
                : "给这次成长留一句话"
            }
          />
        </label>
        <button className="primary full-width" disabled={busy}>
          保存这次成长 <Leaf size={16} />
        </button>
      </form>
      <p className="muted">
        手动记录不代表已验证。每个属性每天最多获得 100
        点现实活动经验，休息不会扣除已有成长。
      </p>
    </>
  );
}
function Panels() {
  const {
    panel,
    selected,
    dialogue,
    state,
    command,
    busy,
    error,
    notice,
    open,
  } = useGame();
  const [confirmDelete, setConfirmDelete] = useState(false);
  if (!panel || !state) return null;
  const titles: Record<string, string> = {
    board: "委托告示板",
    map: "回响大陆 · 全域地图",
    storage: "家园储物箱",
    character: "唤醒者档案",
    inventory: "旅行背包",
    activity: "现实中的成长",
    journal: "冒险日志",
    guide: "旅人指南",
    settings: "存档与数据",
    ai: "AI 旅途伙伴",
    building: selected?.name || "建筑",
    npc: selected?.name || "对话",
  };
  const buildingId = selected?.building || selected?.id || "home";
  const level = state.buildings[buildingId] || 1;
  return (
    <Modal key={panel} title={titles[panel]}>
      {panel === "activity" && <ActivityPanel />}
      {panel === "map" && <Atlas />}
      {panel === "board" && (
        <>
          <p className="muted">
            在这里接取委托，达成目标后回到发布处交付。金色叹号表示有新任务。
          </p>
          <QuestList giver={selected?.id} />
        </>
      )}
      {panel === "storage" && (
        <>
          <p className="muted">
            把物品留在家里，需要时再取回。储物箱内容会保存。
          </p>
          {Object.entries(state.storage).map(([item, count]) => (
            <div className="shop-row" key={item}>
              <span>
                {itemNames[item]}
                <small>
                  背包 {state.inventory[item]} · 箱中 {count}
                </small>
              </span>
              <div className="button-row">
                <button
                  disabled={busy || !state.inventory[item]}
                  onClick={() =>
                    void command("store", {
                      target: "home_chest",
                      item,
                      amount: 1,
                    })
                  }
                >
                  存入 1
                </button>
                <button
                  disabled={busy || !count}
                  onClick={() =>
                    void command("withdraw", {
                      target: "home_chest",
                      item,
                      amount: 1,
                    })
                  }
                >
                  取回 1
                </button>
              </div>
            </div>
          ))}
        </>
      )}
      {panel === "character" && (
        <>
          <div className="character-profile">
            <PixelPerson variant={state.character!.appearance} />
            <div>
              <h3>{state.character!.name}</h3>
              <p>Lv. {1 + Math.floor(state.xp / 100)} · 初生的唤醒者</p>
            </div>
          </div>
          {Object.entries(state.attributes).map(([key, value]) => (
            <div className="attribute-row" key={key}>
              <span>{attributeNames[key]}</span>
              <div className="meter">
                <i style={{ width: `${((value % 50) / 50) * 100}%` }} />
              </div>
              <span>
                Lv.{1 + Math.floor(value / 50)} · {value} EXP
              </span>
            </div>
          ))}
          <div className="note">
            <b>已解锁能力</b>
            <p>
              {state.attributes.strength >= 50
                ? "熟练采集：每次采集额外获得 1 份材料。"
                : "体魄累计 50 EXP 后，采集效率提升。"}
            </p>
            <p>
              {state.attributes.wisdom >= 25
                ? "符文解读：可探索图书馆东侧的遗迹。"
                : "学识累计 25 EXP 后，可解读沉睡符文。"}
            </p>
          </div>
          <small>
            这些属性描述游戏角色成长，不衡量你的真实能力或个人价值。
          </small>
        </>
      )}
      {panel === "inventory" && (
        <>
          <div className="inventory-grid">
            {Object.entries(state.inventory).map(([key, value]) => (
              <div key={key}>
                <span className={`item-icon ${key}`} aria-hidden="true" />
                <b>{itemNames[key]}</b>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <div className="resource-row">
            <span>
              <Zap size={17} /> 探索能量 {state.energy}
            </span>
            <span>
              <Sparkles size={17} /> 知识碎片 {state.knowledge_shard}
            </span>
          </div>
          <p className="muted">
            采集、种植、交易与制作发生在地图上。进入工坊，在柜台出售萝卜、购买种子或制作木板。
          </p>
        </>
      )}
      {panel === "building" && selected && (
        <>
          <div className="building-banner">
            <Hammer size={32} />
            <div>
              <h3>{selected.name}</h3>
              <span>等级 {level} / 3</span>
            </div>
          </div>
          <p>
            {
              {
                home: "升级至 2 级后，新种植的作物成熟时间由 60 秒缩短至 45 秒。",
                workshop: "每升级一级，出售每份萝卜多获得 1 金币。",
                library: "每一级使首次解读遗迹的知识碎片奖励增加 3 个。",
              }[buildingId]
            }
          </p>
          <div className="note">
            <b>{level < 3 ? "升级材料" : "已达最高等级"}</b>
            {level < 3 && (
              <p>
                {level * 6} 木材 · {level * 3} 石料 · {level * 10} 金币
              </p>
            )}
          </div>
          <button
            className="primary"
            disabled={busy || level >= 3}
            onClick={() => void command("upgrade", { target: selected.id })}
          >
            升级建筑 <ArrowRight size={16} />
          </button>
          {buildingId === "workshop" && (
            <>
              <div className="section-label">工坊柜台</div>
              <div className="shop-row">
                <span>
                  出售萝卜 <small>1 萝卜 → {8 + level - 1} 金币</small>
                </span>
                <button
                  disabled={busy || !state.inventory.crop}
                  onClick={() =>
                    void command("sell", { target: "workshop_counter" })
                  }
                >
                  出售
                </button>
              </div>
              <div className="shop-row">
                <span>
                  购买种子 <small>2 金币 → 1 种子</small>
                </span>
                <button
                  disabled={busy || state.inventory.gold < 2}
                  onClick={() =>
                    void command("buy_seed", { target: "workshop_counter" })
                  }
                >
                  购买
                </button>
              </div>
              <div className="shop-row">
                <span>
                  制作木板 <small>3 木材 → 1 木板</small>
                </span>
                <button
                  disabled={busy || state.inventory.wood < 3}
                  onClick={() =>
                    void command("craft", { target: "workshop_counter" })
                  }
                >
                  制作
                </button>
              </div>
            </>
          )}
        </>
      )}
      {panel === "npc" && selected && (
        <>
          <div className="character-profile">
            <PixelPerson variant={selected.id === "lia" ? 2 : 1} />
            <div>
              <h3>{selected.name}</h3>
              <p>
                {selected.id === "lia" ? "图书管理员" : "森林向导"} · 关系值{" "}
                {state.relationships[selected.id]}
              </p>
            </div>
          </div>
          <blockquote>{dialogue}</blockquote>
          <small>预设剧情对话</small>
          <QuestList giver={selected.id} />
          <button className="primary" onClick={() => open(null)}>
            再会，旅人 <ArrowRight size={16} />
          </button>
        </>
      )}
      {panel === "journal" && (
        <>
          <div className="section-label">
            <Flag size={17} /> 大陆的回响
          </div>
          <QuestList />
          <div className="section-label">
            <Leaf size={17} /> 现实成长记录
          </div>
          {!state.activities.length ? (
            <p className="muted">还没有记录。旅程不必赶路，从一件小事开始。</p>
          ) : (
            state.activities
              .slice()
              .reverse()
              .map((a, i) => (
                <div className="history-row" key={i}>
                  <div>
                    <b>
                      {activityNames[a.kind]} ·{" "}
                      {a.kind === "management"
                        ? "已完成"
                        : a.amount + (a.kind === "steps" ? " 步" : " 分钟")}
                    </b>
                    <small>
                      {a.date} ·{" "}
                      {a.source === "timer" ? "学习计时" : "手动填报"} · 未验证
                    </small>
                    {a.note && <p>{a.note}</p>}
                  </div>
                  <span>+{a.xp} EXP</span>
                </div>
              ))
          )}
        </>
      )}
      {panel === "guide" && (
        <>
          <p>
            现实生活为角色带来成长；森林与家园为你提供物品。即使没有现实记录，也能自由游玩。
          </p>
          <ol className="guide-list">
            <li>
              使用 <kbd>WASD</kbd> 或方向键移动，靠近对象按 <kbd>E</kbd>
              ，也可点击地图上的邻近对象。
            </li>
            <li>
              新角色自动接取安家任务。村庄告示板、莉亚、诺亚和公会都有委托；按 E
              互动后点击「接取任务」。
            </li>
            <li>
              任务达成后回到发布者处「交付任务」，领取一次性奖励。右侧追踪可以标记下一步，M
              打开全域地图。
            </li>
            <li>
              走近建筑门口按 E 进入；室内家具和柜台可互动，走回地毯下方的门口按
              E 离开。
            </li>
            <li>
              点击地面自动寻路，点击远处对象会先走近再互动。Shift
              可加快行走。落枝和矿石每 30 秒恢复一次。
            </li>
            <li>
              走近小屋南侧农田种下种子，60 秒后回来收获。离线不会让作物枯萎。
            </li>
            <li>去工坊出售萝卜、制作木板，用材料升级建筑。</li>
            <li>
              记录一次 25 分钟学习，获得符文解读能力，再去图书馆东侧寻找遗迹。
            </li>
          </ol>
          <p className="muted">
            移动端用左下方方向键移动，右下方按钮交互。<kbd>F</kbd> 切换全屏，
            <kbd>Esc</kbd> 关闭面板或退出全屏。
          </p>
        </>
      )}
      {panel === "ai" && (
        <>
          <Sparkles className="ai-emblem" size={40} />
          <h3>下一段旅程，正在筹备中。</h3>
          <p>
            AI 目标规划、建议审批、NPC 智能对话与每周复盘将在后续旅程中开放。
          </p>
          <div className="note">
            现在你可以记录真实活动，与莉亚和诺亚进行预设剧情对话。普通游戏不依赖模型服务。
          </div>
          <button className="primary" onClick={() => open("activity")}>
            记录一次成长 <ArrowRight size={16} />
          </button>
        </>
      )}
      {panel === "settings" && (
        <>
          <p>
            当前使用游客存档。请保留当前浏览器的
            Cookie；游戏进度由服务端数据库保存。
          </p>
          <button
            onClick={async () => {
              try {
                const data = await api<unknown>("export");
                const url = URL.createObjectURL(
                  new Blob([JSON.stringify(data, null, 2)], {
                    type: "application/json",
                  }),
                );
                const a = document.createElement("a");
                a.href = url;
                a.download = "realquest-save.json";
                a.click();
                URL.revokeObjectURL(url);
              } catch (e) {
                useGame.setState({ error: (e as Error).message });
              }
            }}
          >
            <Download size={17} /> 导出存档与结算记录
          </button>
          <p className="muted">
            导出用于个人查看与备份；当前版本暂不支持导入恢复。
          </p>
          <hr />
          <h3>删除我的数据</h3>
          <p>
            会删除此游客的角色、行为记录、计时、世界状态与结算记录，无法撤销。
          </p>
          {!confirmDelete ? (
            <button className="danger" onClick={() => setConfirmDelete(true)}>
              删除数据…
            </button>
          ) : (
            <div className="button-row">
              <button onClick={() => setConfirmDelete(false)}>取消</button>
              <button
                className="danger"
                onClick={async () => {
                  try {
                    await api("session", "DELETE");
                    window.location.reload();
                  } catch (e) {
                    useGame.setState({ error: (e as Error).message });
                  }
                }}
              >
                确认永久删除
              </button>
            </div>
          )}
        </>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="panel-notice" role="status">
          {notice}
        </p>
      )}
    </Modal>
  );
}
export default function App() {
  const { state, ready, boot, open, error, notice, tracking, panel } =
    useGame();
  useEffect(() => {
    void boot();
  }, [boot]);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => useGame.setState({ notice: "" }), 5500);
    return () => clearTimeout(id);
  }, [notice]);
  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => {
      if (!document.hidden)
        void api("state")
          .then((reply) => useGame.getState().accept(reply))
          .catch(() => undefined);
    }, 15000);
    return () => clearInterval(id);
  }, [ready]);
  const nav: [Panel, string, typeof Compass][] = [
    ["character", "角色", User],
    ["inventory", "背包", Backpack],
    ["activity", "现实成长", Leaf],
    ["journal", "任务日志", BookOpen],
    ["map", "地图", Map],
  ];
  return (
    <div className="app-shell">
      <header className="app-header">
        <a href="/" className="brand">
          <div className="brand-mark">
            <Sprout size={25} />
          </div>
          <div>
            <strong>
              RealQuest <span>现实副本</span>
            </strong>
            <small>在现实中成长，在世界里冒险。</small>
          </div>
        </a>
        <div className="header-center">
          <span className="live-dot" />
          回响大陆<span className="header-separator">/</span> 第一章 · 万物生长
        </div>
        <div
          className="header-actions"
          style={{ visibility: state?.character ? "visible" : "hidden" }}
        >
          <button aria-label="旅人指南" onClick={() => open("guide")}>
            <CircleHelp size={19} />
          </button>
          <button aria-label="存档与数据" onClick={() => open("settings")}>
            <Settings size={18} />
          </button>
        </div>
      </header>
      {!ready ? (
        <main className="loading">
          <Sprout size={40} />
          <h2>{error ? "暂时无法连接大陆" : "正在打开你的旅程…"}</h2>
          <p>{error || "读取存档与世界"}</p>
          {error && (
            <button className="primary" onClick={() => void boot()}>
              重新连接
            </button>
          )}
        </main>
      ) : !state?.character ? (
        <Welcome />
      ) : (
        <>
          <main className="app-main">
            <div className="game-layout">
              <section className="game-section" aria-label="游戏世界">
                <div className="game-status">
                  <button className="level" onClick={() => open("character")}>
                    <PixelPerson variant={state.character.appearance} />
                    <div>
                      <b>
                        {state.character.name}
                        <span> Lv.{1 + Math.floor(state.xp / 100)}</span>
                      </b>
                      <div className="xp-track">
                        <i style={{ width: `${state.xp % 100}%` }} />
                      </div>
                      <small>{state.xp % 100} / 100 EXP</small>
                    </div>
                  </button>
                  <div className="currencies">
                    <span>
                      <i className="coin" />
                      {state.inventory.gold}
                      <small>金币</small>
                    </span>
                    <span>
                      <Zap size={17} />
                      {state.energy}
                      <small>探索能量</small>
                    </span>
                  </div>
                  <button
                    className="record-button"
                    onClick={() => open("activity")}
                  >
                    <Plus size={15} />
                    记录现实成长
                  </button>
                  <button
                    className="tracker-toggle"
                    aria-label={tracking ? "收起任务追踪" : "展开任务追踪"}
                    onClick={() => useGame.setState({ tracking: !tracking })}
                  >
                    <Flag size={17} />
                  </button>
                </div>
                <GameCanvas />
                <div className="game-footer">
                  <span>
                    <kbd>WASD</kbd> 移动 <i />
                    <kbd>E</kbd> 互动 <i />
                    <kbd>Shift</kbd> 快走 <i />
                    <kbd>M</kbd> 地图
                  </span>
                  <span className="saved">
                    <Check size={12} />
                    进度自动保存
                  </span>
                </div>
              </section>
              {tracking && (
                <aside className="sidebar">
                  <div className="sidebar-title">
                    <span>
                      <Flag size={17} />
                      旅程追踪
                    </span>
                    <button
                      aria-label="收起任务追踪"
                      onClick={() => useGame.setState({ tracking: false })}
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <QuestTracker />
                  <Atlas mini />
                  <div className="traveler-tip">
                    <Leaf size={16} />
                    <p>
                      不必急着赶路。
                      <br />
                      每一个小小的行动，都有回响。
                    </p>
                  </div>
                </aside>
              )}
            </div>
            <nav className="bottom-nav" aria-label="游戏菜单">
              <div className="quick-inventory">
                {["wood", "stone", "seed", "crop"].map((item) => (
                  <button
                    key={item}
                    onClick={() => open("inventory")}
                    aria-label={`${itemNames[item]} ${state.inventory[item]}`}
                  >
                    <span className={`item-icon ${item}`} />
                    <b>{state.inventory[item]}</b>
                  </button>
                ))}
              </div>
              <div className="nav-actions">
                {nav.map(([target, label, Icon]) => (
                  <button key={target} onClick={() => open(target)}>
                    <Icon size={19} />
                    <span>{label}</span>
                    {target === "journal" &&
                      state.quest_log.some((q) => q.status === "ready") && (
                        <i className="nav-dot" />
                      )}
                  </button>
                ))}
              </div>
              <button className="guide-link" onClick={() => open("guide")}>
                <CircleHelp size={17} />
                怎么玩
              </button>
            </nav>
          </main>
          {notice && !panel && (
            <div className="toast" role="status">
              <Check size={17} />
              {notice}
            </div>
          )}
          {error && !panel && (
            <div className="toast error" role="alert">
              {error}
              <button
                aria-label="关闭错误提示"
                onClick={() => useGame.setState({ error: "" })}
              >
                <X size={16} />
              </button>
            </div>
          )}
          <Panels />
        </>
      )}
    </div>
  );
}
