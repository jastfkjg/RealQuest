import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import { unlockSound } from "./feel";
import { WorldScene } from "./WorldScene";
import { interactionFor } from "./interaction";
import { accessibleTarget } from "./navigation";
import { serverNow, useGame } from "../stores/game";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Hand,
} from "lucide-react";
declare global {
  interface Window {
    render_game_to_text: () => string;
    advanceTime: (ms: number) => Promise<void>;
  }
}
export function GameCanvas() {
  const container = useRef<HTMLDivElement>(null),
    scene = useRef<WorldScene | null>(null);
  const nearest = useGame((s) => s.nearest),
    panel = useGame((s) => s.panel);
  const state = useGame((s) => s.state)!,
    world = useGame((s) => s.world)!,
    navigation = useGame((s) => s.navigation);
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const region =
    state.location !== "overworld"
      ? world.interiors[state.location]
      : world.regions?.find(
          (r) =>
            state.position.x >= r.x &&
            state.position.x < r.x + r.width &&
            state.position.y >= r.y &&
            state.position.y < r.y + r.height,
        );
  const target = navigation ? accessibleTarget(navigation, world, state) : null;
  const bearing = target
    ? ["东", "东南", "南", "西南", "西", "西北", "北", "东北"][
        (Math.round(
          Math.atan2(target.y - state.position.y, target.x - state.position.x) /
            (Math.PI / 4),
        ) +
          8) %
          8
      ]
    : "";
  const interaction = nearest
    ? interactionFor(nearest, state, serverNow())
    : null;
  useEffect(() => {
    const instance = new WorldScene();
    scene.current = instance;
    const game = new Phaser.Game({
      type: Phaser.CANVAS,
      parent: container.current!,
      width: container.current!.clientWidth,
      height: container.current!.clientHeight,
      pixelArt: true,
      roundPixels: true,
      backgroundColor: "#559653",
      scene: instance,
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        fullscreenTarget: container.current!.closest(
          ".app-shell",
        ) as HTMLElement,
      },
      audio: { noAudio: true },
      banner: false,
    });
    window.render_game_to_text = () => {
      const s = useGame.getState();
      return JSON.stringify({
        coordinate_system:
          "origin top-left; x right, y down; outdoor world 1920×1280",
        location: s.state?.location,
        direction: instance.direction,
        frame: instance.player?.frame.name,
        appearance: s.state?.character?.appearance,
        playerTexture: instance.player?.texture.key,
        npcs: instance.npcs.map((n) => ({
          id: n.obj.id,
          x: n.sprite.x,
          y: n.sprite.y,
          direction: n.direction,
        })),
        walking: instance.path,
        clickTarget: instance.clickTarget?.id,
        camera: instance.cameras.main
          ? {
              x: instance.cameras.main.scrollX,
              y: instance.cameras.main.scrollY,
              zoom: instance.cameras.main.zoom,
              viewX: instance.cameras.main.worldView.x,
              viewY: instance.cameras.main.worldView.y,
              width: instance.cameras.main.worldView.width,
              height: instance.cameras.main.worldView.height,
              playerPixels: 32 * instance.cameras.main.zoom,
            }
          : null,
        quests: s.state?.quest_log,
        storage: s.state?.storage,
        mode: s.panel || "explore",
        player: instance.player
          ? {
              x: Math.round(instance.player.x),
              y: Math.round(instance.player.y),
            }
          : s.state?.position,
        nearest: s.nearest,
        interaction:
          s.nearest && s.state
            ? interactionFor(s.nearest, s.state, serverNow())
            : null,
        inputEnabled: instance.input.keyboard?.enabled,
        keyboardListeners: instance.input.keyboard?.listenerCount("keydown-E"),
        canvasCount: document.querySelectorAll("canvas").length,
        inventory: s.state?.inventory,
        selectedItem: s.inventoryItem,
        quickItems: s.quickItems,
        navigation: s.navigation,
        xp: s.state?.xp,
        pendingFeedbackXp: Math.max(0, (s.state?.xp || 0) - instance.lastXp),
        attributes: s.state?.attributes,
        plots: s.state?.plots,
        buildings: s.state?.buildings,
        events: s.state?.events,
        timer: s.state?.timer,
        studyTasks: s.state?.study_task_log,
        obstacles: instance.map?.obstacles,
        objects: instance.map?.objects,
        notice: s.notice,
        error: s.error,
      });
    };
    window.advanceTime = async (ms: number) => {
      for (let i = 0; i < Math.ceil(ms / (1000 / 60)); i++)
        instance.step(1000 / 60);
      instance.cameras.main.preRender();
      game.scene.render(game.renderer);
    };
    const observer = new ResizeObserver(() => {
      if (
        container.current &&
        container.current.clientWidth &&
        container.current.clientHeight
      ) {
        game.scale.resize(
          container.current.clientWidth,
          container.current.clientHeight,
        );
        if (instance.sys.isActive()) instance.fitCamera();
      }
    });
    observer.observe(container.current!);
    return () => {
      observer.disconnect();
      game.destroy(true);
      scene.current = null;
      delete (window as Partial<Window>).render_game_to_text;
      delete (window as Partial<Window>).advanceTime;
    };
  }, []);
  const control = (x: number, y: number) => ({
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      unlockSound();
      event.currentTarget.setPointerCapture(event.pointerId);
      if (scene.current && !useGame.getState().panel)
        scene.current.touch = { x, y };
    },
    onPointerUp: () => {
      if (scene.current) scene.current.touch = { x: 0, y: 0 };
    },
    onPointerCancel: () => {
      if (scene.current) scene.current.touch = { x: 0, y: 0 };
    },
    onLostPointerCapture: () => {
      if (scene.current) scene.current.touch = { x: 0, y: 0 };
    },
  });
  return (
    <div className="world-wrap">
      <div
        ref={container}
        className="game-canvas"
        aria-label="回响大陆游戏地图，使用方向键移动，E 键交互"
        tabIndex={0}
      />
      <div className="region-stamp">
        <span className="live-dot" />
        <div>
          <b>{region?.name || "回响大陆"}</b>
          <small>
            {state.location === "overworld"
              ? "REALQUEST · 回响大陆"
              : "室内 · 门口按 E 返回户外"}
          </small>
        </div>
      </div>
      {target && (
        <button
          className="navigation-hint"
          onClick={() => useGame.getState().open("map")}
        >
          <span>目的地</span>
          {target.name}
          <small>
            向{bearing} ·{" "}
            {Math.round(
              Math.hypot(
                target.x - state.position.x,
                target.y - state.position.y,
              ) / 16,
            )}{" "}
            步
          </small>
        </button>
      )}
      {!panel && (
        <>
          <div className="dpad" aria-label="触控移动">
            <button aria-label="向上移动" className="up" {...control(0, -1)}>
              <ChevronUp />
            </button>
            <button aria-label="向左移动" {...control(-1, 0)}>
              <ChevronLeft />
            </button>
            <button aria-label="向下移动" {...control(0, 1)}>
              <ChevronDown />
            </button>
            <button aria-label="向右移动" {...control(1, 0)}>
              <ChevronRight />
            </button>
          </div>
          {nearest && (
            <button
              className="interact"
              disabled={!!interaction?.reason || useGame.getState().busy}
              onClick={() => void scene.current?.interact()}
            >
              <Hand size={17} />
              <span>
                <small>{nearest?.name || "探索回响大陆"}</small>
                <b>{interaction?.reason || interaction?.label}</b>
              </span>
              {!interaction?.reason && <kbd>E</kbd>}
            </button>
          )}
        </>
      )}
    </div>
  );
}
