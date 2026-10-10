"""Deterministic rules. No model output can change game assets."""
import math
import copy
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from .world import OBJECTS, INTERIORS, map_for, walkable, clear_path
from .quests import QUESTS, progress, quest_views

ATTRIBUTES = ['strength', 'wisdom', 'craft', 'stewardship', 'bond']
ZONE = ZoneInfo('Asia/Shanghai')

class RuleError(ValueError):
    pass

def require(condition, message):
    if not condition:
        raise RuleError(message)

def initial_state():
    return {'character': None, 'position': {'x': 240, 'y': 320}, 'inventory': {'gold': 20, 'wood': 0, 'stone': 0, 'seed': 6, 'crop': 0, 'plank': 0}, 'xp': 0, 'attributes': {key: 0 for key in ATTRIBUTES}, 'energy': 0, 'knowledge_shard': 0, 'buildings': {'home': 1, 'workshop': 1, 'library': 1}, 'plots': {}, 'gathered': {}, 'relationships': {'lia': 0, 'noah': 0}, 'npc_days': {}, 'events': [], 'activities': [], 'daily': {}, 'timer': None, 'revision': 0}

def upgrade_state(original):
    state = copy.deepcopy(original)
    state.setdefault('location', 'overworld')
    state.setdefault('quests', {'settle_in': {'status':'active','accepted_at':0}} if state['character'] else {})
    state.setdefault('tracked_quest', 'settle_in')
    state.setdefault('stats', {'wood':max(state['inventory'].get('wood',0),3 if 'first_gather' in state['events'] else 0),'stone':state['inventory'].get('stone',0),'harvest':state['inventory'].get('crop',0),'sold':0,'crafted':state['inventory'].get('plank',0)})
    state.setdefault('storage', {key:0 for key in ['wood','stone','seed','crop','plank']})
    if state.get('save_version', 1) < 2:
        if state['location'] not in ['overworld', *INTERIORS] or not walkable(**state['position'], location=state['location']):
            state['location']='overworld'
            state['position']={'x':240,'y':320}
        state['save_version']=2
    return state

def bump(state, key, amount=1):
    state['stats'][key] = state['stats'].get(key, 0) + amount

def remember(state, event):
    if event not in state['events']:
        state['events'].append(event)


def integer(value, low, high):
    require(isinstance(value, int) and not isinstance(value, bool) and low <= value <= high, f'数值需为 {low}–{high} 之间的整数')
    return value

def spend(state, costs):
    require(all(state['inventory'].get(key, 0) >= amount for key, amount in costs.items()), '材料不足，去森林采集或出售作物吧')
    for key, amount in costs.items():
        state['inventory'][key] -= amount

def grant_xp(state, attribute, amount):
    state['attributes'][attribute] += amount
    state['xp'] += amount

def activity(state, data, now, source='manual'):
    kind = data.get('kind')
    require(kind in ['steps', 'study', 'exercise', 'creative', 'management'], '不支持的活动类型')
    amount = integer(data.get('amount'), 1, 100000 if kind == 'steps' else 480 if kind != 'management' else 1)
    today = datetime.fromtimestamp(now, ZONE).date()
    try:
        day = datetime.strptime(str(data.get('date', today.isoformat())), '%Y-%m-%d').date()
    except ValueError:
        raise RuleError('日期格式应为 YYYY-MM-DD')
    require(today - timedelta(days=7) <= day <= today, '可记录今天或最近七天的活动')
    note = str(data.get('note', '')).strip()
    require(len(note) <= 200, '备注不能超过 200 字')
    attribute = {'steps': 'strength', 'study': 'wisdom', 'exercise': 'strength', 'creative': 'craft', 'management': 'stewardship'}[kind]
    day_key = day.isoformat()
    daily = state['daily'].setdefault(day_key, {})
    if kind == 'steps':
        previous = daily.get('steps_total', 0)
        require(amount > previous, '当天步数已记录；再次填写时请输入更高的累计总步数')
        proposed = max(0, min(amount, 10000)//500 - min(previous, 10000)//500) * 2
        daily['steps_total'] = amount
    elif kind == 'management':
        require(not daily.get('management_done'), '今天的生活管理奖励已领取')
        daily['management_done'] = True
        proposed = 10
    else:
        proposed = min(amount, 120)
    earned = min(proposed, max(0, 100-daily.get(attribute, 0)))
    daily[attribute] = daily.get(attribute, 0) + earned
    grant_xp(state, attribute, earned)
    if kind in ['steps', 'exercise']:
        state['energy'] += earned // 2
    if kind == 'study':
        # Award shards at cumulative daily XP thresholds, independent of submission splitting.
        before = (daily[attribute] - earned) // 25
        state['knowledge_shard'] += daily[attribute] // 25 - before
    state['activities'].append({'kind': kind, 'amount': amount, 'date': day_key, 'source': source, 'verified': False, 'note': note, 'xp': earned, 'created_at': now})
    return f'记录已保存，获得 {earned} 点成长经验' if earned else '记录已保存，今日该属性奖励已达上限'

def apply(state, action, data, now):
    migrated = upgrade_state(state)
    state.clear()
    state.update(migrated)
    today = datetime.fromtimestamp(now, ZONE).date().isoformat()
    location = state['location']
    if action == 'create':
        require(state['character'] is None, '角色已创建')
        name = str(data.get('name', '')).strip()
        require(1 <= len(name) <= 16, '角色名称需为 1–16 字')
        # Append-only appearance IDs; 0–2 retain their original sprite bindings.
        appearance = integer(data.get('appearance', 0), 0, 5)
        state['character'] = {'name': name, 'appearance': appearance}
        state['quests']['settle_in']={'status':'active','accepted_at':now}
        return '新任务：给新生活一个落脚点。走近小屋门口按 E 进入，再收集 3 份木材。'
    require(state['character'] is not None, '请先创建角色')
    if action == 'move':
        x, y = data.get('x'), data.get('y')
        require(all(isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v) for v in [x,y]), '坐标无效')
        target = {'x': round(x, 2), 'y': round(y, 2)}
        require(data.get('location', location) == location, '场景已经切换，请等待位置同步')
        require(walkable(x,y,location) and clear_path(state['position'], target,location), '此处无法通行')
        require(math.hypot(x-state['position']['x'], y-state['position']['y']) <= 220, '移动距离过远，请重试')
        state['position'] = target
        return ''
    if action == 'activity':
        return activity(state, data, now)
    if action.startswith('timer_'):
        timer = state['timer']
        if action == 'timer_start':
            require(timer is None, '已有学习计时，请先结束')
            topic = str(data.get('topic', '')).strip()
            require(1 <= len(topic) <= 80, '请输入 1–80 字的学习主题')
            state['timer'] = {'topic': topic, 'elapsed': 0, 'started_at': now, 'running': True}
            return '学习计时已开始'
        require(timer is not None, '没有进行中的学习计时')
        if action == 'timer_pause':
            require(timer['running'], '计时已经暂停')
            timer['elapsed'] += max(0, now - timer['started_at'])
            timer['running'] = False
        elif action == 'timer_resume':
            require(not timer['running'], '计时已经开始')
            timer.update(started_at=now, running=True)
        elif action == 'timer_finish':
            seconds = timer['elapsed'] + (max(0, now-timer['started_at']) if timer['running'] else 0)
            minutes = min(480, int(seconds // 60))
            message = activity(state, {'kind': 'study', 'amount': minutes, 'note': timer['topic']}, now, 'timer') if minutes else '不足一分钟，计时已结束，未发放奖励'
            state['timer'] = None
            return message
        else:
            raise RuleError('未知计时操作')
        return '计时已更新'
    if action == 'track_quest':
        quest_id = data.get('quest_id')
        require(state['quests'].get(quest_id,{}).get('status') == 'active', '只能追踪进行中的任务')
        state['tracked_quest'] = quest_id
        return '已追踪任务，目标会显示在地图上'
    if action in ['quest_accept', 'quest_claim']:
        quest = next((q for q in QUESTS if q['id'] == data.get('quest_id')), None)
        require(quest is not None, '任务不存在')
        giver = next((o for o in map_for(location)['objects'] if o['id'] == quest['giver']), None)
        require(giver is not None and math.hypot(state['position']['x']-giver['x'],state['position']['y']-giver['y']) <= 72, '请到发布任务的 NPC 或告示板旁接取、交付')
        view = next(q for q in quest_views(state) if q['id'] == quest['id'])
        if action == 'quest_accept':
            require(view['status'] == 'available', '任务尚未开放或已经接取')
            state['quests'][quest['id']]={'status':'active','accepted_at':now}
            state['tracked_quest']=quest['id']
            return f'已接取：{quest["title"]}。下一步已加入旅程追踪'
        require(view['status'] == 'ready', '请先完成任务目标，奖励只能领取一次')
        for item, amount in quest['reward'].items():
            state['inventory'][item] += amount
        grant_xp(state,quest['attribute'],quest['xp'])
        state['quests'][quest['id']]['status']='claimed'
        state['quests'][quest['id']]['claimed_at']=now
        if state['tracked_quest']==quest['id']:
            state['tracked_quest']=next((q['id'] for q in quest_views(state) if q['status'] in ['active','ready']),None)
        return f'任务完成：{quest["title"]}。奖励已放入背包'
    obj = next((o for o in map_for(location)['objects'] if o['id'] == data.get('target')), None)
    require(obj is not None, '交互对象不存在')
    require(math.hypot(state['position']['x']-obj['x'], state['position']['y']-obj['y']) <= 72, '请先走近这个对象')
    target = obj['id']
    if action == 'enter':
        require(location == 'overworld' and obj['kind'] == 'building' and target in INTERIORS, '这里没有可以进入的建筑')
        state['location']=target
        state['position']=dict(INTERIORS[target]['spawn'])
        remember(state, 'visited_'+target)
        return f'进入{obj["name"]} · 走近家具按 E 互动，门口可返回户外'
    if action == 'exit':
        require(location != 'overworld' and obj['kind'] == 'exit', '请走到门口离开')
        door=next(o for o in OBJECTS if o['id']==location)
        state['location']='overworld'
        state['position']={'x':door['x'],'y':door['y']+12}
        return '回到了户外'
    if action == 'rest':
        require(target == 'home_bed', '请走近家里的床')
        remember(state,'rested_home')
        state['last_rest']=now
        return '在家里歇了歇脚。进度已保存，作物会按自己的节奏生长。'
    if action in ['store', 'withdraw']:
        require(target == 'home_chest', '请先走近家园储物箱')
        item=data.get('item')
        require(item in state['storage'], '这种物品不能存入储物箱')
        amount=integer(data.get('amount',1),1,9999)
        source, dest=(state['inventory'],state['storage']) if action=='store' else (state['storage'],state['inventory'])
        require(source[item]>=amount,'物品数量不足')
        source[item]-=amount
        dest[item]+=amount
        return '物品已存入储物箱' if action=='store' else '物品已取回背包'
    if action == 'discover':
        require(obj['kind'] == 'landmark', '这里不是探索地点')
        event='discovered_'+target
        require(event not in state['events'], '你已经发现了这里，看看地图上的下一个目的地吧')
        remember(state,event)
        return f'发现新区域：{obj["name"]}。探索进度已记录'
    if action == 'open_chest':
        require(obj['kind']=='chest','这里没有补给箱')
        event='opened_'+target
        require(event not in state['events'],'这里的补给已经取走了')
        remember(state,event)
        state['inventory']['gold']+=15
        state['inventory']['seed']+=2
        return '找到旅人的补给：15 金币、2 份种子'
    if action == 'gather':
        require(obj['kind'] in ['wood', 'stone'], '这里不能采集')
        require(state['gathered'].get(target, 0) <= now, '资源正在恢复，稍后再来吧')
        quantity = 3 + int(state['attributes']['strength'] >= 50)
        state['inventory'][obj['kind']] += quantity
        bump(state,obj['kind'],quantity)
        if 'first_gather' not in state['events']:
            state['events'].append('first_gather')
        state['gathered'][target] = now + 30
        return f'采集成功，获得 {quantity} 份' + ('木材' if obj['kind'] == 'wood' else '石料')
    if action == 'talk':
        require(obj['kind'] == 'npc', '这不是可交谈的角色')
        if state['npc_days'].get(target) != today:
            state['relationships'][target] += 1
            state['npc_days'][target] = today
            grant_xp(state, 'bond', 5)
        if target == 'lia':
            return '你的知识已经唤醒了符文。去图书馆东边的遗迹看看吧。' if state['attributes']['wisdom'] >= 25 else '每一次学习，都会在大陆留下回响。积累 25 点学识经验，就能读懂东边遗迹的符文。'
        return '沿着村道向东，微光林地里藏着新的风景。想一起探索吗？下面可以接取我的委托。资源每 30 秒恢复，别忘了带上地图。'
    if action in ['plant', 'harvest']:
        require(obj['kind'] == 'plot', '这里不是农田')
        if action == 'plant':
            require(target not in state['plots'], '这里已经种了作物')
            spend(state, {'seed': 1})
            if 'first_plant' not in state['events']:
                state['events'].append('first_plant')
            state['plots'][target] = {'planted_at': now, 'ready_at': now + (45 if state['buildings']['home'] >= 2 else 60)}
            return '种下了萝卜。离线时也会继续生长'
        require(target in state['plots'] and state['plots'][target]['ready_at'] <= now, '作物还没有成熟')
        del state['plots'][target]
        state['inventory']['crop'] += 2
        bump(state,'harvest',2)
        state['inventory']['seed'] += 1
        return '收获了 2 份萝卜，并留下 1 份种子'
    if action == 'upgrade':
        require(obj['kind'] == 'station' and obj.get('building') in state['buildings'], '请进入建筑，在工作台或手册处升级')
        target=obj['building']
        level = state['buildings'][target]
        require(level < 3, '建筑已达到当前最高等级')
        spend(state, {'wood': level*6, 'stone': level*3, 'gold': level*10})
        state['buildings'][target] += 1
        return f'{obj["name"]}已升级至 {level+1} 级'
    if action in ['sell', 'buy_seed', 'craft']:
        require(target == 'workshop_counter' and location == 'workshop', '请进入工坊，到柜台交易或制作')
        if action == 'sell':
            spend(state, {'crop': 1})
            bump(state,'sold')
            state['inventory']['gold'] += 8 + state['buildings']['workshop']-1
            return '出售了 1 份萝卜'
        if action == 'buy_seed':
            spend(state, {'gold': 2})
            state['inventory']['seed'] += 1
            return '购入了 1 份种子'
        spend(state, {'wood': 3})
        state['inventory']['plank'] += 1
        bump(state,'crafted')
        return '制作了 1 块木板'
    if action == 'explore':
        require(target == 'ruins', '这里没有探索事件')
        require(state['attributes']['wisdom'] >= 25, '需要积累 25 点学识经验才能解读符文')
        require('rune_awakened' not in state['events'], '你已经唤醒了这处符文')
        state['events'].append('rune_awakened')
        state['knowledge_shard'] += 3 * state['buildings']['library']
        grant_xp(state, 'wisdom', 15)
        return '符文亮起，古代手稿重见天日！获得知识碎片与 15 点学识经验'
    raise RuleError('未知操作')
