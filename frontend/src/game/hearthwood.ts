import Phaser from "phaser";
import type { WorldObject } from "../types";
import { box as drawBox } from "./art";

type G = Phaser.GameObjects.Graphics;
const box = (g: G, color: number, x: number, y: number, w: number, h: number) =>
  drawBox(
    g,
    color,
    Math.round(x / 2) * 2,
    Math.round(y / 2) * 2,
    Math.round(w / 2) * 2,
    Math.round(h / 2) * 2,
  );
// Original code-native pixel artwork. Source pixel = 2 world units throughout;
// colors derive from DESIGN.md's Hearthwood materials, with shaded world ramps.
const P = {
  ink: 0x27392f,
  pine: 0x233d31,
  moss: 0x3f6348,
  leaf: 0x6d8553,
  leafLight: 0x9aa86a,
  grass: 0x789361,
  straw: 0xd3c18c,
  woodDark: 0x584132,
  wood: 0x8f6e4d,
  woodLight: 0xba9466,
  woodTop: 0xd0ae78,
  linen: 0xf4efde,
  paper: 0xe6d7b2,
  amber: 0xd3a450,
  stone: 0x8c917d,
  stoneLight: 0xbdbea2,
  roofDark: 0x3c5545,
  roof: 0x59705a,
  roofLight: 0x788568,
};
function pixel(g: G, c: number, x: number, y: number, w = 2, h = 2) {
  box(g, c, Math.round(x / 2) * 2, Math.round(y / 2) * 2, w, h);
}
function plank(g: G, x: number, y: number, w: number, h: number, seed = 0) {
  box(g, P.woodDark, x, y, w, h);
  box(g, seed % 2 ? P.woodLight : P.wood, x + 2, y, w - 2, h - 2);
  box(g, P.woodTop, x + 4, y + 2, w - 8, 2);
  box(g, P.wood, x + 8, y + h - 6, w / 3, 2);
  box(g, P.woodDark, x + w - 16, y + 6, 6, 2);
}
function leaves(g: G, x: number, y: number, w = 26) {
  // Three stepped lobes, with two-pixel cut-ins instead of floating green bars.
  for (const [dx, dy, ww] of [
    [0, 4, 12],
    [8, 0, w - 14],
    [w - 12, 6, 12],
  ]) {
    box(g, P.moss, x + dx + 2, y + dy, ww - 4, 14);
    box(g, P.moss, x + dx, y + dy + 4, ww, 6);
    box(g, P.leaf, x + dx + 2, y + dy + 2, ww - 4, 8);
    box(g, P.leafLight, x + dx + 4, y + dy + 2, Math.max(2, ww - 8), 2);
  }
  pixel(g, P.grass, x + 8, y + 8, 4, 2);
}
function flower(g: G, x: number, y: number, color = P.linen) {
  pixel(g, P.moss, x, y, 2, 8);
  pixel(g, P.leaf, x - 4, y + 4, 4, 2);
  pixel(g, color, x - 4, y - 4, 8, 4);
  pixel(g, color, x - 2, y - 6, 4, 8);
  pixel(g, P.amber, x - 2, y - 4, 4, 4);
}
function pane(g: G, x: number, y: number, w: number, h: number) {
  box(g, P.woodDark, x - 4, y - 4, w + 8, h + 10);
  box(g, P.woodTop, x - 2, y - 2, w + 4, h + 4);
  box(g, 0x43675e, x, y, w, h);
  box(g, 0x9eb8a1, x + 2, y + 2, w - 4, h - 4);
  box(g, 0xc5d2b2, x + 2, y + 2, w - 4, 4);
  box(g, P.woodTop, x + w / 2 - 2, y, 4, h);
  box(g, P.woodTop, x, y + h / 2 - 2, w, 4);
  box(g, P.wood, x - 6, y + h + 2, w + 12, 4);
}
function lantern(g: G, x: number, y: number, on = true) {
  box(g, P.woodDark, x + 4, y - 6, 4, 6);
  box(g, P.woodDark, x, y, 12, 16);
  box(g, P.amber, x + 2, y + 2, 8, 10);
  box(g, on ? P.linen : P.woodTop, x + 4, y + 4, 4, 8);
  box(g, P.woodTop, x - 2, y - 2, 16, 4);
}
function pot(g: G, x: number, y: number) {
  box(g, 0x745a42, x + 4, y, 16, 16);
  box(g, 0xa67c52, x + 2, y, 20, 6);
  box(g, 0xc8a576, x + 4, y + 2, 16, 2);
  leaves(g, x, y - 10, 24);
}

/** The lawn/stone overlay ends in irregular planted edges. No new colliders. */
export function cottageYard(scene: Phaser.Scene) {
  const ground = scene.add.graphics().setDepth(-960);
  // Quiet moss meadow around the entrance, leaving the existing village route.
  // Rounded, broken meadow edges sit close in value to the existing grass.
  const patches = [
    [84, 210, 140, 94],
    [110, 386, 142, 128],
  ];
  for (const [x, y, w, h] of patches) {
    box(ground, 0x628858, x + 16, y, w - 32, h);
    box(ground, 0x628858, x + 8, y + 8, w - 16, h - 16);
    box(ground, 0x628858, x, y + 18, w, h - 36);
    for (let i = 0; i < 20; i++) {
      const xx = x + ((i * 26) % w),
        yy = y + ((i * 18) % h);
      pixel(ground, 0x668d5c, xx, yy, 6, 2);
    }
  }
  // Stone threshold and stepping stones follow the original walkable approach.
  for (const [x, y, w, h] of [
    [138, 210, 44, 14],
    [138, 230, 44, 14],
    [134, 252, 44, 14],
    [130, 274, 42, 14],
    [126, 296, 40, 14],
    [124, 316, 38, 14],
  ]) {
    box(ground, 0x586d50, x, y + 2, w, h);
    box(ground, P.stone, x + 2, y, w - 4, h);
    box(ground, P.stoneLight, x + 4, y, w - 8, 4);
    box(ground, 0xa1a68a, x + 6, y + 6, w - 18, 2);
    box(ground, P.moss, x + w - 8, y + h - 2, 6, 2);
  }
  // Low bed edging is walkable; tall fences are deliberately not invented.
  for (const [x, y, w] of [
    [108, 416, 146],
    [108, 510, 146],
  ]) {
    box(ground, P.stone, x, y, w, 4);
    for (let xx = x + 2; xx < x + w - 8; xx += 14) {
      box(ground, P.stoneLight, xx, y, 10, 2);
      box(ground, P.moss, xx + 10, y + 2, 4, 2);
    }
  }
  const plants = scene.add.graphics().setDepth(-845);
  for (const [x, y] of [
    [80, 214],
    [218, 220],
    [206, 278],
    [88, 286],
    [96, 388],
    [246, 398],
    [96, 506],
    [246, 526],
  ]) {
    leaves(plants, x, y, 30);
    flower(plants, x + 8, y - 4);
    flower(plants, x + 22, y, P.paper);
  }
  // Sparse leaf litter and foot-worn ground; deterministic positions.
  for (let i = 0; i < 26; i++) {
    const x = 78 + ((i * 38) % 178),
      y = 226 + ((i * 22) % 92);
    if (x > 124 && x < 186) continue;
    pixel(plants, i % 3 ? P.leaf : P.leafLight, x, y, 4, 2);
  }
  const line = scene.add.graphics().setDepth(278);
  box(line, P.woodDark, 82, 238, 4, 38);
  box(line, P.woodDark, 126, 238, 4, 38);
  box(line, P.woodLight, 84, 238, 2, 38);
  box(line, P.woodLight, 128, 238, 2, 38);
  box(line, P.woodDark, 82, 242, 48, 2);
  box(line, P.linen, 88, 244, 16, 20);
  box(line, P.paper, 88, 262, 16, 4);
  box(line, P.moss, 110, 244, 12, 24);
  box(line, P.leaf, 112, 244, 4, 22);
  box(line, P.woodTop, 90, 240, 2, 6);
  box(line, P.woodTop, 116, 240, 2, 6);
}

/** Same foundation/door/collision as the original home; original pixel drawing. */
export function cottage(scene: Phaser.Scene, obj: WorldObject) {
  const g = scene.add.graphics().setDepth(obj.y - 15);
  g.setData("building", obj.id);
  // Stone plinth, timber wall and two warm shutters.
  box(g, P.woodDark, 96, 128, 128, 80);
  for (let y = 146; y < 200; y += 10) plank(g, 100, y, 120, 10, y);
  box(g, 0x736c55, 94, 200, 132, 8);
  for (let x = 98; x < 222; x += 16) {
    box(g, P.stoneLight, x, 200, 12, 4);
    box(g, P.stone, x + 2, 206, 12, 2);
  }
  for (const x of [100, 216]) {
    box(g, P.woodDark, x, 144, 6, 54);
    box(g, P.woodLight, x + 2, 144, 2, 54);
  }
  pane(g, 110, 156, 22, 22);
  pane(g, 190, 156, 20, 22);
  box(g, P.woodDark, 140, 158, 38, 50);
  box(g, 0xb68a57, 144, 160, 30, 46);
  for (let x = 146; x < 173; x += 8) {
    box(g, P.woodTop, x, 162, 4, 40);
    box(g, P.wood, x + 4, 162, 2, 42);
  }
  box(g, P.woodDark, 166, 182, 6, 6);
  box(g, P.amber, 168, 182, 4, 4);
  // Stepped pitched roof; colored edges and row-level shingle variation.
  box(g, P.woodDark, 86, 142, 148, 10);
  for (let row = 0; row < 40; row++) {
    const y = 68 + row * 2,
      spread = Math.floor(row * 0.85) * 2;
    const x = 154 - spread,
      w = 12 + spread * 2;
    box(g, P.roofDark, x - 2, y, w + 4, 2);
    box(g, row % 4 === 0 ? P.roofLight : P.roof, x + 2, y, w - 4, 2);
    if (row % 4 !== 0)
      for (
        let xx = x + 8 + (Math.floor(row / 4) % 2) * 6;
        xx < x + w - 6;
        xx += 16
      )
        pixel(g, P.roofDark, xx, y, 2, 2);
    box(g, P.woodTop, x - 2, y, 2, 2);
    box(g, P.wood, x + w, y, 2, 2);
  }
  box(g, P.woodDark, 146, 68, 28, 4);
  box(g, P.woodLight, 146, 68, 28, 2);
  // Small dormer and the single chimney supplying home smoke.
  box(g, P.woodDark, 144, 110, 32, 30);
  box(g, P.woodLight, 148, 114, 24, 22);
  pane(g, 152, 118, 16, 14);
  box(g, P.woodDark, 140, 108, 40, 4);
  box(g, 0x777964, 196, 84, 16, 34);
  box(g, P.stoneLight, 198, 84, 6, 32);
  for (let y = 90; y < 116; y += 8) box(g, P.stone, 198, y, 14, 2);
  box(g, P.woodDark, 194, 82, 20, 6);
  box(g, P.stoneLight, 194, 80, 20, 4);
  box(g, P.wood, 106, 184, 28, 8);
  leaves(g, 106, 180, 28);
  flower(g, 114, 178);
  flower(g, 126, 180, P.paper);
  lantern(g, 176, 172);
  leaves(g, 212, 146, 18);
  leaves(g, 218, 164, 16);
  leaves(g, 212, 188, 22);
}

function openBook(g: G, x: number, y: number, lift = 0) {
  box(g, P.moss, x - 2, y + 2, 38, 22);
  box(g, P.paper, x, y, 34, 20);
  box(g, P.linen, x + 2, y - lift, 14, 18 + lift);
  box(g, 0xf9f3df, x + 18, y, 14, 18);
  box(g, P.woodLight, x + 16, y + 2, 2, 16);
  for (let i = 0; i < 3; i++) {
    box(g, 0xb8b694, x + 4, y + 4 + i * 4, 8, 2);
    box(g, 0xb8b694, x + 22, y + 4 + i * 4, 8, 2);
  }
  box(g, 0xa66e4f, x + 26, y + 14, 4, 12);
}
function homeChest(g: G, opened: boolean) {
  const x = 336,
    y = 160;
  box(g, P.woodDark, x, y + 4, 48, 26);
  for (let yy = y + 8; yy < y + 28; yy += 8) plank(g, x + 2, yy, 44, 8);
  if (opened) {
    box(g, P.woodDark, x, y - 12, 48, 16);
    box(g, P.wood, x + 4, y - 8, 40, 10);
    box(g, 0x382f26, x + 4, y + 6, 40, 10);
  } else {
    box(g, P.woodDark, x, y, 48, 12);
    plank(g, x + 2, y, 44, 12);
  }
  for (const xx of [x + 8, x + 36]) {
    box(g, P.amber, xx, opened ? y - 10 : y + 2, 4, opened ? 12 : 24);
    box(g, P.paper, xx, y + 20, 2, 2);
  }
  box(g, P.woodDark, x + 22, y + 12, 8, 10);
  box(g, P.amber, x + 24, y + 12, 4, 6);
}

/** Keep all existing furniture footprints and traversable floor intact. */
export function cottageRoom(scene: Phaser.Scene) {
  const g = scene.add.graphics().setDepth(-1000);
  box(g, 0x27352d, 0, 0, 480, 368);
  box(g, P.woodDark, 40, 40, 400, 312);
  box(g, 0x655342, 48, 72, 384, 272);
  for (let y = 80; y < 344; y += 16) {
    for (let x = 48; x < 432; x += 48) {
      box(g, (x + y) % 64 ? 0xa78961 : 0xb3976c, x, y, 48, 14);
      box(g, 0xc3aa7b, x + 2, y + 2, 44, 2);
      if ((x + y) % 3) box(g, 0x987b56, x + (y % 32 ? 18 : 34), y + 6, 10, 2);
      if ((x + y) % 5 === 0) box(g, 0x957854, x + 6, y + 10, 14, 2);
      box(g, 0x786146, x, y, 2, 14);
    }
  }
  // Timber frame and plaster wall, not extra floor obstacles.
  box(g, P.paper, 48, 38, 384, 30);
  for (let x = 48; x < 432; x += 48) {
    box(g, P.woodDark, x, 36, 6, 38);
    box(g, P.woodLight, x + 2, 38, 2, 32);
  }
  box(g, P.wood, 44, 66, 392, 12);
  box(g, P.woodTop, 44, 66, 392, 2);
  box(g, P.woodDark, 40, 76, 8, 268);
  box(g, P.woodTop, 46, 76, 2, 260);
  box(g, P.woodDark, 432, 76, 8, 268);
  box(g, P.wood, 432, 76, 2, 260);
  pane(g, 102, 38, 38, 28);
  pane(g, 348, 38, 32, 28);
  // Linen curtains remain on the wall, with clean light falling across the desk.
  for (const x of [96, 140, 342, 382]) {
    box(g, P.linen, x, 36, 6, 32);
    box(g, P.paper, x + 2, 40, 2, 22);
  }
  g.fillStyle(0xffedbb, 0.12);
  g.fillPoints(
    [
      { x: 100, y: 78 },
      { x: 144, y: 78 },
      { x: 188, y: 200 },
      { x: 106, y: 200 },
    ],
    true,
  );
  // Low hearth stones and two woven mats are part of the floor.
  box(g, P.stone, 196, 96, 80, 12);
  box(g, P.stoneLight, 198, 96, 76, 4);
  for (let x = 202; x < 276; x += 16) box(g, P.woodDark, x, 102, 2, 4);
  for (const [x, y, w, h] of [
    [168, 208, 144, 64],
    [88, 182, 88, 24],
    [300, 156, 88, 44],
  ]) {
    box(g, P.woodDark, x, y, w, h);
    box(g, P.paper, x + 2, y + 2, w - 4, h - 4);
    box(g, P.moss, x + 6, y + 6, w - 12, h - 12);
    for (let xx = x + 10; xx < x + w - 10; xx += 8) {
      box(g, P.leafLight, xx, y + 8, 4, 2);
      box(g, P.leafLight, xx, y + h - 10, 4, 2);
      box(g, P.paper, xx, y - 2, 2, 2);
      box(g, P.paper, xx, y + h, 2, 2);
    }
    if (h > 48) {
      for (let i = -2; i <= 2; i++) {
        box(g, P.leafLight, x + w / 2 - 4, y + h / 2 + i * 4, 8, 2);
        box(g, P.paper, x + w / 2 + i * 6, y + h / 2 - 2, 2, 4);
      }
    }
  }
  // The open doorway is aligned to the existing exit at (240, 328).
  box(g, P.woodDark, 40, 340, 176, 8);
  box(g, P.woodDark, 264, 340, 176, 8);
  box(g, P.woodTop, 48, 340, 168, 2);
  box(g, P.woodTop, 264, 340, 168, 2);
  box(g, P.stone, 216, 336, 48, 12);
  box(g, P.stoneLight, 218, 336, 44, 4);
  box(g, P.linen, 224, 326, 32, 6);
  box(g, P.woodLight, 214, 306, 4, 34);
  box(g, P.woodLight, 262, 306, 4, 34);
  // Wall shelf holds neutral household crockery, never earned trophies/books.
  box(g, P.woodDark, 152, 50, 30, 12);
  box(g, P.woodLight, 150, 60, 36, 4);
  box(g, P.paper, 158, 52, 8, 8);
  box(g, P.moss, 170, 48, 10, 12);

  const fire = scene.add.graphics().setDepth(96);
  box(fire, 0x747563, 200, 64, 72, 32);
  for (let yy = 66; yy < 96; yy += 8)
    for (let xx = 202; xx < 270; xx += 14) {
      box(fire, P.stoneLight, xx, yy, 12, 6);
      box(fire, P.stone, xx + 2, yy + 4, 10, 2);
    }
  box(fire, P.woodDark, 216, 72, 40, 24);
  box(fire, 0x372e27, 220, 76, 32, 20);
  plank(fire, 196, 62, 80, 6);
  lantern(fire, 208, 48);
  box(fire, P.moss, 252, 50, 10, 10);
  const bed = scene.add.graphics().setDepth(152);
  box(bed, P.woodDark, 304, 72, 72, 80);
  box(bed, P.woodLight, 308, 76, 64, 72);
  for (const x of [306, 370]) {
    box(bed, P.woodDark, x, 68, 4, 86);
    box(bed, P.woodTop, x, 68, 4, 4);
  }
  box(bed, P.paper, 312, 80, 56, 24);
  box(bed, P.linen, 316, 82, 48, 16);
  box(bed, P.moss, 312, 104, 56, 40);
  box(bed, P.leafLight, 312, 104, 56, 8);
  for (let x = 316; x < 366; x += 8) {
    box(bed, 0x52724c, x, 118, 2, 24);
    box(bed, P.paper, x, 106, 4, 2);
  }
  plank(bed, 304, 144, 72, 8);
  const desk = scene.add.graphics().setDepth(176);
  for (const x of [82, 168]) {
    box(desk, P.woodDark, x, 140, 6, 40);
    box(desk, P.woodLight, x + 2, 142, 2, 36);
  }
  for (let yy = 136; yy < 172; yy += 12) plank(desk, 80, yy, 96, 12, yy);
  box(desk, P.paper, 108, 138, 62, 30);
  // Separate small moss manual on the left and open study book on the right.
  box(desk, P.woodDark, 86, 140, 18, 28);
  box(desk, P.moss, 86, 138, 16, 26);
  box(desk, P.paper, 90, 140, 10, 2);
  box(desk, P.amber, 92, 148, 4, 8);
  openBook(desk, 124, 140);
  box(desk, P.woodDark, 112, 150, 6, 6);
  box(desk, P.linen, 114, 134, 2, 18);
  pixel(desk, P.paper, 116, 130, 2, 8);
  const plant = scene.add.graphics().setDepth(100);
  pot(plant, 64, 84);
  const chest = scene.add.graphics().setDepth(188);
  homeChest(chest, false);
}

/** Ephemeral presentation only: no furnishings/rewards are saved here. */
export function homeObjectResponse(g: G, obj: WorldObject, active: boolean) {
  if (obj.id === "home" && active) {
    box(g, P.woodDark, 142, 158, 34, 50);
    box(g, 0x383a2c, 146, 160, 28, 48);
    box(g, P.woodLight, 144, 160, 8, 44);
    box(g, P.woodTop, 146, 162, 2, 40);
  }
  if (obj.id === "home_reading" && active) openBook(g, 124, 140, 4);
  if (obj.id === "home_chest" && active) homeChest(g, true);
  if (obj.id === "home_desk" && active) {
    box(g, P.linen, 88, 138, 14, 22);
    box(g, P.woodLight, 90, 144, 10, 2);
    box(g, P.woodLight, 90, 150, 8, 2);
  }
  if (obj.id === "home_bed" && active) {
    box(g, P.linen, 316, 84, 48, 14);
    box(g, P.paper, 320, 88, 40, 2);
  }
}
export function hearthAmbient(g: G, elapsed: number, reduced: boolean) {
  const step = reduced ? 0 : Math.floor(elapsed / 380) % 3;
  box(g, P.wood, 222, 92, 28, 4);
  box(g, 0xba7441, 226, 84 - step * 2, 20, 10 + step * 2);
  box(g, P.amber, 230, 80 + step * 2, 12, 14 - step * 2);
  box(g, P.paper, 234, 86 + step * 2, 4, 8 - step * 2);
}
