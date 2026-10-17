import Phaser from "phaser";
import type { WorldScene } from "./WorldScene";
import type { GameState, MapData, WorldObject } from "../types";
import { useGame } from "../stores/game";
import { worldViewOwner } from "../services/api";
import { INTERACTION_RADIUS } from "./interaction";
import { personFrame } from "./feel";

import {
  caveGround,
  caveRouteArt,
  monsterArt,
} from "../../../shared/game/caveArt";
import {
  caveSight,
  liveTarget,
  nextTarget,
  combatMarks,
  confirmedFeedback,
} from "../../../shared/game/caveView";
import { paintCanvas, paintGraphics } from "./cavePaint";
export { caveSight };

export const combatInput = {
  attack: false,
  spark: false,
  soup: false,
  pulse: false,
  target: null as string | null,
};
export function clearCombatInput() {
  combatInput.attack =
    combatInput.spark =
    combatInput.soup =
    combatInput.pulse =
      false;
}

// Shared project-authored cave marks retain the existing source/world scale.
export function caveLandscape(scene: Phaser.Scene, map: MapData) {
  const key = `stone-root-polished-${map.id}`;
  if (!scene.textures.exists(key)) {
    const canvas = document.createElement("canvas");
    canvas.width = map.width * 2;
    canvas.height = map.height * 2;
    const c = canvas.getContext("2d")!;
    c.scale(2, 2);
    c.imageSmoothingEnabled = false;
    paintCanvas(c, caveGround(map));
    scene.textures.addCanvas(key, canvas);
  }
  scene.add.image(0, 0, key).setOrigin(0).setScale(0.5).setDepth(-1000);
}
export function combatObjectArt(
  g: Phaser.GameObjects.Graphics,
  o: WorldObject,
  s: GameState,
) {
  if (o.kind === "cave" || o.id === "village_departure") {
    paintGraphics(g, caveRouteArt(o, s));
    return;
  }
  if (o.kind === "spellbook") {
    g.fillStyle(0x526e54).fillRect(o.x - 15, o.y - 18, 30, 18);
    g.fillStyle(0xf3e8c6).fillRect(o.x - 13, o.y - 16, 26, 14);
    g.lineStyle(1, 0xb3a377).lineBetween(o.x, o.y - 16, o.x, o.y - 2);
  }
}

export class CaveController {
  pending = false;
  lastRequest = 0;
  bodies = new Map<string, Phaser.GameObjects.Graphics>();
  warnings: Phaser.GameObjects.Graphics;
  feedback = new Map<string, Phaser.GameObjects.Text>();
  private poses = new Map<string, string>();
  playerMarker: Phaser.GameObjects.Graphics;
  constructor(public scene: WorldScene) {
    combatInput.target = null;
    clearCombatInput();
    this.warnings = scene.add.graphics().setDepth(-1);
    this.playerMarker = scene.add.graphics().setDepth(9001);
    scene.input.keyboard?.on("keydown-T", this.cycle, this);
  }
  pick(x: number, y: number) {
    const enemies = useGame.getState().state?.combat?.enemies || [];
    const e = enemies
      .filter((e) => e.hp > 0)
      .find(
        (e) => Math.hypot(e.x - x, e.y - y) < (e.kind === "boss" ? 40 : 26),
      );
    if (!e) return false;
    combatInput.target = e.id;
    return true;
  }
  step(delta: number, blocked: boolean) {
    const s = useGame.getState().state!,
      c = s.combat!,
      scene = this.scene;
    const p = s.position;
    const factor = Math.min(1, delta / 65);
    scene.player.x += (p.x - scene.player.x) * factor;
    scene.player.y += (p.y - scene.player.y) * factor;
    scene.synced = { ...p };
    let dx =
      Number(scene.keys.D.isDown || scene.keys.RIGHT.isDown) -
      Number(scene.keys.A.isDown || scene.keys.LEFT.isDown) +
      scene.touch.x;
    let dy =
      Number(scene.keys.S.isDown || scene.keys.DOWN.isDown) -
      Number(scene.keys.W.isDown || scene.keys.UP.isDown) +
      scene.touch.y;
    if (dx || dy) {
      scene.path = [];
      scene.clickTarget = null;
    } else if (scene.path.length) {
      while (
        scene.path.length > 1 &&
        Math.hypot(scene.path[1].x - p.x, scene.path[1].y - p.y) < 96 &&
        caveSight(scene.map, p, scene.path[1])
      )
        scene.path.shift();
      const point = scene.path[0],
        d = Math.hypot(point.x - p.x, point.y - p.y);
      if (d < 8) scene.path.shift();
      else {
        const scale = Math.min(1, d / 40);
        dx = ((point.x - p.x) / d) * scale;
        dy = ((point.y - p.y) / d) * scale;
      }
    }
    if (Math.abs(dx) > 0.2) scene.direction = dx > 0 ? 2 : 1;
    else if (Math.abs(dy) > 0.2) scene.direction = dy > 0 ? 0 : 3;
    scene.player
      .setDepth(scene.player.y + 1)
      .setFrame(
        personFrame(
          scene.direction,
          !blocked && (dx || dy) ? Math.floor(c.time * 7) % 4 : 0,
        ),
      );
    scene.shadow
      .setPosition(scene.player.x, scene.player.y - 1)
      .setDepth(scene.player.y - 1);
    const target = liveTarget(s, combatInput.target);
    combatInput.target = target?.id || null;
    if (!blocked && !this.pending && scene.elapsed - this.lastRequest >= 110) {
      this.lastRequest = scene.elapsed;
      this.pending = true;
      const length = Math.max(1, Math.hypot(dx, dy));
      const intention = {
        location: scene.map.id,
        owner: worldViewOwner,
        encounter: c.encounter,
        seq: c.input_seq + 1,
        dx: dx / length,
        dy: dy / length,
        aim_x: target?.x ?? Math.min(616, Math.max(24, p.x + 30)),
        aim_y: target?.y ?? p.y,
        attack:
          scene.keys.SPACE.isDown || combatInput.attack || combatInput.pulse,
        spark: scene.keys.Q.isDown || combatInput.spark,
        soup: scene.keys.R.isDown || combatInput.soup,
      };
      combatInput.pulse = combatInput.spark = combatInput.soup = false;
      void useGame
        .getState()
        .command("cave_tick", intention, true)
        .finally(() => {
          this.pending = false;
        });
    }
    this.playerMarker.clear();
    if (
      c.enemies.some(
        (e) =>
          e.hp > 0 &&
          e.kind === "boss" &&
          Math.hypot(e.x - p.x, e.y - p.y) < 80,
      )
    )
      this.playerMarker
        .fillStyle(0xffedb6)
        .fillTriangle(p.x - 4, p.y - 49, p.x + 4, p.y - 49, p.x, p.y - 43);
    paintGraphics(
      this.warnings.clear(),
      combatMarks(s, combatInput.target, scene.reduced),
    );
    for (const e of c.enemies) {
      if (!this.bodies.has(e.id)) this.bodies.set(e.id, scene.add.graphics());
      const g = this.bodies.get(e.id)!;
      g.setVisible(e.hp > 0);
      if (e.hp <= 0) continue;
      g.setPosition(e.x, e.y).setDepth(e.y + 1);
      const pose = [
        e.kind,
        e.hp,
        e.phase,
        scene.reduced ? 0 : Math.floor(c.time * 6) % 4,
      ].join(":");
      if (this.poses.get(e.id) !== pose) {
        paintGraphics(g.clear(), monsterArt(e, c.time, scene.reduced));
        this.poses.set(e.id, pose);
      }
    }
    const visible = confirmedFeedback(s, scene.reduced),
      keys = new Set(visible.map((e) => e.key)),
      zoom = scene.cameras.main.zoom;
    for (const [key, text] of this.feedback)
      if (!keys.has(key)) {
        text.destroy();
        this.feedback.delete(key);
      }
    for (const e of visible) {
      let text = this.feedback.get(e.key);
      if (!text) {
        text = scene.add
          .text(0, 0, e.text, {
            fontFamily: "sans-serif",
            fontSize: "16px",
            color: e.kind === "hurt" ? "#ffe2c5" : "#fff2c6",
            stroke: "#293e32",
            strokeThickness: 3,
            fontStyle: "bold",
          })
          .setOrigin(0.5)
          .setDepth(9000);
        this.feedback.set(e.key, text);
      }
      text
        .setPosition(e.x, e.anchorY - (12 + e.lift) / zoom)
        .setScale(1 / zoom)
        .setAlpha(e.alpha);
    }
    const nearest = scene.map.objects
      .map((o) => ({ o, d: Math.hypot(o.x - p.x, o.y - p.y) }))
      .sort((a, b) => a.d - b.d)[0];
    useGame
      .getState()
      .setNearest(
        nearest && nearest.d <= INTERACTION_RADIUS ? nearest.o : null,
      );
    if (!scene.path.length && scene.clickTarget && !blocked) {
      const o = scene.clickTarget;
      scene.clickTarget = null;
      if (Math.hypot(o.x - p.x, o.y - p.y) < INTERACTION_RADIUS)
        void scene.interact(o);
    }
  }
  cycle() {
    const s = useGame.getState();
    if (!s.panel && !this.scene.isTyping() && s.state)
      combatInput.target = nextTarget(s.state, combatInput.target);
  }
  destroy() {
    clearCombatInput();
    this.scene.input.keyboard?.off("keydown-T", this.cycle, this);
    for (const text of this.feedback.values()) text.destroy();
    this.feedback.clear();
    this.poses.clear();
    this.bodies.clear();
  }
}
