import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
const root = new URL("../../../", import.meta.url),
  require = createRequire(new URL("package.json", root)),
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
const { approachRoute, localCamera, routeMarks, focusMarks, sourceActorFrame, pendingSafeMove, unobscuredCamera } =
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

const corner={width:512,height:256,obstacles:[[120,80,40,80]],objects:[]};
const waiting={x:180,y:180},turn={x:180,y:140};
assert.deepEqual(pendingSafeMove(corner,waiting,turn,{x:100,y:180}),waiting,'do not send a chord through the corner');
assert.deepEqual(pendingSafeMove(corner,waiting,turn,waiting),turn,'continue after the corner position is confirmed');
assert.deepEqual(pendingSafeMove(corner,{x:100,y:175},{x:100,y:140},{x:100,y:180},waiting),{x:100,y:175},'also respect the next authoritative origin while a move is in flight');
assert.deepEqual(pendingSafeMove(corner,{x:100,y:180},{x:112,y:160},{x:100,y:180}),{x:112,y:180},'slide along a clear axis instead of cutting the wall');
assert.deepEqual(pendingSafeMove(corner,{x:300,y:180},{x:304,y:180},{x:24,y:180}),{x:300,y:180},'wait before exceeding the server move distance');
console.log('Pending-safe prediction waits for corner/in-flight confirmations, keeps wall sliding and respects server move bounds.');


// Public framing invariants: protect actual world silhouettes, preserve inputs,
// account for arbitrary fixed controls rather than an expected camera formula.
const ui=[{x:20,y:20,w:284,h:94},{x:20,y:130,w:196,h:44},
 ...[348,432,516,624].map((x,i)=>({x,y:20,w:i<2?72:96,h:48})),
 ...[368,458,548,638].map(x=>({x,y:220,w:82,h:54})),
 {x:20,y:204,w:144,h:80},{x:192,y:288,w:264,h:48},{x:468,y:284,w:252,h:56}];
for(const [px,py,ex,ey] of [[320,300,400,224],[320,180,400,256],[400,256,304,240],[576,352,512,304]]){
 const actors=[{x:px-16,y:py-128/3,w:32,h:128/3},{x:ex-39,y:ey-78,w:78,h:83}],before=JSON.stringify({actors,ui});
 const frame=unobscuredCamera(actors,ui,740,360,{x:-px*1.65,y:py*1.65,zoom:1.65});
 assert(frame.zoom<=1.65&&frame.zoom>=.65);
 for(const a of actors){
  const box={x:370+frame.x+a.x*frame.zoom,y:180-frame.y+a.y*frame.zoom,w:a.w*frame.zoom,h:a.h*frame.zoom};
  assert(box.x>=7.99&&box.y>=7.99&&box.x+box.w<=732.01&&box.y+box.h<=352.01);
  for(const b of ui)assert(!(box.x<b.x+b.w&&box.x+box.w>b.x&&box.y<b.y+b.h&&box.y+box.h>b.y),'actor remains clear of fixed UI');
 }
 assert.equal(JSON.stringify({actors,ui}),before);
}
for(const [px,py,ex,ey] of [[320,300,400,224],[320,180,400,256],[400,256,304,240],[576,352,512,304]]){
 const actors=[{x:px-16,y:py-128/3,w:32,h:128/3},{x:ex-39,y:ey-78,w:78,h:83}];
 const f=unobscuredCamera(actors,ui,740,360,{x:-px*1.65,y:py*1.65,zoom:1.65},640);
 assert([f.x,f.y,f.zoom].every(Number.isFinite));
 const mapLeft=370+f.x,mapRight=mapLeft+640*f.zoom,side=Math.max(0,(740-640*f.zoom)/2);
 assert(mapLeft<=side+.01&&740-mapRight<=side+.01,'keep the authored room horizontally covered or centered');
 for(const a of actors){
  const b={x:370+f.x+a.x*f.zoom,y:180-f.y+a.y*f.zoom,w:a.w*f.zoom,h:a.h*f.zoom};
  assert(b.x>=7.99&&b.y>=7.99&&b.x+b.w<=732.01&&b.y+b.h<=352.01);
  for(const u of ui)assert(!(b.x<u.x+u.w&&b.x+b.w>u.x&&b.y<u.y+u.h&&b.y+b.h>u.y));
 }
}
assert.deepEqual(unobscuredCamera([],ui,740,360,{x:0,y:0,zoom:1.65}),{x:0,y:0,zoom:1.65});
console.log('Framing protects both silhouettes and HP against clipping/fixed HUD at four bearings, without mutating world/UI inputs.');
