import { useId, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  FlaskConical,
  Hammer,
  Heart,
  Info,
  Bird,
  Sprout,
  WandSparkles,
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
  vitality: { name: "生命", icon: Heart },
  stamina: { name: "体力", icon: Zap },
  science: { name: "科学", icon: FlaskConical },
  magic: { name: "魔法", icon: WandSparkles },
  planting: { name: "种植", icon: Sprout },
  ranching: { name: "养殖", icon: Bird },
  building: { name: "建造", icon: Hammer },
};
const currencies = {
  health_points: { name: "健康点", use: "生命 / 体力上限", icon: Heart },
  knowledge_points: { name: "知识点", use: "科学 / 魔法", icon: BookOpen },
  skill_points: { name: "技能点", use: "种植 / 养殖 / 建造", icon: Sprout },
};
export interface CharacterViewProps {
  character: NonNullable<GameState["character"]>;
  vitality: { current: number; max: number };
  stamina: { current: number; max: number };
  balances: Record<GrowthCurrency, number>;
  options: Record<GrowthTarget, GrowthOption>;
  busy?: boolean;
  error?: string;
  result?: string;
  preview?: boolean;
  onUpgrade: (target: GrowthTarget, option: GrowthOption) => void;
  onSelectionChange?: () => void;
}

export function CharacterView({
  character,
  vitality,
  stamina,
  balances,
  options,
  busy = false,
  error,
  result,
  preview,
  onUpgrade,
  onSelectionChange,
}: CharacterViewProps) {
  const [selected, setSelected] = useState<GrowthTarget>("planting");
  const detailId = useId(),
    hintId = useId();
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const option = options[selected],
    target = targets[selected],
    Icon = target.icon;
  const isCapacity = selected === "vitality" || selected === "stamina";
  const currency = currencies[option.currency].name;
  const balance = balances[option.currency],
    shortage = Math.max(0, option.cost - balance);
  function select(key: GrowthTarget) {
    setSelected(key);
    onSelectionChange?.();
    if (window.matchMedia("(max-width: 760px)").matches) {
      requestAnimationFrame(() => detailHeading.current?.focus());
    }
  }
  function rows(keys: GrowthTarget[]) {
    return keys.map((key) => {
      const item = targets[key],
        ItemIcon = item.icon,
        quote = options[key];
      return (
        <button
          key={key}
          type="button"
          className="hc-growth-row"
          aria-label={`${item.name}，等级 ${quote.current}`}
          aria-pressed={selected === key}
          aria-controls={detailId}
          disabled={busy}
          onClick={() => select(key)}
        >
          <ItemIcon size={25} aria-hidden="true" />
          <b>{item.name}</b>
          <span className="hc-level">Lv.{quote.current}</span>
          <small>
            升级需 {quote.cost} {currencies[quote.currency].name}
          </small>
          <ChevronRight size={19} aria-hidden="true" />
        </button>
      );
    });
  }
  return (
    <div className="hc-dossier">
      <section className="hc-identity" aria-label="冒险者身份">
        <div className="hc-portrait">
          <div className="hc-portrait-picture">
            <PixelPerson variant={character.appearance} />
          </div>
        </div>
        <div className="hc-name-block">
          <span className="hc-eyebrow">冒险者档案</span>
          <h3>{character.name}</h3>
          <p>回响大陆 · {appearanceNames[character.appearance]}</p>
        </div>
        {preview && (
          <span className="hc-preview-label">方案预览 · 示例数值</span>
        )}
      </section>
      <section className="hc-vitals" aria-label="生命与体力">
        {(["vitality", "stamina"] as const).map((key) => {
          const value = key === "vitality" ? vitality : stamina,
            VitalIcon = targets[key].icon;
          return (
            <div className="hc-vital" key={key} data-resource={key}>
              <VitalIcon size={28} aria-hidden="true" />
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
                提升上限
              </button>
            </div>
          );
        })}
      </section>
      <div className="hc-body">
        <div className="hc-paths">
          <section aria-label="知识研修">
            <div className="hc-section-title">
              <h3>知识研修</h3>
              <span>消耗知识点</span>
            </div>
            <div className="hc-rows">{rows(["science", "magic"])}</div>
          </section>
          <section aria-label="生活技能">
            <div className="hc-section-title">
              <h3>生活技能</h3>
              <span>消耗技能点</span>
            </div>
            <div className="hc-rows">
              {rows(["planting", "ranching", "building"])}
            </div>
          </section>
        </div>
        <section className="hc-wallet" aria-label="可用成长点">
          <div className="hc-section-title">
            <h3>可用成长点</h3>
            <span>尚未分配</span>
          </div>
          <dl>
            {(Object.keys(currencies) as GrowthCurrency[]).map((key) => {
              const entry = currencies[key],
                CurrencyIcon = entry.icon;
              return (
                <div key={key}>
                  <CurrencyIcon size={25} aria-hidden="true" />
                  <dt>
                    <b>{entry.name}</b>
                    <small>{entry.use}</small>
                  </dt>
                  <dd aria-label={`可用${entry.name} ${balances[key]}`}>
                    {balances[key]}
                  </dd>
                </div>
              );
            })}
          </dl>
        </section>
        <section
          id={detailId}
          className="hc-upgrade"
          aria-label="升级详情"
          aria-busy={busy}
        >
          <div className="hc-upgrade-heading">
            <Icon size={32} aria-hidden="true" />
            <div>
              <span>当前选择</span>
              <h3 ref={detailHeading} tabIndex={-1}>
                {target.name}
                {isCapacity ? "上限提升" : "升级"}
              </h3>
            </div>
          </div>
          <p
            className="hc-transition"
            aria-label={`${target.name}${isCapacity ? "上限" : "等级"} ${option.current} 到 ${option.next}`}
          >
            <span>
              {isCapacity ? "" : "Lv."}
              {option.current}
            </span>
            <ArrowRight size={24} aria-hidden="true" />
            <strong>
              {isCapacity ? "" : "Lv."}
              {option.next}
            </strong>
          </p>
          <dl className="hc-accounting">
            <div>
              <dt>本次消耗</dt>
              <dd>
                {option.cost} {currency}
              </dd>
            </div>
            <div>
              <dt>{shortage ? "还需积累" : "升级后剩余"}</dt>
              <dd>
                {shortage || balance - option.cost} {currency}
              </dd>
            </div>
          </dl>
          <button
            type="button"
            className="rq-button rq-button--primary hc-invest"
            disabled={busy || shortage > 0}
            aria-describedby={hintId}
            onClick={() => onUpgrade(selected, option)}
          >
            {busy
              ? "正在保存…"
              : shortage
                ? `${currency}不足 · 还差 ${shortage} 点`
                : `消耗 ${option.cost} ${currency} · ${isCapacity ? "提升" : "升级"}`}
          </button>
          <p id={hintId} className="hc-upgrade-note">
            {shortage
              ? `完成诺亚的${option.currency === "health_points" ? "运动" : option.currency === "knowledge_points" ? "学习" : "工作"}委托，结算后获得${currency}。`
              : isCapacity
                ? `上限与当前${target.name}各增加 ${option.next - option.current} 点。`
                : selected === "science" || selected === "magic"
                  ? "升级保存研修等级；道具与法术效果尚未开放。"
                  : "升级保存技能等级；技能加成尚未开放。"}
          </p>
          {error && (
            <p className="hc-feedback hc-error" role="alert">
              {error}
            </p>
          )}
          {result && (
            <p className="hc-feedback hc-result" role="status">
              <Check size={18} aria-hidden="true" />
              {result}
            </p>
          )}
        </section>
      </div>
      <footer className="hc-footer">
        <Info size={16} aria-hidden="true" />
        <p>选择项目查看升级详情，确认后扣除对应点数。</p>
      </footer>
    </div>
  );
}
