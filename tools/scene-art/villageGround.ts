import type { PaintScene } from "./types";
import type { MapData } from "../../shared/game/protocol";

const roads: [number[][], number][] = [
  [[[960, 350], [960, 720], [832, 720], [832, 688]], 32],
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

/** Two art pixels per world unit, independent of the unchanged gameplay grid. */
export function villageGround(scene: PaintScene, map: MapData) {
  if (!scene.textures.exists("village-ground-v2")) {
    const canvas = document.createElement("canvas");
    canvas.width = map.width * 2;
    canvas.height = map.height * 2;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.scale(2, 2);
    let seed = 8317;
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    ctx.fillStyle = "#78955e";
    ctx.fillRect(0, 0, map.width, map.height);
    // Broad quiet color regions, followed by small clustered blades. No carpet
    // of flowers or one independently colored square per terrain tile.
    for (let i = 0; i < 1200; i++) {
      const x = Math.floor(random() * map.width),
        y = Math.floor(random() * map.height);
      const w = 8 + Math.floor(random() * 32),
        h = 3 + Math.floor(random() * 12);
      ctx.fillStyle = ["#75925c", "#7b9761", "#72905b", "#809a63"][i % 4];
      ctx.fillRect(x + 3, y, w - 6, h);
      ctx.fillRect(x, y + 2, w, Math.max(1, h - 4));
    }
    for (let i = 0; i < 18500; i++) {
      const x = Math.floor(random() * map.width),
        y = Math.floor(random() * map.height);
      ctx.fillStyle = ["#6e8e55", "#829e64", "#8ca56b", "#668653"][i % 4];
      ctx.fillRect(x, y, 1 + (i % 3), 1);
      if (i % 4 === 0) ctx.fillRect(x + 1, y - 2, 1, 2);
    }
    const road = document.createElement("canvas");
    road.width = map.width;
    road.height = map.height;
    const r = road.getContext("2d")!;
    r.strokeStyle = "#fff";
    r.fillStyle = "#fff";
    r.lineCap = "round";
    r.lineJoin = "round";
    for (const [points, width] of roads) {
      r.lineWidth = width;
      r.beginPath();
      points.forEach(([x, y], i) => (i ? r.lineTo(x, y) : r.moveTo(x, y)));
      r.stroke();
    }
    r.beginPath();
    r.ellipse(624, 344, 59, 44, 0, 0, Math.PI * 2);
    r.fill();
    const mask = r.getImageData(0, 0, map.width, map.height).data;
    const inside = (x: number, y: number) =>
      x >= 0 &&
      y >= 0 &&
      x < map.width &&
      y < map.height &&
      mask[(y * map.width + x) * 4 + 3] > 128;
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        if (!inside(x, y)) continue;
        const edge =
          !inside(x - 2, y) ||
          !inside(x + 2, y) ||
          !inside(x, y - 2) ||
          !inside(x, y + 2);
        ctx.fillStyle = edge
          ? (x + y) % 5
            ? "#b3a16d"
            : "#9c9863"
          : "#dfc28d";
        ctx.fillRect(x, y, 1, 1);
        // Tiny broken grass tufts at the verge, not a continuous dark stroke.
        if (edge && random() > 0.78) {
          ctx.fillStyle = "#8f9d62";
          ctx.fillRect(x, y - 1, 1, 2);
        }
      }
    }
    for (let i = 0; i < 4000; i++) {
      const x = Math.floor(random() * map.width),
        y = Math.floor(random() * map.height);
      if (!inside(x, y)) continue;
      ctx.fillStyle = i % 3 ? "#c5a777" : "#eeddad";
      ctx.fillRect(x, y, i % 4 === 0 ? 2 : 1, 1);
      if (i % 19 === 0) {
        ctx.fillStyle = "#a8a18a";
        ctx.fillRect(x, y, 3, 2);
        ctx.fillStyle = "#d4c9ab";
        ctx.fillRect(x, y, 2, 1);
      }
    }
    // Water always matches the authoritative footprint, including both bridges.
    ctx.fillStyle = "#367e85";
    ctx.fillRect(448, 0, 64, map.height);
    for (let y = 0; y < map.height; y++) {
      const wobble = Math.round(Math.sin(y / 17) * 2 + Math.sin(y / 43) * 2);
      for (const [x, side] of [
        [448, -1],
        [512, 1],
      ]) {
        ctx.fillStyle = "#667f5d";
        ctx.fillRect(x + (side < 0 ? -9 + wobble : 0), y, 9, 1);
        ctx.fillStyle = "#b7b28d";
        ctx.fillRect(x + (side < 0 ? -5 : 0), y, 5, 1);
        ctx.fillStyle = "#6baba5";
        ctx.fillRect(x + (side < 0 ? 0 : -3), y, 3, 1);
      }
    }
    for (let i = 0; i < 2700; i++) {
      const x = 451 + Math.floor(random() * 57),
        y = Math.floor(random() * map.height);
      ctx.fillStyle = ["#3c898e", "#418f94", "#4b999d", "#397e86"][i % 4];
      ctx.fillRect(x, y, 2 + (i % 5), 1 + (i % 3 === 0 ? 1 : 0));
      if (i % 12 === 0) {
        ctx.fillStyle = "#31717b";
        ctx.fillRect(x, y, 3, 2);
        ctx.fillStyle = "#5d9998";
        ctx.fillRect(x, y, 2, 1);
      }
    }
    // Sparse stones/reeds on the banks; their small footprint stays off routes.
    for (let y = 10; y < map.height; y += 23) {
      if ((y > 307 && y < 398) || (y > 859 && y < 950)) continue;
      for (const [base, dy] of [
        [442, 0],
        [515, 11],
      ]) {
        const x = base + Math.round(Math.sin(y / 19) * 2);
        const yy = y + dy;
        ctx.fillStyle = "#6b8170";
        ctx.fillRect(x - 2, yy + 2, 6, 3);
        ctx.fillStyle = "#a3ad8d";
        ctx.fillRect(x - 2, yy, 5, 3);
        ctx.fillStyle = "#c3c4a0";
        ctx.fillRect(x - 1, yy, 3, 1);
        if (y % 3 === 0) {
          ctx.fillStyle = "#638052";
          ctx.fillRect(x + 1, yy - 4, 1, 6);
          ctx.fillStyle = "#9ca96a";
          ctx.fillRect(x + 3, yy - 7, 1, 8);
        }
      }
    }
    for (const [x, y, w, h] of [
      [1184, 864, 224, 176],
      [1232, 816, 128, 48],
      [1232, 1040, 128, 32],
    ]) {
      ctx.fillStyle = "#87966b";
      ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
      ctx.fillStyle = "#aab391";
      ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
      ctx.fillStyle = "#418b91";
      ctx.fillRect(x, y, w, h);
      for (let i = 0; i < 220; i++) {
        ctx.fillStyle = i % 2 ? "#509b9d" : "#3b818b";
        ctx.fillRect(
          x + Math.floor(random() * w),
          y + Math.floor(random() * h),
          3 + (i % 5),
          1,
        );
      }
    }
    const stampArt = (name: string, x: number, y: number) => {
      const image = scene.textures
        .get(`village-${name}`)
        .getSourceImage() as HTMLImageElement;
      ctx.drawImage(
        image,
        Math.round(x - image.width / 4),
        Math.round(y - image.height / 2),
        image.width / 2,
        image.height / 2,
      );
    };
    // Cluster detail at verges, trees and banks. Open lawns are quieter than the
    // concept; sampled tufts do not fabricate harvestable plants or colliders.
    for (let i = 0; i < 3400; i++) {
      const x = Math.floor(random() * map.width),
        y = Math.floor(random() * map.height);
      if (
        inside(x, y) ||
        inside(x - 9, y) ||
        inside(x + 9, y) ||
        inside(x, y - 7) ||
        (x > 431 && x < 529)
      )
        continue;
      if (
        map.obstacles.some(
          ([ox, oy, w, h]) =>
            x > ox - 6 && x < ox + w + 6 && y > oy - 4 && y < oy + h + 8,
        )
      )
        continue;
      const verge =
        inside(x - 23, y) ||
        inside(x + 23, y) ||
        inside(x, y - 19) ||
        inside(x, y + 19);
      const tree = map.trees.some(
        ([tx, ty]) => Math.hypot(x - tx, y - ty) < 48,
      );
      if (!verge && !tree && i % 5) continue;
      stampArt(i % 4 === 0 ? "grass-patch" : "grass", x, y);
    }
    for (let y = 48; y < map.height; y += 71) {
      if ((y > 295 && y < 410) || (y > 847 && y < 961)) continue;
      stampArt("bank-stones", y % 2 ? 438 : 522, y);
      stampArt("grass", y % 2 ? 526 : 432, y + 9);
    }
    // Fine stepping stones retain the original home approach and door anchor.
    for (let i = 0; i < 6; i++) {
      const x = 159 - Math.max(0, i - 1) * 3,
        y = 224 + i * 21;
      stampArt("step", x, y);
    }
    scene.textures.addCanvas("village-ground-v2", canvas);
  }
  scene.add
    .image(0, 0, "village-ground-v2")
    .setOrigin(0)
    .setScale(0.5)
    .setDepth(-1000);
}
