import { Compass, MapPin } from "lucide-react";
import { useGame } from "../stores/game";
export function Atlas({ mini = false }: { mini?: boolean }) {
  const { world, state, open, navigate, navigation } = useGame();
  if (!world || !state) return null;
  const pos =
    state.location === "overworld"
      ? state.position
      : world.objects.find((o) => o.id === state.location)!;
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
  const drawing = (
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
            onClick={
              !mini
                ? () => navigate({ mapId: "overworld", targetId: o.id })
                : undefined
            }
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
  return mini ? (
    <button
      className="minimap"
      onClick={() => open("map")}
      aria-label="打开大陆地图"
    >
      <div className="minimap-title">
        <Compass size={14} />
        回响大陆 <kbd>M</kbd>
      </div>
      {drawing}
      <span>查看全域地图</span>
    </button>
  ) : (
    <div className="atlas">
      <p>
        地图会随行走展开。选择目的地设置方向指引，点击游戏地面可以自动寻路。
      </p>
      <div className="atlas-sheet">{drawing}</div>
      <div className="atlas-legend">
        <span>
          <i />
          你的位置
        </span>
        <span>5 个区域 · 4 处室内</span>
      </div>
      <div className="atlas-places">
        {landmarks.map((o) => (
          <button
            key={o.id}
            onClick={() => navigate({ mapId: "overworld", targetId: o.id })}
          >
            <MapPin size={14} />
            {o.name}
          </button>
        ))}
      </div>
    </div>
  );
}
