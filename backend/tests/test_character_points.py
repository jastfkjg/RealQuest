import copy
from concurrent.futures import ThreadPoolExecutor
import uuid
import pytest
from test_game import client, cmd, create, fresh
from app.rules import apply, upgrade_state, character_growth_options, RuleError
from app.db import Session
from app.models import Player
from app.main import app
from fastapi.testclient import TestClient
from sqlalchemy import select


def seed_points():
    with Session.begin() as db:
        player = db.scalar(select(Player))
        state = upgrade_state(player.state)
        state.update(health_points=3, knowledge_points=2, skill_points=6)
        player.state = state


def test_legacy_upgrade_is_additive_and_idempotent():
    state = fresh()
    state.pop('vitality'); state.pop('skill_growth')
    state['xp'] = 200; state['attributes']['strength'] = 150
    state['health_points'] = 8; state['stamina']['max'] = 135; state['health_invested'] = 7
    original = copy.deepcopy(state)
    upgraded = upgrade_state(state)
    assert state == original
    assert upgraded['vitality'] == {'current': 100, 'max': 100}
    assert upgraded['skill_growth'] == {'planting': 0, 'ranching': 0, 'building': 0}
    assert all(upgraded[k] == v for k, v in original.items())
    assert upgrade_state(upgraded) == upgraded


def test_skill_price_increases_per_branch_without_xp():
    state = fresh(); state['skill_points'] = 9
    legacy = {key: copy.deepcopy(state[key]) for key in ['xp', 'attributes', 'inventory', 'plots', 'buildings', 'knowledge_growth', 'health_points']}
    for branch, expected, cost in [('planting', 0, 1), ('planting', 1, 2), ('ranching', 2, 1), ('planting', 3, 3), ('building', 4, 1)]:
        quote = character_growth_options(state)[branch]
        assert quote['cost'] == cost
        before = state['skill_points']
        apply(state, 'skill_spend', {'branch': branch, 'expected_invested': expected, 'cost': 0, 'level': 999}, 100)
        assert state['skill_points'] == before - cost
        assert state['skill_growth'][branch] == quote['next']
    assert state['skill_growth'] == {'planting': 3, 'ranching': 1, 'building': 1}
    assert state['skill_points'] == 1
    assert all(state[key] == value for key, value in legacy.items())
    before = copy.deepcopy(state)
    with pytest.raises(RuleError):
        apply(state, 'skill_spend', {'branch': 'planting', 'expected_invested': 5}, 100)
    assert state == before


@pytest.mark.parametrize('action,data', [
    ('skill_spend', {'branch': 'unknown', 'expected_invested': 0}),
    ('skill_spend', {'branch': [], 'expected_invested': 0}),
    ('skill_spend', {'branch': 'planting', 'expected_invested': True}),
    ('skill_spend', {'branch': 'planting', 'expected_invested': -1}),
    ('skill_spend', {'branch': 'planting', 'expected_invested': 1}),
    ('skill_spend', {'branch': 'planting'}),
    ('health_spend', {'target': 'skill_points', 'expected_invested': 0}),
    ('health_spend', {'target': 'vitality', 'expected_invested': 1}),
])
def test_rejected_purchase_does_not_change_save_or_ledger(client, action, data):
    create(client); seed_points()
    before = client.get('/api/export').json()
    assert cmd(client, action, data).status_code == 422
    assert client.get('/api/export').json() == before


def test_vitality_and_legacy_stamina_purchase_are_separate(client):
    create(client); seed_points()
    before = client.get('/api/state').json()['state']
    hp = cmd(client, 'health_spend', {'target': 'vitality', 'expected_invested': 0}).json()['state']
    assert hp['vitality'] == {'current': 105, 'max': 105}
    assert hp['stamina']['max'] == before['stamina']['max'] and hp['health_points'] == 2
    stamina = cmd(client, 'health_spend', {'expected_invested': 1}).json()['state']
    assert stamina['stamina']['current'] == stamina['stamina']['max'] == 105
    assert stamina['vitality'] == hp['vitality']
    assert stamina['health_points'] == 1 and stamina['health_invested'] == 2
    assert stamina['xp'] == before['xp'] and stamina['attributes'] == before['attributes']


def test_concurrent_spends_replay_receipts_and_credential_persistence(client):
    create(client); seed_points()
    def spend(branch):
        return cmd(client, 'skill_spend', {'branch': branch, 'expected_invested': 0}).status_code
    with ThreadPoolExecutor(2) as pool:
        assert sorted(pool.map(spend, ['planting', 'ranching'])) == [200, 422]
    current = client.get('/api/state').json()['state']
    key = str(uuid.uuid4()); data = {'branch': 'building', 'expected_invested': 1}
    for _ in range(2):
        result = cmd(client, 'skill_spend', data, key)
        assert result.status_code == 200
    saved = result.json()['state']
    assert result.json()['replayed']
    assert saved['skill_points'] == 4 and sum(saved['skill_growth'].values()) == 2
    assert saved['xp'] == current['xp']
    purchases = [r for r in client.get('/api/export').json()['ledger'] if r['action'] == 'skill_spend']
    assert sum(r['changes']['skill_points'] for r in purchases) == -2
    assert sum(sum(r['changes']['skill_growth'].values()) for r in purchases) == 2
    assert saved['character_growth_options']['building']['cost'] == 2
    credential = client.post('/api/recovery-file').json()['recovery_key']
    with TestClient(app) as restored:
        assert restored.post('/api/recover', json={'recovery_key': credential}).status_code == 200
        assert restored.get('/api/state').json()['state'] == saved


def test_shared_health_balance_rejects_stale_cross_target_spend(client):
    create(client); seed_points()
    with ThreadPoolExecutor(2) as pool:
        codes = list(pool.map(lambda target: cmd(client, 'health_spend', {'target': target, 'expected_invested': 0}).status_code, ['vitality', 'stamina']))
    assert sorted(codes) == [200, 422]
    saved = client.get('/api/state').json()['state']
    assert saved['health_points'] == 2
    assert saved['vitality']['max'] + saved['stamina']['max'] == 205
