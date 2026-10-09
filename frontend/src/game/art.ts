import Phaser from "phaser";
import type { MapData, WorldObject } from "../types";
type G = Phaser.GameObjects.Graphics;
export const box = (
  g: G,
  c: number,
  x: number,
  y: number,
  w: number,
  h: number,
) => {
  g.fillStyle(c);
  g.fillRect(Math.round(x), Math.round(y), w, h);
};
function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}
const shade = (c: number, n: number) =>
  Phaser.Display.Color.GetColor(
    Math.max(0, Math.min(255, (c >> 16) + n)),
    Math.max(0, Math.min(255, ((c >> 8) & 255) + n)),
    Math.max(0, Math.min(255, (c & 255) + n)),
  );

export function makeSprites(scene: Phaser.Scene) {
  for (let style = 0; style < 3; style++)
    for (let dir = 0; dir < 4; dir++)
      for (let step = 0; step < 4; step++) {
        const g = scene.make.graphics({ x: 0, y: 0 });
        const coat = [0xab583e, 0x537b92, 0x896498][style];
        const stride = [0, 2, 0, -2][step];
        box(g, 0x3d3940, 8, 29, 6, 8 + stride);
        box(g, 0x3d3940, 18, 29, 6, 8 - stride);
        box(g, 0x594538, 7, 35 + stride, 8, 4);
        box(g, 0x594538, 18, 35 - stride, 8, 4);
        box(g, 0xa48655, 8, 35 + stride, 6, 1);
        box(g, shade(coat, -25), 6, 18, 20, 14);
        box(g, coat, 8, 18, 16, 12);
        box(g, shade(coat, 25), 8, 19, 4, 10);
        box(g, 0xdeaa76, 3, 21 - stride, 5, 10);
        box(g, 0xf0c18d, 3, 22 - stride, 3, 6);
        box(g, 0xdeaa76, 25, 21 + stride, 5, 10);
        box(g, 0x603d32, 7, 3, 19, 18);
        box(g, 0xeab682, 9, 8, 15, 13);
        box(g, 0xf7cb95, 10, 9, 12, 10);
        box(g, 0x754632, 7, 6, 7, 8);
        box(g, 0x754632, 8, 5, 17, 5);
        box(g, 0x9a6240, 11, 6, 9, 2);
        if (dir === 3) {
          box(g, 0x704934, 9, 8, 15, 12);
          box(g, 0x91613e, 10, 9, 6, 7);
        } else {
          const eye = dir === 1 ? 11 : dir === 2 ? 21 : 13;
          box(g, 0x323731, eye, 13, 2, 3);
          if (dir === 0) box(g, 0x323731, 21, 13, 2, 3);
          box(g, 0xcd8d6a, 18, 18, 4, 1);
          box(g, 0xe19d77, 11, 17, 3, 2);
        }
        box(g, 0x967044, 4, 4, 26, 4);
        box(g, 0xe4bf73, 3, 3, 28, 3);
        box(g, 0xf3d695, 8, 0, 17, 3);
        box(g, 0xb18d51, 9, 3, 17, 2);
        box(g, 0xe6c181, 11, 20, 12, 3);
        box(g, 0x5c6841, 22, 21, 6, 10);
        box(g, 0x81915b, 23, 22, 4, 7);
        box(g, 0x825940, 8, 29, 18, 2);
        g.generateTexture(`person-${style}-${dir}-${step}`, 34, 42);
        g.destroy();
      }
}

export function tree(g: G, x: number, y: number, variant = 0) {
  const random = rng(Math.floor(x * 17 + y * 31 + 7));
  g.fillStyle(0x315a37, 0.2);
  g.fillEllipse(x + 7, y + 8, 70, 24);
  box(g, 0x604c33, x - 8, y - 27, 16, 40);
  box(g, 0x916239, x - 5, y - 27, 9, 38);
  box(g, 0xb17b42, x - 4, y - 25, 3, 34);
  box(g, 0x624b34, x - 15, y + 9, 27, 5);
  box(g, 0x916239, x - 10, y + 5, 21, 7);
  box(g, 0x604c33, x + 4, y - 16, 12, 6);
  box(g, 0x916239, x + 8, y - 20, 5, 6);
  const blobs = [
    [-15, -55, 26],
    [11, -65, 29],
    [24, -40, 25],
    [-17, -33, 25],
    [1, -41, 32],
  ];
  const inside = (xx: number, yy: number) =>
    blobs.some(
      ([bx, by, r]) => ((xx - bx) / r) ** 2 + ((yy - by) / (r * 0.8)) ** 2 < 1,
    );
  const palette =
    variant === 1
      ? [0x315b46, 0x3f7550, 0x528a54, 0x72a95e, 0x8fbb6b]
      : [0x375735, 0x4e7039, 0x648d40, 0x85aa4c, 0xa4c466];
  for (let yy = -92; yy < 0; yy += 3)
    for (let xx = -45; xx < 51; xx += 3) {
      if (!inside(xx, yy)) continue;
      const edge =
        !inside(xx - 3, yy) ||
        !inside(xx + 3, yy) ||
        !inside(xx, yy + 3) ||
        !inside(xx, yy - 3);
      let color = edge ? palette[0] : palette[1 + Math.floor(random() * 2)];
      if (!edge && xx + yy < -43 && random() > 0.22) color = palette[3];
      if (!edge && xx + yy < -75 && random() > 0.6) color = palette[4];
      box(g, color, x + xx, y + yy, 3, 3);
    }
  if (variant === 2)
    for (let i = 0; i < 8; i++) {
      const xx = x - 26 + random() * 54,
        yy = y - 70 + random() * 47;
      box(g, 0xae5540, xx, yy, 5, 5);
      box(g, 0xdd8a54, xx, yy, 3, 2);
    }
}
function windowArt(g: G, x: number, y: number, w = 24, h = 26) {
  box(g, 0x634731, x - 3, y - 3, w + 6, h + 7);
  box(g, 0xb88048, x - 1, y - 1, w + 2, h + 3);
  box(g, 0x406c70, x, y, w, h);
  box(g, 0x83bbb3, x + 2, y + 2, w - 4, h - 4);
  box(g, 0xb2d5b9, x + 3, y + 3, w - 7, 5);
  box(g, 0xe9c786, x + w / 2 - 1, y, 3, h);
  box(g, 0xe9c786, x, y + h / 2, w, 3);
  box(g, 0x9c6236, x - 5, y + h + 2, w + 10, 4);
}
export function building(g: G, id: string, r: number[], level: number) {
  const [x, y, w, h] = r,
    random = rng(x + y * 7);
  g.fillStyle(0x3a4c30, 0.24);
  g.fillRect(x + 10, y + 22, w + 14, h - 10);
  box(g, 0x655342, x - 4, y + h - 12, w + 8, 17);
  box(g, 0xb0a27c, x, y + h - 12, w, 12);
  for (let xx = x; xx < x + w; xx += 16) box(g, 0x7a735a, xx, y + h - 9, 1, 8);
  box(g, 0x785139, x, y + 22, w, h - 32);
  box(g, 0xd7b779, x + 4, y + 23, w - 8, h - 39);
  for (let yy = y + 28; yy < y + h - 12; yy += 7) {
    box(g, 0xbc935a, x + 4, yy, w - 8, 1);
    for (let xx = x + 8; xx < x + w - 12; xx += 24)
      if (random() > 0.7) box(g, 0xc09a62, xx, yy + 2, 10, 1);
  }
  box(g, 0x815237, x + 2, y + 22, 6, h - 34);
  box(g, 0x815237, x + w - 8, y + 22, 6, h - 34);
  const roof =
    id === "library" ? 0x4e8791 : id === "guild" ? 0x7c6b95 : 0xb05b3d;
  for (let row = 0; row < 10; row++) {
    const left = x - 12 + row * 6,
      yy = y + 22 - row * 6,
      ww = w + 24 - row * 12;
    box(g, 0x67472f, left - 2, yy, ww + 4, 7);
    box(g, shade(roof, row * 2), left, yy - 1, ww, 5);
    for (let xx = left + (row % 2) * 7; xx < left + ww - 4; xx += 14) {
      box(g, shade(roof, 22), xx, yy, 11, 1);
      box(g, shade(roof, -15), xx + 11, yy + 1, 2, 3);
    }
  }
  box(g, 0xf0b778, x - 14, y + 26, w + 28, 3);
  box(g, 0x684b32, x - 12, y + 29, w + 24, 4);
  // A second dormer, shuttered windows and layered masonry add readable material detail.
  if (w >= 140) {
    box(g, 0x674c35, x + w / 2 - 18, y - 18, 36, 34);
    box(g, 0xd7ba84, x + w / 2 - 14, y - 15, 28, 29);
    windowArt(g, x + w / 2 - 9, y - 9, 18, 18);
  }
  windowArt(g, x + 15, y + 39, 24, 23);
  windowArt(g, x + w - 40, y + 39, 24, 23);
  for (const wx of [x + 10, x + w - 46]) {
    box(g, 0x79613a, wx, y + 38, 5, 28);
    box(g, 0xa88751, wx + 1, y + 40, 3, 22);
  }
  box(g, 0x644531, x + w / 2 - 14, y + h - 44, 28, 34);
  box(g, 0xa57141, x + w / 2 - 11, y + h - 42, 22, 31);
  box(g, 0xc59252, x + w / 2 - 9, y + h - 39, 7, 25);
  box(g, 0x704f31, x + w / 2 - 1, y + h - 41, 1, 29);
  box(g, 0xf3d07c, x + w / 2 + 6, y + h - 25, 3, 3);
  box(g, 0xc2af82, x + w / 2 - 20, y + h, 40, 6);
  box(g, 0xe1cea0, x + w / 2 - 22, y + h + 6, 44, 5);
  box(g, 0x7e7057, x + w - 27, y - 27, 13, 27);
  box(g, 0xb2a482, x + w - 25, y - 26, 9, 24);
  box(g, 0x6f6752, x + w - 30, y - 30, 19, 5);
  for (let yy = y - 24; yy < y; yy += 7) box(g, 0x8c8064, x + w - 24, yy, 8, 1);
  for (const xx of [x + 14, x + w - 39]) {
    box(g, 0x815334, xx - 3, y + 67, 32, 9);
    box(g, 0xb78048, xx, y + 67, 26, 5);
    for (let i = 0; i < 5; i++) {
      box(g, 0x567540, xx + i * 5, y + 63, 4, 5);
      box(g, i % 2 ? 0xebc068 : 0xf0d7b4, xx + i * 5, y + 60, 4, 4);
    }
  }
  if (level > 1) {
    box(g, 0xb78048, x - 19, y + h - 10, 13, 15);
    box(g, 0x567540, x - 22, y + h - 25, 19, 16);
    box(g, 0xf0c45d, x - 16, y + h - 30, 7, 7);
  }
}
function path(g: G, points: number[][], width: number) {
  for (let i = 1; i < points.length; i++) {
    const [x, y] = points[i - 1],
      [xx, yy] = points[i];
    for (const [color, extra] of [
      [0x7c9c48, 8],
      [0xb5a66c, 4],
      [0xd2bd82, 0],
      [0xe2cc95, -6],
    ]) {
      if (y === yy)
        box(
          g,
          color,
          Math.min(x, xx) - width / 2 - extra,
          y - width / 2 - extra,
          Math.abs(x - xx) + width + extra * 2,
          width + extra * 2,
        );
      else
        box(
          g,
          color,
          x - width / 2 - extra,
          Math.min(y, yy) - width / 2 - extra,
          width + extra * 2,
          Math.abs(y - yy) + width + extra * 2,
        );
    }
  }
}
function flower(g: G, x: number, y: number, c: number) {
  box(g, 0x598044, x, y, 2, 6);
  box(g, 0x6e944a, x - 3, y + 3, 6, 2);
  box(g, c, x - 3, y - 3, 8, 4);
  box(g, c, x - 1, y - 5, 4, 8);
  box(g, 0xeac96b, x, y - 2, 2, 2);
}
function fence(g: G, x: number, y: number, length: number) {
  box(g, 0x896440, x, y + 5, length, 4);
  box(g, 0xc49b62, x, y + 4, length, 2);
  box(g, 0x9b754b, x, y + 13, length, 3);
  for (let xx = x; xx < x + length; xx += 24) {
    box(g, 0x785337, xx, y, 6, 25);
    box(g, 0xd6b57c, xx + 1, y - 2, 4, 24);
  }
}
function bush(g: G, x: number, y: number) {
  box(g, 0x4d713b, x - 15, y - 12, 32, 16);
  box(g, 0x699145, x - 18, y - 8, 37, 9);
  box(g, 0x8da64e, x - 10, y - 15, 22, 9);
  box(g, 0xafbc67, x - 7, y - 14, 9, 3);
}
export function ground(scene: Phaser.Scene, map: MapData) {
  const g = scene.add.graphics().setDepth(-1000),
    random = rng(8317);
  box(g, 0x83a751, 0, 0, map.width, map.height);
  for (let y = 0; y < map.height; y += 16)
    for (let x = 0; x < map.width; x += 16) {
      const forest = x > 1232 && y < 760,
        quarry = x < 432 && y > 780;
      const palette = quarry
        ? [0xb5aa78, 0xbeb382, 0xab9f70]
        : forest
          ? [0x6b954a, 0x729b4c, 0x799e4e]
          : [0x8bad56, 0x92b55b, 0x9cba61, 0x85a955];
      box(g, palette[Math.floor(random() * palette.length)], x, y, 16, 16);
      if (random() > 0.42) {
        const xx = x + Math.floor(random() * 12),
          yy = y + Math.floor(random() * 12);
        box(g, quarry ? 0x948e64 : 0x769746, xx, yy, 2, 4);
        box(g, quarry ? 0xcac194 : 0xa9c672, xx + 2, yy + 3, 3, 1);
      }
    }
  path(
    g,
    [
      [80, 344],
      [1776, 344],
    ],
    50,
  );
  path(
    g,
    [
      [216, 344],
      [216, 616],
    ],
    38,
  );
  path(
    g,
    [
      [160, 208],
      [160, 344],
    ],
    40,
  );
  path(
    g,
    [
      [352, 208],
      [352, 344],
    ],
    38,
  );
  path(
    g,
    [
      [704, 208],
      [704, 344],
    ],
    42,
  );
  path(
    g,
    [
      [1088, 344],
      [1088, 736],
      [1088, 1008],
    ],
    46,
  );
  path(
    g,
    [
      [1088, 736],
      [1552, 736],
      [1552, 1104],
      [1408, 1104],
    ],
    36,
  );
  path(
    g,
    [
      [216, 616],
      [216, 904],
      [832, 904],
      [832, 1008],
      [1104, 1008],
    ],
    42,
  );
  path(
    g,
    [
      [216, 1008],
      [352, 1008],
    ],
    40,
  );
  path(
    g,
    [
      [1584, 344],
      [1584, 560],
    ],
    32,
  );
  path(
    g,
    [
      [1088, 344],
      [1088, 552],
    ],
    56,
  );
  // River edge, reeds, tiny eroded banks and the two bridges are actual geography.
  box(g, 0x5b8050, 434, 0, 92, 1280);
  box(g, 0xc0b580, 440, 0, 80, 1280);
  box(g, 0x467f91, 448, 0, 64, 1280);
  box(g, 0x619eaa, 454, 0, 47, 1280);
  box(g, 0x86bdb9, 454, 0, 6, 1280);
  for (let y = 0; y < 1280; y += 16) {
    box(g, 0x88ac67, 432, y, 7, 8);
    box(g, 0xc7c693, 440, y + 7, 7, 5);
    box(g, 0x294f68, 504, y + 5, 8, 8);
  }
  for (const y of [320, 872]) {
    box(g, 0x624a35, 430, y - 3, 100, 70);
    for (let yy = y; yy < y + 64; yy += 8) {
      box(g, 0xb28a53, 432, yy, 96, 7);
      box(g, 0xd7b679, 434, yy, 92, 2);
      for (let xx = 438; xx < 526; xx += 22) box(g, 0x8e653f, xx, yy + 5, 8, 1);
    }
    for (const yy of [y - 9, y + 61]) {
      box(g, 0x624936, 426, yy, 106, 6);
      box(g, 0xdab885, 426, yy - 2, 106, 3);
      for (const xx of [429, 475, 523]) {
        box(g, 0x7a5435, xx, yy - 12, 6, 22);
        box(g, 0xe3c58f, xx, yy - 13, 6, 4);
      }
    }
  }
  // Lake, jetty, quarry layers and village plaza make the expanded map purposeful.
  for (const [x, y, w, h] of [
    [1184, 864, 224, 176],
    [1232, 816, 128, 48],
    [1232, 1040, 128, 32],
  ]) {
    box(g, 0x7c9055, x - 8, y - 8, w + 16, h + 16);
    box(g, 0xb7b583, x - 3, y - 3, w + 6, h + 6);
    box(g, 0x4b8998, x, y, w, h);
    box(g, 0x65a6ad, x + 6, y + 6, w - 12, h - 12);
  }
  for (let y = 958; y < 1004; y += 8) {
    box(g, 0x795335, 1118, y, 94, 7);
    box(g, 0xc09b60, 1120, y, 90, 5);
  }
  for (let i = 0; i < 18; i++) {
    const x = 96 + random() * 290,
      y = 848 + random() * 280;
    box(g, 0x8b8c72, x, y, 14, 9);
    box(g, 0xc0b995, x + 2, y - 4, 10, 9);
  }
  fence(g, 88, 405, 210);
  fence(g, 88, 527, 90);
  fence(g, 251, 527, 48);
  fence(g, 976, 594, 84);
  fence(g, 1130, 594, 80);
  for (let i = 0; i < 520; i++) {
    const x = Math.floor(random() * map.width),
      y = Math.floor(random() * map.height);
    if (
      !map.obstacles.some(
        ([rx, ry, w, h]) =>
          x > rx - 24 && x < rx + w + 24 && y > ry - 35 && y < ry + h + 25,
      ) &&
      Math.abs(y - 344) > 50 &&
      random() > 0.35
    ) {
      flower(g, x, y, [0xefd899, 0xe9ac8e, 0xd0d4ef, 0xf1edcc][i % 4]);
    }
  }
  for (const [x, y] of [
    [54, 192],
    [265, 173],
    [258, 202],
    [424, 215],
    [548, 184],
    [598, 116],
    [810, 200],
    [785, 210],
    [948, 466],
    [1192, 550],
    [1100, 1110],
    [1590, 610],
  ])
    bush(g, x, y);
  for (const [x, y] of map.trees) {
    const t = scene.add.graphics().setDepth(y + 12);
    tree(t, x, y, x % 7 === 0 ? 2 : x % 3 === 0 ? 1 : 0);
  }
  for (const obj of map.objects.filter((o) => o.kind === "building")) {
    const g = scene.add.graphics().setDepth(obj.y - 11);
    building(g, obj.id, obj.rect!, 1);
    g.setData("building", obj.id);
  }
  return g;
}
export function furniture(g: G, kind: string, r: number[]) {
  const [x, y, w, h] = r;
  if (kind === "rug") {
    box(g, 0x915344, x, y, w, h);
    box(g, 0xce9563, x + 4, y + 4, w - 8, h - 8);
    box(g, 0x8c5548, x + 8, y + 8, w - 16, h - 16);
    for (let xx = x + 12; xx < x + w - 12; xx += 12)
      box(g, 0xe6c28b, xx, y + h / 2 - 2, 4, 4);
    return;
  }
  g.fillStyle(0x44302b, 0.18);
  g.fillRect(x + 5, y + 7, w, h);
  if (kind === "bed") {
    box(g, 0x774c32, x, y, w, h);
    box(g, 0xb3804e, x + 4, y + 3, w - 8, h - 7);
    box(g, 0xe8d3a4, x + 8, y + 8, w - 16, h - 16);
    box(g, 0xf6e6be, x + 11, y + 9, w - 22, 18);
    box(g, 0x73949a, x + 8, y + 29, w - 16, h - 37);
    box(g, 0x9cb7ac, x + 8, y + 29, w - 16, 8);
    for (let xx = x + 12; xx < x + w - 10; xx += 9)
      box(g, 0x698486, xx, y + 39, 2, h - 50);
  } else if (kind === "books" || kind === "shelf") {
    box(g, 0x654832, x, y, w, h);
    box(g, 0x946a3e, x + 3, y + 3, w - 6, h - 6);
    for (let yy = y + 6; yy < y + h - 6; yy += 18) {
      box(g, 0x483b30, x + 5, yy, w - 10, 14);
      for (let xx = x + 7; xx < x + w - 8; xx += 9) {
        box(
          g,
          [0xb0654b, 0xc0a15e, 0x668c80, 0x8c7593][Math.floor(xx / 9) % 4],
          xx,
          yy + 2,
          6,
          11,
        );
        box(g, 0xe1c99a, xx, yy + 5, 6, 1);
      }
      box(g, 0xbe9056, x + 2, yy + 14, w - 4, 3);
    }
  } else if (kind === "chest") {
    box(g, 0x62462e, x, y, w, h);
    box(g, 0xad7844, x + 3, y + 3, w - 6, h - 6);
    box(g, 0xcca366, x + 4, y + 3, w - 8, 6);
    box(g, 0x62462e, x, y + 12, w, 3);
    box(g, 0xe1bb66, x + 7, y + 2, 4, h - 4);
    box(g, 0xe1bb66, x + w - 11, y + 2, 4, h - 4);
    box(g, 0xedd486, x + w / 2 - 3, y + 10, 6, 8);
  } else if (kind === "plant") {
    box(g, 0x9c613e, x + 4, y + h - 15, w - 8, 15);
    box(g, 0xc48e55, x + 2, y + h - 18, w - 4, 5);
    bush(g, x + w / 2, y + 9);
  } else if (kind === "fireplace") {
    box(g, 0x766856, x, y, w, h);
    box(g, 0xc1ab85, x + 4, y + 2, w - 8, h - 4);
    box(g, 0x50382d, x + 14, y + 9, w - 28, h - 9);
    box(g, 0xd5803b, x + 22, y + 15, w - 44, h - 15);
    box(g, 0xf2c36a, x + 28, y + 18, w - 56, h - 18);
    box(g, 0x765139, x - 3, y - 3, w + 6, 6);
  } else if (kind === "notice") {
    box(g, 0x6e4e32, x, y, w, h);
    box(g, 0xb28a55, x + 5, y + 5, w - 10, h - 10);
    const count = Math.max(2, Math.floor((w - 16) / 30));
    const step = (w - 16) / count;
    const paperHeight = Math.min(29, h - 17);
    for (let i = 0; i < count; i++) {
      const px = x + 8 + i * step;
      const py = y + 9 + (i % 2) * 3;
      box(g, 0xf2ddb0, px, py, step - 4, paperHeight);
      box(g, 0x96583b, px + (step - 4) / 2, py - 2, 2, 4);
      box(g, 0xb6a47e, px + 2, py + 7, step - 8, 2);
    }
  } else if (kind === "anvil") {
    box(g, 0x725238, x + 9, y + 13, w - 18, h - 13);
    box(g, 0x4d5858, x, y, w, 12);
    box(g, 0x9baaa0, x + 5, y - 2, w - 10, 5);
  } else if (kind === "barrel") {
    box(g, 0x825a37, x + 2, y, w - 4, h);
    box(g, 0xb1874a, x + 6, y + 2, w - 12, h - 4);
    box(g, 0x686751, x, y + 7, w, 4);
    box(g, 0x686751, x, y + h - 10, w, 4);
  } else {
    box(g, 0x6c472e, x + 4, y + h - 8, 7, 13);
    box(g, 0x6c472e, x + w - 11, y + h - 8, 7, 13);
    box(g, 0x684831, x, y, w, h - 4);
    box(g, 0xc09259, x + 3, y + 2, w - 6, h - 10);
    for (let xx = x + 4; xx < x + w - 4; xx += 16)
      box(g, 0xa47643, xx, y + 3, 1, h - 12);
    if (kind === "workbench") {
      box(g, 0x8c9590, x + 25, y + 10, 30, 8);
      box(g, 0x6f4931, x + 36, y + 8, 5, 20);
      box(g, 0xcbbb94, x + w - 58, y + 8, 37, 19);
    } else {
      box(g, 0x587b70, x + w / 2 - 13, y + 5, 26, 20);
      box(g, 0xe8d6ad, x + w / 2 - 10, y + 5, 20, 17);
      box(g, 0xb7a681, x + w / 2, y + 7, 1, 13);
    }
  }
}
export function room(scene: Phaser.Scene, map: MapData) {
  const g = scene.add.graphics().setDepth(-1000);
  box(g, 0x3c3832, 0, 0, map.width, map.height);
  box(g, 0x76583c, 40, 40, 400, 312);
  box(g, 0xd7bb89, 48, 48, 384, 296);
  for (let y = 80; y < 344; y += 16)
    for (let x = 48; x < 432; x += 48) {
      box(g, (x + y) % 64 ? 0xb9905d : 0xc49e6b, x, y, 48, 16);
      box(g, 0xa17a4c, x, y + 15, 48, 1);
      box(g, 0x997249, x + (y % 32 === 0 ? 0 : 24), y, 1, 16);
      box(g, 0xd0ad78, x + 3, y + 2, 37, 1);
    }
  box(g, 0x816343, 48, 48, 384, 32);
  box(g, 0xe0c996, 52, 44, 376, 22);
  for (let x = 56; x < 428; x += 16) box(g, 0xbda577, x, 45, 1, 18);
  box(g, 0x64482f, 44, 70, 392, 7);
  windowArt(g, 100, 40, 32, 25);
  windowArt(g, 348, 40, 32, 25);
  // Light from the windows falls onto the floor; furniture is depth sorted.
  g.fillStyle(0xffdf8e, 0.1);
  g.fillPoints(
    [
      { x: 94, y: 78 },
      { x: 135, y: 78 },
      { x: 174, y: 160 },
      { x: 93, y: 160 },
    ],
    true,
  );
  box(g, 0x62472f, 216, 338, 48, 10);
  box(g, 0xd9b47a, 216, 338, 48, 3);
  for (const f of map.furniture || []) {
    const fg = scene.add
      .graphics()
      .setDepth(f.kind === "rug" ? -900 : f.rect[1] + f.rect[3]);
    furniture(fg, f.kind, f.rect);
  }
}
export function objectArt(g: G, obj: WorldObject, state: any, now: number) {
  const { x, y } = obj;
  if (obj.kind === "wood") {
    if ((state.gathered[obj.id] || 0) > now) {
      box(g, 0x76934d, x - 10, y, 20, 3);
      return;
    }
    box(g, 0x62472e, x - 18, y - 8, 36, 12);
    box(g, 0x99663c, x - 17, y - 9, 33, 10);
    box(g, 0xbe8c4e, x - 14, y - 8, 27, 3);
    box(g, 0xe0b879, x - 19, y - 7, 7, 8);
    box(g, 0x825533, x - 17, y - 5, 3, 4);
    box(g, 0x6f4a31, x + 3, y - 15, 5, 10);
    box(g, 0xab7a40, x + 4, y - 14, 3, 9);
  } else if (obj.kind === "stone") {
    if ((state.gathered[obj.id] || 0) > now) {
      box(g, 0x839068, x - 7, y, 14, 3);
      return;
    }
    box(g, 0x666e62, x - 16, y - 15, 32, 19);
    box(g, 0x8e9985, x - 12, y - 20, 24, 22);
    box(g, 0xb8bd9d, x - 8, y - 22, 14, 12);
    box(g, 0xd1ceb0, x - 6, y - 21, 10, 3);
    box(g, 0x748275, x + 6, y - 7, 9, 8);
    box(g, 0x9dbfc0, x - 8, y - 10, 5, 4);
  } else if (obj.kind === "plot") {
    box(g, 0x80613c, x - 21, y - 18, 42, 37);
    box(g, 0xa47a47, x - 19, y - 17, 38, 34);
    for (let yy = y - 13; yy < y + 14; yy += 7) {
      box(g, 0x775232, x - 17, yy, 34, 3);
      box(g, 0xc19253, x - 16, yy + 3, 30, 1);
    }
    const crop = state.plots[obj.id];
    if (crop) {
      const ready = crop.ready_at <= now,
        growing =
          (now - crop.planted_at) / (crop.ready_at - crop.planted_at) > 0.45;
      for (const xx of [x - 9, x + 9]) {
        box(g, 0x3f713c, xx - 1, y - 8, 3, 15);
        box(g, 0x719c46, xx - 8, y - 8, 8, 5);
        box(g, 0x87b357, xx + 1, y - 12, 7, 7);
        if (growing || ready) {
          box(
            g,
            ready ? 0xf1dfa9 : 0x93b75d,
            xx - 5,
            y - 1,
            10,
            ready ? 12 : 6,
          );
          box(g, 0xcfba80, xx - 3, y + 9, 6, 3);
        }
        box(g, 0xb1ce6c, xx + 3, y - 11, 3, 4);
      }
      if (ready) {
        box(g, 0xfff2b4, x + 13, y - 25, 3, 7);
        box(g, 0xfff2b4, x + 11, y - 23, 7, 3);
      }
    }
  } else if (obj.kind === "board") {
    furniture(g, "notice", [x - 24, y - 40, 48, 34]);
    box(g, 0x745333, x - 19, y - 7, 5, 13);
    box(g, 0x745333, x + 13, y - 7, 5, 13);
  } else if (obj.kind === "event") {
    for (const xx of [x - 29, x + 17]) {
      box(g, 0x667b68, xx, y - 49, 12, 54);
      box(g, 0xa6ae85, xx + 2, y - 47, 8, 48);
      for (let yy = y - 39; yy < y; yy += 12)
        box(g, 0x7c8d70, xx + 1, yy, 10, 2);
    }
    box(g, 0x617965, x - 32, y - 54, 64, 12);
    box(g, 0xb1b995, x - 30, y - 53, 60, 5);
    box(g, 0x80945e, x - 32, y - 45, 15, 5);
    box(
      g,
      state.events.includes("rune_awakened") ? 0xffdd91 : 0x80bbc0,
      x - 5,
      y - 34,
      10,
      21,
    );
    box(
      g,
      state.events.includes("rune_awakened") ? 0xffefb5 : 0xa3d0c7,
      x - 11,
      y - 28,
      22,
      6,
    );
  } else if (obj.kind === "landmark") {
    box(g, 0x674a32, x - 3, y - 20, 6, 25);
    box(g, 0x8f693e, x - 27, y - 34, 54, 19);
    box(g, 0xd3b078, x - 25, y - 33, 50, 15);
    box(g, 0x997645, x - 17, y - 27, 34, 2);
  } else if (obj.kind === "chest") {
    furniture(g, "chest", [x - 20, y - 27, 40, 27]);
    if (state.events.includes("opened_" + obj.id))
      box(g, 0x483a2b, x - 17, y - 23, 34, 8);
  }
}
