import type { GameState, StudyTask } from './protocol';
import { lifeDate } from './lifeJournalDates';

export type Activity = GameState['activities'][number];
export type StudyScope = 'today' | 'history' | 'archived';
export type ContractFilter = 'all' | 'active' | 'claimed' | 'cancelled';
export const lifeKinds = { study: '学习', exercise: '运动', work: '工作' };
export const pointNames = { study: '知识点', exercise: '健康点', work: '技能点' };
export const contractStatuses = { active: '进行中', claimed: '已结算', cancelled: '已取消' };
export const activityNames: Record<string, string> = { study: '学习', exercise: '运动', creative: '创作', steps: '步行', management: '生活管理' };

export function contractRecords(state: GameState, date: string, filter: ContractFilter) {
  return (state.life_journal?.tasks || []).filter(t => t.date === date && (filter === 'all' || t.status === filter))
    .sort((a, b) => b.accepted_at - a.accepted_at || a.id.localeCompare(b.id));
}
export function studyRecords(state: GameState, now: number, scope: StudyScope, date = '', planId = '') {
  const today = lifeDate(now);
  return (state.study_task_log || []).filter(t => (!planId || t.plan_id === planId)
    && (scope === 'archived' ? !!t.archived_at : !t.archived_at && (scope === 'today' ? t.date === today : t.date !== today))
    && (!date || t.date === date)).sort((a, b) => b.date.localeCompare(a.date) || b.created_at - a.created_at || a.id.localeCompare(b.id));
}
export function planRecords(state: GameState, archived: boolean) {
  return (state.study_plan_log || []).filter(p => !!p.archived_at === archived)
    .sort((a, b) => b.created_at - a.created_at || a.id.localeCompare(b.id));
}
export function studyAccess(state: GameState, task: StudyTask) {
  const parent = (state.study_plan_log || []).find(p => p.id === task.plan_id);
  const ownTimer = state.timer?.study_task_id === task.id;
  const writable = !task.archived_at && !parent?.archived_at;
  return { writable, ownTimer, parentArchived: !!parent?.archived_at,
    edit: writable && !task.completed_at && !ownTimer,
    archive: !ownTimer,
    start: writable && !task.completed_at && !state.timer };
}
export function linkableRecords(state: GameState, task: StudyTask) {
  if (!studyAccess(state, task).writable) return [];
  return state.activities.filter(a => !!a.id && a.kind === 'study' && a.date === task.date && !a.study_task_id);
}
export function linkedRecords(state: GameState, taskId: string) {
  return state.activities.filter(a => a.study_task_id === taskId);
}
export function recordKey(record: Activity, index: number) {
  // UI identity for read-only legacy rows only; never send a fabricated activity ID.
  return record.id || 'legacy-' + index;
}
export function recordSource(record: Activity) {
  const names: Record<string, string> = { timer: '计时', manual: '手动', imported: '导入', import: '导入', demo: '演示' };
  return (names[record.source] || '其他来源') + ' · ' + (record.verified ? '保留历史核验标记' : '未核验');
}
export function activityUnit(kind: string) { return kind === 'steps' ? '步' : kind === 'management' ? '次' : '分钟'; }
export function shortText(text: string, length = 24) {
  const chars = Array.from(text.replace(/\s+/g, ' '));
  return chars.length > length ? chars.slice(0, length - 1).join('') + '…' : chars.join('');
}
export function textPages(text: string, columns: number, rows: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    const chars = Array.from(paragraph);
    if (!chars.length) lines.push('');
    for (let i = 0; i < chars.length; i += columns) lines.push(chars.slice(i, i + columns).join(''));
  }
  const pages: string[] = [];
  for (let i = 0; i < lines.length; i += rows) pages.push(lines.slice(i, i + rows).join('\n'));
  return pages.length ? pages : [''];
}
export function slicePage<T>(items: readonly T[], index: number, per: number) {
  const count = Math.max(1, Math.ceil(items.length / per));
  const page = Math.max(0, Math.min(index, count - 1));
  return { items: items.slice(page * per, (page + 1) * per), index: page, count };
}
export function realTime(seconds: number | null) {
  if (!seconds) return '未记录';
  return lifeDate(seconds) + ' ' + new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hour12: false }).format(seconds * 1000);
}
