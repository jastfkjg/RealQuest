"""Player-made, individually placed production devices; legacy jobs migrate once."""
import math
from .ranching import FACILITIES, RECIPES
from .daynight import DAY_SECONDS, clock_elapsed

MACHINES = {key: spec for key, spec in FACILITIES.items() if 'craft' in spec}
CRAFTS = {spec['craft']['item']: {'name': spec['name'], 'kind': 'facility', 'facility': key,
          'level': spec['craft']['level'], 'costs': spec['craft']['costs']} for key, spec in MACHINES.items()}
CELLS = [(x, 480) for start in [96, 528] for x in range(start, start+289, 48)]


def machine_rect(machine):
    return [machine['x']-22, machine['y']-36, 44, 36]


def machine_objects(state):
    return [{'id': key, 'kind': 'production', 'name': MACHINES[m['facility']]['name'],
             'x': m['x'], 'y': m['y'], 'hitbox': machine_rect(m)}
            for key, m in state.get('construction', {}).get('machines', {}).items()]


def placement_reason(state, x, y, moving=None):
    if any(isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) for v in [x, y]):
        return '请选择有效位置'
    if (x, y) not in CELLS:
        return '请选择牧场加工地带的格位，入口与动物活动区需留空'
    rect = machine_rect({'x': x, 'y': y})
    for key, machine in state['construction']['machines'].items():
        if key != moving:
            if abs(x-machine['x']) < 48 and abs(y-machine['y']) < 44:
                return '这里已经摆放了一台设备'
    if state['location'] == 'pasture':
        px, py = state['position']['x'], state['position']['y']
        if rect[0]-10 < px < rect[0]+rect[2]+10 and rect[1]-8 < py < rect[1]+rect[3]+8:
            return '请先离开这个位置'
    return ''


def ensure_production(state):
    c, ranch = state['construction'], state['ranch']
    c.setdefault('machines', {})
    if c.get('production_version') != 1:
        preferred = {'mayo':144, 'loom':240, 'cheese':624, 'oil':720}
        for facility in MACHINES:
            if ranch['facilities'].get(facility) or facility in ranch['jobs']:
                key = 'legacy_machine_' + facility
                x, y = next((p for p in [(preferred[facility],480), *CELLS] if not placement_reason(state, *p)), CELLS[0])
                c['machines'].setdefault(key, {'facility':facility, 'x':x, 'y':y, 'version':0})
                if facility in ranch['jobs']:
                    ranch['jobs'][key] = ranch['jobs'].pop(facility)
        c['production_version'] = 1
    for facility in MACHINES:
        ranch['facilities'][facility] = any(m['facility'] == facility for m in c['machines'].values())


def command(state, action, data, now, require, spend):
    c, ranch = state['construction'], state['ranch']
    require(state['location'] == 'pasture', '请到牧场加工地带操作设备')
    if action == 'construction_machine_place':
        require(data.get('target') == 'ranch_ledger' and math.hypot(state['position']['x']-448, state['position']['y']-440) <= 72, '请走近牧场采购簿整理加工地带')
        item = data.get('recipe')
        require(isinstance(item,str) and item in CRAFTS, '请选择背包中的生产设备')
        reason = placement_reason(state, data.get('x'), data.get('y'))
        require(not reason, reason)
        spend(state, {item:1})
        key = 'machine_' + str(c['next_id']);c['next_id'] += 1
        c['machines'][key] = {'facility':CRAFTS[item]['facility'], 'x':data['x'], 'y':data['y'], 'version':0}
        ensure_production(state)
        return '设备已摆好，走近后可以投料加工。'
    target = data.get('target')
    machine = c['machines'].get(target) if isinstance(target,str) else None
    require(machine is not None, '请选择已摆放的生产设备')
    require(math.hypot(state['position']['x']-machine['x'], state['position']['y']-machine['y']) <= 72, '请先走近这台设备')
    require(type(data.get('expected_version')) is int and data['expected_version'] == machine['version'], '设备状态已变化，请重新查看')
    job = ranch['jobs'].get(target)
    if action in ['construction_machine_move', 'construction_machine_pack']:
        require(job is None, '请先完成加工并收取成品，再移动或收回设备')
        if action == 'construction_machine_move':
            reason = placement_reason(state, data.get('x'), data.get('y'), target)
            require(not reason, reason)
            machine.update(x=data['x'], y=data['y'])
            machine['version'] += 1
            return '设备已移动。'
        item = MACHINES[machine['facility']]['craft']['item']
        state['inventory'][item] = state['inventory'].get(item,0)+1
        del c['machines'][target]
        ensure_production(state)
        return '设备已收回背包，可以重新摆放。'
    if action == 'ranch_job_collect':
        require(data.get('facility') == target, '请在对应设备收取成品')
        require(job is not None, '没有这项加工')
        require(clock_elapsed(state, now) >= job['ready_tick'], '加工尚未完成')
        state['inventory'][job['output']] = state['inventory'].get(job['output'],0)+1
        del ranch['jobs'][target]
        machine['version'] += 1
        return '已取出加工成品。'
    require(action == 'ranch_process', '未知设备操作')
    recipe_id = data.get('recipe')
    require(isinstance(recipe_id,str) and recipe_id in RECIPES, '请选择有效加工配方')
    recipe = RECIPES[recipe_id]
    require(recipe['facility'] == machine['facility'], '这台设备不能加工这种物品')
    require(job is None, '这台设备已有加工，请先取出成品')
    fine = data.get('fine',False)
    require(type(fine) is bool, '请选择有效品质')
    source = ('fine_' if fine else '') + recipe['input']
    spend(state, {source:1})
    ranch['jobs'][target] = {'recipe':recipe_id, 'output':('fine_' if fine else '')+recipe['output'],
                            'ready_tick':clock_elapsed(state, now)+recipe['days']*DAY_SECONDS}
    machine['version'] += 1
    return MACHINES[machine['facility']]['name']+'开始加工，游戏时间和睡眠推进。'
