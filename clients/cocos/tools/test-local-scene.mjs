import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
const root = new URL("../../../", import.meta.url),
  require = createRequire(new URL("frontend/package.json", root)),
  ts = require("typescript"),
  dest = new URL("output/village-polish/modules/", root);
await fs.mkdir(dest, { recursive: true });
await fs.writeFile(new URL("package.json", dest), '{"type":"module"}');
for (const name of await fs.readdir(new URL("shared/game", root))) {
  if (!name.endsWith(".ts")) continue;
  const code = ts
    .transpileModule(
      await fs.readFile(new URL("shared/game/" + name, root), "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.ES2022,
          target: ts.ScriptTarget.ES2022,
        },
      },
    )
    .outputText.replace(/from (["'])(\.\/[^"']+)\1/g, "from $1$2.js$1");
  await fs.writeFile(new URL(name.replace(".ts", ".js"), dest), code);
}
const { approachRoute, localCamera, routeMarks, focusMarks, sourceActorFrame } =
    await import(new URL("localScene.js", dest)),
  { walkable } = await import(new URL("navigation.js", dest)),
  { sceneLayouts, sceneArtPaths } = await import(
    new URL("sceneLayout.js", dest)
  );
const world = JSON.parse(
  execFileSync(
    new URL("backend/.venv/bin/python", root).pathname,
    ["-c", "import json;from app.world import WORLD;print(json.dumps(WORLD))"],
    { cwd: new URL("backend", root), encoding: "utf8" },
  ),
);
for (const map of [world, ...Object.values(world.interiors)]) {
  const before = JSON.stringify(map);
  for (const obj of map.objects.filter((o) =>
    ["building", "storage", "study", "rest", "station", "exit"].includes(
      o.kind,
    ),
  )) {
    const from =
        map.id === "overworld" ? { x: 240, y: 352 } : { x: 240, y: 294 },
      route = approachRoute(map, from, obj);
    assert(route.length, obj.id + " reachable");
    const end = route.at(-1);
    assert(Math.hypot(end.x - obj.x, end.y - obj.y) <= 60);
    for (const p of route)
      assert(walkable(map, p.x, p.y), obj.id + " walkable route");
  }
  assert.equal(JSON.stringify(map), before);
}
assert.equal(localCamera(world, 1440, 900), 2);
for (const direction of [0, 1, 2, 3]) {
  assert.equal(sourceActorFrame(direction, false, 2), direction);
  assert.equal(sourceActorFrame(direction, true, 2, true), direction);
  assert(sourceActorFrame(direction, true, 0.2) >= 4);
}
assert.equal(localCamera(world.interiors.home, 740, 360), 1.5);
assert.equal(localCamera({ id: "cave_1" }, 740, 360), 1.65);
const p = [
    { x: 100, y: 120 },
    { x: 116, y: 120 },
  ],
  copy = JSON.stringify(p);
assert(routeMarks(p, true, 1).length);
assert.deepEqual(routeMarks(p, true, 1), routeMarks(p, true, 10));
assert.equal(JSON.stringify(p), copy);
assert.deepEqual(routeMarks([]), []);
assert(
  focusMarks(
    world.interiors.home.objects.find((o) => o.id === "home_chest"),
    "pending",
  ).length >
    focusMarks(world.interiors.home.objects.find((o) => o.id === "home_chest"))
      .length,
);
assert.equal(Object.keys(sceneLayouts).length, 7);
const home = sceneLayouts.home;
assert(home.some((n) => n.data["home-response"] === "home_chest"));
assert(
  home
    .filter((n) => String(n.data["home-response"] || "").includes("reading"))
    .every((n) => !n.visible),
);
for (const art of sceneArtPaths)
  await fs.access(
    new URL("clients/cocos/assets/resources/" + art + ".png", root),
  );
console.log(
  "Local scene behavior passes: all real room/building approaches, unchanged maps, common camera, static reduced-motion route, focus/pending cues and exact existing sprite bindings.",
);
