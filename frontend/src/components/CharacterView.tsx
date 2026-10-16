import { useEffect, useId, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  Heart,
  Info,
  Leaf,
  MapPin,
  Sprout,
  X,
  Zap,
} from "lucide-react";
import type {
  GameState,
  GrowthCurrency,
  GrowthOption,
  GrowthTarget,
} from "../types";
import { appearanceNames } from "../game/characterGrowth";
import { PixelPerson } from "./PixelPerson";

const targets = {
  vitality: { name: "生命" },
  stamina: { name: "体力" },
  science: { name: "科学" },
  magic: { name: "魔法" },
  planting: { name: "种植" },
  ranching: { name: "养殖" },
  building: { name: "建造" },
};
const currencies = {
  health_points: { name: "健康点", kind: "运动", icon: Heart },
  knowledge_points: { name: "知识点", kind: "学习", icon: BookOpen },
  skill_points: { name: "技能点", kind: "工作", icon: Sprout },
};

function AbilityArt({ target }: { target: GrowthTarget }) {
  if (target === "vitality") return <Heart aria-hidden="true" />;
  if (target === "stamina") return <Zap aria-hidden="true" />;
  return (
    <img
      src={`/assets/hearthwood/character/${target}.webp`}
      alt=""
      draggable={false}
      width={512}
      height={512}
    />
  );
}

export interface CharacterViewProps {
  character: NonNullable<GameState["character"]>;
  vitality: { current: number; max: number };
  stamina: { current: number; max: number };
  balances: Record<GrowthCurrency, number>;
  options: Record<GrowthTarget, GrowthOption>;
  journal?: GameState["life_journal"];
  busy?: boolean;
  error?: string;
  result?: string;
  preview?: boolean;
  onUpgrade: (target: GrowthTarget, option: GrowthOption) => void;
  onSelectionChange?: () => void;
  onOpenJournal?: () => void;
  onLocateNoah?: () => void;
}

export function CharacterView({
  character,
  vitality,
  stamina,
  balances,
  options,
  journal,
  busy = false,
  error,
  result,
  preview,
  onUpgrade,
  onSelectionChange,
  onOpenJournal,
  onLocateNoah,
}: CharacterViewProps) {
  const [selected, setSelected] = useState<GrowthTarget>("planting");
  const [showCommission, setShowCommission] = useState(false);
  const detailId = useId(),
    hintId = useId(),
    commissionId = useId();
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const commissionHeading = useRef<HTMLHeadingElement>(null);
  const commissionButton = useRef<HTMLButtonElement>(null);
  const feedback = useRef<HTMLParagraphElement>(null);
  const option = options[selected],
    target = targets[selected];
  const isCapacity = selected === "vitality" || selected === "stamina";
  const currency = currencies[option.currency];
  const balance = balances[option.currency],
    shortage = Math.max(0, option.cost - balance);
  const active = journal?.tasks.find((task) => task.status === "active");
  const effect = isCapacity
    ? `上限与当前${target.name}各增加 ${option.next - option.current} 点。`
    : selected === "science" || selected === "magic"
      ? "升级保存研修等级；道具与法术效果尚未开放。"
      : "升级保存技能等级；技能加成尚未开放。";

  useEffect(() => {
    // Native disabled buttons can release focus while the request is pending.
    // Restore it only if the user has not moved to another control.
    if (
      !busy &&
      (error || result) &&
      document.activeElement === document.body
    ) {
      commissionButton.current?.focus({ preventScroll: true });
    }
    if (result && window.matchMedia("(max-width: 760px)").matches) {
      feedback.current?.scrollIntoView({ block: "nearest" });
    }
  }, [busy, error, result]);

  function select(key: GrowthTarget) {
    setSelected(key);
    setShowCommission(false);
    onSelectionChange?.();
    if (window.matchMedia("(max-width: 760px)").matches) {
      requestAnimationFrame(() => {
        detailHeading.current?.focus({ preventScroll: true });
        detailHeading.current
          ?.closest(".hc-upgrade")
          ?.scrollIntoView({ block: "start" });
      });
    }
  }
  function closeCommission() {
    setShowCommission(false);
    commissionButton.current?.focus();
  }
  function wallet(key: GrowthCurrency) {
    const entry = currencies[key],
      Icon = entry.icon;
    return (
      <span
        className="hc-balance"
        aria-label={`可用${entry.name} ${balances[key]}`}
      >
        <Icon size={24} aria-hidden="true" />
        <span>{entry.name}</span>
        <strong>{balances[key]}</strong>
      </span>
    );
  }
  function abilities(keys: GrowthTarget[]) {
    return keys.map((key) => (
      <button
        key={key}
        type="button"
        className="hc-ability"
        aria-label={`${targets[key].name}，等级 ${options[key].current}`}
        aria-pressed={selected === key}
        aria-controls={detailId}
        disabled={busy}
        onClick={() => select(key)}
      >
        <span className="hc-medallion">
          <AbilityArt target={key} />
          {selected === key && (
            <span className="hc-selected-mark">
              <Check size={20} aria-hidden="true" />
            </span>
          )}
        </span>
        <b>{targets[key].name}</b>
        <span className="hc-level">Lv.{options[key].current}</span>
        <span className="hc-selection-caption" aria-hidden="true">
          {selected === key ? "已选择" : "查看成长"}
        </span>
      </button>
    ));
  }
  return (
    <div
      className="hc-dossier"
      onKeyDown={(event) => {
        if (event.key === "Escape" && showCommission) {
          event.preventDefault();
          event.stopPropagation();
          closeCommission();
        }
      }}
    >
      <header className="hc-heading">
        <Leaf size={30} aria-hidden="true" />
        <h3>冒险者档案</h3>
        {preview && (
          <span className="hc-preview-label">开发样例 · 不保存数据</span>
        )}
      </header>
      <div className="hc-layout">
        <aside className="hc-person">
          <section className="hc-identity" aria-label="冒险者身份">
            <div className="hc-portrait">
              <div className="hc-portrait-picture">
                <PixelPerson variant={character.appearance} />
              </div>
            </div>
            <div className="hc-name-block">
              <h3>{character.name}</h3>
              <p>回响大陆 · {appearanceNames[character.appearance]}</p>
            </div>
          </section>
          <section className="hc-vitals" aria-label="生命与体力">
            {(["vitality", "stamina"] as const).map((key) => {
              const value = key === "vitality" ? vitality : stamina,
                Icon = key === "vitality" ? Heart : Zap;
              return (
                <div className="hc-vital" key={key} data-resource={key}>
                  <Icon size={26} aria-hidden="true" />
                  <div className="hc-vital-value">
                    <div>
                      <b>{targets[key].name}值</b>
                      <strong>
                        {value.current} <span>/ {value.max}</span>
                      </strong>
                    </div>
                    <div
                      className="hc-meter"
                      role="progressbar"
                      aria-label={`${targets[key].name}值`}
                      aria-valuemin={0}
                      aria-valuemax={value.max}
                      aria-valuenow={value.current}
                      aria-valuetext={`${value.current} / ${value.max}`}
                    >
                      <i
                        style={{
                          width: `${Math.max(0, Math.min(100, (value.current / value.max) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    className="rq-button hc-capacity"
                    aria-label={`提升${targets[key].name}上限`}
                    aria-pressed={selected === key}
                    aria-controls={detailId}
                    disabled={busy}
                    onClick={() => select(key)}
                  >
                    提升
                  </button>
                </div>
              );
            })}
          </section>
          <div className="hc-health-wallet">
            {wallet("health_points")}
            <p>提升上限消耗健康点</p>
          </div>
        </aside>
        <div className="hc-growth" role="group" aria-label="角色成长">
          <section className="hc-path" aria-label="知识研修">
            <div className="hc-section-title">
              <h3>知识研修</h3>
              {wallet("knowledge_points")}
            </div>
            <div className="hc-abilities hc-knowledge">
              {abilities(["science", "magic"])}
            </div>
          </section>
          <section className="hc-path" aria-label="生活技能">
            <div className="hc-section-title">
              <h3>生活技能</h3>
              {wallet("skill_points")}
            </div>
            <div className="hc-abilities">
              {abilities(["planting", "ranching", "building"])}
            </div>
          </section>
          <section
            id={detailId}
            className="hc-upgrade"
            aria-label="升级详情"
            aria-busy={busy}
          >
            <div className="hc-upgrade-art">
              <AbilityArt target={selected} />
            </div>
            <div className="hc-upgrade-summary">
              <h3 ref={detailHeading} tabIndex={-1}>
                {target.name}
                {isCapacity ? "上限提升" : "升级"}
              </h3>
              <p
                className="hc-transition"
                aria-label={`${target.name}${isCapacity ? "上限" : "等级"} ${option.current} 到 ${option.next}`}
              >
                <span>
                  {isCapacity ? "" : "Lv."}
                  {option.current}
                </span>
                <ArrowRight size={23} aria-hidden="true" />
                <strong>
                  {isCapacity ? "" : "Lv."}
                  {option.next}
                </strong>
              </p>
              <p className="hc-accounting">
                需要{" "}
                <b>
                  {option.cost} {currency.name}
                </b>{" "}
                · 当前 <b>{balance}</b>
              </p>
              <p className="hc-remaining">
                {shortage
                  ? `再积累 ${shortage} ${currency.name}，就能${isCapacity ? "提升上限" : "提升等级"}。`
                  : `升级后剩余 ${balance - option.cost} ${currency.name}`}
              </p>
            </div>
            <div className="hc-upgrade-action">
              {shortage > 0 && (
                <p id={hintId} className="hc-upgrade-note">
                  完成诺亚的{currency.kind}委托，结算后获得{currency.name}。
                </p>
              )}
              <button
                ref={commissionButton}
                type="button"
                className="rq-button rq-button--primary hc-invest"
                disabled={busy}
                aria-expanded={shortage ? showCommission : undefined}
                aria-controls={
                  shortage && showCommission ? commissionId : undefined
                }
                aria-describedby={hintId}
                onClick={() => {
                  if (!shortage) onUpgrade(selected, option);
                  else if (showCommission) closeCommission();
                  else {
                    setShowCommission(true);
                    requestAnimationFrame(() =>
                      commissionHeading.current?.focus(),
                    );
                  }
                }}
              >
                {busy ? (
                  "正在保存…"
                ) : shortage ? (
                  <>
                    查看{currency.kind}委托{" "}
                    <ArrowRight size={20} aria-hidden="true" />
                  </>
                ) : (
                  `消耗 ${option.cost} ${currency.name} · ${isCapacity ? "提升" : "升级"}`
                )}
              </button>
              <p id={shortage ? undefined : hintId} className="hc-effect">
                {effect}
              </p>
            </div>
            {error && (
              <p className="hc-feedback hc-error" role="alert">
                {error}
              </p>
            )}
            {result && (
              <p ref={feedback} className="hc-feedback hc-result" role="status">
                <Check size={20} aria-hidden="true" />
                {result}
              </p>
            )}
            {showCommission && (
              <section
                id={commissionId}
                className="hc-commission"
                aria-label={`${currency.kind}委托说明`}
              >
                <div className="hc-commission-heading">
                  <h4 ref={commissionHeading} tabIndex={-1}>
                    {currency.kind}委托 · {currency.name}
                  </h4>
                  <button
                    type="button"
                    className="rq-button"
                    aria-label="收起委托说明"
                    onClick={closeCommission}
                  >
                    <X size={18} aria-hidden="true" />
                  </button>
                </div>
                <p>
                  找到诺亚并交谈，选择{currency.kind}
                  委托；计时结束后，回到诺亚身边结算。
                </p>
                {active ? (
                  <p>
                    当前已有一项
                    {
                      { study: "学习", exercise: "运动", work: "工作" }[
                        active.kind
                      ]
                    }
                    委托进行中，请先完成结算或在成长手记中取消。
                  </p>
                ) : (
                  journal && (
                    <p>
                      {journal.remaining > 0
                        ? `今天还可领取 ${journal.remaining} 点成长额度，三类委托共用。`
                        : "今天的成长额度已用完，明天再来。"}
                    </p>
                  )
                )}
                <div className="hc-commission-actions">
                  {onLocateNoah && (
                    <button
                      type="button"
                      className="rq-button"
                      onClick={onLocateNoah}
                    >
                      <MapPin size={18} aria-hidden="true" />
                      标记诺亚的位置
                    </button>
                  )}
                  {onOpenJournal && (
                    <button
                      type="button"
                      className="rq-button"
                      onClick={onOpenJournal}
                    >
                      <BookOpen size={18} aria-hidden="true" />
                      查看成长手记
                    </button>
                  )}
                </div>
              </section>
            )}
          </section>
          <footer className="hc-footer">
            <Info size={16} aria-hidden="true" />
            <p>选择能力查看详情，确认升级后才扣点。</p>
          </footer>
        </div>
      </div>
    </div>
  );
}
