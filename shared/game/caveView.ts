import type { CaveEnemy, GameState, MapData, CombatAction } from "./protocol";
import { walkable } from "./navigation";
import type { Mark } from "./caveArt";
export function caveSight(
  map: MapData,
  a: { x: number; y: number },
  b: { x: number; y: number },
) {
  const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 4));
  for (let i = 1; i <= n; i++)
    if (
      !walkable(map, a.x + ((b.x - a.x) * i) / n, a.y + ((b.y - a.y) * i) / n)
    )
      return false;
  return true;
}
export function liveTarget(
  s: GameState,
  id: string | null,
): CaveEnemy | undefined {
  const alive = (s.combat?.enemies || []).filter((e) => e.hp > 0);
  return (
    alive.find((e) => e.id === id) ||
    alive.sort(
      (a, b) =>
        Math.hypot(a.x - s.position.x, a.y - s.position.y) -
        Math.hypot(b.x - s.position.x, b.y - s.position.y),
    )[0]
  );
}
export function nextTarget(s: GameState, id: string | null): string | null {
  const alive = (s.combat?.enemies || []).filter((e) => e.hp > 0),
    i = alive.findIndex((e) => e.id === id);
  return alive.length ? alive[(i + 1) % alive.length].id : null;
}
export function caveStatus(s: GameState, id: string | null, map: MapData) {
  const c = s.combat!,
    target = liveTarget(s, id),
    weapon =
      c.equipped && s.inventory[c.equipped] > 0 ? c.weapons[c.equipped] : null;
  const blocked = !!target && !caveSight(map, s.position, target),
    far =
      !!target &&
      !!weapon &&
      Math.hypot(target.x - s.position.x, target.y - s.position.y) >
        weapon.reach + (target.kind === "boss" ? 20 : 10);
  const safe = s.position.x < 144,
    entry = s.position.x < 166;
  const hint = c.cleared
    ? "本层已清理 · 走近阶梯继续，或返回洞口"
    : safe
      ? "安全入口 · 向右走入战斗区"
      : entry
        ? "继续向右，越过入口缓冲区"
        : !weapon
          ? "尚未持有已装备武器 · 可从旅程页换装"
          : c.cast?.kind === "soup"
            ? "正在喝汤 · 受击会中断"
            : blocked
              ? "石柱挡住目标 · 绕行后再攻击"
              : far
                ? "目标超出射程 · 再走近一些"
                : (s.stamina?.current || 0) < weapon.stamina
                  ? "体力不足 · 可饮汤或安全撤离"
                  : target?.phase === "windup"
                    ? "预兆已出现 · 移开金色区域"
                    : target?.phase === 'recover'
                      ? target.kind === 'beetle' ? '硬壳露出破绽 · 趁收招反击' : '收招破绽 · 靠近反击'
                      : "按住普攻 · 移动避让 · V 闪避";
  const cast = c.cast,
    progress = cast
      ? Math.max(
          0,
          Math.min(
            1,
            (c.time - cast.started) /
              Math.max(0.001, cast.until - cast.started),
          ),
        )
      : 0;
  return {
    target,
    weapon,
    blocked,
    far,
    safe,
    entry,
    hint,
    remaining: c.enemies.filter((e) => e.hp > 0).length,
    castProgress: progress,
    castLabel:
      cast?.kind === "soup"
        ? "饮汤中"
        : cast?.kind === "spark"
          ? "火花施放中"
          : cast
            ? "出手中"
            : "",
    sparkWait: Math.max(0, Math.ceil(c.spark_at - c.time)),
    soupWait: Math.max(0, Math.ceil(c.soup_at - c.time)),
  };
}
export function confirmedFeedback(s: GameState, reduced = false) {
  const c = s.combat;
  if (!c) return [];
  return c.effects
    .filter((e) => e.until > c.time && (e.kind === 'hit' || e.kind === 'hurt'))
    .slice(-8)
    .map((e) => {
      const remaining = Math.min(0.65, e.until - c.time),
        age = 1 - remaining / 0.65;
      return {
        ...e,
        anchorY: e.y - (e.kind === "hit" && c.floor === 5 ? 84 : 48),
        key: [c.encounter,e.id ?? [e.kind, e.x, e.y, e.text, e.until].join(":")].join(':'),
        alpha: reduced ? 1 : Math.min(1, remaining / 0.15),
        lift: reduced ? 0 : age * 12,
      };
    });
}
export function combatMarks(
  s: GameState,
  id: string | null,
  reduced = false,
): Mark[] {
  const a: Mark[] = [],
    c = s.combat;
  if (!c) return a;
  const p = s.position;
  const path = (points: number[][], stroke: string, line = 1, alpha = 1) =>
    a.push({
      kind: "line",
      points: points.map(([x, y]) => ({ x, y })),
      stroke,
      line,
      alpha,
    });
  const oval = (
    x: number,
    y: number,
    w: number,
    h: number,
    stroke: string,
    line = 1,
    fill?: string,
    alpha = 1,
  ) => a.push({ kind: "ellipse", x, y, w, h, stroke, line, fill, alpha });
  oval(p.x, p.y, 27, 10, "#efe5bf", 1, undefined, 0.85);
  for (const e of c.enemies) {
    if (e.hp <= 0) continue;
    if (e.id === id) {
      const w = e.kind === "boss" ? 37 : 21;
      for (const sign of [-1, 1]) {
        path(
          [
            [e.x + sign * (w - 6), e.y - 4],
            [e.x + sign * w, e.y - 4],
            [e.x + sign * w, e.y + 4],
            [e.x + sign * (w - 6), e.y + 4],
          ],
          "#f0dc9f",
          1.5,
        );
      }
    }
    if (e.phase === "windup") {
      const stroke = "#e6bd7f",
        fill = "#a96b42",
        alpha = reduced ? 0.3 : 0.28 + 0.04 * Math.sin(c.time * 8);
      if (e.style === "sweep") {
        const angle = Math.atan2(e.ty - e.y, e.tx - e.x),
          points = [{ x: e.x, y: e.y }];
        for (let i = 0; i <= 18; i++)
          points.push({
            x: e.x + Math.cos(angle - Math.PI / 3 + (i * Math.PI) / 27) * 60,
            y: e.y + Math.sin(angle - Math.PI / 3 + (i * Math.PI) / 27) * 60,
          });
        a.push({ kind: "poly", points, fill, stroke, line: 1.5, alpha });
        a.push({ kind: "line", points: points.slice(1), stroke, line: 1.5 });
      } else if (e.kind === "bat" || e.style === "shot") {
        path(
          [
            [e.x, e.y],
            [e.tx, e.ty],
          ],
          stroke,
          e.kind === "bat" ? 5 : 2,
          0.45,
        );
        path(
          [
            [e.x, e.y],
            [e.tx, e.ty],
          ],
          stroke,
          1.5,
        );
        oval(e.tx, e.ty, 20, 20, stroke, 1.5);
      } else {
        const r = e.kind === "boss" ? 40 : 26;
        a.push({
          kind: "ellipse",
          x: e.tx,
          y: e.ty,
          w: r * 2,
          h: r * 2,
          fill,
          alpha,
        });
        oval(e.tx, e.ty, r * 2, r * 2, stroke, 1.5);
      }
    }
  }
  for (const shot of c.projectiles) {
    const bodyY=shot.y-18;
    a.push({
      kind: "poly",
      points: [
        { x: shot.x, y: bodyY - 6 },
        { x: shot.x + 4, y: bodyY },
        { x: shot.x, y: bodyY + 6 },
        { x: shot.x - 4, y: bodyY },
      ],
      fill: shot.side === 'player' ? '#d4f0bc' : "#f0cc8a",
      stroke: shot.side === 'player' ? '#6f9c79' : "#946940",
      line: 0.7,
    });
  }
  if (c.cast && c.cast.kind === "spark") {
    const angle = c.cast.angle || 0,
      r = c.cast.reach || 28;
    path(
      [
        [p.x, p.y - 12],
        [p.x + Math.cos(angle) * r, p.y - 12 + Math.sin(angle) * r],
      ],
      c.cast.kind === "spark" ? "#e7c487" : "#f1e3b8",
      c.cast.kind === "spark" ? 2.5 : 1.5,
    );
  }
  // A glint is derived only from a server-confirmed hit, not an input/cast intention.
  for (const e of c.effects.filter(
    (e) => e.kind === "hit" && e.until - c.time > 0.42,
  )) {
    path(
      [
        [e.x - 4, e.y - 24],
        [e.x + 4, e.y - 16],
      ],
      "#fff0be",
      1.5,
    );
    path(
      [
        [e.x + 4, e.y - 24],
        [e.x - 4, e.y - 16],
      ],
      "#fff0be",
      1.5,
    );
  }
  return a;
}

/** Original native weapon geometry; a swing is an intention, never a claimed hit. */
export function weaponMarks(equipped:string|null,owned:boolean,p:{x:number;y:number},action:CombatAction|null,time:number,reduced=false):Mark[]{
  if(!equipped||!owned)return [];
  const marks:Mark[]=[],casting=action?.kind==='spark',style=(casting?null:action?.style)||(equipped==='glow_staff'?'bolt':equipped==='spring_spear'?'thrust':'sweep');
  const age=action?Math.max(0,time-action.started):0,phase=Math.min(1,age/.32),active=!!action&&time<action.until;
  const aim=action?.angle||0,angle=active?(style==='sweep'&&!casting?aim-1.1+phase*2.2:aim):.65;
  const extension=active&&style==='thrust'?(reduced?12:Math.sin(phase*Math.PI)*22):0;
  const origin={x:p.x+(active?Math.cos(aim)*extension:10),y:p.y-18+(active?Math.sin(aim)*extension:0)};
  const point=(along:number,across:number)=>({x:origin.x+Math.cos(angle)*along-Math.sin(angle)*across,y:origin.y+Math.sin(angle)*along+Math.cos(angle)*across});
  const line=(start:number,end:number,color:string,width:number)=>marks.push({kind:'line',points:[point(start,0),point(end,0)],stroke:color,line:width});
  if(active&&style==='sweep'&&!casting){
    const points=[{x:origin.x,y:origin.y}];
    const reach=action.reach||34;
    for(let i=0;i<=12;i++){const a=aim-1.1+(i/12)*2.2;points.push({x:origin.x+Math.cos(a)*reach,y:origin.y+Math.sin(a)*reach});}
    marks.push({kind:'poly',points,fill:'#e5e7bf',alpha:reduced?.12:.14+Math.sin(phase*Math.PI)*.12});
    if(!reduced)marks.push({kind:'line',points:points.slice(1),stroke:'#eee7ba',line:2,alpha:.65});
  }
  if(active&&casting)marks.push({kind:'ellipse',x:point(20,0).x,y:point(20,0).y,w:20,h:20,stroke:'#e7c487',line:2,alpha:.8});
  if(style==='thrust'){
    line(-12,25,'#71593f',3);
    marks.push({kind:'poly',points:[point(25,-3),point(35,0),point(25,3)],fill:'#d8e6ce',stroke:'#486554',line:1});
  }else if(style==='bolt'||style==='spark'){
    line(-6,16,'#71593f',3);
    marks.push({kind:'poly',points:[point(15,-4),point(22,0),point(15,4),point(11,0)],fill:active?'#f2e7ac':'#c9e0b1',stroke:'#5d8068',line:1});
    if(active)marks.push({kind:'ellipse',x:point(18,0).x,y:point(18,0).y,w:14+(reduced?0:phase*12),h:14+(reduced?0:phase*12),stroke:style==='spark'?'#e7c487':'#d4e9b6',line:2,alpha:.8});
  }else{
    line(-5,2,'#735638',4);
    marks.push({kind:'line',points:[point(3,-5),point(3,5)],stroke:'#c7ac71',line:2});
    marks.push({kind:'poly',points:[point(5,-2.5),point(27,-1.5),point(31,0),point(27,2),point(5,2.5)],fill:equipped==='reinforced_sword'?'#e3e7cf':'#b6c6b0',stroke:'#4d6556',line:1});
  }
  return marks;
}
