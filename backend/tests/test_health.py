import copy
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from zoneinfo import ZoneInfo
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from test_game import client, cmd, create, fresh
from test_life_tasks import npc_client
from app.main import app
from app.db import Session
from app.models import Player
from app.rules import apply, RuleError, upgrade_state, recover_stamina, exercise_task_views


def pledge(s, now, minutes=10):
    apply(s, 'exercise_prepare', {'title': '散步与舒展', 'target_minutes': minutes}, now)
    return max(s['exercise_tasks'])


def test_partial_link_reward_once_and_daily_limit():
    s = fresh(); now = 1800000000
    task = pledge(s, now)
    record_id = str(uuid.uuid4())
    apply(s, 'exercise_record', {'task_id': task, 'activity_id': record_id, 'minutes': 4}, now)
    apply(s, 'exercise_record', {'task_id': task, 'activity_id': record_id, 'minutes': 4}, now+1)
    assert s['health_points'] == 0 and s['xp'] == 4 and len(s['activities']) == 1
    apply(s, 'activity', {'kind': 'exercise', 'amount': 6}, now+2)
    record = s['activities'][-1]
    for offset in [3,4]:
        apply(s, 'exercise_link', {'task_id': task, 'activity_id': record['id']}, now+offset)
    pledge(s, now+5)
    assert s['health_points'] == 0 and s['xp'] == 10
    assert exercise_task_views(s)[0]['minutes'] == 10
    with pytest.raises(RuleError): pledge(s, now+6, 1)
    with pytest.raises(RuleError):
        apply(s, 'exercise_record', {'task_id': task, 'activity_id': record_id, 'minutes': 5}, now+7)
    assert len(s['exercise_tasks']) == 1


def test_dates_sources_and_xp_cap():
    s = fresh(); now = datetime(2026,10,14,23,59,tzinfo=ZoneInfo('Asia/Shanghai')).timestamp()
    task = pledge(s, now, 1)
    apply(s, 'activity', {'kind': 'study', 'amount': 1}, now)
    with pytest.raises(RuleError): apply(s, 'exercise_link', {'task_id': task, 'activity_id': s['activities'][-1]['id']}, now)
    apply(s, 'activity', {'kind': 'exercise', 'amount': 100}, now)
    apply(s, 'exercise_record', {'task_id': task, 'activity_id': str(uuid.uuid4()), 'minutes': 1}, now+120)
    record = s['activities'][-1]
    assert record['date'] == '2026-10-14' and record['source'] == 'manual' and record['verified'] is False
    assert record['xp'] == 0 and s['health_points'] == 0
    tomorrow = pledge(s, now+120, 1)
    with pytest.raises(RuleError): apply(s, 'exercise_link', {'task_id': tomorrow, 'activity_id': record['id']}, now+120)
    assert s['health_points'] == 0 and len(s['exercise_tasks']) == 2
    with pytest.raises(RuleError): apply(s, 'exercise_record', {'task_id': tomorrow, 'activity_id': str(uuid.uuid4()), 'minutes': 1}, now+86400*10)


def test_recovery_fraction_cap_clock_and_legacy():
    s = fresh(); s['energy'] = 37; s['attributes']['strength'] = 50
    for field in ['stamina','health_points','health_invested','exercise_tasks']: del s[field]
    s = upgrade_state(s)
    assert s['stamina']['max'] == 100 and s['energy'] == 37 and s['attributes']['strength'] == 50
    assert upgrade_state(s) == s and s['health_points'] == 0
    s['stamina'] = {'current': 10, 'max': 100, 'updated_at': 1000}
    recover_stamina(s, 100)
    assert s['stamina'] == {'current': 10, 'max': 100, 'updated_at': 1000}
    recover_stamina(s, 1719)
    assert s['stamina']['current'] == 10
    recover_stamina(s, 1721)
    assert s['stamina'] == {'current': 11, 'max': 100, 'updated_at': 1720}
    recover_stamina(s, 1000+86400)
    assert s['stamina']['current'] == 100
    recover_stamina(s, 1000+86400*3)
    s['stamina']['current'] -= 4
    recover_stamina(s, 1001+86400*3)
    assert s['stamina']['current'] == 96


def test_concurrent_reward_and_investment(client, monkeypatch):
    now = 1800000000
    monkeypatch.setattr("app.main.time.time", lambda: now)
    create(client)
    task = cmd(client, 'exercise_prepare', {'title': '散步', 'target_minutes': 1}).json()['state']['exercise_task_log'][0]['id']
    data = {'task_id': task, 'activity_id': str(uuid.uuid4()), 'minutes': 1}
    with ThreadPoolExecutor(2) as pool:
        assert list(pool.map(lambda _: cmd(client, 'exercise_record', data).status_code, range(2))) == [200,200]
    assert client.get('/api/state').json()['state']['health_points'] == 0
    npc_client(client)
    commission = str(uuid.uuid4())
    assert cmd(client, 'life_accept', {'target': 'noah', 'task_id': commission, 'hours': 1, 'kind': 'exercise'}).status_code == 200
    now += 3600
    assert cmd(client, 'life_claim', {'target': 'noah', 'task_id': commission}).status_code == 200
    with ThreadPoolExecutor(2) as pool:
        codes = list(pool.map(lambda _: cmd(client, 'health_spend', {'expected_invested': 0}).status_code, range(2)))
    assert sorted(codes) == [200,422]
    s = client.get('/api/state').json()['state']
    assert s['health_points'] == 0 and s['health_invested'] == 1 and s['stamina']['max'] == 105
    assert len(s['activities']) == 1 and s['xp'] == 1
    assert sum(x['changes']['health_points'] for x in client.get('/api/export').json()['ledger']) == 0
    with TestClient(app) as other:
        other.post('/api/session'); create(other)
        assert cmd(other, 'exercise_link', {'task_id': task, 'activity_id': data['activity_id']}).status_code == 422


def test_gather_rejection_atomic_and_bed_rest(client, monkeypatch):
    from app.world import OBJECTS, INTERIORS
    create(client); now = 1800000000
    monkeypatch.setattr('app.main.time.time', lambda: now)
    wood = next(o for o in OBJECTS if o.get('resource') == 'tree')
    with Session.begin() as db:
        p = db.scalar(select(Player)); s = copy.deepcopy(p.state)
        s['position'] = {'x': wood['x'], 'y': wood['y']+44}
        s['tools']['held']='axe';s['tools']['resources'][wood['id']]={'stage':'tree','work':5,'version':5}
        s['stamina'] = {'current': 2, 'max': 100, 'updated_at': now}; p.state = s
    key = str(uuid.uuid4())
    for _ in range(2): assert cmd(client, 'tool_strike', {'target': wood['id'],'expected_version':5}, key).status_code == 200
    s = client.get('/api/state').json()['state']; assert s['stamina']['current'] == 0 and s['inventory']['wood'] == 6
    now += 31
    before = client.get('/api/export').json()
    assert cmd(client, 'tool_strike', {'target': wood['id'],'expected_version':6}).status_code == 422
    assert client.get('/api/export').json() == before
    with Session.begin() as db:
        p = db.scalar(select(Player)); value = copy.deepcopy(p.state)
        value['location'] = 'home'
        bed = next(o for o in INTERIORS['home']['objects'] if o['id'] == 'home_bed')
        value['position'] = {'x': bed['x'], 'y': bed['y']}; p.state = value
    rested = cmd(client, 'rest', {'target':'home_bed', 'expected_day':1}).json()['state']
    assert rested['stamina']['current'] == 100 and rested['inventory'] == s['inventory']
    assert rested['plots'] == s['plots'] and rested['health_points'] == 0


@pytest.mark.parametrize('minutes', [0, 121, True, 1.5])
def test_invalid_pledge_has_no_reward_or_state_change(client, minutes):
    create(client)
    before = client.get('/api/export').json()
    assert cmd(client, 'exercise_prepare', {'title': '活动一下', 'target_minutes': minutes}).status_code == 422
    assert cmd(client, 'exercise_prepare', {'title': '活动一下', 'target_minutes': 10, 'date': '2099-01-01'}).status_code == 422
    assert cmd(client, 'health_spend', {'expected_invested': 0}).status_code == 422
    assert client.get('/api/export').json() == before


def test_mining_recovery_reads_and_credential_restore(client, monkeypatch):
    from app.world import OBJECTS
    create(client); now = 1800000000
    monkeypatch.setattr('app.main.time.time', lambda: now)
    stone = next(o for o in OBJECTS if o.get('resource') == 'stone')
    with Session.begin() as db:
        p = db.scalar(select(Player)); s = copy.deepcopy(p.state)
        s['position'] = {'x': stone['x'], 'y': stone['y']+44}
        s['tools']['held']='pickaxe';s['tools']['resources'][stone['id']]={'stage':'whole','work':2,'version':2}
        s['stamina'] = {'current': 2, 'max': 105, 'updated_at': now - 719}
        s['health_invested'] = 1; p.state = s
    assert cmd(client, 'tool_strike', {'target':stone['id'],'expected_version':2}).status_code == 422
    now += 1
    for _ in range(2): assert client.get('/api/state').json()['state']['stamina']['current'] == 3
    assert cmd(client, 'tool_strike', {'target':stone['id'],'expected_version':2}).json()['state']['stamina']['current'] == 0
    key = client.post('/api/recovery-file').json()['recovery_key']
    now += 3600
    with TestClient(app) as restored:
        assert restored.post('/api/recover', json={'recovery_key':key}).status_code == 200
        for _ in range(2):
            state = restored.get('/api/state').json()['state']
            assert state['stamina']['current'] == 5 and state['stamina']['max'] == 105
            assert state['health_invested'] == 1
        assert cmd(restored, 'tool_strike', {'target':stone['id'],'expected_version':3}).status_code == 422
    assert client.get('/api/state').json()['state']['stamina']['current'] == 5
