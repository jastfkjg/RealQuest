import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
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
        d="M80 344H1776 M216 344V904H832V1008H1104 M1088 344V1008 M1088 736H1552V1104H1408 M960 344V720H832V688"
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
  const building = ["home", "workshop", "library", "guild", "shop"].includes(
    o.id,
  );
  if (building)
    return (
      <img
        src={
          o.id === "shop"
            ? "/assets/hearthwood/market/shop.png"
            : `/assets/hearthwood/village/${o.id}.png`
        }
        alt=""
        draggable={false}
      />
    );
  if (o.kind === "npc") return <PixelPerson variant={o.id === "lia" ? 0 : 2} />;
  if (o.kind === "board")
    return (
      <img
        src="/assets/hearthwood/village/board.png"
        alt=""
        draggable={false}
      />
    );
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
  return <Icon size={25} strokeWidth={1.8} />;
}

const placeNotes: Record<string, [string, string]> = {
  home: ["旅途从这间小屋开始。", "回到家中整理背包，照看家园。"],
  workshop: ["木料与石材在这里派上用场。", "可在工坊交易、制作或升级。"],
  library: ["在书页之间，寻找新的线索。", "可在此与莉娅交谈。"],
  guild: ["旅人来往的集会之处。", "看看公会告示，寻找下一段委托。"],
  shop: ["米拉经营的村庄杂货铺。", "买种子、出售收获，或查看邻居订单。"],
  grove: ["林木深处还有未记录的发现。", "抵达后与地标互动，记下这次探索。"],
  quarry: ["沿旧路前往山石间的采集地。", "抵达后与地标互动，记下这次探索。"],
  lake: ["水边的风景等待旅人发现。", "抵达后与地标互动，记下这次探索。"],
  board: ["村庄的消息都留在这里。", "靠近告示板，查看可接取的委托。"],
  lia: ["莉娅常在图书馆附近。", "靠近她，继续旅途中的交谈。"],
  noah: ["诺亚在村庄等着与你交谈。", "靠近他，了解新的委托。"],
  ruins: ["古老的符文静静留在林间。", "解读条件取决于当前的学识。"],
};

function AdventureAtlas() {
  const { world, state, navigation, navigate } = useGame();
  const [selectedId, select] = useState(
    navigation
      ? navigation.mapId === "overworld"
        ? navigation.targetId
        : navigation.mapId
      : "library",
  );
  const viewport = useRef<HTMLDivElement>(null);
  const placeIndex = useRef<HTMLDetailsElement>(null);
  const markerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const dragging = useRef<{
    x: number;
    y: number;
    left: number;
    top: number;
  } | null>(null);
  const [zoom, setZoom] = useState(1);
  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => {
      const el = viewport.current;
      const place = world?.objects.find((o) => o.id === selectedId);
      if (el && place && world && el.scrollWidth > el.clientWidth)
        el.scrollTo({
          left: (place.x / world.width) * el.scrollWidth - el.clientWidth / 2,
          top: (place.y / world.height) * el.scrollHeight - el.clientHeight / 2,
        });
    });
    return () => cancelAnimationFrame(frame);
    // Initial centering only; selecting a visible marker leaves the map still.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world]);
  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.deltaY) return;
      event.preventDefault();
      const next = event.deltaY < 0 ? 1.5 : 1;
      if (next === zoom) return;
      const centerX = (el.scrollLeft + el.clientWidth / 2) / el.scrollWidth;
      const centerY = (el.scrollTop + el.clientHeight / 2) / el.scrollHeight;
      setZoom(next);
      requestAnimationFrame(() =>
        el.scrollTo({
          left: centerX * el.scrollWidth - el.clientWidth / 2,
          top: centerY * el.scrollHeight - el.clientHeight / 2,
        }),
      );
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [world, zoom]);
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
  const selected =
    landmarks.find((o) => o.id === selectedId) ||
    landmarks.find((o) => o.id === "library");
  const discovered = (id: string) => state.events.includes(`discovered_${id}`);
  const status = (o: WorldObject) =>
    o.id === "ruins"
      ? state.events.includes("rune_awakened")
        ? "已解读"
        : state.attributes.wisdom < 25
          ? "解读条件尚未满足"
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
    if (fromIndex) {
      if (placeIndex.current) placeIndex.current.open = false;
      const place = landmarks.find((o) => o.id === id);
      const el = viewport.current;
      if (place && el)
        el.scrollTo({
          left: (place.x / world.width) * el.scrollWidth - el.clientWidth / 2,
          top: (place.y / world.height) * el.scrollHeight - el.clientHeight / 2,
          behavior: "smooth",
        });
      markerRefs.current[id]?.focus({ preventScroll: true });
    }
  };
  const setMapZoom = (next: number) => {
    const el = viewport.current;
    const centerX = el
      ? (el.scrollLeft + el.clientWidth / 2) / el.scrollWidth
      : 0.5;
    const centerY = el
      ? (el.scrollTop + el.clientHeight / 2) / el.scrollHeight
      : 0.5;
    setZoom(next);
    requestAnimationFrame(() => {
      if (el)
        el.scrollTo({
          left: centerX * el.scrollWidth - el.clientWidth / 2,
          top: centerY * el.scrollHeight - el.clientHeight / 2,
        });
    });
  };
  const recenter = () => {
    const el = viewport.current;
    if (el)
      el.scrollTo({
        left: (pos.x / world.width) * el.scrollWidth - el.clientWidth / 2,
        top: (pos.y / world.height) * el.scrollHeight - el.clientHeight / 2,
        behavior: "smooth",
      });
  };
  const offset: Record<string, [number, number]> = {
    board: [-12, 19],
    home: [-14, -12],
    noah: [12, 28],
    lia: [-14, 10],
    library: [14, -12],
    ruins: [42, -16],
    shop: [6, 10],
  };
  const notes = selected && placeNotes[selected.id];
  const runeRead = state.events.includes("rune_awakened");
  const runeReady = state.attributes.wisdom >= 25;
  const heroImage =
    selected &&
    ["home", "workshop", "library", "guild", "shop"].includes(selected.id)
      ? selected.id === "shop"
        ? "/assets/hearthwood/market/shop.png"
        : `/assets/hearthwood/village/${selected.id}.png`
      : null;
  return (
    <div className="ha-atlas">
      <div className="ha-map-stage">
        <div className="ha-map-tools">
          <details className="ha-place-index" ref={placeIndex}>
            <summary>
              地点索引 <span>⌄</span>
            </summary>
            <nav aria-label="地图目的地">
              {landmarks.map((o) => (
                <button
                  key={o.id}
                  aria-pressed={selected?.id === o.id}
                  onClick={() => choose(o.id, true)}
                >
                  <span>{o.name}</span>
                  <small>{status(o)}</small>
                </button>
              ))}
            </nav>
          </details>
          <div className="ha-map-tool-buttons">
            <button
              aria-label="缩小地图"
              disabled={zoom <= 1}
              onClick={() => setMapZoom(1)}
            >
              −
            </button>
            <button
              aria-label="放大地图"
              disabled={zoom >= 1.5}
              onClick={() => setMapZoom(1.5)}
            >
              +
            </button>
            <button onClick={recenter} aria-label="定位自己">
              <Crosshair size={18} />
            </button>
          </div>
        </div>
        <div
          className="ha-map-viewport"
          ref={viewport}
          tabIndex={0}
          aria-label="可拖动、滚动的冒险地图；点选地标查看详情"
          onPointerDown={(event) => {
            if (
              event.pointerType !== "mouse" ||
              event.button !== 0 ||
              (event.target as HTMLElement).closest("button, summary, nav")
            )
              return;
            dragging.current = {
              x: event.clientX,
              y: event.clientY,
              left: event.currentTarget.scrollLeft,
              top: event.currentTarget.scrollTop,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            const drag = dragging.current;
            if (drag)
              event.currentTarget.scrollTo({
                left: drag.left - (event.clientX - drag.x),
                top: drag.top - (event.clientY - drag.y),
              });
          }}
          onPointerUp={() => {
            dragging.current = null;
          }}
          onPointerCancel={() => {
            dragging.current = null;
          }}
        >
          <div
            className="ha-map-world"
            style={
              { width: `${zoom * 100}%`, "--ha-zoom": zoom } as CSSProperties
            }
          >
            <img
              className="ha-terrain"
              src="/assets/hearthwood/world-map-terrain-v1.png"
              alt=""
              draggable={false}
            />
            <svg
              viewBox={`0 0 ${world.width} ${world.height}`}
              aria-hidden="true"
              className="ha-discovery-overlay"
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
                    stroke="#f4efde"
                    strokeOpacity=".24"
                    strokeWidth="2"
                  />
                </pattern>
              </defs>
              {world.regions
                ?.filter(
                  (r) =>
                    ["grove", "quarry", "lake"].includes(r.id) &&
                    !discovered(r.id),
                )
                .map((r) => (
                  <g key={r.id}>
                    <rect
                      x={r.x}
                      y={r.y}
                      width={r.width}
                      height={r.height}
                      fill="#dee3cf"
                      opacity=".20"
                    />
                    <rect
                      x={r.x}
                      y={r.y}
                      width={r.width}
                      height={r.height}
                      fill="url(#ha-unknown)"
                    />
                  </g>
                ))}
            </svg>
            {[320, 872].map((y) => (
              <img
                key={y}
                className="ha-map-bridge"
                src="/assets/hearthwood/village/bridge.png"
                alt=""
                draggable={false}
                style={{
                  left: `${(480 / world.width) * 100}%`,
                  top: `${(y / world.height) * 100}%`,
                }}
              />
            ))}
            {world.regions?.map((r) => (
              <div
                className="ha-region"
                key={r.id}
                style={{
                  left: `${((r.x + r.width / 2) / world.width) * 100}%`,
                  top: `${((r.y + (r.id === "grove" ? 150 : 16)) / world.height) * 100}%`,
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
                    data-selected={selected?.id === o.id}
                    data-unknown={unknown}
                    data-quest={targetId === o.id}
                    aria-pressed={selected?.id === o.id}
                    aria-label={`选择${o.name}，${status(o)}${targetId === o.id ? "，追踪任务目标" : ""}`}
                    style={{
                      transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`,
                    }}
                    onClick={() => choose(o.id)}
                  >
                    <LandmarkArt object={o} />
                    <span className="ha-landmark-name">{o.name}</span>
                    {selected?.id === o.id && (
                      <span
                        className="ha-marker-selection"
                        aria-hidden="true"
                      />
                    )}
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
            所选地点
          </span>
          <span>
            <Flag size={14} />
            追踪目标
          </span>
          <span>
            <span className="ha-unknown-symbol">?</span>
            未探索
          </span>
          <span className="ha-pan-hint">
            拖动查看 · 滚轮缩放 · 点击地标查看 · Esc 关闭
          </span>
        </div>
      </div>
      <section
        className="ha-destination"
        aria-label="所选目的地"
        aria-live="polite"
      >
        <div className="ha-destination-hero" aria-hidden="true">
          {heroImage ? (
            <img src={heroImage} alt="" />
          ) : (
            selected && <LandmarkArt object={selected} />
          )}
        </div>
        <div className="ha-destination-copy">
          <small>
            目的地 · {selected?.kind === "landmark" ? "回响大陆" : "回响村庄"}
          </small>
          <h3>{selected?.name || "选择地图上的一处地标"}</h3>
          <p>{notes?.[0] || "在地图上选择一处地标。"}</p>
          <p>{notes?.[1] || "标记方向后返回世界，沿着指引前往。"}</p>
          {selected && (
            <div className="ha-place-feature">
              {selected.id === "library" ? (
                <BookOpen size={20} />
              ) : (
                <MapPin size={20} />
              )}
              <span>
                {selected.id === "library" ? "图书与交谈" : status(selected)}
              </span>
            </div>
          )}
          {selected?.id === "library" && (
            <button className="ha-rune-link" onClick={() => choose("ruins")}>
              <LockKeyhole size={20} aria-hidden="true" />
              <span>
                <strong>沉睡的符文</strong>
                <small>
                  {runeRead
                    ? "已解读"
                    : runeReady
                      ? "可以解读"
                      : "解读条件尚未满足"}
                </small>
              </span>
              <span aria-hidden="true">›</span>
            </button>
          )}
        </div>
        <div className="ha-next-step">
          <strong>
            <Compass size={20} /> 下一步
          </strong>
          <p>返回世界，沿方向指引步行前往。</p>
          <button
            className="primary"
            disabled={!selected}
            onClick={() =>
              selected &&
              navigate({ mapId: "overworld", targetId: selected.id })
            }
          >
            <Navigation size={18} /> 标记方向并返回
          </button>
        </div>
      </section>
    </div>
  );
}
export function Atlas({ mini = false }: { mini?: boolean }) {
  return mini ? <MiniAtlas /> : <AdventureAtlas />;
}
