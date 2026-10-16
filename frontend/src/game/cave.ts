import Phaser from "phaser";
import type { WorldScene } from "./WorldScene";
import type { CaveEnemy, GameState, MapData, WorldObject } from "../types";
import { useGame } from "../stores/game";
import { worldViewOwner } from "../services/api";
import { INTERACTION_RADIUS } from "./interaction";
import { personFrame } from "./feel";
import { walkable } from "./navigation";

export function caveSight(
  map: MapData,
  a: { x: number; y: number },
  b: { x: number; y: number },
) {
  const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 4));
  for (let i = 1; i <= steps; i++)
    if (
      !walkable(
        map,
        a.x + ((b.x - a.x) * i) / steps,
        a.y + ((b.y - a.y) * i) / steps,
      )
    )
      return false;
  return true;
}

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

// Original code-authored pixel scenery; no vendor sprite is rescaled or edited.
export function caveLandscape(scene: Phaser.Scene, map: MapData) {
  const key = `stone-root-${map.id}`;
  if (!scene.textures.exists(key)) {
    const canvas = document.createElement("canvas");
    canvas.width = map.width * 2;
    canvas.height = map.height * 2;
    const c = canvas.getContext("2d")!;
    c.scale(2, 2);
    c.imageSmoothingEnabled = false;
    c.fillStyle = "#788279";
    c.fillRect(0, 0, map.width, map.height);
    let seed = Number(map.id.slice(-1)) * 917 + 71;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let y = 40; y < 424; y += 16)
      for (let x = 24; x < 616; x += 16) {
        c.fillStyle = ["#7f897e", "#879184", "#737f76", "#909886"][
          Math.floor(rand() * 4)
        ];
        c.fillRect(x + 1, y + 1, 15, 15);
        c.fillStyle = "#66736c";
        c.fillRect(x + 3, y + 13, 7, 0.5);
        c.fillStyle = "#a2aa91";
        c.fillRect(x + 6, y + 3, 3, 0.5);
      }
    c.fillStyle = "#aca584";
    c.fillRect(30, 264, 116, 150);
    c.fillStyle = "#bdaf8c";
    c.fillRect(38, 272, 100, 134);
    for (const [x, y, w, h] of map.obstacles) {
      c.fillStyle = "#3b4b45";
      c.fillRect(x, y, w, h);
      for (let yy = y; yy < y + h; yy += 12)
        for (let xx = x; xx < x + w; xx += 24) {
          c.fillStyle = yy % 24 ? "#63736b" : "#6f7c70";
          c.fillRect(
            xx + 1,
            yy + 1,
            Math.min(22, x + w - xx - 1),
            Math.min(10, y + h - yy - 1),
          );
          c.fillStyle = "#93a08b";
          c.fillRect(xx + 2, yy + 1, Math.min(20, x + w - xx - 2), 1);
          c.fillStyle = "#45624e";
          c.fillRect(xx + 2, yy + 7, 6, 2);
        }
    }
    for (const [x, y] of [
      [148, 76],
      [560, 400],
      [48, 72],
    ]) {
      c.fillStyle = "#3b5647";
      c.fillRect(x - 5, y - 8, 10, 16);
      c.fillStyle = "#84b5a0";
      c.fillRect(x - 3, y - 7, 6, 10);
      c.fillStyle = "#c1d0ac";
      c.fillRect(x - 2, y - 7, 2, 5);
    }
    scene.textures.addCanvas(key, canvas);
  }
  scene.add.image(0, 0, key).setOrigin(0).setScale(0.5).setDepth(-1000);
}

export function combatObjectArt(
  g: Phaser.GameObjects.Graphics,
  o: WorldObject,
  s: GameState,
) {
  const { x, y } = o;
  if (o.id === "village_departure") {
    const open = s.combat?.gate_open;
    g.fillStyle(0x364a40).fillRect(x - 30, y - 80, 60, 84);
    g.fillStyle(0x8f9b82).fillRect(x - 27, y - 77, 54, 76);
    for (let row = 0; row < 5; row++) {
      g.lineStyle(1, 0x536958).lineBetween(
        x - 25,
        y - 65 + row * 14,
        x + 25,
        y - 65 + row * 14,
      );
    }
    g.fillStyle(open ? 0x263c32 : 0x647b66).fillRect(x - 16, y - 59, 32, 62);
    g.lineStyle(2, open ? 0xb7d0a5 : 0xd1ba78).strokeRect(
      x - 17,
      y - 60,
      34,
      62,
    );
    if (!open)
      g.fillStyle(0xc8b777).fillPoints(
        [
          { x, y: y - 45 },
          { x: x + 6, y: y - 34 },
          { x, y: y - 22 },
          { x: x - 6, y: y - 34 },
        ],
        true,
      );
    return;
  }
  if (o.id === "cave_entry") {
    g.fillStyle(0x45594b).fillEllipse(x, y - 23, 116, 80);
    for (let i = 0; i < 9; i++) {
      const a = Math.PI + (i * Math.PI) / 8;
      g.fillStyle(i % 2 ? 0x8c9780 : 0x78896f).fillRect(
        x + Math.cos(a) * 46 - 10,
        y + Math.sin(a) * 54 - 16,
        22,
        28,
      );
    }
    g.fillStyle(0x293e36)
      .fillEllipse(x, y - 10, 54, 66)
      .fillRect(x - 27, y - 12, 54, 22);
    g.fillStyle(0xb3a67b).fillRect(x - 30, y + 6, 60, 6);
    g.fillStyle(0xa6c6ad).fillRect(x - 41, y - 29, 5, 9);
  } else if (o.kind === "cave") {
    if (o.id === "cave_rest") {
      g.fillStyle(0x6d513a).fillRect(x - 22, y - 9, 44, 13);
      g.fillStyle(0xb09662).fillRect(x - 22, y - 12, 44, 7);
    } else {
      g.fillStyle(0x3e5045).fillRect(x - 22, y - 28, 44, 34);
      for (let i = 0; i < 4; i++)
        g.fillStyle(i % 2 ? 0xbdaf86 : 0xa29371).fillRect(
          x - 18 + i * 3,
          y - 22 + i * 7,
          36 - i * 6,
          5,
        );
      if (o.id === "cave_rope")
        g.lineStyle(2, 0xc5a873)
          .lineBetween(x - 16, y - 30, x - 16, y + 3)
          .lineBetween(x + 16, y - 30, x + 16, y + 3);
    }
  } else if (o.kind === "spellbook") {
    g.fillStyle(0x526e54).fillRect(x - 15, y - 18, 30, 18);
    g.fillStyle(0xf3e8c6).fillRect(x - 13, y - 16, 26, 14);
    g.lineStyle(1, 0xb3a377).lineBetween(x, y - 16, x, y - 2);
  }
}

function monster(g: Phaser.GameObjects.Graphics, e: CaveEnemy, t: number) {
  g.clear()
    .fillStyle(0x243e32, 0.25)
    .fillEllipse(0, -1, e.kind === "boss" ? 66 : 26, 9);
  const lift = e.phase === "windup" ? 2 : Math.floor(t * 4) % 2;
  if (e.kind === "slime") {
    g.fillStyle(0x3e644b).fillEllipse(0, -13 - lift, 30, 25);
    g.fillStyle(0x83ad70).fillEllipse(-1, -16 - lift, 25, 20);
    g.fillStyle(0xb2c98b).fillRect(-8, -24 - lift, 7, 3);
    g.fillStyle(0x243f35)
      .fillRect(-7, -14 - lift, 3, 4)
      .fillRect(5, -14 - lift, 3, 4);
  } else if (e.kind === "bat") {
    const flap = (Math.floor(t * 6) % 2) * 4;
    g.fillStyle(0x596473).fillPoints(
      [
        { x: 0, y: -15 },
        { x: -29, y: -33 + flap },
        { x: -21, y: -8 },
        { x: -11, y: -14 },
      ],
      true,
    );
    g.fillPoints(
      [
        { x: 0, y: -15 },
        { x: 29, y: -33 + flap },
        { x: 21, y: -8 },
        { x: 11, y: -14 },
      ],
      true,
    );
    g.fillStyle(0x8590a1).fillEllipse(0, -20, 16, 24);
    g.fillStyle(0x2d4142).fillRect(-6, -22, 3, 4).fillRect(4, -22, 3, 4);
  } else if (e.kind === "beetle") {
    g.lineStyle(3, 0x485443);
    for (let i = 0; i < 3; i++)
      g.lineBetween(-10, -7 - i * 5, -19, -3 - i * 5).lineBetween(
        10,
        -7 - i * 5,
        19,
        -3 - i * 5,
      );
    g.fillStyle(0x546351).fillEllipse(0, -14, 30, 30);
    g.fillStyle(0x9ba67d).fillEllipse(0, -18, 26, 26);
    g.lineStyle(1, 0x65775a)
      .lineBetween(0, -30, 0, -7)
      .lineBetween(-11, -20, 11, -20);
    g.fillStyle(0x304635).fillRect(-6, -7, 3, 3).fillRect(4, -7, 3, 3);
  } else {
    g.fillStyle(0x43574b)
      .fillRect(-27, -35, 54, 32)
      .fillRect(-35, -42, 14, 30)
      .fillRect(21, -42, 14, 30);
    g.fillStyle(0x8a967c)
      .fillRect(-24, -52 - lift, 48, 39)
      .fillRect(-20, -13, 15, 12)
      .fillRect(5, -13, 15, 12);
    g.fillStyle(0xa5ad8c).fillRect(-20, -49 - lift, 40, 6);
    g.lineStyle(2, 0x5b725c)
      .strokeRect(-24, -52 - lift, 48, 39)
      .lineBetween(0, -47 - lift, 0, -17);
    g.fillStyle(e.hp <= 80 ? 0xe8b563 : 0xbcd2a0).fillPoints(
      [
        { x: 0, y: -42 - lift },
        { x: 9, y: -30 - lift },
        { x: 0, y: -18 - lift },
        { x: -9, y: -30 - lift },
      ],
      true,
    );
    g.fillStyle(0x233f35)
      .fillRect(-14, -44 - lift, 6, 3)
      .fillRect(8, -44 - lift, 6, 3);
  }
  g.fillStyle(0x34483b).fillRect(-16, -(e.kind === "boss" ? 65 : 39), 32, 3);
  g.fillStyle(0xb8cc89).fillRect(
    -16,
    -(e.kind === "boss" ? 65 : 39),
    (32 * e.hp) / e.max_hp,
    3,
  );
}

export class CaveController {
  pending = false;
  lastRequest = 0;
  bodies = new Map<string, Phaser.GameObjects.Graphics>();
  warnings: Phaser.GameObjects.Graphics;
  effectText: Phaser.GameObjects.Text;
  playerMarker: Phaser.GameObjects.Graphics;
  constructor(public scene: WorldScene) {
    combatInput.target = null;
    clearCombatInput();
    this.warnings = scene.add.graphics().setDepth(-1);
    this.playerMarker = scene.add.graphics().setDepth(9001);
    this.effectText = scene.add
      .text(0, 0, "", {
        fontFamily: "sans-serif",
        fontSize: "10px",
        color: "#fff6d9",
        stroke: "#304837",
        strokeThickness: 2,
      })
      .setDepth(9000);
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
    combatInput.pulse = true;
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
    const alive = c.enemies.filter((e) => e.hp > 0);
    let target = alive.find((e) => e.id === combatInput.target);
    if (!target) {
      target = alive.sort(
        (a, b) =>
          Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y),
      )[0];
      combatInput.target = target?.id || null;
    }
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
    this.playerMarker
      .clear()
      .lineStyle(1, 0xfff2c8, 0.85)
      .strokeEllipse(p.x, p.y, 26, 10);
    if (
      c.enemies.some(
        (e) =>
          e.hp > 0 &&
          e.kind === "boss" &&
          Math.hypot(e.x - p.x, e.y - p.y) < 80,
      )
    ) {
      this.playerMarker
        .fillStyle(0xfff2c8)
        .fillTriangle(p.x - 4, p.y - 49, p.x + 4, p.y - 49, p.x, p.y - 43);
    }
    this.warnings.clear();
    for (const e of c.enemies) {
      if (!this.bodies.has(e.id)) this.bodies.set(e.id, scene.add.graphics());
      const g = this.bodies.get(e.id)!;
      g.setVisible(e.hp > 0);
      if (e.hp <= 0) continue;
      g.setPosition(e.x, e.y).setDepth(e.y + 1);
      monster(g, e, c.time);
      if (e.id === combatInput.target)
        this.warnings.lineStyle(1, 0xf1d59b).strokeEllipse(e.x, e.y, 36, 12);
      if (e.phase === "windup") {
        const w = this.warnings;
        w.lineStyle(2, 0xeac291, 0.95).fillStyle(0xba6b43, 0.25);
        if (e.style === "shot") {
          w.lineBetween(e.x, e.y, e.tx, e.ty);
          w.strokeCircle(e.tx, e.ty, 12);
        } else if (e.kind === "bat") {
          w.lineStyle(5, 0xeac291, 0.45).lineBetween(e.x, e.y, e.tx, e.ty);
        } else if (e.style === "sweep") {
          const a = Math.atan2(e.ty - e.y, e.tx - e.x),
            points = [{ x: e.x, y: e.y }];
          for (let i = 0; i <= 12; i++)
            points.push({
              x: e.x + Math.cos(a - Math.PI / 3 + (i * Math.PI) / 18) * 60,
              y: e.y + Math.sin(a - Math.PI / 3 + (i * Math.PI) / 18) * 60,
            });
          w.fillPoints(points, true).strokePoints(points, true);
        } else
          w.fillCircle(e.tx, e.ty, e.kind === "boss" ? 40 : 26).strokeCircle(
            e.tx,
            e.ty,
            e.kind === "boss" ? 40 : 26,
          );
      }
    }
    const effect = c.effects.at(-1);
    this.effectText.setVisible(!!effect);
    for (const shot of c.projectiles || [])
      this.warnings.fillStyle(0xf1d59b).fillPoints(
        [
          { x: shot.x, y: shot.y - 6 },
          { x: shot.x + 4, y: shot.y },
          { x: shot.x, y: shot.y + 6 },
          { x: shot.x - 4, y: shot.y },
        ],
        true,
      );
    if (effect)
      this.effectText.setPosition(effect.x, effect.y - 45).setText(effect.text);
    if (c.cast && c.cast.kind !== "soup") {
      const a = c.cast.angle || 0,
        reach = c.cast.reach || 28;
      this.warnings
        .lineStyle(
          c.cast.kind === "spark" ? 3 : 2,
          c.cast.kind === "spark" ? 0xe8a765 : 0xf3d99e,
          0.9,
        )
        .lineBetween(
          p.x,
          p.y - 12,
          p.x + Math.cos(a) * reach,
          p.y - 12 + Math.sin(a) * reach,
        );
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
  destroy() {
    clearCombatInput();
    this.bodies.clear();
  }
}
