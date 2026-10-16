import Phaser from "phaser";
import { serverNow, useGame } from "../stores/game";
import type { MapData, WorldObject } from "../types";
import { box, objectArt } from "./art";
import { homeObjectResponse } from "./hearthwood";
import {
  preloadInteriors,
  fineRoom,
  updateInteriorPresentation,
} from "./interiors";
import {
  preloadVillage,
  village,
  updateVillageBuilding,
  hasVillageObjectArt,
  updateVillageObjects,
  updateVillageCanopies,
  ACTOR_FRAME,
} from "./village";
import { chime, personFrame, unlockSound, usePreferences } from "./feel";
import { residentPositions, villageClock } from "./residents";
import { hitObject, interactionFor, INTERACTION_RADIUS } from "./interaction";
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
  lastMorning = 0;
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
    shadow: Phaser.GameObjects.Ellipse;
    bubble: Phaser.GameObjects.Text;
  }[] = [];
  objectLayers = new Map<string, Phaser.GameObjects.Graphics>();
  smoke!: Phaser.GameObjects.Graphics;
  villageLight!: Phaser.GameObjects.Graphics;
  lastXp = 0;
  lastFootstep = 0;
  hovered: WorldObject | null = null;
  response: {
    id: string;
    phase: "pending" | "accepted" | "rejected";
    until: number;
  } | null = null;
  cancelledInteraction = false;
  get reduced() {
    return usePreferences.getState().reducedMotion;
  }
  constructor() {
    super("world");
  }
  preload() {
    preloadVillage(this);
    preloadInteriors(this);
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
    this.hovered = null;
    this.response = null;
    this.objectLayers = new Map();
    this.lastXp = state.xp;
    this.lastMorning = state.world_clock?.last_night?.at || 0;
    this.lastFootstep = this.elapsed;
    if (state.location === "overworld") village(this, this.map);
    else fineRoom(this, this.map);
    this.water = this.add.graphics().setDepth(-800);
    this.smoke = this.add.graphics().setDepth(2000);
    this.villageLight = this.add.graphics().setDepth(8500);
    this.marker = this.add.graphics().setDepth(9999);
    for (const obj of this.map.objects) {
      if (obj.kind !== "npc") {
        this.objectLayers.set(
          obj.id,
          this.add
            .graphics()
            .setDepth(
              obj.kind === "plot"
                ? -850
                : obj.hitbox
                  ? obj.hitbox[1] + obj.hitbox[3] + 1
                  : obj.y,
            ),
        );
      }
    }
    for (const obj of residentPositions(world, state, serverNow())) {
      const sprite = this.add
        .sprite(obj.x, obj.y, `villager-${obj.id}`, 0)
        .setOrigin(0.5, 1)
        .setScale(ACTOR_FRAME.scale)
        .setDepth(obj.y);
      const shadow = this.add
        .ellipse(obj.x, obj.y - 1, 22, 8, 0x243e30, 0.2)
        .setDepth(obj.y - 1);
      const bubble = this.add
        .text(obj.x, obj.y - 46, "", {
          fontFamily: "sans-serif",
          fontSize: "12px",
          color: "#27392f",
          backgroundColor: "#f4efde",
          padding: { x: 8, y: 5 },
        })
        .setOrigin(0.5, 1)
        .setDepth(9000);
      this.npcs.push({ obj, sprite, shadow, bubble, direction: 0 });
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
      .setScale(ACTOR_FRAME.scale);
    this.synced = { ...state.position };
    this.keys = this.input.keyboard!.addKeys(
      "W,A,S,D,UP,DOWN,LEFT,RIGHT,E,F,M,J,I,C,L,SHIFT",
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
      "I",
      "C",
      "L",
      "SHIFT",
    ]);
    this.cameras.main.setBackgroundColor(
      state.location === "overworld"
        ? "#78955e"
        : state.location === "home"
          ? "#27352d"
          : "#3c3930",
    );
    if (state.location === "overworld")
      this.cameras.main.setBounds(0, 0, this.map.width, this.map.height);
    else this.cameras.main.removeBounds();
    if (state.location === "overworld")
      this.cameras.main.startFollow(
        this.player,
        true,
        this.reduced ? 1 : 0.12,
        this.reduced ? 1 : 0.12,
      );
    else this.cameras.main.stopFollow();
    this.fitCamera();
    if (!this.reduced) this.cameras.main.fadeIn(220, 40, 35, 27);
    this.input.keyboard!.on("keydown-E", (event: KeyboardEvent) => {
      if (!this.isTyping() && !event.repeat) {
        unlockSound();
        void this.interact();
      }
    });
    this.input.keyboard!.on("keydown-ESC", () => {
      if (!this.isTyping()) {
        this.resetInput();
        this.cancelledInteraction = true;
      }
    });
    this.input.keyboard!.on("keydown-M", () => {
      if (!this.isTyping()) useGame.getState().open("map");
    });
    this.input.keyboard!.on("keydown-J", () => {
      if (!this.isTyping()) useGame.getState().open("journal");
    });
    for (const [key, panel] of [
      ["I", "inventory"],
      ["C", "character"],
      ["L", "activity"],
    ] as const)
      this.input.keyboard!.on(`keydown-${key}`, () => {
        if (!this.isTyping()) useGame.getState().open(panel);
      });
    for (let index = 0; index < 4; index++)
      this.input.keyboard!.on(
        `keydown-${["ONE", "TWO", "THREE", "FOUR"][index]}`,
        () => {
          if (!this.isTyping()) {
            const store = useGame.getState();
            store.selectItem(store.quickItems[index]);
            store.open("inventory");
          }
        },
      );
    this.input.keyboard!.on("keydown-F", () => {
      if (!this.isTyping()) {
        if (this.scale.isFullscreen) this.scale.stopFullscreen();
        else this.scale.startFullscreen();
      }
    });
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (
        this.isTyping() ||
        this.interacting ||
        this.transitioning ||
        document.hidden
      )
        return;
      unlockSound();
      const obj = this.objectAt(pointer.worldX, pointer.worldY);
      if (
        obj &&
        Math.hypot(obj.x - this.player.x, obj.y - this.player.y) <=
          INTERACTION_RADIUS
      ) {
        void this.interact(obj);
        return;
      }
      let destination = obj
        ? { x: obj.x, y: obj.y }
        : { x: pointer.worldX, y: pointer.worldY };
      if (obj?.kind === "npc") {
        // Stop beside a person, keeping both silhouettes visible in conversation.
        const distance = Phaser.Math.Distance.Between(
          this.player.x,
          this.player.y,
          obj.x,
          obj.y,
        );
        const approach = {
          x: obj.x + ((this.player.x - obj.x) / distance) * 42,
          y: obj.y + ((this.player.y - obj.y) / distance) * 42,
        };
        if (
          walkable(this.map, approach.x, approach.y) &&
          pathfind(this.map, this.player, approach).length
        )
          destination = approach;
      }
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
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      this.hovered = this.isTyping()
        ? null
        : this.objectAt(pointer.worldX, pointer.worldY) || null;
      this.input.setDefaultCursor(this.hovered ? "pointer" : "default");
    });
    this.input.on("gameout", () => {
      this.hovered = null;
      this.input.setDefaultCursor("default");
    });
    window.addEventListener("keydown", this.preventScroll);
    window.addEventListener("blur", this.resetInput);
    document.addEventListener("visibilitychange", this.resetInput);
    window.addEventListener("resize", this.fitCamera);
    document.addEventListener("focusin", this.focusChanged);
    document.addEventListener("focusout", this.focusChanged);
    const unsubscribe = useGame.subscribe((next, previous) => {
      if (next.panel !== previous.panel) {
        this.hovered = null;
        this.input.setDefaultCursor("default");
        this.resetInput();
        this.focusChanged();
      }
    });
    this.events.once("shutdown", () => {
      window.removeEventListener("keydown", this.preventScroll);
      window.removeEventListener("blur", this.resetInput);
      document.removeEventListener("visibilitychange", this.resetInput);
      window.removeEventListener("resize", this.fitCamera);
      document.removeEventListener("focusin", this.focusChanged);
      document.removeEventListener("focusout", this.focusChanged);
      unsubscribe();
      this.input.keyboard?.removeAllListeners();
      this.input.removeAllListeners();
      this.npcs = [];
      this.objectLayers.clear();
    });
    this.focusChanged();
    this.drawState();
  }
  fitCamera = () => {
    if (!this.map) return;
    const width = Number(this.scale.width),
      height = Number(this.scale.height);
    const outdoor = this.map.id === "overworld";
    // Review a useful amount of village around the refined actors. DPR never
    // controls zoom; scenery has two native art pixels per world unit.
    const zoom = outdoor
      ? Math.max(1.5, Math.floor(Math.min(width / 640, height / 400) * 2) / 2)
      : Math.max(
          1.5,
          Math.floor(Math.min(width / 520, (height - 144) / 368) * 2) / 2,
        );
    this.cameras.main.setZoom(zoom);
    if (outdoor) {
      const offsetX = width < 600 ? 40 : 0;
      const offsetY = height < 560 ? 0 : width < 600 ? 56 : 96;
      this.cameras.main.setFollowOffset(offsetX, offsetY);
      this.cameras.main.centerOn(
        this.player.x - offsetX,
        this.player.y - offsetY,
      );
    } else if (width < 720 || height < 560) {
      const viewHeight = height / zoom;
      const viewWidth = width / zoom;
      this.cameras.main.setBounds(
        Math.min(0, (this.map.width - viewWidth) / 2),
        Math.min(0, (this.map.height - viewHeight) / 2),
        Math.max(viewWidth, this.map.width),
        Math.max(viewHeight, this.map.height),
      );
      this.cameras.main.startFollow(
        this.player,
        true,
        this.reduced ? 1 : 0.12,
        this.reduced ? 1 : 0.12,
      );
      this.cameras.main.setFollowOffset(0, 0);
      this.cameras.main.centerOn(this.player.x, this.map.height / 2);
    } else {
      this.cameras.main.stopFollow();
      this.cameras.main.removeBounds();
      this.cameras.main.centerOn(this.map.width / 2, this.map.height / 2);
    }
  };
  objectAt(x: number, y: number) {
    return this.map.objects
      .filter((o) => {
        if (this.map.id === "overworld" && o.kind === "building") {
          const facade = this.children.list.find(
            (c) => c.getData("building") === o.id,
          );
          if (facade instanceof Phaser.GameObjects.Image)
            return facade.getBounds().contains(x, y);
        }
        return hitObject(o, x, y);
      })
      .sort(
        (a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y),
      )[0];
  }
  focusChanged = () => {
    // focusout runs before activeElement changes; wait for dialog focus to settle.
    queueMicrotask(() => {
      if (this.sys.isActive() && this.input.keyboard) {
        if (this.isTyping()) this.resetInput();
        this.input.keyboard.enabled = !this.isTyping();
      }
    });
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
      ) ||
      (document.activeElement instanceof HTMLElement &&
        document.activeElement.isContentEditable) ||
      !!useGame.getState().panel
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
    if (
      !obj ||
      Math.hypot(obj.x - this.player.x, obj.y - this.player.y) >
        INTERACTION_RADIUS
    )
      return;
    this.face(obj.x, obj.y);
    unlockSound();
    chime("interact");
    this.path = [];
    this.clickTarget = null;
    this.interacting = true;
    this.cancelledInteraction = false;
    this.response = { id: obj.id, phase: "pending", until: Infinity };
    this.drawState();
    try {
      await this.sync();
      await this.sync();
      const store = useGame.getState();
      if (
        (store.navigation?.mapId === this.map.id || obj.kind === "npc") &&
        store.navigation?.targetId === obj.id
      )
        useGame.setState({ navigation: null });
      // A panel may open while the position request is in flight.
      if (
        store.panel ||
        store.state?.location !== this.map.id ||
        !this.sys.isActive() ||
        Math.hypot(obj.x - this.player.x, obj.y - this.player.y) >
          INTERACTION_RADIUS
      )
        return;
      const interaction = interactionFor(obj, store.state!, serverNow());
      if (interaction.reason) {
        useGame.setState({ notice: interaction.reason });
        return;
      }
      const beforeInventory = { ...store.state!.inventory };
      const ok =
        !interaction.command ||
        (await store.command(interaction.command, { target: obj.id }));
      if (!ok) {
        this.response = {
          id: obj.id,
          phase: "rejected",
          until: this.elapsed + 1200,
        };
        return;
      }
      this.response = {
        id: obj.id,
        phase: "accepted",
        until: this.elapsed + 900,
      };
      this.drawState();
      if (interaction.panel) {
        // Let the physical object respond before the existing panel owns input.
        if (this.map.id === "home" && !this.reduced)
          await new Promise<void>((resolve) => window.setTimeout(resolve, 180));
        if (!this.sys.isActive() || this.cancelledInteraction) return;
        if (!useGame.getState().panel) store.open(interaction.panel, obj);
        return;
      }
      if (!["enter", "exit"].includes(interaction.command || "")) {
        chime("item");
        const inventory = useGame.getState().state!.inventory;
        // Feedback reflects the accepted server snapshot, never invented rewards.
        const gains = Object.entries(inventory)
          .filter(([key, value]) => value > (beforeInventory[key] || 0))
          .map(
            ([key, value]) =>
              `+${value - (beforeInventory[key] || 0)} ${{ wood: "木材", stone: "石料", crop: "萝卜", seed: "种子", gold: "金币" }[key] || key}`,
          );
        this.feedback(
          obj,
          gains.join(" · ") ||
            (interaction.command === "plant"
              ? "已播种"
              : interaction.command === "rest"
                ? "休息片刻 · 已保存"
                : "已记录"),
        );
      }
    } finally {
      if (this.response?.phase === "pending") this.response = null;
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
      y: this.reduced ? obj.y - 44 : obj.y - 70,
      alpha: 0,
      duration: this.reduced ? 300 : 900,
      onComplete: () => label.destroy(),
    });
  }
  updateResidents() {
    const { world, state, panel, selected } = useGame.getState();
    if (!world || !state) return;
    const live = residentPositions(world, state, serverNow());
    for (const npc of this.npcs) {
      const next = live.find((r) => r.id === npc.obj.id)!;
      const vx = next.x - npc.sprite.x,
        vy = next.y - npc.sprite.y;
      Object.assign(npc.obj, next);
      const visible = next.location === this.map.id;
      npc.sprite.setVisible(visible);
      npc.shadow.setVisible(visible);
      npc.bubble.setVisible(false);
      if (!visible) continue;
      const dx = this.player.x - next.x,
        dy = this.player.y - next.y;
      if (next.walking && Math.hypot(vx, vy) > 0.01)
        npc.direction =
          Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 2 : 1) : vy > 0 ? 0 : 3;
      else if (Math.hypot(dx, dy) < 140 || selected?.id === next.id)
        npc.direction =
          Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 2 : 1) : dy > 0 ? 0 : 3;
      npc.sprite
        .setPosition(next.x, next.y)
        .setDepth(next.y)
        .setFrame(
          personFrame(
            npc.direction,
            next.walking && !this.reduced
              ? Math.floor(this.elapsed / 180) % 4
              : 0,
          ),
        );
      npc.shadow.setPosition(next.x, next.y - 1).setDepth(next.y - 1);
      const closest = live
        .filter((r) => r.location === this.map.id)
        .sort(
          (a, b) =>
            Math.hypot(a.x - this.player.x, a.y - this.player.y) -
            Math.hypot(b.x - this.player.x, b.y - this.player.y),
        )[0];
      if (!panel && closest?.id === next.id && Math.hypot(dx, dy) < 128)
        npc.bubble
          .setPosition(next.x, next.y - 44)
          .setText(next.activity)
          .setVisible(true);
    }
    this.map.objects = [
      ...this.map.objects.filter((o) => o.kind !== "npc"),
      ...this.npcs
        .filter((n) => n.obj.location === this.map.id)
        .map((n) => n.obj),
    ];
    if (this.clickTarget?.kind === "npc") {
      const npc = this.npcs.find((n) => n.obj.id === this.clickTarget?.id);
      if (npc && npc.obj.location !== this.map.id) {
        this.clickTarget = null;
        this.path = [];
      } else if (
        npc &&
        this.path.length &&
        Math.hypot(
          this.path[this.path.length - 1].x - npc.obj.x,
          this.path[this.path.length - 1].y - npc.obj.y,
        ) > 48 &&
        this.elapsed % 500 < 40
      )
        this.path = pathfind(this.map, this.player, npc.obj);
    }
  }
  step(delta: number) {
    if (!this.player || this.transitioning) return;
    const night = useGame.getState().state?.world_clock?.last_night;
    if (night && night.at > (this.lastMorning || 0)) {
      this.lastMorning = night.at;
      const state = useGame.getState().state!;
      this.path = [];
      this.clickTarget = null;
      this.hovered = null;
      this.touch = { x: 0, y: 0 };
      this.input.keyboard?.resetKeys();
      if (state.location === this.map.id) {
        this.player.setPosition(state.position.x, state.position.y);
        this.synced = { ...state.position };
        this.lastSync = this.elapsed;
      }
    }
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
      document.hidden ||
      !navigator.onLine ||
      villageClock(useGame.getState().state!, serverNow()).minute === 60;
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
      this.hovered = null;
      this.input.setDefaultCursor("default");
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
    const previousX = this.player.x,
      previousY = this.player.y;
    if (walkable(this.map, this.player.x + dx * distance, this.player.y))
      this.player.x += dx * distance;
    if (walkable(this.map, this.player.x, this.player.y + dy * distance))
      this.player.y += dy * distance;
    if (Math.abs(dx) > 0.2) this.direction = dx > 0 ? 2 : 1;
    else if (Math.abs(dy) > 0.2) this.direction = dy > 0 ? 0 : 3;
    const moved =
      Math.hypot(this.player.x - previousX, this.player.y - previousY) > 0.01;
    this.player
      .setFrame(
        personFrame(
          this.direction,
          moved ? Math.floor(this.elapsed / 130) % 4 : 0,
        ),
      )
      .setDepth(this.player.y + 1);
    this.shadow
      .setPosition(this.player.x, this.player.y - 1)
      .setDepth(this.player.y - 1);
    if (moved && !blocked && this.elapsed - this.lastFootstep > 290) {
      this.lastFootstep = this.elapsed;
      chime("step");
    }
    this.updateResidents();
    if (this.elapsed - this.lastSync > 120 && !this.pending) {
      this.lastSync = this.elapsed;
      void this.sync();
    }
    const nearest = this.map.objects
      .map((o) => ({
        o,
        d: Math.hypot(o.x - this.player.x, o.y - this.player.y),
      }))
      .sort(
        (a, b) =>
          a.d - b.d || Number(b.o.kind === "npc") - Number(a.o.kind === "npc"),
      )[0];
    useGame
      .getState()
      .setNearest(
        nearest && nearest.d <= INTERACTION_RADIUS ? nearest.o : null,
      );
    if (!this.path.length && this.clickTarget && !blocked) {
      const target = this.clickTarget;
      this.clickTarget = null;
      if (
        Math.hypot(target.x - this.player.x, target.y - this.player.y) <=
        INTERACTION_RADIUS
      )
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
    if (this.response && this.response.until < this.elapsed)
      this.response = null;
    if (this.map.id === "overworld") {
      const hour = villageClock(state, now).minute / 60;
      const night =
        hour >= 20 || hour < 6 ? 0.32 : hour >= 18 ? (hour - 18) * 0.16 : 0;
      this.villageLight
        .clear()
        .fillStyle(0x293e50, night)
        .fillRect(0, 0, this.map.width, this.map.height);
      if (night > 0)
        for (const door of this.map.objects.filter(
          (o) => o.kind === "building",
        ))
          this.villageLight
            .fillStyle(0xffd894, night * 0.9)
            .fillEllipse(door.x, door.y - 4, 64, 30);
      updateVillageObjects(this, state, now);
      updateVillageCanopies(this, this.player.x, this.player.y);
    } else
      updateInteriorPresentation(
        this,
        store.panel
          ? store.selected?.id
          : this.response?.phase === "accepted"
            ? this.response.id
            : undefined,
      );
    for (const obj of this.map.objects) {
      const layer = this.objectLayers.get(obj.id);
      if (layer) {
        layer.clear();
        if (
          (this.map.id !== "overworld" || !hasVillageObjectArt(obj)) &&
          obj.id !== "guild_board"
        )
          objectArt(layer, obj, state, now);
        if (this.map.id === "overworld" && obj.id === "home")
          homeObjectResponse(
            layer,
            obj,
            (store.selected?.id === obj.id && !!store.panel) ||
              (this.response?.id === obj.id &&
                this.response.phase === "accepted"),
          );
      }
    }
    if (state.xp > this.lastXp && !store.panel) {
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
    if (!store.panel) this.lastXp = state.xp;
    this.cameras.main.setLerp(this.reduced ? 1 : 0.12, this.reduced ? 1 : 0.12);
    this.water.clear();
    if (this.map.id === "overworld") {
      this.water.lineStyle(1, 0x9dc9bd, 0.5);
      for (let i = 0; i < 50; i++) {
        const y = Math.floor(
          (i * 29 + (this.reduced ? 0 : this.elapsed / 170)) % 1280,
        );
        if ((y < 310 || y > 398) && (y < 862 || y > 950))
          this.water.lineBetween(458 + (i % 3) * 12, y, 462 + (i % 3) * 12, y);
      }
      for (let i = 0; i < 12; i++) {
        const y = 878 + i * 12;
        this.water.lineBetween(1200 + (i % 3) * 40, y, 1220 + (i % 3) * 40, y);
      }
    }
    this.smoke.clear();
    if (this.map.id === "overworld") {
      for (const obj of this.map.objects.filter((o) => o.kind === "building")) {
        // Retain the existing level marker; no new upgrade states in this pass.
        updateVillageBuilding(this, obj, state.buildings[obj.id] || 1);
        if (!this.reduced && obj.id === "home") {
          const [x, y, w] = obj.rect!;
          for (let i = 0; i < 3; i++) {
            const drift = (this.elapsed / 80 + i * 13) % 42;
            this.smoke.fillStyle(0xf2edca, 0.25 * (1 - drift / 42));
            this.smoke.fillRect(
              Math.round(
                (obj.id === "home" ? 204 : x + w - 22) +
                  Math.sin(drift / 10) * 4,
              ),
              Math.round((obj.id === "home" ? 80 : y - 18) - drift),
              2 + i,
              2 + i,
            );
          }
        }
      }
    }
    this.marker.clear();
    const near = this.hovered || store.nearest;
    const highlighted = near && !store.panel;
    for (const npc of this.npcs) {
      if (highlighted && npc.obj.id === near.id) npc.sprite.setTint(0xffefc1);
      else npc.sprite.clearTint();
    }
    if (highlighted) {
      const available = !interactionFor(near, state, now).reason;
      const local =
        this.map.id === "home" ||
        (this.map.id === "overworld" && near.x < 432 && near.y < 600);
      if (local) {
        const [x, y, w, h] =
          near.hitbox ||
          (near.kind === "building"
            ? [near.x - 20, near.y - 26, 40, 20]
            : [near.x - 24, near.y - 22, 48, 32]);
        const color =
          this.response?.id === near.id && this.response.phase === "rejected"
            ? 0xe4a18c
            : available
              ? 0xf4efde
              : 0xbdc6b1;
        for (const [xx, yy, dx, dy] of [
          [x - 4, y - 4, 1, 1],
          [x + w + 2, y - 4, -1, 1],
          [x - 4, y + h + 2, 1, -1],
          [x + w + 2, y + h + 2, -1, -1],
        ]) {
          box(this.marker, 0x27392f, dx > 0 ? xx - 2 : xx - 8, yy - 2, 12, 6);
          box(this.marker, color, dx > 0 ? xx : xx - 6, yy, 6, 2);
          box(this.marker, color, xx, dy > 0 ? yy : yy - 6, 2, 6);
        }
        if (
          this.response?.id === near.id &&
          this.response.phase === "pending"
        ) {
          for (let i = 0; i < 3; i++)
            box(this.marker, color, near.x - 6 + i * 6, y - 10, 2, 2);
        }
      } else {
        this.marker.fillStyle(available ? 0xffe5a0 : 0xc1c7a7, 0.14);
        this.marker.fillEllipse(near.x, near.y + 2, 44, 18);
        this.marker.lineStyle(1, available ? 0xffebb0 : 0xc1c7a7, 0.9);
        this.marker.strokeEllipse(near.x, near.y + 2, 44, 18);
      }
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
        y = obj.y - (obj.kind === "npc" ? 49 : 48),
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
      // A small pixel chevron reads as a destination, without giant target rings.
      const y = obj.y - (obj.kind === "building" ? 20 : 38) - Math.round(pulse);
      box(this.marker, 0x493d2b, obj.x - 6, y - 1, 12, 5);
      box(this.marker, 0xffe6a0, obj.x - 5, y, 10, 3);
      box(this.marker, 0xffe6a0, obj.x - 3, y + 3, 6, 2);
      box(this.marker, 0xffe6a0, obj.x - 1, y + 5, 2, 2);
    }
    if (this.path.length) {
      const last = this.path[this.path.length - 1];
      this.marker.lineStyle(1, 0xf9f2d0, 0.6);
      this.marker.strokeCircle(last.x, last.y, 7);
    }
  }
}
