import { BedDouble, Moon, Sun, Heart, Coffee, MapPin, X } from "lucide-react";
import { useState } from "react";
import { clockLabel, villageClock } from "../game/residents";
import { staminaNow } from "../game/stamina";
import { serverNow, useGame } from "../stores/game";

export function SleepPanel() {
  const { state, command, busy, error, notice, noticePanel, open } = useGame();
  if (!state) return null;
  const clock = villageClock(state, serverNow()),
    rules = state.sleep_rules;
  const minute = clock.minute < 360 ? clock.minute + 1440 : clock.minute;
  const tooLate = minute + (rules?.short_rest_minutes ?? 30) >= 1500;
  const day = clock.day;
  return (
    <section className="sleep-leaf" aria-label="床边休息选择">
      <div className="sleep-heading">
        <BedDouble size={34} aria-hidden="true" />
        <div>
          <small>
            第 {day} 天 · {clockLabel(clock.minute)} · 阅读时暂停
          </small>
          <h3>把今天留在枕边</h3>
          <p>家里的床，随时为你留着。</p>
        </div>
      </div>
      <div className="sleep-condition">
        <span>
          <Heart size={17} />
          生命 {state.vitality?.current} / {state.vitality?.max}
        </span>
        <span>
          体力 {staminaNow(state, serverNow())} / {state.stamina?.max}
        </span>
      </div>
      <div className="sleep-options">
        <section>
          <Moon size={24} aria-hidden="true" />
          <h4>睡到明早</h4>
          <p>
            进入第 {day + 1} 天 06:00，体力补满，生命恢复最多{" "}
            {rules?.sleep_health ?? 20} 点。
          </p>
          <button
            className="primary"
            disabled={busy}
            onClick={async () => {
              if (
                await command("rest", { target: "home_bed", expected_day: day })
              ) {
                open(null);
                requestAnimationFrame(() =>
                  document.querySelector<HTMLElement>(".game-canvas")?.focus(),
                );
              }
            }}
          >
            {busy ? "正在保存…" : "睡到明早 · 免费"}
          </button>
        </section>
        <section>
          <Coffee size={24} aria-hidden="true" />
          <h4>稍微歇一会儿</h4>
          <p>
            经过 {rules?.short_rest_minutes ?? 30} 游戏分钟，体力 +
            {rules?.short_rest_stamina ?? 20}、生命 +
            {rules?.short_rest_health ?? 10}，不超过上限。
          </p>
          <button
            disabled={busy || tooLate}
            onClick={() =>
              void command("short_rest", {
                target: "home_bed",
                expected_day: day,
              })
            }
          >
            {tooLate ? "临近 01:00，请睡到明早" : "小憩 30 分钟 · 免费"}
          </button>
        </section>
      </div>
      {noticePanel === "sleep" && notice && !error && (
        <p role="status">{notice}</p>
      )}
      {error && (
        <p className="sleep-error" role="alert">
          {error}
        </p>
      )}
      <p className="sleep-footnote">
        01:00 未睡会昏倒返家，生命 −{rules?.faint_damage ?? 10}（最低保留
        1），体力不恢复。作物与现实委托仍按现实时间计算，睡觉不会刷新现实成长额度。
      </p>
    </section>
  );
}

export function DaybreakNotice() {
  const night = useGame((s) => s.state?.world_clock?.last_night);
  const identity = night ? `${night.at}:${night.day}:${night.kind}` : "";
  const [dismissed, dismiss] = useState(() => {
    try {
      return sessionStorage.getItem("realquest-last-morning") || "";
    } catch {
      return "";
    }
  });
  if (!night || dismissed === identity) return null;
  const faint = night.kind === "faint";
  return (
    <section
      className="daybreak-note rq-theme"
      role="status"
      aria-label="今晨状态"
      data-faint={faint}
    >
      <Sun size={25} aria-hidden="true" />
      <div>
        <strong>
          {faint ? "夜深后，你被送回了家" : "早安，新的旅程开始了"}
        </strong>
        <p>
          第 {night.day + 1} 天 · 06:00。
          {faint
            ? `生命 ${night.health_delta}，体力未恢复。床边可以免费小憩。`
            : `体力已补满，生命 +${night.health_delta}。`}
        </p>
      </div>
      <button
        aria-label="收起今晨状态"
        onClick={() => {
          dismiss(identity);
          try {
            sessionStorage.setItem("realquest-last-morning", identity);
          } catch {
            /* Optional. */
          }
          document.querySelector<HTMLElement>(".game-canvas")?.focus();
        }}
      >
        <X size={18} />
      </button>
    </section>
  );
}

export function BedtimeReminder({ minute }: { minute: number }) {
  const navigate = useGame((s) => s.navigate);
  if (minute >= 60 && minute < 1380) return null;
  return (
    <aside
      className="bedtime-reminder rq-theme"
      role="status"
      aria-label="夜深提醒"
    >
      <Moon size={18} aria-hidden="true" />
      <span>
        {minute < 60
          ? "已经过了午夜，01:00 前记得上床。"
          : "夜深了，准备回家休息吧。"}
      </span>
      <button onClick={() => navigate({ mapId: "home", targetId: "home_bed" })}>
        <MapPin size={15} />
        标记家中床铺
      </button>
    </aside>
  );
}
