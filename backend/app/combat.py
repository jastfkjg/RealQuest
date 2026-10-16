"""Village combat v1. Inputs are intentions, never client-authored damage/time/rewards."""
import math
import uuid
from collections import deque
from .daynight import clock_view, DAY_SECONDS

WEAPONS = {
    'stone_sword': dict(name='石刃短剑', price=24, damage=8, interval=.65, reach=28, stamina=1, magic=False,
                        science=1, magic_level=1, either=True, costs={'plank': 2, 'stone': 2}),
    'reinforced_sword': dict(name='加固短剑', price=96, damage=12, interval=.65, reach=32, stamina=1, magic=False,
                        science=1, magic_level=1, either=True, costs={'plank': 3, 'stone': 4, 'shell': 2, 'gold': 8}),
    'spring_spear': dict(name='弹簧长矛', price=120, damage=13, interval=.85, reach=48, stamina=2, magic=False,
                        science=1, magic_level=0, either=False, costs={'plank': 3, 'stone': 4, 'shell': 2, 'gold': 10}),
    'glow_staff': dict(name='微光短杖', price=120, damage=10, interval=.85, reach=112, stamina=2, magic=True,
                        science=0, magic_level=2, either=False, costs={'plank': 3, 'stone': 3, 'crystal': 2, 'gel': 2, 'gold': 10}),
}
ENEMIES = {
    'slime': dict(name='苔团', max_hp=18, armor=0, damage=5, windup=.9, interval=2.4, speed=96, loot='gel', gold=2),
    'bat': dict(name='洞穴蝠', max_hp=14, armor=0, damage=4, windup=.7, interval=2., speed=130, loot='crystal', gold=3),
    'beetle': dict(name='石壳虫', max_hp=30, armor=2, damage=8, windup=1.1, interval=3., speed=80, loot='shell', gold=4),
    'boss': dict(name='石壳守卫', max_hp=160, armor=2, damage=12, windup=1.2, interval=4.8, speed=96, loot='crystal', gold=8),
}
FLOORS = {1: ['slime']*3, 2: ['slime', 'bat', 'slime', 'bat'],
          3: ['beetle', 'slime', 'beetle'], 4: ['bat', 'beetle', 'slime', 'bat', 'beetle'], 5: ['boss']}
SPAWNS = [(240, 344), (408, 240), (512, 144), (256, 208), (480, 352)]
MATERIAL_NAMES = {'plank':'木板','stone':'石料','shell':'硬壳','gel':'黏液胶质','crystal':'微光晶屑','gold':'金币'}
ITEMS = [*WEAPONS, 'gel', 'shell', 'crystal', 'gate_stone', 'soup']
SELL = {'gel': 1, 'shell': 2, 'crystal': 3, **{k: w['price']//4 for k,w in WEAPONS.items()}}


def is_cave(state):
    return state.get('location', '').startswith('cave_')


def ensure_combat(state):
    if 'village_combat' not in state:
        dep = state.get('departure', {})
        legacy = (state.get('location') in ['crossing', 'mountain', 'city', 'inn'] or
                  any('visited_'+p in state.get('events', []) for p in ['crossing','mountain','city','inn']) or
                  bool(dep.get('bridge_repaired') or dep.get('rope_ready') or dep.get('letter_delivered')))
        state['village_combat'] = {'version': 1, 'gate_open': legacy, 'legacy_passage': legacy,
            'equipped': None, 'spark_learned': False, 'boss_first': False, 'boss_reward_day': 0,
            'unlocked': 1, 'day': 0, 'floors': {}, 'time': 0., 'last_tick': 0., 'attack_at': 0.,
            'spark_at': 0., 'hurt_until': 0., 'soup_at': 0., 'soups_used': 0, 'cast': None,
            'effects': [], 'projectiles': [], 'message': '', 'moves': 0, 'encounter': '', 'input_seq': 0}
    for item in ITEMS:
        state['inventory'].setdefault(item, 0)
    for item in [*WEAPONS, 'gel', 'shell', 'crystal', 'soup']:
        state.get('storage', {}).setdefault(item, 0)
    return state['village_combat']


def reset_day(state, now):
    c = ensure_combat(state)
    day = clock_view(state, now)['day']
    if c['day'] != day:
        c.update(day=day, floors={}, last_tick=0., cast=None, effects=[], projectiles=[], soups_used=0)
    return c


def floor_enemies(state, now):
    c = reset_day(state, now)
    if not is_cave(state):
        return []
    floor = int(state['location'][5:])
    if str(floor) not in c['floors']:
        c['floors'][str(floor)] = []
        for i, kind in enumerate(FLOORS[floor]):
            x, y = (400, 224) if kind == 'boss' else SPAWNS[i]
            hp = 0 if kind == 'boss' and c['boss_reward_day'] == c['day'] else ENEMIES[kind]['max_hp']
            c['floors'][str(floor)].append(dict(id=f'{floor}-{i}', kind=kind, x=x, y=y, hp=hp,
                phase='idle', until=0., ready=0., tx=x, ty=y, move=0))
    return c['floors'][str(floor)]


def craft_reasons(state, weapon):
    reasons = []
    if state['skill_growth']['building'] < 1:
        reasons.append('需要建造1级')
    science = state['knowledge_growth']['science'] >= weapon['science'] if weapon['science'] else False
    magic = state['knowledge_growth']['magic'] >= weapon['magic_level'] if weapon['magic_level'] else False
    if not ((science or magic) if weapon['either'] else (science if weapon['science'] else magic)):
        reasons.append('需要'+(f'科学{weapon["science"]}或魔法{weapon["magic_level"]}级' if weapon['either'] else
                              f'科学{weapon["science"]}级' if weapon['science'] else f'魔法{weapon["magic_level"]}级'))
    for item, amount in weapon['costs'].items():
        if state['inventory'].get(item, 0) < amount:
            reasons.append(f'{MATERIAL_NAMES.get(item,item)}还差{amount-state["inventory"].get(item, 0)}')
    return reasons


def combat_view(state, now):
    c = ensure_combat(state)
    enemies = floor_enemies(state, now)
    return {'weapons': {key: {**value, 'craft_reasons': craft_reasons(state, value)} for key,value in WEAPONS.items()},
        'enemies': [{**ENEMIES[e['kind']], **e} for e in enemies],
        'floor': int(state['location'][5:]) if is_cave(state) else 0,
        'time': c['time'], 'effects': c['effects'], 'projectiles': c.get('projectiles', []), 'cast': c['cast'],
        'message': c['message'], 'cleared': bool(enemies) and all(e['hp'] <= 0 for e in enemies),
        'unlocked': c['unlocked'], 'equipped': c['equipped'], 'gate_open': c['gate_open'],
        'legacy_passage': c['legacy_passage'], 'boss_first': c['boss_first'], 'spark_learned': c['spark_learned'],
        'soups_used': c['soups_used'], 'attack_at': c['attack_at'], 'spark_at': c['spark_at'], 'soup_at': c['soup_at'],
        'encounter': c.get('encounter',''), 'input_seq': c.get('input_seq',0)}


def near_service(state, target, places):
    from .world import map_for
    from .rules import require
    require(state['location'] in places, '请走近相应的村庄柜台')
    obj = next((o for o in map_for(state['location'])['objects'] if o['id'] == target), None)
    require(obj is not None and math.hypot(state['position']['x']-obj['x'], state['position']['y']-obj['y']) <= 72,
            '请先走近柜台或路标')


def equip_owned(state, item):
    from .rules import require
    require(isinstance(item,str) and item in WEAPONS and state['inventory'].get(item, 0) > 0, '尚未持有这件武器')
    c = state['village_combat']
    require(not c['cast'], '动作结束后再切换武器')
    c['equipped'] = item


def defeated(state, enemy):
    if enemy.get('rewarded'):
        return
    enemy['rewarded'] = True
    c = state['village_combat']
    definition = ENEMIES[enemy['kind']]
    if enemy['kind'] == 'boss':
        if c['boss_reward_day'] == c['day']:
            return
        c['boss_reward_day'] = c['day']
        first = not c['boss_first']
        c['boss_first'] = True
        c['projectiles'] = []
        state['inventory']['gold'] += 30 if first else 8
        state['inventory']['crystal'] += 3 if first else 1
        if first:
            state['inventory']['gate_stone'] += 1
        c['message'] = '石壳守卫已击败 · '+('门钥魔法石 +1 · 金币 +30 · 晶屑 +3' if first else '金币 +8 · 晶屑 +1')
    else:
        state['inventory'][definition['loot']] += 1
        state['inventory']['gold'] += definition['gold']
        c['message'] = f'{definition["name"]}已击败 · {MATERIAL_NAMES[definition["loot"]]} +1 · 金币 +{definition["gold"]}'
    enemies = c['floors'][state['location'][5:]]
    if all(e['hp'] <= 0 for e in enemies):
        floor = int(state['location'][5:])
        c['unlocked'] = max(c['unlocked'], min(5, floor+1))


def attack_hit(state, cast):
    c = state['village_combat']
    p = state['position']
    if p['x'] < 166:
        return
    enemies = [e for e in c['floors'].get(state['location'][5:], []) if e['hp'] > 0]
    # Aim is an intention. Server validates distance, angle and line of sight.
    candidates = []
    from .world import clear_path
    for enemy in enemies:
        dx, dy = enemy['x']-p['x'], enemy['y']-p['y']
        distance = math.hypot(dx, dy)
        direction = math.atan2(dy, dx)
        angle = abs(math.atan2(math.sin(direction-cast['angle']), math.cos(direction-cast['angle'])))
        if distance <= cast['reach'] + (20 if enemy['kind']=='boss' else 10) and angle <= (.35 if cast['magic'] else .85) and clear_path(p, enemy, state['location']):
            candidates.append((distance, enemy))
    if candidates:
        enemy = min(candidates, key=lambda row: row[0])[1]
        damage = max(1, cast['damage']-(0 if cast['magic'] else ENEMIES[enemy['kind']]['armor']))
        enemy['hp'] = max(0, enemy['hp']-damage)
        c['effects'].append(dict(x=enemy['x'], y=enemy['y'], text=f'−{damage}', until=c['time']+.65, kind='hit'))
        if enemy['hp'] == 0:
            defeated(state, enemy)


def retreat(state, now, defeat=False):
    c = state['village_combat']
    boss = c['floors'].get('5', [])
    if boss and boss[0]['hp'] > 0:
        c['floors'].pop('5', None)
    c.update(last_tick=0., cast=None, effects=[], projectiles=[], soups_used=0)
    state['location'], state['position'] = 'overworld', {'x':304,'y':1180}
    if defeat:
        state['vitality']['current'] = math.ceil(state['vitality']['max']*.3)
    c['message'] = '已回到洞口，通路与已获材料保留。'+('生命恢复至30%，回家休整后可再挑战。' if defeat else 'Boss未击败时会恢复。')
    return c['message']


def pursuit_target(enemy, player, location, time):
    """Route around authored pillars instead of spending an encounter against a wall."""
    from .world import clear_path, walkable
    if clear_path(enemy, player, location):
        enemy['path'] = []
        return player
    if time >= enemy.get('repath_at', 0):
        size = 16
        start = (int(enemy['x']//size), int(enemy['y']//size))
        goal = (int(player['x']//size), int(player['y']//size))
        queue = deque([start]); parents = {start: None}
        while queue:
            node = queue.popleft()
            if node == goal:
                break
            for dx, dy in [(1,0),(-1,0),(0,1),(0,-1)]:
                other = (node[0]+dx,node[1]+dy)
                x,y = other[0]*size+8,other[1]*size+8
                if other not in parents and x>=166 and walkable(x,y,location):
                    parents[other] = node; queue.append(other)
        path = []
        if goal in parents:
            node = goal
            while parents[node] is not None:
                path.insert(0, {'x':node[0]*size+8,'y':node[1]*size+8})
                node = parents[node]
        enemy['path'] = path
        enemy['repath_at'] = time+.6
    path = enemy.get('path', [])
    while path and math.hypot(enemy['x']-path[0]['x'],enemy['y']-path[0]['y'])<5:
        path.pop(0)
    return path[0] if path else enemy


def step_enemies(state, dt):
    from .world import walkable, clear_path
    c = state['village_combat']; t = c['time']; p = state['position']
    enemies = c['floors'].get(state['location'][5:], [])
    active = [e for e in enemies if e['hp'] > 0 and e['phase'] != 'idle']
    for e in enemies:
        if e['hp'] <= 0:
            continue
        d = ENEMIES[e['kind']]; boss = e['kind']=='boss'
        distance = math.hypot(e['x']-p['x'], e['y']-p['y'])
        if e['phase']=='idle':
            if p['x'] >= 166 and (distance < (260 if boss else 150)) and len(active) < (1 if boss else 2):
                e['phase'] = 'pursue'; active.append(e)
            else:
                continue
        if p['x'] < 144:
            if boss:
                e['hp'] = d['max_hp']
                c['soups_used'] = 0
                c['projectiles'] = []
            e['phase'] = 'idle'
            continue
        if e['phase']=='windup':
            if t >= e['until']:
                tx,ty=e['tx'],e['ty']; hit=False
                if e.get('style')=='shot':
                    base=math.atan2(ty-e['y'],tx-e['x'])
                    for offset in [-.22,0,.22]:
                        c.setdefault('projectiles',[]).append(dict(x=e['x'],y=e['y'],angle=base+offset,
                            until=t+3,wave=f'{e["id"]}-{e["move"]}'))
                    damage=6
                elif e['kind']=='bat':
                    length=math.hypot(tx-e['x'],ty-e['y']) or 1
                    e.update(phase='dash',until=t+.32,vx=(tx-e['x'])/length*192,vy=(ty-e['y'])/length*192,dash_hit=False)
                    continue
                elif boss and e.get('style')=='sweep':
                    base=math.atan2(ty-e['y'],tx-e['x']);a=math.atan2(p['y']-e['y'],p['x']-e['x'])
                    hit=distance<60 and abs(math.atan2(math.sin(a-base),math.cos(a-base)))<=math.pi/3
                    damage=8
                else:
                    hit=math.hypot(p['x']-tx,p['y']-ty)<(40 if boss else 26)
                    damage=8 if boss and e.get('style')=='sweep' else d['damage']
                if hit and t>=c['hurt_until']:
                    state['vitality']['current']=max(0,state['vitality']['current']-damage)
                    c['hurt_until']=t+.8
                    c['effects'].append(dict(x=p['x'],y=p['y'],text=f'−{damage}',until=t+.65,kind='hurt'))
                e['phase']='recover'; e['until']=t+(1.2 if e.get('style')=='sweep' else 1.6 if boss else .7)
            continue
        if e['phase']=='dash':
            nx=e['x']+e['vx']*dt;ny=e['y']+e['vy']*dt
            if nx>=166 and walkable(nx,ny,state['location']):e['x'],e['y']=nx,ny
            if not e['dash_hit'] and math.hypot(p['x']-e['x'],p['y']-e['y'])<24 and t>=c['hurt_until']:
                state['vitality']['current']=max(0,state['vitality']['current']-4)
                c['hurt_until']=t+.8;e['dash_hit']=True
                c['effects'].append(dict(x=p['x'],y=p['y'],text='−4',until=t+.65,kind='hurt'))
            if t>=e['until']:e.update(phase='recover',until=t+.7)
            continue
        if e['phase']=='recover':
            if t>=e['until']: e['phase']='pursue'
            continue
        if distance < (105 if e['kind']=='bat' else 78 if boss else 42) and t>=e['ready'] and clear_path(e,p,state['location']):
            e['move']+=1
            style='shot' if boss and e['hp']<=80 and e['move']%3==0 else 'sweep' if boss and e['move']%2==0 else 'slam'
            windup=1. if style=='shot' else .9 if style=='sweep' else d['windup']
            e.update(phase='windup',until=t+windup,ready=t+d['interval'],tx=p['x'],ty=p['y'],style=style)
        else:
            target_point=pursuit_target(e,p,state['location'],t)
            speed=d['speed']*dt/max(math.hypot(target_point['x']-e['x'],target_point['y']-e['y']),1)
            for axis in ['x','y']:
                target=e[axis]+(target_point[axis]-e[axis])*min(speed,1)
                point={**e,axis:target}
                if point['x']>=166 and walkable(point['x'],point['y'],state['location']): e[axis]=target


def tick(state, data, now):
    from .rules import require, recover_stamina
    from .world import walkable
    c = reset_day(state, now)
    require(is_cave(state) and data.get('location') == state['location'], '战斗地点已改变，请重新进入')
    require(data.get('encounter') == c.get('encounter') and bool(c.get('encounter')), '这次洞穴探索已经结束，请更新画面')
    seq = data.get('seq')
    require(isinstance(seq,int) and not isinstance(seq,bool) and seq == c.get('input_seq',0)+1, '战斗输入已更新，请等待同步')
    clock=state['world_clock']
    require(data.get('owner') == clock.get('owner'), '另一页面正在管理世界，请在当前页面继续')
    c['input_seq'] = seq
    if clock.get('running_until',0) < now or not clock.get('running_until'):
        c['last_tick']=now
        return ''
    axes=[data.get(k,0) for k in ['dx','dy','aim_x','aim_y']]
    require(all(isinstance(v,(int,float)) and not isinstance(v,bool) and math.isfinite(v) for v in axes), '战斗输入无效')
    dx,dy,ax,ay=axes
    require(abs(dx)<=1 and abs(dy)<=1 and 0<=ax<=640 and 0<=ay<=448, '战斗输入超出范围')
    gap=now-c['last_tick']
    dt=min(.25,max(0.,gap)) if c['last_tick'] and gap<=.75 else 0.
    c['last_tick']=now
    recover_stamina(state,now)
    floor_enemies(state,now)
    length=max(1,math.hypot(dx,dy)); dx/=length; dy/=length
    # Substeps keep tell/impact and movement outcomes stable across polling rates.
    remaining=dt
    while remaining>1e-8 and is_cave(state):
        step=min(.025,remaining); remaining-=step; c['time']+=step
        p=state['position']
        for axis,value in [('x',dx),('y',dy)]:
            target=p[axis]+value*160*step
            point={**p,axis:target}
            if walkable(point['x'],point['y'],state['location']): p[axis]=target
        cast=c['cast']
        if cast and c['time']>=cast['until']:
            if cast['kind']=='soup':
                if c['hurt_until'] <= cast['started']+.8:
                    state['inventory']['soup']-=1
                    state['vitality']['current']=min(state['vitality']['max'],state['vitality']['current']+20)
                    state['stamina']['current']=min(state['stamina']['max'],state['stamina']['current']+15)
                    state['stamina']['updated_at']=now
                    if state['location']=='cave_5': c['soups_used']+=1
                    c['soup_at']=c['time']+10
                    c['message']='菜汤：生命 +20、体力 +15（不超过上限）'
            else: attack_hit(state,cast)
            c['cast']=None
        step_enemies(state,step)
        projectiles=[]
        for shot in c.get('projectiles',[]):
            shot['x']+=math.cos(shot['angle'])*90*step;shot['y']+=math.sin(shot['angle'])*90*step
            if shot['until']<c['time'] or not walkable(shot['x'],shot['y'],state['location']):continue
            if p['x']>=166 and math.hypot(p['x']-shot['x'],p['y']-shot['y'])<15:
                if c.get('hit_wave')!=shot['wave'] and c['time']>=c['hurt_until']:
                    state['vitality']['current']=max(0,state['vitality']['current']-6)
                    c['hurt_until']=c['time']+.8;c['hit_wave']=shot['wave']
                    c['effects'].append(dict(x=p['x'],y=p['y'],text='−6',until=c['time']+.65,kind='hurt'))
                continue
            projectiles.append(shot)
        c['projectiles']=projectiles
        if state['vitality']['current']<=0:
            retreat(state,now,True)
            return c['message']
    t=c['time']; c['effects']=[e for e in c['effects'] if e['until']>t]
    if not c['cast'] and dt>0:
        angle=math.atan2(ay-state['position']['y'],ax-state['position']['x'])
        if data.get('soup') is True and state['inventory']['soup']>0 and t>=c['soup_at'] and (state['location']!='cave_5' or c['soups_used']<2):
            c['cast']=dict(kind='soup',until=t+1.2,started=t)
        elif state['position']['x']>=166 and data.get('spark') is True and c['spark_learned'] and t>=c['attack_at'] and t>=c['spark_at'] and state['stamina']['current']>=4:
            state['stamina']['current']-=4
            state['stamina']['updated_at']=now
            c['attack_at']=t+.5; c['spark_at']=t+4
            c['cast']=dict(kind='spark',angle=angle,damage=12,magic=True,reach=96,until=t+.5,started=t)
        elif state['position']['x']>=166 and data.get('attack') is True and c['equipped'] in WEAPONS and state['inventory'][c['equipped']]>0 and t>=c['attack_at']:
            w=WEAPONS[c['equipped']]
            if state['stamina']['current']>=w['stamina']:
                state['stamina']['current']-=w['stamina']
                state['stamina']['updated_at']=now
                c['attack_at']=t+w['interval']
                c['cast']=dict(kind='weapon',angle=angle,damage=w['damage'],magic=w['magic'],reach=w['reach'],until=t+.12,started=t)
    return ''


def command(state, action, data, now):
    from .rules import require, spend
    from .world import map_for
    c=ensure_combat(state)
    if action=='cave_tick': return tick(state,data,now)
    if action=='gear_equip':
        equip_owned(state,data.get('item'))
        return '已装备'+WEAPONS[c['equipped']]['name']
    if action in ['gear_buy','gear_craft','gear_sell']:
        near_service(state,data.get('target'),['workshop'])
        require(data.get('target')=='armory_counter','请到工坊武备台')
        item=data.get('item')
        require(isinstance(item,str),'请选择一种物品')
        if action=='gear_buy':
            require(item in [*WEAPONS,'soup'],'这里没有这种商品')
            spend(state,{'gold':8 if item=='soup' else WEAPONS[item]['price']})
            state['inventory'][item]+=1
        elif action=='gear_craft':
            require(item in WEAPONS,'没有这份武器配方')
            reasons=craft_reasons(state,WEAPONS[item])
            require(not reasons,'；'.join(reasons))
            spend(state,WEAPONS[item]['costs']); state['inventory'][item]+=1
        else:
            require(item in SELL,'关键物品不可出售')
            require(not c['cast'],'动作结束后再出售')
            spend(state,{item:1}); state['inventory']['gold']+=SELL[item]
            if c['equipped']==item and state['inventory'][item]==0: c['equipped']=None
        return ('已买入' if action=='gear_buy' else '已打造' if action=='gear_craft' else '已出售')+('便携菜汤' if item=='soup' else WEAPONS[item]['name'] if item in WEAPONS else MATERIAL_NAMES.get(item,item))
    if action=='spark_learn':
        near_service(state,data.get('target'),['library'])
        require(data.get('target')=='spell_desk','请到图书馆研习台')
        require(not c['spark_learned'],'已经学会火花术')
        require(state['knowledge_growth']['magic']>=1,'先投入知识点，将魔法升至1级')
        spend(state,{'gold':8}); c['spark_learned']=True
        return '学会火花术：12伤害、4体力、4秒冷却'
    if action=='gate_open':
        near_service(state,'village_departure',['overworld'])
        if c['gate_open']: return '石门已永久开启，通行保留'
        require(c['boss_first'],'先击败山洞底层的石壳守卫，取得门钥魔法石')
        require(state['inventory']['gate_stone']>=1,'需要1枚门钥魔法石，可核实补领')
        require(state['knowledge_growth']['magic']>=3,'开启石门需要魔法3级')
        spend(state,{'gate_stone':1}); c['gate_open']=True
        return '魔法石嵌入门心，石门永久开启。现在可以前往渡口。'
    if action=='stone_recover':
        near_service(state,'cave_entry',['overworld'])
        require(c['boss_first'] and not c['gate_open'] and not state['inventory']['gate_stone'],'没有可补领的魔法石')
        state['inventory']['gate_stone']=1
        return '已核实底层击败记录，补领门钥魔法石1枚'
    if action=='cave_retreat':
        require(is_cave(state),'目前不在山洞')
        return retreat(state,now)
    if action=='cave_interact':
        target=data.get('target')
        near_service(state,target,['overworld',*[f'cave_{n}' for n in range(1,6)]])
        if target=='cave_entry':
            state['location']='cave_1'; state['position']={'x':64,'y':352}
        else:
            require(is_cave(state),'请走近洞内路标')
            floor=int(state['location'][5:]); enemies=floor_enemies(state,now)
            if target=='cave_exit' or (target=='cave_down' and floor==5): return retreat(state,now)
            if target=='cave_rest':
                require(floor==3,'这里没有安全平台')
                total=360+state['world_clock']['elapsed']*1440/DAY_SECONDS
                require((total%1440+(1440 if total%1440<360 else 0))+30<1500,'离01:00太近，先回家睡觉')
                state['world_clock']['elapsed']+=30*DAY_SECONDS/1440
                state['stamina']['current']=min(state['stamina']['max'],state['stamina']['current']+20)
                state['vitality']['current']=min(state['vitality']['max'],state['vitality']['current']+10)
                c['last_tick']=0.
                return '平台小憩30游戏分钟：体力 +20、生命 +10'
            if target=='cave_down':
                require(all(e['hp']<=0 for e in enemies),'先清理本层怪物再前进')
                destination=floor+1
            elif target in ['cave_rope','cave_deep']:
                destination=3 if target=='cave_rope' else 5
                require(c['unlocked']>=destination+1 if destination==3 else c['unlocked']>=5,'这条通路尚未打通')
            else: raise ValueError('Unsupported cave target')
            state['location']=f'cave_{destination}'; state['position']={'x':64,'y':352}
        c.update(last_tick=0.,cast=None,effects=[],projectiles=[],soups_used=0,encounter=str(uuid.uuid4()),input_seq=0)
        floor_enemies(state,now)
        return f'进入石根山洞第{state["location"][5:]}层 · 普通移动不耗体力，可随时撤离'
    require(False,'未知村庄战斗操作')
