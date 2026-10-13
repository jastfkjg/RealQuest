import { useEffect, useRef, useState } from "react";
import {
  Compass,
  MapPin,
  Flag,
  LockKeyhole,
  Trees,
  Mountain,
  Waves,
  Hammer,
  BookOpen,
  Signpost,
  Navigation,
  Crosshair,
} from "lucide-react";
import { useGame } from "../stores/game";
import { questTarget } from "../game/navigation";
import { PixelPerson } from "./PixelPerson";
import type { WorldObject } from "../types";

function MiniAtlas() {
  const { world, state, open, navigation } = useGame();
  if (!world || !state) return null;
  const mini = true;
  const pos =
    state.location === "overworld"
      ? state.position
      : world.objects.find((o) => o.id === state.location) || state.position;
  const landmarks = world.objects.filter((o) =>
    ["building", "npc", "board", "landmark", "event"].includes(o.kind),
  );
  const selected = navigation
    ? world.objects.find(
        (o) =>
          o.id ===
          (navigation.mapId === "overworld"
            ? navigation.targetId
            : navigation.mapId),
      )
    : null;
  const miniDrawing = (
    <svg
      viewBox="0 0 1920 1280"
      role="img"
      aria-label="回响大陆全域地图，家园、村庄、微光林地、采石场和湖畔"
    >
      <rect width="1920" height="1280" fill="#a3ad6f" />
      <rect x="1232" width="688" height="760" fill="#6e9256" />
      <rect y="760" width="432" height="520" fill="#c0ad7b" />
      <rect x="448" width="64" height="1280" fill="#659da4" />
      <path
        d="M80 344H1776 M216 344V904H832V1008H1104 M1088 344V1008 M1088 736H1552V1104H1408"
        stroke="#e3c895"
        strokeWidth="32"
        fill="none"
      />
      <path d="M448 344H512 M448 904H512" stroke="#9d7952" strokeWidth="54" />
      <rect x="1184" y="864" width="224" height="176" rx="32" fill="#71a8ac" />
      {world.trees.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="22" fill="#557e47" opacity=".6" />
      ))}
      {landmarks
        .filter((o) => o.kind === "building")
        .map((o) => (
          <g
            key={o.id}
            onClick={!mini ? () => open("map") : undefined}
            className={!mini ? "atlas-target" : ""}
          >
            <rect
              x={o.x - 38}
              y={o.y - 60}
              width="76"
              height="56"
              fill="#b67b51"
              stroke="#705439"
              strokeWidth="7"
            />
            <title>{o.name}</title>
          </g>
        ))}
      {!mini &&
        world.regions?.map((r) => (
          <text
            key={r.id}
            x={r.x + r.width / 2}
            y={r.y + (r.id === "lake" ? 100 : r.id === "quarry" ? 80 : 75)}
            fontSize="36"
            fill="#4e5638"
            textAnchor="middle"
            fontFamily="serif"
          >
            {r.name}
          </text>
        ))}
      {selected && (
        <circle
          cx={selected.x}
          cy={selected.y}
          r="35"
          fill="none"
          stroke="#fbefd0"
          strokeWidth="10"
        />
      )}
      <circle
        cx={pos.x}
        cy={pos.y}
        r={mini ? 25 : 18}
        fill="#fff3c5"
        stroke="#7a4835"
        strokeWidth="9"
      />
    </svg>
  );
  return (
    <button
      className="minimap"
      onClick={() => open("map")}
      aria-label="打开大陆地图"
    >
      <div className="minimap-title">
        <Compass size={14} />
        回响大陆 <kbd>M</kbd>
      </div>
      {miniDrawing}
      <span>查看全域地图</span>
    </button>
  );
}

function LandmarkArt({ object: o }: { object: WorldObject }) {
  if (o.id === "home" || o.id === "library")
    return (
      <img
        src={`/assets/ninja-adventure/house-${o.id}.png`}
        alt=""
        width={80}
        height={80}
      />
    );
  if (o.kind === "npc") return <PixelPerson variant={o.id === "lia" ? 0 : 2} />;
  const Icon =
    o.id === "grove"
      ? Trees
      : o.id === "lake"
        ? Waves
        : o.id === "quarry"
          ? Mountain
          : o.id === "workshop"
            ? Hammer
            : o.id === "guild"
              ? Flag
              : o.id === "ruins"
                ? BookOpen
                : Signpost;
  return <Icon size={32} strokeWidth={1.6} />;
}

function AdventureAtlas() {
  const { world, state, navigation, navigate } = useGame();
  const [selectedId, select] = useState(
    navigation
      ? navigation.mapId === "overworld"
        ? navigation.targetId
        : navigation.mapId
      : "",
  );
  const viewport = useRef<HTMLDivElement>(null);
  const markerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    if (viewport.current) viewport.current.scrollTo({ left: 0, top: 0 });
  }, []);
  if (!world || !state) return null;
  const pos =
    state.location === "overworld"
      ? state.position
      : world.objects.find((o) => o.id === state.location) || state.position;
  const tracked = state.quest_log.find(
    (q) =>
      q.id === state.tracked_quest && ["active", "ready"].includes(q.status),
  );
  const target = tracked ? questTarget(tracked, state) : null;
  const targetId = target
    ? target.mapId === "overworld"
      ? target.targetId
      : target.mapId
    : null;
  const landmarks = world.objects.filter(
    (o) =>
      ["building", "npc", "board", "landmark", "event"].includes(o.kind) ||
      o.id === targetId,
  );
  const selected = landmarks.find((o) => o.id === selectedId);
  const discovered = (id: string) => state.events.includes(`discovered_${id}`);
  const status = (o: WorldObject) =>
    o.id === "ruins"
      ? state.events.includes("rune_awakened")
        ? "已解读"
        : state.attributes.wisdom < 25
          ? "解读需学识 25 EXP"
          : "可以解读"
      : o.kind === "landmark"
        ? discovered(o.id)
          ? "已探索"
          : "尚未探索"
        : o.kind === "building"
          ? state.events.includes(`visited_${o.id}`)
            ? "已到访"
            : "尚未进入"
          : o.kind === "npc"
            ? "可以交谈"
            : o.kind === "board"
              ? "委托发布处"
              : "任务所需资源";
  const choose = (id: string, fromIndex = false) => {
    select(id);
    if (fromIndex)
      markerRefs.current[id]?.scrollIntoView({
        block: "nearest",
        inline: "center",
        behavior: "instant",
      });
  };
  const offset: Record<string, [number, number]> = {
    board: [0, 30],
    home: [0, -12],
    noah: [-12, 28],
    lia: [-24, -3],
    library: [20, -22],
  };
  return (
    <div className="ha-atlas">
      <div className="ha-map-tools">
        <span>
          <Compass size={16} /> 点选地标，规划下一段旅程
        </span>
        <div>
          <button
            aria-label="缩小地图"
            disabled={zoom <= 1}
            onClick={() => setZoom(1)}
          >
            −
          </button>
          <button
            aria-label="放大地图"
            disabled={zoom >= 1.5}
            onClick={() => setZoom(1.5)}
          >
            +
          </button>
          <button
            onClick={() => {
              const el = viewport.current;
              if (el)
                el.scrollTo({
                  left:
                    (pos.x / world.width) * el.scrollWidth - el.clientWidth / 2,
                  top:
                    (pos.y / world.height) * el.scrollHeight -
                    el.clientHeight / 2,
                });
            }}
            aria-label="定位自己"
          >
            <Crosshair size={18} />
          </button>
        </div>
      </div>
      <div
        className="ha-map-viewport"
        ref={viewport}
        tabIndex={0}
        aria-label="可滚动冒险地图，点选地标查看详情"
      >
        <div
          className="ha-map-world"
          style={{ width: `${zoom * 100}%`, minWidth: `${960 * zoom}px` }}
        >
          <svg
            viewBox={`0 0 ${world.width} ${world.height}`}
            aria-hidden="true"
            className="ha-terrain"
            preserveAspectRatio="none"
          >
            <defs>
              <pattern
                id="ha-unknown"
                width="28"
                height="28"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M0 28L28 0"
                  stroke="#56614f"
                  strokeOpacity=".14"
                  strokeWidth="2"
                />
              </pattern>
            </defs>
            <rect width={world.width} height={world.height} fill="#dee3cf" />
            <path
              d="M1232 0H1920V760Q1620 700 1420 760Q1240 600 1232 0"
              fill="#b2c0a0"
            />
            <path d="M0 760Q280 700 432 760V1280H0Z" fill="#d8cbae" />
            <path d="M448 0H512V1280H448Z" fill="#60989e" />
            <path
              d="M80 344H1776 M216 344V904H832V1008H1104 M1088 344V1008 M1088 736H1552V1104H1408"
              stroke="#b8a580"
              strokeWidth="30"
              fill="none"
            />
            <path
              d="M448 344H512 M448 904H512"
              stroke="#8f6e4d"
              strokeWidth="54"
            />
            <path
              d="M1232 816H1360V864H1408V1040H1360V1072H1232V1040H1184V864H1232Z"
              fill="#60989e"
            />
            {world.trees.map(([x, y], i) => (
              <g key={i} transform={`translate(${x} ${y})`}>
                <path d="M0 -26L-22 6H-12L-25 18H25L12 6H22Z" fill="#7e9470" />
                <path d="M0 4V28" stroke="#56614f" strokeWidth="4" />
              </g>
            ))}
            {world.regions
              ?.filter(
                (r) =>
                  ["grove", "quarry", "lake"].includes(r.id) &&
                  !discovered(r.id),
              )
              .map((r) => (
                <rect
                  key={r.id}
                  x={r.x}
                  y={r.y}
                  width={r.width}
                  height={r.height}
                  fill="url(#ha-unknown)"
                />
              ))}
          </svg>
          {world.regions?.map((r) => (
            <div
              className="ha-region"
              key={r.id}
              style={{
                left: `${((r.x + r.width / 2) / world.width) * 100}%`,
                top: `${((r.y + 16) / world.height) * 100}%`,
              }}
            >
              {r.name}
              {["grove", "quarry", "lake"].includes(r.id) && (
                <small>{discovered(r.id) ? "已探索" : "未探索"}</small>
              )}
            </div>
          ))}
          {landmarks.map((o) => {
            const [dx, dy] = offset[o.id] || [0, 0];
            const unknown = o.kind === "landmark" && !discovered(o.id);
            const locked =
              o.id === "ruins" &&
              state.attributes.wisdom < 25 &&
              !state.events.includes("rune_awakened");
            return (
              <div
                key={o.id}
                className="ha-landmark-anchor"
                style={{
                  left: `${(o.x / world.width) * 100}%`,
                  top: `${(o.y / world.height) * 100}%`,
                }}
              >
                {dx || dy ? (
                  <span
                    className="ha-marker-leader"
                    style={{
                      width: Math.hypot(dx, dy),
                      transform: `rotate(${(Math.atan2(dy, dx) * 180) / Math.PI}deg)`,
                    }}
                  />
                ) : null}
                <button
                  ref={(el) => {
                    markerRefs.current[o.id] = el;
                  }}
                  className={`ha-landmark ha-landmark--${o.kind}`}
                  data-selected={selectedId === o.id}
                  data-unknown={unknown}
                  data-quest={targetId === o.id}
                  aria-pressed={selectedId === o.id}
                  aria-label={`选择${o.name}，${status(o)}${targetId === o.id ? "，追踪任务目标" : ""}`}
                  style={{
                    transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`,
                  }}
                  onClick={() => choose(o.id)}
                >
                  <LandmarkArt object={o} />
                  <span className="ha-landmark-name">{o.name}</span>
                  {targetId === o.id && (
                    <span className="ha-marker-flag" aria-hidden="true">
                      <Flag size={14} />
                    </span>
                  )}
                  {locked && (
                    <span className="ha-marker-lock" aria-hidden="true">
                      <LockKeyhole size={13} />
                    </span>
                  )}
                  {unknown && (
                    <span className="ha-marker-unknown" aria-hidden="true">
                      ?
                    </span>
                  )}
                </button>
              </div>
            );
          })}
          <div
            className="ha-player"
            style={{
              left: `${(pos.x / world.width) * 100}%`,
              top: `${(pos.y / world.height) * 100}%`,
            }}
            aria-label="当前位置"
          >
            <Navigation size={16} />
            <span>
              你在这里{state.location !== "overworld" ? " · 室内" : ""}
            </span>
          </div>
          <div className="ha-north" aria-hidden="true">
            北<Compass size={36} />
          </div>
        </div>
      </div>
      <div className="ha-map-legend">
        <span>
          <Navigation size={14} />
          当前位置
        </span>
        <span>
          <span className="ha-selection-symbol" />
          所选目的地
        </span>
        <span>
          <Flag size={14} />
          追踪目标
        </span>
        <span>
          <LockKeyhole size={14} />
          解读条件
        </span>
        <span className="ha-pan-hint">滑动地图查看远方</span>
      </div>
      <section
        className="ha-destination"
        aria-label="所选目的地"
        aria-live="polite"
      >
        <div>
          <small>{selected ? status(selected) : "下一站，去哪里？"}</small>
          <h3>{selected?.name || "选择地图上的一处地标"}</h3>
          <p>
            {selected?.id === targetId
              ? tracked?.title
              : selected?.kind === "landmark" && !discovered(selected.id)
                ? "抵达后与地标互动，记下这次发现。"
                : "标记方向后返回世界，沿着指引前往。"}
          </p>
        </div>
        <button
          className="primary"
          disabled={!selected}
          onClick={() =>
            selected && navigate({ mapId: "overworld", targetId: selected.id })
          }
        >
          <MapPin size={16} />
          标记方向并返回
        </button>
      </section>
      <details className="ha-place-index">
        <summary>地点索引 · {landmarks.length} 处</summary>
        <nav aria-label="地图目的地">
          {landmarks.map((o) => (
            <button
              key={o.id}
              aria-pressed={selectedId === o.id}
              onClick={() => choose(o.id, true)}
            >
              {o.name}
            </button>
          ))}
        </nav>
      </details>
    </div>
  );
}
export function Atlas({ mini = false }: { mini?: boolean }) {
  return mini ? <MiniAtlas /> : <AdventureAtlas />;
}
