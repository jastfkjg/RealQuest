import copy
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from zoneinfo import ZoneInfo

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from app.main import app
from app.models import Receipt
from app.db import Session
from app.rules import apply, upgrade_state, RuleError
from test_game import client, cmd, create, fresh, study_create, plan_create

NOW = datetime(2026, 10, 14, 12, tzinfo=ZoneInfo('Asia/Shanghai')).timestamp()


def link_minutes(state, task, minutes, now=NOW):
    apply(state, 'activity', {'kind': 'study', 'amount': minutes}, now)
    record = state['activities'][-1]['id']
    apply(state, 'study_link', {'task_id': task, 'activity_id': record}, now)
    return record


def test_partial_timer_then_completion_and_duplicate_link():
    s = fresh()
    task = study_create(s, NOW, minutes=2)
    apply(s, 'timer_start', {'task_id': task}, NOW)
    apply(s, 'timer_finish', {}, NOW + 59)
    assert s['knowledge_points'] == 0
    for offset in [100, 200]:
        apply(s, 'timer_start', {'task_id': task}, NOW + offset)
        apply(s, 'timer_finish', {}, NOW + offset + 60)
        assert s['knowledge_points'] == (1 if offset == 200 else 0)
    assert s['study_tasks'][task]['knowledge_reward'] == 1
    assert s['xp'] == 2 and s['activities'][-1]['source'] == 'timer'
    assert s['activities'][-1]['verified'] is False
    before = copy.deepcopy(s)
    apply(s, 'study_link', {'task_id': task, 'activity_id': s['activities'][-1]['id']}, NOW + 300)
    assert s == before


def test_link_record_ownership_and_xp_cap_are_independent():
    s = fresh()
    first, second = [study_create(s, NOW, minutes=5) for _ in range(2)]
    record = link_minutes(s, first, 100)
    assert s['knowledge_points'] == 1 and s['xp'] == 100
    with pytest.raises(RuleError):
        apply(s, 'study_link', {'task_id': second, 'activity_id': record}, NOW)
    link_minutes(s, second, 5)
    assert s['knowledge_points'] == 2 and s['xp'] == 100
    assert s['activities'][-1]['xp'] == 0


def test_edit_to_recorded_minutes_archive_and_restore_only_award_once():
    s = fresh()
    plan = plan_create(s, NOW)
    apply(s, 'study_plan_today', {'plan_id': plan}, NOW)
    task = next(iter(s['study_tasks']))
    link_minutes(s, task, 5)
    apply(s, 'study_edit', {'task_id': task, 'title': '读懂叶片', 'target_minutes': 5}, NOW)
    assert s['knowledge_points'] == 1
    for archived in [True, False, True, False]:
        apply(s, 'study_archive', {'task_id': task, 'archived': archived}, NOW)
        apply(s, 'study_plan_archive', {'plan_id': plan, 'archived': archived}, NOW)
    assert s['knowledge_points'] == 1 and s['xp'] == 5
    apply(s, 'study_plan_today', {'plan_id': plan}, NOW)
    assert len(s['study_tasks']) == 1


def test_midnight_task_reward_not_bound_to_xp_day_and_free_timer_no_point():
    s = fresh()
    midnight = datetime(2026, 10, 14, 23, 59, 30, tzinfo=ZoneInfo('Asia/Shanghai')).timestamp()
    task = study_create(s, midnight, minutes=1)
    apply(s, 'timer_start', {'task_id': task}, midnight)
    apply(s, 'timer_finish', {}, midnight + 60)
    assert s['study_tasks'][task]['date'] == '2026-10-14'
    assert s['activities'][-1]['date'] == '2026-10-15'
    assert s['knowledge_points'] == 1
    apply(s, 'timer_start', {'topic': '自由阅读'}, midnight + 90)
    apply(s, 'timer_finish', {}, midnight + 150)
    assert s['knowledge_points'] == 1 and s['xp'] == 2


def test_legacy_completed_no_backfill_unfinished_can_earn():
    s = fresh()
    done, pending = [study_create(s, NOW, minutes=5) for _ in range(2)]
    record = link_minutes(s, done, 5)
    for key in ['knowledge_points', 'knowledge_growth']:
        del s[key]
    for task in s['study_tasks'].values():
        task.pop('knowledge_reward', None)
    before = copy.deepcopy(s)
    upgraded = upgrade_state(s)
    assert s == before
    assert upgraded['knowledge_points'] == 0
    assert upgraded['knowledge_growth'] == {'science': 0, 'magic': 0}
    assert upgraded['study_tasks'][done]['knowledge_reward'] == 0
    apply(upgraded, 'study_link', {'task_id': done, 'activity_id': record}, NOW)
    assert upgraded['knowledge_points'] == 0 and upgraded['xp'] == s['xp']
    link_minutes(upgraded, pending, 5)
    assert upgraded['knowledge_points'] == 1
    assert upgrade_state(upgraded) == upgraded


@pytest.mark.parametrize('data', [
    {'branch': 'wisdom', 'expected_invested': 0},
    {'branch': 'science', 'expected_invested': True},
    {'branch': 'magic', 'expected_invested': -1},
    {'branch': 'science', 'expected_invested': 1},
    {'branch': 'magic'},
])
def test_invalid_investments_leave_state_untouched(client, data):
    create(client)
    before = client.get('/api/state').json()['state']
    assert cmd(client, 'knowledge_spend', data).status_code == 422
    assert client.get('/api/state').json()['state'] == before


def test_investment_balance_and_zero_point_rejection():
    s = fresh()
    with pytest.raises(RuleError):
        apply(s, 'knowledge_spend', {'branch': 'science', 'expected_invested': 0}, NOW)
    for branch, index in [('science', 0), ('magic', 1), ('magic', 2)]:
        link_minutes(s, study_create(s, NOW, minutes=1), 1)
        before = {key: copy.deepcopy(s[key]) for key in ['xp', 'knowledge_shard', 'attributes', 'health_points', 'stamina']}
        apply(s, 'knowledge_spend', {'branch': branch, 'expected_invested': index}, NOW)
        assert s['knowledge_points'] == 0
        assert sum(s['knowledge_growth'].values()) == index + 1
        assert all(s[key] == value for key, value in before.items())
    assert s['knowledge_growth'] == {'science': 1, 'magic': 2}


def test_concurrent_completion_spending_replay_receipts_and_recovery(client, monkeypatch):
    import app.main as main
    monkeypatch.setattr(main.time, 'time', lambda: NOW)
    create(client)
    task_id = str(uuid.uuid4())
    cmd(client, 'study_create', {'task_id': task_id, 'title': '植物与符文', 'target_minutes': 1})
    cmd(client, 'activity', {'kind': 'study', 'amount': 1})
    record = client.get('/api/state').json()['state']['activities'][0]['id']
    data = {'task_id': task_id, 'activity_id': record}
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert list(pool.map(lambda _: cmd(client, 'study_link', data).status_code, range(2))) == [200, 200]
    assert client.get('/api/state').json()['state']['knowledge_points'] == 1
    def spend(branch):
        return cmd(client, 'knowledge_spend', {'branch': branch, 'expected_invested': 0}).status_code
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(spend, ['science', 'magic'])) == [200, 422]
    saved = client.get('/api/state').json()['state']
    assert saved['knowledge_points'] == 0 and sum(saved['knowledge_growth'].values()) == 1
    with Session() as db:
        receipts = db.scalars(select(Receipt).where(Receipt.action == 'study_link')).all()
        assert sum(r.changes['knowledge_points'] for r in receipts) == 1
        receipt = db.scalar(select(Receipt).where(Receipt.action == 'knowledge_spend'))
        key = receipt.request_id
        branch = next(k for k, v in receipt.changes['knowledge_growth'].items() if v)
    replay = cmd(client, 'knowledge_spend', {'branch': branch, 'expected_invested': 0}, key)
    assert replay.status_code == 200 and replay.json()['replayed']
    assert replay.json()['state'] == saved
    credential = client.post('/api/recovery-file').json()
    with TestClient(app) as other:
        other.post('/api/session'); create(other)
        assert other.get('/api/state').json()['state']['knowledge_points'] == 0
        assert cmd(other, 'study_link', data).status_code == 422
        assert other.post('/api/recover', json={'recovery_key': credential['recovery_key']}).status_code == 200
        assert other.get('/api/state').json()['state'] == saved
