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
function bush(g: G, x: number, y: number) {
  box(g, 0x4d713b, x - 15, y - 12, 32, 16);
  box(g, 0x699145, x - 18, y - 8, 37, 9);
  box(g, 0x8da64e, x - 10, y - 15, 22, 9);
  box(g, 0xafbc67, x - 7, y - 14, 9, 3);
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
    // Fine soil and broken edges share the village's small-pixel density.
    // Crop state below remains authoritative; decorative seeds are never added.
    box(g, 0x756143, x - 21, y - 17, 42, 35);
    box(g, 0x99764e, x - 20, y - 16, 40, 33);
    box(g, 0xad8b5c, x - 19, y - 17, 38, 1);
    box(g, 0x6d593e, x - 19, y + 17, 38, 1);
    for (let yy = y - 13; yy < y + 14; yy += 6) {
      box(g, 0x795d3d, x - 16, yy, 32, 2);
      box(g, 0x886740, x - 17, yy + 1, 34, 1);
      box(g, 0xb38d5d, x - 15, yy + 3, 30, 1);
    }
    for (let i = 0; i < 37; i++) {
      const xx = x - 17 + ((i * 13 + x) % 34);
      const yy = y - 14 + ((i * 11 + y) % 29);
      box(g, i % 3 ? 0xa38153 : 0xc2a276, xx, yy, 1, 1);
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
