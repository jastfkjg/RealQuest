import { useEffect } from "react";
import { Panels } from "../App";
import { useGame } from "../stores/game";
import type { GameState, Panel, World } from "../types";
import fixture from "./dialog-fixture.json";

const labels: [Panel, string][] = [
  ["board", "委托板"],
  ["npc", "交谈"],
  ["map", "地图"],
  ["storage", "储物箱"],
  ["building", "修缮单"],
  ["activity", "成长记录"],
];
export default function DialogsPreview() {
  useEffect(() => {
    const state = structuredClone(fixture.state) as GameState,
      world = fixture.world as World;
    const objects = [
      ...world.objects,
      ...Object.values(world.interiors).flatMap((m) => m.objects),
    ];
    const select = (panel: Panel) =>
      objects.find(
        (o) =>
          o.id ===
          (
            {
              board: "board",
              npc: "noah",
              storage: "home_chest",
              building: "home_desk",
            } as Record<string, string>
          )[panel || ""],
      );
    useGame.setState({
      state,
      world,
      ready: true,
      dialogue:
        "沿着村道向东，微光林地里藏着新的风景。想一起探索吗？下面可以接取我的委托。资源每 30 秒恢复，别忘了带上地图。",
      command: async () => {
        useGame.setState({
          notice: "开发样例：这里只预览现有操作，不连接服务器、不保存。",
          noticePanel: useGame.getState().panel,
        });
        return false;
      },
      navigate: () => {
        useGame.setState({
          notice: "开发样例：真实游戏中会标记方向，不会传送。",
          noticePanel: "map",
        });
      },
    });
    const panel =
      labels.find(
        ([p]) => p === new URLSearchParams(location.search).get("panel"),
      )?.[0] || "board";
    useGame.getState().open(panel, select(panel));
    return () => useGame.getState().open(null);
  }, []);
  const show = (panel: Panel) => {
    const world = useGame.getState().world!;
    const ids: Record<string, string> = {
      board: "board",
      npc: "noah",
      storage: "home_chest",
      building: "home_desk",
    };
    const selected = [
      ...world.objects,
      ...Object.values(world.interiors).flatMap((m) => m.objects),
    ].find((o) => o.id === ids[panel || ""]);
    useGame.getState().open(panel, selected);
  };
  return (
    <main className="rq-theme hp-preview">
      <nav aria-label="弹窗开发预览">
        <p>
          Hearthwood · 开发样例，不连接服务器、不保存数据。关闭面板后切换预览。
        </p>
        {labels.map(([id, label]) => (
          <button key={id} className="rq-button" onClick={() => show(id)}>
            {label}
          </button>
        ))}
      </nav>
      <Panels />
    </main>
  );
}
