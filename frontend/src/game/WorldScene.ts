import Phaser from "phaser";
import { serverNow, useGame } from "../stores/game";
import type { MapData, WorldObject } from "../types";
import { box, objectArt, room } from "./art";
import { preloadVillage, village, updateVillageBuilding } from "./village";
import { chime, personFrame, unlockSound, usePreferences } from "./feel";
import {
  accessibleTarget,
  currentMap,
  pathfind,
  questTarget,
  walkable,
} from "./navigation";
export class WorldScene extends Phaser.Scene {
  player!: Phaser.GameObjects.Sprite;
  shadow!: Phaser.GameObjects.Ellipse;
  keys!: Record<string, Phaser.Input.Keyboard.Key>;
  map!: MapData;
  water!: Phaser.GameObjects.Graphics;
  marker!: Phaser.GameObjects.Graphics;
  touch = { x: 0, y: 0 };
  direction = 0;
  elapsed = 0;
  lastSync = 0;
  lastDraw = 0;
  pending = false;
  interacting = false;
  transitioning = false;
  syncTask: Promise<void> | null = null;
  synced = { x: 240, y: 320 };
  path: { x: number; y: number }[] = [];
  clickTarget: WorldObject | null = null;
  npcs: {
    obj: WorldObject;
    sprite: Phaser.GameObjects.Sprite;
    direction: number;
  }[] = [];
  objectLayers = new Map<string, Phaser.GameObjects.Graphics>();
  smoke!: Phaser.GameObjects.Graphics;
  prompt!: Phaser.GameObjects.Text;
  lastXp = 0;
  lastFootstep = 0;
  get reduced() {
    return usePreferences.getState().reducedMotion;
  }
  constructor() {
    super("world");
  }
  preload() {
    preloadVillage(this);
  }
  create() {
    const { world, state } = useGame.getState();
    if (!world || !state) return;
    this.map = currentMap(world, state);
    this.path = [];
    this.clickTarget = null;
    this.transitioning = false;
    this.interacting = false;
    this.pending = false;
    this.syncTask = null;
    this.npcs = [];
    this.objectLayers = new Map();
    this.lastXp = state.xp;
    this.lastFootstep = this.elapsed;
    if (state.location === "overworld") village(this, this.map);
    else room(this, this.map);
    this.water = this.add.graphics().setDepth(-800);
    this.smoke = this.add.graphics().setDepth(2000);
    this.marker = this.add.graphics().setDepth(9999);
    this.prompt = this.add
      .text(0, 0, "", {
        fontFamily: '"PingFang SC",sans-serif',
        fontSize: "12px",
        color: "#fff2d4",
        backgroundColor: "#344f3e",
        padding: { x: 8, y: 5 },
      })
      .setOrigin(0.5, 0)
      .setDepth(11000)
      .setVisible(false);
    for (const obj of this.map.objects) {
      if (obj.kind === "npc") {
        this.add
          .ellipse(obj.x, obj.y - 1, 22, 8, 0x243e30, 0.2)
          .setDepth(obj.y - 1);
        const sprite = this.add
          .sprite(obj.x, obj.y, `villager-${obj.id === "lia" ? 0 : 2}`, 0)
          .setOrigin(0.5, 1)
          .setScale(2)
          .setDepth(obj.y);
        this.npcs.push({ obj, sprite, direction: 0 });
      } else {
        this.objectLayers.set(
          obj.id,
          this.add.graphics().setDepth(obj.kind === "plot" ? -850 : obj.y),
        );
      }
    }
    this.shadow = this.add.ellipse(
      state.position.x,
      state.position.y - 1,
      23,
      9,
      0x273b2d,
      0.22,
    );
    this.player = this.add
      .sprite(
        state.position.x,
        state.position.y,
        `villager-${state.character?.appearance || 0}`,
        0,
      )
      .setOrigin(0.5, 1)
      .setScale(2);
    this.synced = { ...state.position };
    this.keys = this.input.keyboard!.addKeys(
      "W,A,S,D,UP,DOWN,LEFT,RIGHT,E,F,M,J,SHIFT",
    ) as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.keyboard!.removeCapture([
      "W",
      "A",
      "S",
      "D",
      "UP",
      "DOWN",
      "LEFT",
      "RIGHT",
      "E",
      "F",
      "M",
      "J",
      "SHIFT",
    ]);
    this.cameras.main.setBackgroundColor(
      state.location === "overworld" ? "#559653" : "#3c3930",
    );
    if (state.location === "overworld")
      this.cameras.main.setBounds(0, 0, this.map.width, this.map.height);
    else this.cameras.main.removeBounds();
    this.fitCamera();
    if (state.location === "overworld")
      this.cameras.main.startFollow(
        this.player,
        true,
        this.reduced ? 1 : 0.12,
        this.reduced ? 1 : 0.12,
      );
    else this.cameras.main.stopFollow();
    this.cameras.main.setFollowOffset(
      0,
      state.location === "overworld" ? 45 : 0,
    );
    if (!this.reduced) this.cameras.main.fadeIn(220, 40, 35, 27);
    this.input.keyboard!.on("keydown-E", () => {
      if (!this.isTyping()) {
        unlockSound();
        void this.interact();
      }
    });
    this.input.keyboard!.on("keydown-M", () => {
      if (!this.isTyping()) useGame.getState().open("map");
    });
    this.input.keyboard!.on("keydown-J", () => {
      if (!this.isTyping()) useGame.getState().open("journal");
    });
    this.input.keyboard!.on("keydown-F", () => {
      if (!this.isTyping()) {
        if (this.scale.isFullscreen) this.scale.stopFullscreen();
        else this.scale.startFullscreen();
      }
    });
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (useGame.getState().panel || this.interacting || this.transitioning)
        return;
      unlockSound();
      const obj = this.map.objects
        .filter(
          (o) => Math.hypot(o.x - pointer.worldX, o.y - pointer.worldY) < 38,
        )
        .sort(
          (a, b) =>
            Math.hypot(a.x - pointer.worldX, a.y - pointer.worldY) -
            Math.hypot(b.x - pointer.worldX, b.y - pointer.worldY),
        )[0];
      if (
        obj &&
        Math.hypot(obj.x - this.player.x, obj.y - this.player.y) <= 65
      ) {
        void this.interact(obj);
        return;
      }
      let destination = obj
        ? { x: obj.x, y: obj.y }
        : { x: pointer.worldX, y: pointer.worldY };
      if (obj && !walkable(this.map, destination.x, destination.y)) {
        const approaches: { x: number; y: number }[] = [];
        for (let dx = -64; dx <= 64; dx += 16)
          for (let dy = -64; dy <= 64; dy += 16) {
            const point = {
              x: Math.floor((obj.x + dx) / 16) * 16 + 8,
              y: Math.floor((obj.y + dy) / 16) * 16 + 8,
            };
            if (
              Math.hypot(point.x - obj.x, point.y - obj.y) <= 64 &&
              walkable(this.map, point.x, point.y)
            )
              approaches.push(point);
          }
        approaches.sort(
          (a, b) =>
            Math.hypot(a.x - this.player.x, a.y - this.player.y) -
            Math.hypot(b.x - this.player.x, b.y - this.player.y),
        );
        const reachable = approaches.find(
          (p) => pathfind(this.map, this.player, p).length,
        );
        if (reachable) destination = reachable;
      }
      if (!walkable(this.map, destination.x, destination.y)) {
        useGame.setState({ notice: "这里无法通行，试试门前或小路。" });
        return;
      }
      this.path = pathfind(this.map, this.player, destination);
      this.clickTarget = obj || null;
      if (!this.path.length)
        useGame.setState({ notice: "暂时找不到可通行的小路，请换一个位置。" });
    });
    window.addEventListener("keydown", this.preventScroll);
    window.addEventListener("blur", this.resetInput);
    document.addEventListener("visibilitychange", this.resetInput);
    window.addEventListener("resize", this.fitCamera);
    this.events.once("shutdown", () => {
      window.removeEventListener("keydown", this.preventScroll);
      window.removeEventListener("blur", this.resetInput);
      document.removeEventListener("visibilitychange", this.resetInput);
      window.removeEventListener("resize", this.fitCamera);
      this.input.keyboard?.removeAllListeners();
      this.input.removeAllListeners();
      this.npcs = [];
      this.objectLayers.clear();
    });
    this.drawState();
  }
  fitCamera = () => {
    if (!this.map) return;
    const fit = Math.min(
      Number(this.scale.width) / 480,
      Number(this.scale.height) / 368,
    );
    this.cameras.main.setZoom(
      this.map.id === "overworld"
        ? Number(this.scale.width) >= 1800 && Number(this.scale.height) >= 1000
          ? 2
          : 1
        : fit >= 1
          ? Math.max(1, Math.floor(fit))
          : fit,
    );
    if (this.map.id !== "overworld")
      this.cameras.main.centerOn(this.map.width / 2, this.map.height / 2);
  };
  resetInput = () => {
    this.touch = { x: 0, y: 0 };
    this.path = [];
    this.clickTarget = null;
    this.input.keyboard?.resetKeys();
  };
  preventScroll = (event: KeyboardEvent) => {
    if (
      !this.isTyping() &&
      ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(
        event.key,
      )
    )
      event.preventDefault();
  };
  isTyping() {
    return (
      ["INPUT", "TEXTAREA", "SELECT"].includes(
        document.activeElement?.tagName || "",
      ) || !!useGame.getState().panel
    );
  }
  sync(): Promise<void> {
    if (this.syncTask) return this.syncTask;
    if (
      Math.hypot(this.player.x - this.synced.x, this.player.y - this.synced.y) <
      1
    )
      return Promise.resolve();
    this.pending = true;
    const destination = { x: this.player.x, y: this.player.y };
    const location = this.map.id;
    this.syncTask = (async () => {
      const ok = await useGame
        .getState()
        .command("move", { ...destination, location }, true);
      if (ok) this.synced = destination;
      else if (
        this.sys.isActive() &&
        useGame.getState().state?.location === location
      ) {
        const pos = useGame.getState().state!.position;
        this.player.setPosition(pos.x, pos.y);
        this.synced = { ...pos };
        this.path = [];
      }
    })().finally(() => {
      this.pending = false;
      this.syncTask = null;
    });
    return this.syncTask;
  }
  async interact(selected?: WorldObject) {
    const before = useGame.getState();
    if (before.busy || before.panel || this.interacting || this.transitioning)
      return;
    const obj = selected || before.nearest;
    if (!obj || Math.hypot(obj.x - this.player.x, obj.y - this.player.y) > 65)
      return;
    this.face(obj.x, obj.y);
    unlockSound();
    chime("interact");
    this.path = [];
    this.clickTarget = null;
    this.interacting = true;
    try {
      await this.sync();
      await this.sync();
      const store = useGame.getState();
      if (
        store.navigation?.mapId === this.map.id &&
        store.navigation.targetId === obj.id
      )
        useGame.setState({ navigation: null });
      let action = "";
      if (obj.kind === "building") action = "enter";
      else if (obj.kind === "exit") action = "exit";
      else if (obj.kind === "npc") {
        if (await store.command("talk", { target: obj.id }))
          store.open("npc", obj);
        return;
      } else if (obj.kind === "station") {
        store.open("building", obj);
        return;
      } else if (obj.kind === "storage") {
        store.open("storage", obj);
        return;
      } else if (obj.kind === "board") {
        store.open("board", obj);
        return;
      } else if (obj.kind === "rest") action = "rest";
      else if (obj.kind === "plot") {
        const crop = store.state!.plots[obj.id];
        if (crop && crop.ready_at > serverNow()) {
          useGame.setState({
            notice: `萝卜正在生长，还有 ${Math.ceil(crop.ready_at - serverNow())} 秒成熟。`,
          });
          return;
        }
        action = crop ? "harvest" : "plant";
      } else if (obj.kind === "landmark") action = "discover";
      else if (obj.kind === "chest") action = "open_chest";
      else if (obj.kind === "event") action = "explore";
      else {
        if ((store.state!.gathered[obj.id] || 0) > serverNow()) {
          useGame.setState({
            notice: "这里的资源正在恢复，去其他地方走走吧。",
          });
          return;
        }
        action = "gather";
      }
      const ok = await store.command(action, { target: obj.id });
      if (ok && !["enter", "exit"].includes(action)) chime("item");
      if (ok && !["enter", "exit"].includes(action))
        this.feedback(
          obj,
          action === "gather"
            ? `+${(store.state!.attributes.strength >= 50 ? 1 : 0) + 3} ${obj.kind === "wood" ? "木材" : "石料"}`
            : action === "plant"
              ? "已播种"
              : action === "harvest"
                ? "+2 萝卜"
                : "已记录",
        );
    } finally {
      this.interacting = false;
    }
  }
  face(x: number, y: number) {
    const dx = x - this.player.x,
      dy = y - this.player.y;
    this.direction =
      Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 2 : 1) : dy > 0 ? 0 : 3;
    this.player.setFrame(personFrame(this.direction));
  }
  feedback(obj: { x: number; y: number }, text: string) {
    const label = this.add
      .text(obj.x, obj.y - 44, text, {
        fontFamily: "sans-serif",
        fontSize: "13px",
        color: "#fff2bf",
        stroke: "#53633c",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(12000);
    if (!this.reduced) {
      for (let i = 0; i < 6; i++) {
        const mote = this.add
          .rectangle(
            obj.x + (i - 3) * 5,
            obj.y - 14,
            3,
            3,
            i % 2 ? 0xf6db87 : 0xc5e68a,
          )
          .setDepth(12000);
        this.tweens.add({
          targets: mote,
          x: mote.x + (i - 3) * 5,
          y: mote.y - 20 - i * 3,
          alpha: 0,
          duration: 500,
          onComplete: () => mote.destroy(),
        });
      }
    }
    this.tweens.add({
      targets: label,
      y: obj.y - 70,
      alpha: 0,
      duration: this.reduced ? 300 : 900,
      onComplete: () => label.destroy(),
    });
  }
  step(delta: number) {
    if (!this.player || this.transitioning) return;
    if (useGame.getState().state?.location !== this.map.id) {
      this.transitioning = true;
      useGame.getState().setNearest(null);
      if (this.reduced) this.scene.restart();
      else {
        this.cameras.main.fadeOut(120, 40, 35, 27);
        this.time.delayedCall(125, () => this.scene.restart());
      }
      return;
    }
    this.elapsed += delta;
    const blocked =
      this.isTyping() ||
      useGame.getState().busy ||
      this.interacting ||
      document.hidden;
    let dx =
      Number(this.keys.D.isDown || this.keys.RIGHT.isDown) -
      Number(this.keys.A.isDown || this.keys.LEFT.isDown) +
      this.touch.x;
    let dy =
      Number(this.keys.S.isDown || this.keys.DOWN.isDown) -
      Number(this.keys.W.isDown || this.keys.UP.isDown) +
      this.touch.y;
    if (dx || dy) {
      this.path = [];
      this.clickTarget = null;
    }
    if (!blocked && !dx && !dy && this.path.length) {
      const target = this.path[0],
        distance = Math.hypot(
          target.x - this.player.x,
          target.y - this.player.y,
        );
      if (distance < 4) this.path.shift();
      else {
        dx = (target.x - this.player.x) / distance;
        dy = (target.y - this.player.y) / distance;
      }
    }
    if (blocked) {
      dx = 0;
      dy = 0;
    }
    const length = Math.hypot(dx, dy);
    if (length > 1) {
      dx /= length;
      dy /= length;
    }
    const distance =
      ((this.keys.SHIFT.isDown ? 205 : 160) * Math.min(delta, 40)) / 1000;
    if (walkable(this.map, this.player.x + dx * distance, this.player.y))
      this.player.x += dx * distance;
    if (walkable(this.map, this.player.x, this.player.y + dy * distance))
      this.player.y += dy * distance;
    if (Math.abs(dx) > 0.2) this.direction = dx > 0 ? 2 : 1;
    else if (Math.abs(dy) > 0.2) this.direction = dy > 0 ? 0 : 3;
    this.player
      .setFrame(
        personFrame(
          this.direction,
          length ? Math.floor(this.elapsed / 130) % 4 : 0,
        ),
      )
      .setDepth(this.player.y + 1);
    this.shadow
      .setPosition(this.player.x, this.player.y - 1)
      .setDepth(this.player.y - 1);
    if (length && !blocked && this.elapsed - this.lastFootstep > 290) {
      this.lastFootstep = this.elapsed;
      chime("step");
    }
    const selected = useGame.getState().selected;
    for (const npc of this.npcs) {
      const dx = this.player.x - npc.obj.x,
        dy = this.player.y - npc.obj.y;
      if (Math.hypot(dx, dy) < 140 || selected?.id === npc.obj.id)
        npc.direction =
          Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 2 : 1) : dy > 0 ? 0 : 3;
      else npc.direction = [0, 1, 0, 2][Math.floor(this.elapsed / 3800) % 4];
      npc.sprite
        .setFrame(personFrame(npc.direction))
        .setY(
          npc.obj.y -
            (!this.reduced && !blocked && Math.sin(this.elapsed / 480) > 0.5
              ? 1
              : 0),
        );
    }
    if (this.elapsed - this.lastSync > 120 && !this.pending) {
      this.lastSync = this.elapsed;
      void this.sync();
    }
    const nearest = this.map.objects
      .map((o) => ({
        o,
        d: Math.hypot(o.x - this.player.x, o.y - this.player.y),
      }))
      .sort((a, b) => a.d - b.d)[0];
    useGame
      .getState()
      .setNearest(nearest && nearest.d <= 65 ? nearest.o : null);
    if (!this.path.length && this.clickTarget && !blocked) {
      const target = this.clickTarget;
      this.clickTarget = null;
      if (Math.hypot(target.x - this.player.x, target.y - this.player.y) <= 68)
        void this.interact(target);
    }
    if (this.elapsed - this.lastDraw > 180) {
      this.lastDraw = this.elapsed;
      this.drawState();
    }
  }
  update(_time: number, delta: number) {
    this.step(delta);
  }
  drawState() {
    const store = useGame.getState(),
      state = store.state!,
      now = serverNow();
    for (const obj of this.map.objects) {
      const layer = this.objectLayers.get(obj.id);
      if (layer) {
        layer.clear();
        objectArt(layer, obj, state, now);
      }
    }
    if (state.xp > this.lastXp) {
      const leveled =
        Math.floor(state.xp / 100) > Math.floor(this.lastXp / 100);
      this.feedback(
        this.player,
        leveled
          ? `等级提升 · Lv.${1 + Math.floor(state.xp / 100)}`
          : `+${state.xp - this.lastXp} EXP`,
      );
      chime("reward");
    }
    this.lastXp = state.xp;
    this.cameras.main.setLerp(this.reduced ? 1 : 0.12, this.reduced ? 1 : 0.12);
    this.water.clear();
    if (this.map.id === "overworld") {
      this.water.lineStyle(1, 0xb1d5bf, 0.6);
      for (let i = 0; i < 50; i++) {
        const y = (i * 29 + (this.reduced ? 0 : this.elapsed / 170)) % 1280;
        if ((y < 310 || y > 398) && (y < 862 || y > 950))
          this.water.lineBetween(458 + (i % 3) * 12, y, 472 + (i % 3) * 12, y);
      }
      for (let i = 0; i < 12; i++) {
        const y = 878 + i * 12;
        this.water.lineBetween(1200 + (i % 3) * 40, y, 1220 + (i % 3) * 40, y);
      }
    }
    this.smoke.clear();
    if (this.map.id === "overworld") {
      for (const obj of this.map.objects.filter((o) => o.kind === "building")) {
        updateVillageBuilding(this, obj, state.buildings[obj.id] || 1);
        if (!this.reduced) {
          const [x, y, w] = obj.rect!;
          for (let i = 0; i < 3; i++) {
            const drift = (this.elapsed / 80 + i * 13) % 42;
            this.smoke.fillStyle(0xf2edca, 0.25 * (1 - drift / 42));
            this.smoke.fillRect(
              Math.round(x + w - 22 + Math.sin(drift / 10) * 4),
              Math.round(y - 18 - drift),
              6 + i * 2,
              6 + i * 2,
            );
          }
        }
      }
    }
    this.marker.clear();
    const near = store.nearest;
    this.prompt.setVisible(!!near && !store.panel && !this.interacting);
    if (near) {
      this.prompt
        .setPosition(this.player.x, this.player.y + 9)
        .setText(`E  ${near.name}`);
      this.marker.lineStyle(1, 0xffebb0, 0.85);
      this.marker.strokeEllipse(near.x, near.y + 2, 38, 14);
    }
    for (const obj of this.map.objects) {
      const q = state.quest_log.filter(
        (q) => q.giver === obj.id && ["available", "ready"].includes(q.status),
      );
      if (
        !q.length ||
        Math.hypot(obj.x - this.player.x, obj.y - this.player.y) > 190
      )
        continue;
      const x = obj.x,
        y = obj.y - (obj.kind === "npc" ? 66 : 48),
        ready = q.some((q) => q.status === "ready");
      box(this.marker, 0x66482f, x - 7, y - 12, 14, 18);
      box(this.marker, ready ? 0x92b365 : 0xf1c671, x - 6, y - 13, 12, 16);
      box(this.marker, 0x704a2f, x - 1, y - 10, 2, 7);
      box(this.marker, 0x704a2f, x - 1, y, 2, 2);
    }
    const tracked = state.quest_log.find((q) => q.id === state.tracked_quest);
    const target =
      store.navigation || (tracked ? questTarget(tracked, state) : null);
    const obj = target ? accessibleTarget(target, store.world!, state) : null;
    if (obj) {
      const pulse = this.reduced ? 0 : Math.sin(this.elapsed / 260) * 2;
      this.marker.lineStyle(2, 0xffe6a0, 0.8);
      this.marker.strokeCircle(obj.x, obj.y + 1, 22 + pulse);
    }
    if (this.path.length) {
      const last = this.path[this.path.length - 1];
      this.marker.lineStyle(1, 0xf9f2d0, 0.6);
      this.marker.strokeCircle(last.x, last.y, 7);
    }
  }
}
