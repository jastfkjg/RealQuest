"""Server time, quota, reward conservation and concurrency for NPC commissions."""
import copy
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from zoneinfo import ZoneInfo
import pytest
from sqlalchemy import select
from fastapi.testclient import TestClient
from test_game import client, cmd, create, fresh
from app.main import app
from app.db import Session
from app.models import Player
from app.rules import apply, RuleError, upgrade_state, life_task_views

NOW = datetime(2026, 10, 14, 13, tzinfo=ZoneInfo('Asia/Shanghai')).timestamp()

def at_noah(s):
    s['location'], s['position'] = 'overworld', {'x': 576, 'y': 420}

def accept(s, hours=2, kind='study', now=NOW):
    key = str(uuid.uuid4())
    apply(s, 'life_accept', {'target': 'noah', 'task_id': key, 'hours': hours, 'kind': kind}, now)
    return key

def npc_client(client):
    with Session.begin() as db:
        player = db.scalar(select(Player)); state = copy.deepcopy(player.state)
        at_noah(state); player.state = state

def test_boundary_time_and_remaining_quota_after_spending():
    s = fresh(); at_noah(s); first = accept(s)
    assert s['life_tasks'][first]['ready_at'] == NOW + 7200
    assert life_task_views(s, NOW)['remaining'] == 3
    for now in [NOW - 1000, NOW, NOW + 7199.999]:
        with pytest.raises(RuleError): apply(s, 'life_claim', {'target': 'noah', 'task_id': first, 'now': NOW + 99999}, now)
        assert s['knowledge_points'] == 0
    with pytest.raises(RuleError): accept(s, 1)
    apply(s, 'life_claim', {'target': 'noah', 'task_id': first}, NOW + 7200)
    assert s['knowledge_points'] == 2
    with pytest.raises(RuleError): accept(s, 4, now=NOW + 7200)
    second = accept(s, 3, 'work', NOW + 7200)
    apply(s, 'life_claim', {'target': 'noah', 'task_id': second}, NOW + 18000)
    assert s['skill_points'] == 3 and life_task_views(s, NOW + 18000)['remaining'] == 0
    apply(s, 'knowledge_spend', {'branch': 'science', 'expected_invested': 0}, NOW + 18000)
    with pytest.raises(RuleError): accept(s, 1, now=NOW + 18000)
    assert s['knowledge_points'] == 1 and s['knowledge_growth']['science'] == 1

@pytest.mark.parametrize('hours', [0, -1, 6, 1.5, True, '2', None])
def test_invalid_duration(hours):
    s = fresh(); at_noah(s)
    with pytest.raises(RuleError): accept(s, hours)
    assert s['life_tasks'] == {}

@pytest.mark.parametrize('kind', ['creative', 'management', '', None, []])
def test_invalid_kind(kind):
    s = fresh(); at_noah(s)
    with pytest.raises(RuleError): accept(s, 1, kind)

def test_proximity_and_identity():
    s = fresh()
    with pytest.raises(RuleError): accept(s)
    at_noah(s); task = accept(s)
    for location, position, target in [('home', {'x': 576, 'y': 420}, 'noah'), ('overworld', {'x': 240, 'y': 320}, 'noah'), ('overworld', {'x': 576, 'y': 420}, 'lia')]:
        s['location'], s['position'] = location, position
        with pytest.raises(RuleError): apply(s, 'life_claim', {'target': target, 'task_id': task}, NOW + 7200)
    assert s['knowledge_points'] == 0

def test_cancel_releases_quota_and_gives_no_partial_reward():
    s = fresh(); at_noah(s); task = accept(s, 5); s['location'] = 'home'
    for now in [NOW + 3600, NOW + 3601]: apply(s, 'life_cancel', {'task_id': task}, now)
    assert life_task_views(s, NOW)['remaining'] == 5 and s['knowledge_points'] == 0
    at_noah(s)
    with pytest.raises(RuleError): apply(s, 'life_claim', {'target': 'noah', 'task_id': task}, NOW + 18000)
    replacement = accept(s, 1, 'exercise', NOW + 3601)
    apply(s, 'life_claim', {'target': 'noah', 'task_id': replacement}, NOW + 7201)
    with pytest.raises(RuleError): apply(s, 'life_cancel', {'task_id': replacement}, NOW + 7202)
    assert s['health_points'] == 1

def test_midnight_acceptance_day_and_single_active():
    s = fresh(); at_noah(s)
    late = datetime(2026, 10, 14, 23, tzinfo=ZoneInfo('Asia/Shanghai')).timestamp()
    task = accept(s, 5, now=late)
    assert life_task_views(s, late + 3600)['remaining'] == 5
    with pytest.raises(RuleError): accept(s, 1, now=late + 3600)
    apply(s, 'life_claim', {'target': 'noah', 'task_id': task}, late + 18000)
    assert s['life_tasks'][task]['date'] == '2026-10-14'
    assert life_task_views(s, late + 18000)['remaining'] == 5
    accept(s, 5, now=late + 18000)

def test_business_retry_and_save_upgrade_preserve_assets():
    s = fresh(); at_noah(s); s['knowledge_points'], s['health_points'] = 7, 3
    before = copy.deepcopy(s); task = accept(s, 2, 'work')
    for t in [NOW, NOW + 86400]: apply(s, 'life_accept', {'target': 'noah', 'task_id': task, 'hours': 2, 'kind': 'work'}, t)
    with pytest.raises(RuleError): apply(s, 'life_accept', {'target': 'noah', 'task_id': task, 'hours': 3, 'kind': 'work'}, NOW)
    s = upgrade_state(s)
    for t in [NOW + 7200, NOW + 86400]: apply(s, 'life_claim', {'target': 'noah', 'task_id': task}, t)
    assert s['skill_points'] == 2 and len(s['life_tasks']) == 1
    for key in ['inventory', 'activities', 'knowledge_points', 'health_points', 'xp', 'quests']: assert s[key] == before[key]

def test_api_competing_accept_settlement_receipt_and_recovery(client, monkeypatch):
    current = [NOW]; monkeypatch.setattr('app.main.time.time', lambda: current[0])
    create(client); npc_client(client)
    def take(_): return cmd(client, 'life_accept', {'target': 'noah', 'task_id': str(uuid.uuid4()), 'hours': 5, 'kind': 'work'})
    with ThreadPoolExecutor(2) as pool: replies = list(pool.map(take, range(2)))
    assert sorted(r.status_code for r in replies) == [200, 422]
    state = client.get('/api/state').json()['state']; task = state['life_journal']['tasks'][0]['id']
    before = client.get('/api/export').json()
    assert cmd(client, 'life_claim', {'target': 'noah', 'task_id': task}).status_code == 422
    assert client.get('/api/export').json() == before
    current[0] += 18000; data = {'target': 'noah', 'task_id': task}; key = str(uuid.uuid4())
    with ThreadPoolExecutor(3) as pool: replies = list(pool.map(lambda k: cmd(client, 'life_claim', data, k), [key, key, str(uuid.uuid4())]))
    assert all(r.status_code == 200 for r in replies)
    assert client.get('/api/state').json()['state']['skill_points'] == 5
    assert sum(r['changes']['skill_points'] for r in client.get('/api/export').json()['ledger']) == 5
    credential = client.post('/api/recovery-file').json()
    with TestClient(app) as other:
        other.post('/api/session'); create(other)
        assert cmd(other, 'life_cancel', {'task_id': task}).status_code == 422
        assert other.post('/api/recover', json={'recovery_key': credential['recovery_key']}).status_code == 200
        restored = other.get('/api/state').json()['state']
        assert restored['skill_points'] == 5 and restored['life_journal']['remaining'] == 0

def test_concurrent_cancel_claim_one_outcome(client, monkeypatch):
    current = [NOW]; monkeypatch.setattr('app.main.time.time', lambda: current[0])
    create(client); npc_client(client); task = str(uuid.uuid4())
    assert cmd(client, 'life_accept', {'target': 'noah', 'task_id': task, 'hours': 1, 'kind': 'study'}).status_code == 200
    current[0] += 3600
    with ThreadPoolExecutor(2) as pool: replies = list(pool.map(lambda a: cmd(client, a, {'target': 'noah', 'task_id': task}), ['life_claim', 'life_cancel']))
    assert sorted(r.status_code for r in replies) == [200, 422]
    state = client.get('/api/state').json()['state']; item = state['life_journal']['tasks'][0]
    assert state['knowledge_points'] == (1 if item['status'] == 'claimed' else 0)
    assert state['life_journal']['remaining'] == (4 if item['status'] == 'claimed' else 5)
