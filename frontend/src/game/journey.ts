import type Phaser from "phaser";
import type { GameState, MapData } from "../types";

function prop(
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
// Match village art density: two source pixels per world unit. These original
// geography textures reuse audited scenery; source artwork is never modified.
function ground(scene: Phaser.Scene, map: MapData) {
  const key = `journey-ground-${map.id}`;
  if (!scene.textures.exists(key)) {
    const canvas = document.createElement("canvas");
    canvas.width = map.width * 2;
    canvas.height = map.height * 2;
    const c = canvas.getContext("2d")!;
    c.scale(2, 2);
    c.imageSmoothingEnabled = false;
    c.fillStyle = map.id === "mountain" ? "#8c946b" : "#8fa76c";
    c.fillRect(0, 0, map.width, map.height);
    let seed = 241;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < (map.width * map.height) / 32; i++) {
      c.fillStyle = ["#829b61", "#a2af77", "#78935c", "#b3b481"][i % 4];
      c.globalAlpha = 0.35;
      c.fillRect(
        Math.floor(rand() * map.width * 2) / 2,
        Math.floor(rand() * map.height * 2) / 2,
        1 + Math.floor(rand() * 3),
        0.5,
      );
    }
    c.globalAlpha = 1;
    const road = (points: number[][], width: number) => {
      c.lineJoin = "round";
      c.lineCap = "round";
      c.lineWidth = width + 5;
      c.strokeStyle = "#9c9468";
      const line = () => {
        c.beginPath();
        points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
        c.stroke();
      };
      line();
      c.lineWidth = width;
      c.strokeStyle = "#c3b68a";
      line();
      c.lineWidth = width - 8;
      c.strokeStyle = "#cbbb92";
      line();
    };
    if (map.id === "crossing") {
      road(
        [
          [72, 400],
          [176, 400],
          [288, 352],
          [352, 320],
          [424, 320],
        ],
        42,
      );
      road(
        [
          [288, 352],
          [320, 272],
          [424, 240],
        ],
        30,
      );
      c.fillStyle = "#567f77";
      c.fillRect(456, 0, 176, 560);
      c.fillStyle = "#75a3a0";
      c.fillRect(472, 0, 144, 560);
      for (let y = 0; y < 560; y += 4) {
        c.fillStyle = y % 12 ? "#70a09c" : "#82b4a9";
        c.fillRect(478 + (y % 3) * 5, y, 128 - (y % 5) * 9, 1);
      }
      for (const x of [456, 616])
        for (let y = 0; y < 560; y += 7) {
          c.fillStyle = y % 14 ? "#bbbd85" : "#8a9e68";
          c.fillRect(x + (y % 3) * 2, y, 12, 5);
        }
      c.fillStyle = "#684d37";
      c.fillRect(408, 302, 72, 40);
      for (let x = 410; x < 480; x += 8) {
        c.fillStyle = "#af8859";
        c.fillRect(x, 302, 6, 38);
        c.fillStyle = "#d3ac71";
        c.fillRect(x, 302, 6, 2);
      }
    } else if (map.id === "mountain") {
      road(
        [
          [96, 472],
          [192, 472],
          [240, 416],
          [296, 368],
          [576, 352],
          [640, 304],
          [640, 184],
          [736, 184],
        ],
        36,
      );
    } else {
      road(
        [
          [128, 480],
          [256, 400],
          [480, 400],
          [656, 400],
        ],
        54,
      );
      road(
        [
          [352, 400],
          [352, 240],
        ],
        54,
      );
      c.fillStyle = "#b8b398";
      c.fillRect(264, 280, 248, 128);
      for (let y = 280; y < 408; y += 8)
        for (let x = 264; x < 512; x += 16) {
          c.fillStyle = (x + y) % 3 ? "#c9c4a9" : "#bfbba1";
          c.fillRect(x + (y % 16 ? 4 : 0), y, 14, 6);
        }
      for (const x of [0, 752]) {
        c.fillStyle = "#697768";
        c.fillRect(x, 60, 48, 540);
        for (let y = 64; y < 600; y += 16)
          for (let xx = x; xx < x + 48; xx += 24) {
            c.fillStyle = "#949d83";
            c.fillRect(xx + 1, y + 1, 22, 12);
            c.fillStyle = "#b3b79b";
            c.fillRect(xx + 1, y + 1, 22, 2);
          }
      }
    }
    const pixels = c.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < (map.width * map.height) / 12; i++) {
      const x = Math.floor(rand() * map.width * 2),
        y = Math.floor(rand() * map.height * 2),
        at = (y * canvas.width + x) * 4;
      if (pixels.data[at] > 180 && pixels.data[at + 1] < 195) {
        c.globalAlpha = 0.24;
        c.fillStyle = i % 2 ? "#eedeb3" : "#96835d";
        c.fillRect(x / 2, y / 2, 0.5 + rand() * 2, 0.5);
      }
    }
    c.globalAlpha = 1;
    scene.textures.addCanvas(key, canvas);
  }
  scene.add.image(0, 0, key).setOrigin(0).setScale(0.5).setDepth(-1000);
}
export function preloadJourney(scene: Phaser.Scene) {
  for (const name of ["cliff-448", "cliff-576", "cliff-224", "boat-72"])
    scene.load.image(
      `journey-${name}`,
      `/assets/hearthwood/journey/${name}.png`,
    );
}
export function journeyLandscape(scene: Phaser.Scene, map: MapData) {
  ground(scene, map);
  for (const [i, [x, y]] of map.trees.entries()) {
    scene.add.ellipse(x + 5, y + 5, 56, 15, 0x314e3e, 0.17).setDepth(-850);
    prop(
      scene,
      map.id === "mountain" ? "fir" : i % 2 ? "oak" : "birch",
      x,
      y + 12,
      y + 10,
    ).setData("canopy", true);
  }
  for (const o of map.objects.filter(
    (o) => o.kind === "passage" || o.kind === "travel",
  )) {
    if (o.id === "to_inn") continue;
    prop(
      scene,
      o.id.includes("camp")
        ? "bench"
        : o.id === "city_supplies"
          ? "crates"
          : "board",
      o.x,
      o.y,
    );
  }
  if (map.id === "crossing") {
    scene.add
      .image(496, 374, "journey-boat-72")
      .setOrigin(0.5, 1)
      .setScale(0.5)
      .setDepth(-870);
    prop(scene, "home", 128, 184, 184);
    prop(scene, "crates", 288, 320);
    prop(scene, "lantern", 392, 288);
    // Join two unscaled source spans rather than rotating a short bridge.
    for (const x of [504, 584])
      prop(scene, "bridge", x, 272, -880)
        .setVisible(false)
        .setData("journeyBridge", true);
    for (const [x, y] of [
      [440, 136],
      [440, 440],
      [656, 296],
      [184, 320],
    ])
      prop(scene, "shrub", x, y);
  } else if (map.id === "mountain") {
    for (const [x, y, w, h] of map.obstacles.slice(0, 4)) {
      if (w === 880)
        for (let xx = 0; xx < 880; xx += 224)
          scene.add
            .image(xx + 112, y + h, "journey-cliff-448")
            .setOrigin(0.5, 1)
            .setScale(0.5)
            .setDepth(y + h);
      else if (w === 112)
        for (const yy of [y + 64, y + 128])
          scene.add
            .image(x + w / 2, yy, "journey-cliff-224")
            .setOrigin(0.5, 1)
            .setScale(0.5)
            .setDepth(yy);
      else
        scene.add
          .image(x + w / 2, y + h, `journey-cliff-${w * 2}`)
          .setOrigin(0.5, 1)
          .setScale(0.5)
          .setDepth(y + h);
    }
    prop(scene, "crates", 204, 416);
    prop(scene, "lantern", 272, 416);
    for (const [x, y] of [
      [176, 344],
      [568, 296],
      [784, 240],
      [384, 360],
    ])
      prop(scene, "stone", x, y);
  } else {
    prop(scene, "guild", 352, 240, 240);
    prop(scene, "workshop", 616, 304, 304);
    for (const [x, y] of [
      [280, 280],
      [424, 280],
      [584, 400],
    ])
      prop(scene, "flowers", x, y);
    for (const [x, y] of [
      [280, 248],
      [424, 248],
      [128, 480],
    ])
      prop(scene, "lantern", x, y);
    prop(scene, "bench", 432, 352);
    prop(scene, "crates", 640, 344);
  }
}
export function updateJourney(
  scene: Phaser.Scene,
  _map: MapData,
  state: GameState,
) {
  for (const child of scene.children.list)
    if (child.getData("journeyBridge"))
      (child as Phaser.GameObjects.Image).setVisible(
        !!state.departure?.bridge_repaired,
      );
}
