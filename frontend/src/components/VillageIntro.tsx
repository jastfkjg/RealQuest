import { ArrowRight, Check, MapPin } from "lucide-react";
import { useState } from "react";
import { useGame } from "../stores/game";
import {
  trackedIntroStep,
  villageIntroStep,
  type IntroStep,
} from "../game/villageIntro";

export function followIntroStep(step: IntroStep) {
  const store = useGame.getState();
  if (step.panel) store.open(step.panel);
  else if (step.target) store.navigate(step.target);
}

export function IntroTracker() {
  const { state, open, command, busy } = useGame();
  const step = state && trackedIntroStep(state);
  if (!step) return null;
  const intro = state!.village_intro!;
  const complete = [
    intro.briefed,
    !!state!.combat?.equipped && !!state!.inventory[state!.combat!.equipped!],
    intro.first_clear,
    intro.returned,
  ];
  return (
    <div className="tracked-quest intro-tracker" aria-label="第一次初探引导">
      <span className="chapter-label">第一章 · 第一次初探</span>
      <h2>{step.title}</h2>
      <ol>
        {["了解离村条件", "准备并装备武器", "清理洞穴首层", "带材料回工坊"].map(
          (label, i) => (
            <li
              className={complete[i] ? "complete" : ""}
              aria-current={i === step.index ? "step" : undefined}
              key={label}
            >
              <span>{complete[i] ? <Check size={13} /> : i + 1}</span>
              {label}
            </li>
          ),
        )}
      </ol>
      <div className="next-step">
        <span>这次先做这一件事</span>
        <p>{step.note}</p>
      </div>
      <button className="quest-guide" onClick={() => followIntroStep(step)}>
        <MapPin size={15} />
        {step.action}
        <ArrowRight size={15} />
      </button>
      <div className="intro-secondary">
        <button className="text-button" onClick={() => open("journal")}>
          全部委托
        </button>
        <button
          className="text-button"
          disabled={busy}
          onClick={() => void command("intro_toggle", { dismissed: true })}
        >
          暂时收起引导
        </button>
      </div>
    </div>
  );
}

export function IntroContext({
  place,
  paged = false,
}: {
  place: "board" | "gate" | "gear" | "cave";
  paged?: boolean;
}) {
  const [briefPage, setBriefPage] = useState(0);
  const { state, selected, command, busy, navigate } = useGame();
  if (
    !state?.village_intro ||
    !state.combat ||
    state.quests.settle_in?.status !== "claimed"
  )
    return null;
  const intro = state.village_intro;
  if (intro.dismissed || state.combat.gate_open) return null;
  if (place === "board" && selected?.id !== "board") return null;
  if (intro.reviewed)
    return place === "gear" ? (
      <section className="intro-context">
        <p className="intro-complete">
          <Check size={17} />
          第一次初探已完成，收获与通路已保存。
        </p>
        <h4>准备下一次出发</h4>
        <p>看看材料能改善什么装备，也为深入洞穴和启门魔法留一份打算。</p>
        <button onClick={() => useGame.getState().open("preparation")}>
          翻开再出发手记 <ArrowRight size={16} />
        </button>
      </section>
    ) : null;
  const step = villageIntroStep(state);
  if (!step) return null;
  const atCounter =
    state.location === "workshop" &&
    Math.hypot(state.position.x - 376, state.position.y - 280) <= 72;
  const quest = state.quest_log.find((q) => q.id === "leave_valley");
  if ((place === "board" || place === "gate") && !intro.briefed)
    return (
      <section className="intro-context" aria-label="第一次远行的条件">
        <small>安家之后 · 第一次远行</small>
        <h4>先试一次身手，再慢慢准备远行</h4>
        {(!paged || briefPage === 0) && (
          <p>
            离村石门需要：击败第5层守卫、取得门钥魔法石，以及魔法3级。科技主修也需要这项启门魔法。
          </p>
        )}
        {(!paged || briefPage === 1) && (
          <p>
            魔法每级投入1知识点；诺亚的学习委托每现实小时结算1点，可离线计时。三类委托每日合计最多5点。从0级准备启门至少需3小时现实委托，游戏睡眠不会加速。
          </p>
        )}
        {(!paged || briefPage === 0) && (
          <p>
            <strong>购买武器、探索首层不要求魔法等级。</strong>
            这次先带一点材料回村，不必一次打到底。
          </p>
        )}
        {paged && (
          <nav className="board-step-pages" aria-label="远行准备翻页">
            <button disabled={briefPage === 0} onClick={() => setBriefPage(0)}>
              上一页
            </button>
            <span>{briefPage + 1} / 2</span>
            <button disabled={briefPage === 1} onClick={() => setBriefPage(1)}>
              下一页
            </button>
          </nav>
        )}
        {(!paged || briefPage === 1) && (
          <button
            className="primary"
            disabled={busy}
            onClick={() =>
              void command(
                place === "board" && quest?.status === "available"
                  ? "quest_accept"
                  : "intro_brief",
                place === "board" && quest?.status === "available"
                  ? { quest_id: "leave_valley" }
                  : {
                      target: place === "board" ? "board" : "village_departure",
                    },
              )
            }
          >
            {busy
              ? "正在记下…"
              : place === "board" && quest?.status === "available"
                ? "接下远行来信，开始准备"
                : "记下条件，先准备武器"}
          </button>
        )}
      </section>
    );
  if (place === "gate") return null;
  if (place === "cave")
    return (
      <section className="intro-context" aria-label="首次洞穴探索提示">
        <small>
          第一次初探 · {intro.first_clear ? "已有收获" : "只需探索首层"}
        </small>
        <p>
          {intro.first_clear
            ? "首层已清理。可以带材料返回工坊查看用途，也可以自行继续探索。"
            : "首层有3只苔团。空格或攻击按钮出手，看到预兆后移动退让；已获材料随时保留。"}
        </p>
        <p>未准备好也可先离开。武器要主动装备，生命和体力可在家中床边恢复。</p>
      </section>
    );
  if (place === "gear" && intro.returned)
    return (
      <section className="intro-context" aria-label="初探材料回顾">
        <small>第一次初探 · 带着收获回来了</small>
        <h4>苔团留下的胶质，能用来制作法器</h4>
        <p>
          背包现有黏液胶质 {state.inventory.gel || 0} 份。微光短杖的图纸需要胶质{" "}
          {state.combat.weapons.glow_staff.costs.gel}{" "}
          份，另需木板、石料、晶屑、加工费，以及建造1级、魔法2级。
        </p>
        <p>
          材料可以先留着。接下来可继续探洞取得晶屑，或找诺亚开始现实学习委托，为魔法研修作准备。
        </p>
        <button
          className="primary"
          disabled={busy || !atCounter}
          onClick={async () => {
            if (await command("intro_review", {}))
              useGame.getState().open("preparation");
          }}
        >
          {busy ? "正在保存…" : "记下这次初探"}
        </button>
        {!atCounter && <p>请走近工坊武备台查看材料。</p>}
        <button
          onClick={() => navigate({ mapId: "overworld", targetId: "noah" })}
        >
          标记诺亚 · 安排学习委托
        </button>
      </section>
    );
  return (
    <section
      className="intro-context intro-context--compact"
      aria-label="初探下一步"
    >
      <small>第一次初探</small>
      <h4>{step.title}</h4>
      <p>{step.note}</p>
      {!(
        place === "gear" && ["weapon", "equip", "review"].includes(step.id)
      ) && (
        <button onClick={() => followIntroStep(step)}>
          {step.action}
          <ArrowRight size={15} />
        </button>
      )}
    </section>
  );
}

export function IntroGuidePreference() {
  const { state, busy, command } = useGame();
  if (!state?.village_intro || state.combat?.gate_open) return null;
  return (
    <p className="intro-preference">
      {state.village_intro.reviewed
        ? "下一程引导按实际准备更新，可随时收起。"
        : "第一次初探引导会保存进度，可随时收起。"}
      <button
        disabled={busy}
        onClick={() =>
          void command("intro_toggle", {
            dismissed: !state.village_intro!.dismissed,
          })
        }
      >
        {state.village_intro.dismissed
          ? state.village_intro.reviewed
            ? "继续下一程引导"
            : "继续初探引导"
          : "暂时收起引导"}
      </button>
    </p>
  );
}
