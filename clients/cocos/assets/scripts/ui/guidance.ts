import {formatMoney} from '../core/currency';
import {canExploreStory,canReadGate,legacyJourney} from '../core/story';
import {paperSurface,inkRule} from './materials';
import type { PanelHost } from './panels';
import type { GuidanceAction } from '../core/guidance';
import { currentGuidance, objectiveText, serviceNear } from '../core/guidance';
import { villageIntroStep } from '../core/villageIntro';
import { activePromise, clearedDepth, growthStep, hasDepartureNotes, nextDeparture, trailStep, type PreparationTopic } from '../core/nextDeparture';
import { shortText, textPages, realTime } from '../core/lifeRecords';
import { costText, itemNames } from '../core/features';
import { C } from './theme';

type Frame = { x: number; y: number; w: number; h: number; compact: boolean };
type Action = { id: string; label: string; run: () => unknown; disabled?: boolean };
export class GuidancePanels {
  private section = 'basics'; private topic: PreparationTopic = 'gear'; private automaticTopic = true;
  private weapon = 'reinforced_sword'; private pages = new Map<string, number>(); private saveId = '';
  private modes = ['guide', 'guide-goal', 'expedition', 'preparation', 'preparation-compare'];
  handles(mode: string) { return this.modes.includes(mode); }
  prepare() { this.automaticTopic = true; }
  snapshot() { return { guideSection: this.section, preparationTopic: this.topic, comparisonWeapon: this.weapon }; }
  draw(h: PanelHost) {
    if (this.saveId !== h.saveId) { this.saveId = h.saveId; this.pages.clear(); this.section = 'basics'; this.automaticTopic = true; }
    const height = Math.min(620, h.height - 24), f: Frame = { x: 0, y: (h.height - height) / 2, w: Math.min(920, h.width - 32), h: height, compact: height < 460 };
    f.x = (h.width - f.w) / 2;
    paperSurface(h,f,true);
    const title = ({ guide: '旅人指南', 'guide-goal': '当前旅途目标', expedition: '第一次初探', preparation: '再出发手记', 'preparation-compare': '可选装备比较' } as Record<string, string>)[h.mode];
    h.text('GuidanceTitle', title, f.x + 24, f.y + 12, f.w - 152, 42, 22);
    h.button('close', '返回', f.x + f.w - 100, f.y + 12, 76, 44, () => h.close(), h.busy);
    if (h.mode === 'guide') this.manual(h, f);
    else if (h.mode === 'guide-goal') this.goal(h, f);
    else if (h.mode === 'expedition') this.expedition(h, f);
    else if (h.mode === 'preparation') this.preparation(h, f);
    else this.compare(h, f);
    if (h.error || h.notice) h.text('GuidanceFeedback', textPages(h.error || h.notice, Math.floor((f.w - 48) / 14), 2)[0], f.x + 24, f.y + f.h - 108, f.w - 48, 42, 14, h.error ? C.danger : C.muted);
  }
  private tabs(h: PanelHost, f: Frame, entries: [string, string][], selected: string, change: (id: string) => void) {
    const width = (f.w - 48 - (entries.length - 1) * 8) / entries.length;
    entries.forEach(([id, label], i) => h.button('guide-tab-' + id, label, f.x + 24 + i * (width + 8), f.y + 68, width, 44,
      () => { change(id); h.redraw(true); }, h.busy, selected === id,'tab'));
  }
  private leaf(h: PanelHost, f: Frame, key: string, body: string, top: number) {
    const illustrated=!f.compact&&f.h>=520,parts=body.split('\n'),heading=parts.shift()||'',offset=illustrated?132:24;
    const width=f.w-offset-32,bodyTop=top+(illustrated?68:0),rows=Math.max(3,Math.floor((f.h-114-bodyTop)/24));
    const pages=textPages(illustrated?parts.join('\n'):body,Math.max(16,Math.floor(width/16)),rows);
    const index=Math.max(0,Math.min(this.pages.get(key)||0,pages.length-1));this.pages.set(key,index);
    if(illustrated){
      h.text('GuidanceHeading',heading,f.x+32,f.y+top,f.w-64,48,24);
      inkRule(h,'GuidanceHeadingRule',f.x+32,f.y+top+54,f.w-64);
      const weapon=h.state.combat?.equipped,art=h.mode==='preparation'&&this.topic==='gear'&&weapon&&(h.state.inventory[weapon]||0)>0?'items/'+weapon:'items/journal';
      h.image(art,f.x+72,f.y+bodyTop+48,64,64);
      h.text('GuidancePageMark','手记',f.x+32,f.y+bodyTop+96,80,28,14,C.wood,true);
    }
    h.text('GuidanceBody',pages[index],f.x+offset,f.y+bodyTop,width,Math.min(rows,pages[index].split('\n').length)*24,16);
    return {key,index,count:pages.length,last:index===pages.length-1};
  }

  private pager(h: PanelHost, f: Frame, page: { key: string; index: number; count: number }, primary: Action, secondary: Action) {
    const y = f.y + f.h - 62, middle = (f.w - 264) / 2;
    h.button('guide-prev', '前页', f.x + 24, y, 96, 44, () => { this.pages.set(page.key, page.index - 1); h.redraw(); }, h.busy || !page.index);
    h.button(primary.id, primary.label, f.x + 128, y, middle, 44, primary.run, h.busy || !!primary.disabled, true);
    h.button(secondary.id, secondary.label, f.x + 136 + middle, y, middle, 44, secondary.run, h.busy || !!secondary.disabled);
    h.button('guide-next', '后页 ' + (page.index + 1) + '/' + page.count, f.x + f.w - 120, y, 96, 44, () => { this.pages.set(page.key, page.index + 1); h.redraw(); }, h.busy || page.index >= page.count - 1);
  }
  private goManual(h: PanelHost, section = 'intro') { this.section = section; h.go('guide'); }
  private manual(h: PanelHost, f: Frame) {
    this.tabs(h, f, [['basics', '行走交互'], ['home', '家园生计'], ['cave', '洞穴远行'], ['life', '记录接续'], ['intro', '初探进度']], this.section, id => this.section = id);
    const intro = h.state.village_intro, c = h.state.combat;
    const text: Record<string, string> = {
      basics: '从家门口，慢慢出发\nWASD或方向键移动，靠近对象按E互动；房间门口可返回户外。点击地面寻路，点击远处门口或家具会先走近再互动。\n触屏用方向键和交互按钮。Esc停步或逐层关闭面板；文字输入和中文组合输入拥有焦点时，不触发游戏快捷键。\nI行囊，C档案，J委托，M地图，L现实成长。菜单可重新打开本指南。导航只标记方向，不传送。',
      home: '给小日子留一份收获\n落枝、矿石按现实时间恢复；走近家园农田播种，成熟后再收获。新作物随游戏时间和睡眠生长，离线暂停；旧作物以地块显示为准。\n小铺可按柜台报价买卖和交订单；工坊可制作木板、出售萝卜、升级建筑。物品先看数量，确认后才结算。\n游戏01:00前到床边睡眠；床边也可免费短休。未及时休息会回家并失去部分生命，体力不恢复；这不会替代现实健康记录。',
      cave: '准备好，再去看山那边\n武备台可购买或打造武器，带走后主动装备。购买不要求制造等级，打造必须满足当前图纸条件。\n山洞中空格攻击、Q火花术、R菜汤，点击怪物选择目标；阅读面板时战斗暂停。已获材料与永久通路保留，可随时安全撤离。\n底层守卫的门钥魔法石与魔法3级用于开启东行石门。石门必须到场确认；新的城市进阶尚未接入。',
      life: '现实成长与旅程凭证\n成长按钮或L直接进入研习、计划、手动记录、约定历史，不用在世界里走回建筑。计时和手动来源明确，不能证明行为已核验。\n诺亚的学习、运动、工作约定按现实等待时间结算，需走近他明确领取和结算；三类每日额度合计计算。关闭或睡眠不加速约定。\n存档页可导出完整数据和独立旅程凭证。接续先预览再确认；同一服务器才有对应存档。切换已有旅程前先备份凭证；删除有二次确认，结果待确认时只重试原删除。',
      intro: '第一次初探与下一程\n' + (c?.legacy_passage ? '旧旅程通行资格已保留，无需补做初探或重复启门。下列是可选初探记录。' : intro ? (intro.dismissed ? '引导已收起，可主动继续；进度仍在服务器。' : '引导正在显示；可随时收起，不会丢进度。') : '初探状态尚未就绪。')
        + '\n' + [['了解远行条件', intro?.briefed], ['首层已清理', intro?.first_clear], ['带材料回到工坊', intro?.returned], ['已记下工坊回顾', intro?.reviewed]].map(([label, done]) => (done ? '✓ ' : '○ ') + label).join('\n')
        + '\n' + (c?.gate_open ? '石门已永久开放，可继续远行或自由探索。' : '安家后在告示板了解条件；只需先准备武器并初探首层。回工坊记下材料用途后，再出发手记会接上装备、洞穴与现实成长。'),
    };
    if(!canExploreStory(h.state)){
      text.cave='先把小日子安顿好\n村庄里的日常会逐步带来新的发现。现在可以继续当前委托，也可以自由走走。';
      text.intro='按自己的节奏生活\n当前主线会在任务笺里指明下一步；新的委托随着村庄经历出现。未来的故事暂时不列出。';
    } else if(!canReadGate(h.state)){
      text.cave='工坊需要一点洞穴材料\n准备并装备武器，先探索首层，带胶质回工坊。空格攻击、V闪避；随时可撤离，通路和材料保留。';
      text.intro='初探进度\n'+[['清理首层',intro?.first_clear],['带材料回工坊',intro?.returned],['记下材料回顾',intro?.reviewed]].map(([label,done])=>(done?'✓ ':'○ ')+label).join('\n');
    }
    const page = this.leaf(h, f, 'manual:' + this.section, text[this.section], 126);
    const primary: Action = this.section === 'intro' && intro && !c?.gate_open
      ? { id: 'guide-toggle-intro', label: intro.dismissed ? '继续引导' : '收起引导', run: () => h.send('intro_toggle', { dismissed: !intro.dismissed }) }
      : { id: 'guide-current-goal', label: '查看当前目标', run: () => h.go('guide-goal') };
    const secondary: Action = this.section === 'life' ? { id: 'guide-session', label: '打开存档与接续', run: () => h.go('session') }
      : { id: 'guide-expedition', label: intro?.reviewed ? '再出发手记' : '查看初探手记', run: () => { this.prepare(); h.go(intro?.reviewed ? 'preparation' : 'expedition'); } };
    this.pager(h, f, page, primary, secondary);
  }
  private goal(h: PanelHost, f: Frame) {
    const entry = currentGuidance(h.state, h.now), q = h.state.quest_log.find(q => q.id === entry.questId);
    const body = entry.progress + '\n' + entry.title + '\n' + entry.note + (q ? '\n' + q.objectives.map((_, i) => (q.checks[i] ? '✓ ' : '○ ') + objectiveText(h.state, q, i)).join('\n') + '\n回礼 ' + costText(q.reward) + ' · ' + q.xp + '经验' : '');
    const page = this.leaf(h, f, 'goal:' + entry.key, body, 78);
    this.pager(h, f, page, entry.action ? { id: 'goal-follow', label: entry.action.label, run: () => h.follow(entry.action!) }
      : { id: 'goal-journal', label: '查看旅途委托', run: () => h.go('journal') },
      { id: 'goal-guide', label: '旅人指南', run: () => this.goManual(h) });
  }
  private expedition(h: PanelHost, f: Frame) {
    const s = h.state, intro = s.village_intro, c = s.combat;
    const board = serviceNear(h.world, s, h.now, 'board', 'overworld'), gate = serviceNear(h.world, s, h.now, 'village_departure', 'overworld');
    const counter = serviceNear(h.world, s, h.now, 'armory_counter', 'workshop');
    let body = '', key = 'start', primary: Action;
    if (c?.gate_open) {
      key = 'completed'; body = (c.legacy_passage ? '旧旅程通行资格已保留' : '石门已永久开启') + '\n无需补做初探、重复研修或再次嵌石。原有通路与旅程进度仍在，可继续当前委托或自由探索；初探记录不影响通行。';
      primary = { id: 'intro-completed', label: '查看当前旅途委托', run: () => h.go('journal') };
    } else if (!intro || !canExploreStory(s) || s.quests.settle_in?.status !== 'claimed') {
      body = '从安家开始\n先继续村庄当前的生活委托，新的发现会随着经历出现。世界和现实成长都可自由进入；这本手记不会替你完成任务或发放奖励。';
      primary = { id: 'intro-first-quest', label: '查看当前委托', run: () => h.go('journal') };
    } else if (!legacyJourney(s) && canReadGate(s) && !intro.briefed) {
      key='gate-discovery';body='石门上的旧纹路\n开启石门需要底层守卫保底掉落的门钥魔法石，以及魔法3级。\n从0级起，学习约定至少需3小时现实等待，结算后主动投入魔法；游戏睡眠不加速，科技主修也需要这项基础魔法。\n可以交错进行洞穴探索与成长准备。到村东石门亲自记下条件，调查不会消耗物品。';
      primary=gate?{id:'intro-brief',label:'记下启门条件',run:()=>h.send('intro_brief',{target:'village_departure'})}:{id:'intro-mark-gate',label:'标记村东石门',run:()=>h.mark({mapId:'overworld',targetId:'village_departure'},'调查旧纹路')};
    } else if (!legacyJourney(s) && intro.reviewed && !hasDepartureNotes(s)) {
      key='reviewed';body='材料回顾已经保存\n首层的收获和通路保留。回到告示板交付当前委托，看看村民带来了什么新线索。';
      primary={id:'intro-current-quest',label:'查看当前委托',run:()=>h.go('journal')};
    } else if (intro.reviewed) {
      key = 'reviewed'; body = '初探回顾已经保存\n首层材料和已探索通路保留。可先比较装备、继续洞穴探索，或安排现实学习，为启门魔法做准备；这些准备可并行进行。';
      primary = { id: 'intro-preparation', label: '翻开再出发手记', run: () => { this.prepare(); h.go('preparation'); } };
    } else if (intro.dismissed) {
      key = 'dismissed'; body = '初探引导已收起\n已保存的首层、返村与回顾进度不会丢失。继续引导后，目标按真实状态更新；也可按自己的节奏游玩。';
      primary = { id: 'intro-resume', label: '继续初探引导', run: () => h.send('intro_toggle', { dismissed: false }) };
    } else if (!intro.briefed && legacyJourney(s)) {
      key = 'brief'; body = '先试一次身手，再慢慢准备远行\n石门需要底层守卫的门钥魔法石，以及魔法3级；科技主修也需这项启门魔法。\n学习约定每现实小时结算1知识点，再主动投入魔法；三类现实约定每日合计最多5点。从0级准备启门至少需要3小时现实委托，游戏睡眠不加速。\n购买武器、初探首层不要求魔法等级。不必一次打到底；现阶段先带一点首层材料回村。\n需走近告示板或村东石门，明确记下条件。';
      const quest = s.quest_log.find(q => q.id === 'leave_valley');
      primary = board || gate ? { id: 'intro-brief', label: board && quest?.status === 'available' ? '接下远行来信' : '记下远行条件', run: () => board && quest?.status === 'available' ? h.send('quest_accept', { quest_id: 'leave_valley' }) : h.send('intro_brief', { target: board ? 'board' : 'village_departure' }) }
        : { id: 'intro-mark-board', label: '标记告示板', run: () => h.mark({ mapId: 'overworld', targetId: 'board' }, '了解远行条件') };
    } else if (intro.returned && intro.first_clear) {
      key = 'review'; const staff = c?.weapons.glow_staff;
      body = '带着首层收获回来了\n背包黏液胶质 ' + (s.inventory.gel || 0) + '份。' + (staff ? '微光短杖图纸：' + costText(staff.costs) + '；建造1级，魔法 ' + staff.magic_level + '级。' : '可在武备台查看现有图纸。')
        + '\n材料可以先留着，以后用于装备制作。先把这次收获记下来，再回告示板看看新的消息。\n在工坊武备台旁确认回顾；不会消耗材料或另发奖励。';
      primary = counter ? { id: 'intro-review', label: '记下这次初探', run: async () => { if (await h.send('intro_review')) { this.prepare(); h.go(legacyJourney(s)?'preparation':'journal', true); } } }
        : { id: 'intro-mark-counter', label: '标记工坊武备台', run: () => h.mark({ mapId: 'workshop', targetId: 'armory_counter' }, '初探材料回顾') };
    } else {
      const step = villageIntroStep(s); key = step?.id || 'progress';
      body = '第一次初探 · 进度保留\n' + (step ? step.title + '\n' + step.note : '可以继续查看当前委托，或按自己的节奏探索。') + '\n首层清理 ' + (intro.first_clear ? '✓' : '○') + ' · 返回工坊 ' + (intro.returned ? '✓' : '○');
      primary = step ? { id: 'intro-follow', label: step.action, run: () => h.follow({ label: step.action, ...(step.target ? { target: step.target } : { panel: step.panel }) }) }
        : { id: 'intro-goal', label: '查看当前目标', run: () => h.go('guide-goal') };
    }
    const page = this.leaf(h, f, 'expedition:' + key, body, 78);
    if (['intro-brief', 'intro-review'].includes(primary.id) && !page.last) primary = { ...primary, label: '读完本页再确认', disabled: true };
    this.pager(h, f, page, primary, { id: 'intro-guide', label: '指南与引导开关', run: () => this.goManual(h) });
  }
  private preparation(h: PanelHost, f: Frame) {
    const s = h.state, step = nextDeparture(s, h.now);
    if (this.automaticTopic && step) { this.topic = step.topic; this.automaticTopic = false; }
    this.tabs(h, f, [['gear', '整备行囊'], ['trail', '洞穴路标'], ['growth', '成长约定']], this.topic, id => this.topic = id as PreparationTopic);
    if (s.combat?.gate_open && !hasDepartureNotes(s)) {
      const page = this.leaf(h, f, 'preparation:completed', '原有通路已经保存\n石门已永久开启，无需补做初探或重复投入启门魔法。继续当前旅途委托、整理已有装备，或直接记录现实成长即可。', 126);
      this.pager(h, f, page, { id: 'preparation-completed', label: '查看旅途委托', run: () => h.go('journal') }, { id: 'preparation-dossier', label: '查看旅人档案', run: () => h.go('character') }); return;
    }
    if (!hasDepartureNotes(s) || !step) {
      const page = this.leaf(h, f, 'preparation:locked', '下一程尚待续上\n清理首层并带材料回工坊，在武备台记下回顾后，再出发手记就会按真实准备更新。已有装备、材料与成长不会被重置。', 126);
      this.pager(h, f, page, { id: 'preparation-intro', label: '查看初探手记', run: () => h.go('expedition') }, { id: 'preparation-guide', label: '旅人指南', run: () => this.goManual(h) }); return;
    }
    const c = s.combat!, current = c.equipped && s.inventory[c.equipped] > 0 ? c.weapons[c.equipped] : null;
    const action: GuidanceAction = this.topic === 'gear' ? step.topic === 'gear' ? step : { label: '标记工坊武备台', target: { mapId: 'workshop', targetId: 'armory_counter' } }
      : this.topic === 'trail' ? trailStep(s) : { ...growthStep(s, h.now), lifeView: 'contracts' };
    let body = '';
    if (this.topic === 'gear') body = '按自己的节奏整备\n当前装备：' + (current ? current.name + ' · 伤害 ' + current.damage + ' · 距离 ' + current.reach + ' · 每次体力 ' + current.stamina : '尚未装备可用武器')
      + '\n黏液胶质 ' + (s.inventory.gel || 0) + ' · 微光晶屑 ' + (s.inventory.crystal || 0) + ' · 硬壳 ' + (s.inventory.shell || 0) + ' · 钱袋 ' + formatMoney(s.inventory.gold || 0)
      + '\n' + (step.topic === 'gear' ? step.title + '\n' + step.note : '装备改善是可选准备；可先用已有武器继续探索。比较不购买，标记不移动；武备台仍按服务端报价检查图纸条件。');
    else if (this.topic === 'trail') { const trail = trailStep(s); body = trail.title + '\n' + trail.note + '\n已清理深度 ' + clearedDepth(s) + '/5 · 第三层有安全平台和永久绳梯。\n守卫首胜 ' + (c.boss_first ? '已保存' : '尚未完成') + ' · 魔法石 ' + (s.inventory.gate_stone || 0) + ' · 石门 ' + (c.gate_open ? '已永久开启' : '待到场确认') + '。已有通路不会因返村重置。'; }
    else { const growth = growthStep(s, h.now), promise = activePromise(s); body = growth.title + '\n' + growth.note + '\n知识点 ' + (s.knowledge_points || 0) + ' · 魔法 ' + (s.knowledge_growth?.magic || 0) + '/3';
      if (promise) body += '\n当前' + ({ study: '学习', exercise: '运动', work: '工作' }[promise.kind]) + '约定 ' + promise.hours + '小时；可结算时间 ' + realTime(promise.ready_at) + '。按现实等待，未核验行为。';
      body += '\n到期需走近诺亚明确结算，再主动投入研修；手记不会自动领取、花点或开启石门。'; }
    const page = this.leaf(h, f, 'preparation:' + this.topic, body, 126);
    this.pager(h, f, page, { id: 'preparation-follow', label: action.label, run: () => h.follow(action) }, this.topic === 'gear'
      ? { id: 'preparation-compare', label: '比较可选装备', run: () => h.go('preparation-compare') }
      : { id: 'preparation-dossier', label: '查看旅人档案', run: () => h.go('character') });
  }
  private compare(h: PanelHost, f: Frame) {
    const s = h.state, c = s.combat, choices = Object.keys(c?.weapons || {}).filter(id => id !== 'stone_sword');
    if (!c || !choices.length) { h.text('ComparisonMissing', '当前没有可比较的武器资料。', f.x + 24, f.y + 90, f.w - 48, 50, 18); return; }
    if (!choices.includes(this.weapon)) this.weapon = choices[0];
    const index = choices.indexOf(this.weapon), weapon = c.weapons[this.weapon], current = c.equipped ? c.weapons[c.equipped] : null;
    const change = (delta: number) => { this.weapon = choices[(index + delta + choices.length) % choices.length]; h.redraw(true); };
    h.button('compare-prev', '上一件', f.x + 24, f.y + 68, 96, 44, () => change(-1), h.busy);
    h.text('ComparisonTitle', weapon.name, f.x + 128, f.y + 68, f.w - 256, 44, 22, C.ink, true);
    h.button('compare-next', '下一件', f.x + f.w - 120, f.y + 68, 96, 44, () => change(1), h.busy);
    const knowledge=weapon.either?'科学'+weapon.science+'级或魔法'+weapon.magic_level+'级':weapon.science?'科学'+weapon.science+'级':'魔法'+weapon.magic_level+'级';
    const body = '持有 ' + (s.inventory[this.weapon] || 0) + ' · ' + (c.equipped === this.weapon ? '当前已装备' : '可选整备，不必全部制作')
      + '\n伤害 ' + (current?.damage ?? '—') + ' → ' + weapon.damage + ' · 距离 ' + (current?.reach ?? '—') + ' → ' + weapon.reach
      + '\n每次体力 ' + weapon.stamina + ' · 间隔 ' + weapon.interval + '秒 · ' + (weapon.magic ? '魔法伤害' : '物理伤害')
      + '\n购买报价 ' + formatMoney(weapon.price) + '；购买不要求制造等级。\n图纸材料：' + costText(weapon.costs)
      + '\n打造要求：建造1级；'+knowledge+'。\n当前图纸提示：'+(weapon.craft_reasons.join('；')||'现有条件已满足，仍需到场确认')+'。\n仅比较不消耗；实际购买/打造需到武备台核对最新报价。';
    const page = this.leaf(h, f, 'compare:' + this.weapon, body, 126);
    this.pager(h, f, page, { id: 'compare-armory', label: '标记工坊武备台', run: () => h.mark({ mapId: 'workshop', targetId: 'armory_counter' }, '可选装备整备') },
      { id: 'compare-equipment', label: '查看随行装备', run: () => h.go('equipment') });
  }
}
