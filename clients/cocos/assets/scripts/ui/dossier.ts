import type { PanelHost } from './panels';
import type { GrowthTarget } from '../core/protocol';
import { C } from './theme';
import { getAppearance } from '../core/appearances';
import { growthNames, growthCommand } from '../core/features';
import { dossierSummary, dossierAttributes, currencyLabels, growthTargets } from '../core/dossier';
import { residentPositions } from '../core/residents';

type Frame = { x: number; y: number; w: number; h: number; compact: boolean };
export class DossierPanels {
  growth: GrowthTarget = 'magic';
  private tab: 'overview' | 'attributes' | 'levels' = 'overview';
  private page = 0; private receipt = ''; private saveId = '';
  reset() { this.receipt = ''; }
  handles(mode: string) { return mode === 'character' || mode === 'growth'; }
  snapshot() { return { dossierTab: this.tab, growth: this.growth, dossierPage: this.page }; }
  draw(h: PanelHost) {
    if (this.saveId !== h.saveId) { this.saveId = h.saveId; this.receipt = ''; this.tab = 'overview'; this.page = 0; }
    const height = Math.min(h.mode === 'growth' ? 500 : 620, h.height - 24);
    const f: Frame = { x: 0, y: (h.height - height) / 2, w: Math.min(1040, h.width - 32), h: height, compact: height < 460 };
    f.x = (h.width - f.w) / 2;
    h.box('DossierPaper', f.x, f.y, f.w, f.h, C.paper, 16);
    h.text('DossierTitle', h.mode === 'growth' ? '主动培养能力' : '旅人档案', f.x + 24, f.y + 12, 215, 42, 22);
    h.text('DossierWallet', '知识 ' + (h.state.knowledge_points || 0) + ' · 健康 ' + (h.state.health_points || 0) + ' · 技能 ' + (h.state.skill_points || 0),
      f.x + 244, f.y + 20, f.w - 356, 28, 15, C.muted);
    h.button('close', '返回', f.x + f.w - 100, f.y + 12, 76, 44, () => h.close(), h.busy);
    if (h.mode === 'growth') this.upgrade(h, f); else this.profile(h, f);
    const message = h.error || (h.mode === 'growth' ? this.receipt : '') || h.notice;
    if (message) h.text('DossierFeedback', message, f.x + 24, f.y + f.h - 108, f.w - 48, 42, 14, h.error ? C.danger : C.muted);
  }
  private footer(h: PanelHost, f: Frame, entries: { id: string; label: string; action: () => unknown; disabled?: boolean; primary?: boolean }[]) {
    const width = (f.w - 48 - (entries.length - 1) * 8) / entries.length;
    entries.forEach((e, i) => h.button(e.id, e.label, f.x + 24 + i * (width + 8), f.y + f.h - 62, width, 44, e.action, h.busy || !!e.disabled, !!e.primary));
  }
  private profile(h: PanelHost, f: Frame) {
    const tabs = [['overview', '身份与状态'], ['attributes', '积累与物资'], ['levels', '全部培养能力']] as const;
    const width = (f.w - 64) / 3;
    tabs.forEach(([id, label], i) => h.button('dossier-' + id, label, f.x + 24 + i * (width + 8), f.y + 68, width, 44,
      () => { this.tab = id; this.page = 0; h.redraw(true); }, h.busy, this.tab === id));
    if (!h.state.character) { h.text('DossierMissing', '请先连接已有旅程。', f.x + 24, f.y + 132, f.w - 48, 50, 18); return; }
    if (this.tab === 'overview') this.overview(h, f);
    else if (this.tab === 'attributes') this.attributes(h, f);
    else { this.levels(h, f); return; }
    this.footer(h, f, [{ id: 'dossier-grow', label: '查看报价并培养', action: () => { this.receipt = ''; h.go('growth'); }, primary: true },
      { id: 'dossier-life', label: '现实成长记录', action: () => h.go('life') }]);
  }
  private overview(h: PanelHost, f: Frame) {
    const s = h.state, c = s.character!, summary = dossierSummary(s, h.now), outfit = getAppearance(c.appearance);
    if (f.compact) {
      h.person('actor-' + c.appearance, f.x + 60, f.y + 160, 48, 64);
      h.text('DossierName', c.name, f.x + 104, f.y + 120, f.w - 128, 30, 20);
      h.text('DossierOutfit', outfit.name + ' · 等级 ' + summary.level, f.x + 104, f.y + 150, f.w - 128, 24, 16);
      h.text('DossierXp', '累计经验 ' + summary.xp + ' · 与培养点分别留存', f.x + 104, f.y + 178, f.w - 128, 24, 16, C.muted);
      const w = (f.w - 56) / 2;
      h.text('DossierHealth', summary.vitality ? '生命 ' + summary.vitality.current + ' / ' + summary.vitality.max : '生命数据暂不可用', f.x + 24, f.y + 204, w, 24, 16);
      h.text('DossierStamina', summary.stamina ? '体力 ' + summary.stamina.current + ' / ' + summary.stamina.max : '体力数据暂不可用', f.x + 32 + w, f.y + 204, w, 24, 16);
    } else {
      h.box('IdentityCloth', f.x + 24, f.y + 130, 280, 322, C.canvas, 12);
      h.person('actor-' + c.appearance, f.x + 164, f.y + 220, 96, 128);
      h.text('DossierName', c.name, f.x + 40, f.y + 292, 248, 62, 20, C.ink, true);
      h.text('DossierOutfit', outfit.name, f.x + 40, f.y + 358, 248, 28, 16, C.muted, true);
      h.text('DossierLevel', '等级 ' + summary.level, f.x + 40, f.y + 402, 248, 32, 22, C.ink, true);
      const x = f.x + 336, w = f.w - 360;
      h.text('DossierHealth', summary.vitality ? '生命 ' + summary.vitality.current + ' / ' + summary.vitality.max : '生命数据暂不可用', x, f.y + 146, w, 44, 24);
      h.text('DossierStamina', summary.stamina ? '体力 ' + summary.stamina.current + ' / ' + summary.stamina.max : '体力数据暂不可用', x, f.y + 218, w, 44, 24);
      h.text('DossierXp', '累计经验 ' + summary.xp + ' · 仅作旅程积累', x, f.y + 298, w, 36, 20);
      h.text('DossierReadOnly', '档案读取已保存的状态。\n经验、活动积累与三种培养点分别留存；查看不会花点。', x, f.y + 360, w, 84, 16, C.muted);
    }
  }
  private attributes(h: PanelHost, f: Frame) {
    const entries = dossierAttributes(h.state), columns = f.compact ? 3 : 2, width = (f.w - 48 - (columns - 1) * 12) / columns;
    entries.forEach((e, i) => h.text('Attribute-' + e.id, e.label + '  ' + e.value, f.x + 24 + (i % columns) * (width + 12), f.y + 128 + Math.floor(i / columns) * (f.compact ? 32 : 60), width, f.compact ? 28 : 40, f.compact ? 16 : 20));
    if (!f.compact) h.text('AttributeRules', '五项属性显示原始积累；它们与诺亚委托获得的知识、健康、技能点分别计算。', f.x + 24, f.y + 412, f.w - 48, 56, 16, C.muted);
  }
  private levels(h: PanelHost, f: Frame) {
    const per = f.compact ? 2 : 7, count = Math.ceil(growthTargets.length / per); this.page = Math.min(this.page, count - 1);
    growthTargets.slice(this.page * per, (this.page + 1) * per).forEach((target, i) => {
      const q = h.state.character_growth_options?.[target], capacity = target === 'vitality' || target === 'stamina';
      h.button('dossier-target-' + target, growthNames[target] + ' · ' + (q ? q.current + (capacity ? '' : '级') + ' · 查看培养报价' : '报价暂不可用'),
        f.x + 24, f.y + 126 + i * 52, f.w - 48, 44, () => { this.growth = target; this.receipt = ''; h.go('growth'); }, h.busy || !q);
    });
    this.footer(h, f, [{ id: 'dossier-prev', label: '上一页', disabled: !this.page, action: () => { this.page--; h.redraw(); } },
      { id: 'dossier-summary', label: (this.page + 1) + '/' + count + ' · 回到概览', action: () => { this.tab = 'overview'; h.redraw(true); } },
      { id: 'dossier-next', label: '下一页', disabled: this.page >= count - 1, action: () => { this.page++; h.redraw(); } }]);
  }
  private upgrade(h: PanelHost, f: Frame) {
    const index = growthTargets.indexOf(this.growth), q = h.state.character_growth_options?.[this.growth];
    const change = (delta: number) => { this.growth = growthTargets[(index + delta + growthTargets.length) % growthTargets.length]; this.receipt = ''; h.redraw(true); };
    h.button('growth-prev', '上一项', f.x + 24, f.y + 68, 96, 44, () => change(-1), h.busy);
    h.text('GrowthName', growthNames[this.growth], f.x + 132, f.y + 68, f.w - 264, 44, 22, C.ink, true);
    h.button('growth-next', '下一项', f.x + f.w - 120, f.y + 68, 96, 44, () => change(1), h.busy);
    if (!q) { h.text('GrowthMissing', '报价尚未就绪，请返回并重连服务器。', f.x + 24, f.y + 132, f.w - 48, 50, 18); return; }
    const command = growthCommand(h.state, this.growth), balance = h.state[q.currency] || 0, currency = currencyLabels[q.currency];
    h.text('GrowthLevels', q.current + ' → ' + q.next, f.x + 24, f.y + 124, f.w - 48, 36, 26, C.ink, true);
    h.text('GrowthCost', '持有 ' + balance + ' ' + currency + ' · 消耗 ' + q.cost + (command.shortfall ? ' · 还差 ' + command.shortfall : ' · 确认后预计剩余 ' + (balance - q.cost)),
      f.x + 24, f.y + 164, f.w - 48, 28, 16, C.muted, true);
    h.text('GrowthConsent', '仅点击确认才培养；点数来自诺亚现实委托。', f.x + 24, f.y + (f.compact ? 196 : 220), f.w - 48, f.compact ? 28 : 62, 16, C.muted, true);
    this.footer(h, f, [{ id: 'growth-spend', label: command.shortfall ? '还差 ' + command.shortfall + ' ' + currency : '确认培养', primary: true, disabled: command.shortfall > 0,
      action: async () => {
        if (h.busy) return;
        this.receipt = '';const target=this.growth;
        const ok = await h.send(command.action, command.data);
        if (ok && this.saveId === h.saveId && h.mode==='growth' && this.growth===target) { this.receipt = '已确认 ' + growthNames[target] + ' ' + q.current + '→' + q.next + '；' + currency + ' ' + balance + '→' + (h.state[q.currency] || 0); h.redraw(); }
      } },
      { id: 'growth-profile', label: '回到档案', action: () => h.go('character', true) },
      { id: 'growth-noah', label: '标记诺亚', action: () => { const npc = residentPositions(h.world, h.state, h.now).find(n => n.id === 'noah'); if (npc) h.mark({ mapId: npc.location!, targetId: npc.id }, npc.name); } }]);
  }
}
