import type { MapData } from "../../shared/game/protocol";
import type { PaintScene } from "./types";
import { villageGround } from "./villageGround";

function sprite(
  scene: PaintScene,
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

export function village(scene: PaintScene, map: MapData) {
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
  sprite(scene, "board", 1816, 352);
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
    // Depth follows the solid facade, not the interaction anchor in front of it.
    // An actor standing on the doorstep must render in front of the whole house.
    sprite(scene, obj.id, x + w / 2, y + h, y + h).setData("building", obj.id);
  }
  // Supplies connect the shop to the village path without a floating text sign.
  const shop = map.objects.find((o) => o.id === "shop");
  if (shop) {
    sprite(scene, "crates", 904, 690, 676);
    sprite(scene, "lantern", 758, 690, 676);
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

