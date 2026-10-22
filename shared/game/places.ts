import {farmObjects} from './farming';
import type { GameState, MapData, NavigationTarget, World, WorldObject } from './protocol';
import { accessibleTarget, mapById } from './navigation';
import { interactionFor } from './interaction';
import { residentPlace, residentPositions, clockLabel } from './residents';
import { costText } from './features';
import { staminaNow } from './stamina';

export type PlaceCategory = 'all' | 'life' | 'resources' | 'routes';
export interface PlaceEntry { key: string; mapId: string; object: WorldObject; category: PlaceCategory; }
export const placeMaps = (world: World): MapData[] => [world, ...Object.values(world.interiors), ...Object.values(world.areas || {})];
export function placeName(entry: PlaceEntry, world: World) {
  if(entry.object.id.startsWith('farm_')){const [,col,row]=entry.object.id.split('_');return '家园田地 · '+(Number(col)+1)+'列'+(Number(row)+1)+'行';}
  const siblings = mapById(world, entry.mapId).objects.filter(o => o.kind === entry.object.kind && o.name === entry.object.name);
  return siblings.length > 1 ? entry.object.name + ' · 第' + (siblings.findIndex(o => o.id === entry.object.id) + 1) + '处' : entry.object.name;
}
export function placeEntries(world: World, state: GameState, now: number): PlaceEntry[] {
  return placeMaps(world).flatMap(map => farmObjects(map.objects,state).filter(o => !['npc', 'travel_npc','soil'].includes(o.kind)).map(object => ({
    key: map.id + ':' + object.id, mapId: map.id, object,
    category: (['wood','stone','plot','landmark','chest','event'].includes(object.kind) ? 'resources'
      : ['passage','travel','exit','cave'].includes(object.kind) ? 'routes' : 'life') as PlaceCategory,
  }))).concat(residentPositions(world, state, now).map(object => ({ key: 'person:' + object.id, mapId: object.location!, object, category: 'life' as PlaceCategory })));
}
export function bearingText(target: NavigationTarget, world: World, state: GameState, now: number) {
  const bearing = accessibleTarget(target, world, state, now);
  if (!bearing) return '当前没有对应路标，请先沿已知出口返回。';
  return state.location === target.mapId ? '在当前地图，标记 ' + bearing.name : '下一处路标：' + bearing.name + '；跨图后继续指向目的地。';
}
export function placeInfo(entry: PlaceEntry, world: World, state: GameState, now: number) {
  const o = entry.object, target = { mapId: entry.mapId, targetId: o.id }, destination = o.destination || (o.kind === 'building' ? o.id : o.kind === 'exit' ? 'overworld' : '');
  const lines = [placeName(entry, world), residentPlace(world, entry.mapId) + ' · ' + (state.location === entry.mapId ? '当前地图' : '跨地图目的地'), bearingText(target, world, state, now)];
  if (destination) lines.push('连接：' + residentPlace(world, entry.mapId) + ' → ' + (mapById(world, destination)?.name || destination));
  if (['wood','stone','plot','landmark','chest','event'].includes(o.kind)) { const action = interactionFor(o, state, now); lines.push(action.label + (action.reason ? ' · ' + action.reason : ' · 到场确认')); }
  if (o.kind === 'building') lines.push(state.events.includes('visited_' + o.id) ? '已拜访；标记不会再次进入或推进任务。' : '尚未记录拜访；可以标记前往。');
  const hints: Record<string, string> = { storage: '确认后在背包与储物箱之间存取，查询不转移物品。', rest: o.id === 'inn_bed' ? '先向岚姨订下当晚客房，再到床边睡眠；睡眠按游戏日。' : '到床边睡眠或短休；新作物随游戏时间生长；现实约定仍按真实时间。', study: '研习、计划和现实成长也可直接按L打开，无需走回建筑。', station: '到场查看制作、交易或建筑升级的现有报价。', armory: '到武备台确认购买/打造，已有武器需主动装备。', spellbook: '到场研习法术；选择培养方向不会自动投入知识点。', market: '柜台可买卖与交付每日订单；报价与额度由服务器决定。', board: '到场接取或交付，追踪和标记不会领取回礼。' };
  if (hints[o.kind]) lines.push(hints[o.kind]);
  if (o.kind === 'npc' || o.kind === 'travel_npc') lines.push(o.activity || '查看当前位置；到场后才能交谈和使用服务。');
  const floor = Number(entry.mapId.replace('cave_', ''));
  if (entry.mapId.startsWith('cave_') && floor > (state.combat?.unlocked || 1)) lines.push('该层通路尚未开放；需逐层探索，标记不能绕过关卡。');
  if (o.kind === 'cave') {
    if (state.location === entry.mapId && o.id === 'cave_down' && !state.combat?.cleared) lines.push('当前层尚未清理，需先清理怪物。');
    if (o.id === 'cave_rope' && (state.combat?.unlocked || 1) < 4) lines.push('第3层绳梯尚未打通。');
    if (o.id === 'cave_deep' && (state.combat?.unlocked || 1) < 5) lines.push('深层通路尚未打通。');
    lines.push('洞穴路标只标方向，进入/撤离/休息仍在原路标确认。');
  }
  const departure = state.travel?.options.find(q => q.id === 'depart');
  if (['crossing','mountain','city','inn'].includes(entry.mapId) && !['crossing','mountain','city','inn'].includes(state.location) && departure?.reasons.length) lines.push('离村条件：' + departure.reasons.join('；'));
  const quotes = state.travel?.options.filter(q => q.target === o.id) || [];
  if (quotes.length) lines.push('最近服务器旅途报价；仍需到场确认，日期/位置变化后重新核对。', ...quotes.map(q => q.label + '：' + (q.completed ? '已完成' : [costText(q.costs) || '无物品费用', '体力 ' + q.stamina, q.minutes + '游戏分钟', '抵达 ' + clockLabel(q.arrival_minute)].join(' · ')) + '\n' + q.note + (q.reasons.length ? '\n当前限制：' + q.reasons.join('；') : '\n当前报价条件满足；仍须到场确认。')));
  lines.push('只标记方向，不传送、不购买、不推进任务。');
  return lines.join('\n');
}
export function socialAccess(world: World, state: GameState, now: number, id: string) {
  const person = residentPositions(world, state, now).find(r => r.id === id), social = state.npc_social?.[id];
  const near = !!person && person.location === state.location && Math.hypot(person.x - state.position.x, person.y - state.position.y) <= 72;
  return { person, social, near, memory: near && !!social?.memory_unlocked, gift: near && !!social && !social.gifted, help: near && !!social && !social.helped && staminaNow(state, now) >= 4 };
}
export function neighborRoute(world:World,state:GameState,now:number,id:string){
  const person=residentPositions(world,state,now).find(r=>r.id===id);if(!person)return null;
  const target={mapId:person.location!,targetId:id},bearing=accessibleTarget(target,world,state,now),sameMap=state.location===person.location;
  const instruction=sameMap?'就在这里。沿小路走近'+person.name+'，就能交谈。':!bearing?'先沿熟悉的出口返回村庄。':bearing.kind==='building'?'先到'+bearing.name+'门前，按 E 或点击门口进入。':bearing.kind==='exit'?'先从'+bearing.name+'出去，再跟着路标走。':'先沿路走到'+bearing.name+'。';
  return {person,target,bearing,sameMap,instruction};
}
