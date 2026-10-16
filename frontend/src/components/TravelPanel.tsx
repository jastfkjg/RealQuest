import {
  ArrowRight,
  Backpack,
  Clock3,
  Coins,
  Compass,
  Mountain,
  Waves,
  Check,
  BedDouble,
} from "lucide-react";
import { useGame } from "../stores/game";
import { clockLabel } from "../game/residents";
import { NpcPerson } from "./NpcPerson";
import { itemNames } from "../game/items";
import { useState } from "react";
const NPCS: Record<string, { name: string; role: string; line: string }> = {
  adu: {
    name: "阿渡",
    role: "苇风渡口 · 船夫",
    line: "桥和船，都通向山那边。带足体力，绳索系紧；回来时我还在这里。",
  },
  lanya: {
    name: "岚姨",
    role: "灯穗旅店 · 主人",
    line: "进门先歇歇脚。村里的来信我会好好收着；今晚要住下，就给你留一盏灯。",
  },
};
export function TravelPanel() {
  const [page, turnPage] = useState(0);
  const { state, selected, command, busy, open, notice, noticePanel, error } =
    useGame();
  if (!state || !selected || !state.travel) return null;
  const npc = NPCS[selected.id],
    options = state.travel.options.filter(
      (o) =>
        o.target === selected.id &&
        !(state.departure?.bridge_repaired && o.id.startsWith("repair_")) &&
        !(state.departure?.rope_ready && o.id === "rope"),
    );
  const chapter = state.quest_log.find((q) => q.id === "leave_valley");
  const index = Math.min(page, Math.max(0, options.length - 1));
  return (
    <section className="travel-leaf" aria-label="旅途安排">
      <header className="travel-intro">
        <div className="travel-portrait">
          {npc ? (
            <NpcPerson id={selected.id} portrait />
          ) : selected.id.includes("mountain") ? (
            <Mountain size={52} />
          ) : selected.id.includes("river") ? (
            <Waves size={52} />
          ) : (
            <Compass size={52} />
          )}
          {!npc && (
            <img
              className="travel-scene-art"
              src="/assets/hearthwood/journey/cliff-224.png"
              alt=""
            />
          )}
        </div>
        <div>
          <small>
            {npc?.role || "回响村庄 → 苇风渡口 → 苍脊山道 → 苔桥城"}
          </small>
          <h3>{npc?.name || selected.name.split(" · ")[0]}</h3>
          <p>
            {npc?.line ||
              "山水之间，每一段路都可以慢慢准备。先看清条件，再决定出发。"}
          </p>
        </div>
        {selected.id === "river_bridge" && (
          <p className="travel-hint">
            旧桥
            {state.departure?.bridge_repaired
              ? "已经修复，双向免费通行。"
              : "需要木板 6、石料 4。去木作工坊把木材制成木板；或找阿渡花 6 金币乘船。"}
          </p>
        )}
      </header>
      <div className="travel-status">
        <span>
          <Coins size={16} /> {state.inventory.gold} 金币
        </span>
        <span>
          <Backpack size={16} /> 绳索
          {state.departure?.rope_ready ? "已备好" : "未备好"}
        </span>
        <span>
          <Clock3 size={16} /> 第 {state.travel.day} 天 · 阅读暂停
        </span>
      </div>
      {selected.id === "city_notice" && (
        <div className="travel-news">
          <h4>南门街的第一盏灯</h4>
          <p>
            灯穗旅店的岚姨在等村里的来信。旅店可以订房、用餐和帮工；街角补给台出售绳索与热食。
          </p>
          <p>城北净水站传来异响。先在城里安顿下来，下一段旅程会从那里开始。</p>
          <small>净水站尚未开放，本阶段没有战斗。</small>
        </div>
      )}
      {options.length > 0 && (
        <div className="travel-actions">
          {options.length > 1 && (
            <nav className="field-pager" aria-label="旅途方案翻页">
              <button
                disabled={index === 0}
                onClick={() => turnPage(index - 1)}
              >
                上一方案
              </button>
              <span>
                方案 {index + 1} / {options.length}
              </span>
              <button
                disabled={index + 1 >= options.length}
                onClick={() => turnPage(index + 1)}
              >
                下一方案
              </button>
            </nav>
          )}
          {options.slice(index, index + 1).map((o) => (
            <section key={o.id} className="travel-action" aria-label={o.label}>
              <div>
                <h4>
                  {o.label}
                  {o.id === "book" &&
                    state.departure?.booking_day === state.travel?.day && (
                      <Check size={16} />
                    )}
                </h4>
                <p>{o.note}</p>
                <div className="travel-costs">
                  {Object.entries(o.costs).map(([id, n]) => (
                    <span key={id} data-short={(state.inventory[id] || 0) < n}>
                      {itemNames[id] || id} {state.inventory[id] || 0} / {n}
                    </span>
                  ))}
                  {!!o.stamina && <span>体力 −{o.stamina}</span>}
                  {!!o.minutes && (
                    <span>
                      {o.minutes} 游戏分钟 · 完成于{" "}
                      {clockLabel(o.arrival_minute)}
                    </span>
                  )}
                </div>
                {o.reasons.length > 0 && (
                  <p
                    className="travel-reason"
                    data-completed={o.completed}
                    id={`travel-${o.id}-reason`}
                  >
                    {o.reasons.join("；")}
                  </p>
                )}
              </div>
              <button
                className={!o.reasons.length ? "primary" : ""}
                disabled={busy || !!o.reasons.length}
                aria-describedby={
                  o.reasons.length ? `travel-${o.id}-reason` : undefined
                }
                onClick={async () => {
                  const success = await command("travel", {
                    target: selected.id,
                    option: o.id,
                    expected_day: state.travel!.day,
                    expected_location: state.location,
                  });
                  if (success && o.destination) open(null);
                }}
              >
                {busy ? (
                  "保存中…"
                ) : o.destination ? (
                  <>
                    <span>启程</span>
                    <ArrowRight size={17} />
                  </>
                ) : (
                  "确认"
                )}
              </button>
            </section>
          ))}
        </div>
      )}
      {selected.id === "lanya" &&
        state.departure?.booking_day === state.travel.day && (
          <p className="travel-booked">
            <BedDouble size={18} /> 今晚的房间已留好，请走到右上方床铺按 E
            睡觉。
          </p>
        )}
      {noticePanel === "travel" && notice && !error && (
        <p className="travel-receipt" role="status">
          {notice}
        </p>
      )}
      <footer className="travel-footer">
        <span>
          离村主线 · {chapter?.checks.filter(Boolean).length || 0} /{" "}
          {chapter?.checks.length || 6}
        </span>
        <span>01:00 前请睡觉 · 昏倒仍返家</span>
      </footer>
    </section>
  );
}
