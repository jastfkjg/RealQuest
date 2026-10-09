"""Hand-authored quests; progress and rewards are always calculated by rules."""
QUESTS = [
    {'id': 'settle_in', 'title': '给新生活一个落脚点', 'giver': 'board', 'giver_name': '村庄告示板', 'description': '先认认自己的家，再收集一些修缮用的木材。', 'objectives': ['进入林间小屋', '采集 3 份木材'], 'reward': {'gold': 12, 'seed': 3}, 'xp': 10, 'attribute': 'stewardship', 'requires': None},
    {'id': 'first_harvest', 'title': '土地的第一份回礼', 'giver': 'board', 'giver_name': '村庄告示板', 'description': '种下一份期待。收获后，到工坊柜台出售一份萝卜。', 'objectives': ['收获 2 份萝卜', '在工坊出售 1 份萝卜'], 'reward': {'gold': 25}, 'xp': 15, 'attribute': 'stewardship', 'requires': 'settle_in'},
    {'id': 'forest_path', 'title': '沿着风去森林', 'giver': 'noah', 'giver_name': '森林向导 · 诺亚', 'description': '沿村道向东，越过古老石桥，找到微光林地。带回 6 份石料。', 'objectives': ['发现微光林地', '采集 6 份石料'], 'reward': {'gold': 25, 'seed': 3}, 'xp': 15, 'attribute': 'strength', 'requires': None},
    {'id': 'rune_research', 'title': '纸页间沉睡的秘密', 'giver': 'lia', 'giver_name': '图书管理员 · 莉亚', 'description': '进入图书馆寻找线索。在现实中积累 25 点学识经验，再解读东侧石门的符文。', 'objectives': ['进入回响图书馆', '积累 25 点学识经验', '唤醒沉睡的符文'], 'reward': {'gold': 30}, 'xp': 20, 'attribute': 'wisdom', 'requires': None},
    {'id': 'craft_home', 'title': '让家园焕然一新', 'giver': 'board', 'giver_name': '村庄告示板', 'description': '到工坊工作台制作木板，并升级任意一座建筑。', 'objectives': ['制作 1 块木板', '任意建筑升至 2 级'], 'reward': {'gold': 20}, 'xp': 20, 'attribute': 'craft', 'requires': 'settle_in'},
    {'id': 'wide_world', 'title': '小路之外的风景', 'giver': 'guild_board', 'giver_name': '公会委托台', 'description': '去南方看看湖泊与采石场。新世界就在地图的边缘之外。', 'objectives': ['发现风铃湖', '发现旧采石场'], 'reward': {'gold': 40, 'seed': 5}, 'xp': 20, 'attribute': 'strength', 'requires': None},
]

def progress(state, quest_id):
    stats = state.get('stats', {})
    events = state['events']
    return {
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
        checks = progress(state, entry['id'])
        prerequisite = entry['requires']
        unlocked = not prerequisite or state.get('quests', {}).get(prerequisite, {}).get('status') == 'claimed'
        status = stored.get('status', 'available' if unlocked else 'locked')
        if status == 'active' and all(checks):
            status = 'ready'
        entry.update(status=status, checks=checks, accepted_at=stored.get('accepted_at'))
        result.append(entry)
    return result
