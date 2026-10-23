"""Server-authoritative ranch. Time is the existing paused, sleepable world clock.

Every mutation runs under the existing player lock/receipt transaction. Read
projections settle a copy; neither wall time nor client-supplied prices grant goods.
"""
import json
import copy
from .economy import money
import math
from pathlib import Path
from .daynight import DAY_SECONDS, clock_elapsed, clock_view, settle_clock

CATALOG = json.loads(Path(__file__).with_name('ranch_catalog.json').read_text())
ANIMALS = {a['id']: a for a in CATALOG['animals']}
SHELTERS = CATALOG['shelters']
FACILITIES = CATALOG['facilities']
PRODUCTS = CATALOG['products']
RECIPES = {r['id']: r for r in CATALOG['recipes']}
PRODUCT_CAPACITY = 3
FEED_CAPACITY = 3 * DAY_SECONDS
FEED_PRICE = 2


def ensure_ranch(state):
    state.setdefault('ranch', {'version': 1, 'buildings': {k: 0 for k in SHELTERS},
        'facilities': {}, 'animals': {}, 'next_id': 1, 'last_tick': None,
        'jobs': {}, 'mounted': None})
    for key in ['animal_feed', *PRODUCTS, *['fine_' + p for p in PRODUCTS]]:
        state['inventory'].setdefault(key, 0)
        state['storage'].setdefault(key, 0)


def grant_intro_aid(state):
    ranch = state['ranch']
    ranch.setdefault('intro_aid', {
        'coop': ranch['buildings']['coop'] == 0,
        'chicken': not any(a['species'] == 'chicken' for a in ranch['animals'].values())})

def animal_price(state, spec):
    return 0 if spec['id'] == 'chicken' and state['ranch'].get('intro_aid', {}).get('chicken') else spec['price']

def shelter_costs(state, key, level):
    return {} if key == 'coop' and level == 0 and state['ranch'].get('intro_aid', {}).get('coop') else SHELTERS[key]['costs'][level]

def stage(animal):
    spec = ANIMALS[animal['species']]
    return 1 if animal['age'] < spec['young_days'] * DAY_SECONDS else 2 if animal['age'] < (spec['young_days'] + spec['growing_days']) * DAY_SECONDS else 3


def settle_ranch(state, now, *, projected=False):
    ensure_ranch(state)
    ranch = state['ranch']
    if not ranch['animals'] and not ranch['jobs']:
        return
    # Persist only confirmed game time. A read may project the live clock on a
    # copy, but a new world view or an expired heartbeat can discard that tail.
    tick = clock_elapsed(state, now) if projected else state.get('world_clock', {}).get('elapsed', 0)
    previous = ranch['last_tick']
    dt = max(0., tick - previous) if previous is not None else 0.
    ranch['last_tick'] = tick
    for animal in ranch['animals'].values():
        spec = ANIMALS[animal['species']]
        fed = min(dt, animal['feed_seconds'])
        animal['feed_seconds'] = max(0., animal['feed_seconds'] - fed)
        adult = (spec['young_days'] + spec['growing_days']) * DAY_SECONDS
        productive = max(0., animal['age'] + fed - adult) - max(0., animal['age'] - adult)
        animal['age'] += fed
        if spec['product'] and sum(animal['products'].values()) < PRODUCT_CAPACITY:
            period = spec['period'] * DAY_SECONDS
            total = animal['progress'] + productive
            free = PRODUCT_CAPACITY - sum(animal['products'].values())
            count = min(free, int((total + 1e-7) // period))
            item = ('fine_' if animal['affection'] >= 5 else '') + spec['product']
            if count:
                animal['products'][item] = animal['products'].get(item, 0) + count
            animal['progress'] = 0. if count == free else max(0., total - count * period)
    mounted = ranch['animals'].get(ranch['mounted'])
    from .world import map_for
    outdoor = state['location'] == 'overworld' or map_for(state['location']).get('outdoor', False)
    if not mounted or mounted['feed_seconds'] <= 0 or stage(mounted) != 3 or not outdoor:
        ranch['mounted'] = None


def buy_reasons(state, spec):
    ranch = state['ranch']
    level = ranch['buildings'][spec['shelter']]
    reasons = []
    if state['skill_growth']['ranching'] < spec['level']:
        reasons.append(f'需要养殖 {spec["level"]} 级')
    if level < spec['shelter_level']:
        reasons.append(f'需要 {spec["shelter_level"]} 级{SHELTERS[spec["shelter"]]["name"]}')
    if sum(ANIMALS[a['species']]['shelter'] == spec['shelter'] for a in ranch['animals'].values()) >= SHELTERS[spec['shelter']]['capacity'][level]:
        reasons.append('住所没有空位')
    if spec.get('facility') and not ranch['facilities'].get(spec['facility']):
        reasons.append('需要建造' + FACILITIES[spec['facility']]['name'])
    if state['inventory']['gold'] < animal_price(state, spec):
        reasons.append('钱币还差 '+money(animal_price(state, spec)-state['inventory']['gold']))
    return reasons


def animal_position(state, animal_id):
    """Stable interaction anchors; cosmetic movement never changes interaction range."""
    a = state['ranch']['animals'][animal_id]
    shelter = ANIMALS[a['species']]['shelter']
    peers = [key for key, value in state['ranch']['animals'].items() if ANIMALS[value['species']]['shelter'] == shelter]
    i = peers.index(animal_id)
    return {'x': SHELTERS[shelter]['x'] - 72 + (i % 4) * 48,
            'y': 288 + (i // 4) * 56}


def ranch_objects(state):
    return [{'id': key, 'kind': 'animal', 'name': a['name'], **animal_position(state, key)}
            for key, a in state['ranch']['animals'].items() if key != state['ranch']['mounted']]


def ranch_view(state, now):
    settle_ranch(state, now, projected=True)
    ranch = state['ranch']
    tick = clock_elapsed(state, now)
    catalog = copy.deepcopy(CATALOG)
    for spec in catalog['animals']:
        spec['price'] = animal_price(state, spec)
    return {'catalog': catalog, 'feed_price': FEED_PRICE, 'day_seconds': DAY_SECONDS,
        'product_capacity': PRODUCT_CAPACITY, 'feed_capacity_days': 3,
        'speed_multiplier': 1.45 if ranch['mounted'] else 1.,
        'animals': {key: {**a, **animal_position(state, key), 'stage': stage(a),
            'grown_in': max(0., (ANIMALS[a['species']]['young_days'] + ANIMALS[a['species']]['growing_days']) * DAY_SECONDS - a['age']) / DAY_SECONDS,
            'feed_days': a['feed_seconds'] / DAY_SECONDS,
            'next_product_days': max(0., ANIMALS[a['species']]['period'] * DAY_SECONDS - a['progress']) / DAY_SECONDS,
            'ready': sum(a['products'].values())} for key, a in ranch['animals'].items()},
        'offers': {key: buy_reasons(state, spec) for key, spec in ANIMALS.items()},
        'buildings': {key: {'level': level, 'capacity': SHELTERS[key]['capacity'][level],
            'used': sum(ANIMALS[a['species']]['shelter'] == key for a in ranch['animals'].values()),
            'next_costs': shelter_costs(state, key, level) if level < 3 else None}
            for key, level in ranch['buildings'].items()},
        'jobs': {key: {**job, 'ready': tick >= job['ready_tick'],
            'remaining_days': max(0., job['ready_tick'] - tick) / DAY_SECONDS} for key, job in ranch['jobs'].items()}}


def command(state, action, data, now, require, spend):
    # A successful ranch interaction confirms the active interval before it
    # consumes feed or collects products. Rejected API commands roll back both.
    settle_clock(state, now)
    settle_ranch(state, now)
    ranch = state['ranch']
    if action in ['ranch_process','ranch_job_collect']:
        from .production import command as machine_command
        return machine_command(state, action, data, now, require, spend)
    if action == 'ranch_enter':
        require(state['location'] == 'overworld', '请从家园牧场入口进入')
        require(math.hypot(state['position']['x'] - 400, state['position']['y'] - 600) <= 72, '请先走近家园牧场入口')
        state.update(location='pasture', position={'x': 448, 'y': 480})
        return '来到向阳牧场。采购簿可订购幼崽，门前木桩可委托建造住所。'
    if action == 'ranch_exit':
        require(state['location'] == 'pasture' and math.hypot(state['position']['x'] - 448, state['position']['y'] - 496) <= 72, '请先走近牧场出口')
        state.update(location='overworld', position={'x': 400, 'y': 608})
        return '回到向阳家园。'
    if action == 'ranch_dismount':
        require(ranch['mounted'] is not None, '当前没有骑乘')
        ranch['mounted'] = None
        return '下马了，伙伴回到马厩旁休息。'
    require(state['location'] == 'pasture', '请到向阳牧场办理')
    target = data.get('target')
    require(isinstance(target, str), '请选择牧场对象')
    if target in ranch['animals']:
        anchor = animal_position(state, target)
    elif target.startswith('shelter_') and target[8:] in SHELTERS:
        anchor = SHELTERS[target[8:]]
    elif target == 'ranch_ledger':
        anchor = {'x': 448, 'y': 440}
    else:
        anchor = None
    require(anchor is not None, '牧场对象不存在')
    require(math.hypot(state['position']['x'] - anchor['x'], state['position']['y'] - anchor['y']) <= 72, '请先走近这处牧场对象')
    if action == 'ranch_build':
        key = data.get('building')
        require(isinstance(key, str) and key in SHELTERS, '请选择有效住所')
        require(target in ['ranch_ledger', 'shelter_' + key], '请到对应住所门前或采购簿办理')
        level = ranch['buildings'][key]
        require(data.get('expected_level') == level and not isinstance(data.get('expected_level'), bool), '住所等级已变化，请重新查看报价')
        require(level < 3, '住所已达到最高等级')
        spend(state, shelter_costs(state, key, level))
        if key == 'coop' and level == 0:
            ranch.get('intro_aid', {}).pop('coop', None)
        ranch['buildings'][key] += 1
        return f'{SHELTERS[key]["name"]}已完成委托建造，现为 {level + 1} 级。'
    if action == 'ranch_facility':
        key = data.get('facility')
        require(target == 'ranch_ledger' and isinstance(key, str) and key in FACILITIES, '请在采购簿选择有效设施')
        require('craft' not in FACILITIES[key], '生产设备需先学习图纸、在工坊制作，再到加工地带摆放')
        require(not ranch['facilities'].get(key), '设施已经建成')
        spend(state, FACILITIES[key]['costs'])
        ranch['facilities'][key] = True
        return FACILITIES[key]['name'] + '已建成。'
    if action == 'ranch_buy':
        key = data.get('species')
        require(target == 'ranch_ledger' and isinstance(key, str) and key in ANIMALS, '请在采购簿选择幼崽')
        spec = ANIMALS[key]
        reasons = buy_reasons(state, spec)
        require(not reasons, '；'.join(reasons))
        require(data.get('expected_next') == ranch['next_id'] and not isinstance(data.get('expected_next'), bool), '采购记录已变化，请重新确认')
        name = data.get('name', '')
        require(isinstance(name, str) and len(name.strip()) <= 12 and not any(ord(c) < 32 for c in name), '名字最多12字，不含控制字符')
        number = ranch['next_id']
        spend(state, {'gold': animal_price(state, spec)})
        if key == 'chicken':
            ranch.get('intro_aid', {}).pop('chicken', None)
        ranch['animals'][f'animal_{number}'] = {'species': key, 'name': name.strip() or spec['baby'] + str(number),
            'age': 0., 'feed_seconds': 0., 'progress': 0., 'products': {}, 'affection': 0, 'pet_day': 0}
        if ranch['last_tick'] is None:
            ranch['last_tick'] = clock_elapsed(state, now)
        ranch['next_id'] += 1
        return f'{spec["baby"]}已送到{SHELTERS[spec["shelter"]]["name"]}，请记得添饲料。'
    if action in ['ranch_feed_buy', 'ranch_feed_craft', 'ranch_feed_all']:
        require(target == 'ranch_ledger', '请在牧场采购簿办理')
        if action == 'ranch_feed_buy':
            amount = data.get('amount', 10)
            require(isinstance(amount, int) and not isinstance(amount, bool) and 1 <= amount <= 99, '饲料数量需为1–99')
            spend(state, {'gold': amount * FEED_PRICE})
            state['inventory']['animal_feed'] += amount
            return f'买入 {amount} 份饲料，花费 {money(amount * FEED_PRICE)}。'
        if action == 'ranch_feed_craft':
            item = data.get('item')
            require(item in ['wheat', 'corn'], '请选择小麦或玉米')
            amount = CATALOG['feed_recipes'][item]
            spend(state, {item: 1})
            state['inventory']['animal_feed'] += amount
            return f'加工了 {amount} 份饲料。'
        if action == 'ranch_feed_all':
            hungry = [a for a in ranch['animals'].values() if a['feed_seconds'] <= 1e-6]
            require(hungry, '伙伴都有口粮，暂时无需补喂')
            spend(state, {'animal_feed': sum(ANIMALS[a['species']]['feed'] for a in hungry)})
            for animal in hungry:
                animal['feed_seconds'] = DAY_SECONDS
            return f'为 {len(hungry)} 位缺食伙伴各添了一游戏日口粮。'
    require(target in ranch['animals'], '请选择牧场动物')
    animal = ranch['animals'][target]
    spec = ANIMALS[animal['species']]
    if action == 'ranch_feed':
        days = data.get('days', 1)
        require(isinstance(days, int) and not isinstance(days, bool) and days in [1, 3], '每次添加1日或3日口粮')
        require(animal['feed_seconds'] + days * DAY_SECONDS <= FEED_CAPACITY + 1e-6, '食槽最多存3游戏日口粮，请稍后再添')
        spend(state, {'animal_feed': days * spec['feed']})
        animal['feed_seconds'] += days * DAY_SECONDS
        return f'给{animal["name"]}添了 {days} 游戏日口粮。'
    if action == 'ranch_pet':
        day = clock_view(state, now)['day']
        require(animal['pet_day'] != day, '今天已经抚摸过了，明天再来吧')
        animal['pet_day'] = day
        animal['affection'] = min(20, animal['affection'] + 1)
        return f'{animal["name"]}亲昵地靠过来。' + ('亲密达到5后稳定产出优质产品。' if spec['product'] else '它很享受你的陪伴。')
    if action == 'ranch_collect':
        amount = sum(animal['products'].values())
        require(amount > 0, '还没有可收集的产品')
        for item, quantity in animal['products'].items():
            state['inventory'][item] += quantity
        animal['products'] = {}
        return f'收集了 {amount} 份产品，已放入行囊，可到杂货铺出售。'
    if action == 'ranch_mount':
        require(spec['id'] == 'horse' and stage(animal) == 3, '只有成年马可以骑乘')
        require(animal['feed_seconds'] > 0, '先给马添些口粮吧')
        require(ranch['mounted'] is None, '请先下马再更换伙伴')
        ranch['mounted'] = target
        return f'骑上了{animal["name"]}。户外移动速度提高45%，进入室内会自动下马。'
    require(False, '未知牧场操作')
