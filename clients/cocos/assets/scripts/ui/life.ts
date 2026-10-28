import type { PanelHost } from './panels';
import type { StudyTask, StudyPlan } from '../core/protocol';
import { C } from './theme';
import {bookSurface,bookLeaves,gameControls,paperSurface,inkRule,meter} from './materials';
import { entityId, timerSeconds, timeText } from '../core/features';
import { lifeDate, moveDay, moveMonth, calendarDays, dailyQuota } from '../core/lifeJournalDates';
import {
  type Activity, type StudyScope, type ContractFilter, contractRecords, studyRecords, planRecords, studyAccess,
  linkedRecords, linkableRecords, recordKey, recordSource, activityNames, activityUnit, shortText, textPages,
  slicePage, realTime, lifeKinds, pointNames, contractStatuses,
} from '../core/lifeRecords';
import { residentPositions } from '../core/residents';

type Frame = { x: number; y: number; w: number; h: number; compact: boolean; book?:boolean };
type Row = { id: string; label: string };
type FooterAction = { id: string; label: string; action: () => unknown; disabled?: boolean; secondary?: Omit<FooterAction, 'secondary'> };
type Tab = 'study' | 'plans' | 'record' | 'contracts' | 'history';
type CalendarTarget = 'study' | 'contracts' | 'activity';
export class LifePanels {
  lifeTab: Tab = 'study';
  taskId = ''; planId = '';
  private scope: StudyScope = 'today';
  private studyDate = ''; private contractDate: string | null = null; private historyDate = '';
  private contractFilter: ContractFilter = 'all';
  private archivedPlans = false; private oldExercise = false; private exerciseId = '';
  private activityId = ''; private notePage = 0; private cancelId = '';
  private pages = new Map<string, number>();
  private title = ''; private minutes = '25'; private formId = '';
  private amount = '1'; private note = ''; private activityKind = 'study';
  private calendarTarget: CalendarTarget = 'study'; private month = ''; private monthPage = 0;
  private hint = '';
  private readonly modes = ['life', 'life-study', 'life-study-tools', 'life-study-records', 'life-link',
    'life-plan', 'life-plan-pages', 'life-calendar', 'life-contract', 'life-activity', 'life-exercise', 'life-exercise-records',
    'life-timer', 'study-new', 'study-edit', 'plan-new', 'plan-edit'];
  focus(view: 'study' | 'contracts', state: import('../core/protocol').GameState) {
    this.lifeTab=view;
    const active=state.life_journal?.tasks.find(t=>t.status==='active');
    if(view==='contracts'&&active){this.contractDate=active.date;this.cancelId=active.id;return 'life-contract';}
    return 'life';
  }
  handles(mode: string) { return this.modes.includes(mode); }
  reset() { this.confirmCancel = false; }
  snapshot() {
    return { lifeTab: this.lifeTab, taskId: this.taskId, planId: this.planId, studyScope: this.scope,
      studyDate: this.studyDate, contractDate: this.contractDate, contractFilter: this.contractFilter,
      archivedPlans: this.archivedPlans, historyDate: this.historyDate, oldExercise: this.oldExercise,
      activityId: this.activityId, calendarMonth: this.month, calendarPage: this.monthPage };
  }
  draw(original: PanelHost) {
    const h=gameControls(original);
    this.hint = '';
    const titles: Record<string, string> = { 'life': '现实成长', 'life-study': '研习书页', 'life-study-tools': '整理书页',
      'life-study-records': '书页里的记录', 'life-link': '关联已有学习记录', 'life-plan': '长期计划', 'life-plan-pages': '计划的全部书页',
      'life-calendar': '选择日期', 'life-contract': '现实约定详情', 'life-activity': '活动记录详情', 'life-exercise': '旧日锻炼约定',
      'life-exercise-records': '旧约定的活动', 'life-timer': '当前专注计时', 'study-new': '写下今日研习', 'study-edit': '修改研习书页',
      'plan-new': '装订长期计划', 'plan-edit': '修改长期计划' };
    const book=h.mode==='life'&&h.height>=560&&h.width>=980;
    const height = Math.min(h.mode.startsWith('study-') || h.mode.startsWith('plan-') ? 400 : 620, h.height - 24);
    let f: Frame = { w: Math.min(h.mode==='life'?1000:860, h.width - 32), h: height, x: 0, y: (h.height - height) / 2, compact: height < 460, book };
    f.x = (h.width - f.w) / 2;
    if(book){
      const bw=Math.min(1240,h.width-32,(h.height-28)*1.5),bh=bw/1.5,bx=(h.width-bw)/2,by=(h.height-bh)/2;
      bookSurface(h,{x:bx,y:by,w:bw,h:bh},true);
      const {left,right}=bookLeaves({x:bx,y:by,w:bw,h:bh},true);
      f={x:right.x-24,y:by+bh*.09,w:right.w+48,h:bh*.79,compact:bh*.79<460,book:true};
      const lx=left.x,lw=left.w;
      h.region('life-index-leaf',lx,by+bh*.08,lw,bh*.80);
      h.region('life-content-leaf',right.x,by+bh*.09,right.w,bh*.79);
      h.text('LifeTitle','现实成长',lx,by+bh*.08,lw,36,26);
      const identityY=by+bh*.08+44;
      h.person('actor-'+h.state.character?.appearance,lx+24,identityY+34,48,64);
      h.text('LifeTraveler',h.state.character?.name||'旅人',lx+58,identityY,lw-58,40,16).lineHeight=20;
      h.text('LifeBalances','知识 '+(h.state.knowledge_points||0)+' · 健康 '+(h.state.health_points||0)+'\n技能 '+(h.state.skill_points||0),lx+58,identityY+44,lw-58,42,14,C.muted);
      const tabs:[Tab,string][]=[['study','研习书页'],['plans','长期计划'],['record','手动记录'],['contracts','现实约定'],['history','活动历史']];
      const step=Math.min(58,(bh*.52)/5);
      const tabsY=Math.max(by+bh*.28,identityY+94);
      tabs.forEach(([id,label],i)=>h.button('tab-'+id,label,lx,tabsY+i*step,lw,Math.max(44,step-8),()=>{this.lifeTab=id;this.cancelId='';h.redraw(true);},h.busy,this.lifeTab===id,'entry',{label,pressed:this.lifeTab===id}));
      h.text('LifeIndexDate',lifeDate(h.now),lx,by+bh*.86,lw,28,14,C.muted);
      h.text('LifePageHeading',tabs.find(t=>t[0]===this.lifeTab)![1],f.x+24,f.y+12,f.w-140,42,24);
    }else{
      paperSurface(h,f,true);
      h.text('LifeTitle',titles[h.mode],f.x+24,f.y+12,215,42,22);
      h.text('LifeBalances','知识 '+(h.state.knowledge_points||0)+' · 健康 '+(h.state.health_points||0)+' · 技能 '+(h.state.skill_points||0),f.x+244,f.y+20,f.w-356,28,15,C.muted);
    }
    h.button('close','返回',f.x+f.w-100,f.y+12,76,44,()=>h.close(),h.busy);
    if (h.mode === 'life') this.root(h, f);
    else if (h.mode === 'life-study') this.study(h, f);
    else if (h.mode === 'life-study-tools') this.studyTools(h, f);
    else if (h.mode === 'life-study-records' || h.mode === 'life-link') this.records(h, f, h.mode === 'life-link');
    else if (h.mode === 'life-plan') this.plan(h, f);
    else if (h.mode === 'life-plan-pages') this.planPages(h, f);
    else if (h.mode === 'life-calendar') this.calendar(h, f);
    else if (h.mode === 'life-contract') this.contract(h, f);
    else if (h.mode === 'life-activity') this.activity(h, f);
    else if (h.mode === 'life-exercise') this.exercise(h, f);
    else if (h.mode === 'life-exercise-records') this.exerciseRecords(h, f);
    else if (h.mode === 'life-timer') this.timer(h, f);
    else this.form(h, f);
    const message = h.error || h.notice || this.hint;
    if (message) h.text('LifeFeedback', textPages(message, Math.max(16, Math.floor((f.w - 48) / 15)), 2)[0],
      f.x + 24, f.y + f.h - 108, f.w - 48, 42, 14, h.error ? C.danger : C.muted);
  }
  private strip(h: PanelHost, f: Frame, y: number, entries: { id: string; label: string; action: () => unknown; selected?: boolean; primary?:boolean; disabled?: boolean }[]) {
    const width = (f.w - 48 - (entries.length - 1) * 8) / entries.length;
    entries.forEach((e, i) => h.button(e.id, e.label, f.x + 24 + i * (width + 8), f.y + y, width, 44, e.action, h.busy || !!e.disabled, !!e.selected||!!e.primary,e.selected!==undefined?'tab':undefined,{label:e.label,pressed:e.selected}));
  }
  private pager(h: PanelHost, f: Frame, key: string, count: number, index: number, primary?: FooterAction) {
    const y = f.y + f.h - 62;
    h.button('life-prev', '上一页', f.x + 24, y, 116, 44, () => { this.pages.set(key, index - 1); h.redraw(); }, h.busy || index === 0);
    h.button('life-next', '下一页 ' + (index + 1) + '/' + count, f.x + f.w - 140, y, 116, 44, () => { this.pages.set(key, index + 1); h.redraw(); }, h.busy || index >= count - 1);
    const x = f.x + 148, width = f.w - 296;
    if (primary) {
      const buttonWidth = primary.secondary ? (width - 8) / 2 : width;
      h.button(primary.id, primary.label, x, y, buttonWidth, 44, primary.action, h.busy || !!primary.disabled, true);
      const next = primary.secondary;
      if (next) h.button(next.id, next.label, x + buttonWidth + 8, y, buttonWidth, 44, next.action, h.busy || !!next.disabled);
    }
    else h.text('LifePage', (index + 1) + ' / ' + count, x, y, width, 44, 16, C.muted, true);
  }
  private rows(h: PanelHost, f: Frame, key: string, items: Row[], top: number, choose: (id: string) => unknown, empty: string, primary?: FooterAction) {
    const per = Math.max(1, Math.floor((f.h - 114 - top + 8) / 52));
    const page = slicePage(items, this.pages.get(key) || 0, per); this.pages.set(key, page.index);
    if (!items.length){
      if(!f.compact&&f.h-top>=310){h.image('items/journal',f.x+f.w/2,f.y+top+50,64,64);h.text('LifeEmpty',textPages(empty,Math.min(28,Math.floor((f.w-64)/17)),3)[0],f.x+32,f.y+top+96,f.w-64,80,17,C.muted,true);}
      else h.text('LifeEmpty',textPages(empty,Math.floor((f.w-48)/17),2)[0],f.x+24,f.y+top,f.w-48,48,17,C.muted).lineHeight=24;
      if(primary){const centered=!f.compact&&f.h-top>=400,by=centered?f.y+top+196:f.y+f.h-62,total=centered?Math.min(400,f.w-64):f.w-48,bx=f.x+(f.w-total)/2,bw=primary.secondary?(total-8)/2:total;
        h.button(primary.id,primary.label,bx,by,bw,44,primary.action,h.busy||!!primary.disabled,true);
        if(primary.secondary){const next=primary.secondary;h.button(next.id,next.label,bx+bw+8,by,bw,44,next.action,h.busy||!!next.disabled);}
      }
      return;
    }
    page.items.forEach((r, i) => h.button('open-' + r.id, r.label, f.x + 24, f.y + top + i * 52, f.w - 48, 44, () => choose(r.id), h.busy));
    this.pager(h, f, key, page.count, page.index, primary);
  }
  private pageTitle(h: PanelHost, f: Frame, title: string, size = 18) {
    const rows = f.compact ? 3 : 4, height = f.compact ? 72 : 108;
    h.text('LifeEntryTitle', textPages(title, Math.floor((f.w - 48) / size), rows)[0], f.x + 24, f.y + 78, f.w - 48, height, size);
  }
  private selectedTask(h: PanelHost) { return h.state.study_task_log?.find(t => t.id === this.taskId); }
  private selectedPlan(h: PanelHost) { return h.state.study_plan_log?.find(p => p.id === this.planId); }
  private noEntry(h: PanelHost, f: Frame) { h.text('LifeMissing', '记录已更新或暂不可用，请返回列表查看最新状态。', f.x + 24, f.y + 90, f.w - 48, 64, 18, C.muted); }
  private openTask(h: PanelHost, id: string) { this.taskId = id; h.go('life-study'); }
  private openActivity(h: PanelHost, a: Activity, index: number) { this.activityId = recordKey(a, index); this.notePage = 0; h.go('life-activity'); }
  private newForm(h: PanelHost, plan: boolean, item?: StudyTask | StudyPlan) {
    this.title = item?.title || ''; this.minutes = String(item ? ('daily_minutes' in item ? item.daily_minutes : item.target_minutes) : 25);
    this.formId = item?.id || entityId(h.uuid());
    h.go(plan ? (item ? 'plan-edit' : 'plan-new') : (item ? 'study-edit' : 'study-new'));
  }
  private root(h: PanelHost, f: Frame) {
    const tabs: [Tab, string][] = [['study', '研习书页'], ['plans', '长期计划'], ['record', '手动记录'], ['contracts', '现实约定'], ['history', '活动历史']];
    if(!f.book)this.strip(h, f, 68, tabs.map(([id, label]) => ({ id: 'tab-' + id, label, selected: this.lifeTab === id, action: () => { this.lifeTab = id; this.cancelId = ''; h.redraw(true); } })));
    if(f.book)h.text('LifeSectionCaption',this.lifeTab==='study'?lifeDate(h.now)+' · 研习与计时':this.lifeTab==='history'?'活动记录与来源':this.lifeTab==='record'?'填写活动内容与数量':this.lifeTab==='contracts'?'按领取日期查看现实约定':'保留的长期计划',f.x+24,f.y+68,f.w-48,36,16,C.muted);
    if (this.lifeTab === 'study') this.studyList(h, f);
    else if (this.lifeTab === 'plans') this.planList(h, f);
    else if (this.lifeTab === 'record') this.manual(h, f);
    else if (this.lifeTab === 'contracts') this.contractList(h, f);
    else this.history(h, f);
  }
  private studyList(h: PanelHost, f: Frame) {
    this.strip(h, f, 126, [
      ...(['today', 'history', 'archived'] as StudyScope[]).map(scope => ({ id: 'scope-' + scope, label: ({ today: '今天', history: '历史书页', archived: '归档书页' })[scope],
        selected: this.scope === scope, action: () => { this.scope = scope; this.studyDate = ''; this.pages.delete('study'); h.redraw(true); } })),
      { id: 'study-date', label: this.studyDate || '选择日期', action: () => this.openCalendar(h, 'study') },
    ]);
    const tasks = studyRecords(h.state, h.now, this.scope, this.studyDate);
    this.hint = '计时与记录不核验行为。知识点由诺亚的现实委托结算。';
    this.rows(h, f, 'study', tasks.map(t => ({ id: 'study-' + t.id, label: t.date + ' · ' + (t.completed_at ? '已完成 · ' : '') + shortText(t.title, 24) + ' · ' + t.minutes + '/' + t.target_minutes + '分' })),
      178, id => this.openTask(h, id.slice(6)), '这里还没有符合条件的书页。更换日期、查看历史或写下今天的研习。',
      { id: 'study-new', label: '新增研习', action: () => this.newForm(h, false),
        secondary: h.state.timer ? { id: 'current-timer', label: '当前计时', action: () => h.go('life-timer') } : undefined });
  }
  private study(h: PanelHost, f: Frame) {
    const t = this.selectedTask(h); if (!t) return this.noEntry(h, f);
    const access = studyAccess(h.state, t);
    this.pageTitle(h, f, t.title);
    h.text('StudyProgress', t.date + ' · ' + t.minutes + '/' + t.target_minutes + '分钟 · ' + (t.archived_at ? '已归档' : t.completed_at ? '已完成' : '未完成')
      + (access.ownTimer ? ' · 本页 ' + timeText(timerSeconds(h.state, h.now)) + (h.state.timer?.running ? ' 计时中' : ' 已暂停') : ''),
      f.x + 24, f.y + (f.compact ? 158 : 196), f.w - 48, 26, 16, C.muted);
    if(!f.compact){h.box('StudyTrack',f.x+24,f.y+236,f.w-48,5,C.canvas,0);if(t.minutes>0)h.box('StudyProgressFill',f.x+24,f.y+236,(f.w-48)*Math.min(1,t.minutes/t.target_minutes),5,C.moss,0);}
    this.strip(h, f, f.compact ? 184 : 270, [
      { id: 'study-records', label: '查看关联明细', action: () => h.go('life-study-records') },
      { id: 'study-link', label: '关联已有记录', action: () => h.go('life-link'), disabled: !access.writable },
      { id: 'study-tools', label: '编辑与归档', action: () => h.go('life-study-tools') },
    ]);
    this.hint = access.parentArchived ? '所属计划已归档；请从长期计划取回后继续计时或关联。' : '选择、回看与关联不另发成长点数；整理不会丢失记录。';
    const timer = h.state.timer;
    this.strip(h, f, f.h - 62, [
      { id: 'timer-toggle', label: timer ? (access.ownTimer ? (timer.running ? '暂停计时' : '继续计时') : '查看当前计时') : '开始计时',
        action: () => timer ? access.ownTimer ? h.send(timer.running ? 'timer_pause' : 'timer_resume', { timer_id: timer.id }) : h.go('life-timer') : h.send('timer_start', { task_id: t.id }),
        disabled: !timer && !access.start,primary:true },
      { id: 'timer-finish', label: '结束并记录本页计时', action: () => h.send('timer_finish', { timer_id: timer?.id }), disabled: !access.ownTimer },
    ]);
    if (access.ownTimer) this.hint = '本页计时 ' + timeText(timerSeconds(h.state, h.now)) + ' · ' + (timer?.running ? '进行中' : '已暂停') + ' · 未核验行为';
  }
  private studyTools(h: PanelHost, f: Frame) {
    const t = this.selectedTask(h); if (!t) return this.noEntry(h, f);
    const access = studyAccess(h.state, t);
    this.pageTitle(h, f, t.title);
    h.text('StudyCareRules', '归档保留原记录；计时中的书页须先结束计时。', f.x + 24, f.y + (f.compact ? 158 : 196), f.w - 48, 24, 16, C.muted);
    this.strip(h, f, f.compact ? 184 : 240, [
      { id: 'study-edit', label: '修改书页', action: () => this.newForm(h, false, t), disabled: !access.edit },
      { id: 'study-archive', label: t.archived_at ? '取回书页' : '归档书页', action: () => h.send('study_archive', { task_id: t.id, archived: !t.archived_at }), disabled: !access.archive },
    ]);
    this.strip(h, f, f.h - 62, [
      { id: 'care-records', label: '查看原有记录', action: () => h.go('life-study-records') },
      { id: 'care-context', label: access.parentArchived ? '查看所属归档计划' : '回到书页', action: () => { if (access.parentArchived) { this.planId = t.plan_id!; h.go('life-plan'); } else h.go('life-study', true); } },
    ]);
    this.hint = t.completed_at ? '已完成书页保留原约定；仍可回看，或关联同日已有学习记录。' : '取回书页不会取回已归档的所属计划。';
  }
  private records(h: PanelHost, f: Frame, linking: boolean) {
    const t = this.selectedTask(h); if (!t) return this.noEntry(h, f);
    const records = linking ? linkableRecords(h.state, t) : linkedRecords(h.state, t.id);
    h.text('StudyRecordContext', t.date + ' · ' + shortText(t.title, 30), f.x + 24, f.y + 78, f.w - 48, 32, 18);
    h.text('StudyRecordRule', linking ? '只关联同日、未归属其他书页的已保存学习记录；不重复结算。' : '这些是已关联的原记录，计时/手动来源和原有学识均保留。',
      f.x + 24, f.y + 112, f.w - 48, 24, 15, C.muted);
    const key = linking ? 'links' : 'records', per = Math.max(1, Math.floor((f.h - 114 - 144 + 8) / 52));
    const page = slicePage(records, this.pages.get(key) || 0, per); this.pages.set(key, page.index);
    if (!records.length) h.text('RecordsEmpty', linking ? '这一天没有可关联的学习记录。已关联的记录可从明细回看。' : '这页还没有关联记录。', f.x + 24, f.y + 144, f.w - 48, 48, 17, C.muted);
    page.items.forEach((a, i) => {
      const index = h.state.activities.indexOf(a), y = f.y + 144 + i * 52, width = f.w - (linking ? 204 : 48);
      h.button('read-' + recordKey(a, index), shortText(a.note || '学习记录', 22) + ' · ' + a.amount + '分钟 · ' + recordSource(a),
        f.x + 24, y, width, 44, () => this.openActivity(h, a, index), h.busy);
      if (linking) h.button('link-' + a.id, '关联这条记录', f.x + f.w - 172, y, 148, 44,
        () => h.send('study_link', { task_id: t.id, activity_id: a.id }), h.busy || !studyAccess(h.state, t).writable, true);
    });
    this.pager(h, f, key, page.count, page.index, { id: 'records-book', label: '回到书页', action: () => h.go('life-study', true) });
  }
  private planList(h: PanelHost, f: Frame) {
    this.strip(h, f, 126, [
      { id: 'plans-active', label: '进行中的计划', selected: !this.archivedPlans, action: () => { this.archivedPlans = false; this.pages.delete('plans'); h.redraw(true); } },
      { id: 'plans-archived', label: '归档计划', selected: this.archivedPlans, action: () => { this.archivedPlans = true; this.pages.delete('plans'); h.redraw(true); } },
    ]);
    const plans = planRecords(h.state, this.archivedPlans);
    this.hint = '计划和书页分别归档；修改默认时长不会改写已有书页。';
    this.rows(h, f, 'plans', plans.map(p => ({ id: 'plan-' + p.id, label: shortText(p.title, 28) + ' · 每天 ' + p.daily_minutes + '分钟' })),
      178, id => { this.planId = id.slice(5); h.go('life-plan'); }, '这里还没有计划。可以装订新计划，或从归档中取回。',
      { id: 'plan-new', label: '新建长期计划', action: () => this.newForm(h, true) });
  }
  private plan(h: PanelHost, f: Frame) {
    const p = this.selectedPlan(h); if (!p) return this.noEntry(h, f);
    this.pageTitle(h, f, p.title);
    const runningTask = h.state.study_task_log?.find(t => t.id === h.state.timer?.study_task_id);
    h.text('PlanGoal', '每天 ' + p.daily_minutes + '分钟 · ' + (p.archived_at ? '已归档' : '进行中'), f.x + 24, f.y + (f.compact ? 158 : 196), f.w - 48, 24, 16, C.muted);
    this.strip(h, f, f.compact ? 184 : 240, [
      { id: 'plan-edit', label: '修改计划', action: () => this.newForm(h, true, p), disabled: !!p.archived_at },
      { id: 'plan-archive', label: p.archived_at ? '取回计划' : '归档计划', action: () => h.send('study_plan_archive', { plan_id: p.id, archived: !p.archived_at }),
        disabled: !p.archived_at && runningTask?.plan_id === p.id },
      { id: 'plan-pages', label: '查看全部书页', action: () => h.go('life-plan-pages') },
    ]);
    this.strip(h, f, f.h - 62, [
      { id: 'plan-today', label: p.archived_at ? '先取回计划再翻页' : '翻开今天一页', disabled: !!p.archived_at,primary:true, action: async () => {
        const ok = await h.send('study_plan_today', { plan_id: p.id });
        if (ok) { const t = h.state.study_task_log?.find(t => t.plan_id === p.id && t.date === lifeDate(h.now)); if (t) this.openTask(h, t.id); }
      } },
      { id: 'plan-current', label: '查看当前计时', disabled: !h.state.timer, action: () => h.go('life-timer') },
    ]);
    this.hint = '一天只翻一页；既有书页的主题、目标和记录保持原值。';
  }
  private planPages(h: PanelHost, f: Frame) {
    const p = this.selectedPlan(h); if (!p) return this.noEntry(h, f);
    h.text('PlanHistoryName', shortText(p.title, 32) + ' · 含归档书页', f.x + 24, f.y + 80, f.w - 48, 40, 18);
    const tasks = (h.state.study_task_log || []).filter(t => t.plan_id === p.id).sort((a, b) => b.date.localeCompare(a.date) || b.created_at - a.created_at);
    this.rows(h, f, 'plan-pages', tasks.map(t => ({ id: 'study-' + t.id, label: t.date + ' · ' + shortText(t.title, 24) + (t.archived_at ? ' · 已归档' : '') + ' · ' + t.minutes + '/' + t.target_minutes + '分' })),
      132, id => this.openTask(h, id.slice(6)), '这本计划还没有书页。返回计划后可翻开今天一页。');
  }
  private form(h: PanelHost, f: Frame) {
    const plan = h.mode.startsWith('plan-'), edit = h.mode.endsWith('-edit'), titleWidth = Math.floor((f.w - 72) * .7);
    h.field('study-title', plan ? '计划名称' : '研习主题', this.title, f.x + 24, f.y + 80, titleWidth, v => this.title = v, false, 80);
    h.field('study-minutes', plan ? '每日分钟（1–120）' : '目标分钟（1–120）', this.minutes, f.x + titleWidth + 48, f.y + 80, f.w - titleWidth - 72, v => this.minutes = v, true, 3);
    h.text('StudyFormHint', edit ? '修改不另发成长；已有记录保持原样。计划默认时长仅影响新书页。' : '按自己的节奏完成。计时与手动记录不会直接发放三种成长点数。',
      f.x + 24, f.y + 166, f.w - 48, 48, 16, C.muted);
    const valid = Array.from(this.title.trim()).length > 0 && Array.from(this.title.trim()).length <= 80 && Number.isInteger(Number(this.minutes)) && Number(this.minutes) >= 1 && Number(this.minutes) <= 120;
    h.button('save-study', edit ? '保存修改' : plan ? '装订计划' : '写下这一页', f.x + 24, f.y + f.h - 62, f.w - 48, 44, async () => {
      const id = this.formId;
      const ok = await h.send(plan ? (edit ? 'study_plan_edit' : 'study_plan_create') : (edit ? 'study_edit' : 'study_create'),
        { [plan ? 'plan_id' : 'task_id']: id, title: this.title.trim(), [plan ? 'daily_minutes' : 'target_minutes']: Number(this.minutes) });
      if (ok) { if (plan) { this.planId = id; this.lifeTab = 'plans'; h.go('life-plan', true); } else { this.taskId = id; this.lifeTab = 'study'; if (!edit) { this.scope = 'today'; this.studyDate = ''; } h.go('life-study', true); } }
    }, h.busy || !valid, true);
  }
  private timer(h: PanelHost, f: Frame) {
    const timer = h.state.timer;
    if (!timer) { h.text('NoTimer', '当前计时已结束，记录可从书页或活动历史查看。', f.x + 24, f.y + 90, f.w - 48, 64, 18); return; }
    this.pageTitle(h, f, timer.topic);
    h.text('TimerCurrent', timeText(timerSeconds(h.state, h.now)) + (f.compact?' · '+(timer.running?'进行中':'已暂停'):''), f.x + 24, f.y + (f.compact ? 158 : 222), f.w - 48, f.compact?24:76, f.compact?18:48, C.moss,!f.compact);
    if(!f.compact)h.text('TimerStatus',timer.running?'正在专注':'计时已暂停',f.x+24,f.y+302,f.w-48,32,17,C.muted,true);
    const task = h.state.study_task_log?.find(t => t.id === timer.study_task_id);
    h.button('timer-book', task ? '查看关联书页 · ' + task.date : '旧计时没有关联书页', f.x + 24, f.y + (f.compact ? 184 : 360), f.w - 48, 44, () => task && this.openTask(h, task.id), h.busy || !task,false,'entry');
    this.strip(h, f, f.h - 62, [
      { id: 'timer-toggle', label: timer.running ? '暂停计时' : '继续计时',primary:true, action: () => h.send(timer.running ? 'timer_pause' : 'timer_resume', { timer_id: timer.id }) },
      { id: 'timer-finish', label: '结束并记录', action: () => h.send('timer_finish', { timer_id: timer.id }) },
    ]);
    this.hint = '这里控制的是上方主题的当前计时；计时经过不代表行为已核验。';
  }
  private contractList(h: PanelHost, f: Frame) {
    const date = this.contractDate || lifeDate(h.now), active = h.state.life_journal?.tasks.find(t => t.status === 'active');
    const y = f.y + 126, x = f.x + 24, gap = 8;
    const widths = [60, 60, 156, 72, 130, f.w - 48 - 60 - 60 - 156 - 72 - 130 - 5 * gap];
    const actions = [
      { id: 'day-prev', label: '前日', run: () => this.selectContractDay(h, moveDay(date, -1)) },
      { id: 'day-next', label: '次日', run: () => this.selectContractDay(h, moveDay(date, 1)) },
      { id: 'contract-date', label: date, run: () => this.openCalendar(h, 'contracts') },
      { id: 'day-today', label: '今天', run: () => this.selectContractDay(h, lifeDate(h.now)) },
      { id: 'contract-current', label: '查看当前约定', run: () => { if (active) { this.contractDate = active.date; this.cancelId = active.id; h.go('life-contract'); } } },
      { id: 'contract-filter', label: this.contractFilter === 'all' ? '全部状态' : contractStatuses[this.contractFilter], run: () => {
        const filters: ContractFilter[] = ['all', 'claimed', 'cancelled', 'active']; this.contractFilter = filters[(filters.indexOf(this.contractFilter) + 1) % filters.length]; this.pages.delete('contracts'); h.redraw(true);
      } },
    ];
    let offset = 0;const stacked=f.w<760;
    actions.forEach((a,i)=>{const bw=stacked?(f.w-64)/3:widths[i];h.button(a.id,a.label,stacked?x+(i%3)*(bw+8):x+offset,stacked?y+Math.floor(i/3)*52:y,bw,44,a.run,h.busy||(a.id==='contract-current'&&!active));offset+=bw+gap;});
    const records = contractRecords(h.state, date, this.contractFilter);
    const quota = dailyQuota(h.state.life_journal?.tasks || [], lifeDate(h.now), h.state.life_journal?.limit || 5);
    const selectedQuota = dailyQuota(h.state.life_journal?.tasks || [], date, h.state.life_journal?.limit || 5);
    this.hint = date + ' 已结算 ' + selectedQuota.claimed + '/' + (h.state.life_journal?.limit || 5) + ' · 预留 ' + selectedQuota.reserved + '；今日可领取 ' + quota.remaining + '。按领取日归档。';
    this.rows(h, f, 'contracts', records.map(t => ({ id: 'contract-' + t.id, label: contractStatuses[t.status] + ' · ' + lifeKinds[t.kind] + ' ' + t.hours + '小时 · ' + (t.status === 'claimed' ? '+' + t.reward + ' ' + pointNames[t.kind] : t.status === 'cancelled' ? '0点' : '等待结算') })),
      stacked?230:178, id => { this.cancelId = id.slice(9); h.go('life-contract'); }, '这一天没有符合条件的约定。可以更换日期或查看当前跨天约定。');
  }
  private selectContractDay(h: PanelHost, date: string) { this.contractDate = date === lifeDate(h.now) ? null : date; this.pages.delete('contracts'); h.redraw(true); }
  private contract(h: PanelHost, f: Frame) {
    const task = h.state.life_journal?.tasks.find(t => t.id === this.cancelId);
    if (!task) return this.noEntry(h, f);
    const remaining = Math.max(0, task.ready_at - h.now);
    const status = task.status === 'active' ? remaining ? timeText(remaining) + '后可结算' : '已到期，待结算' : contractStatuses[task.status];
    h.text('ContractName', lifeKinds[task.kind] + ' · ' + task.hours + '小时 · ' + status, f.x + 24, f.y + 78, f.w - 48, 32, 21);
    const ended = task.status === 'claimed' ? '结算 ' + realTime(task.claimed_at) + ' · +' + task.reward + ' ' + pointNames[task.kind]
      : task.status === 'cancelled' ? '取消 ' + realTime(task.cancelled_at) + ' · 不发点数' : '到期后需走近诺亚结算，不能从历史页远程领取。';
    h.text('ContractDates', '领取 ' + realTime(task.accepted_at) + '\n可结算 ' + realTime(task.ready_at) + '\n' + ended,
      f.x + 24, f.y + 112, f.w - 48, 72, 16);
    h.text('ContractArchive', '归档日 ' + task.date + ' · 现实等待计时，未核验行为', f.x + 24, f.y + 190, f.w - 48, 28, 15, C.muted);
    if (task.status === 'active') this.strip(h, f, f.h - 62, [
      { id: 'cancel-life', label: this.confirmCancel ? '确认取消（不发点数）' : '取消这份约定', action: async () => {
        if (!this.confirmCancel) { this.confirmCancel = true; h.redraw(); return; }
        if (await h.send('life_cancel', { task_id: task.id })) this.confirmCancel = false;
      } },
      { id: 'life-mark-noah', label: this.confirmCancel ? '保留约定' : '标记诺亚位置', action: () => { if (this.confirmCancel) { this.confirmCancel = false; h.redraw(); } else this.markNoah(h); } },
    ]);
    else this.strip(h, f, f.h - 62, [
      { id: 'contract-back', label: '查看领取日列表', action: () => { this.lifeTab = 'contracts'; this.contractDate = task.date; h.go('life', true); } },
      { id: 'contract-growth', label: '查看成长培养', action: () => h.go('growth') },
    ]);
  }
  private confirmCancel = false;
  private markNoah(h: PanelHost) { const npc = residentPositions(h.world, h.state, h.now).find(n => n.id === 'noah'); if (npc) h.mark({ mapId: npc.location!, targetId: npc.id }, npc.name); }
  private history(h: PanelHost, f: Frame) {
    this.strip(h, f, 126, [
      { id: 'history-activities', label: '活动记录', selected: !this.oldExercise, action: () => { this.oldExercise = false; this.pages.delete('history'); h.redraw(true); } },
      { id: 'history-exercise', label: '旧日锻炼约定', selected: this.oldExercise, action: () => { this.oldExercise = true; this.pages.delete('history'); h.redraw(true); } },
      { id: 'history-date', label: this.historyDate || '全部日期', action: () => this.openCalendar(h, 'activity') },
    ]);
    if (this.oldExercise) {
      const tasks = (h.state.exercise_task_log || []).filter(t => !this.historyDate || t.date === this.historyDate).sort((a, b) => b.date.localeCompare(a.date));
      this.hint = '旧记录只供回看；新的健康点仍通过诺亚的现实委托结算。';
      this.rows(h, f, 'exercise', tasks.map(t => ({ id: 'exercise-' + t.id, label: t.date + ' · ' + shortText(t.title, 22) + ' · ' + t.minutes + '/' + t.target_minutes + '分 · ' + (t.completed_at ? '已达成' : '未完成') })),
        178, id => { this.exerciseId = id.slice(9); h.go('life-exercise'); }, '这一天没有旧日锻炼约定。可更换日期查看既有记录。');
      return;
    }
    const records = h.state.activities.map((a, index) => ({ a, index })).filter(({ a }) => !this.historyDate || a.date === this.historyDate).reverse();
    this.hint = '活动、现实约定与学习书页分别留存；回看不重新结算。';
    this.rows(h, f, 'history', records.map(({ a, index }) => ({ id: 'activity-' + recordKey(a, index), label: a.date + ' · ' + (activityNames[a.kind] || a.kind) + ' ' + a.amount + activityUnit(a.kind) + ' · ' + shortText(a.note || recordSource(a), 20) })),
      178, id => { this.activityId = id.slice(9); this.notePage = 0; h.go('life-activity'); }, '这一天没有活动记录。可更换日期或从手动记录留下一笔。');
  }
  private activity(h: PanelHost, f: Frame) {
    const a = h.state.activities.find((a, i) => recordKey(a, i) === this.activityId);
    if (!a) return this.noEntry(h, f);
    h.text('ActivityTitle', (activityNames[a.kind] || a.kind) + ' · ' + a.amount + activityUnit(a.kind), f.x + 24, f.y + 78, f.w - 48, 30, 22);
    h.text('ActivitySource', a.date + ' · ' + recordSource(a), f.x + 24, f.y + 110, f.w - 48, 22, 14, C.muted);
    const rows = f.compact ? 4 : Math.max(4, Math.floor((f.h - 246) / 24)), pages = textPages(a.note || '无备注', Math.floor((f.w - 48) / 16), rows);
    this.notePage = Math.min(this.notePage, pages.length - 1);
    h.text('ActivityNote', pages[this.notePage], f.x + 24, f.y + 132, f.w - 48, rows * 24, 16);
    this.hint = '原记录学识 ' + a.xp + ' · ' + (a.study_task_id ? '已关联研习书页' : a.exercise_task_id ? '已关联旧锻炼约定' : '未关联书页') + '；回看不发奖励。';
    if (pages.length > 1) this.strip(h, f, f.h - 62, [
      { id: 'note-prev', label: '上一段', action: () => { this.notePage--; h.redraw(); }, disabled: this.notePage === 0 },
      { id: 'note-next', label: '下一段 ' + (this.notePage + 1) + '/' + pages.length, action: () => { this.notePage++; h.redraw(); }, disabled: this.notePage === pages.length - 1 },
    ]);
    else h.button('record-back', '返回记录列表', f.x + 24, f.y + f.h - 62, f.w - 48, 44, () => h.close(), h.busy);
  }
  private exercise(h: PanelHost, f: Frame) {
    const t = h.state.exercise_task_log?.find(t => t.id === this.exerciseId); if (!t) return this.noEntry(h, f);
    this.pageTitle(h, f, t.title);
    h.text('ExerciseProgress', t.date + ' · ' + t.minutes + '/' + t.target_minutes + '分钟 · ' + (t.completed_at ? '已达成' : '未完成'),
      f.x + 24, f.y + (f.compact ? 158 : 196), f.w - 48, 24, 16, C.muted);
    this.hint = '旧日锻炼约定只供回看。健康点由诺亚的现实约定结算。';
    h.button('exercise-records', '查看原关联活动', f.x + 24, f.y + f.h - 62, f.w - 48, 44, () => h.go('life-exercise-records'), h.busy, true);
  }
  private exerciseRecords(h: PanelHost, f: Frame) {
    const records = h.state.activities.map((a, index) => ({ a, index })).filter(({ a }) => a.exercise_task_id === this.exerciseId);
    this.hint = '原活动和归属保留；不新增旧锻炼奖励或记录。';
    this.rows(h, f, 'exercise-records', records.map(({ a, index }) => ({ id: 'activity-' + recordKey(a, index), label: a.date + ' · ' + a.amount + activityUnit(a.kind) + ' · ' + shortText(a.note || '运动记录', 26) })),
      82, id => { this.activityId = id.slice(9); this.notePage = 0; h.go('life-activity'); }, '这份旧约定尚无关联活动。');
  }
  private manual(h: PanelHost, f: Frame) {
    const kinds = ['study', 'exercise', 'creative', 'steps', 'management'];
    h.button('activity-kind', activityNames[this.activityKind] + ' · 更换类型', f.x + 24, f.y + 126, f.compact?168:Math.min(240,f.w-240), 44, () => { this.activityKind = kinds[(kinds.indexOf(this.activityKind) + 1) % kinds.length]; this.amount = '1'; h.redraw(); }, h.busy);
    const amountX=f.compact?f.x+208:f.x+Math.min(288,f.w-192);
    h.field('activity-amount', '数量（' + activityUnit(this.activityKind) + '）', this.amount, amountX, f.y + 120, 120, v => this.amount = v, true, 6);
    h.field('activity-note', '备注（选填）', this.note, f.x+(f.compact?344:24), f.y+(f.compact?120:218), f.compact?f.w-368:f.w-48, v => this.note = v, false, 160);
    if(!f.compact)h.text('ActivitySource','记录来源 · 手动填写',f.x+24,f.y+308,f.w-48,28,16,C.muted);
    this.hint = '手动记录 · 未核验。不会直接发放知识、健康或技能点。';
    const valid = Number.isInteger(Number(this.amount)) && Number(this.amount) > 0;
    h.button('save-activity', '保存这条手动记录', f.x + 24, f.y + f.h - 62, f.w - 48, 44, async () => {
      const ok = await h.send('activity', { kind: this.activityKind, amount: Number(this.amount), note: this.note });
      if (ok) { this.note = ''; this.lifeTab = 'history'; this.oldExercise = false; this.historyDate = ''; this.pages.delete('history'); h.redraw(); }
    }, h.busy || !valid, true);
  }
  private openCalendar(h: PanelHost, target: CalendarTarget) {
    this.calendarTarget = target;
    const date = target === 'contracts' ? this.contractDate : target === 'study' ? this.studyDate : this.historyDate;
    this.month = (date || lifeDate(h.now)).slice(0, 7);
    this.monthPage = h.height - 24 < 460 ? Math.floor(Math.max(0, calendarDays(this.month).indexOf(date || lifeDate(h.now))) / 14) : 0;
    h.go('life-calendar');
  }
  private calendar(h: PanelHost, f: Frame) {
    this.strip(h, f, 68, [
      { id: 'month-prev', label: '上个月', action: () => { this.month = moveMonth(this.month + '-01', -1); this.monthPage = 0; h.redraw(); } },
      { id: 'month-label', label: this.month, action: () => {}, disabled: true },
      { id: 'month-next', label: '下个月', action: () => { this.month = moveMonth(this.month + '-01', 1); this.monthPage = 0; h.redraw(); } },
    ]);
    const days = calendarDays(this.month), per = f.compact ? 14 : 42, page = slicePage(days, this.monthPage, per); this.monthPage = page.index;
    const width = (f.w - 48 - 6 * 8) / 7;
    const selected = this.calendarTarget === 'contracts' ? this.contractDate || lifeDate(h.now) : this.calendarTarget === 'study' ? this.studyDate : this.historyDate;
    const weekdays = ['一', '二', '三', '四', '五', '六', '日'];
    weekdays.forEach((day, i) => h.text('Weekday-' + i, day, f.x + 24 + i * (width + 8), f.y + 114, width, 18, 13, C.muted, true));
    page.items.forEach((day, i) => {
      if (!day) return;
      const count = this.calendarTarget === 'contracts' ? h.state.life_journal?.tasks.filter(t => t.date === day).length || 0
        : this.calendarTarget === 'study' ? (h.state.study_task_log || []).filter(t => t.date === day && (this.scope === 'archived' ? !!t.archived_at : !t.archived_at)).length
        : this.oldExercise ? (h.state.exercise_task_log || []).filter(t => t.date === day).length : h.state.activities.filter(a => a.date === day).length;
      h.button('date-' + day, String(Number(day.slice(8))) + (day === lifeDate(h.now) ? '今' : '') + (count ? ' (' + count + ')' : ''),
        f.x + 24 + (i % 7) * (width + 8), f.y + 136 + Math.floor(i / 7) * 48, width, 44, () => this.pickDate(h, day), h.busy, day === selected);
    });
    this.strip(h, f, f.h - 62, [
      { id: 'calendar-prev', label: '前段', disabled: page.index === 0, action: () => { this.monthPage--; h.redraw(); } },
      { id: 'calendar-next', label: '后段 ' + (page.index + 1) + '/' + page.count, disabled: page.index >= page.count - 1, action: () => { this.monthPage++; h.redraw(); } },
      { id: 'calendar-today', label: '回到今天', action: () => this.pickDate(h, lifeDate(h.now)) },
      ...(this.calendarTarget === 'contracts' ? [] : [{ id: 'calendar-all', label: '全部日期', action: () => this.pickDate(h, '') }]),
    ]);
    this.hint = '日期按北京时间；括号表示已有记录数，查看不会新建记录。';
  }
  private pickDate(h: PanelHost, date: string) {
    if (this.calendarTarget === 'contracts') this.selectContractDay(h, date);
    else if (this.calendarTarget === 'study') { this.studyDate = date; if (this.scope !== 'archived') this.scope = date === lifeDate(h.now) ? 'today' : 'history'; this.pages.delete('study'); }
    else { this.historyDate = date; this.pages.delete('history'); this.pages.delete('exercise'); }
    h.go('life', true);
  }
}
