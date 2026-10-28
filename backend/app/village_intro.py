"""Optional first expedition guidance; milestones never grant or consume resources."""


def ensure_intro(state):
    combat = state['village_combat']
    intro = state.setdefault('village_intro', {
        'version': 1,
        # Existing experienced saves are left in free play. They can opt back in.
        'dismissed': bool(combat['unlocked'] > 1 or combat['gate_open'] or combat['boss_first']),
        'briefed': bool(state.get('quests', {}).get('leave_valley') or combat['gate_open']),
        'first_clear': combat['unlocked'] > 1,
        'returned': False,
        'reviewed': False,
    })
    if intro['first_clear'] and state.get('location') == 'workshop' and state['inventory'].get('gel', 0) > 0:
        intro['returned'] = True
    return intro


def command(state, action, data):
    from .rules import require
    from .combat import near_service
    intro = ensure_intro(state)
    if action == 'intro_toggle':
        require(isinstance(data.get('dismissed'), bool), '请选择收起或继续引导')
        intro['dismissed'] = data['dismissed']
        return '初探引导已收起，可在旅人指南继续。' if intro['dismissed'] else '初探引导已继续，已有进度保留。'
    require(state['quests'].get('settle_in', {}).get('status') == 'claimed', '先交付安家任务，再准备第一次远行')
    if action == 'intro_brief':
        from .quests import quest_views
        require(state.get('quest_story', {}).get('legacy_departure') or any(q['id'] == 'gate_story' for q in quest_views(state)), '先完成初探回顾，再循线调查石门')
        target = data.get('target')
        require(target in ['board', 'village_departure'], '请在告示板或村东石门了解远行条件')
        require(target == 'village_departure' or state.get('quest_story', {}).get('legacy_departure'), '请亲自到村东石门调查旧纹路')
        near_service(state, target, ['overworld'])
        intro['briefed'] = True
        if target == 'village_departure' and 'quest_gate_read' not in state['events']:
            state['events'].append('quest_gate_read')
        return '已记下：底层守卫的魔法石＋魔法3级开启石门；购买武器、初探山洞不要求魔法等级。'
    require(action == 'intro_review', '未知初探操作')
    near_service(state, 'armory_counter', ['workshop'])
    require(intro['first_clear'] and intro['returned'], '先清理山洞首层，带材料回到工坊')
    intro['reviewed'] = True
    return '第一次初探已记下。材料仍在原处；可继续探洞，或先找诺亚安排现实学习委托。'
