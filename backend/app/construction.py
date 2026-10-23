"""Portable containers and carpenter contracts. Mutations run in the command transaction."""
import math
from .daynight import clock_elapsed, DAY_SECONDS

RECIPES = {
    'wooden_chest': {'name': '木箱', 'level': 0, 'slots': 12, 'costs': {'plank': 3, 'wood': 2}},
    'reinforced_chest': {'name': '加固木箱', 'level': 2, 'slots': 24, 'costs': {'plank': 6, 'stone': 4}},
}
CARPENTER = {'id': 'carpenter', 'kind': 'carpenter', 'name': '阿榆 · 木匠', 'x': 96, 'y': 288}


def ensure_construction(state):
    state.setdefault('construction', {'blueprints': [], 'chests': {}, 'next_id': 1, 'job': None, 'completed': []})


def chest_rect(chest):
    return [chest['x'] - 20, chest['y'] - 20, 40, 28]


def chest_objects(state):
    return [{'id': key, 'kind': 'storage', 'name': c['name'], 'x': c['x'], 'y': c['y'],
             'hitbox': chest_rect(c)} for key, c in state.get('construction', {}).get('chests', {}).items()]


def settle_construction(state, now):
    ensure_construction(state)
    c = state['construction']
    job = c['job']
    if job and clock_elapsed(state, now) >= job['ready_tick']:
        if job['building'] == 'home':
            state['buildings']['home'] = max(state['buildings']['home'], job['level'])
        else:
            state['ranch']['buildings'][job['building']] = max(state['ranch']['buildings'][job['building']], job['level'])
        c['completed'].append(job)
        c['job'] = None


def projects(state):
    from .ranching import SHELTERS, shelter_costs
    from .economy import upgrade_costs
    entries = {'home': {'name': '小屋修缮', 'level': state['buildings']['home'], 'costs': upgrade_costs(min(2, state['buildings']['home']))}}
    for key, spec in SHELTERS.items():
        level = state['ranch']['buildings'][key]
        entries[key] = {'name': spec['name'], 'level': level, 'costs': shelter_costs(state, key, min(level, 2))}
    for spec in entries.values():
        spec['days'] = 1
        spec['max_level'] = 3
    return entries


def placement_reason(state, x, y, moving=None):
    from .world import INTERIORS
    if any(isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) for v in [x, y]):
        return '请选择有效位置'
    if x % 48 != 0 or y % 48 != 0 or not (48 <= x <= 432 and 48 <= y <= 288):
        return '请选择屋内地板上的格位'
    rect = [x - 20, y - 20, 40, 28]
    overlap = lambda a, b: a[0] < b[0]+b[2]+8 and a[0]+a[2]+8 > b[0] and a[1] < b[1]+b[3]+8 and a[1]+a[3]+8 > b[1]
    occupied = INTERIORS['home']['obstacles'] + [chest_rect(c) for key, c in state['construction']['chests'].items() if key != moving]
    # Reserve the door, morning arrival and interaction anchors, including approach space.
    reserved = [[208, 280, 64, 72], [268, 132, 40, 40]] + [[o['x']-24, o['y']-24, 48, 48] for o in INTERIORS['home']['objects']]
    if any(overlap(rect, r) for r in occupied + reserved):
        return '这里有家具、门口或需要保留的通路'
    px, py = state['position']['x'], state['position']['y']
    if rect[0]-10 < px < rect[0]+rect[2]+10 and rect[1]-8 < py < rect[1]+rect[3]+8:
        return '请先离开这个位置'
    # Every floor tile that was reachable must remain reachable after placement.
    def flood(obstacles):
        points = {(xx, yy) for xx in range(32, 449, 16) for yy in range(48, 337, 16)
                  if not any(rx-10 < xx < rx+w+10 and ry-8 < yy < ry+h+8 for rx, ry, w, h in obstacles)}
        start = (240, 320)
        seen, todo = {start}, [start]
        while todo:
            xx, yy = todo.pop()
            for p in [(xx+16, yy), (xx-16, yy), (xx, yy+16), (xx, yy-16)]:
                if p in points and p not in seen:
                    seen.add(p); todo.append(p)
        return seen, points
    before, _ = flood(occupied)
    after, free = flood(occupied + [rect])
    if not (before & free) <= after:
        return '摆在这里会堵住通路'
    return ''


def construction_view(state, now, moving=None):
    ensure_construction(state)
    return {'recipes': RECIPES, 'projects': projects(state),
            'remaining_days': max(0, (state['construction']['job']['ready_tick']-clock_elapsed(state, now))/DAY_SECONDS) if state['construction']['job'] else 0,
            'cells': [{'x': x, 'y': y, 'reason': placement_reason(state, x, y, moving)} for y in range(48, 289, 48) for x in range(48, 433, 48)]}


def command(state, action, data, now, require, spend):
    c = state['construction']
    target = data.get('target')
    near = lambda x, y: math.hypot(state['position']['x']-x, state['position']['y']-y) <= 72
    if action in ['construction_learn', 'construction_order']:
        require(state['location'] == 'workshop' and target == 'carpenter' and near(96, 288), '请走近工坊里的木匠阿榆')
        if action == 'construction_learn':
            recipe = data.get('recipe')
            require(isinstance(recipe, str) and recipe in RECIPES, '请选择有效图纸')
            require(recipe not in c['blueprints'], '已经学会这张图纸')
            c['blueprints'].append(recipe)
            return '阿榆教会了你：' + RECIPES[recipe]['name'] + '图纸，可到工坊柜台制作。'
        building = data.get('building')
        require(isinstance(building, str) and building in projects(state), '请选择有效工程')
        spec = projects(state)[building]
        require(c['job'] is None, '阿榆正在施工，请等这项工程完工')
        require(type(data.get('expected_level')) is int and data['expected_level'] == spec['level'], '建筑等级已变化，请重新查看报价')
        require(spec['level'] < spec['max_level'], '建筑已达到当前最高等级')
        spend(state, spec['costs'])
        if building == 'coop':
            state['ranch'].get('intro_aid', {}).pop('coop', None)
        c['job'] = {'building': building, 'name': spec['name'], 'level': spec['level']+1,
                    'ready_tick': (math.floor(clock_elapsed(state, now)/DAY_SECONDS)+1)*DAY_SECONDS, 'costs': dict(spec['costs'])}
        return '阿榆接下了' + spec['name'] + '工程，1游戏日后完工；可以回家睡觉推进。'
    if action == 'construction_craft':
        require(state['location'] == 'workshop' and target == 'workshop_counter' and near(240, 196), '请走近工坊工作台')
        recipe = data.get('recipe')
        require(isinstance(recipe, str) and recipe in RECIPES, '请选择有效图纸')
        require(recipe in c['blueprints'], '先找木匠学习图纸')
        spec = RECIPES[recipe]
        require(state['skill_growth']['building'] >= spec['level'], '需要建造' + str(spec['level']) + '级')
        spend(state, spec['costs'])
        state['inventory'][recipe] = state['inventory'].get(recipe, 0)+1
        return '制作完成：' + spec['name'] + '。回家在家园手册中摆放。'
    key = data.get('chest')
    chest = c['chests'].get(key) if isinstance(key, str) else None
    require(state['location'] == 'home', '请回到小屋里整理木箱')
    if action == 'construction_place':
        require(len(c['chests']) < 20, '小屋最多摆放20只木箱')
        recipe = data.get('recipe')
        require(isinstance(recipe, str) and recipe in RECIPES, '请选择背包里的木箱')
        reason = placement_reason(state, data.get('x'), data.get('y'))
        require(not reason, reason)
        spend(state, {recipe: 1})
        key = 'player_chest_' + str(c['next_id'])
        c['next_id'] += 1
        c['chests'][key] = {'recipe': recipe, 'name': RECIPES[recipe]['name'], 'x': data['x'], 'y': data['y'], 'items': {}, 'version': 0}
        return '木箱已摆好，走近后可以存取物品。'
    require(chest is not None and target == key, '请选择已有的木箱')
    require(near(chest['x'], chest['y']), '请先走近这只木箱')
    require(type(data.get('expected_version')) is int and data['expected_version'] == chest['version'], '木箱已变化，请重新查看')
    if action == 'construction_move':
        reason = placement_reason(state, data.get('x'), data.get('y'), key)
        require(not reason, reason)
        chest.update(x=data['x'], y=data['y'])
        message = '木箱已移动，箱内物品完整保留。'
    elif action == 'construction_rename':
        name = data.get('name')
        require(isinstance(name, str) and 1 <= len(name.strip()) <= 12 and not any(ord(ch)<32 for ch in name), '箱名需为1–12字，不含控制字符')
        chest['name'] = name.strip()
        message = '木箱已改名。'
    else:
        require(action == 'construction_transfer', '未知木箱操作')
        item, direction, amount = data.get('item'), data.get('direction'), data.get('amount', 1)
        from .equipment import remove_missing
        require(isinstance(item, str) and item != 'gold' and (item in state['inventory'] or item in chest['items']), '请选择可存放的物品，钱币留在钱袋里')
        require(direction in ['store', 'withdraw'], '请选择存入或取回')
        require(type(amount) is int and 1 <= amount <= 9999, '数量需为1–9999的整数')
        require(not state['village_combat']['cast'], '动作结束后再存取装备')
        source, dest = (state['inventory'], chest['items']) if direction == 'store' else (chest['items'], state['inventory'])
        require(source.get(item, 0) >= amount, '物品数量不足')
        if direction == 'store':
            require(item in dest and dest[item] > 0 or sum(v > 0 for v in dest.values()) < RECIPES[chest['recipe']]['slots'], '箱子已满，请取出一种物品腾出格位')
            require(dest.get(item, 0)+amount <= 9999, '每格最多存放9999份')
        source[item] -= amount
        dest[item] = dest.get(item, 0)+amount
        remove_missing(state)
        message = '物品已存入木箱。' if direction == 'store' else '物品已取回背包。'
    chest['version'] += 1
    return message
