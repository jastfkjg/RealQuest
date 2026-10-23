"""Accepted sword direction, contact/recovery and dodge cancellation contracts."""
import copy
import math

import pytest

from app.combat import WEAPONS, hurt_player
from app.world import clear_path, walkable
from test_combat import combat_ready, combat_step


def ready_sword(weapon='stone_sword'):
    state, combat = combat_ready(weapon)
    for enemy in combat['floors']['1']:
        enemy.update(x=500, y=240, phase='recover', until=50)
    return state, combat, combat['floors']['1']


def advance(state, seconds, **intent):
    combat_step(state, state['village_combat']['last_tick'] + seconds, **intent)


@pytest.mark.parametrize('dx,dy', [(0, 1), (0, -1), (-1, 0), (1, 0)])
def test_sword_hits_locked_player_direction_in_each_cardinal_direction(dx, dy):
    state, combat, enemies = ready_sword()
    x, y = state['position']['x'], state['position']['y']
    for enemy, (vx, vy) in zip(enemies, [(dx*30, dy*30), (-dx*20, -dy*20), (-dy*30, dx*30)]):
        enemy.update(x=x+vx, y=y+vy)
    advance(state, .1, attack=True, aim_x=x+dx*100, aim_y=y+dy*100)
    assert combat['action']['angle'] == pytest.approx(math.atan2(dy, dx))
    assert all(enemy['hp'] == 18 for enemy in enemies)

    # Turning the next input toward the closer enemy cannot redirect a swing
    # already underway. A side/rear enemy is not an implicit selected target.
    advance(state, .15, aim_x=x-dx*100, aim_y=y-dy*100)
    assert [enemy['hp'] for enemy in enemies] == [10, 18, 18]
    assert [event['enemy'] for event in combat['effects'] if event['kind'] == 'hit'] == [enemies[0]['id']]


@pytest.mark.parametrize('weapon', ['stone_sword', 'reinforced_sword', 'crystal_sword'])
def test_sword_action_covers_catalog_windup_and_full_recovery(weapon):
    state, combat, _ = ready_sword(weapon)
    advance(state, .1, attack=True, aim_x=250, aim_y=240)
    action = combat['action']
    assert action['started'] == combat['time']
    assert action['hit_at'] == combat['cast']['until']
    assert action['hit_at']-action['started'] == pytest.approx(WEAPONS[weapon]['windup'])
    assert action['until'] == combat['attack_at']
    assert action['until']-action['started'] == pytest.approx(WEAPONS[weapon]['interval'])


@pytest.mark.parametrize('polls', [[.15], [.03, .04, .08]])
def test_sword_contact_lands_at_advertised_time_once_across_polling_rates(polls):
    state, combat, enemies = ready_sword()
    enemies[0].update(x=250, y=240)
    advance(state, .1, attack=True, aim_x=300, aim_y=240)
    hit_at = combat['action']['hit_at']
    for seconds in polls:
        advance(state, seconds)
    assert enemies[0]['hp'] == 10
    assert enemies[0]['hit_until']-.22 == pytest.approx(hit_at, abs=1e-10)
    assert combat['cast'] is None

    advance(state, .15)
    assert enemies[0]['hp'] == 10
    assert len([event for event in combat['effects'] if event['kind'] == 'hit']) == 1


def test_sword_does_not_damage_before_contact_and_cannot_repeat_during_recovery():
    state, combat, enemies = ready_sword()
    enemies[0].update(x=248, y=240)
    advance(state, .1, attack=True, aim_x=300, aim_y=240)
    action = copy.deepcopy(combat['action'])
    advance(state, action['hit_at']-combat['time']-.001, attack=True)
    assert enemies[0]['hp'] == 18
    assert not any(event['kind'] == 'hit' for event in combat['effects'])
    advance(state, .002, attack=True)
    assert enemies[0]['hp'] == 10
    advance(state, .2, attack=True)
    advance(state, action['until']-combat['time']-.001, attack=True)
    assert combat['action']['seq'] == action['seq']
    assert combat['cast'] is None
    advance(state, .002, attack=True)
    assert combat['action']['seq'] != action['seq']
    assert combat['action']['started'] >= action['until']
    assert enemies[0]['hp'] == 10


def test_sword_front_arc_does_not_hit_just_outside_its_displayed_cone():
    state, _, enemies = ready_sword()
    for enemy, angle in zip(enemies, [.94, .96, math.pi]):
        enemy.update(x=220+30*math.cos(angle), y=240+30*math.sin(angle))
    advance(state, .1, attack=True, aim_x=300, aim_y=240)
    advance(state, .15)
    assert [enemy['hp'] for enemy in enemies] == [10, 18, 18]


def test_sword_miss_behind_pillar_corner_has_no_confirmed_hit_or_reward():
    state, combat, enemies = ready_sword()
    state['position'] = dict(x=278, y=90)
    enemies[0].update(x=298, y=72)
    assert walkable(278, 90, 'cave_1') and walkable(298, 72, 'cave_1')
    assert not clear_path(state['position'], enemies[0], 'cave_1')
    inventory = copy.deepcopy(state['inventory'])
    advance(state, .1, attack=True, aim_x=298, aim_y=72)
    advance(state, .15)
    assert enemies[0]['hp'] == 18 and state['inventory'] == inventory
    assert [event['kind'] for event in combat['effects']] == ['miss']


def test_dodge_cancels_unresolved_sword_without_phantom_hit_or_cooldown_reset():
    state, combat, enemies = ready_sword()
    enemies[0].update(x=250, y=240, hp=8)
    inventory = copy.deepcopy(state['inventory'])
    advance(state, .1, attack=True, aim_x=300, aim_y=240)
    attack_at = combat['attack_at']
    advance(state, .04, dodge=True, dodge_x=0, dodge_y=1, attack=True)
    assert combat['cast'] is None and combat['action'] is None
    assert combat['attack_at'] == attack_at
    advance(state, .2, attack=True)
    assert combat['cast'] is None and combat['attack_at'] == attack_at
    assert enemies[0]['hp'] == 8 and not enemies[0].get('rewarded')
    assert state['inventory'] == inventory
    assert not any(event['kind'] in ['hit', 'miss', 'defeat'] for event in combat['effects'])

    advance(state, attack_at-combat['time']+.001, attack=True)
    assert combat['cast']['kind'] == 'weapon'
    assert combat['action']['started'] >= attack_at


@pytest.mark.parametrize('polls', [[.2], [.07, .06, .07]])
def test_dodge_distance_and_duration_do_not_shrink_with_polling_boundary(polls):
    state, combat, _ = ready_sword()
    x = state['position']['x']
    advance(state, .01, dodge=True, dodge_x=1, dodge_y=0)
    started = combat['dash']['started']
    assert state['position']['x'] == x
    for seconds in polls:
        advance(state, seconds)
    assert combat['dash'] is None
    assert state['position']['x'] == pytest.approx(x+360*.18, abs=1e-8)
    assert combat['dodge_at'] == pytest.approx(started+1.15)


def test_dodge_immunity_ends_before_motion_and_rejected_repeat_keeps_cooldown():
    state, combat, _ = ready_sword()
    advance(state, .1, dodge=True, dodge_x=1, dodge_y=0)
    dodge_at = combat['dodge_at']
    assert not hurt_player(state, 5)
    advance(state, .139, dodge=True, dodge_x=1, dodge_y=0)
    assert not hurt_player(state, 5) and combat['dodge_at'] == dodge_at
    advance(state, .002)
    assert combat['dash'] is not None and hurt_player(state, 5)


def test_dodge_after_elapsed_contact_keeps_confirmed_hit_and_single_reward():
    state, combat, enemies = ready_sword()
    enemies[0].update(x=250, y=240, hp=8)
    inventory = copy.deepcopy(state['inventory'])
    advance(state, .1, attack=True, aim_x=300, aim_y=240)
    action = copy.deepcopy(combat['action'])
    advance(state, .15, dodge=True, dodge_x=0, dodge_y=1)
    assert enemies[0]['hp'] == 0 and enemies[0]['rewarded']
    assert enemies[0]['dead_at'] == pytest.approx(action['hit_at'], abs=1e-10)
    assert combat['dash']['started'] == combat['time'] > action['hit_at']
    assert combat['action'] is None and combat['cast'] is None
    assert combat['attack_at'] == action['until']
    assert state['inventory']['gel'] == inventory['gel']+1
    assert state['inventory']['gold'] == inventory['gold']+2
    advance(state, .2)
    assert state['inventory']['gel'] == inventory['gel']+1
    assert state['inventory']['gold'] == inventory['gold']+2
    assert len([event for event in combat['effects'] if event['kind'] == 'hit']) == 1


def test_dodge_cannot_retroactively_prevent_an_elapsed_enemy_contact():
    state, combat, enemies = ready_sword()
    enemies[0].update(x=244, y=240, phase='windup', until=.06, tx=220, ty=240, style='slam')
    health = state['vitality']['current']
    advance(state, .1, dodge=True, dodge_x=0, dodge_y=1)
    assert state['vitality']['current'] == health-5
    assert combat['dash']['started'] == combat['time']
