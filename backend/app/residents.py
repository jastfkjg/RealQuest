"""Server-owned resident identities, walkable routines and bounded encounters.

The village clock is presentation/game time; economic and social limits use CST.
Route geometry is exported once with the world, never trusted from a client.
"""
from functools import lru_cache
from heapq import heappop, heappush
from math import hypot

DAY_SECONDS = 1800
START_MINUTE = 510  # A welcoming, settled 08:30 on first arrival.
SPEED = 40
LEASE_SECONDS = 90
CLOCK_LEASE_SECONDS = 10


def stop(hour, location, x, y, activity, line):
    return {'minute': hour * 60, 'location': location, 'x': x, 'y': y,
            'activity': activity, 'line': line}


RESIDENTS = {
    'lia': {
        'id': 'lia', 'name': '莉亚', 'role': '图书管理员',
        'signature': '盘辫、圆眼镜与书袋，总在寻找下一段故事。',
        'favorite': 'plank', 'liked': 'stone', 'help': '一起整理归还的书',
        'help_reply': '书脊朝外，一本挨着一本。谢谢你，这下新来的读者也能找到想看的书了。',
        'interest': '我喜欢木板的气味。旧书架要是添一层新木板，又能安放许多故事。石片上的纹路也像另一种文字。',
        'memory': '以前我不敢独自离开图书馆。后来发现，把书里见过的风景亲眼看一遍，回来的路反而更清楚了。',
        'schedule': [
            stop(0, 'library', 352, 288, '灯下读书', '最后一页读完，就把灯调暗一些。夜里也欢迎你轻轻来坐。'),
            stop(6, 'library', 144, 240, '整理借阅记录', '早晨的纸张还带着一点凉意。今天想读些什么？'),
            stop(8, 'overworld', 624, 272, '给旧书透透气', '把书拿到晨风里透透气，书页就不会闷着。你也来晒一会儿太阳吧。'),
            stop(10, 'library', 144, 240, '整理书架', '刚归还的几本旅行记还没放好。你想先听故事，还是找一本书？'),
            stop(13, 'overworld', 640, 296, '与邻居聊午后', '诺亚说林地里又有新的足迹，米拉却惦记着晚餐。村庄里的故事总比书里还多。'),
            stop(15, 'library', 352, 240, '抄写植物笔记', '这页夹着一片叶子。我想把村里的植物慢慢记全。'),
            stop(18, 'overworld', 1056, 784, '在湖边读几页', '湖面翻动的光，和书页差不多。今天就读到晚风吹来的地方。'),
            stop(20, 'library', 352, 288, '灯下读书', '你看，窗里还有灯。忙完了可以过来，我们各自读几页也很好。'),
        ],
    },
    'noah': {
        'id': 'noah', 'name': '诺亚', 'role': '森林向导',
        'signature': '灰卷发、短胡子、橄榄绿背心和随身的路途手记。',
        'favorite': 'crop', 'liked': 'wood', 'help': '一起检查路途补给',
        'help_reply': '绳结、路标、干粮，都点好了。有你搭把手，明天出门就从容多了。',
        'interest': '走远路时，我最惦记一口新鲜萝卜。结实的木材也好，坏掉的路标总要有人修。',
        'memory': '我年轻时总想着走得更远。现在记得最牢的，却是每次回来时，村口那盏等我的灯。',
        'schedule': [
            stop(0, 'guild', 152, 288, '在公会歇脚', '今天的路都走完了。坐一会儿吧，明天的事明天再说。'),
            stop(6, 'guild', 328, 288, '准备出门的行囊', '地图、绳子、手记，一样不少。出门前慢一点，总没有坏处。'),
            stop(8, 'overworld', 576, 384, '巡看河岸', '早上的河岸最清静。沿村道向东就是林地；有什么现实中的小约定，也可以交给我记着。'),
            stop(11, 'overworld', 1280, 352, '巡看林地入口', '刚检查过林地入口。别急着跑，落枝旁边常常藏着值得停下来的东西。'),
            stop(13, 'overworld', 592, 296, '与邻居聊午后', '莉亚总能给一片叶子讲出故事，米拉总能给一篮萝卜找到好去处。这里不缺有趣的人。'),
            stop(15, 'overworld', 576, 384, '修整河边路标', '路标稳一点，晚归的人就少绕一段路。你今天也走了不少路吧？'),
            stop(18, 'overworld', 1104, 784, '听湖边的晚风', '傍晚适合把脚步放慢。今天做到的事，哪怕只有一点点，也算数。'),
            stop(20, 'guild', 152, 288, '在公会歇脚', '公会的灯还亮着。你回来结算约定也好，坐下聊两句也好，我都在。'),
        ],
    },
    'mira': {
        'id': 'mira', 'name': '米拉', 'role': '杂货铺店主',
        'signature': '铜色头巾、长辫与绿围裙，把普通日子照顾得热热闹闹。',
        'favorite': 'crop', 'liked': 'wood', 'help': '一起整理店里货单',
        'help_reply': '种子、木料、今天的订单，全部理顺了。谢谢你，关心小铺的人又多了一位。',
        'interest': '我最喜欢刚从地里拔出的萝卜。木材也收，空货架添一层木香，才像在认真过日子。',
        'memory': '刚开这家店时，第一天只卖出一小袋种子。后来那位客人带着萝卜回来，我就知道，小铺会慢慢长起来。',
        'schedule': [
            stop(0, 'shop', 368, 280, '在小铺收拾一天', '账目合上了，门口的灯还留着。柜台可以照常寄售和交订单。'),
            stop(6, 'shop', 240, 188, '清点清晨的货架', '种子先放好，再看看邻居们留了什么订单。新的一天就开始了。'),
            stop(8, 'shop', 240, 188, '照看小铺', '欢迎！新鲜收获、结实木料，我都收。买卖和邻居们的订单都在柜台。'),
            stop(12, 'overworld', 688, 296, '到广场透透气', '离开柜台吹会儿风。你要是赶着卖东西，店里的寄售柜台一直能用。'),
            stop(14, 'shop', 240, 188, '为邻居整理订单', '把需要的材料放在一起，邻居来时就不用等。今天有带收获来吗？'),
            stop(18, 'guild', 328, 288, '和公会的旅人吃晚饭', '今晚的浓汤真香。吃饭时先放下账本；小铺柜台会替我接住你的收获。'),
            stop(20, 'shop', 368, 280, '在小铺收拾一天', '今天收到了不少好东西。你也忙了一天吧？慢慢来，不用赶。'),
        ],
    },
}


def ensure_clock(state, now):
    state.setdefault('world_clock', {'elapsed':0, 'updated_at':now, 'running_until':0, 'day_seconds':DAY_SECONDS})


def clock_elapsed(state, now):
    clock = state.get('world_clock', {})
    return clock.get('elapsed',0) + max(0, min(now,clock.get('running_until',0))-clock.get('updated_at',now))


def settle_clock(state, now, running=None):
    ensure_clock(state, now)
    clock = state['world_clock']
    clock['elapsed'] = clock_elapsed(state,now)
    clock['updated_at'] = now
    if running is not None:
        clock['running_until'] = now+CLOCK_LEASE_SECONDS if running else 0


def clock_view(state, now):
    total = START_MINUTE + clock_elapsed(state,now) * 1440 / DAY_SECONDS
    return {'day': int(total // 1440) + 1, 'minute': total % 1440, 'day_seconds': DAY_SECONDS}


@lru_cache(maxsize=256)
def path(location, ax, ay, bx, by):
    from .world import walkable, clear_path, map_for
    a, b = {'x': ax, 'y': ay}, {'x': bx, 'y': by}
    assert walkable(ax, ay, location) and walkable(bx, by, location), (location, a, b)
    if clear_path(a, b, location):
        return [[ax, ay], [bx, by]]
    world = map_for(location)
    cols, rows = world['width'] // 16, world['height'] // 16
    def point(k): return {'x': k[0] * 16 + 8, 'y': k[1] * 16 + 8}
    def nearest(p):
        candidates = [(x, y) for x in range(max(1, int(p['x']//16)-3), min(cols-1, int(p['x']//16)+4))
                      for y in range(max(2, int(p['y']//16)-3), min(rows-1, int(p['y']//16)+4))]
        return min((k for k in candidates if walkable(**point(k), location=location) and clear_path(p, point(k), location)),
                   key=lambda k: hypot(point(k)['x']-p['x'], point(k)['y']-p['y']))
    start, goal = nearest(a), nearest(b)
    queue, costs, parents = [(0, start)], {start: 0}, {}
    while queue:
        _, at = heappop(queue)
        if at == goal: break
        for dx, dy in [(1,0),(-1,0),(0,1),(0,-1)]:
            nxt = at[0]+dx, at[1]+dy
            if not (1 <= nxt[0] < cols-1 and 2 <= nxt[1] < rows-1): continue
            if not walkable(**point(nxt), location=location): continue
            cost = costs[at]+1
            if cost < costs.get(nxt, float('inf')):
                costs[nxt], parents[nxt] = cost, at
                heappush(queue, (cost+abs(nxt[0]-goal[0])+abs(nxt[1]-goal[1]), nxt))
    assert goal in costs, (location, start, goal)
    keys, at = [goal], goal
    while at != start:
        at = parents[at]; keys.append(at)
    points = [a]+[point(k) for k in reversed(keys)]+[b]
    packed, i = [points[0]], 0
    while i < len(points)-1:
        j = len(points)-1
        while j > i+1 and not clear_path(points[i], points[j], location): j -= 1
        packed.append(points[j]); i = j
    return [[p['x'], p['y']] for p in packed]


@lru_cache(maxsize=1)
def routine_definitions():
    from .world import OBJECTS
    doors = {o['id']: [o['x'],o['y']] for o in OBJECTS if o['kind'] == 'building'}
    definitions = []
    for resident in RESIDENTS.values():
        schedule = []
        for i, target in enumerate(resident['schedule']):
            previous = resident['schedule'][i-1]
            legs = []
            def leg(location, a, b):
                points = path(location, *a, *b)
                length = sum(hypot(q[0]-p[0],q[1]-p[1]) for p,q in zip(points,points[1:]))
                legs.append({'location':location,'points':points,'seconds':length/SPEED})
            a, b = [previous['x'],previous['y']], [target['x'],target['y']]
            if previous['location'] == target['location']:
                leg(target['location'], a, b)
            else:
                outdoor_a, outdoor_b = a, b
                if previous['location'] != 'overworld':
                    leg(previous['location'], a, [240,328]); outdoor_a = doors[previous['location']]
                if target['location'] != 'overworld': outdoor_b = doors[target['location']]
                leg('overworld', outdoor_a, outdoor_b)
                if target['location'] != 'overworld': leg(target['location'], [240,328], b)
            schedule.append({k:v for k,v in target.items() if k != 'line'} | {'legs':legs})
        definitions.append({k:v for k,v in resident.items() if k not in ['schedule','help_reply','interest','memory']} | {'schedule':schedule})
    return definitions


def resident_position(state, npc_id, now, use_encounter=True):
    definition = next(r for r in routine_definitions() if r['id'] == npc_id)
    minute = resident_minute(state, npc_id, now)
    phase = next(p for p in reversed(definition['schedule']) if p['minute'] <= minute)
    passed = (minute-phase['minute']) * DAY_SECONDS/1440
    lease = state.get('npc_encounter')
    if use_encounter and lease and lease['id'] == npc_id and lease['until'] > now:
        return {'id':npc_id,'kind':'npc','name':definition['name'],'location':lease['location'],
                'x':lease['x'],'y':lease['y'],'activity':'正在和你聊天','walking':False,'phase':phase['minute']}
    for leg in phase['legs']:
        if passed >= leg['seconds']:
            passed -= leg['seconds']; continue
        distance = passed*SPEED
        for a,b in zip(leg['points'],leg['points'][1:]):
            length = hypot(b[0]-a[0],b[1]-a[1])
            if distance <= length and length:
                return {'id':npc_id,'kind':'npc','name':definition['name'],'location':leg['location'],
                        'x':a[0]+(b[0]-a[0])*distance/length,'y':a[1]+(b[1]-a[1])*distance/length,
                        'activity':'前往'+phase['activity'],'walking':True,'phase':phase['minute']}
            distance -= length
    return {'id':npc_id,'kind':'npc','name':definition['name'],'location':phase['location'],
            'x':phase['x'],'y':phase['y'],'activity':phase['activity'],'walking':False,'phase':phase['minute']}


def resident_objects(state, now, location):
    return [p for id in RESIDENTS if (p := resident_position(state, id, now))['location'] == location]


def near_resident(state, npc_id, now):
    p = resident_position(state, npc_id, now)
    return state['location'] == p['location'] and hypot(state['position']['x']-p['x'],state['position']['y']-p['y']) <= 72


def greeting(state, npc_id, now):
    resident = RESIDENTS[npc_id]
    minute = resident_minute(state, npc_id, now)
    phase = next(p for p in reversed(resident['schedule']) if p['minute'] <= minute)
    if resident_position(state, npc_id, now)['walking']:
        return '我正要去'+phase['activity']+'。不急，站下来聊两句也很好。'
    return phase['line']


def social_view(state, today):
    return {id: {'greeted':state['npc_days'].get(id)==today,
                 'gifted':state.get('npc_gifts',{}).get(id)==today,
                 'helped':state.get('npc_helped',{}).get(id)==today,
                 'memory_unlocked':state['relationships'].get(id,0)>=5}
            for id in RESIDENTS}


def resident_minute(state, npc_id, now):
    return clock_view(state, now)['minute']


def release_encounter(state, now):
    state['npc_encounter'] = None
