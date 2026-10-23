import type { Graphics } from 'cc';
import type { Mark } from './core/caveArt';
import { paintGraphics } from './cavePaint';

// Original soil artwork in world units. Half-unit pixels follow the village's
// two-source-pixels-per-world-unit density; no per-frame randomness or textures.
export function paintFarmPlot(g: Graphics, id: string, watered: boolean) {
  const c = watered
    ? { rim: '#403323', earth: '#604631', clod: '#725139', ridge: '#705037', light: '#896241', trench: '#493728' }
    : { rim: '#573f2b', earth: '#805432', clod: '#8b5c37', ridge: '#95643d', light: '#ad7b49', trench: '#5f3e29' };
  let seed = 0;
  for (let i = 0; i < id.length; i++) seed = (seed * 31 + id.charCodeAt(i)) >>> 0;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const marks: Mark[] = [];
  const rect = (x: number, y: number, w: number, h: number, fill: string) => marks.push({ kind: 'rect', x, y, w, h, fill });
  const edge = [
    [-17,-17],[-13,-17],[-13,-18],[-6,-18],[-6,-17],[1,-17],
    [1,-18],[8,-18],[8,-17],[16,-17],[16,-16],[19,-16],
    [19,-13],[20,-13],[20,-8],[21,-8],[21,-3],[20,-3],
    [20,3],[21,3],[21,8],[19.5,8],[19.5,13],[18,13],
    [18,16],[13,16],[13,17],[7,17],[7,16],[0,16],[0,17],
    [-6,17],[-6,16],[-12,16],[-12,17],[-17,17],[-17,15],
    [-20,15],[-20,11],[-21,11],[-21,5],[-20,5],[-20,-1],
    [-21,-1],[-21,-7],[-20,-7],[-20,-13],[-18,-13],[-18,-16],[-17,-16],
  ];
  const patch = (dy: number, fill: string) => marks.push({
    kind: 'poly', fill, points: edge.map(([x,y]) => ({ x, y: y + dy })),
  });
  // A shallow dark cut on the lower edge anchors the bed in the lawn.
  patch(1, c.rim);
  patch(0, c.earth);
  for (let i = 0; i < 40; i++) {
    const x = Math.floor((random() * 37 - 18.5) * 2) / 2;
    const y = Math.floor((random() * 31 - 16) * 2) / 2;
    rect(x, y, random() > .7 ? 1.5 : 1, .5, i % 3 ? c.clod : c.trench);
  }
  // Uneven clods form each crest; gaps and staggered channels avoid long,
  // ruler-straight highlights that would make the bed resemble timber.
  for (const y of [-13, -5, 3, 11]) {
    let previous = 0;
    for (let x = -18; x < 18; x += 3) {
      const offset = Math.floor(random() * 4) * .5;
      rect(x, y + 3.5 + offset, 3, 1 + Math.floor(random() * 3) * .5, c.trench);
      rect(x, y + offset, 3, 3, c.ridge);
      if (offset > previous) rect(x, y + previous, .5, offset - previous, c.clod);
      if (random() > .25) rect(x + .5, y + offset, 1 + Math.floor(random() * 3) * .5, .5, c.light);
      if (random() > .4) rect(x + 1, y + offset + 2, 1, 1, c.earth);
      previous = offset;
    }
    rect(-18, y, 1, 2, c.earth);
    rect(17, y + 2, 1, 2, c.earth);
  }
  // Loose crumbs break the silhouette without extending the interaction area.
  for (const [x,y] of [[-20,-15],[18,-17],[-21,6],[19,14],[-15,17],[8,-18]]) {
    rect(x, y, 1.5, 1, c.clod);
    rect(x, y + 1, 1, .5, c.rim);
  }
  paintGraphics(g, marks);
}
