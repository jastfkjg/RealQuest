import {formatMoney} from './currency';
import type { GameState, NavigationTarget, Panel } from "./protocol";
import {canExploreStory, legacyJourney, isMainTracked} from './story';

export interface IntroStep {
  id: string;
  index: number;
  title: string;
  note: string;
  action: string;
  target?: NavigationTarget;
  panel?: Panel;
}

export function villageIntroStep(state: GameState): IntroStep | null {
  const intro = state.village_intro;
  const combat = state.combat;
  if (
    !canExploreStory(state) || !intro ||
    intro.dismissed ||
    intro.reviewed ||
    !combat ||
    combat.gate_open ||
    state.quests.settle_in?.status !== "claimed"
  )
    return null;
  const step = (
    id: string,
    index: number,
    title: string,
    note: string,
    action: string,
    target?: NavigationTarget,
    panel?: Panel,
  ): IntroStep => ({ id, index: legacyJourney(state) ? index : Math.max(0, index - 1), title, note, action, target, panel });
  const armory = { mapId: "workshop", targetId: "armory_counter" };
  if (!intro.briefed && legacyJourney(state))
    return step(
      "brief",
      0,
      "了解第一次远行的条件",
      "先到告示板读一读远行来信。初探只需准备武器，启门条件可以逐步完成。",
      "标记村庄告示板",
      { mapId: "overworld", targetId: "board" },
    );
  if (intro.returned)
    return step(
      "review",
      3,
      "在武备台看看材料的用途",
      "你已经带着首层材料回到工坊。查看它能用于什么，再安排下一次探索。",
      "标记工坊武备台",
      armory,
    );
  if (
    intro.first_clear &&
    !state.location.startsWith("cave_") &&
    !state.inventory.gel
  ) {
    const stored = state.storage.gel > 0;
    return step(
      "retrieve",
      3,
      stored ? "取回初探带来的胶质" : "再带一份胶质回工坊",
      stored
        ? "首层战果已保存。先从家中储物箱取回胶质，再带去工坊查看用途。"
        : "已清理的通路保留。可继续探索取得胶质，再带回工坊；不用重新领取奖励。",
      stored ? "标记家中储物箱" : "标记石根山洞",
      stored
        ? { mapId: "home", targetId: "home_chest" }
        : { mapId: "overworld", targetId: "cave_entry" },
    );
  }
  if (intro.first_clear)
    return step(
      state.location.startsWith("cave_") ? "retreat" : "return",
      3,
      state.location.startsWith("cave_")
        ? "首层已清理，带材料回洞口"
        : "带材料回村庄工坊",
      "初探已经有了收获。已获材料和通路会保存，不必现在深入第2层。",
      state.location.startsWith("cave_") ? "标记本层出口" : "标记工坊武备台",
      state.location.startsWith("cave_")
        ? { mapId: state.location, targetId: "cave_exit" }
        : armory,
    );
  const owned = Object.keys(combat.weapons).some(
    (id) => state.inventory[id] > 0,
  );
  if (!owned) {
    const price = combat.weapons.stone_sword.price;
    if (state.inventory.gold < price) {
      const sellable = ["wood", "stone", "crop", "plank"].some(
        (id) => state.inventory[id] > 0,
      );
      return step(
        "income",
        1,
        `首把短剑还差 ${formatMoney(price - state.inventory.gold)}`,
        sellable
          ? "小铺收购木材、石料和收获；出售前可查看价格。也可继续种植或完成村庄委托。"
          : "先采集落枝，再到小铺出售；也可以种植、出售收获。购买基础武器不要求成长等级。",
        sellable ? "标记风铃杂货铺" : "标记可采集落枝",
        sellable
          ? { mapId: "overworld", targetId: "shop" }
          : { mapId: "overworld", targetId: "wood_1" },
      );
    }
    return step(
      "weapon",
      1,
      "到工坊准备第一件武器",
      `石刃短剑 ${formatMoney(price)}，购买后即可装备。打造则需要图纸所列的建造、知识等级与材料。`,
      "标记工坊铁匠",
      {mapId:"workshop",targetId:"blacksmith"},
    );
  }
  if (!combat.equipped || !state.inventory[combat.equipped])
    return step(
      "equip",
      1,
      "把已有武器装备到身上",
      "买到或打造武器后还需主动装备；整理装备不消耗物品。",
      "打开随身装备",
      undefined,
      "equipment",
    );
  if (
    !state.location.startsWith("cave_") &&
    ((state.vitality?.current ?? 100) < 40 ||
      (state.stamina?.current ?? 100) < 20)
  )
    return step(
      "recover",
      2,
      "进洞前先回家休整",
      "生命或体力已偏低。床边可免费短休或睡到次日；走路不耗体力。",
      "标记家中床铺",
      { mapId: "home", targetId: "home_bed" },
    );
  return step(
    "explore",
    2,
    state.location.startsWith("cave_")
      ? "先清理首层的3只苔团"
      : "去石根山洞试试身手",
    "这次只需探索首层。观察预兆，攻击后退让；随时可撤至洞口，已获材料会保留。",
    "标记石根山洞",
    { mapId: "overworld", targetId: "cave_entry" },
  );
}

// Respect an explicitly tracked side quest and preserve independent map markers.
export function trackedIntroStep(state: GameState): IntroStep | null {
  if (
    !isMainTracked(state) || (!legacyJourney(state) && state.quests.first_expedition?.status !== 'active')
  )
    return null;
  return villageIntroStep(state);
}
