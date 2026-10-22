import type { CaveEnemy, GameState, MapData, WorldObject } from "./protocol";

// Original code-native artwork. Coordinates are world units, +y down; half-unit
// details match the existing two-source-pixels-per-world-unit scenery contract.
export type Ink = {
  fill?: string;
  stroke?: string;
  line?: number;
  alpha?: number;
};
export type Mark = Ink &
  (
    | { kind: "rect"; x: number; y: number; w: number; h: number }
    | { kind: "ellipse"; x: number; y: number; w: number; h: number }
    | { kind: "poly" | "line"; points: { x: number; y: number }[] }
  );
const rect = (
  a: Mark[],
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  alpha = 1,
) => a.push({ kind: "rect", x, y, w, h, fill, alpha });
const ellipse = (
  a: Mark[],
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  alpha = 1,
) => a.push({ kind: "ellipse", x, y, w, h, fill, alpha });
const poly = (a: Mark[], points: number[][], fill: string, alpha = 1) =>
  a.push({
    kind: "poly",
    points: points.map(([x, y]) => ({ x, y })),
    fill,
    alpha,
  });
const line = (
  a: Mark[],
  points: number[][],
  stroke: string,
  width = 1,
  alpha = 1,
) =>
  a.push({
    kind: "line",
    points: points.map(([x, y]) => ({ x, y })),
    stroke,
    line: width,
    alpha,
  });
const stone = (
  a: Mark[],
  x: number,
  y: number,
  w: number,
  h: number,
  light: string,
) => {
  poly(
    a,
    [
      [x + 3, y],
      [x + w - 4, y],
      [x + w, y + 3],
      [x + w - 1, y + h - 2],
      [x + 2, y + h],
      [x, y + h - 4],
      [x, y + 3],
    ],
    "#344b40",
  );
  poly(
    a,
    [
      [x + 3, y + 1],
      [x + w - 4, y + 1],
      [x + w - 1, y + 4],
      [x + w - 2, y + h - 4],
      [x + 3, y + h - 3],
      [x + 1, y + 4],
    ],
    light,
  );
  line(
    a,
    [
      [x + 4, y + 2],
      [x + w - 6, y + 2],
    ],
    "#a6ad94",
    0.7,
    0.6,
  );
  line(
    a,
    [
      [x + w - 2, y + 5],
      [x + w - 3, y + h - 5],
      [x + 4, y + h - 3],
    ],
    "#3f5749",
    1.5,
    0.7,
  );
};
export function caveGround(
  map: Pick<MapData, "id" | "width" | "height" | "obstacles">,
): Mark[] {
  const a: Mark[] = [],
    floor = Number(map.id.slice(-1)) || 1;
  rect(a, 0, 0, map.width, map.height, "#2d4439");
  rect(a, 24, 40, map.width - 48, map.height - 64, "#657569");
  let seed = floor * 917 + 71;
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  // Broad, chipped slabs and quiet seams, rather than a high-contrast tile grid.
  for (let y = 42; y < 424; y += 40)
    for (let x = 25 - (Math.floor(y / 40) % 2) * 24; x < 616; x += 64) {
      const xx = Math.max(25, x),
        w = Math.min(x + 62, 615) - xx;
      if (w < 4) continue;
      const shade = ["#718173", "#748475", "#6c7d70", "#788777"][
        Math.floor(rand() * 4)
      ];
      poly(
        a,
        [
          [xx + 2, y],
          [xx + w - 5, y + 1],
          [xx + w, y + 5],
          [xx + w - 2, y + 34],
          [xx + w - 8, y + 38],
          [xx + 4, y + 37],
          [xx, y + 31],
          [xx, y + 5],
        ],
        shade,
      );
      line(
        a,
        [
          [xx + 4, y + 3],
          [xx + w - 9, y + 4],
        ],
        "#a5ab91",
        0.5,
        0.35,
      );
      if (rand() > 0.48)
        line(
          a,
          [
            [xx + w * 0.3, y + 8],
            [xx + w * 0.42, y + 16],
            [xx + w * 0.35, y + 23],
          ],
          "#526c5b",
          0.7,
          0.6,
        );
    }
  // Fine dust and worn stepping surfaces remain decorative, never collisions.
  for (let i = 0; i < 270; i++) {
    const x = 30 + rand() * 580,
      y = 44 + rand() * 372;
    rect(
      a,
      Math.round(x * 2) / 2,
      Math.round(y * 2) / 2,
      rand() > 0.6 ? 2 : 1,
      0.5,
      i % 3 ? "#a8ad92" : "#415f4c",
      0.4,
    );
  }
  poly(
    a,
    [
      [34, 274],
      [44, 264],
      [135, 267],
      [144, 279],
      [141, 405],
      [131, 415],
      [39, 410],
      [31, 398],
    ],
    "#9e9d7c",
  );
  poly(
    a,
    [
      [39, 279],
      [48, 271],
      [130, 274],
      [137, 283],
      [134, 400],
      [125, 407],
      [42, 403],
      [38, 393],
    ],
    "#aaa989",
  );
  for (let y = 292; y < 398; y += 24)
    line(
      a,
      [
        [43, y],
        [132, y + 2],
      ],
      "#747e60",
      0.7,
      0.5,
    );
  for (let y = 268; y < 410; y += 18) {
    rect(a, 143, y, 1.5, 8, "#c8c69a", 0.8);
    rect(a, 145, y + 2, 1, 4, "#49674b");
  }
  for (const [x, y, w, h] of map.obstacles) {
    rect(a, x + 2, y + h, w, 4, "#243f33", 0.4);
    for (let yy = y; yy < y + h; yy += 16)
      for (let xx = x - (Math.floor(yy / 16) % 2) * 12; xx < x + w; xx += 32) {
        const left = Math.max(x, xx),
          width = Math.min(x + w, xx + 31) - left;
        if (width > 2)
          stone(
            a,
            left,
            yy,
            width,
            Math.min(15, y + h - yy),
            ["#677c68", "#71816c", "#5d7461"][
              (Math.floor(xx / 32) + Math.floor(yy / 16) + floor + 30) % 3
            ],
          );
      }
    rect(a, x, y, Math.min(3, w), h, "#92a086", 0.55);
    rect(a, x + w - 3, y, 3, h, "#314d3d", 0.75);
    for (let i = 0; i < Math.floor(w / 10); i++) {
      const xx = x + 4 + i * 10,
        yy = y + h - 3 - (i % 3) * 2;
      rect(a, xx, yy, 6, 2, "#4c7153");
      rect(a, xx + 1, yy - 1, 3, 1, "#8a9e6d");
    }
  }
  // Lantern niches are part of the masonry, with small static pools of light.
  for (const [x, y] of [
    [48, 76],
    [560, 400],
    [148, 76],
  ]) {
    ellipse(a, x, y + 3, 42, 23, "#d7bd7a", 0.055);
    rect(a, x - 5, y - 10, 10, 19, "#304b3b");
    rect(a, x - 3, y - 7, 6, 12, "#769873");
    rect(a, x - 2, y - 6, 4, 8, "#d8c88b");
    rect(a, x - 1, y - 5, 1, 5, "#fff0b9");
    rect(a, x - 5, y + 7, 10, 2, "#405d43");
  }
  if (floor === 5) {
    line(
      a,
      [
        [338, 211],
        [367, 194],
        [425, 196],
        [453, 218],
        [426, 246],
        [370, 247],
        [338, 226],
      ],
      "#a4ab89",
      1,
      0.35,
    );
    line(
      a,
      [
        [368, 218],
        [397, 204],
        [424, 220],
        [398, 236],
        [368, 218],
      ],
      "#415f4a",
      1,
      0.5,
    );
  }
  return a;
}

export function caveRouteArt(o: WorldObject, s: GameState): Mark[] {
  const a: Mark[] = [],
    x = o.x,
    y = o.y,
    c = s.combat;
  if (o.id === "cave_entry") {
    ellipse(a, x, y - 8, 126, 57, "#2a4536", 0.3);
    poly(
      a,
      [
        [x - 61, y + 5],
        [x - 59, y - 26],
        [x - 42, y - 59],
        [x - 18, y - 74],
        [x + 13, y - 76],
        [x + 42, y - 58],
        [x + 59, y - 29],
        [x + 62, y + 6],
      ],
      "#405b44",
    );
    poly(
      a,
      [
        [x - 48, y + 5],
        [x - 45, y - 26],
        [x - 30, y - 49],
        [x - 11, y - 60],
        [x + 13, y - 59],
        [x + 36, y - 41],
        [x + 47, y - 18],
        [x + 47, y + 6],
      ],
      "#243c33",
    );
    for (let i = 0; i < 9; i++) {
      const t = Math.PI + (i * Math.PI) / 8;
      stone(
        a,
        x + Math.cos(t) * 49 - 9,
        y + Math.sin(t) * 57 - 18,
        20,
        24,
        i % 2 ? "#91a17d" : "#7d9373",
      );
    }
    for (let i = 0; i < 4; i++) {
      rect(a, x - 34 + i * 17, y + 4 + (i % 2), 16, 5, "#b4ac83");
      rect(a, x - 31 + i * 17, y + 4, 10, 1, "#ddd0a5");
    }
    line(
      a,
      [
        [x - 45, y - 44],
        [x - 41, y - 31],
        [x - 48, y - 18],
      ],
      "#8da26d",
      2,
    );
    line(
      a,
      [
        [x + 35, y - 52],
        [x + 46, y - 44],
        [x + 47, y - 28],
      ],
      "#607d52",
      2,
    );
    rect(a, x - 56, y - 16, 7, 13, "#3b5840");
    rect(a, x - 54, y - 14, 3, 8, "#e3cb8f");
    return a;
  }
  if (o.id === "village_departure") {
    stone(a, x - 34, y - 84, 20, 88, "#819479");
    stone(a, x + 14, y - 84, 20, 88, "#819479");
    stone(a, x - 28, y - 88, 56, 20, "#9aa684");
    rect(a, x - 14, y - 67, 28, 70, c?.gate_open ? "#2b4236" : "#5b7560");
    if (!c?.gate_open) {
      line(
        a,
        [
          [x, y - 64],
          [x, y + 1],
        ],
        "#a7b38d",
      );
      poly(
        a,
        [
          [x, y - 48],
          [x + 7, y - 37],
          [x, y - 25],
          [x - 7, y - 37],
        ],
        "#d6bd78",
      );
      poly(
        a,
        [
          [x, y - 45],
          [x + 3, y - 37],
          [x, y - 31],
          [x - 3, y - 37],
        ],
        "#f2dda1",
      );
    }
    return a;
  }
  if (o.kind !== "cave") return a;
  ellipse(a, x, y + 5, 58, 17, "#2b4537", 0.32);
  if (o.id === "cave_rest") {
    for (const xx of [x - 18, x + 14]) rect(a, xx, y - 6, 4, 14, "#4a5539");
    stone(a, x - 25, y - 13, 50, 14, "#a8a17a");
    rect(a, x - 21, y - 11, 42, 2, "#d0bc88");
    rect(a, x + 11, y - 24, 8, 10, "#6e573c");
    rect(a, x + 13, y - 26, 4, 3, "#a8a16e");
    return a;
  }
  const locked =
    (o.id === "cave_down" && !c?.cleared) ||
    (o.id === "cave_rope" && (c?.unlocked || 1) < 4) ||
    (o.id === "cave_deep" && (c?.unlocked || 1) < 5);
  const rope = o.id === "cave_rope";
  poly(
    a,
    [
      [x - 26, y + 7],
      [x - 25, y - 24],
      [x - 18, y - 32],
      [x + 21, y - 31],
      [x + 27, y - 20],
      [x + 26, y + 7],
    ],
    "#304c3a",
  );
  if (rope) {
    for (const xx of [x - 17, x + 17]) {
      line(
        a,
        [
          [xx, y - 36],
          [xx, y + 5],
        ],
        "#c4aa72",
        2,
      );
      line(
        a,
        [
          [xx - 1, y - 34],
          [xx - 1, y + 3],
        ],
        "#6f6a46",
        0.5,
      );
    }
    for (let i = 0; i < 5; i++)
      rect(a, x - 18, y - 31 + i * 8, 36, 3, locked ? "#72785a" : "#c1ac77");
  } else
    for (let i = 0; i < 5; i++) {
      const w = 37 - i * 4;
      rect(a, x - w / 2, y - 24 + i * 6, w, 5, locked ? "#67765d" : "#b1a67e");
      rect(
        a,
        x - w / 2 + 1,
        y - 24 + i * 6,
        w - 2,
        1,
        locked ? "#8a9573" : "#dfc99b",
      );
    }
  if (locked) {
    line(
      a,
      [
        [x - 22, y - 14],
        [x + 22, y - 4],
      ],
      "#746e4a",
      3,
    );
    line(
      a,
      [
        [x + 22, y - 14],
        [x - 22, y - 4],
      ],
      "#9b8d61",
      2,
    );
  } else {
    rect(a, x + 25, y - 21, 5, 15, "#3c5940");
    rect(a, x + 26, y - 19, 3, 9, "#e7cb85");
  }
  return a;
}

export function monsterArt(
  e: CaveEnemy,
  time: number,
  reduced = false,
): Mark[] {
  const a: Mark[] = [],
    pose = reduced ? 0 : Math.floor(time * 6) % 4,
    wind = e.phase === "windup",
    lift = wind ? -1 : pose === 1 || pose === 3 ? 1 : 0;
  ellipse(
    a,
    0,
    0,
    e.kind === "boss" ? 69 : 33,
    e.kind === "bat" ? 8 : 10,
    "#213d31",
    0.28,
  );
  if (e.kind === "slime") {
    poly(
      a,
      [
        [-17, -5],
        [-18, -13],
        [-14, -24],
        [-7, -29],
        [5, -30],
        [14, -25],
        [18, -15],
        [18, -5],
        [12, -1],
        [-10, -1],
      ],
      "#3b6046",
    );
    poly(
      a,
      [
        [-14, -8 + lift],
        [-14, -17 + lift],
        [-8, -25 + lift],
        [3, -27 + lift],
        [11, -23 + lift],
        [15, -14 + lift],
        [14, -6 + lift],
        [7, -4 + lift],
        [-7, -4 + lift],
      ],
      "#86ad70",
    );
    poly(
      a,
      [
        [-11, -13 + lift],
        [-8, -21 + lift],
        [-2, -24 + lift],
        [6, -23 + lift],
        [8, -19 + lift],
        [1, -20 + lift],
        [-5, -16 + lift],
      ],
      "#b5c98b",
    );
    rect(a, -11, -9, 7, 3, "#6a955e");
    rect(a, 5, -8, 7, 3, "#6a955e");
    for (const x of [-7, 5]) {
      rect(a, x, -16 + lift, 3, 4, "#2c4d39");
      rect(a, x, -16 + lift, 1, 1, "#e0ddab");
    }
    rect(a, -2, -10 + lift, 4, 1, "#58794e");
    line(
      a,
      [
        [-2, -28 + lift],
        [-4, -33 + lift],
      ],
      "#406e45",
      1.5,
    );
    poly(
      a,
      [
        [-4, -32 + lift],
        [-10, -35 + lift],
        [-8, -30 + lift],
        [-3, -29 + lift],
      ],
      "#7fa468",
    );
    poly(
      a,
      [
        [-3, -31 + lift],
        [2, -36 + lift],
        [4, -32 + lift],
        [-2, -29 + lift],
      ],
      "#b0bb79",
    );
  } else if (e.kind === "bat") {
    const f = reduced ? 0 : [0, -3, 1, 4][pose];
    for (const sign of [-1, 1]) {
      poly(
        a,
        [
          [0, -20],
          [sign * 13, -29],
          [sign * 31, -36 + f],
          [sign * 27, -21],
          [sign * 23, -10 + f],
          [sign * 17, -17],
          [sign * 10, -10],
          [sign * 7, -19],
        ],
        "#3d5353",
      );
      poly(
        a,
        [
          [sign * 8, -22],
          [sign * 28, -32 + f],
          [sign * 23, -20],
          [sign * 18, -22],
          [sign * 12, -15],
        ],
        "#7d8c92",
      );
      line(
        a,
        [
          [sign * 8, -22],
          [sign * 21, -28 + f],
          [sign * 18, -17],
        ],
        "#a1aaa4",
        0.7,
      );
    }
    poly(
      a,
      [
        [-8, -13],
        [-9, -26],
        [-7, -36],
        [-2, -30],
        [3, -31],
        [8, -36],
        [9, -26],
        [8, -13],
        [3, -6],
        [-4, -7],
      ],
      "#536b69",
    );
    poly(
      a,
      [
        [-5, -26],
        [5, -26],
        [6, -14],
        [2, -10],
        [-3, -11],
      ],
      "#a0ada0",
    );
    rect(a, -6, -24, 3, 2, "#e2ce8a");
    rect(a, 3, -24, 3, 2, "#e2ce8a");
    rect(a, -5, -24, 1, 1, "#273f37");
    rect(a, 4, -24, 1, 1, "#273f37");
    poly(
      a,
      [
        [-2, -18],
        [0, -15],
        [2, -18],
      ],
      "#eee3bd",
    );
  } else if (e.kind === "beetle") {
    for (let i = 0; i < 3; i++)
      for (const sign of [-1, 1]) {
        const y = -6 - i * 7;
        line(
          a,
          [
            [sign * 10, y - 2],
            [sign * (18 + (pose % 2 && !reduced ? 1 : 0)), y - 5],
            [sign * 22, y + 2],
          ],
          "#354e39",
          2,
        );
        line(
          a,
          [
            [sign * 12, y - 3],
            [sign * 18, y - 5],
          ],
          "#a4a783",
          0.6,
        );
      }
    poly(
      a,
      [
        [-16, -8],
        [-17, -23],
        [-11, -34],
        [0, -38],
        [11, -34],
        [17, -23],
        [16, -8],
        [9, -3],
        [-9, -3],
      ],
      e.phase === "recover" ? "#b6a16a" : "#405d42",
    );
    poly(
      a,
      [
        [-13, -12],
        [-13, -24],
        [-7, -33],
        [-1, -35],
        [-1, -6],
        [-8, -7],
      ],
      "#99aa7c",
    );
    poly(
      a,
      [
        [1, -35],
        [9, -32],
        [14, -23],
        [13, -11],
        [8, -7],
        [1, -6],
      ],
      "#7f966b",
    );
    if(e.phase==='recover')poly(a,[[-3,-30],[3,-30],[4,-12],[0,-8],[-4,-12]],'#eed59b');
    line(
      a,
      [
        [-10, -24],
        [-3, -29],
      ],
      "#c3c495",
      1,
    );
    line(
      a,
      [
        [3, -29],
        [10, -24],
      ],
      "#abb88a",
      0.7,
    );
    line(
      a,
      [
        [-12, -17],
        [-2, -20],
      ],
      "#5d7d58",
      1,
    );
    line(
      a,
      [
        [2, -20],
        [12, -17],
      ],
      "#526f50",
      1,
    );
    poly(
      a,
      [
        [-9, -5],
        [-5, -12],
        [5, -12],
        [9, -5],
        [5, 0],
        [-5, 0],
      ],
      "#5d744e",
    );
    rect(a, -6, -7, 3, 2, "#e1d497");
    rect(a, 3, -7, 3, 2, "#e1d497");
  } else {
    for (const sign of [-1, 1]) {
      const y = wind ? -12 : 0;
      stone(a, sign < 0 ? -36 : 22, -49 + y, 17, 32, "#7f9376");
      stone(a, sign < 0 ? -38 : 23, -23 + y, 17, 21, "#6f866b");
      stone(a, sign < 0 ? -23 : 6, -15, 17, 17, "#6d8468");
      rect(a, sign < 0 ? -22 : 7, -1, 16, 3, "#405d44");
    }
    stone(a, -27, -57 + lift, 54, 45, "#8da07c");
    stone(a, -18, -69 + lift, 36, 19, "#9eaa85");
    for (const sign of [-1, 1]) {
      rect(a, sign < 0 ? -14 : 7, -61 + lift, 7, 3, "#314d3c");
      rect(a, sign < 0 ? -13 : 8, -61 + lift, 3, 1, "#d9d59a");
    }
    line(
      a,
      [
        [-12, -52],
        [0, -48],
        [12, -52],
      ],
      "#586f50",
      1,
    );
    line(
      a,
      [
        [-21, -40],
        [-15, -32],
        [-20, -25],
      ],
      "#5b7759",
      1,
    );
    line(
      a,
      [
        [20, -45],
        [16, -34],
        [21, -24],
      ],
      "#536e51",
      1,
    );
    poly(
      a,
      [
        [0, -49 + lift],
        [11, -35 + lift],
        [0, -20 + lift],
        [-11, -35 + lift],
      ],
      "#455e46",
    );
    poly(
      a,
      [
        [0, -46 + lift],
        [8, -35 + lift],
        [0, -24 + lift],
        [-8, -35 + lift],
      ],
      e.hp <= 80 ? "#d8ad63" : "#c5cf94",
    );
    poly(
      a,
      [
        [0, -43 + lift],
        [3, -35 + lift],
        [0, -28 + lift],
        [-3, -35 + lift],
      ],
      e.hp <= 80 ? "#f1d58e" : "#e6e2b0",
    );
    for (const x of [-22, -16, 13, 19])
      line(
        a,
        [
          [x, -16],
          [x + 2, -9],
          [x - 1, -4],
        ],
        "#91a371",
        1,
      );
  }
  const width = e.kind === "boss" ? 58 : 30,
    yy = e.kind === "boss" ? -78 : -43;
  rect(a, -width / 2, yy, width, 3, "#273e32", 0.85);
  rect(
    a,
    -width / 2 + 0.5,
    yy + 0.5,
    (width - 1) * Math.max(0, e.hp / e.max_hp),
    2,
    wind ? "#d7b171" : "#b8c98c",
  );
  return a;
}
