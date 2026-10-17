import Phaser from "phaser";
import type { Mark } from "../../../shared/game/caveArt";
const color = (value: string) => Number.parseInt(value.slice(1), 16);
export function paintGraphics(g: Phaser.GameObjects.Graphics, marks: Mark[]) {
  for (const m of marks) {
    if (m.fill) g.fillStyle(color(m.fill), m.alpha ?? 1);
    if (m.stroke) g.lineStyle(m.line ?? 1, color(m.stroke), m.alpha ?? 1);
    if (m.kind === "rect") {
      if (m.fill) g.fillRect(m.x, m.y, m.w, m.h);
      if (m.stroke) g.strokeRect(m.x, m.y, m.w, m.h);
    } else if (m.kind === "ellipse") {
      if (m.fill) g.fillEllipse(m.x, m.y, m.w, m.h);
      if (m.stroke) g.strokeEllipse(m.x, m.y, m.w, m.h);
    } else {
      if (m.fill) g.fillPoints(m.points, true);
      if (m.stroke) g.strokePoints(m.points, m.kind === "poly");
    }
  }
}
export function paintCanvas(c: CanvasRenderingContext2D, marks: Mark[]) {
  for (const m of marks) {
    c.globalAlpha = m.alpha ?? 1;
    c.beginPath();
    if (m.kind === "rect") c.rect(m.x, m.y, m.w, m.h);
    else if (m.kind === "ellipse")
      c.ellipse(m.x, m.y, m.w / 2, m.h / 2, 0, 0, Math.PI * 2);
    else {
      m.points.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
      if (m.kind === "poly") c.closePath();
    }
    if (m.fill) {
      c.fillStyle = m.fill;
      c.fill();
    }
    if (m.stroke) {
      c.strokeStyle = m.stroke;
      c.lineWidth = m.line ?? 1;
      c.stroke();
    }
  }
  c.globalAlpha = 1;
}
