import { useId, useState } from "react";
import {
  ArrowRight,
  Check,
  Compass,
  Hammer,
  LockKeyhole,
  Map,
  MapPin,
  Sprout,
} from "lucide-react";
import type { Attribute, GameState, NavigationTarget } from "../types";
import {
  appearanceNames,
  attributeNames,
  growth,
} from "../game/characterGrowth";
import { PixelPerson } from "./PixelPerson";

export interface CharacterViewProps {
  character: NonNullable<GameState["character"]>;
  xp: number;
  attributes: GameState["attributes"];
  events: string[];
  onRecord: (attribute: Attribute) => void;
  onNavigate: (destination: NavigationTarget) => void;
  onMap: () => void;
}

function Progress({
  value,
  max,
  label,
}: {
  value: number;
  max: number;
  label: string;
}) {
  return (
    <div
      className="hc-meter"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(max, value)}
      aria-valuetext={`${value} / ${max} EXP`}
    >
      <i style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
    </div>
  );
}

export function CharacterView({
  character,
  xp,
  attributes,
  events,
  onRecord,
  onNavigate,
  onMap,
}: CharacterViewProps) {
  const [attribute, setAttribute] = useState<Attribute>("wisdom");
  const skillId = useId();
  const data = growth[attribute],
    value = attributes[attribute];
  const unlocked = value >= data.threshold;
  const studied = attribute === "wisdom" && events.includes("rune_awakened");
  const Icon = data.icon;
  return (
    <div className="hc-dossier">
      <section className="hc-identity" aria-label="冒险者身份">
        <div className="hc-portrait">
          <div className="hc-portrait-picture">
            <PixelPerson variant={character.appearance} />
          </div>
          <span>
            <Compass size={14} aria-hidden="true" />
            回响大陆
          </span>
        </div>
        <div className="hc-name-block">
          <span className="hc-eyebrow">冒险者档案</span>
          <h3>{character.name}</h3>
          <p className="hc-title">
            {xp >= 100 ? "逐光的旅人" : "初生的唤醒者"}
          </p>
          <p className="hc-outfit">
            <Check size={14} aria-hidden="true" />
            {appearanceNames[character.appearance]}
            <small>当前穿着 · 无属性加成</small>
          </p>
        </div>
        <div
          className="hc-rank"
          aria-label={`冒险等级 ${1 + Math.floor(xp / 100)}`}
        >
          <span>冒险等级</span>
          <b>
            <small>Lv.</small>
            {1 + Math.floor(xp / 100)}
          </b>
          <Sprout size={18} aria-hidden="true" />
        </div>
        <div className="hc-experience">
          <div>
            <span>旅程经验</span>
            <b>
              {xp % 100} / 100 <small>EXP</small>
            </b>
          </div>
          <Progress label="旅程经验" value={xp % 100} max={100} />
          <small>
            累计 {xp} EXP · 距下一等级还需 {100 - (xp % 100)} EXP
          </small>
        </div>
      </section>
      <section className="hc-growth" aria-label="成长档案">
        <div className="hc-section-title">
          <h3>成长印记</h3>
          <span>选择属性，查看能力</span>
        </div>
        <div className="hc-attributes" role="group" aria-label="选择成长属性">
          {(Object.keys(growth) as Attribute[]).map((key) => {
            const AttributeIcon = growth[key].icon,
              amount = attributes[key];
            return (
              <button
                key={key}
                className="hc-attribute"
                aria-label={`${attributeNames[key]}，等级 ${1 + Math.floor(amount / 50)}，累计 ${amount} EXP`}
                aria-pressed={attribute === key}
                aria-controls={skillId}
                onClick={() => setAttribute(key)}
              >
                <AttributeIcon size={20} aria-hidden="true" />
                <b>{attributeNames[key]}</b>
                <span>Lv.{1 + Math.floor(amount / 50)}</span>
                <small>{amount % 50} / 50 EXP</small>
                <i className="hc-attribute-line" aria-hidden="true">
                  <i style={{ width: `${(amount % 50) * 2}%` }} />
                </i>
              </button>
            );
          })}
        </div>
        <section
          id={skillId}
          className="hc-skill"
          aria-label="所选属性能力"
          aria-live="polite"
        >
          <div className="hc-skill-topline">
            <span>
              {attributeNames[attribute]} Lv.{1 + Math.floor(value / 50)}{" "}
              <ArrowRight size={14} aria-hidden="true" /> Lv.
              {2 + Math.floor(value / 50)}
            </span>
            <span>
              {value % 50} / 50 EXP · 还差 {50 - (value % 50)}
            </span>
          </div>
          <div className="hc-skill-heading">
            <div className="hc-emblem" data-unlocked={unlocked}>
              <Icon size={28} aria-hidden="true" />
            </div>
            <div>
              <span className="hc-skill-state">
                {unlocked ? <Check size={14} /> : <LockKeyhole size={14} />}
                {unlocked
                  ? `${data.type} · 已掌握`
                  : `下一项能力 · 累计 ${data.threshold} EXP 解锁`}
              </span>
              <h4>{data.skill}</h4>
            </div>
          </div>
          <p className="hc-effect">{data.effect}</p>
          {!unlocked ? (
            <div className="hc-unlock">
              <Progress
                label={`${data.skill}解锁进度`}
                value={value}
                max={data.threshold}
              />
              <p>
                再获得 <b>{data.threshold - value} EXP</b> 即可解锁，可通过
                {data.activity}获得。
              </p>
            </div>
          ) : (
            <p className="hc-earned">
              <Check size={16} aria-hidden="true" />
              {studied
                ? "已完成这处遗迹的解读"
                : data.threshold
                  ? "能力已生效，可以在世界中使用"
                  : "启程时掌握的能力"}
            </p>
          )}
          <div className="hc-skill-actions">
            <button
              className="rq-button rq-button--primary"
              onClick={
                unlocked
                  ? () => onNavigate(data.destination)
                  : () => onRecord(attribute)
              }
            >
              {unlocked
                ? studied
                  ? "标记遗迹，重访旧地"
                  : data.action
                : `记录${data.activity}，积累经验`}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
            {unlocked && data.kind && (
              <button className="rq-button" onClick={() => onRecord(attribute)}>
                继续成长
              </button>
            )}
          </div>
          {unlocked && (
            <p className="hc-note">
              标记只指引方向。下一属性等级记录积累，当前能力效果保持不变。
            </p>
          )}
        </section>
      </section>
      <footer className="hc-footer">
        <div className="hc-tools">
          <button
            onClick={() =>
              onNavigate({ mapId: "overworld", targetId: "wood_1" })
            }
          >
            <Hammer size={17} aria-hidden="true" />
            标记徒手采集点
            <MapPin size={14} aria-hidden="true" />
          </button>
          <button onClick={onMap}>
            <Map size={17} aria-hidden="true" />
            随身地图
            <ArrowRight size={14} aria-hidden="true" />
          </button>
        </div>
        <p>这是旅途的成长记录，不是对现实能力的评分。</p>
      </footer>
    </div>
  );
}
