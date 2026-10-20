// Bake the existing approved Web scene functions; no screenshot crops or new art.
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
const root = new URL("../", import.meta.url).pathname,
  require = createRequire(root + "package.json");
const { build } = require("esbuild"),
  { chromium } = require("playwright");
const check = process.argv.includes("--check"),
  refreshManifest = process.argv.includes("--refresh-manifest"),
  verifyPixels = check || refreshManifest,
  hash = (b) => crypto.createHash("sha256").update(b).digest("hex");
const geography = JSON.parse(
  execFileSync(
    root + "backend/.venv/bin/python",
    ["-c", "import json,sys;from pathlib import Path;from app.world import WORLD;root=Path.cwd().parent;inputs=sorted(str(Path(m.__file__).resolve().relative_to(root)) for k,m in sys.modules.copy().items() if k.startswith('app') and getattr(m,'__file__',None) and Path(m.__file__).resolve().is_relative_to(root/'backend/app'));print(json.dumps({'world':WORLD,'inputs':inputs}))"],
    { cwd: root + "backend", encoding: "utf8" },
  ),
);
const world = geography.world;
const inputMaps = {
  overworld: { ...world, interiors: undefined, areas: undefined },
  ...world.interiors,
};
const images = {};
const directories = [
  ["village", "assets/runtime/hearthwood/village"],
  ["interior", "assets/runtime/hearthwood/detail/interiors"],
];
const inputs = [
  "tools/scene-art/village.ts",
  "tools/scene-art/villageGround.ts",
  "tools/scene-art/interiors.ts",
  "backend/app/world.py",
];
for (const [prefix, folder] of directories)
  for (const name of await fs.readdir(root + folder)) {
    if (!name.endsWith(".png")) continue;
    const file = folder + "/" + name;
    images[prefix + "-" + name.slice(0, -4)] = {
      file,
      data:
        "data:image/png;base64," +
        (await fs.readFile(root + file)).toString("base64"),
    };
  }
images["village-shop"] = {
  file: "assets/runtime/hearthwood/market/shop.png",
};
images["interior-market-counter"] = {
  file: "assets/runtime/hearthwood/market/counter.png",
};
for (const info of Object.values(images))
  if (!info.data)
    info.data =
      "data:image/png;base64," +
      (await fs.readFile(root + info.file)).toString("base64");
const bundles = {}, moduleInputs = new Set();
for (const name of ["village", "interiors"])
  {
    const result = await build({
      absWorkingDir: root,
      entryPoints: [root + "tools/scene-art/" + name + ".ts"],
      bundle: true,
      write: false,
      metafile: true,
      format: "iife",
      globalName: "SceneSource",

    });
    bundles[name] = result.outputFiles[0].text;
    for (const file of Object.keys(result.metafile.inputs))
      if (!file.startsWith('stub:')) moduleInputs.add(file);
  }
const browser = await chromium.launch({ headless: true });
let rendered;
try {
  const page = await browser.newPage();
  rendered = await page.evaluate(
    async ({ images, maps, bundles }) => {
      const sources = new Map();
      for (const [id, info] of Object.entries(images)) {
        const image = new Image();
        image.src = info.data;
        await image.decode();
        sources.set(id, image);
      }
      const baked = {},
        layouts = {};
      for (const [name, map] of Object.entries(maps)) {
        const textures = new Map(),
          nodes = [];
        const scene = {
          textures: {
            exists: (key) => textures.has(key),
            get: (key) => ({
              getSourceImage: () => textures.get(key) || sources.get(key),
            }),
            createCanvas: (key, w, h) => {
              const c = document.createElement("canvas");
              c.width = w;
              c.height = h;
              textures.set(key, c);
              return { context: c.getContext("2d"), refresh() {} };
            },
            addCanvas: (key, c) => textures.set(key, c),
          },
          add: {
            image: (x, y, key) => {
              const im = textures.get(key) || sources.get(key);
              if (!im) throw Error("Missing actual texture " + key);
              const n = {
                kind: "image",
                key,
                x,
                y,
                w: im.width,
                h: im.height,
                originX: 0.5,
                originY: 0.5,
                scale: 1,
                depth: 0,
                alpha: 1,
                visible: true,
                data: {},
              };
              nodes.push(n);
              const api = {
                setOrigin: (x, y = x) => {
                  n.originX = x;
                  n.originY = y;
                  return api;
                },
                setScale: (s) => {
                  n.scale = s;
                  return api;
                },
                setDepth: (d) => {
                  n.depth = d;
                  return api;
                },
                setData: (k, v) => {
                  n.data[k] = v;
                  return api;
                },
                setVisible: (v) => {
                  n.visible = v;
                  return api;
                },
              };
              return api;
            },
            ellipse: (x, y, w, h, color, alpha) => {
              const n = {
                kind: "ellipse",
                key: "",
                x,
                y,
                w,
                h,
                originX: 0.5,
                originY: 0.5,
                scale: 1,
                depth: 0,
                alpha,
                color,
                visible: true,
                data: {},
              };
              nodes.push(n);
              return {
                setDepth: (d) => {
                  n.depth = d;
                },
              };
            },
          },
        };
        const run = new Function(
          bundles[name === "overworld" ? "village" : "interiors"] +
            ";return SceneSource;",
        )();
        if (name === "overworld") run.village(scene, map);
        else run.fineRoom(scene, map);
        for (const [key, c] of textures)
          baked[key] = {
            data: c.toDataURL("image/png").split(",")[1],
            width: c.width,
            height: c.height,
          };
        layouts[name] = nodes;
      }
      return { baked, layouts };
    },
    { images, maps: inputMaps, bundles },
  );
} finally {
  await browser.close();
}
const folder = "assets/derived/local-scenes",
  records = [],
  keys = {},
  dedup = new Map();
await fs.mkdir(root + folder, { recursive: true });
for (const [key, item] of Object.entries(rendered.baked)) {
  const bytes = Buffer.from(item.data, "base64"),
    sha = hash(bytes);
  let name = dedup.get(sha);
  if (!name) {
    name =
      key === "village-ground-v2"
        ? "terrain"
        : key.startsWith("fine-room-")
          ? "room-floor"
          : key.replace("fine-", "");
    dedup.set(sha, name);
    const file = folder + "/" + name + ".png";
    if (verifyPixels) {
      if (hash(await fs.readFile(root + file)) !== sha)
        throw Error("Raster drift " + file);
    } else await fs.writeFile(root + file, bytes);
    records.push({
      path: file,
      sha256: sha,
      width: item.width,
      height: item.height,
      bytes: bytes.length,
    });
  }
  keys[key] = "scenes/" + name;
}
const used = new Set();
for (const nodes of Object.values(rendered.layouts))
  for (const n of nodes) {
    if (n.kind === "image") {
      if (keys[n.key]) n.art = keys[n.key];
      else {
        const info = images[n.key];
        if (!info) throw Error("Unbound " + n.key);
        used.add(info.file);
        n.art = n.key.startsWith("village-")
          ? "village/" + n.key.slice(8)
          : "interiors/" + n.key.slice(9);
      }
      delete n.key;
    } else delete n.key;
  }
const allInputs = [
  ...new Set([
    ...inputs,
    ...geography.inputs,
    ...moduleInputs,
    ...Object.values(images).map(info => info.file),
    ...used,
    "tools/build_local_scene_art.mjs",
    ...["grass", "grass-patch", "bank-stones", "step"].map(
      (n) => "assets/runtime/hearthwood/village/" + n + ".png",
    ),
    "assets/runtime/hearthwood/detail/interiors/wall.png",
    "assets/runtime/hearthwood/detail/interiors/rug.png",
  ]),
].sort();
const sourceHashes = [];
for (const file of allInputs)
  sourceHashes.push({
    path: file,
    sha256: hash(await fs.readFile(root + file)),
  });
const artPaths = [
  ...new Set(
    Object.values(rendered.layouts).flatMap((nodes) =>
      nodes.filter((n) => n.kind === "image").map((n) => n.art),
    ),
  ),
].sort();
const script =
  "// Generated by tools/build_local_scene_art.mjs from existing Web scene code. Do not edit.\nexport type SceneImage = {kind:string;art?:string;x:number;y:number;w:number;h:number;originX:number;originY:number;scale:number;depth:number;alpha:number;visible:boolean;color?:number;data:Record<string,string|boolean>};\nexport const sceneLayouts:Record<string,SceneImage[]> = " +
  JSON.stringify(rendered.layouts) +
  ";\nexport const sceneArtPaths:string[] = " +
  JSON.stringify(artPaths) +
  ";\n";
const target = "shared/game/sceneLayout.ts";
if (verifyPixels) {
  if ((await fs.readFile(root + target, "utf8")) !== script)
    throw Error("Layout drift");
} else await fs.writeFile(root + target, script);
const manifest = {
  version: 1,
  status: "candidate_pending_owner_render_review",
  source:
    "Reproducible derivatives of existing project-authored Web terrain/floor/rug and existing generated sprites; no new external art",
  rebuild: "tools/build_local_scene_art.mjs",
  inputs: sourceHashes,
  geography_sha256: hash(JSON.stringify(inputMaps)),
  layout: { path: target, sha256: hash(script) },
  records,
  existing_sprite_inputs: [...used].sort(),
  notes:
    "2 source pixels/world unit. Furniture remains separate; no UI text baked into images. Actual server map dimensions/collisions/IDs unchanged.",
};
const dest = "docs/art/local-scene-art-v1.json";
if (check) {
  if (
    JSON.stringify(JSON.parse(await fs.readFile(root + dest))) !==
    JSON.stringify(manifest)
  )
    throw Error("Manifest drift");
} else
  await fs.writeFile(root + dest, JSON.stringify(manifest, null, 2) + "\n");
console.log(
  `${verifyPixels ? "Verified" : "Baked"} ${records.length} unique terrain/floor/rug PNGs (${records.reduce((sum, r) => sum + r.bytes, 0)} bytes), ${artPaths.length} actual sprite bindings and ${Object.keys(rendered.layouts).length} scene layouts; ${sourceHashes.length} complete file inputs${refreshManifest ? ' (provenance refreshed only)' : ''}.`,
);
