"""Hand-authored quests; progress and rewards are always calculated by rules."""
QUESTS = [
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

MAIN_QUESTS = {'settle_in', 'leave_valley'}

def progress(state, quest_id):
    stats = state.get('stats', {})
    events = state['events']
    combat = state.get('village_combat', {})
    gate = combat.get('gate_open', False)
    return {
        'leave_valley': [bool(combat.get('boss_first') or gate), bool(state.get('knowledge_growth', {}).get('magic', 0)>=3 or gate), gate, 'visited_crossing' in events, 'crossed_river' in events, 'crossed_mountain' in events, 'letter_delivered' in events, 'slept_inn' in events, 'returned_village' in events],
        'market_neighbor': ['visited_shop' in events, stats.get('market_sold', 0) >= 1],
        'village_supplier': [stats.get('deliveries', 0) >= 3, state['buildings']['home'] >= 2],
        'settle_in': ['visited_home' in events, stats.get('wood', 0) >= 3],
        'first_harvest': [stats.get('harvest', 0) >= 2, stats.get('sold', 0) >= 1],
        'forest_path': ['discovered_grove' in events, stats.get('stone', 0) >= 6],
        'rune_research': ['visited_library' in events, state['attributes']['wisdom'] >= 25, 'rune_awakened' in events],
        'craft_home': [stats.get('crafted', 0) >= 1, max(state['buildings'].values()) >= 2],
        'wide_world': ['discovered_lake' in events, 'discovered_quarry' in events],
    }[quest_id]

def quest_views(state):
    result = []
    for definition in QUESTS:
        entry = dict(definition)
        stored = state.get('quests', {}).get(entry['id'], {})
        if entry['id']=='leave_valley' and state.get('village_combat', {}).get('legacy_passage'):
            entry['objectives'] = ['旧旅程通行资格已保留（洞穴可补做）','旧旅程启门资格已保留','石门旧进度已恢复']+entry['objectives'][3:]
            entry['description'] = '过去的离村记录已接续，无需补打洞穴或重复嵌石；仍可自由探索村庄战斗。'+entry['description']
        checks = progress(state, entry['id'])
        prerequisite = entry['requires']
        unlocked = not prerequisite or state.get('quests', {}).get(prerequisite, {}).get('status') == 'claimed'
        status = stored.get('status', 'available' if unlocked else 'locked')
        if status == 'active' and all(checks):
            status = 'ready'
        entry.update(kind='main' if entry['id'] in MAIN_QUESTS else 'side',
                     status=status, checks=checks, accepted_at=stored.get('accepted_at'))
        result.append(entry)
    return result
