import {
  ResidentsPanel,
  NpcEncounterLifecycle,
  WorldClockLifecycle,
} from "./components/Residents";
import { MarketPanel } from "./components/MarketPanel";
import { SleepPanel } from "./components/SleepPanel";
import { LifeQuestHistory } from "./components/LifeQuests";
import { RecoveryPanel } from "./components/RecoveryPanel";
import { TrainingPage } from "./components/TrainingPage";
import { StaminaBadge } from "./components/StaminaBadge";
import { HudIcon } from "./components/HudIcon";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  CircleHelp,
  Compass,
  Download,
  Flag,
  Settings,
  Sparkles,
  Sprout,
  User,
  X,
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
import { itemNames, useGame } from "./stores/game";
import { api } from "./services/api";
import type { Panel } from "./types";
function Modal({ title, children }: { title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null),
    open = useGame((s) => s.open);
  const panel = useGame((s) => s.panel);
  const state = useGame((s) => s.state);
  const tactile = [
    "sleep",
    "neighbors",
    "board",
    "map",
    "storage",
    "building",
    "shop",
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
  if (panel === "training") return <TrainingPage />;
  const titles: Record<string, string> = {
    sleep: "林间小屋 · 安心休息",
    board: "委托告示板",
    map: "回响大陆 · 旅行地图",
    storage: "家园储物箱",
    character: "冒险者档案",
    inventory: "旅行背包",
    activity: "现实成长 · 成长手记",
    journal: "冒险日志",
    guide: "旅人指南",
    settings: "存档与数据",
    ai: "AI 旅途伙伴",
    menu: "旅途菜单",
    shop: "风铃杂货铺",
    neighbors: "村民近况 · 邻里簿",
    building: selected?.name || "建筑",
    npc: selected?.id === "noah" ? "林间委托" : "林间相逢",
  };
  return (
    <Modal key={panel} title={titles[panel]}>
      {panel === "menu" && (
        <div className="journey-menu">
          <p>在这里经营家园，也为现实中的每一步成长留下回响。</p>
          <button
            onClick={() =>
              useGame
                .getState()
                .navigate({ mapId: "overworld", targetId: "shop" })
            }
          >
            <Compass size={18} />
            风铃杂货铺<span>标记方向 · 买卖与村民订单</span>
          </button>
          <button onClick={() => open("neighbors")}>
            <User size={18} />
            村民近况<span>大家在哪儿 · 喜好与日常作息</span>
          </button>
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
      {panel === "activity" && <LifeQuestHistory />}
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
      {panel === "neighbors" && <ResidentsPanel />}
      {panel === "sleep" && <SleepPanel />}
      {panel === "shop" && <MarketPanel />}
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
              06:00 起床，01:00
              前到家中床铺睡觉。未睡会被送回家，生命下降且体力不恢复；床边也可免费小憩。阅读面板、现实成长、后台与离线暂停游戏时间。
            </li>
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
            翻看成长手记 <ArrowRight size={16} />
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
      {error &&
        panel !== "sleep" &&
        panel !== "inventory" &&
        panel !== "journal" &&
        panel !== "character" && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      {notice &&
        panel !== "sleep" &&
        panel !== "inventory" &&
        panel !== "journal" &&
        panel !== "character" &&
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
          <WorldClockLifecycle />
          <NpcEncounterLifecycle />
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
                      <PixelPerson
                        variant={state.character.appearance}
                        portrait
                      />
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
                    <StaminaBadge />
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
                      style={{ opacity: state.inventory[item] > 0 ? 1 : 0.55 }}
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
                        <PixelPerson
                          variant={state.character?.appearance}
                          portrait
                        />
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
            <div className="toast rq-theme" role="status">
              <span className="hud-toast-icon">
                <Check size={18} />
              </span>
              <span className="hud-toast-copy">{notice}</span>
            </div>
          )}
          {error && !panel && (
            <div className="toast error rq-theme" role="alert">
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
