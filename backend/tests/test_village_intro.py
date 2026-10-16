import copy
import pytest
from app.rules import initial_state, apply, upgrade_state, RuleError
from app.combat import floor_enemies, defeated, combat_view
from app.world import map_for

NOW = 1800000000


def player():
    state = initial_state()
    apply(state, 'create', {'name': '初探旅人'}, NOW)
    state['world_clock']['running_until'] = 0
    return state


def at(state, location, target):
    state['location'] = location
    obj = next(o for o in map_for(location)['objects'] if o['id'] == target)
    state['position'] = {'x': obj['x'], 'y': obj['y']}


def settle(state):
    at(state, 'overworld', 'home')
    apply(state, 'enter', {'target': 'home'}, NOW)
    at(state, 'overworld', 'wood_1')
    apply(state, 'gather', {'target': 'wood_1'}, NOW)
    at(state, 'overworld', 'board')
    apply(state, 'quest_claim', {'quest_id': 'settle_in'}, NOW)


def clear_first(state):
    at(state, 'overworld', 'cave_entry')
    apply(state, 'cave_interact', {'target': 'cave_entry'}, NOW)
    enemies = floor_enemies(state, NOW)
    for enemy in enemies:
        enemy['hp'] = 0
        defeated(state, enemy)


def test_real_settlement_brief_purchase_clear_return_and_review_conserve_resources():
    state = player()
    settle(state)
    assert state['inventory']['gold'] == 32
    apply(state, 'quest_accept', {'quest_id': 'leave_valley'}, NOW)
    assert state['village_intro']['briefed']
    at(state, 'workshop', 'armory_counter')
    apply(state, 'gear_buy', {'target': 'armory_counter', 'item': 'stone_sword'}, NOW)
    apply(state, 'gear_equip', {'item': 'stone_sword'}, NOW)
    clear_first(state)
    assert state['village_intro']['first_clear']
    assert state['inventory']['gel'] == 3
    apply(state, 'cave_retreat', {}, NOW)
    assert not state['village_intro']['returned']  # Quarry entrance is not the village workshop.
    at(state, 'overworld', 'workshop')
    apply(state, 'enter', {'target': 'workshop'}, NOW)
    assert state['village_intro']['returned']
    at(state, 'workshop', 'armory_counter')
    before = copy.deepcopy(state)
    apply(state, 'intro_review', {}, NOW)
    assert state['village_intro']['reviewed']
    before['village_intro']['reviewed'] = True
    assert state == before
    apply(state, 'intro_review', {}, NOW)
    assert state == before
    assert state['knowledge_growth']['magic'] == 0 and not state['village_combat']['gate_open']


def test_briefing_and_review_reject_remote_or_unearned_progress():
    state = player()
    with pytest.raises(RuleError):
        apply(state, 'intro_brief', {'target': 'board'}, NOW)
    settle(state)
    at(state, 'home', 'home_bed')
    before = copy.deepcopy(state)
    with pytest.raises(RuleError):
        apply(state, 'intro_brief', {'target': 'board'}, NOW)
    assert state == before
    at(state, 'workshop', 'armory_counter')
    with pytest.raises(RuleError):
        apply(state, 'intro_review', {}, NOW)
    assert not state['village_intro']['reviewed']


def test_gate_briefing_toggle_and_reload_never_change_balances_or_quest_tracking():
    state = player()
    settle(state)
    at(state, 'overworld', 'village_departure')
    before = copy.deepcopy(state)
    apply(state, 'intro_brief', {'target': 'village_departure'}, NOW)
    before['village_intro']['briefed'] = True
    assert state == before
    for dismissed in [True, False, False]:
        apply(state, 'intro_toggle', {'dismissed': dismissed}, NOW)
        before['village_intro']['dismissed'] = dismissed
        assert upgrade_state(state) == before
    with pytest.raises(RuleError):
        apply(state, 'intro_toggle', {'dismissed': 'false'}, NOW)


def test_partial_loot_defeat_and_next_day_do_not_fake_first_clear_or_reset_it():
    state = player()
    at(state, 'overworld', 'cave_entry')
    apply(state, 'cave_interact', {'target': 'cave_entry'}, NOW)
    enemy = floor_enemies(state, NOW)[0]
    enemy['hp'] = 0
    defeated(state, enemy)
    assert not state['village_intro']['first_clear']
    apply(state, 'cave_retreat', {}, NOW)
    clear_first(state)
    assert state['village_intro']['first_clear']
    state['world_clock']['elapsed'] += 1800
    combat_view(state, NOW)
    assert state['village_intro']['first_clear']


def test_workshop_return_requires_authoritative_first_clear_and_carried_material():
    state = player()
    state['inventory']['gel'] = 3
    at(state, 'overworld', 'workshop')
    apply(state, 'enter', {'target': 'workshop'}, NOW)
    assert not state['village_intro']['returned']
    clear_first(state)
    state['storage']['gel'], state['inventory']['gel'] = state['inventory']['gel'], 0
    at(state, 'overworld', 'workshop')
    apply(state, 'enter', {'target': 'workshop'}, NOW)
    assert not state['village_intro']['returned']


def test_existing_cave_save_can_resume_at_workshop_without_losing_carried_loot():
    state = player()
    settle(state)
    clear_first(state)
    at(state, 'workshop', 'armory_counter')
    state.pop('village_intro')
    inventory = copy.deepcopy(state['inventory'])
    state = upgrade_state(state)
    assert state['village_intro']['dismissed'] and state['village_intro']['returned']
    apply(state, 'intro_toggle', {'dismissed': False}, NOW)
    apply(state, 'intro_review', {}, NOW)
    assert state['village_intro']['reviewed'] and state['inventory'] == inventory


@pytest.mark.parametrize('advanced', ['unlocked', 'gate_open', 'boss_first'])
def test_old_save_keeps_real_progress_and_defaults_to_optional_guidance(advanced):
    state = player()
    state.pop('village_intro')
    state['village_combat'][advanced] = 2 if advanced == 'unlocked' else True
    before = copy.deepcopy(state)
    restored = upgrade_state(state)
    assert restored['village_intro']['dismissed']
    assert not restored['village_intro']['reviewed']
    restored.pop('village_intro')
    assert restored == before
