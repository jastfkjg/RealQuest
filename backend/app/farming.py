"""Authoritative cultivation, inside the player lock and receipt transaction."""
import json
from pathlib import Path
from .daynight import DAY_SECONDS, clock_elapsed
from .farm_land import available_cells, soil_reason
CROPS = json.loads(Path(__file__).with_name('crops.json').read_text())
BY_ID = {c['id']: c for c in CROPS}
BY_SEED = {c['seed']: c for c in CROPS}
BY_ITEM = {c['item']: c for c in CROPS}
TILL_COST = {}
ACTION_STAMINA = {'till': 4, 'plant': 2, 'water': 2, 'harvest': 1, 'reclaim': 2}

def ensure_farm(state):
    state.setdefault('farm', {'version': 1, 'tilled': [f'plot_{i}' for i in range(6)]})
    for c in CROPS:
        for item in (c['seed'], c['item']):
            state['inventory'].setdefault(item, 0)
            state['storage'].setdefault(item, 0)

def capacity(state):
    from .world import HOME_LAND
    return len({o['id'] for o in available_cells(HOME_LAND)} | set(state['farm']['tilled']))

def duration(state, crop, regrow=False):
    return crop['regrow_days' if regrow else 'days'] * DAY_SECONDS * (0.75 if state['buildings']['home'] >= 2 else 1)

def progress(state, plot, now):
    if plot.get('clock') == 'world':
        start, end, tick = plot['planted_tick'], plot['ready_tick'], clock_elapsed(state, now)
    else:
        start, end, tick = plot['planted_at'], plot['ready_at'], now
    return min(1., max(0., (tick-start)/max(1., end-start)))

def ready(state, plot, now):
    return progress(state, plot, now) >= 1

def farm_view(state, now):
    return {'capacity': capacity(state), 'till_cost': TILL_COST, 'stamina': ACTION_STAMINA,
            'clock': 'world', 'day_seconds': DAY_SECONDS,
            'growth_multiplier': .75 if state['buildings']['home'] >= 2 else 1,
            'plots': {k: {'progress': progress(state, p, now), 'ready': ready(state, p, now)} for k,p in state['plots'].items()}}

def command(state, action, data, now, obj, require, spend, recover_stamina, bump):
    ensure_farm(state)
    target, farm = obj['id'], state['farm']
    require(obj['kind'] in ['plot','soil'], '只能在家园草地或田地上操作')
    plot = state['plots'].get(target)
    crop = None
    if action == 'till':
        require(obj['kind'] == 'soil' and target not in farm['tilled'], '这里已经开垦')
        from .world import HOME_LAND
        reason=soil_reason(HOME_LAND,obj)
        require(reason is None, reason)
    else:
        require(target in farm['tilled'], '请先开垦这块土地')
        if action == 'plant':
            require(plot is None, '这里已经种了作物')
            seed = data.get('seed','seed')
            require(isinstance(seed,str) and seed in BY_SEED, '请选择有效种子')
            crop = BY_SEED[seed]
            require(state['skill_growth']['planting'] >= crop['level'], f'{crop["name"]}需要种植 {crop["level"]} 级，购买种子不会解除播种限制')
            require(state['inventory'].get(seed,0)>=1, '这种种子不足，请到杂货铺购买')
        elif action == 'harvest':
            require(plot is not None and ready(state,plot,now), '作物还没有成熟')
        elif action == 'water':
            require(plot is not None and plot.get('clock')=='world', '请选择正在生长的新作物，旧作物按原计时成熟')
            require(not ready(state,plot,now), '作物已成熟，可以收获')
            require(not plot.get('watered'), '本轮已经浇过水')
        elif action == 'reclaim':
            require(plot is None, '请先收完作物，再恢复草地')
    recover_stamina(state,now)
    cost=ACTION_STAMINA[action]
    require(state['stamina']['current']>=cost, f'体力不足，需要 {cost} 点；回家睡觉可补满')
    state['stamina']['current']-=cost
    if action=='till':
        farm['tilled'].append(target)
        return '开垦了一块田地，位置已保存。'
    if action=='reclaim':
        farm['tilled'].remove(target)
        return '田地已恢复为草地，可用锄头重新开垦。'
    tick=clock_elapsed(state,now)
    if action=='plant':
        spend(state,{crop['seed']:1})
        state['plots'][target]={'crop_id':crop['id'],'clock':'world','planted_at':now,'planted_tick':tick,'ready_tick':tick+duration(state,crop),'harvests_left':crop['harvests'],'watered':False}
        if 'first_plant' not in state['events']:state['events'].append('first_plant')
        return f'种下了{crop["name"]}。游戏时间与睡眠推进生长，离线暂停；成熟后不会枯萎。'
    if action=='water':
        plot['watered']=True
        plot['ready_tick']-=(plot['ready_tick']-plot['planted_tick'])*.1
        return '浇水完成，本轮成熟所需游戏时间缩短 10%。'
    crop=BY_ID.get(plot.get('crop_id'),BY_ID['radish'])
    state['inventory'][crop['item']]+=crop['yield'];bump(state,'harvest',crop['yield']);bump(state,'harvest_'+crop['id'],crop['yield'])
    left=plot.get('harvests_left',1)-1
    if left>0:
        plot.update(planted_tick=tick,ready_tick=tick+duration(state,crop,True),harvests_left=left,watered=False)
        return f'收获 {crop["yield"]} 份{crop["name"]}，还可采收 {left} 轮。'
    if plot.get('clock')!='world':state['inventory']['seed']+=1
    del state['plots'][target]
    return f'收获 {crop["yield"]} 份{crop["name"]}，田地可以重新播种。'
