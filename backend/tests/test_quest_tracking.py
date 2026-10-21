"""Accepting a quest never changes the player's explicit tracking choice."""
import copy
import pytest
from app.rules import initial_state, apply, upgrade_state, RuleError
from app.quests import quest_views
from app.world import map_for

NOW = 1800000000


def player():
    state = initial_state()
    apply(state, 'create', {'name': '委托旅人'}, NOW)
    state['world_clock']['running_until'] = 0
    board = next(o for o in map_for('overworld')['objects'] if o['id'] == 'board')
    state['position'] = {'x': board['x'], 'y': board['y']}
    return state


@pytest.mark.parametrize('tracked', ['leave_valley', 'craft_home', None])
def test_side_accept_preserves_tracking_resources_and_reload(tracked):
    state = player()
    state['quests'].update(settle_in={'status': 'claimed'},
                           leave_valley={'status': 'active'}, craft_home={'status': 'active'})
    state['tracked_quest'] = tracked
    before = copy.deepcopy(state)
    message = apply(state, 'quest_accept', {'quest_id': 'first_harvest'}, NOW)
    before['quests']['first_harvest'] = {'status': 'active', 'accepted_at': NOW}
    assert state == before
    assert '当前追踪保持不变' in message
    assert upgrade_state(state) == state
    with pytest.raises(RuleError):
        apply(state, 'quest_accept', {'quest_id': 'first_harvest'}, NOW)
    assert state == before
    apply(state, 'track_quest', {'quest_id': 'first_harvest'}, NOW)
    before['tracked_quest'] = 'first_harvest'
    assert state == before


def test_main_accept_also_requires_explicit_tracking_and_keeps_briefing():
    state = player()
    state['quests']['settle_in']['status'] = 'claimed'
    state['quests']['craft_home'] = {'status': 'active'}
    state['tracked_quest'] = 'craft_home'
    apply(state, 'quest_accept', {'quest_id': 'leave_valley'}, NOW)
    assert state['tracked_quest'] == 'craft_home'
    assert state['village_intro']['briefed']
    apply(state, 'track_quest', {'quest_id': 'leave_valley'}, NOW)
    assert upgrade_state(state)['tracked_quest'] == 'leave_valley'
    kinds = {q['id']: q['kind'] for q in quest_views(state)}
    assert {id for id, kind in kinds.items() if kind == 'main'} == {'settle_in', 'leave_valley'}
    assert all(kind == 'side' for id, kind in kinds.items() if id not in {'settle_in', 'leave_valley'})
