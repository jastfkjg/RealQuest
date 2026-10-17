import { Color, Graphics } from "cc";
import type { Mark } from "./core/caveArt";
const colors = new Map<string, Color>();
function color(hex: string, alpha: number) {
  const key = hex + ":" + alpha;
  let c = colors.get(key);
  if (!c) {
    c = new Color(hex);
    c.a = Math.round(alpha * 255);
    if (colors.size > 256) colors.clear();
    colors.set(key, c);
  }
  return c;
}
export function paintGraphics(g: Graphics, marks: Mark[]) {
  for (const m of marks) {
    if (m.fill) g.fillColor = color(m.fill, m.alpha ?? 1);
    if (m.stroke) {
      g.strokeColor = color(m.stroke, m.alpha ?? 1);
      g.lineWidth = m.line ?? 1;
    }
    if (m.kind === "rect") g.rect(m.x, -m.y - m.h, m.w, m.h);
    else if (m.kind === "ellipse") g.ellipse(m.x, -m.y, m.w / 2, m.h / 2);
    else {
      m.points.forEach((p, i) =>
        i ? g.lineTo(p.x, -p.y) : g.moveTo(p.x, -p.y),
      );
      if (m.kind === "poly") g.close();
    }
    if (m.fill) g.fill();
    if (m.stroke) g.stroke();
  }
}
