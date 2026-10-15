import Phaser from "phaser";
import type { GameState, MapData, WorldObject } from "../types";
import { appearances } from "./appearances";
import { villageGround } from "./villageGround";

const scenery = [
  "home",
  "workshop",
  "library",
  "guild",
  "oak",
  "oak-alt",
  "fir",
  "birch",
  "shrub",
  "flowers",
  "crates",
  "bench",
  "board",
  "wood",
  "stone",
  "bridge",
  "grass",
  "grass-patch",
  "bank-stones",
  "step",
  "fence",
  "lantern",
  "chest",
  "rune",
];
export const ACTOR_FRAME = {
  width: 48,
  height: 64,
  scale: 2 / 3,
  visibleHeight: 36,
};

export function preloadVillage(scene: Phaser.Scene) {
  for (const name of scenery)
    scene.load.image(
      `village-${name}`,
      `/assets/hearthwood/village/${name}.png`,
    );
  for (const { id, source } of appearances)
    scene.load.spritesheet(`villager-${id}`, source, {
      frameWidth: ACTOR_FRAME.width,
      frameHeight: ACTOR_FRAME.height,
    });
  for (const id of ["noah", "lia"])
    scene.load.spritesheet(
      `villager-${id}`,
      `/assets/hearthwood/village/actor-${id}.png`,
      {
        frameWidth: ACTOR_FRAME.width,
        frameHeight: ACTOR_FRAME.height,
      },
    );
}
function sprite(
  scene: Phaser.Scene,
  name: string,
  x: number,
  y: number,
  depth = y,
) {
  return scene.add
    .image(x, y, `village-${name}`)
    .setOrigin(0.5, 1)
    .setScale(0.5)
    .setDepth(depth);
}

export function village(scene: Phaser.Scene, map: MapData) {
  villageGround(scene, map);
  // Two native scenery pixels per world unit. Foot anchors and colliders
  // stay fixed; tall roofs/canopies are separately sorted from the ground.
  for (const [i, [x, y]] of map.trees.entries()) {
    const frame =
      x > 1232 ? "fir" : i % 7 === 0 ? "birch" : i % 2 ? "oak-alt" : "oak";
    scene.add.ellipse(x + 5, y + 5, 56, 15, 0x314e3e, 0.17).setDepth(-850);
    sprite(scene, frame, x, y + 12, y + 10).setData("canopy", true);
  }
  for (const y of [320, 872]) {
    sprite(scene, "bridge", 480, y + 68, -900);
  }
  // Curated existing prop clusters. Only five small flower clumps in the
  // settlement; paths and resource anchors remain unplanted and readable.
  for (const [name, x, y] of [
    ["crates", 405, 231],
    ["bench", 568, 236],
    ["shrub", 550, 178],
    ["shrub", 382, 302],
    ["shrub", 80, 218],
    ["shrub", 222, 220],
    ["shrub", 88, 286],
    ["shrub", 768, 80],
    ["shrub", 796, 477],
    ["shrub", 936, 524],
    ["shrub", 1208, 660],
    ["flowers", 90, 220],
    ["flowers", 226, 220],
    ["flowers", 647, 222],
    ["flowers", 752, 224],
    ["flowers", 348, 398],
    ["crates", 984, 543],
    ["bench", 1130, 586],
    ["fence", 1018, 613],
    ["fence", 1172, 613],
    ["lantern", 1028, 592],
  ] as [string, number, number][])
    sprite(scene, name, x, y, name === "flowers" ? -845 : y);
  for (const obj of map.objects.filter((o) => o.kind === "building")) {
    const [x, y, w, h] = obj.rect!;
    scene.add
      .ellipse(x + w / 2 + 7, y + h, w + 10, 14, 0x2d4438, 0.2)
      .setDepth(-850);
    sprite(scene, obj.id, x + w / 2, y + h, obj.y - 15).setData(
      "building",
      obj.id,
    );
  }
  for (const obj of map.objects) {
    if (!["wood", "stone", "board", "chest", "event"].includes(obj.kind))
      continue;
    sprite(
      scene,
      obj.kind === "event" ? "rune" : obj.kind,
      obj.x,
      obj.y + (obj.kind === "board" ? 5 : 4),
      obj.y,
    ).setData("worldObject", obj.id);
  }
}

/** Original rewards, gathering cooldown and server rejection govern visibility. */
export function updateVillageObjects(
  scene: Phaser.Scene,
  state: GameState,
  now: number,
) {
  for (const child of scene.children.list) {
    if (!(child instanceof Phaser.GameObjects.Image)) continue;
    const id = child.getData("worldObject");
    if (id) {
      child.setVisible(!((state.gathered[id] || 0) > now));
      child.setAlpha(state.events.includes("opened_" + id) ? 0.65 : 1);
      if (id === "ruins" && state.events.includes("rune_awakened"))
        child.setTint(0xffe9b0);
    }
  }
}
export function hasVillageObjectArt(obj: WorldObject) {
  return ["wood", "stone", "board", "chest", "event"].includes(obj.kind);
}

export function updateVillageCanopies(
  scene: Phaser.Scene,
  x: number,
  y: number,
) {
  for (const child of scene.children.list) {
    if (
      !(child instanceof Phaser.GameObjects.Image) ||
      !child.getData("canopy")
    )
      continue;
    const behind =
      y < child.y &&
      y > child.y - child.displayHeight - 8 &&
      Math.abs(x - child.x) < child.displayWidth / 2 - 4;
    child.setAlpha(behind ? 0.45 : 1);
  }
}
export function updateVillageBuilding(
  scene: Phaser.Scene,
  obj: WorldObject,
  level: number,
) {
  const house = scene.children.list.find(
    (c) => c.getData("building") === obj.id,
  );
  if (!house || house.getData("level") === level) return;
  house.setData("level", level);
  // Retain the existing, modest upgrade plant without claiming a new facade tier.
  if (level > 1 && !house.getData("upgrade")) {
    house.setData(
      "upgrade",
      sprite(
        scene,
        "shrub",
        obj.rect![0] - 10,
        obj.rect![1] + obj.rect![3] + 3,
        obj.y - 5,
      ),
    );
  }
}
