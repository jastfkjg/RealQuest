import Phaser from "phaser";
import type { MapData, WorldObject } from "../types";
import { box, furniture } from "./art";
import { appearances } from "./appearances";

// All source pixels render at 2 world pixels. These frame rectangles are the
// unmodified CC0 sheet; collision and interactive anchors still come from /world.
const frames: Record<string, number[]> = {
  cottage: [0, 0, 64, 48],
  workshop: [128, 0, 64, 48],
  library: [192, 0, 64, 48],
  tree: [0, 160, 32, 32],
  treeSmall: [0, 160, 32, 32],
  pine: [96, 160, 32, 32],
  pineTall: [96, 160, 32, 32],
  treePink: [96, 256, 32, 32],
  shrub: [208, 128, 16, 16],
  bush: [208, 128, 16, 16],
  flowers: [16, 128, 32, 16],
  daisies: [224, 128, 16, 16],
  barrel: [32, 96, 16, 16],
  pot: [16, 96, 16, 16],
  log: [192, 160, 32, 32],
  well: [48, 112, 16, 16],
  bench: [224, 96, 48, 16],
  crates: [96, 96, 32, 32],
  cart: [224, 80, 32, 16],
  laundry: [80, 64, 48, 32],
  boat: [416, 160, 32, 16],
  pebble: [16, 112, 16, 16],
  door: [160, 48, 16, 16],
};
export function preloadVillage(scene: Phaser.Scene) {
  scene.load.image("house-home", "/assets/ninja-adventure/house-home.png");
  scene.load.image(
    "house-library",
    "/assets/ninja-adventure/house-library.png",
  );
  scene.load.image("nature-sheet", "/assets/ninja-adventure/village.png");
  scene.load.image("village-sheet", "/assets/ninja-adventure/tileset.png");
  for (const { id, source } of appearances)
    scene.load.spritesheet(`villager-${id}`, source, {
      frameWidth: 16,
      frameHeight: 16,
    });
}
function registerFrames(scene: Phaser.Scene) {
  const nature = scene.textures.get("nature-sheet");
  if (!nature.has("oak")) nature.add("oak", 0, 64, 96, 32, 32);
  const sheet = scene.textures.get("village-sheet");
  for (const [name, [x, y, w, h]] of Object.entries(frames))
    if (!sheet.has(name)) sheet.add(name, 0, x, y, w, h);
}
function sprite(
  scene: Phaser.Scene,
  name: string,
  x: number,
  y: number,
  depth = y,
) {
  return scene.add
    .image(x, y, "village-sheet", name)
    .setOrigin(0.5, 1)
    .setScale(2)
    .setDepth(depth);
}

// Hand-placed paths and prop clusters, independent of persistent gameplay.
// Small bends soften the village without moving any existing door or resource.
const roads: [number[][], number][] = [
  // Board spur and a farm entrance that skirts, rather than crosses, the plots.
  [
    [
      [256, 272],
      [264, 306],
      [256, 338],
    ],
    28,
  ],
  [
    [
      [32, 350],
      [128, 350],
      [240, 338],
      [368, 350],
      [576, 350],
      [736, 336],
      [896, 350],
      [1152, 350],
      [1376, 340],
      [1584, 350],
      [1800, 350],
    ],
    56,
  ],
  [
    [
      [160, 220],
      [160, 268],
      [144, 310],
      [144, 350],
    ],
    34,
  ],
  [
    [
      [352, 220],
      [352, 268],
      [336, 310],
      [336, 350],
    ],
    32,
  ],
  [
    [
      [704, 218],
      [704, 272],
      [688, 310],
      [704, 340],
    ],
    36,
  ],
  [
    [
      [216, 348],
      [280, 392],
      [280, 552],
      [232, 616],
      [216, 720],
      [216, 904],
      [432, 904],
      [656, 896],
      [832, 904],
      [832, 1008],
      [1104, 1008],
    ],
    40,
  ],
  [
    [
      [1088, 350],
      [1104, 440],
      [1088, 552],
      [1088, 736],
      [1088, 1008],
    ],
    44,
  ],
  [
    [
      [1088, 736],
      [1328, 720],
      [1552, 736],
      [1552, 1104],
      [1408, 1104],
    ],
    32,
  ],
  [
    [
      [216, 1008],
      [352, 1008],
    ],
    32,
  ],
  [
    [
      [1584, 350],
      [1584, 560],
    ],
    28,
  ],
];
const props: [string, number, number][] = [
  ["laundry", 98, 275],
  ["pot", 224, 244],
  ["barrel", 92, 454],
  ["flowers", 94, 218],
  ["flowers", 224, 224],
  ["daisies", 83, 482],
  ["crates", 400, 233],
  ["cart", 394, 282],
  ["bench", 568, 236],
  ["well", 564, 470],
  ["flowers", 647, 222],
  ["flowers", 752, 224],
  ["daisies", 774, 278],
  ["shrub", 550, 178],
  ["crates", 984, 543],
  ["barrel", 1193, 533],
  ["flowers", 992, 605],
  ["boat", 1263, 997],
  ["bush", 1141, 885],
  ["daisies", 1128, 933],
];
export function village(scene: Phaser.Scene, map: MapData) {
  registerFrames(scene);
  if (!scene.textures.exists("village-ground")) {
    const canvas = document.createElement("canvas");
    canvas.width = map.width;
    canvas.height = map.height;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#559653";
    ctx.fillRect(0, 0, map.width, map.height);
    let seed = 8317;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    // Quiet broad terrain variation, never a random color per tile.
    for (let i = 0; i < 180; i++) {
      const x = Math.floor((random() * map.width) / 2) * 2,
        y = Math.floor((random() * map.height) / 2) * 2;
      ctx.fillStyle = i % 2 ? "#5b9b55" : "#509151";
      const w = 32 + Math.floor(random() * 60) * 2,
        h = 14 + Math.floor(random() * 22) * 2;
      ctx.fillRect(x + 8, y, w - 16, h);
      ctx.fillRect(x, y + 6, w, h - 12);
    }
    for (let i = 0; i < 2900; i++) {
      const x = Math.floor((random() * map.width) / 2) * 2,
        y = Math.floor((random() * map.height) / 2) * 2;
      ctx.fillStyle = i % 4 ? "#518c50" : "#6ca15b";
      ctx.fillRect(x, y, 2, 4);
      ctx.fillRect(x + 2, y + 2, 2, 2);
    }
    const roadMask = document.createElement("canvas");
    roadMask.width = map.width;
    roadMask.height = map.height;
    const mask = roadMask.getContext("2d")!;
    const stamp = (x: number, y: number, radius: number) => {
      x = Math.round(x / 2) * 2;
      y = Math.round(y / 2) * 2;
      mask.fillStyle = "#a08150";
      mask.fillRect(x - radius + 6, y - radius, radius * 2 - 12, radius * 2);
      mask.fillRect(x - radius, y - radius + 6, radius * 2, radius * 2 - 12);
    };
    roads.forEach(([points, width], r) => {
      for (let i = 1; i < points.length; i++) {
        const [ax, ay] = points[i - 1],
          [bx, by] = points[i],
          distance = Math.hypot(bx - ax, by - ay);
        for (let n = 0; n <= distance; n += 4)
          stamp(
            ax + ((bx - ax) * n) / distance,
            ay + ((by - ay) * n) / distance,
            Math.round(width / 2 + Math.sin(n / 24 + r) * 3),
          );
      }
    });
    // A modest meeting place between the library and the bridge.
    stamp(624, 344, 60);
    ctx.drawImage(roadMask, 0, 0);
    mask.globalCompositeOperation = "source-in";
    mask.fillStyle = "#dfb57b";
    mask.fillRect(0, 0, map.width, map.height);
    const pixels = mask.getImageData(0, 0, map.width, map.height).data;
    for (let y = 0; y < map.height; y += 2)
      for (let x = 0; x < map.width; x += 2) {
        const at = (y * map.width + x) * 4;
        if (!pixels[at + 3]) continue;
        if (
          x > 1 &&
          y > 1 &&
          x < map.width - 3 &&
          y < map.height - 3 &&
          pixels[at - 8 + 3] &&
          pixels[at + 8 + 3] &&
          pixels[at - map.width * 8 + 3] &&
          pixels[at + map.width * 8 + 3]
        ) {
          ctx.fillStyle = "#edc68d";
          ctx.fillRect(x, y, 2, 2);
          if (random() > 0.99) {
            ctx.fillStyle = "#c79c63";
            ctx.fillRect(x, y, 4, 2);
          }
        }
      }
    // River's visible body matches the authoritative collision footprint.
    ctx.fillStyle = "#347f91";
    ctx.fillRect(448, 0, 64, map.height);
    for (let y = 0; y < map.height; y += 8) {
      const edge = 4 + Math.round((Math.sin(y / 43) + 1) * 3) * 2;
      ctx.fillStyle = "#c4aa6d";
      ctx.fillRect(448 - edge - 4, y, edge + 4, 8);
      ctx.fillRect(512, y, edge + 4, 8);
      ctx.fillStyle = "#376f47";
      ctx.fillRect(444 - edge - 4, y, 4, 8);
      ctx.fillRect(516 + edge, y, 4, 8);
      ctx.fillStyle = "#4597a6";
      ctx.fillRect(454, y, 50, 8);
      ctx.fillStyle = "#67b3b8";
      ctx.fillRect(448, y, 4, 8);
    }
    for (const [x, y, w, h] of [
      [1184, 864, 224, 176],
      [1232, 816, 128, 48],
      [1232, 1040, 128, 32],
    ]) {
      ctx.fillStyle = "#357548";
      ctx.fillRect(x - 8, y - 8, w + 16, h + 16);
      ctx.fillStyle = "#d0b781";
      ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
      ctx.fillStyle = "#4597a6";
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = "#68b3ba";
      ctx.fillRect(x, y, 4, h);
    }
    scene.textures.addCanvas("village-ground", canvas);
  }
  scene.add.image(0, 0, "village-ground").setOrigin(0).setDepth(-1000);
  const g = scene.add.graphics().setDepth(-900);
  // Bridges remain precisely aligned with the two safe river crossings.
  for (const y of [320, 872]) {
    box(g, 0x543e30, 430, y - 4, 100, 72);
    for (let yy = y; yy < y + 64; yy += 8) {
      box(g, 0xa46f47, 430, yy, 100, 7);
      box(g, 0xd2a16a, 432, yy, 96, 2);
      box(g, 0x825538, 444 + (yy % 3) * 16, yy + 4, 18, 2);
    }
    for (const yy of [y - 8, y + 62]) {
      box(g, 0x725038, 426, yy, 108, 6);
      box(g, 0xd8a56d, 426, yy, 108, 2);
      for (const xx of [426, 474, 528]) {
        box(g, 0x634431, xx, yy - 8, 6, 20);
        box(g, 0xe1b678, xx, yy - 10, 6, 4);
      }
    }
  }
  for (const [x, y, length] of [
    [82, 405, 164],
    [82, 523, 90],
    [254, 523, 42],
    [978, 592, 82],
    [1132, 592, 80],
  ]) {
    for (let xx = x; xx < x + length; xx += 24) {
      box(g, 0x674830, xx, y, 6, 24);
      box(g, 0xd7a667, xx + 2, y, 2, 22);
      box(g, 0xa47a4b, xx, y + 6, 24, 4);
      box(g, 0xcea36a, xx, y + 6, 24, 2);
      box(g, 0x93633e, xx, y + 16, 24, 3);
    }
  }
  for (let y = 957; y < 1004; y += 8) {
    box(g, 0x745039, 1118, y, 94, 8);
    box(g, 0xc1945a, 1120, y, 90, 6);
  }
  for (const [x, y] of map.trees) {
    const frame =
      x > 1232
        ? x % 3
          ? "pineTall"
          : "pine"
        : x % 7 === 0
          ? "treeSmall"
          : "tree";
    scene.add.ellipse(x + 6, y + 2, 58, 16, 0x284d38, 0.18).setDepth(-850);
    if (frame === "tree" || frame === "treeSmall")
      scene.add
        .image(x, y + 12, "nature-sheet", "oak")
        .setOrigin(0.5, 1)
        .setScale(2)
        .setDepth(y + 12);
    else sprite(scene, frame, x, y + 12, y + 12);
  }
  // Low plants make the nearby gathering spot legible without introducing new
  // colliders or hiding its authoritative anchor. The main road stays clear.
  sprite(scene, "shrub", 382, 302);
  sprite(scene, "flowers", 348, 398, -850);
  // A flowering tree marks the farm; its trunk uses an existing tree collider.
  const pink = map.trees.find(([x, y]) => x === 304 && y === 568);
  if (pink) sprite(scene, "treePink", pink[0], pink[1] + 12, pink[1] + 13);
  for (const [name, x, y] of props)
    sprite(scene, name, x, y, ["flowers", "daisies"].includes(name) ? -850 : y);
  // Clothes hang from the imported line beside the cottage.
  box(g, 0xeee3ba, 86, 240, 16, 18);
  box(g, 0xf8f0d2, 82, 240, 24, 6);
  box(g, 0x628d98, 116, 240, 14, 20);
  box(g, 0x416c79, 122, 249, 2, 11);
  // Sparse curated plant groups: no props on the main path or at door anchors.
  for (const [x, y] of [
    [60, 570],
    [272, 590],
    [346, 618],
    [570, 98],
    [768, 80],
    [837, 238],
    [796, 477],
    [936, 524],
    [1208, 660],
    [1520, 464],
    [1640, 593],
    [1080, 1090],
  ]) {
    sprite(scene, "shrub", x, y, y);
    sprite(scene, "daisies", x + 35, y + 12, -850);
  }
  for (const obj of map.objects.filter((o) => o.kind === "building")) {
    const [x, y, w, h] = obj.rect!;
    scene.add
      .ellipse(x + w / 2 + 6, y + h - 2, w + 20, 20, 0x284d38, 0.2)
      .setDepth(-850);
    const name =
      obj.id === "home"
        ? "cottage"
        : obj.id === "workshop"
          ? "workshop"
          : "library";
    const house =
      obj.id === "home" || obj.id === "library"
        ? scene.add
            .image(x + w / 2, y + h, `house-${obj.id}`)
            .setOrigin(0.5, 1)
            .setScale(2)
            .setDepth(obj.y - 15)
        : sprite(scene, name, x + w / 2, y + h, obj.y - 15);
    if (obj.id === "guild") house.setScale(2).setTint(0xe8d8b5);

    house.setData("building", obj.id);
    sprite(scene, "door", x + w / 2, y + h - 2, obj.y - 14);
    // Stone step and a small profession sign, readable without text labels.
    box(g, 0x8b876d, x + w / 2 - 18, y + h, 36, 6);
    box(g, 0xd2c39a, x + w / 2 - 16, y + h, 32, 2);
    const sign = scene.add.graphics().setDepth(obj.y - 10);
    box(sign, 0x68472e, x + w - 10, y + h - 36, 25, 22);
    box(sign, 0xd9b57a, x + w - 8, y + h - 34, 21, 18);
    if (obj.id === "workshop") {
      box(sign, 0x6d7c77, x + w - 4, y + h - 30, 14, 5);
      box(sign, 0x775436, x + w + 1, y + h - 28, 4, 10);
    } else if (obj.id === "library") {
      box(sign, 0x668c85, x + w - 4, y + h - 30, 14, 12);
      box(sign, 0xe7d5a8, x + w - 2, y + h - 29, 10, 9);
      box(sign, 0xb09b74, x + w + 3, y + h - 29, 2, 9);
    } else if (obj.id === "guild") {
      box(sign, 0xad653e, x + w + 2, y + h - 31, 3, 12);
      box(sign, 0x66845b, x + w + 5, y + h - 31, 8, 6);
    } else {
      box(sign, 0x68854c, x + w + 2, y + h - 28, 3, 9);
      box(sign, 0x8faa5d, x + w - 3, y + h - 30, 12, 5);
    }
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
  if (level > 1 && !house.getData("upgrade")) {
    const g = scene.add.graphics().setDepth(obj.y - 5);
    furniture(g, "plant", [
      obj.rect![0] - 22,
      obj.rect![1] + obj.rect![3] - 25,
      24,
      28,
    ]);
    house.setData("upgrade", g);
  }
}
