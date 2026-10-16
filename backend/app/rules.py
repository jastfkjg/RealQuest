"""Deterministic rules. No model output can change game assets."""
import math
import copy
import uuid
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from .world import OBJECTS, INTERIORS, map_for, walkable, clear_path
from .quests import QUESTS, progress, quest_views
from .market import market_view
from .residents import RESIDENTS, ensure_clock, resident_position, near_resident, greeting, release_encounter, LEASE_SECONDS, settle_clock
from .daynight import clock_view, night_due, finish_day, SHORT_REST_MINUTES, DAY_SECONDS

ATTRIBUTES = ['strength', 'wisdom', 'craft', 'stewardship', 'bond']
ZONE = ZoneInfo('Asia/Shanghai')
STAMINA_SECONDS = 720
GATHER_COSTS = {'wood': 4, 'stone': 6}
LIFE_KINDS = {'study': ('学习', 'knowledge_points', '知识点'),
              'exercise': ('运动', 'health_points', '健康点'),
              'work': ('工作', 'skill_points', '技能点')}
LIFE_DAILY_LIMIT = 5
SKILL_NAMES = {'planting': '种植', 'ranching': '养殖', 'building': '建造'}
HEALTH_CAPACITY_GAIN = 5

class RuleError(ValueError):
    pass

def require(condition, message):
    if not condition:
        raise RuleError(message)

def initial_state():
    return {'character': None, 'position': {'x': 240, 'y': 320}, 'inventory': {'gold': 20, 'wood': 0, 'stone': 0, 'seed': 6, 'crop': 0, 'plank': 0}, 'xp': 0, 'attributes': {key: 0 for key in ATTRIBUTES}, 'energy': 0, 'knowledge_shard': 0, 'buildings': {'home': 1, 'workshop': 1, 'library': 1}, 'plots': {}, 'gathered': {}, 'relationships': {'lia': 0, 'noah': 0}, 'npc_days': {}, 'events': [], 'activities': [], 'daily': {}, 'timer': None, 'revision': 0}

def upgrade_state(original):
    state = copy.deepcopy(original)
    from .journey import ensure_departure
    ensure_departure(state)
    state.setdefault('location', 'overworld')
    state.setdefault('market_orders', {})
    state.setdefault('npc_gifts', {})
    state.setdefault('npc_helped', {})
    state.setdefault('npc_encounter', None)
    state['relationships'].setdefault('mira', 0)
    state.setdefault('quests', {'settle_in': {'status':'active','accepted_at':0}} if state['character'] else {})
    state.setdefault('tracked_quest', 'settle_in')
    state.setdefault('stats', {'wood':max(state['inventory'].get('wood',0),3 if 'first_gather' in state['events'] else 0),'stone':state['inventory'].get('stone',0),'harvest':state['inventory'].get('crop',0),'sold':0,'crafted':state['inventory'].get('plank',0)})
    state.setdefault('storage', {key:0 for key in ['wood','stone','seed','crop','plank']})
    state.setdefault('study_tasks', {})
    state.setdefault('study_plans', {})
    state.setdefault('knowledge_points', 0)
    state.setdefault('knowledge_growth', {'science': 0, 'magic': 0})
    state.setdefault('exercise_tasks', {})
    state.setdefault('health_points', 0)
    state.setdefault('skill_points', 0)
    state.setdefault('life_tasks', {})
    state.setdefault('health_invested', 0)
    state.setdefault('vitality', {'current': 100, 'max': 100})
    state.setdefault('skill_growth', {key: 0 for key in SKILL_NAMES})
    state.setdefault('stamina', {'current': 100, 'max': 100, 'updated_at': 0})
    for task in state['study_tasks'].values():
        task.setdefault('knowledge_reward', 0)
        task.setdefault('plan_id', None)
        task.setdefault('archived_at', None)
    for index, record in enumerate(state['activities']):
        record.setdefault('id', f'legacy-{index}')
    if state['timer'] is not None:
        state['timer'].setdefault('id', 'legacy-timer')
    if state.get('save_version', 1) < 2:
        if state['location'] not in ['overworld', *INTERIORS] or not walkable(**state['position'], location=state['location']):
            state['location']='overworld'
            state['position']={'x':240,'y':320}
        state['save_version']=2
    if state.get('save_version', 1) < 3:
        if state['location'] == 'overworld' and not walkable(**state['position']):
            x, y = state['position']['x'], state['position']['y']
            candidates = ({'x': xx, 'y': yy} for xx in range(24, 1897, 16) for yy in range(40, 1257, 16))
            state['position'] = min((p for p in candidates if walkable(**p)), key=lambda p: math.hypot(p['x']-x, p['y']-y))
        state['save_version'] = 3
    from .combat import ensure_combat
    ensure_combat(state)
    from .village_intro import ensure_intro
    ensure_intro(state)
    return state


def character_growth_options(state):
    """Server quotes for the dossier; no XP conversion or client-priced purchases."""
    options = {}
    for target in ['vitality', 'stamina']:
        options[target] = {'currency': 'health_points', 'cost': 1,
                           'current': state[target]['max'],
                           'next': state[target]['max'] + HEALTH_CAPACITY_GAIN,
                           'expected_invested': state['health_invested']}
    for branch, level in state['knowledge_growth'].items():
        options[branch] = {'currency': 'knowledge_points', 'cost': 1,
                           'current': level, 'next': level + 1,
                           'expected_invested': sum(state['knowledge_growth'].values())}
    for branch, level in state['skill_growth'].items():
        options[branch] = {'currency': 'skill_points', 'cost': level + 1,
                           'current': level, 'next': level + 1,
                           'expected_invested': sum(state['skill_growth'].values())}
    return options

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

def study_task(state, task_id):
    require(isinstance(task_id, str) and task_id in state['study_tasks'], '这项研习任务不存在')
    return state['study_tasks'][task_id]

def study_task_views(state):
    views = []
    for task in state.get('study_tasks', {}).values():
        records = [a for a in state['activities'] if a.get('study_task_id') == task['id']]
        views.append({**task, 'minutes': sum(a['amount'] for a in records),
                      'earned_xp': sum(a['xp'] for a in records), 'record_count': len(records)})
    return sorted(views, key=lambda t: t['created_at'], reverse=True)

def recover_stamina(state, now):
    """Lazy recovery on a copy for reads, or inside a mutation transaction."""
    stamina = state['stamina']
    if stamina['current'] >= stamina['max']:
        stamina['updated_at'] = max(now, stamina['updated_at'])
        return
    steps = max(0, math.floor((now - stamina['updated_at']) / STAMINA_SECONDS))
    stamina['current'] = min(stamina['max'], stamina['current'] + steps)
    stamina['updated_at'] = (max(now, stamina['updated_at']) if stamina['current'] == stamina['max']
                             else stamina['updated_at'] + steps * STAMINA_SECONDS)

def exercise_task_views(state):
    return sorted([{**task, 'minutes': sum(a['amount'] for a in state['activities']
                   if a.get('exercise_task_id') == task['id'])}
                   for task in state['exercise_tasks'].values()], key=lambda t: t['date'], reverse=True)

def exercise_task(state, task_id):
    require(isinstance(task_id, str) and task_id in state['exercise_tasks'], '这项锻炼约定不存在')
    return state['exercise_tasks'][task_id]

def link_exercise(state, task, record, now):
    require(record['kind'] == 'exercise' and record['date'] == task['date'], '请选择约定当天的运动记录')
    require(not record.get('exercise_task_id') or record['exercise_task_id'] == task['id'], '这条记录已经用于另一项约定')
    record['exercise_task_id'] = task['id']
    minutes = sum(a['amount'] for a in state['activities'] if a.get('exercise_task_id') == task['id'])
    if minutes >= task['target_minutes'] and task['completed_at'] is None:
        task['completed_at'] = now
        return '旧约定已记入手札。健康点请通过诺亚的现实委托获得。'
    return '运动记录已装订进约定；关联不会重复发放经验。'

def study_plan(state, plan_id):
    require(isinstance(plan_id, str) and plan_id in state['study_plans'], '这本研习计划不存在')
    return state['study_plans'][plan_id]

def study_writable(state, task):
    require(task.get('archived_at') is None, '这页已归档，请先从手记中取回')
    if task.get('plan_id'):
        require(study_plan(state, task['plan_id'])['archived_at'] is None, '计划已归档，请先从书架取回')

def study_title(value):
    require(isinstance(value, str) and 1 <= len(value.strip()) <= 80, '请写下 1–80 字的学习主题')
    return value.strip()

def study_uuid(value):
    require(isinstance(value, str) and len(value) == 36, '研习标识无效')
    try:
        require(str(uuid.UUID(value)) == value, '研习标识无效')
    except ValueError:
        raise RuleError('研习标识无效')
    return value

def complete_study_task(state, task, now):
    minutes = sum(a['amount'] for a in state['activities'] if a.get('study_task_id') == task['id'])
    if minutes >= task['target_minutes'] and task['completed_at'] is None:
        task['completed_at'] = now
        # Legacy notes remain usable, but points now come only from timed NPC commissions.
        task['knowledge_reward'] = 0
        return True
    return False

def life_task_views(state, now):
    today = datetime.fromtimestamp(now, ZONE).date().isoformat()
    tasks = sorted(state['life_tasks'].values(), key=lambda t: t['accepted_at'], reverse=True)
    spent = sum(t['hours'] for t in tasks if t['date'] == today and t['status'] == 'claimed')
    reserved = sum(t['hours'] for t in tasks if t['date'] == today and t['status'] == 'active')
    return {'date': today, 'timezone': 'Asia/Shanghai', 'limit': LIFE_DAILY_LIMIT,
            'claimed': spent, 'reserved': reserved, 'remaining': max(0, LIFE_DAILY_LIMIT - spent - reserved),
            'tasks': tasks}

def life_command(state, action, data, now):
    if action != 'life_cancel':
        require(data.get('target') == 'noah' and near_resident(state, 'noah', now),
                '请到诺亚当前所在的位置，交谈后领取或结算现实委托；地图可查看行踪')
    if action == 'life_accept':
        task_id = study_uuid(data.get('task_id'))
        kind = data.get('kind')
        require(isinstance(kind, str) and kind in LIFE_KINDS, '请选择学习、运动或工作')
        hours = integer(data.get('hours'), 1, LIFE_DAILY_LIMIT)
        previous = state['life_tasks'].get(task_id)
        if previous:
            require(previous['kind'] == kind and previous['hours'] == hours, '委托标识已用于其他内容')
            return '这份委托已经记下，不会重复领取'
        require(not any(t['status'] == 'active' for t in state['life_tasks'].values()), '先结算或取消进行中的委托，再来领取下一项')
        quota = life_task_views(state, now)
        require(quota['remaining'] > 0, '今天的 5 点成长已全部领取，明天再来吧')
        require(hours <= quota['remaining'], f'今天还可领取 {quota["remaining"]} 小时的委托')
        state['life_tasks'][task_id] = {'id': task_id, 'kind': kind, 'hours': hours,
            'date': quota['date'], 'giver': 'noah', 'accepted_at': now, 'ready_at': now + hours * 3600,
            'status': 'active', 'claimed_at': None, 'cancelled_at': None, 'reward': 0,
            'source': 'npc_elapsed', 'verified': False}
        return f'约定好了：{hours} 小时{LIFE_KINDS[kind][0]}。到时来找我，收下你的成长。'
    task_id = data.get('task_id')
    require(isinstance(task_id, str) and task_id in state['life_tasks'], '这份现实委托不存在')
    task = state['life_tasks'][task_id]
    if action == 'life_cancel':
        require(task['status'] != 'claimed', '已结算的委托不能取消')
        if task['status'] == 'cancelled':
            return '这份委托已取消，没有消耗额度'
        task.update(status='cancelled', cancelled_at=now)
        return '委托已取消，预留额度已释放。这次不发放点数，准备好再出发。'
    require(task['status'] != 'cancelled', '这份委托已取消，不能结算')
    if task['status'] == 'claimed':
        return '这份委托已经结算，成长不会重复发放'
    require(now >= task['ready_at'], '约定时间还没到，请到期后再来结算')
    task.update(status='claimed', claimed_at=now, reward=task['hours'])
    state[LIFE_KINDS[task['kind']][1]] += task['hours']
    return f'委托完成，获得 {task["hours"]} {LIFE_KINDS[task["kind"]][2]}。每一步都算数。'

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
    shards = 0
    if kind == 'study':
        # Award shards at cumulative daily XP thresholds, independent of submission splitting.
        before = (daily[attribute] - earned) // 25
        shards = daily[attribute] // 25 - before
        state['knowledge_shard'] += shards
    state['activities'].append({'id': str(uuid.uuid4()), 'kind': kind, 'amount': amount, 'date': day_key, 'source': source, 'verified': False, 'note': note, 'xp': earned, 'knowledge_shards': shards, 'created_at': now})
    return f'记录已保存，获得 {earned} 点成长经验' if earned else '记录已保存，今日该属性奖励已达上限'

def apply(state, action, data, now):
    migrated = upgrade_state(state)
    state.clear()
    state.update(migrated)
    today = datetime.fromtimestamp(now, ZONE).date().isoformat()
    if action == 'create':
        require(state['character'] is None, '角色已创建')
        name = str(data.get('name', '')).strip()
        require(1 <= len(name) <= 16, '角色名称需为 1–16 字')
        # Append-only appearance IDs; 0–2 retain their original sprite bindings.
        appearance = integer(data.get('appearance', 0), 0, 5)
        state['character'] = {'name': name, 'appearance': appearance}
        settle_clock(state, now, True)
        state['quests']['settle_in']={'status':'active','accepted_at':now}
        return '新任务：给新生活一个落脚点。走近小屋门口按 E 进入，再收集 3 份木材。'
    require(state['character'] is not None, '请先创建角色')
    ensure_clock(state, now)
    if action in ["world_resume", "world_pause"]:
        owner = data.get('owner')
        require(isinstance(owner,str) and len(owner) <= 64 and len(owner) >= 8, '世界视图标识无效')
        if action == 'world_pause' and state['world_clock'].get('owner') != owner:
            return '当前由另一个世界视图管理时间'
        # Taking over from another view does not confirm its unseen final span.
        if action == 'world_resume' and state['world_clock'].get('owner') != owner:
            state['world_clock']['running_until'] = 0
        changed_owner = state['world_clock'].get('owner') != owner
        message = settle_clock(state, now, action == "world_resume")
        if action == 'world_pause' or changed_owner:
            state['village_combat']['last_tick'] = 0.
        state['world_clock']['owner'] = owner
        if action == "world_resume": release_encounter(state, now)
        return message or ("继续村庄时光" if action == "world_resume" else "村庄稍等片刻")
    if night_due(state, now):
        return settle_clock(state, now)
    location = state['location']
    if 'world_day' in data and data['world_day'] != clock_view(state, now)['day']:
        return '已经是新的一天，请重新选择操作。'
    if state['npc_encounter'] and state['npc_encounter']['until'] <= now:
        release_encounter(state, now)
    if action in ['cave_tick','gear_equip','gear_buy','gear_craft','gear_sell','spark_learn','gate_open','stone_recover','cave_retreat','cave_interact']:
        from .combat import command
        return command(state, action, data, now)
    if action in ['intro_toggle', 'intro_brief', 'intro_review']:
        from .village_intro import command
        return command(state, action, data)
    if action in ['npc_release', 'npc_keep']:
        lease = state['npc_encounter']
        if not lease or data.get('token') != lease['token']:
            return '对话已经结束'
        if action == 'npc_release':
            release_encounter(state, now)
            return '村民继续了自己的行程'
        require(near_resident(state, lease['id'], now), '请走近村民再继续交谈')
        lease['until'] = min(now + LEASE_SECONDS, lease['started_at'] + 300)
        return '继续交谈'
    if action in ['life_accept', 'life_claim', 'life_cancel']:
        return life_command(state, action, data, now)
    if action == 'move':
        require(not location.startswith('cave_'), '洞内移动由战斗输入确认')
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
    if action == 'knowledge_spend':
        branch = data.get('branch')
        require(branch in ['science', 'magic'], '请选择科学或魔法')
        expected = integer(data.get('expected_invested'), 0, 1000000)
        require(expected == sum(state['knowledge_growth'].values()), '研修进度已更新，请查看最新等级后再投入')
        require(state['knowledge_points'] > 0, '结算诺亚的学习委托后，就能获得知识点')
        state['knowledge_points'] -= 1
        state['knowledge_growth'][branch] += 1
        name = '科学' if branch == 'science' else '魔法'
        return f'{name}提升至 {state["knowledge_growth"][branch]} 级，已投入 1 知识点。'
    if action == 'skill_spend':
        branch = data.get('branch')
        require(isinstance(branch, str) and branch in SKILL_NAMES, '请选择种植、养殖或建造')
        expected = integer(data.get('expected_invested'), 0, 1000000)
        require(expected == sum(state['skill_growth'].values()), '技能进度已更新，请查看最新等级后再升级')
        cost = state['skill_growth'][branch] + 1
        require(state['skill_points'] >= cost, f'技能点不足，本次升级需要 {cost} 技能点')
        state['skill_points'] -= cost
        state['skill_growth'][branch] += 1
        return f'{SKILL_NAMES[branch]}提升至 {state["skill_growth"][branch]} 级，已消耗 {cost} 技能点。'
    if action == 'exercise_prepare':
        require(data.get('date', today) == today, '日期已经变化，请翻到今天再立下约定')
        task_id = 'exercise-' + today
        title = study_title(data.get('title'))
        minutes = integer(data.get('target_minutes'), 1, 120)
        previous = state['exercise_tasks'].get(task_id)
        if previous:
            require(previous['title'] == title and previous['target_minutes'] == minutes, '今天已有一项约定，完成它或安心休息，明天可以重新选择。')
            return '今天的约定已经保存'
        state['exercise_tasks'][task_id] = {'id': task_id, 'title': title, 'target_minutes': minutes,
            'date': today, 'timezone': 'Asia/Shanghai', 'created_at': now, 'completed_at': None}
        return '约定已写下。按自己的节奏完成，回来记下一笔。'
    if action in ['exercise_record', 'exercise_link']:
        task = exercise_task(state, data.get('task_id'))
        if action == 'exercise_link':
            record = next((a for a in state['activities'] if a['id'] == data.get('activity_id')), None)
            require(record is not None, '这条运动记录不存在')
        else:
            record_id = study_uuid(data.get('activity_id'))
            minutes = integer(data.get('minutes'), 1, 480)
            record = next((a for a in state['activities'] if a['id'] == record_id), None)
            if record:
                require(record.get('exercise_task_id') == task['id'] and record['amount'] == minutes, '记录标识已用于其他内容，请重新打开手札')
                return '这次运动已经保存，无需重复记录'
            require(task['completed_at'] is None, '约定已经完成；其他运动可以在现实成长中记录')
            activity(state, {'kind': 'exercise', 'amount': minutes, 'date': task['date'], 'note': task['title']}, now)
            record = state['activities'][-1]
            record['id'] = record_id
        return link_exercise(state, task, record, now)
    if action == 'health_spend':
        target = data.get('target', 'stamina')
        require(target in ['vitality', 'stamina'], '请选择生命值或体力值')
        expected = integer(data.get('expected_invested'), 0, 1000000)
        require(expected == state['health_invested'], '培养进度已更新，请查看最新上限后再选择')
        require(state['health_points'] > 0, '结算诺亚的运动委托后，就能获得健康点')
        if target == 'stamina':
            recover_stamina(state, now)
        state['health_points'] -= 1
        state['health_invested'] += 1
        state[target]['max'] += HEALTH_CAPACITY_GAIN
        state[target]['current'] += HEALTH_CAPACITY_GAIN
        name = '生命' if target == 'vitality' else '体力'
        return f'{name}上限提升至 {state[target]["max"]}，当前{name}增加 {HEALTH_CAPACITY_GAIN} 点。'
    if action == 'study_plan_create':
        plan_id = study_uuid(data.get('plan_id'))
        title = study_title(data.get('title'))
        minutes = integer(data.get('daily_minutes'), 1, 120)
        previous = state['study_plans'].get(plan_id)
        if previous:
            require(previous['title'] == title and previous['daily_minutes'] == minutes, '计划标识已被使用')
            return '这本计划已经记下了'
        require(len(state['study_plans']) < 100, '书架已放满 100 本计划')
        state['study_plans'][plan_id] = {'id': plan_id, 'title': title, 'daily_minutes': minutes,
            'created_at': now, 'archived_at': None}
        return '计划已装订，准备好就翻开今天的一页'
    if action in ['study_plan_edit', 'study_plan_archive', 'study_plan_today']:
        plan = study_plan(state, data.get('plan_id'))
        if action == 'study_plan_archive':
            archived = data.get('archived')
            require(isinstance(archived, bool), '请选择归档或取回')
            timer_task = state['study_tasks'].get((state['timer'] or {}).get('study_task_id'))
            require(not archived or not timer_task or timer_task.get('plan_id') != plan['id'], '请先结束这本计划的计时再归档')
            plan['archived_at'] = (plan['archived_at'] or now) if archived else None
            return '计划已归档，记录与成长都还在' if archived else '计划已放回书架'
        require(plan['archived_at'] is None, '请先取回这本计划')
        if action == 'study_plan_edit':
            plan['title'] = study_title(data.get('title'))
            plan['daily_minutes'] = integer(data.get('daily_minutes'), 1, 120)
            return '计划已更新，新的时长从下一页开始生效'
        # Stable per-plan/day identity makes retries and two-tab opening converge.
        task_id = str(uuid.uuid5(uuid.UUID(plan['id']), today))
        if task_id in state['study_tasks']:
            return '今天的书页已经在这里'
        require(sum(t['date'] == today for t in state['study_tasks'].values()) < 20, '今天已记下 20 项研习，先完成一项吧')
        previous = sorted((t for t in state['study_tasks'].values() if t.get('plan_id') == plan['id']), key=lambda t: t['created_at'], reverse=True)
        state['study_tasks'][task_id] = {'id': task_id, 'title': previous[0]['title'] if previous else plan['title'],
            'target_minutes': plan['daily_minutes'], 'date': today, 'timezone': 'Asia/Shanghai',
            'created_at': now, 'completed_at': None, 'archived_at': None, 'plan_id': plan['id']}
        return '今天的一页已翻开，之前的记录留在手记里'
    if action in ['study_edit', 'study_archive']:
        task = study_task(state, data.get('task_id'))
        require((state['timer'] or {}).get('study_task_id') != task['id'], '请先结束这一页的计时')
        if action == 'study_archive':
            archived = data.get('archived')
            require(isinstance(archived, bool), '请选择归档或取回')
            task['archived_at'] = (task['archived_at'] or now) if archived else None
            return '书页已收进手记' if archived else '书页已取回'
        study_writable(state, task)
        require(task['completed_at'] is None, '已完成的书页保留原来的约定')
        title = study_title(data.get('title'))
        minutes = integer(data.get('target_minutes'), 1, 120)
        task.update(title=title, target_minutes=minutes)
        completed = complete_study_task(state, task, now)
        return '这一页已完成；知识点请通过诺亚的现实委托获得' if completed else '这一页已修改，已有记录和成长保持不变'
    if action == 'study_create':
        task_id = data.get('task_id')
        require(isinstance(task_id, str) and len(task_id) == 36, '任务标识无效')
        try:
            require(str(uuid.UUID(task_id)) == task_id, '任务标识无效')
        except ValueError:
            raise RuleError('任务标识无效')
        title = data.get('title')
        require(isinstance(title, str) and 1 <= len(title.strip()) <= 80, '请写下 1–80 字的学习主题')
        title = title.strip()
        minutes = integer(data.get('target_minutes'), 1, 120)
        previous = state['study_tasks'].get(task_id)
        if previous:
            require(previous['title'] == title and previous['target_minutes'] == minutes, '任务标识已用于另一项研习')
            return '这项研习已经记下了'
        require(sum(t['date'] == today for t in state['study_tasks'].values()) < 20, '今天已记下 20 项研习，先完成一项吧')
        state['study_tasks'][task_id] = {'id': task_id, 'title': title, 'target_minutes': minutes,
            'date': today, 'timezone': 'Asia/Shanghai', 'created_at': now, 'completed_at': None, 'archived_at': None, 'plan_id': None}
        return '研习已记下，准备好就开始吧'
    if action == 'study_link':
        task = study_task(state, data.get('task_id'))
        study_writable(state, task)
        record = next((a for a in state['activities'] if a['id'] == data.get('activity_id')), None)
        require(record is not None and record['kind'] == 'study', '请选择一条学习记录')
        require(record['date'] == task['date'], '只能关联任务当天的学习记录')
        require(record.get('study_task_id') in [None, task['id']], '这条记录已经记入另一项研习')
        record['study_task_id'] = task['id']
        completed = complete_study_task(state, task, now)
        return '研习已记录；知识点请通过诺亚的现实委托获得' if completed else '记录已记入研习，已有成长不会重复发放'
    if action.startswith('timer_'):
        timer = state['timer']
        if action == 'timer_start':
            require(timer is None, '已有学习计时，请先结束')
            topic = str(data.get('topic', '')).strip()
            task_id = data.get('task_id')
            task = study_task(state, task_id) if task_id is not None else None
            if task:
                study_writable(state, task)
                require(task['completed_at'] is None, '这项研习已经完成，可以写下新的学习任务')
                topic = task['title']
            require(1 <= len(topic) <= 80, '请输入 1–80 字的学习主题')
            state['timer'] = {'id': str(uuid.uuid4()), 'topic': topic, 'elapsed': 0, 'started_at': now, 'running': True, 'study_task_id': task_id}
            return '学习计时已开始'
        require(timer is not None, '没有进行中的学习计时')
        require(data.get('timer_id', timer['id']) == timer['id'], '学习计时已改变，请刷新后重试')
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
            if minutes:
                record = state['activities'][-1]
                record['timer_id'] = timer['id']
                if timer.get('study_task_id'):
                    task = study_task(state, timer['study_task_id'])
                    record['study_task_id'] = task['id']
                    if complete_study_task(state, task, now):
                        message += '；研习已记录，知识点由现实委托结算'
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
        giver = next((o for o in map_for(location, state, now)['objects'] if o['id'] == quest['giver']), None)
        require(giver is not None and math.hypot(state['position']['x']-giver['x'],state['position']['y']-giver['y']) <= 72, '请到发布任务的 NPC 或告示板旁接取、交付')
        view = next(q for q in quest_views(state) if q['id'] == quest['id'])
        if action == 'quest_accept':
            require(view['status'] == 'available', '任务尚未开放或已经接取')
            state['quests'][quest['id']]={'status':'active','accepted_at':now}
            state['tracked_quest']=quest['id']
            if quest['id'] == 'leave_valley':
                state['village_intro']['briefed'] = True
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
    obj = next((o for o in map_for(location, state, now)['objects'] if o['id'] == data.get('target')), None)
    require(obj is not None, '交互对象不存在')
    require(math.hypot(state['position']['x']-obj['x'], state['position']['y']-obj['y']) <= 72, '请先走近这个对象')
    target = obj['id']
    if action == 'travel':
        from .journey import travel
        return travel(state, data, now)
    if action in ['market_trade', 'market_deliver']:
        require(location == 'shop' and target in ['mira', 'shop_counter'], '请到风铃杂货铺的寄售柜台办理')
        market = market_view(state, now)
        if action == 'market_trade':
            side, item = data.get('side'), data.get('item')
            require(isinstance(side, str) and side in ['buy', 'sell'], '请选择买入或卖出')
            require(isinstance(item, str) and item in market[side], '小铺不交易这种物品')
            amount = integer(data.get('amount', 1), 1, 99)
            total = market[side][item] * amount
            spend(state, {'gold': total} if side == 'buy' else {item: amount})
            if side == 'buy':
                state['inventory'][item] += amount
                return f'买入 {amount} 份种子，花费 {total} 金币。'
            state['inventory']['gold'] += total
            bump(state, 'market_sold', amount)
            bump(state, 'trade_income', total)
            if item == 'crop':
                bump(state, 'sold', amount)
            return f'出售 {amount} 份物品，获得 {total} 金币。'
        require(data.get('date') == market['date'], '小铺已换上今天的新订单，请刷新后重新查看')
        order = next((o for o in market['orders'] if o['id'] == data.get('order_id')), None)
        require(order is not None, '这份订单不存在')
        require(not order['completed'], '今天这份订单已经交付，明天再来看看吧')
        spend(state, {order['item']: order['amount']})
        state['market_orders'][order['id']] = market['date']
        state['inventory']['gold'] += order['gold']
        bump(state, 'deliveries')
        bump(state, 'trade_income', order['gold'])
        return f'订单完成：{order["title"]}，获得 {order["gold"]} 金币。'
    if action == 'enter':
        require(location == 'overworld' and obj['kind'] == 'building' and target in INTERIORS, '这里没有可以进入的建筑')
        state['location']=target
        state['position']=dict(INTERIORS[target]['spawn'])
        remember(state, 'visited_'+target)
        if target == 'workshop' and state['village_intro']['first_clear'] and state['inventory'].get('gel', 0) > 0:
            state['village_intro']['returned'] = True
        return f'进入{obj["name"]} · 走近家具按 E 互动，门口可返回户外'
    if action == 'exit':
        require(location != 'overworld' and obj['kind'] == 'exit', '请走到门口离开')
        door=next(o for o in OBJECTS if o['id']==location)
        state['location']='overworld'
        state['position']={'x':door['x'],'y':door['y']+12}
        return '回到了户外'
    if action in ['rest', 'short_rest']:
        require(target in ['home_bed','inn_bed'], '请走近床铺')
        day = integer(data.get('expected_day'), 1, 1000000000)
        require(day == clock_view(state, now)['day'], '日期已经变化，请重新打开床边面板。')
        if target == 'inn_bed':
            require(action == 'rest', '旅店客房只提供整夜住宿')
            require(state['departure']['booking_day'] == day, '今晚还没有订房，请先找岚姨支付 8 金币')
            settle_clock(state, now, False)
            remember(state, 'slept_inn')
            return finish_day(state, now, 'sleep', destination='inn')
        settle_clock(state, now, False)
        if action == 'rest':
            return finish_day(state, now, 'sleep')
        total = 360 + state['world_clock']['elapsed'] * 1440 / DAY_SECONDS
        require(total % 1440 + (1440 if total % 1440 < 360 else 0) + SHORT_REST_MINUTES < 1500,
                '离 01:00 太近了，请直接睡到明早。')
        state['world_clock']['elapsed'] += SHORT_REST_MINUTES * DAY_SECONDS / 1440
        state['stamina']['current'] = min(state['stamina']['max'], state['stamina']['current'] + 20)
        state['stamina']['updated_at'] = now
        state['vitality']['current'] = min(state['vitality']['max'], state['vitality']['current'] + 10)
        return '小憩了 30 游戏分钟，体力 +20、生命 +10（不超过上限）；作物仍按现实时间生长。'
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
        recover_stamina(state, now)
        cost = GATHER_COSTS[obj['kind']]
        require(state['stamina']['current'] >= cost, f'体力不足，需要 {cost} 点。回家睡觉可补满，也会随时间自然恢复。')
        state['stamina']['current'] -= cost
        quantity = 3 + int(state['attributes']['strength'] >= 50)
        state['inventory'][obj['kind']] += quantity
        bump(state,obj['kind'],quantity)
        if 'first_gather' not in state['events']:
            state['events'].append('first_gather')
        state['gathered'][target] = now + 30
        return f'采集成功，获得 {quantity} 份' + ('木材' if obj['kind'] == 'wood' else '石料') + f' · 体力 −{cost}'
    if action == 'talk':
        require(obj['kind'] == 'npc', '这不是可交谈的角色')
        if state['npc_days'].get(target) != today:
            state['relationships'][target] += 1
            state['npc_days'][target] = today
            grant_xp(state, 'bond', 5)
        line = greeting(state, target, now)
        settle_clock(state, now, False)
        release_encounter(state, now)
        state['npc_encounter'] = {'id':target,'token':str(uuid.uuid4()),'location':location,
                                  'x':obj['x'],'y':obj['y'],'started_at':now,'until':now+LEASE_SECONDS}
        return line
    if action in ['npc_topic', 'npc_gift', 'npc_help']:
        require(target in RESIDENTS, '这不是村里的居民')
        resident = RESIDENTS[target]
        if action == 'npc_topic':
            topic = data.get('topic')
            require(topic in ['today','interest','memory','routine'], '这个话题还没有准备好')
            if topic == 'today': return greeting(state, target, now)
            if topic == 'memory':
                require(state['relationships'].get(target,0) >= 5, '熟悉度达到 5 后，可以聊聊心里的故事')
                return resident['memory']
            if topic == 'routine':
                return '我会按自己的节奏工作、散步、歇脚。村民近况里记着我的安排，地图也能找到我。和你聊天时，我会多停一会儿。'
            return resident['interest']
        if action == 'npc_gift':
            require(state['npc_gifts'].get(target) != today, '今天已经送过心意，明天再来吧')
            item = data.get('item')
            require(isinstance(item,str) and item in ['wood','stone','plank','crop','seed'], '请选择一份背包里的物品')
            spend(state, {item:1})
            gain = 2 if item == resident['favorite'] else 1
            state['npc_gifts'][target] = today
            state['relationships'][target] = state['relationships'].get(target,0)+gain
            reaction = '这正是我最喜欢的，谢谢你记得！' if gain == 2 else '谢谢你想着我，这份心意我收下了。'
            return f'{resident["name"]}：{reaction} 熟悉度 +{gain}。'
        require(state['npc_helped'].get(target) != today, '今天已经一起忙过了，明天再来吧')
        recover_stamina(state, now)
        require(state['stamina']['current'] >= 4, '帮忙需要 4 点体力，先歇一会儿吧')
        state['stamina']['current'] -= 4
        state['npc_helped'][target] = today
        state['relationships'][target] = state['relationships'].get(target,0)+1
        return f'{resident["name"]}：{resident["help_reply"]} 体力 −4，熟悉度 +1。'
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
