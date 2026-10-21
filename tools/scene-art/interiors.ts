import type { MapData } from "../../shared/game/protocol";
import type { PaintScene } from "./types";

function source(scene: PaintScene, id: string) {
  return scene.textures
    .get(`interior-${id}`)
    .getSourceImage() as HTMLImageElement;
}

function roomGround(scene: PaintScene, map: MapData) {
  const key = `fine-room-${map.id}`;
  if (!scene.textures.exists(key)) {
    const texture = scene.textures.createCanvas(
      key,
      map.width * 2,
      map.height * 2,
    )!;
    const c = texture.context;
    c.imageSmoothingEnabled = false;
    const rect = (
      color: string,
      x: number,
      y: number,
      w: number,
      h: number,
    ) => {
      c.fillStyle = color;
      c.fillRect(x * 2, y * 2, w * 2, h * 2);
    };
    rect("#342e26", 0, 0, 480, 368);
    rect("#69503a", 40, 20, 400, 332);
    // Staggered oak planks: half-unit grain, bevels, restrained knots and nails.
    for (let row = 0; row < 18; row++) {
      const y = 64 + row * 16;
      for (let col = -1; col < 7; col++) {
        const x = 48 + col * 64 + (row % 2) * 32;
        c.save();
        c.beginPath();
        c.rect(96, 128, 768, 560);
        c.clip();
        rect(
          ["#af8453", "#b68d59", "#b18a58", "#ba915d"][(row * 3 + col + 8) % 4],
          x,
          y,
          64,
          16,
        );
        rect("#81623f", x, y, 64, 0.5);
        rect("#d1aa73", x, y + 0.5, 64, 0.5);
        rect("#8d6c44", x + 63.5, y, 0.5, 16);
        for (let n = 0; n < 14; n++) {
          const gx = x + 2 + ((n * 17 + row * 7) % 57);
          const gy = y + 2 + ((n * 7 + col * 3 + 28) % 12);
          rect(n % 3 ? "#bb945f" : "#a67c4f", gx, gy, 2 + (n % 9), 0.5);
        }
        rect("#866746", x + 2, y + 3, 0.5, 0.5);
        rect("#866746", x + 61, y + 13, 0.5, 0.5);
        c.restore();
      }
    }
    // Matching plaster and wainscot; no baked UI text.
    const wall = source(scene, "wall");
    for (let i = 0; i < 3; i++)
      c.drawImage(
        wall,
        4,
        0,
        wall.width - 8,
        wall.height,
        96 + i * 256,
        0,
        256,
        wall.height,
      );
    rect("#4f3a29", 40, 0, 8, 352);
    rect("#926638", 42, 0, 2, 352);
    rect("#4f3a29", 432, 0, 8, 352);
    rect("#926638", 434, 0, 2, 352);
    rect("#573f2d", 40, 344, 400, 8);
    rect("#bd935b", 48, 344, 384, 1);
    rect("#4b382b", 216, 339, 48, 8);
    rect("#c6a36a", 216, 339, 48, 2);
    texture.refresh();
  }
  scene.add.image(0, 0, key).setOrigin(0).setScale(0.5).setDepth(-1000);
}

function rug(scene: PaintScene, r: number[]) {
  const [x, y, w, h] = r;
  const id = `fine-rug-${w}-${h}`;
  if (!scene.textures.exists(id)) {
    const texture = scene.textures.createCanvas(id, w * 2, h * 2)!;
    const c = texture.context,
      im = source(scene, "rug"),
      edge = 22;
    c.imageSmoothingEnabled = false;
    const sx = [0, edge, im.width - edge, im.width];
    const sy = [0, edge, im.height - edge, im.height];
    const dx = [0, edge, w * 2 - edge, w * 2];
    const dy = [0, edge, h * 2 - edge, h * 2];
    for (let row = 0; row < 3; row++)
      for (let col = 0; col < 3; col++)
        c.drawImage(
          im,
          sx[col],
          sy[row],
          sx[col + 1] - sx[col],
          sy[row + 1] - sy[row],
          dx[col],
          dy[row],
          dx[col + 1] - dx[col],
          dy[row + 1] - dy[row],
        );
    texture.refresh();
  }
  scene.add.image(x, y, id).setOrigin(0).setScale(0.5).setDepth(-900);
}

export function fineRoom(scene: PaintScene, map: MapData) {
  roomGround(scene, map);
  const add = (id: string, x: number, foot: number, depth = foot) =>
    scene.add
      .image(x, foot, `interior-${id}`)
      .setOrigin(0.5, 1)
      .setScale(0.5)
      .setDepth(depth);
  // Wall-mounted objects sit behind actors and keep the central approach clear.
  for (const x of [112, 368]) add("window", x, 57, -950);
  for (const x of [54, 426]) add("lantern", x, 70, -940);
  for (const f of map.furniture || []) {
    const [x, y, w, h] = f.rect;
    if (f.kind === "rug") {
      rug(scene, f.rect);
      continue;
    }
    const id =
      (
        {
          books: "bookcase",
          shelf: "bookcase",
          fireplace: "hearth",
          plant: "planter",
          chest: "chest-closed",
          desk: `desk-${w}`,
        } as Record<string, string>
      )[f.kind] || f.kind;
    const image = add(map.id === "shop" && f.kind === "workbench" ? "market-counter" : id, x + w / 2, y + h);
    if (map.id === "home" && f.kind === "chest")
      image.setData("home-response", "home_chest");
    if (map.id === "home" && f.kind === "bed")
      image.setData("home-response", "home_bed");
  }
  if (map.id === "guild") {
    // Presentation replaces the old procedural stand at the same interaction.
    scene.add
      .image(240, 192, "village-board")
      .setOrigin(0.5, 1)
      .setScale(0.5)
      .setDepth(192);
  }
  if (map.id === "home") {
    add("book", 96, 161, 177)
      .setVisible(false)
      .setData("home-response", "home_desk");
    add("book", 144, 168, 177)
      .setVisible(false)
      .setData("home-response", "home_reading");
  }
}

