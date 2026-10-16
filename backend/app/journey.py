"""Server quotes and mutations for one coherent departure chapter."""
from .daynight import clock_view, settle_clock, DAY_SECONDS

DEFAULTS = {'bridge_repaired':False, 'rope_ready':False, 'letter_delivered':False,
            'booking_day':0, 'dock_work_day':0, 'inn_work_day':0, 'trail_work_day':0}
# IDs and prices stay on the server. A quote is descriptive, never an authority token.
OPTIONS = [
    ('depart','village_departure','走向苇风渡口','沿微光林地东侧小路出村。',5,{},0,'crossing',{'x':128,'y':400}),
    ('village','to_village','回到回响村庄','沿原路返回，家园和村庄进度都会保留。',5,{},0,'overworld',{'x':1784,'y':352}),
    ('repair_self','river_bridge','亲手修复旧桥','建造等级 1；修复后双向免费通行。',60,{'plank':6,'stone':4},0,None,None),
    ('repair_help','river_bridge','请工匠一起修桥','无需建造等级；修复后双向免费通行。',60,{'plank':6,'stone':4,'gold':10},0,None,None),
    ('bridge','river_bridge','走过旧桥','到达东岸山脚。',5,{},0,'mountain',{'x':128,'y':472}),
    ('ferry','adu','乘船到东岸','船票单程 6 金币，到达山脚。',20,{'gold':6},0,'mountain',{'x':128,'y':472}),
    ('dock_work','adu','帮忙整理缆绳','每天一次，获得 6 金币，足够一张船票。',30,{},10,None,None),
    ('cross_back','to_crossing','返回西岸渡口','旧桥已修复则免费，否则乘回程渡船。',20,{},0,'crossing',{'x':384,'y':320}),
    ('trail_work','mountain_camp','整理山道补给','每天一次，获得 12 金币，可准备绳索或回程船票。',30,{},10,None,None),
    ('climb','mountain_pass','翻越苍脊山脉','需要自己的绳索和当前体力 60；抵达苔桥城南门。',180,{},60,'city',{'x':160,'y':480}),
    ('descend','to_mountain','翻山返回东岸','需要绳索与当前体力 20，沿熟悉的山道返乡。',120,{},20,'mountain',{'x':704,'y':184}),
    ('enter_inn','to_inn','进入灯穗旅店','公共厅免费进入，向岚姨交信、订房或帮工。',0,{},0,'inn',{'x':240,'y':294}),
    ('exit_inn','inn_exit','回到南门街','出门后可购买旅途补给或走向南城门。',0,{},0,'city',{'x':352,'y':264}),
    ('deliver','lanya','交付村庄来信','岚姨收到信后支付 12 金币路费补贴，仅一次。',0,{},0,None,None),
    ('book','lanya','订下今晚的客房','8 金币 / 晚；付款后走到客房床铺睡到次日 06:00。',0,{'gold':8},0,None,None),
    ('inn_work','lanya','帮旅店整理布草','每天一次，获得 12 金币；缺钱时也有落脚办法。',30,{},10,None,None),
]
SUPPLY_TARGETS = ['adu','mountain_camp','city_supplies','lanya']
CAMP_TARGETS = ['crossing_camp','mountain_camp']


def ensure_departure(state):
    entry = state.setdefault('departure', {})
    for key, value in DEFAULTS.items():
        entry.setdefault(key, value)
    return entry


def quotes(state, now):
    from .rules import recover_stamina
    if state['stamina']['current'] < state['stamina']['max']:
        recover_stamina(state, now)
    d = ensure_departure(state)
    clock = clock_view(state, now)
    minute = clock['minute'] + (1440 if clock['minute'] < 360 else 0)
    inventory = state['inventory']
    rows = list(OPTIONS)
    for target in SUPPLY_TARGETS:
        rows += [('rope',target,'购置登山绳索','6 金币，永久保留的旅途装备，不占背包快捷栏。',0,{'gold':6},0,None,None),
                 ('meal',target,'吃一份热食','3 金币，即刻恢复体力 20，不超过上限。',15,{'gold':3},0,None,None)]
    for target in CAMP_TARGETS:
        rows.append(('camp',target,'在长椅上歇脚','免费，恢复体力 20；小憩不能替代当晚睡眠。',30,{},0,None,None))
    result = []
    for id, target, label, note, minutes, costs, stamina, destination, position in rows:
        costs = dict(costs)
        if id == 'cross_back':
            costs = {} if d['bridge_repaired'] else {'gold':6}
            minutes = 5 if d['bridge_repaired'] else 20
        reasons = []
        if id == 'depart' and not state.get('village_combat', {}).get('gate_open'):
            reasons.append('石门尚未开启：山洞Boss魔法石＋魔法3级，走近石门确认')
        if id == 'depart' and state.get('quests',{}).get('settle_in',{}).get('status') != 'claimed':
            reasons.append('先完成并交付告示板的安家任务，再来出发')
        if id.startswith('repair_') and d['bridge_repaired']: reasons.append('旧桥已经修复，可直接过桥')
        if id == 'repair_self' and state['skill_growth']['building'] < 1: reasons.append('需要建造等级 1，或请工匠协助')
        if id == 'bridge' and not d['bridge_repaired']: reasons.append('旧桥尚未修好；也可向阿渡买船票')
        if id == 'rope' and d['rope_ready']: reasons.append('行囊里已经有绳索')
        if id in ['climb','descend'] and not d['rope_ready']: reasons.append('需要登山绳索，可在阿渡或补给台购买')
        if id == 'deliver':
            if state.get('quests',{}).get('leave_valley',{}).get('status') != 'active': reasons.append('先在村庄告示板接取离村主线、带上来信')
            if d['letter_delivered']: reasons.append('村庄来信已经交到岚姨手中')
        if id == 'book' and d['booking_day'] == clock['day']: reasons.append('今晚已订房，请走到客房床铺睡觉')
        for work in ['dock_work','inn_work','trail_work']:
            if id == work and d[work+'_day'] == clock['day']: reasons.append('今天已经帮过忙，明天再来')
        if id in ['meal','camp'] and state['stamina']['current'] >= state['stamina']['max']: reasons.append('当前体力已满')
        for key, amount in costs.items():
            if inventory.get(key,0) < amount:
                names = {'gold':'金币','plank':'木板','stone':'石料'}
                reasons.append(f'{names[key]}还差 {amount-inventory.get(key,0)}')
        if state['stamina']['current'] < stamina: reasons.append(f'当前体力还差 {stamina-state["stamina"]["current"]}，先在营地歇脚或吃热食')
        if minutes and minute + minutes >= 1500: reasons.append('完成时已到 01:00，请先回家或到旅店睡觉')
        completed = ((id.startswith('repair_') and d['bridge_repaired']) or
                     (id == 'rope' and d['rope_ready']) or
                     (id == 'deliver' and d['letter_delivered']) or
                     (id == 'book' and d['booking_day'] == clock['day']) or
                     (id in ['dock_work','inn_work','trail_work'] and d[id+'_day'] == clock['day']))
        if completed:
            reasons = ['今晚已订房，请走到客房床铺睡觉' if id == 'book' else
                       '村庄来信已经交到岚姨手中' if id == 'deliver' else
                       '行囊里已经有绳索' if id == 'rope' else
                       '旧桥已经修复，可直接过桥' if id.startswith('repair_') else
                       '今天已经帮过忙，明天再来']
            costs, stamina, minutes = {}, 0, 0
        result.append({'id':id,'target':target,'label':label,'note':note,'minutes':minutes,'completed':bool(completed),
                       'costs':costs,'stamina':stamina,'destination':destination,'position':position,
                       'arrival_minute':(minute+minutes)%1440, 'reasons':reasons})
    return {'day':clock['day'],'options':result}


def travel(state, data, now):
    from .rules import require, integer, remember
    require(data.get('expected_location') == state['location'], '地点已经变化，请重新靠近并选择操作')
    require(integer(data.get('expected_day'),1,1000000000) == clock_view(state,now)['day'], '日期已经变化，请重新查看旅途安排')
    option = next((q for q in quotes(state,now)['options'] if q['target']==data.get('target') and q['id']==data.get('option')),None)
    require(option is not None,'这里没有这项旅途服务')
    require(not option['reasons'],'；'.join(option['reasons']))
    settle_clock(state,now,False)
    for key, amount in option['costs'].items(): state['inventory'][key] -= amount
    state['stamina']['current'] -= option['stamina']
    if option['stamina']: state['stamina']['updated_at'] = now
    state['world_clock']['elapsed'] += option['minutes'] * DAY_SECONDS / 1440
    d = ensure_departure(state)
    id, day = option['id'], data['expected_day']
    if id.startswith('repair_'): d['bridge_repaired'] = True
    if id == 'rope': d['rope_ready'] = True
    if id == 'book': d['booking_day'] = day
    if id in ['dock_work','inn_work','trail_work']:
        d[id+'_day'] = day
        state['inventory']['gold'] += 6 if id == 'dock_work' else 12
    if id in ['meal','camp']: state['stamina']['current'] = min(state['stamina']['max'],state['stamina']['current']+20)
    if id == 'deliver':
        d['letter_delivered'] = True
        state['inventory']['gold'] += 12
        remember(state,'letter_delivered')
    if option['destination']:
        state['location'], state['position'] = option['destination'], dict(option['position'])
        state['npc_encounter'] = None
        remember(state,'visited_'+option['destination'])
        if id in ['bridge','ferry']: remember(state,'crossed_river')
        if id == 'climb': remember(state,'crossed_mountain')
        if id == 'village' and 'slept_inn' in state['events']: remember(state,'returned_village')
    return option['label']+'。'+('已到达目的地。' if option['destination'] else '已记入这段旅程。')
