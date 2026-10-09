import Phaser from "phaser";
import { serverNow, useGame } from "../stores/game";
import type { MapData, WorldObject } from "../types";
import { box, building, ground, makeSprites, objectArt, room } from "./art";
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
  objects!: Phaser.GameObjects.Graphics;
  water!: Phaser.GameObjects.Graphics;
  marker!: Phaser.GameObjects.Graphics;
  labels: Phaser.GameObjects.Text[] = [];
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
  reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  constructor() {
    super("world");
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
    this.labels = [];
    if (!this.textures.exists("person-0-0-0")) makeSprites(this);
    if (state.location === "overworld") ground(this, this.map);
    else room(this, this.map);
    this.objects = this.add.graphics().setDepth(25);
    this.water = this.add.graphics().setDepth(-800);
    this.marker = this.add.graphics().setDepth(9999);
    for (const obj of this.map.objects) {
      if (obj.kind === "npc") {
        this.add
          .sprite(obj.x, obj.y, `person-${obj.id === "lia" ? 2 : 1}-0-0`)
          .setOrigin(0.5, 1)
          .setDepth(obj.y);
      }
      if (["building", "npc", "board", "landmark"].includes(obj.kind)) {
        const label = this.add
          .text(obj.x, obj.y + (obj.kind === "building" ? 17 : -48), obj.name, {
            fontFamily: '"PingFang SC",sans-serif',
            fontSize: "11px",
            color: "#fff0cb",
            backgroundColor: "#685037",
            padding: { x: 5, y: 3 },
          })
          .setOrigin(0.5, 0)
          .setDepth(obj.y + 20);
        this.labels.push(label);
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
        `person-${state.character?.appearance || 0}-0-0`,
      )
      .setOrigin(0.5, 1);
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
      state.location === "overworld" ? "#83a751" : "#3c3930",
    );
    if (state.location === "overworld")
      this.cameras.main.setBounds(0, 0, this.map.width, this.map.height);
    else this.cameras.main.removeBounds();
    this.fitCamera();
    if (state.location === "overworld")
      this.cameras.main.startFollow(this.player, true, 1, 1);
    else this.cameras.main.stopFollow();
    this.cameras.main.setFollowOffset(
      0,
      state.location === "overworld" ? 45 : 0,
    );
    if (!this.reduced) this.cameras.main.fadeIn(220, 40, 35, 27);
    this.input.keyboard!.on("keydown-E", () => {
      if (!this.isTyping()) void this.interact();
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
      if (useGame.getState().panel || this.interacting) return;
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
    });
    this.drawState();
  }
  fitCamera = () => {
    if (!this.map) return;
    this.cameras.main.setZoom(
      this.map.id === "overworld"
        ? Math.min(
            window.innerWidth < 700 ? 1.35 : 1.65,
            Math.max(1.1, Number(this.scale.height) / 460),
          )
        : Math.min(
            Number(this.scale.width) / 480,
            Number(this.scale.height) / 368,
          ) * 0.94,
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
    if (!obj) return;
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
      if (ok && !["enter", "exit"].includes(action))
        this.feedback(
          obj,
          action === "gather"
            ? "+ 材料"
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
  feedback(obj: WorldObject, text: string) {
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
      .setTexture(
        `person-${useGame.getState().state?.character?.appearance || 0}-${this.direction}-${length ? Math.floor(this.elapsed / 125) % 4 : 0}`,
      )
      .setDepth(this.player.y + 1);
    this.shadow
      .setPosition(this.player.x, this.player.y - 1)
      .setDepth(this.player.y - 1);
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
    this.objects.clear();
    for (const obj of this.map.objects)
      objectArt(this.objects, obj, state, now);
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
    if (this.map.id === "overworld")
      for (const child of this.children.list) {
        if (
          child instanceof Phaser.GameObjects.Graphics &&
          child.getData("building")
        ) {
          const id = child.getData("building"),
            level = state.buildings[id] || 1;
          if (child.getData("level") !== level) {
            child.clear();
            building(
              child,
              id,
              this.map.objects.find((o) => o.id === id)!.rect!,
              level,
            );
            child.setData("level", level);
          }
        }
      }
    this.marker.clear();
    const near = store.nearest;
    if (near) {
      this.marker.lineStyle(1.5, 0xffebb0, 0.95);
      this.marker.strokeEllipse(near.x, near.y + 2, 38, 14);
    }
    for (const obj of this.map.objects) {
      const q = state.quest_log.filter(
        (q) => q.giver === obj.id && ["available", "ready"].includes(q.status),
      );
      if (!q.length) continue;
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
