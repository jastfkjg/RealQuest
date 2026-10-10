import copy
import os
import tempfile
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from zoneinfo import ZoneInfo
import pytest

os.environ['DATABASE_URL'] = 'sqlite:///' + os.path.join(tempfile.mkdtemp(prefix='realquest-tests-'), 'tests.db')
from fastapi.testclient import TestClient
from app.db import Base, engine, Session
from app.main import app
from app.models import Player, Receipt
from app.rules import initial_state, apply, RuleError
from sqlalchemy import select, func

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

def fresh():
    s=initial_state();apply(s,'create',{'name':'规则测试'},100);return s

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

def test_gather_cooldown_proximity_and_receipt(client):
    create(client)
    assert cmd(client,'gather',{'target':'wood_2'}).status_code==422
    assert cmd(client,'move',{'x':320,'y':330}).status_code==200
    result=cmd(client,'gather',{'target':'wood_1'})
    assert result.json()['state']['inventory']['wood']==3
    assert cmd(client,'gather',{'target':'wood_1'}).status_code==422
    with Session() as db:
        receipt=db.scalar(select(Receipt).where(Receipt.action=='gather'))
        assert receipt.changes['inventory']=={'wood':3}

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

def test_farm_offline_growth_trade_and_upgrade():
    s=fresh();s['position']={'x':136,'y':440}
    apply(s,'plant',{'target':'plot_0'},100)
    assert s['inventory']['seed']==5
    with pytest.raises(RuleError):apply(s,'harvest',{'target':'plot_0'},159)
    apply(s,'harvest',{'target':'plot_0'},100000)
    assert s['inventory']['crop']==2 and s['inventory']['seed']==6
    s['position']={'x':352,'y':232}
    if s['location']=='overworld':
        apply(s,'enter',{'target':'workshop'},100000)
        s['position']={'x':240,'y':196}
    apply(s,'sell',{'target':'workshop_counter'},100000)
    assert s['inventory']['gold']==28 and s['inventory']['crop']==1
    s['inventory'].update(wood=6,stone=3)
    apply(s,'upgrade',{'target':'workshop_counter'},100000)
    assert s['buildings']['workshop']==2
    assert s['inventory']['wood']==0 and s['inventory']['stone']==0 and s['inventory']['gold']==18
    if s['location']=='overworld':
        apply(s,'enter',{'target':'workshop'},100000)
        s['position']={'x':240,'y':196}
    apply(s,'sell',{'target':'workshop_counter'},100000)
    assert s['inventory']['gold']==27

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
    cmd(client,'gather',{'target':'wood_1'})
    cmd(client,'move',{'x':256,'y':300})
    before=client.get('/api/state').json()['state']
    assert next(q for q in before['quest_log'] if q['id']=='settle_in')['status']=='ready'
    key=str(uuid.uuid4())
    for _ in range(2):
        response=cmd(client,'quest_claim',{'quest_id':'settle_in'},key)
        assert response.status_code==200
    after=response.json()['state']
    assert after['inventory']['gold']==before['inventory']['gold']+12
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
    apply(s,'quest_accept',{'quest_id':quest_id},100)
    with pytest.raises(RuleError): apply(s,'quest_claim',{'quest_id':quest_id},101)
    s['events'] += ['discovered_grove','visited_library','rune_awakened','discovered_lake','discovered_quarry']
    s['stats']['stone']=6;s['inventory']['stone']=0;s['attributes']['wisdom']=25
    assert next(q for q in quest_views(s) if q['id']==quest_id)['status']=='ready'
    gold=s['inventory']['gold'];definition=next(q for q in QUESTS if q['id']==quest_id)
    apply(s,'quest_claim',{'quest_id':quest_id},102)
    assert s['inventory']['gold']==gold+definition['reward']['gold']
    with pytest.raises(RuleError): apply(s,'quest_claim',{'quest_id':quest_id},103)
