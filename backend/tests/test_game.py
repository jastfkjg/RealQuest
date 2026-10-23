import atexit
import copy
import os
import tempfile
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from zoneinfo import ZoneInfo
import pytest

_test_storage = tempfile.TemporaryDirectory(prefix='realquest-tests-')
os.environ['DATABASE_URL'] = 'sqlite:///' + os.path.join(_test_storage.name, 'tests.db')
from fastapi.testclient import TestClient
from app.db import Base, engine, Session
from app.main import app
from app.models import Player, Receipt
from app.rules import initial_state, apply, RuleError
from sqlalchemy import select, func


def _close_test_storage():
    # Dispose SQLite/WAL handles before removing this test run's temporary data.
    try:
        engine.dispose()
    finally:
        _test_storage.cleanup()


atexit.register(_close_test_storage)

@pytest.fixture()
def client():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with TestClient(app) as c:
        c.post('/api/session')
        yield c

def cmd(client, action, data=None, key=None):
    return client.post('/api/command', json={'action': action, 'data': data or {}, 'request_id': key or str(uuid.uuid4())})

def create(client):
    assert cmd(client,'create',{'name':'测试旅人','appearance':1}).status_code == 200
    # Existing NPC/economy fixtures take place at 08:30, independently of the
    # new journey's 06:00 start. Keep those scenario conditions deterministic.
    with Session.begin() as db:
        p = db.scalar(select(Player)); value = copy.deepcopy(p.state)
        value['world_clock'].update(elapsed=187.5, running_until=0)
        p.state = value

def fresh():
    s=initial_state();apply(s,'create',{'name':'规则测试'},100)
    s['world_clock'].update(elapsed=187.5, running_until=0)
    return s

def chop_tree(state, target, now):
    """Earn a full tree's output through the public tool work rule."""
    from app.world import map_for
    node=next(o for o in map_for('overworld',state,now)['objects'] if o['id']==target)
    state.update(location='overworld',position={'x':node['x'],'y':node['y']+44})
    apply(state,'tool_hold',{'item':'axe'},now)
    tick=max(now,state['tools']['next_at'])
    for _ in range(6):
        node=next(o for o in map_for('overworld',state,tick)['objects'] if o['id']==target)
        if node['resource_state']['stage']!='tree':break
        apply(state,'tool_strike',{'target':target,'expected_version':node['resource_state']['version']},tick)
        tick+=.5


def api_finish_tree(client,target='wood_1'):
    # Quest-ledger tests start from five already saved, unrewarded hits. The
    # final hit is a real API command; the full multi-hit loop has its own suite.
    with Session.begin() as db:
        p=db.scalar(select(Player));s=copy.deepcopy(p.state)
        s['tools']['held']='axe';s['tools']['resources'][target]={'stage':'tree','work':5,'version':5};p.state=s
    response=cmd(client,'tool_strike',{'target':target,'expected_version':5})
    assert response.status_code==200
    return response


def study_create(state, now, minutes=25, title='读一章植物笔记'):
    key = str(uuid.uuid4())
    apply(state, 'study_create', {'task_id': key, 'title': title, 'target_minutes': minutes}, now)
    return key

def test_study_timer_progress_pause_restore_and_single_reward():
    from app.rules import upgrade_state, study_task_views
    now = datetime(2026, 10, 13, 12, tzinfo=ZoneInfo('Asia/Shanghai')).timestamp()
    s = fresh()
    task = study_create(s, now)
    assert s['xp'] == 0 and s['inventory']['gold'] == 20
    apply(s, 'timer_start', {'task_id': task, 'topic': 'ignored client topic'}, now)
    timer_id = s['timer']['id']
    assert s['timer']['topic'] == '读一章植物笔记'
    apply(s, 'timer_pause', {'timer_id': timer_id}, now + 600)
    s = upgrade_state(s)
    assert s['timer']['elapsed'] == 600 and not s['timer']['running']
    apply(s, 'timer_resume', {'timer_id': timer_id}, now + 3600)
    apply(s, 'timer_finish', {'timer_id': timer_id}, now + 4500)
    assert s['timer'] is None
    assert s['xp'] == s['attributes']['wisdom'] == 25
    assert s['knowledge_shard'] == 1
    record = s['activities'][0]
    assert record['study_task_id'] == task and record['amount'] == 25
    assert record['source'] == 'timer' and record['verified'] is False
    assert study_task_views(s)[0]['minutes'] == 25
    assert s['study_tasks'][task]['completed_at'] == now + 4500
    before = copy.deepcopy(s)
    apply(s, 'study_link', {'task_id': task, 'activity_id': record['id']}, now + 4501)
    assert s == before  # Completion/link is not another award.
    with pytest.raises(RuleError):
        apply(s, 'timer_start', {'task_id': task}, now + 4502)

def test_study_partial_sessions_and_subminute():
    s = fresh(); now = 1800000000
    task = study_create(s, now, minutes=2)
    apply(s, 'timer_start', {'task_id': task}, now)
    apply(s, 'timer_finish', {}, now + 59)
    assert s['activities'] == [] and s['study_tasks'][task]['completed_at'] is None
    for offset in [100, 200]:
        apply(s, 'timer_start', {'task_id': task}, now + offset)
        apply(s, 'timer_finish', {}, now + offset + 60)
    assert s['xp'] == 2 and len(s['activities']) == 2
    assert s['study_tasks'][task]['completed_at'] == now + 260

def test_study_daily_cap_still_completes_and_cross_midnight():
    s = fresh()
    now = datetime(2026, 10, 13, 23, 59, 30, tzinfo=ZoneInfo('Asia/Shanghai')).timestamp()
    apply(s, 'activity', {'kind': 'study', 'amount': 100}, now)
    task = study_create(s, now, minutes=1)
    record = s['activities'][0]
    apply(s, 'study_link', {'task_id': task, 'activity_id': record['id']}, now)
    assert s['xp'] == 100 and s['study_tasks'][task]['completed_at'] is not None
    capped = study_create(s, now - 100, minutes=1)
    apply(s, 'timer_start', {'task_id': capped}, now - 100)
    apply(s, 'timer_finish', {}, now - 40)
    assert s['activities'][-1]['xp'] == 0 and s['study_tasks'][capped]['completed_at'] is not None
    crossing = study_create(s, now, minutes=1)
    apply(s, 'timer_start', {'task_id': crossing}, now)
    apply(s, 'timer_finish', {}, now + 60)
    assert s['study_tasks'][crossing]['date'] == '2026-10-13'
    assert s['activities'][-1]['date'] == '2026-10-14'
    assert s['xp'] == 101 and s['activities'][-1]['study_task_id'] == crossing

def test_study_link_constraints_and_old_save_compatibility():
    from app.rules import upgrade_state
    s = fresh(); now = 1800000000
    apply(s, 'activity', {'kind': 'study', 'amount': 10}, now)
    del s['activities'][0]['id']; del s['study_tasks']
    apply(s, 'timer_start', {'topic': '旧计时'}, now)
    del s['timer']['id']; del s['timer']['study_task_id']
    upgraded = upgrade_state(s)
    assert upgraded['activities'][0]['id'] == 'legacy-0'
    assert upgrade_state(upgraded) == upgraded
    assert upgraded['xp'] == s['xp'] and upgraded['timer']['topic'] == '旧计时'
    first = study_create(upgraded, now, minutes=10)
    second = study_create(upgraded, now, minutes=10)
    apply(upgraded, 'study_link', {'task_id': first, 'activity_id': 'legacy-0'}, now)
    with pytest.raises(RuleError):
        apply(upgraded, 'study_link', {'task_id': second, 'activity_id': 'legacy-0'}, now)
    next_day = study_create(upgraded, now + 86400)
    with pytest.raises(RuleError):
        apply(upgraded, 'study_link', {'task_id': next_day, 'activity_id': 'legacy-0'}, now + 86400)
    with pytest.raises(RuleError):
        apply(upgraded, 'timer_finish', {'timer_id': str(uuid.uuid4())}, now + 60)
    assert upgraded['timer']['topic'] == '旧计时'
    apply(upgraded, 'timer_finish', {'timer_id': 'legacy-timer'}, now + 60)
    assert upgraded['activities'][-1]['amount'] == 1

@pytest.mark.parametrize('minutes,title', [(0,'a'), (121,'a'), (True,'a'), (1.5,'a'), (25,''), (25,' '*4), (25,'长'*81)])
def test_study_rejects_invalid_create(client, minutes, title):
    create(client)
    before = client.get('/api/state').json()['state']
    assert cmd(client, 'study_create', {'task_id': str(uuid.uuid4()), 'title': title, 'target_minutes': minutes}).status_code == 422
    assert client.get('/api/state').json()['state'] == before

def test_study_api_idempotency_isolation_and_reload(client, monkeypatch):
    from app import main
    create(client)
    now = 1800000000
    monkeypatch.setattr(main.time, 'time', lambda: now)
    task_id = str(uuid.uuid4()); request_id = str(uuid.uuid4())
    data = {'task_id': task_id, 'title': 'API 研习', 'target_minutes': 1}
    for key in [request_id, request_id, str(uuid.uuid4())]:
        assert cmd(client, 'study_create', data, key).status_code == 200
    assert len(client.get('/api/state').json()['state']['study_task_log']) == 1
    assert cmd(client, 'study_create', {**data, 'title': '不同标题'}).status_code == 422
    assert cmd(client, 'timer_start', {'task_id': task_id}).status_code == 200
    now += 61
    finish = str(uuid.uuid4())
    def finish_once(_): return cmd(client, 'timer_finish', {}, finish)
    with ThreadPoolExecutor(max_workers=3) as pool:
        results = list(pool.map(finish_once, range(3)))
    assert all(r.status_code == 200 for r in results)
    saved = client.post('/api/session').json()['state']
    assert saved['xp'] == 1 and saved['timer'] is None
    assert saved['study_task_log'][0]['minutes'] == 1
    assert len(saved['activities']) == 1
    with TestClient(app) as other:
        other.post('/api/session'); create(other)
        assert cmd(other, 'timer_start', {'task_id': task_id}).status_code == 422
        assert cmd(other, 'study_link', {'task_id': task_id, 'activity_id': saved['activities'][0]['id']}).status_code == 422

def test_create_restore_and_isolate(client):
    create(client)
    assert client.get('/api/state').json()['state']['character']['name'] == '测试旅人'
    assert client.post('/api/session').json()['state']['character']['name'] == '测试旅人'
    with TestClient(app) as other:
        assert other.get('/api/state').status_code == 401
        other.post('/api/session')
        assert other.get('/api/state?player_id=anything').json()['state']['character'] is None
        assert other.cookies.get('realquest_session') != client.cookies.get('realquest_session')
    cookies=client.cookies.get('realquest_session')
    assert cookies and len(cookies)>30

@pytest.mark.parametrize('appearance', range(6))
def test_appearance_create_restore_keeps_starter_balance(client, appearance):
    before = client.get('/api/state').json()['state']
    key = str(uuid.uuid4())
    payload = {'name': '新旅人', 'appearance': appearance}
    assert cmd(client, 'create', payload, key).status_code == 200
    # Replaying the accepted create cannot grant another quest or mutate balances.
    assert cmd(client, 'create', payload, key).status_code == 200
    saved = client.post('/api/session').json()['state']
    assert saved['character'] == payload
    for field in ['inventory', 'xp', 'attributes', 'energy', 'position']:
        assert saved[field] == before[field]
    assert saved['quests']['settle_in']['status'] == 'active'

@pytest.mark.parametrize('appearance', [-1, 6, True, '3', 3.5])
def test_invalid_appearance_does_not_create_player(client, appearance):
    assert cmd(client, 'create', {'name': '旅人', 'appearance': appearance}).status_code == 422
    assert client.get('/api/state').json()['state']['character'] is None

def test_idempotency_and_conflict(client):
    create(client)
    key=str(uuid.uuid4())
    for _ in range(3):
        assert cmd(client,'activity',{'kind':'study','amount':25},key).status_code == 200
    state=client.get('/api/state').json()['state']
    assert state['xp']==25 and len(state['activities'])==1 and state['knowledge_shard']==1
    assert cmd(client,'activity',{'kind':'study','amount':30},key).status_code == 409

def test_parallel_duplicate_awards_once(client):
    create(client)
    key=str(uuid.uuid4())
    with ThreadPoolExecutor(max_workers=4) as pool:
        results=list(pool.map(lambda _:cmd(client,'activity',{'kind':'creative','amount':20},key),range(4)))
    assert all(r.status_code==200 for r in results)
    assert client.get('/api/state').json()['state']['xp']==20

def test_tool_proximity_work_and_receipt(client):
    create(client)
    assert cmd(client,'tool_hold',{'item':'axe'}).status_code==200
    assert cmd(client,'tool_strike',{'target':'wood_2','expected_version':0}).status_code==422
    assert cmd(client,'move',{'x':320,'y':330}).status_code==200
    result=api_finish_tree(client)
    assert result.json()['state']['inventory']['wood']==6
    assert cmd(client,'tool_strike',{'target':'wood_1','expected_version':5}).status_code==422
    with Session() as db:
        receipt=db.scalar(select(Receipt).where(Receipt.action=='tool_strike'))
        assert receipt.changes['inventory']=={'wood':6,'tree_seed':1}

def test_bounds_and_collision(client):
    create(client)
    assert cmd(client,'move',{'x':480,'y':200}).status_code==422
    assert cmd(client,'move',{'x':-10,'y':300}).status_code==422
    assert cmd(client,'move',{'x':160,'y':175}).status_code==422
    assert client.get('/api/state').json()['state']['position']=={'x':240,'y':320}

def test_activity_caps_sources_and_cumulative_steps():
    s=fresh();now=1791522000
    apply(s,'activity',{'kind':'steps','amount':5000},now)
    assert s['attributes']['strength']==20
    apply(s,'activity',{'kind':'steps','amount':10000,'source':'imported','verified':True},now)
    assert s['attributes']['strength']==40
    with pytest.raises(RuleError):apply(s,'activity',{'kind':'steps','amount':10000},now)
    apply(s,'activity',{'kind':'exercise','amount':120},now)
    apply(s,'activity',{'kind':'exercise','amount':120},now)
    assert s['attributes']['strength']==100
    assert all(a['source']=='manual' and not a['verified'] for a in s['activities'])
    apply(s,'activity',{'kind':'management','amount':1},now)
    with pytest.raises(RuleError):apply(s,'activity',{'kind':'management','amount':1},now)
    with pytest.raises(RuleError):apply(s,'activity',{'kind':'study','amount':-1},now)
    with pytest.raises(RuleError):apply(s,'activity',{'kind':'study','amount':25,'date':'2099-01-01'},now)

def test_timer_pause_restore_and_completion():
    s=fresh();now=1791522000
    apply(s,'timer_start',{'topic':'Python'},now)
    apply(s,'timer_pause',{},now+90)
    s=copy.deepcopy(s) # Simulate persistence and page reload while paused.
    assert s['timer']['elapsed']==90
    apply(s,'timer_resume',{},now+600)
    apply(s,'timer_finish',{},now+630)
    assert s['timer'] is None
    assert s['attributes']['wisdom']==2
    assert s['activities'][0]['source']=='timer' and s['activities'][0]['amount']==2
    with pytest.raises(RuleError):apply(s,'timer_finish',{},now+700)

def test_farm_world_growth_trade_and_upgrade():
    s=fresh();s['inventory']['gold']=40;s['position']={'x':136,'y':440}
    apply(s,'plant',{'target':'plot_0'},100)
    assert s['inventory']['seed']==5
    with pytest.raises(RuleError):apply(s,'harvest',{'target':'plot_0'},159)
    # Offline elapsed real time does not grow new world-clock crops.
    with pytest.raises(RuleError):apply(s,'harvest',{'target':'plot_0'},100000)
    s['world_clock']['elapsed']=s['plots']['plot_0']['ready_tick']
    s['world_clock']['running_until']=0
    apply(s,'harvest',{'target':'plot_0'},100000)
    assert s['inventory']['crop']==2 and s['inventory']['seed']==5
    s['position']={'x':352,'y':232}
    if s['location']=='overworld':
        apply(s,'enter',{'target':'workshop'},100000)
        s['position']={'x':240,'y':196}
    apply(s,'sell',{'target':'workshop_counter'},100000)
    assert s['inventory']['gold']==44 and s['inventory']['crop']==1
    s['inventory'].update(wood=6,stone=3)
    apply(s,'upgrade',{'target':'workshop_counter'},100000)
    assert s['buildings']['workshop']==2
    assert s['inventory']['wood']==0 and s['inventory']['stone']==0 and s['inventory']['gold']==14
    if s['location']=='overworld':
        apply(s,'enter',{'target':'workshop'},100000)
        s['position']={'x':240,'y':196}
    apply(s,'sell',{'target':'workshop_counter'},100000)
    assert s['inventory']['gold']==18

def test_npc_once_daily_and_conditional_event():
    s=fresh();s['position']={'x':624,'y':272};now=1791522000
    apply(s,'talk',{'target':'lia'},now);apply(s,'talk',{'target':'lia'},now+1)
    assert s['relationships']['lia']==1 and s['attributes']['bond']==5
    s['position']={'x':848,'y':160}
    with pytest.raises(RuleError):apply(s,'explore',{'target':'ruins'},now)
    apply(s,'activity',{'kind':'study','amount':25},now)
    apply(s,'explore',{'target':'ruins'},now)
    assert 'rune_awakened' in s['events'] and s['knowledge_shard']==4
    with pytest.raises(RuleError):apply(s,'explore',{'target':'ruins'},now)

def test_delete_removes_save_and_ledger(client):
    create(client)
    assert client.get('/api/export').json()['ledger']
    assert client.delete('/api/session').status_code==200
    with Session() as db:
        assert db.scalar(select(func.count()).select_from(Player))==0
        assert db.scalar(select(func.count()).select_from(Receipt))==0
    assert client.get('/api/state').status_code==401

def test_cross_site_mutations_rejected(client):
    assert client.post('/api/session',headers={'Origin':'https://untrusted.example'}).status_code==403
    assert client.delete('/api/session',headers={'Sec-Fetch-Site':'cross-site'}).status_code==403

def test_failed_spend_rolls_back(client):
    create(client)
    cmd(client,'move',{'x':352,'y':240})
    cmd(client,'enter',{'target':'workshop'})
    cmd(client,'move',{'x':240,'y':216})
    before=client.get('/api/state').json()['state']
    assert cmd(client,'upgrade',{'target':'workshop_counter'}).status_code==422
    assert client.get('/api/state').json()['state']==before

def test_interiors_persist_exit_and_enforce_location(client):
    create(client)
    assert cmd(client,'move',{'x':160,'y':248}).status_code==200
    entered=cmd(client,'enter',{'target':'home'}).json()['state']
    assert entered['location']=='home' and entered['position']=={'x':240,'y':294}
    assert 'visited_home' in entered['events']
    assert client.get('/api/state').json()['state']['location']=='home'
    assert cmd(client,'gather',{'target':'wood_1'}).status_code==422
    assert cmd(client,'move',{'x':250,'y':294,'location':'overworld'}).status_code==422
    exited=cmd(client,'exit',{'target':'home_exit'}).json()['state']
    assert exited['location']=='overworld' and exited['position']=={'x':160,'y':244}

def test_quest_lifecycle_locked_and_claim_once(client):
    create(client)
    assert cmd(client,'quest_claim',{'quest_id':'settle_in'}).status_code==422
    assert cmd(client,'quest_accept',{'quest_id':'first_harvest'}).status_code==422
    cmd(client,'move',{'x':160,'y':248})
    cmd(client,'enter',{'target':'home'})
    cmd(client,'exit',{'target':'home_exit'})
    cmd(client,'move',{'x':288,'y':320})
    api_finish_tree(client)
    cmd(client,'move',{'x':256,'y':300})
    before=client.get('/api/state').json()['state']
    assert next(q for q in before['quest_log'] if q['id']=='settle_in')['status']=='ready'
    key=str(uuid.uuid4())
    for _ in range(2):
        response=cmd(client,'quest_claim',{'quest_id':'settle_in'},key)
        assert response.status_code==200
    after=response.json()['state']
    assert after['inventory']['gold']==before['inventory']['gold']+10
    assert after['inventory']['seed']==before['inventory']['seed']+3
    assert cmd(client,'quest_claim',{'quest_id':'settle_in'}).status_code==422
    assert cmd(client,'quest_accept',{'quest_id':'first_harvest'}).status_code==200
    assert cmd(client,'quest_accept',{'quest_id':'first_harvest'}).status_code==422

def test_old_save_upgrade_preserves_assets():
    from app.rules import upgrade_state
    old=initial_state();old['character']={'name':'老旅人','appearance':2};old['inventory']['gold']=378;old['xp']=82;old['events']=['first_gather']
    updated=upgrade_state(old)
    assert updated['inventory']['gold']==378 and updated['xp']==82
    assert updated['location']=='overworld' and updated['quests']['settle_in']['status']=='active'
    assert 'location' not in old
    assert upgrade_state(updated)==updated

def test_storage_transfers_without_duplication():
    s=fresh();s['position']={'x':160,'y':248};apply(s,'enter',{'target':'home'},100)
    s['position']={'x':360,'y':208}
    apply(s,'store',{'target':'home_chest','item':'seed','amount':2},100)
    assert s['inventory']['seed']==4 and s['storage']['seed']==2
    apply(s,'withdraw',{'target':'home_chest','item':'seed','amount':1},100)
    assert s['inventory']['seed']==5 and s['storage']['seed']==1
    with pytest.raises(RuleError):apply(s,'withdraw',{'target':'home_chest','item':'seed','amount':10},100)

def test_expanded_regions_and_chests():
    from app.world import WORLD
    assert WORLD['width']*WORLD['height']==4*960*640
    s=fresh();s['position']={'x':1584,'y':352}
    apply(s,'discover',{'target':'grove'},100)
    assert 'discovered_grove' in s['events']
    s['position']={'x':1744,'y':432};apply(s,'open_chest',{'target':'forest_cache'},100)
    assert s['inventory']['gold']==35
    with pytest.raises(RuleError):apply(s,'open_chest',{'target':'forest_cache'},100)
    with pytest.raises(RuleError):apply(s,'quest_accept',{'quest_id':'forest_path'},100)

def test_every_map_interaction_has_reachable_approach():
    from collections import deque
    from math import hypot
    from app.world import WORLD, INTERIORS, walkable
    for location,world in [('overworld',WORLD),*INTERIORS.items()]:
        spawn=world.get('spawn',{'x':240,'y':320})
        start=(round(spawn['x']/16)*16,round(spawn['y']/16)*16)
        visited={start};queue=deque([start])
        while queue:
            x,y=queue.popleft()
            for dx,dy in [(16,0),(-16,0),(0,16),(0,-16)]:
                point=(x+dx,y+dy)
                if point not in visited and walkable(*point,location):
                    visited.add(point);queue.append(point)
        for obj in world['objects']:
            assert any(hypot(x-obj['x'],y-obj['y'])<=60 for x,y in visited), f'{location}: {obj["id"]} unreachable'

@pytest.mark.parametrize('quest_id,giver,location,position', [
    ('forest_path','noah','overworld',{'x':576,'y':384}),
    ('rune_research','lia','overworld',{'x':624,'y':272}),
    ('wide_world','guild_board','guild',{'x':240,'y':208}),
])
def test_side_quest_progress_survives_spending_and_rewards_once(quest_id,giver,location,position):
    from app.quests import quest_views, QUESTS
    s=fresh();s['location']=location;s['position']=position
    # Public side quests now follow their teaching milestone.
    prerequisite={'forest_path':'first_harvest','rune_research':'gate_story','wide_world':'ranch_start'}[quest_id]
    s['quests'][prerequisite]={'status':'claimed'}
    apply(s,'quest_accept',{'quest_id':quest_id},100)
    with pytest.raises(RuleError): apply(s,'quest_claim',{'quest_id':quest_id},101)
    s['events'] += ['discovered_grove','visited_library','rune_awakened','discovered_lake','discovered_quarry']
    s['stats']['stone']=6;s['inventory']['stone']=0;s['attributes']['wisdom']=25
    assert next(q for q in quest_views(s) if q['id']==quest_id)['status']=='ready'
    gold=s['inventory']['gold'];definition=next(q for q in QUESTS if q['id']==quest_id)
    apply(s,'quest_claim',{'quest_id':quest_id},102)
    assert s['inventory']['gold']==gold+definition['reward']['gold']
    with pytest.raises(RuleError): apply(s,'quest_claim',{'quest_id':quest_id},103)

# Study plans keep one server-dated leaf per day; archive/edit never mint rewards.
def plan_create(state, now, minutes=25):
    key = str(uuid.uuid4())
    apply(state, 'study_plan_create', {'plan_id': key, 'title': '植物学手札', 'daily_minutes': minutes}, now)
    return key


def test_plan_daily_pages_continue_without_moving_records():
    from app.rules import study_task_views
    s = fresh(); now = datetime(2026, 10, 13, 12, tzinfo=ZoneInfo('Asia/Shanghai')).timestamp()
    plan = plan_create(s, now)
    for offset in [1, 2]: apply(s, 'study_plan_today', {'plan_id': plan}, now + offset)
    first = next(iter(s['study_tasks']))
    assert len(s['study_tasks']) == 1
    apply(s, 'study_edit', {'task_id': first, 'title': '读到叶片结构', 'target_minutes': 25}, now + 3)
    apply(s, 'timer_start', {'task_id': first}, now + 4)
    apply(s, 'timer_finish', {}, now + 604)
    apply(s, 'study_plan_edit', {'plan_id': plan, 'title': '慢慢读懂植物', 'daily_minutes': 15}, now + 605)
    apply(s, 'study_plan_today', {'plan_id': plan}, now + 86400)
    views = study_task_views(s)
    assert len(views) == 2 and views[0]['title'] == '读到叶片结构'
    assert views[0]['minutes'] == 0 and views[0]['target_minutes'] == 15
    assert views[1]['minutes'] == 10 and views[1]['target_minutes'] == 25
    assert views[1]['completed_at'] is None and s['xp'] == 10


def test_plan_archive_edit_restore_and_legacy_compatibility():
    from app.rules import upgrade_state
    s = fresh(); now = 1800000000; plan = plan_create(s, now)
    apply(s, 'study_plan_today', {'plan_id': plan}, now)
    task = next(iter(s['study_tasks']))
    apply(s, 'timer_start', {'task_id': task}, now)
    for action, data in [('study_plan_archive', {'plan_id': plan, 'archived': True}), ('study_archive', {'task_id': task, 'archived': True}), ('study_edit', {'task_id': task, 'title': 'x', 'target_minutes': 1})]:
        with pytest.raises(RuleError): apply(s, action, data, now + 1)
    apply(s, 'timer_finish', {}, now + 600)
    apply(s, 'study_edit', {'task_id': task, 'title': '完成本节', 'target_minutes': 10}, now + 601)
    assert s['study_tasks'][task]['completed_at'] is not None and s['xp'] == 10
    apply(s, 'study_plan_archive', {'plan_id': plan, 'archived': True}, now + 602)
    with pytest.raises(RuleError): apply(s, 'study_plan_today', {'plan_id': plan}, now + 86400)
    apply(s, 'study_plan_archive', {'plan_id': plan, 'archived': False}, now + 86401)
    apply(s, 'study_archive', {'task_id': task, 'archived': True}, now + 86402)
    apply(s, 'study_archive', {'task_id': task, 'archived': False}, now + 86403)
    apply(s, 'study_plan_today', {'plan_id': plan}, now + 86404)
    assert len(s['study_tasks']) == 2 and s['xp'] == 10
    legacy = fresh(); del legacy['study_plans']; legacy_task = study_create(legacy, now)
    del legacy['study_tasks'][legacy_task]['plan_id']; del legacy['study_tasks'][legacy_task]['archived_at']
    upgraded = upgrade_state(legacy)
    assert upgraded['study_tasks'][legacy_task]['plan_id'] is None
    assert upgrade_state(upgraded) == upgraded


def test_plan_cross_midnight_and_long_background_pause():
    s = fresh(); now = datetime(2026, 10, 13, 23, 59, 30, tzinfo=ZoneInfo('Asia/Shanghai')).timestamp()
    plan = plan_create(s, now, minutes=1); apply(s, 'study_plan_today', {'plan_id': plan}, now)
    first = next(iter(s['study_tasks'])); apply(s, 'timer_start', {'task_id': first}, now)
    apply(s, 'timer_pause', {}, now + 90)
    apply(s, 'timer_resume', {}, now + 86400 * 3)
    apply(s, 'timer_finish', {}, now + 86400 * 3 + 30)
    assert s['activities'][0]['amount'] == 2 and s['activities'][0]['study_task_id'] == first
    assert s['activities'][0]['date'] == '2026-10-17' and s['study_tasks'][first]['date'] == '2026-10-13'
    apply(s, 'study_plan_today', {'plan_id': plan}, now + 86400 * 3 + 30)
    assert len(s['study_tasks']) == 2 and s['xp'] == 2


def test_plan_concurrent_daily_creation_and_rollback(client):
    create(client); plan = str(uuid.uuid4())
    assert cmd(client, 'study_plan_create', {'plan_id': plan, 'title': '研习', 'daily_minutes': 25}).status_code == 200
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert list(pool.map(lambda _: cmd(client, 'study_plan_today', {'plan_id': plan}).status_code, range(2))) == [200, 200]
    before = client.get('/api/state').json()['state']; assert len(before['study_task_log']) == 1
    assert cmd(client, 'study_plan_edit', {'plan_id': plan, 'title': '错误修改', 'daily_minutes': 0}).status_code == 422
    assert client.get('/api/state').json()['state'] == before


def test_recovery_latest_save_and_original_session(client):
    create(client); credential = client.post('/api/recovery-file').json()
    assert credential['format'] == 'realquest-recovery'
    key = {'recovery_key': credential['recovery_key']}; plan = str(uuid.uuid4())
    cmd(client, 'study_plan_create', {'plan_id': plan, 'title': '恢复后的手札', 'daily_minutes': 5})
    cmd(client, 'study_plan_today', {'plan_id': plan})
    task = client.get('/api/state').json()['state']['study_task_log'][0]['id']
    cmd(client, 'timer_start', {'task_id': task})
    before = client.get('/api/state').json()['state']; ledger = client.get('/api/export').json()['ledger']
    with TestClient(app) as recovered:
        preview = recovered.post('/api/recovery-preview', json=key)
        assert preview.status_code == 200 and preview.json()['plan_count'] == 1
        assert recovered.get('/api/state').status_code == 401
        assert recovered.post('/api/recover', json=key).status_code == 200
        assert recovered.get('/api/state').json()['state'] == before
        assert recovered.get('/api/export').json()['ledger'] == ledger
        assert recovered.post('/api/session').json()['state'] == before
        assert client.get('/api/state').json()['state'] == before
        assert recovered.post('/api/recover', json={**key, 'state': {'xp': 99999}}).status_code == 422
        assert recovered.get('/api/state').json()['state'] == before


def test_recovery_invalid_deleted_and_origin(client):
    create(client); key = {'recovery_key': client.post('/api/recovery-file').json()['recovery_key']}
    before = client.get('/api/state').json()['state']
    assert client.post('/api/recover', json={'recovery_key': 'a' * 43}).status_code == 404
    assert client.post('/api/recovery-preview', json={'recovery_key': 'short'}).status_code == 422
    assert client.post('/api/recover', json=key, headers={'origin': 'https://untrusted.example'}).status_code == 403
    assert client.get('/api/state').json()['state'] == before
    with TestClient(app) as recovered:
        assert recovered.post('/api/recover', json=key).status_code == 200
        assert client.delete('/api/session').status_code == 200
        assert recovered.get('/api/state').status_code == 401
        assert recovered.post('/api/recover', json=key).status_code == 404


def test_recovery_switch_preserves_previous_journey(client):
    create(client); first_key = {'recovery_key': client.post('/api/recovery-file').json()['recovery_key']}
    with TestClient(app) as other:
        other.post('/api/session'); create(other); cmd(other, 'activity', {'kind': 'study', 'amount': 25})
        second_key = {'recovery_key': other.post('/api/recovery-file').json()['recovery_key']}
        other.post('/api/recover', json=first_key)
        assert other.get('/api/state').json()['state']['xp'] == 0
        other.post('/api/recover', json=second_key)
        assert other.get('/api/state').json()['state']['xp'] == 25


def test_plan_api_midnight_uses_server_day_not_client_day(client, monkeypatch):
    import app.main as main
    now = datetime(2026, 10, 13, 23, 59, 30, tzinfo=ZoneInfo('Asia/Shanghai')).timestamp()
    monkeypatch.setattr(main.time, 'time', lambda: now)
    create(client); plan = str(uuid.uuid4())
    cmd(client, 'study_plan_create', {'plan_id': plan, 'title': '多日研习', 'daily_minutes': 5})
    first = cmd(client, 'study_plan_today', {'plan_id': plan, 'date': '2099-01-01'}).json()['state']['study_task_log'][0]
    assert first['date'] == '2026-10-13'
    cmd(client, 'timer_start', {'task_id': first['id']})
    now += 90
    finished = cmd(client, 'timer_finish').json()['state']
    assert finished['activities'][0]['date'] == '2026-10-14'
    assert finished['activities'][0]['study_task_id'] == first['id']
    new = cmd(client, 'study_plan_today', {'plan_id': plan}).json()['state']
    assert len(new['study_task_log']) == 2 and new['study_task_log'][0]['date'] == '2026-10-14'
    assert new['study_task_log'][0]['minutes'] == 0 and new['xp'] == 1


def test_stale_tab_cannot_write_to_another_restored_journey(client):
    create(client)
    original_id = client.get('/api/state').json()['save_id']
    with TestClient(app) as other:
        other.post('/api/session'); create(other)
        key = {'recovery_key': other.post('/api/recovery-file').json()['recovery_key']}
        client.post('/api/recover', json=key)
        reply = client.post('/api/command', json={'request_id': str(uuid.uuid4()), 'action': 'activity', 'data': {'kind': 'study', 'amount': 25}, 'save_id': original_id})
        assert reply.status_code == 409
        assert client.get('/api/state').json()['state']['xp'] == 0
        assert other.get('/api/state').json()['state']['xp'] == 0
