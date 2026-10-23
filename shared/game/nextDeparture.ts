import type { GameState, NavigationTarget, Panel } from "./protocol";
import {canReadGate, legacyJourney, isMainTracked} from './story';

export type PreparationTopic = "gear" | "trail" | "growth";
export interface PreparationAction {
  label: string;
  target?: NavigationTarget;
  panel?: Panel;
  magic?: boolean;
}
export interface PreparationStep extends PreparationAction {
  id: string;
  topic: PreparationTopic;
  title: string;
  note: string;
}
const cave = { mapId: "overworld", targetId: "cave_entry" };
const noah = { mapId: "overworld", targetId: "noah" };
const armory = { mapId: "workshop", targetId: "armory_counter" };
export const bed = { mapId: "home", targetId: "home_bed" };

export function hasDepartureNotes(state: GameState) {
  return canReadGate(state) && !!state.combat && !!state.village_intro?.reviewed && (legacyJourney(state) || !!state.village_intro?.briefed);
}
export function activePromise(state: GameState) {
  return state.life_journal?.tasks.find((task) => task.status === "active");
}
export function clearedDepth(state: GameState) {
  return state.combat?.boss_first
    ? 5
    : Math.max(0, Math.min(4, (state.combat?.unlocked || 1) - 1));
}
export function growthStep(state: GameState, now: number): PreparationStep {
  const magic = state.knowledge_growth?.magic || 0;
  const task = activePromise(state);
  if (task && task.ready_at <= now)
    return {
      id: "settle",
      topic: "growth",
      title: "约定已到期，去找诺亚结算",
      note:
        task.kind === "study"
          ? `这份学习约定可结算 ${task.hours} 知识点；结算后再主动投入魔法研修。`
          : `这份${task.kind === "work" ? "工作" : "运动"}约定可结算${task.kind === "work" ? "技能" : "健康"}点。启门魔法所需的知识点来自学习约定。`,
      label: "标记诺亚 · 结算约定",
      target: noah,
    };
  if (magic >= 3)
    return {
      id: "magic-ready",
      topic: "growth",
      title: "启门魔法已经备妥",
      note: "魔法已达到3级。取得底层守卫的魔法石后，仍需到石门前亲手嵌石。",
      label: "查看冒险者档案",
      panel: "character",
    };
  if ((state.knowledge_points || 0) > 0)
    return {
      id: "invest",
      topic: "growth",
      title: "把已有知识，投入启门魔法",
      note: `可用知识点 ${state.knowledge_points}；魔法 ${magic} / 3级。每级投入1点，选择方向不会花点。`,
      label: "翻开魔法研修",
      panel: "study",
      magic: true,
    };
  if (task)
    return {
      id: "promise",
      topic: "growth",
      title:
        task.kind === "study" ? "学习约定正在计时" : "已有一份现实约定进行中",
      note:
        task.kind === "study"
          ? "关闭页面也会继续计时。到期后找诺亚结算；现在可以继续探索洞穴。"
          : `当前${task.kind === "work" ? "工作" : "运动"}约定不发知识点。保留这份约定，之后再安排学习也可以。`,
      label: "查看当前约定",
      panel: "activity",
    };
  if (!state.life_journal || state.life_journal.remaining <= 0)
    return {
      id: "quota",
      topic: "growth",
      title: "今天的成长额度已经安排完了",
      note: "每日额度在北京时间零点刷新。已有成长保留，洞穴探索和村庄生活仍可继续。",
      label: "查看成长手记",
      panel: "activity",
    };
  return {
    id: "arrange",
    topic: "growth",
    title: "找诺亚安排一份学习约定",
    note: `启门魔法还差 ${3 - magic} 级。每现实小时结算1知识点；今日还可领取 ${state.life_journal.remaining} 小时。`,
    label: "标记诺亚 · 安排学习",
    target: noah,
  };
}
export function trailStep(state: GameState): PreparationStep {
  const c = state.combat!;
  if (c.gate_open)
    return {
      id: "departed",
      topic: "trail",
      title: "石门已开，远行可以继续",
      note: "永久通行已经保存。前往东行出口，查看渡口旅途安排。",
      label: "标记东行出口",
      target: { mapId: "overworld", targetId: "village_departure" },
    };
  if (c.boss_first && !state.inventory.gate_stone)
    return {
      id: "stone",
      topic: "trail",
      title: "到洞口核实门钥魔法石",
      note: "首次击败记录已保留。石门未开且魔法石缺失时，可在洞口核实补领。",
      label: "标记石根山洞 · 核实魔法石",
      target: cave,
    };
  if (c.boss_first)
    return {
      id: "gate",
      topic: "trail",
      title: "魔法石已带回，准备唤醒石门",
      note:
        (state.knowledge_growth?.magic || 0) >= 3
          ? "守卫记录、门钥魔法石和魔法3级都已备妥。到石门前确认，开启后永久通行。"
          : `魔法石已在背包。启门仍需魔法3级，当前 ${state.knowledge_growth?.magic || 0} 级；无需再打一次守卫。`,
      label: "标记东行石门",
      target: { mapId: "overworld", targetId: "village_departure" },
    };
  const depth = clearedDepth(state);
  const title =
    depth < 2
      ? "再探第2层，寻找微光晶屑"
      : depth === 2
        ? "向第3层进发，寻找硬壳碎片"
        : depth === 3
          ? "沿绳梯返回，继续第4层"
          : "通往底层的路已开，准备挑战守卫";
  const note =
    depth < 2
      ? "晶屑与首层胶质可用于微光短杖。先用已有武器探索，打造另需图纸条件。"
      : depth === 2
        ? "硬壳可用于加固短剑和弹簧长矛。清理第3层后，入口绳梯永久开放。"
        : depth === 3
          ? "洞口内的绳梯通往第3层安全平台；休整后再前往第4层。"
          : "洞口内的深层通路已开放。建议补足生命、体力并准备菜汤，随时可以撤退。";
  if (state.location.startsWith("cave_"))
    return {
      id: "inside",
      topic: "trail",
      title: c.cleared
        ? "本层已清理，可以继续或返村"
        : "你正在洞穴里，按自己的节奏探索",
      note: "阅读时战斗暂停。合上手记后继续；已获材料和永久通路都会保留。",
      label: "合上手记，回到洞穴",
      panel: null,
    };
  return {
    id: `floor-${depth + 1}`,
    topic: "trail",
    title,
    note,
    label: "标记石根山洞 · 再次出发",
    target: cave,
  };
}
export function nextDeparture(
  state: GameState,
  now: number,
): PreparationStep | null {
  if (!hasDepartureNotes(state)) return null;
  const c = state.combat!;
  if (c.gate_open || state.location.startsWith("cave_"))
    return trailStep(state);
  if (
    (state.vitality?.current ?? 100) < 40 ||
    (state.stamina?.current ?? 100) < 20
  )
    return {
      id: "rest",
      topic: "gear",
      title: "下次出发前，先回家休整",
      note: "生命或体力偏低。床边可免费小憩或睡眠恢复，走路不耗体力。",
      label: "标记家中床铺",
      target: bed,
    };
  const owned = Object.keys(c.weapons).filter((id) => state.inventory[id] > 0);
  if (!c.equipped || !state.inventory[c.equipped])
    return {
      id: "equip",
      topic: "gear",
      title: owned.length ? "先把随身武器装备好" : "先准备一件趁手的武器",
      note: owned.length
        ? "武器已经在背包，主动装备后才能使用。整理装备不消耗物品。"
        : "购买武器不要求制造等级；已有洞穴通路会保留。",
      label: owned.length ? "打开随身装备" : "标记工坊武备台",
      ...(owned.length ? { panel: "equipment" as Panel } : { target: armory }),
    };
  if (
    c.boss_first &&
    (!state.inventory.gate_stone || (state.knowledge_growth?.magic || 0) >= 3)
  )
    return trailStep(state);
  const growth = growthStep(state, now);
  if (["settle", "invest", "arrange"].includes(growth.id) || c.boss_first)
    return growth;
  return trailStep(state);
}
export function trackedDeparture(state: GameState, now: number) {
  if (
    (!legacyJourney(state) && state.quests.gate_preparation?.status !== 'active') ||
    state.village_intro?.dismissed ||
    state.combat?.gate_open ||
    !isMainTracked(state)
  )
    return null;
  return nextDeparture(state, now);
}

export interface JourneyBookmark {
  version: 1;
  at: number;
  depth: number;
  magic: number;
}
export interface ReturnNote {
  title: string;
  note: string;
}
export function returnNote(
  state: GameState,
  now: number,
  previous: JourneyBookmark | null,
): ReturnNote | null {
  if (
    !previous ||
    previous.version !== 1 ||
    !Number.isFinite(previous.at) ||
    now - previous.at < 300 ||
    !hasDepartureNotes(state) ||
    state.village_intro?.dismissed ||
    state.combat?.gate_open ||
    !isMainTracked(state) || (!legacyJourney(state) && state.quests.gate_preparation?.status !== 'active')
  )
    return null;
  const step = nextDeparture(state, now);
  return step
    ? {
        title:
          step.id === "settle"
            ? "约定已到期，下一程接上了"
            : "欢迎回来，接着准备下一程",
        note: step.title,
      }
    : null;
}
export function readJourneyBookmark(
  id: string | undefined,
): JourneyBookmark | null {
  try {
    return id
      ? JSON.parse(localStorage.getItem(`realquest-return-v1:${id}`) || "null")
      : null;
  } catch {
    return null;
  }
}
export function rememberJourney(
  state: GameState,
  now: number,
  id: string | undefined,
) {
  if (!id || !hasDepartureNotes(state)) return;
  try {
    localStorage.setItem(
      `realquest-return-v1:${id}`,
      JSON.stringify({
        version: 1,
        at: now,
        depth: clearedDepth(state),
        magic: state.knowledge_growth?.magic || 0,
      } satisfies JourneyBookmark),
    );
  } catch {
    /* Optional device-local continuation metadata. */
  }
}
