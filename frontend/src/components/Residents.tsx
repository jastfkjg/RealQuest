import { useEffect, useRef, useState } from "react";
import { Clock3, Gift, Heart, MapPin, Users, HandHeart } from "lucide-react";
import { sendCommand, getSessionIdentity, worldViewOwner } from "../services/api";
import { serverNow, useGame } from "../stores/game";
import {
  clockLabel,
  residentPlace,
  residentPosition,
  villageClock,
} from "../game/residents";
import { staminaNow } from "../game/stamina";
import { itemNames } from "../game/items";
import { NpcPerson } from "./NpcPerson";
import { BedtimeReminder } from "./SleepPanel";

function useVillageNow() {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    const timer = setInterval(() => setNow(serverNow()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

export function VillageClock() {
  const state = useGame((s) => s.state),
    panel = useGame((s) => s.panel),
    open = useGame((s) => s.open),
    now = useVillageNow();
  if (!state) return null;
  const clock = villageClock(state, now);
  return (
    <>
      <button
        className="village-clock rq-theme"
        data-late={clock.minute >= 1380 || clock.minute < 60}
        onClick={() => open("neighbors")}
        aria-label="查看村民近况和日常作息"
      >
        <Clock3 size={16} />
        <span>
          第 {clock.day} 天 · {clockLabel(clock.minute)}
        </span>
        <small>{panel ? "游戏已暂停" : "01:00 前入睡"}</small>
      </button>
      {!panel && <BedtimeReminder minute={clock.minute} />}
    </>
  );
}

/** Server counts bounded real intervals only while this world view is active. */
export function WorldClockLifecycle() {
  const panel = useGame((s) => s.panel);
  const owner = useRef(worldViewOwner).current;
  const [visible, setVisible] = useState(!document.hidden && document.hasFocus() && navigator.onLine);
  useEffect(() => {
    const visibility = () => setVisible(!document.hidden && document.hasFocus() && navigator.onLine);
    const blur = () => setVisible(false);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("online", visibility);
    window.addEventListener("offline", visibility);
    window.addEventListener("blur", blur);
    window.addEventListener("focus", visibility);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("online", visibility);
      window.removeEventListener("offline", visibility);
      window.removeEventListener("blur", blur);
      window.removeEventListener("focus", visibility);
    };
  }, []);
  useEffect(() => {
    let closed = false;
    const running = !panel && visible;
    const update = () =>
      void sendCommand(running ? "world_resume" : "world_pause", { owner })
        .then((reply) => {
          if (!closed) useGame.getState().accept(reply);
        })
        .catch(() => {});
    update();
    const timer = running ? setInterval(update, 3000) : undefined;
    return () => {
      closed = true;
      if (timer) clearInterval(timer);
    };
  }, [panel, visible, owner]);
  useEffect(() => {
    const leave = () =>
      void fetch("/api/command", {
        method: "POST",
        credentials: "same-origin",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "world_pause",
          data: { owner },
          request_id: crypto.randomUUID(),
          save_id: getSessionIdentity(),
        }),
      }).catch(() => {});
    window.addEventListener("pagehide", leave);
    return () => window.removeEventListener("pagehide", leave);
  }, [owner]);
  return null;
}

/** Keeps only the current encounter alive; stale close requests carry a token. */
export function NpcEncounterLifecycle() {
  const panel = useGame((s) => s.panel),
    token = useGame((s) => s.state?.npc_encounter?.token);
  const owns = panel === "npc" || panel === "shop";
  useEffect(() => {
    if (!token || !owns) return;
    const keep = setInterval(() => {
      void useGame.getState().command("npc_keep", { token }, true);
    }, 30000);
    return () => {
      clearInterval(keep);
      void useGame.getState().command("npc_release", { token }, true);
    };
  }, [token, owns]);
  return null;
}

export function NpcSocial({ id }: { id: string }) {
  const { state, world, command, busy, navigate } = useGame();
  const [topic, setTopic] = useState("today"),
    [item, setItem] = useState("crop");
  const now = useVillageNow();
  if (!state || !world) return null;
  const resident = world.residents?.find((r) => r.id === id);
  if (!resident) return null;
  const social = state.npc_social?.[id],
    position = residentPosition(resident, state, now);
  const near =
    position.location === state.location &&
    Math.hypot(state.position.x - position.x, state.position.y - position.y) <=
      72;
  return (
    <section className="npc-social" aria-label={`${resident.name}的邻里日常`}>
      <div className="npc-social-heading">
        <span>
          <Heart size={16} />
          熟悉度 {state.relationships[id] || 0}
        </span>
        <small>{social?.greeted ? "今天已问候" : "见面聊聊，慢慢熟悉"}</small>
      </div>
      {!near && (
        <p role="status">
          {resident.name}已继续行程。
          <button
            onClick={() => navigate({ mapId: position.location, targetId: id })}
          >
            标记当前位置
          </button>
        </p>
      )}
      <div className="npc-topics" role="group" aria-label="邻里话题">
        {!social?.greeted && (
          <button
            disabled={busy || !near}
            onClick={() => void command("talk", { target: id })}
          >
            打个招呼
          </button>
        )}
        {[
          ["today", "聊聊近况"],
          ["interest", "你喜欢什么"],
          ["routine", "平时去哪儿"],
          ["memory", "心里的故事"],
        ].map(([key, label]) => (
          <button
            key={key}
            aria-pressed={topic === key}
            disabled={
              busy || !near || (key === "memory" && !social?.memory_unlocked)
            }
            onClick={async () => {
              if (await command("npc_topic", { target: id, topic: key }))
                setTopic(key);
            }}
          >
            {label}
            {key === "memory" && !social?.memory_unlocked ? " · 熟悉度 5" : ""}
          </button>
        ))}
      </div>
      <div className="npc-kindness">
        <div className="npc-gift">
          <label>
            <Gift size={16} />
            捎一份心意
            <select
              aria-label={`送给${resident.name}的礼物`}
              value={item}
              disabled={busy || social?.gifted || !near}
              onChange={(e) => setItem(e.target.value)}
            >
              {["crop", "wood", "stone", "plank", "seed"].map((key) => (
                <option key={key} value={key}>
                  {itemNames[key]} · 持有 {state.inventory[key]}
                </option>
              ))}
            </select>
          </label>
          <button
            disabled={busy || !near || social?.gifted || !state.inventory[item]}
            onClick={() => void command("npc_gift", { target: id, item })}
          >
            {social?.gifted ? "今天已送过" : "送出 1 份"}
          </button>
          <small>
            消耗 1 {itemNames[item]} · 熟悉度 +
            {item === resident.favorite ? 2 : 1}；每人每天一次
          </small>
        </div>
        <div className="npc-help">
          <span>
            <HandHeart size={17} />
            {resident.help}
          </span>
          <button
            disabled={
              busy || !near || social?.helped || staminaNow(state, now) < 4
            }
            onClick={() => void command("npc_help", { target: id })}
          >
            {social?.helped
              ? "今天已一起忙过"
              : staminaNow(state, now) < 4
                ? "体力不足"
                : "搭把手 · 4 体力"}
          </button>
          <small>在村庄里帮个小忙 · 熟悉度 +1；每天一次</small>
        </div>
      </div>
      <p className="npc-social-footnote">
        {social?.memory_unlocked
          ? "已经熟悉，可以聊聊心里的故事了。"
          : "熟悉度达到 5，会愿意说起心里的故事。"}{" "}
        每日限制按北京时间零点刷新，不随村庄日长重置。
      </p>
    </section>
  );
}

export function ResidentsPanel() {
  const { state, world, navigate } = useGame();
  const book = useRef<HTMLDivElement>(null);
  const [id, select] = useState("lia"),
    now = useVillageNow();
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (innerHeight >= 600) {
        const body = book.current?.closest(".modal-body");
        if (body) body.scrollTop = 0;
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [id]);
  if (!state || !world?.residents) return null;
  const resident = world.residents.find((r) => r.id === id)!;
  const position = residentPosition(resident, state, now),
    clock = villageClock(state, now);
  return (
    <div className="residents-book" ref={book}>
      <aside className="residents-index" aria-label="村民名录">
        <p className="residents-eyebrow">
          <Users size={18} />
          慢慢熟悉的邻居
        </p>
        {world.residents.map((r) => {
          const p = residentPosition(r, state, now);
          return (
            <button
              key={r.id}
              aria-pressed={r.id === id}
              onClick={() => {
                select(r.id);
                if (innerHeight >= 600) {
                  const body = book.current?.closest(".modal-body");
                  if (body) body.scrollTop = 0;
                }
              }}
            >
              <NpcPerson id={r.id} portrait />
              <span>
                <strong>{r.name}</strong>
                <small>{r.role}</small>
                <span>{p.activity}</span>
              </span>
            </button>
          );
        })}
        <p className="residents-time">
          <Clock3 size={17} />第 {clock.day} 天 · {clockLabel(clock.minute)}
          <small>
            06:00 起床，01:00
            前入睡。阅读面板、后台与离线时暂停；现实委托仍按真实时间计算。
          </small>
        </p>
      </aside>
      <section className="resident-leaf" aria-label={`${resident.name}的作息`}>
        <header>
          <NpcPerson id={id} portrait />
          <div>
            <small>{resident.role}</small>
            <h3>{resident.name}</h3>
            <p>{resident.signature}</p>
          </div>
        </header>
        <div className="resident-where">
          <MapPin size={18} />
          <span>
            <b>{residentPlace(world, position.location)}</b>
            <small>{position.activity}</small>
          </span>
          <button
            className="primary"
            onClick={() => navigate({ mapId: position.location, targetId: id })}
          >
            标记方向并返回
          </button>
        </div>
        <div className="resident-preferences">
          <Heart size={16} />
          熟悉度 {state.relationships[id] || 0}
          <span>
            最爱 {itemNames[resident.favorite]} · 喜欢{" "}
            {itemNames[resident.liked]}
          </span>
        </div>
        <h4>平常的一天</h4>
        <ol className="resident-schedule">
          {resident.schedule
            .filter((s) => s.minute > 0)
            .map((phase) => (
              <li
                key={phase.minute}
                data-current={phase.minute === position.phase}
              >
                <time>{clockLabel(phase.minute)}</time>
                <span>
                  {phase.activity}
                  <small>{residentPlace(world, phase.location)}</small>
                </span>
                {phase.minute === position.phase && <b>此刻</b>}
              </li>
            ))}
        </ol>
        <p className="resident-note">
          查看面板时，整个村庄都会稍等片刻。关上面板再继续日常；夜间也能在各自歇脚处找到他们。
        </p>
      </section>
    </div>
  );
}
