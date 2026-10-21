import type { GameState, GrowthTarget } from './protocol';
import { staminaNow } from './stamina';

export const attributeLabels = { strength: '体魄', wisdom: '学识', craft: '创造', stewardship: '经营', bond: '联结' } as const;
export const growthTargets: GrowthTarget[] = ['vitality', 'stamina', 'science', 'magic', 'planting', 'ranching', 'building'];
export const currencyLabels = { health_points: '健康点', knowledge_points: '知识点', skill_points: '技能点' } as const;
/** Same display level used by the original Web HUD; never a new progression rule. */
export function dossierSummary(state: GameState, now: number) {
  return { level: 1 + Math.floor(state.xp / 100), xp: state.xp,
    vitality: state.vitality, stamina: state.stamina ? { current: staminaNow(state, now), max: state.stamina.max } : undefined };
}
export function registration(name: string, appearance: number) {
  const value = name.trim() || '林间旅人';
  if (Array.from(value).length > 16) throw Error('旅人姓名最多16字');
  if (!Number.isInteger(appearance) || appearance < 0 || appearance > 5) throw Error('请选择已有的旅人外观');
  return { name: value, appearance };
}
export function dossierAttributes(state: GameState) {
  return [...Object.entries(attributeLabels).map(([id, label]) => ({ id, label, value: state.attributes[id as keyof typeof attributeLabels] })),
    { id: 'energy', label: '能量', value: state.energy }, { id: 'knowledge_shard', label: '知识碎片', value: state.knowledge_shard },
    { id: 'gold', label: '金币', value: state.inventory.gold || 0 }];
}
