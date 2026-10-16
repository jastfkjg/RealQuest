import {
  Compass,
  MapPin,
  Navigation,
  Mountain,
  Waves,
  BedDouble,
  Home,
} from "lucide-react";
import { useState } from "react";
import { currentMap, accessibleTarget, questTarget } from "../game/navigation";
import { useGame } from "../stores/game";
import { NpcPerson } from "./NpcPerson";
const PLACES = [
  {
    id: "overworld",
    name: "回响村庄",
    sub: "林间家园",
    icon: Home,
    target: "village_departure",
  },
  {
    id: "cave_1",
    name: "石根山洞",
    sub: "五层 · 平台 / 守卫",
    icon: Mountain,
    target: "cave_exit",
  },
  {
    id: "crossing",
    name: "苇风渡口",
    sub: "修桥 / 乘船",
    icon: Waves,
    target: "adu",
  },
  {
    id: "mountain",
    name: "苍脊山道",
    sub: "绳索 / 当前体力",
    icon: Mountain,
    target: "mountain_pass",
  },
  {
    id: "city",
    name: "苔桥城",
    sub: "南门街 · 灯穗旅店",
    icon: BedDouble,
    target: "to_inn",
  },
];
export function JourneyAtlas({ mini = false }: { mini?: boolean }) {
  const { state, world, open, navigate, navigation } = useGame();
  const [selected, setSelected] = useState("");
  if (!state || !world) return null;
  const map = currentMap(world, state),
    outside = !!world.areas?.[state.location] || state.location === "inn";
  const places = PLACES.map((p) => ({
    ...p,
    here:
      p.id ===
      (state.location.startsWith("cave_")
        ? "cave_1"
        : state.location === "inn"
          ? "city"
          : outside
            ? state.location
            : "overworld"),
  }));
  const targets = map.objects.filter((o) =>
    ["passage", "travel", "travel_npc", "rest", "cave"].includes(o.kind),
  );
  const chosen = targets.find((o) => o.id === selected) || targets[0];
  const quest = state.quest_log.find((q) => q.id === state.tracked_quest),
    next = quest ? questTarget(quest, state) : null;
  const bearing = next ? accessibleTarget(next, world, state) : null;
  const localDrawing = (
    <svg
      viewBox={`0 0 ${map.width} ${map.height}`}
      role="img"
      aria-label={`${map.name}路线示意`}
    >
      <rect width={map.width} height={map.height} fill="#b8bf94" />
      {map.obstacles.map(([x, y, w, h], i) => (
        <rect
          key={i}
          x={x}
          y={y}
          width={w}
          height={h}
          fill={map.id === "crossing" && w === 144 ? "#75a3a0" : "#7b8c6c"}
        />
      ))}
      {targets.map((o) => (
        <g key={o.id}>
          <circle
            cx={o.x}
            cy={o.y}
            r={mini ? 12 : 9}
            fill={o.id === navigation?.targetId ? "#d3a450" : "#3f6348"}
          />
          {!mini && (
            <text
              x={o.x}
              y={o.y + 24}
              textAnchor="middle"
              fill="#27392f"
              fontSize="15"
            >
              {o.name.split(" · ")[0]}
            </text>
          )}
        </g>
      ))}
      <circle
        cx={state.position.x}
        cy={state.position.y}
        r={mini ? 15 : 11}
        fill="#fffbf0"
        stroke="#27392f"
        strokeWidth="4"
      />
    </svg>
  );
  if (mini)
    return (
      <button
        className="journey-mini"
        aria-label="打开远行地图"
        onClick={() => open("map")}
      >
        {localDrawing}
        <span>{map.name}</span>
      </button>
    );
  return (
    <section className="journey-atlas" aria-label="离村远行地图">
      <header>
        <Compass size={24} />
        <div>
          <h3>山水间的路</h3>
          <p>地图标记方向，走到关口后再决定通行方式。</p>
        </div>
      </header>
      <ol className="journey-route">
        {places.map((p) => (
          <li key={p.id} data-here={p.here}>
            <button
              onClick={() => navigate({ mapId: p.id, targetId: p.target })}
            >
              <p.icon size={26} />
              <strong>{p.name}</strong>
              <small>{p.here ? "你在这里" : p.sub}</small>
            </button>
          </li>
        ))}
      </ol>
      {outside && (
        <div className="journey-local">
          <div className="journey-sketch">{localDrawing}</div>
          <div className="journey-pois">
            <h4>
              <MapPin size={17} />
              {map.name}
            </h4>
            {targets.map((o) => (
              <button
                key={o.id}
                aria-pressed={o.id === chosen?.id}
                onClick={() => setSelected(o.id)}
              >
                {o.kind === "travel_npc" && <NpcPerson id={o.id} />}
                <span>{o.name}</span>
              </button>
            ))}
            {chosen && (
              <button
                className="primary"
                onClick={() =>
                  navigate({ mapId: state.location, targetId: chosen.id })
                }
              >
                <Navigation size={16} /> 标记方向并返回
              </button>
            )}
          </div>
        </div>
      )}
      {bearing && (
        <p className="travel-hint">
          当前追踪：{quest?.title} · 下一处关口：{bearing.name}
          <button onClick={() => next && navigate(next)}>标记下一步</button>
        </p>
      )}
      <p className="travel-footer">
        修复旧桥后双向免费；船票按单程购买。返乡后，家园与旧村庄进度照常保留。
      </p>
    </section>
  );
}
