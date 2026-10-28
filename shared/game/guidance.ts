import type { GameState, NavigationTarget, Panel, Quest, World } from './protocol';
import { trackedIntroStep } from './villageIntro';
import { trackedDeparture, type PreparationAction } from './nextDeparture';
import { questTarget, currentMap } from './navigation';

export interface GuidanceAction extends PreparationAction { owner?: string; lifeView?: 'study' | 'contracts'; }
export interface GuidanceEntry { key: string; kind: 'intro' | 'preparation' | 'quest' | 'free'; title: string; note: string; progress: string; action?: GuidanceAction; questId?: string; }
export function objectiveText(state: GameState, quest: Quest, index: number) {
  const text = quest.objectives[index] || '查看委托详情';
  if (text.includes('旧旅程')) return text;
  const counters: Record<string, Record<number, [number, number]>> = {
    settle_in: { 1: [state.stats.wood || 0, 3] }, forest_path: { 1: [state.stats.stone || 0, 6] },
    first_harvest: { 0: [state.stats.harvest || 0, 2], 1: [state.stats.sold || 0, 1] },
    craft_planks: {0: [state.stats.crafted || 0, 1]},
    village_supplier: { 0: [state.stats.deliveries || 0, 3], 1: [state.buildings.home || 1, 2] },
    market_neighbor: { 1: [state.stats.market_sold || 0, 1] }, rune_research: { 1: [state.attributes.wisdom || 0, 25] },
    craft_home: { 0: [state.stats.crafted || 0, 1], 1: [Math.max(1, ...Object.values(state.buildings)), 2] },
    leave_valley: { 1: [state.knowledge_growth?.magic || 0, 3] },
  };
  if (!quest.legacy && state.quest_story) {
    counters.first_harvest = {0: [state.stats.harvest_radish || 0, 4], 1: [state.inventory.crop || 0, 4]};
    counters.craft_home = {0: [state.buildings.home || 1, 2]};
    counters.gate_preparation = {1: [state.knowledge_growth?.magic || 0, 3]};
    delete counters.leave_valley;
  }
  const count = counters[quest.id]?.[index];
  return count ? text + '（' + count[0] + '/' + count[1] + '）' : text;
}
export function trackedQuest(state: GameState) {
  return state.quest_log.find(q => q.id === state.tracked_quest && ['active', 'ready'].includes(q.status))
    || state.quest_log.find(q => q.kind === 'main' && ['ready', 'active', 'available'].includes(q.status))
    || state.quest_log.find(q => ['ready', 'active'].includes(q.status)) || state.quest_log.find(q => q.status === 'available');
}
export function currentGuidance(state: GameState, now: number): GuidanceEntry {
  const intro = trackedIntroStep(state);
  if (intro) {
    const key = 'intro:' + intro.id;
    return { key, kind: 'intro', title: intro.title, note: intro.note, progress: '初探步骤 ' + String(intro.index + 1) + (state.quest_story && !state.quest_story.legacy_departure ? '/3' : '/4'),
      action: { label: intro.action, ...(intro.target ? { target: intro.target } : { panel: intro.panel }), owner: key } };
  }
  const preparation = trackedDeparture(state, now);
  if (preparation) {
    const key = 'preparation:' + preparation.id;
    return { key, kind: 'preparation', title: preparation.title, note: preparation.note, progress: '下一程',
      action: { ...preparation, owner: key, lifeView: 'contracts' } };
  }
  const quest = trackedQuest(state);
  if (quest) {
    const next = Math.max(0, quest.checks.findIndex(value => !value)), done = quest.checks.filter(Boolean).length;
    const key = 'quest:' + quest.id + ':' + quest.status + ':' + quest.checks.map(Number).join('');
    const target = questTarget(quest, state);
    const studying = quest.id === 'rune_research' && quest.checks[0] && !quest.checks[1] && quest.status === 'active';
    return { key, kind: 'quest', questId: quest.id, title: quest.title,
      note: quest.status === 'ready' ? '回到' + quest.giver_name + '交付；只在确认后领取原有奖励。'
        : quest.status === 'available' ? quest.accept_anywhere ? '在旅途委托里阅读并接取，按自己的节奏继续。' : '到' + quest.giver_name + '接取这份委托。' : objectiveText(state, quest, next),
      progress: done + '/' + quest.checks.length + ' 目标',
      action: quest.status === 'available' && quest.accept_anywhere ? {label: '阅读旅途委托', panel: 'journal', owner: key}
        : studying ? { label: '打开研习书页', panel: 'activity', lifeView: 'study', owner: key }
        : target ? { label: quest.status === 'ready' ? '标记交付地点' : '标记下一目标', target, owner: key } : undefined };
  }
  return { key: 'free', kind: 'free', title: '照顾家园，或随心探索', note: '已登记的委托可以从旅途委托查看。现实成长也能直接进入。', progress: '自由旅程' };
}
export function serviceNear(world: World, state: GameState, now: number, target: string, place: string) {
  if (state.location !== place) return false;
  const object = currentMap(world, state, now).objects.find(o => o.id === target);
  return !!object && Math.hypot(state.position.x - object.x, state.position.y - object.y) <= 72;
}
export function guidanceMode(panel: Panel | undefined, magic = false) {
  if (magic) return 'growth';
  return panel === null ? 'world' : panel === 'activity' ? 'life' : panel === 'study' ? 'growth' : panel || 'world';
}
