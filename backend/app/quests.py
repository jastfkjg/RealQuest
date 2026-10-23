"""Hand-authored quests; progress and rewards are always calculated by rules."""
LEGACY_QUESTS = [
    {'id':'leave_valley','title':'山那边，灯火正亮','giver':'board','giver_name':'村庄告示板',
     'description':'先在工坊购买或打造武器，进入旧采石场旁的五层石根山洞。击败底层守卫取得门钥魔法石，将魔法升至3级，在村东石门嵌石开启通路。带上村庄给岚姨的来信。穿过苇风渡口，翻越苍脊山脉，在苔桥城的灯穗旅店落脚一晚，再回村报个平安。修桥或乘船都能渡河，出发前记得准备绳索和体力。',
     'objectives':['击败洞穴底层守卫，取得门钥魔法石','将魔法提升至3级','在村东石门嵌石开启通路','走到村外苇风渡口','修桥或乘船渡河','翻越苍脊山脉抵达苔桥城','向灯穗旅店的岚姨交信','付费住宿并在旅店睡醒','返回回响村庄'],
     'reward':{'gold':20},'xp':20,'attribute':'strength','requires':'settle_in'},
    {'id': 'market_neighbor', 'title': '小铺的第一位熟客', 'giver': 'mira', 'giver_name': '杂货铺店主 · 米拉', 'description': '田里的收获、路边的落枝，都有用处。到小铺出售一份物品，挣下自己的第一笔生意钱。', 'objectives': ['进入风铃杂货铺', '向米拉出售 1 份物品'], 'reward': {'gold': 10, 'seed': 2}, 'xp': 10, 'attribute': 'bond', 'requires': None},
    {'id': 'village_supplier', 'title': '在村里扎下根', 'giver': 'mira', 'giver_name': '杂货铺店主 · 米拉', 'description': '帮邻居们完成三份补给订单，再把自己的小屋修缮到 2 级。下一轮播种会更快成熟。', 'objectives': ['累计交付 3 份小铺订单', '林间小屋升至 2 级'], 'reward': {'gold': 50}, 'xp': 20, 'attribute': 'stewardship', 'requires': 'market_neighbor'},
    {'id': 'settle_in', 'title': '给新生活一个落脚点', 'giver': 'board', 'giver_name': '村庄告示板', 'description': '先认认自己的家，再收集一些修缮用的木材。', 'objectives': ['进入林间小屋', '采集 3 份木材'], 'reward': {'gold': 12, 'seed': 3}, 'xp': 10, 'attribute': 'stewardship', 'requires': None},
    {'id': 'first_harvest', 'title': '土地的第一份回礼', 'giver': 'board', 'giver_name': '村庄告示板', 'description': '种下一份期待。收获后，到风铃杂货铺或工坊柜台出售一份萝卜。', 'objectives': ['收获 2 份萝卜', '出售 1 份萝卜'], 'reward': {'gold': 25}, 'xp': 15, 'attribute': 'stewardship', 'requires': 'settle_in'},
    {'id': 'forest_path', 'title': '沿着风去森林', 'giver': 'noah', 'giver_name': '森林向导 · 诺亚', 'description': '沿村道向东，越过古老石桥，找到微光林地。带回 6 份石料。', 'objectives': ['发现微光林地', '采集 6 份石料'], 'reward': {'gold': 25, 'seed': 3}, 'xp': 15, 'attribute': 'strength', 'requires': None},
    {'id': 'rune_research', 'title': '纸页间沉睡的秘密', 'giver': 'lia', 'giver_name': '图书管理员 · 莉亚', 'description': '进入图书馆寻找线索。在现实中积累 25 点学识经验，再解读东侧石门的符文。', 'objectives': ['进入回响图书馆', '积累 25 点学识经验', '唤醒沉睡的符文'], 'reward': {'gold': 30}, 'xp': 20, 'attribute': 'wisdom', 'requires': None},
    {'id': 'craft_home', 'title': '让家园焕然一新', 'giver': 'board', 'giver_name': '村庄告示板', 'description': '到工坊工作台制作木板，并升级任意一座建筑。', 'objectives': ['制作 1 块木板', '任意建筑升至 2 级'], 'reward': {'gold': 20}, 'xp': 20, 'attribute': 'craft', 'requires': 'settle_in'},
    {'id': 'wide_world', 'title': '小路之外的风景', 'giver': 'guild_board', 'giver_name': '公会委托台', 'description': '去南方看看湖泊与采石场。新世界就在地图的边缘之外。', 'objectives': ['发现风铃湖', '发现旧采石场'], 'reward': {'gold': 40, 'seed': 5}, 'xp': 20, 'attribute': 'strength', 'requires': None},
]



def quest(id, title, description, objectives, reward, requires=None, *, giver='board', giver_name='村庄告示板', xp=10, attribute='stewardship', kind='main', **extra):
    return dict(id=id, title=title, description=description, objectives=objectives, reward=reward,
                requires=requires, giver=giver, giver_name=giver_name, xp=xp, attribute=attribute, kind=kind, **extra)


# The authoring order is also the journal order. Future entries are not projected.
QUESTS = [
    quest('settle_in', '给新生活一个落脚点', '先看看自己的小屋，再拾些木材。村民给你准备了种子，可以从家门口的田地开始。',
          ['进入林间小屋', '采集3份木材'], {'gold': 10, 'seed': 3}),
    quest('first_harvest', '土地的第一份回礼', '用白萝卜给邻居们添一道菜。亲手收获4份，再带4份到告示板确认交付。两块田的一轮收成就够；游戏睡眠推进生长，离线暂停。等待时可以认识小铺、收集修缮材料。已收获的进度会保留；误卖后可补种。',
          ['亲手收获4份白萝卜', '带4份白萝卜回告示板交付'], {'gold': 16}, 'settle_in', xp=15, delivery={'crop': 4}),
    quest('craft_planks', '把落枝变成木板', '邻居请你到工坊练练手：3份木材能做1块木板。先认识材料如何变成成品；完成后工坊会备好修缮小屋的基础物资。',
          ['在工坊制作1块木板'], {'wood': 6, 'stone': 3}, 'first_harvest', attribute='craft'),
    quest('craft_home', '让这里像个家', '带上修缮物资，在小屋手册把林间小屋升到2级，需6木材、3石料和30银币。回礼含8银币、3份饲料，以及一次基础禽舍施工和首只小鸡领养援助；到牧场确认办理，不发放大额现金。',
          ['林间小屋升至2级'], {'gold': 8, 'animal_feed': 3}, 'craft_planks', xp=20, attribute='craft', ranch_aid=True),
    quest('ranch_start', '院子里的新邻居', '从家园牧场入口到向阳牧场，使用村民的一次援助建1级禽舍，在采购簿领养首只小鸡，再亲手添一次口粮。首次办理由村民承担全部费用；后续扩建和幼崽自行出资。只需完成喂养，不用等待成年或产蛋。已有住所和照料经历同样算数。',
          ['建成1级禽舍', '安置一只鸡', '给鸡添一次口粮'], {'gold': 12}, 'craft_home', xp=15),
    quest('first_expedition', '给工坊带些材料', '工坊需要石根山洞首层的材料。购买或打造一件武器并装备，清理首层，带胶质回武备台看看用途。不必深入第二层；随时可以撤离，通路和收获会保留。',
          ['准备并装备武器', '清理洞穴首层', '带材料回工坊并记下回顾'], {'gold': 20}, 'ranch_start', attribute='strength', xp=15),
    quest('gate_story', '石头上的旧纹路', '工坊里的发现指向村东石门。先到图书馆看看旧记载，再到石门旁阅读并记下启门条件。条件会在深入洞穴前完整说明，调查本身不消耗物品。',
          ['进入回响图书馆', '在村东石门记下启门条件'], {'gold': 8}, 'first_expedition', attribute='wisdom'),
    quest('gate_preparation', '为山那边做准备', '石门需要底层守卫保底掉落的门钥魔法石，以及魔法3级。两项准备可以交错进行；从0级起，学习约定至少需3小时现实等待，结算后主动投入魔法，游戏睡眠不能加速。已有魔法与首胜记录保留。',
          ['击败洞穴底层守卫，取得门钥魔法石', '将魔法提升至3级'], {'gold': 10}, 'gate_story', attribute='strength', xp=15),
    quest('leave_valley', '山那边，灯火正亮', '村民把给岚姨的信托付给你。准备好后，到村东石门亲手嵌石，踏上通往苇风渡口的小路。石门开启后永久通行，随时可以回家。',
          ['在村东石门嵌石开启通路', '走到村外苇风渡口'], {'gold': 20}, 'gate_preparation', xp=20, attribute='strength', giver='river_bridge', giver_name='苇风渡口路牌', giver_map='crossing', accept_anywhere=True),
    quest('crossing_path', '河对岸的小路', '从渡口选择一种适合自己的办法：修桥或乘船，都可以继续旅程。先查看现场报价；到对岸的山路营地确认行程，无需折返或再走另一种方案。',
          ['修桥或乘船渡河'], {'gold': 8}, 'leave_valley', giver='mountain_camp', giver_name='山路营地路牌', giver_map='mountain', accept_anywhere=True, attribute='strength'),
    quest('city_arrival', '把来信送到灯火下', '沿山路抵达苔桥城，向灯穗旅店的岚姨交信，再安排一晚住宿。留意路程体力与旅店费用，旅途中可以休息、折返。',
          ['翻越苍脊山脉抵达苔桥城', '向岚姨交信', '付费住宿并在旅店睡醒'], {'gold': 12}, 'crossing_path', giver='lanya', giver_name='灯穗旅店 · 岚姨', giver_map='inn', accept_anywhere=True, attribute='bond'),
    quest('market_neighbor', '小铺的第一位熟客', '等作物长大的时候，去认识米拉吧。小铺也收购落枝和石料；交付主线需要4份白萝卜，出售前记得留够。',
          ['进入风铃杂货铺', '向米拉出售1份物品'], {'gold': 10, 'seed': 2}, 'settle_in', giver='mira', giver_name='杂货铺店主 · 米拉', kind='side', attribute='bond'),
    quest('forest_path', '沿着风去森林', '沿村道找到微光林地，再采集6份石料。认识材料来源，以后修缮和扩建会更从容。',
          ['发现微光林地', '采集6份石料'], {'gold': 16, 'seed': 2}, 'first_harvest', giver='noah', giver_name='森林向导 · 诺亚', kind='side', attribute='strength', xp=15),
    quest('village_supplier', '在村里扎下根', '想多帮邻居一些忙，可以去小铺完成三份补给订单，并把小屋修到2级。订单是可选经营，不影响主线继续。',
          ['累计交付3份小铺订单', '林间小屋升至2级'], {'gold': 24}, ['market_neighbor', 'craft_home'], giver='mira', giver_name='杂货铺店主 · 米拉', kind='side', xp=20),
    quest('ranch_harvest', '第一份牧场回礼', '慢慢照顾牧场伙伴，等成年后收集一份真实产物。缺食只暂停生长，离线不推进；这份委托可以留待日后完成。',
          ['从动物身上收集1份产物'], {'gold': 20}, 'ranch_start', kind='side'),
    quest('rune_research', '纸页间沉睡的秘密', '莉亚想请你研究村中的另一处古代符文。在现实中积累25点学识经验，再探索沉睡符文；这份研究不代替启门魔法等级。',
          ['进入回响图书馆', '积累25点学识经验', '唤醒沉睡的符文'], {'gold': 20}, 'gate_story', giver='lia', giver_name='图书管理员 · 莉亚', kind='side', xp=20, attribute='wisdom'),
    quest('wide_world', '小路之外的风景', '去湖畔和旧采石场看看，熟悉村庄周边的地理。可以在探洞前后顺路完成。',
          ['发现风铃湖', '发现旧采石场'], {'gold': 20, 'seed': 3}, 'ranch_start', giver='guild_board', giver_name='公会委托台', kind='side', xp=20, attribute='strength'),
    quest('return_visit', '给村里报个平安', '在城市安顿好之后，挑个方便的时候回村看看。家园、牧场和邻居一直在这里。',
          ['返回回响村庄'], {'gold': 10}, 'city_arrival', kind='side', attribute='bond'),
]
MAIN_QUESTS = {q['id'] for q in QUESTS if q['kind'] == 'main'}
LEGACY = {q['id']: q for q in LEGACY_QUESTS}


def ensure_story(state):
    if 'quest_story' in state:
        return
    # Pin only already accepted contracts to their original terms; no rewards or
    # invented completed milestones are issued during migration.
    for id, stored in state.get('quests', {}).items():
        if id in LEGACY:
            stored.setdefault('definition_version', 1)
    state['quest_story'] = {'version': 2, 'legacy_departure': bool(
        state.get('quests', {}).get('leave_valley') or state.get('village_combat', {}).get('gate_open')
        or state.get('village_combat', {}).get('unlocked', 1) > 1)}


def definition_for(state, id):
    if not isinstance(id, str):
        return None
    if state.get('quests', {}).get(id, {}).get('definition_version') == 2:
        from .economy import PREVIOUS_QUESTS
        return PREVIOUS_QUESTS.get(id)
    if id in LEGACY and (state.get('quests', {}).get(id, {}).get('definition_version') == 1
            or state.get('quest_story', {}).get('legacy_departure')):
        return {**LEGACY[id], 'kind': 'main' if id in {'settle_in', 'leave_valley'} else 'side', 'legacy': True}
    return next((q for q in QUESTS if q['id'] == id), None)


def unlocked(state, definition):
    prereqs = definition.get('requires') or []
    if isinstance(prereqs, str):
        prereqs = [prereqs]
    return all(state.get('quests', {}).get(id, {}).get('status') == 'claimed' for id in prereqs)


def legacy_progress(state, id):
    stats, events, combat = state['stats'], state['events'], state['village_combat']
    gate = combat['gate_open']
    if id == 'leave_valley':
        return [bool(combat['boss_first'] or gate), bool(state['knowledge_growth']['magic'] >= 3 or gate), gate,
                *[e in events for e in ['visited_crossing', 'crossed_river', 'crossed_mountain', 'letter_delivered', 'slept_inn', 'returned_village']]]
    if id == 'first_harvest':
        return [stats.get('harvest', 0) >= 2, stats.get('sold', 0) >= 1]
    if id == 'craft_home':
        return [stats.get('crafted', 0) >= 1, max(state['buildings'].values()) >= 2]
    return None


def progress(state, quest_id):
    if definition_for(state, quest_id).get('legacy'):
        old = legacy_progress(state, quest_id)
        if old is not None:
            return old
    stats, events = state.get('stats', {}), state['events']
    combat, intro = state.get('village_combat', {}), state.get('village_intro', {})
    gate = bool(combat.get('gate_open'))
    animals = state.get('ranch', {}).get('animals', {})
    return {
        'settle_in': ['visited_home' in events, stats.get('wood', 0) >= 3],
        'first_harvest': [stats.get('harvest_radish', 0) >= 4, state['inventory'].get('crop', 0) >= 4],
        'craft_planks': [stats.get('crafted', 0) >= 1],
        'craft_home': [state['buildings']['home'] >= 2],
        'ranch_start': [state.get('ranch', {}).get('buildings', {}).get('coop', 0) >= 1,
                        any(a['species'] == 'chicken' for a in animals.values()), 'quest_chicken_fed' in events],
        'first_expedition': [bool(combat.get('equipped') or intro.get('first_clear')), bool(intro.get('first_clear')), bool(intro.get('reviewed'))],
        'gate_story': ['visited_library' in events, 'quest_gate_read' in events],
        'gate_preparation': [bool(combat.get('boss_first') or gate), state.get('knowledge_growth', {}).get('magic', 0) >= 3 or gate],
        'leave_valley': [gate, 'visited_crossing' in events],
        'crossing_path': ['crossed_river' in events],
        'city_arrival': [e in events for e in ['crossed_mountain', 'letter_delivered', 'slept_inn']],
        'return_visit': ['returned_village' in events],
        'market_neighbor': ['visited_shop' in events, stats.get('market_sold', 0) >= 1],
        'village_supplier': [stats.get('deliveries', 0) >= 3, state['buildings']['home'] >= 2],
        'forest_path': ['discovered_grove' in events, stats.get('stone', 0) >= 6],
        'rune_research': ['visited_library' in events, state['attributes']['wisdom'] >= 25, 'rune_awakened' in events],
        'wide_world': ['discovered_lake' in events, 'discovered_quarry' in events],
        'ranch_harvest': [stats.get('ranch_collected', 0) >= 1],
    }[quest_id]


def quest_views(state):
    result = []
    for base in QUESTS:
        entry = dict(definition_for(state, base['id']))
        stored = state.get('quests', {}).get(entry['id'], {})
        if not stored and (not unlocked(state, entry) or
                state.get('quest_story', {}).get('legacy_departure') and entry['kind'] == 'main' and entry['id'] != 'leave_valley'):
            continue
        if entry.get('legacy') and entry['id'] == 'leave_valley' and state.get('village_combat', {}).get('legacy_passage'):
            entry['objectives'] = ['旧旅程通行资格已保留（洞穴可补做）', '旧旅程启门资格已保留', '石门旧进度已恢复'] + entry['objectives'][3:]
            entry['description'] = '过去的离村记录已接续，无需补打洞穴或重复嵌石；仍可自由探索村庄战斗。' + entry['description']
        checks = progress(state, entry['id'])
        status = stored.get('status', 'available')
        if status == 'claimed':
            checks = [True] * len(checks)
        elif status == 'active' and all(checks):
            status = 'ready'
        entry.update(status=status, checks=checks, accepted_at=stored.get('accepted_at'))
        result.append(entry)
    return result


def record_ranch_action(state, action, data, collected=0):
    # Called only after the authoritative ranch mutation succeeds.
    if action == 'ranch_feed':
        animal = state['ranch']['animals'].get(data.get('target'), {})
        if animal.get('species') == 'chicken':
            if 'quest_chicken_fed' not in state['events']:
                state['events'].append('quest_chicken_fed')
    elif action == 'ranch_feed_all':
        if any(a['species'] == 'chicken' and a['feed_seconds'] > 0 for a in state['ranch']['animals'].values()):
            if 'quest_chicken_fed' not in state['events']:
                state['events'].append('quest_chicken_fed')
    elif action == 'ranch_collect':
        state['stats']['ranch_collected'] = state['stats'].get('ranch_collected', 0) + collected
