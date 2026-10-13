import { RecoveryPanel } from "./components/RecoveryPanel";
import { HudIcon } from "./components/HudIcon";
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
  User,
  X,
  Zap,
} from "lucide-react";
import { CharacterPanel, PixelPerson } from "./components/RpgPanels";
import { Welcome } from "./components/Welcome";
import { QuestList, QuestTracker, QuestCompass } from "./components/Quests";
import { JournalPanel } from "./components/JournalPanel";
import { InventoryPanel } from "./components/InventoryPanel";
import { InventoryWallet } from "./components/InventoryView";
import { Atlas } from "./components/Atlas";
import { StudyPage } from "./components/StudyPage";
import {
  BuildingPanel,
  ConversationPanel,
  StoragePanel,
} from "./components/WorldPanels";
import { chime, unlockSound, usePreferences } from "./game/feel";
import { GameCanvas } from "./game/GameCanvas";
import { activityNames, itemNames, serverNow, useGame } from "./stores/game";
import { api } from "./services/api";
import type { Attribute, Panel } from "./types";
const attrIcons = {
  strength: Heart,
  wisdom: BookOpen,
  craft: Hammer,
  stewardship: Sprout,
  bond: Sparkles,
};
function Modal({ title, children }: { title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null),
    open = useGame((s) => s.open);
  const panel = useGame((s) => s.panel);
  const state = useGame((s) => s.state);
  const tactile = [
    "board",
    "map",
    "storage",
    "building",
    "npc",
    "activity",
  ].includes(panel || "");
  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.showModal();
    return () => {
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${tactile || ["inventory", "journal", "character"].includes(panel || "") ? "rq-theme" : ""} ${tactile ? "hp-panel" : ""} panel-${panel} ${panel === "npc" ? "dialogue-modal" : ""}`}
      aria-labelledby="panel-title"
      onKeyDown={(event) => {
        if (
          event.key !== "Tab" ||
          (!tactile &&
            !["inventory", "journal", "character"].includes(panel || ""))
        )
          return;
        const controls = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            "button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex='0']",
          ),
        ).filter((el) => el.getClientRects().length > 0);
        const first = controls[0],
          last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onCancel={() => open(null)}
      onClick={(event) => {
        if (event.target === event.currentTarget) open(null);
      }}
    >
      <div className="modal-head">
        <h2 id="panel-title">{title}</h2>
        {panel === "inventory" && state && (
          <InventoryWallet
            gold={state.inventory.gold}
            energy={state.energy}
            shards={state.knowledge_shard}
          />
        )}
        <button
          className={
            panel === "inventory"
              ? "rq-button hw-close"
              : panel === "journal"
                ? "rq-button hj-close"
                : panel === "character"
                  ? "rq-button hc-close"
                  : tactile
                    ? "rq-button hp-close"
                    : "icon-button"
          }
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
function DialogueText({ text }: { text: string }) {
  const reduced = usePreferences((s) => s.reducedMotion);
  const [count, setCount] = useState(reduced ? text.length : 0);
  useEffect(() => {
    setCount(reduced ? text.length : 0);
    if (reduced) return;
    const timer = setInterval(
      () => setCount((n) => Math.min(text.length, n + 1)),
      24,
    );
    return () => clearInterval(timer);
  }, [text, reduced]);
  const reveal = () => {
    setCount(text.length);
    unlockSound();
    chime("interact");
  };
  return (
    <div className="dialogue-text" role="group" aria-label={text}>
      <blockquote aria-hidden="true">
        {text.slice(0, count)}
        {count < text.length && <span className="dialogue-cursor">▌</span>}
      </blockquote>
      {count < text.length && (
        <button className="text-button" onClick={reveal}>
          显示完整对话 <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
}
function GrowthReceipt() {
  const state = useGame((s) => s.state);
  const latest = state?.activities.at(-1);
  return (
    <aside className="ha-growth-receipt" aria-label="最近的成长记录">
      <span>
        <Check size={18} />
        {latest ? "最近已记录" : "现实行动 → 游戏成长"}
      </span>
      {latest ? (
        <>
          <strong>
            {latest.note || activityNames[latest.kind]}
            <small>
              {latest.source === "timer"
                ? "计时"
                : latest.source === "manual"
                  ? "手动"
                  : latest.source}{" "}
              · {latest.date}
            </small>
          </strong>
          <b>
            +{latest.xp} EXP
            {latest.knowledge_shards
              ? ` · +${latest.knowledge_shards} 碎片`
              : ""}
          </b>
        </>
      ) : (
        <p>学习积累学识，运动积累体魄。实际奖励以保存结果为准。</p>
      )}
    </aside>
  );
}
function ActivityPanel() {
  const { state, command, busy } = useGame(),
    [kind, setKind] = useState(useGame.getState().activityKind),
    [amount, setAmount] = useState(
      useGame.getState().activityKind === "steps" ? "3000" : "25",
    ),
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
    <div className="hp-growth">
      <div className="hp-study-entry">
        <div>
          <strong>把今天想学的，写进手札</strong>
          <p>选一件小事，专注一会儿，让成长留下回响。</p>
        </div>
        <button
          className="rq-button rq-button--primary"
          onClick={() => useGame.getState().open("study")}
        >
          <BookOpen size={18} /> 今日研习 <ArrowRight size={16} />
        </button>
      </div>
      <div className="life-bridge">
        <Leaf size={22} />
        <div>
          <strong>把今天的行动，记作一次成长</strong>
          <p>计时或手动记录 · 保存后结算游戏奖励</p>
        </div>
      </div>
      <GrowthReceipt />
      <div className="hp-growth-columns">
        <section className="hp-focus-page">
          <div className="section-label">
            <Timer size={17} /> 专注学习{" "}
            <span className="ha-source">计时记录</span>
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
        </section>
        <section className="hp-record-page">
          <div className="section-label">
            <Plus size={17} /> 手动记录{" "}
            <span className="ha-source">自行填写</span>
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
        </section>
      </div>
    </div>
  );
}
export function Panels() {
  const {
    panel,
    selected,
    dialogue,
    state,
    command,
    busy,
    error,
    notice,
    noticePanel,
    open,
  } = useGame();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const preferences = usePreferences();
  if (!panel || !state) return null;
  if (panel === "study") return <StudyPage />;
  const titles: Record<string, string> = {
    board: "委托告示板",
    map: "回响大陆 · 全域地图",
    storage: "家园储物箱",
    character: "冒险者档案",
    inventory: "旅行背包",
    activity: "现实中的成长",
    journal: "冒险日志",
    guide: "旅人指南",
    settings: "存档与数据",
    ai: "AI 旅途伙伴",
    menu: "旅途菜单",
    building: selected?.name || "建筑",
    npc: "林间相逢",
  };
  return (
    <Modal key={panel} title={titles[panel]}>
      {panel === "menu" && (
        <div className="journey-menu">
          <p>在这里经营家园，也为现实中的每一步成长留下回响。</p>
          <button onClick={() => open("guide")}>
            <CircleHelp size={18} />
            旅人指南<span>移动、交互与玩法</span>
          </button>
          <button onClick={() => open("settings")}>
            <Settings size={18} />
            存档与数据<span>音效、动态效果与备份</span>
          </button>
          <button onClick={() => open("ai")}>
            <Sparkles size={18} />
            AI 旅途伙伴<span>当前尚未接入</span>
          </button>
        </div>
      )}
      {panel === "activity" && <ActivityPanel />}
      {panel === "map" && <Atlas />}
      {panel === "board" && (
        <>
          <QuestList giver={selected?.id} />
        </>
      )}
      {panel === "storage" && <StoragePanel />}
      {panel === "character" && <CharacterPanel />}
      {panel === "inventory" && <InventoryPanel />}
      {panel === "building" && <BuildingPanel />}
      {panel === "npc" && selected && (
        <ConversationPanel>
          <DialogueText text={dialogue} />
        </ConversationPanel>
      )}
      {panel === "journal" && <JournalPanel />}
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
            <kbd>Esc</kbd> 关闭面板或退出全屏。<kbd>I</kbd> 背包、<kbd>C</kbd>{" "}
            角色、<kbd>J</kbd> 任务日志、<kbd>L</kbd> 现实成长。
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
          <div className="preferences">
            <label>
              <input
                type="checkbox"
                checked={preferences.sound}
                onChange={(e) => {
                  preferences.set({ sound: e.target.checked });
                  unlockSound();
                  chime();
                }}
              />{" "}
              开启游戏音效
            </label>
            <label>
              <input
                type="checkbox"
                checked={preferences.reducedMotion}
                onChange={(e) =>
                  preferences.set({ reducedMotion: e.target.checked })
                }
              />{" "}
              减少动态效果
            </label>
          </div>
          <hr />
          <RecoveryPanel />
          <hr />
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
            此导出用于查看完整数据；找回旅程请使用上方的旅程凭证。
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
      {error && panel !== "inventory" && panel !== "journal" && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {notice &&
        panel !== "inventory" &&
        panel !== "journal" &&
        noticePanel === panel &&
        !(panel === "npc" && notice === dialogue) && (
          <p className="panel-notice" role="status">
            {notice}
          </p>
        )}
    </Modal>
  );
}
export default function App() {
  const {
    state,
    ready,
    boot,
    open,
    error,
    notice,
    tracking,
    panel,
    quickItems,
    selectItem,
  } = useGame();
  useEffect(() => {
    void boot();
  }, [boot]);
  useEffect(() => {
    if (!notice || panel) return;
    const id = setTimeout(() => useGame.setState({ notice: "" }), 5500);
    return () => clearTimeout(id);
  }, [notice, panel]);
  useEffect(() => {
    if (!ready) return;
    let refreshing = false;
    const refresh = () => {
      if (!document.hidden && !refreshing) {
        refreshing = true;
        void api("state")
          .then((reply) => useGame.getState().accept(reply))
          .catch(() => undefined)
          .finally(() => {
            refreshing = false;
          });
      }
    };
    const id = setInterval(refresh, 15000);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("pageshow", refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("pageshow", refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
    };
  }, [ready]);
  const preferences = usePreferences();
  const nav: [Panel, string, string][] = [
    ["inventory", "背包", "I"],
    ["character", "角色", "C"],
    ["journal", "任务日志", "J"],
    ["activity", "现实成长", "L"],
  ];
  return (
    <div
      className={`app-shell ${state?.character ? "playing" : ""} ${preferences.reducedMotion ? "reduce-motion" : ""}`}
      data-location={state?.location}
    >
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
          className="header-actions rq-theme"
          style={{ visibility: state?.character ? "visible" : "hidden" }}
        >
          <button
            aria-label="地图"
            title="地图 · M"
            onClick={() => open("map")}
          >
            <HudIcon name="map" />
          </button>
          <button
            className="sound-toggle"
            aria-label={preferences.sound ? "关闭游戏音效" : "开启游戏音效"}
            aria-pressed={preferences.sound}
            title={preferences.sound ? "关闭游戏音效" : "开启游戏音效"}
            onClick={() => {
              preferences.set({ sound: !preferences.sound });
              unlockSound();
              chime();
            }}
          >
            <HudIcon name={preferences.sound ? "sound" : "muted"} />
          </button>
          <button
            aria-label="主菜单"
            title="主菜单"
            onClick={() => open("menu")}
          >
            <HudIcon name="menu" />
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
                <div className="game-status rq-theme">
                  <button
                    aria-label="查看角色成长"
                    className="level"
                    onClick={() => open("character")}
                  >
                    <div className="hud-portrait">
                      <PixelPerson variant={state.character.appearance} />
                      <span
                        aria-label={`等级 ${1 + Math.floor(state.xp / 100)}`}
                      >
                        {1 + Math.floor(state.xp / 100)}
                      </span>
                    </div>
                    <div className="hud-nameplate">
                      <b>
                        <span className="player-name">
                          {state.character.name}
                        </span>
                        <span> Lv.{1 + Math.floor(state.xp / 100)}</span>
                      </b>
                      <div
                        className="xp-track"
                        role="progressbar"
                        aria-label="当前等级经验"
                        aria-valuenow={state.xp % 100}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <i style={{ width: `${state.xp % 100}%` }} />
                      </div>
                      <small>
                        {state.xp >= 100 ? "逐光的旅人" : "初生的唤醒者"}
                      </small>
                    </div>
                  </button>
                  <div className="currencies">
                    <span aria-label={`金币 ${state.inventory.gold}`}>
                      <i className="coin" />
                      {state.inventory.gold}
                      <small>金币</small>
                    </span>
                    <span aria-label={`探索能量 ${state.energy}`}>
                      <HudIcon name="energy" />
                      {state.energy}
                      <small>探索能量</small>
                    </span>
                  </div>
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
              {!panel && !tracking && <QuestCompass />}
              {!panel && tracking && (
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
                </aside>
              )}
            </div>
            <nav className="bottom-nav rq-theme" aria-label="游戏菜单">
              <div className="quick-inventory">
                {quickItems.map((item, index) => (
                  <button
                    key={item}
                    data-depleted={!state.inventory[item]}
                    onClick={() => {
                      selectItem(item);
                      open("inventory");
                    }}
                    aria-label={`在背包中查看${itemNames[item]}，数量 ${state.inventory[item] || 0}`}
                    title={`${index + 1} · 在背包中查看${itemNames[item]}${state.inventory[item] > 0 ? "" : " · 暂未持有"}`}
                  >
                    <kbd>{index + 1}</kbd>
                    <span
                      className={`item-icon ${item}`}
                      style={{ opacity: state.inventory[item] > 0 ? 1 : 0.35 }}
                    />
                    <b>{state.inventory[item] || 0}</b>
                  </button>
                ))}
              </div>
              <div className="nav-actions">
                {nav.map(([target, label, shortcut]) => (
                  <button
                    key={target}
                    aria-label={label}
                    title={`${label} · ${shortcut}`}
                    className={target === "activity" ? "life-entry" : undefined}
                    onClick={() => open(target)}
                  >
                    {target === "character" ? (
                      <span className="hud-menu-portrait">
                        <PixelPerson variant={state.character?.appearance} />
                      </span>
                    ) : (
                      <HudIcon
                        name={
                          target === "inventory"
                            ? "backpack"
                            : target === "journal"
                              ? "journal"
                              : "sprout"
                        }
                      />
                    )}
                    <span className="hud-menu-label">{label}</span>

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
