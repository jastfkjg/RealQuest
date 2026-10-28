"""Public day transitions, pause boundaries, conservation and compatible saves."""
import copy
import uuid
from concurrent.futures import ThreadPoolExecutor
import pytest
from sqlalchemy import select
from test_game import client, cmd
from app.db import Session
from app.models import Player
from app.rules import apply, initial_state, upgrade_state, RuleError, life_task_views
from app.daynight import clock_view, ensure_clock, DAY_SECONDS
from app.world import walkable

NOW = 1800000000


def journey(hour=6, stamina=37, hp=80, day=1):
    state = initial_state()
    apply(state, 'create', {'name':'日夜旅人'}, NOW)
    state['world_clock'].update(elapsed=((day-1)*1440 + hour*60-360)*DAY_SECONDS/1440,
        updated_at=NOW, running_until=NOW+10, owner='test-world')
    state['stamina'].update(current=stamina, updated_at=NOW)
    state['vitality']['current']=hp
    return state


def bed(state):
    state.update(location='home', position={'x':288,'y':152})


def test_new_journey_start_and_midnight_stays_same_play_day():
    state=journey()
    assert clock_view(state,NOW)['minute']==360 and clock_view(state,NOW)['day']==1
    state=journey(24)
    assert clock_view(state,NOW)['minute']==0 and clock_view(state,NOW)['day']==1


@pytest.mark.parametrize('location',['home','overworld','library','guild','shop'])
@pytest.mark.parametrize('stamina,hp',[(0,100),(37,80),(9,4),(100,1)])
def test_deadline_returns_home_once_and_never_restores_stamina(location,stamina,hp):
    state=journey(24+59/60,stamina,hp);state['location']=location
    before=copy.deepcopy(state)
    apply(state,'world_resume',{'owner':'test-world'},NOW+1.25)
    assert state['location']=='home' and walkable(**state['position'],location='home')
    assert state['vitality']['current']==max(1,hp-10)
    assert state['stamina']['current']==stamina
    assert clock_view(state,NOW+1.25)['day']==2
    assert clock_view(state,NOW+1.25)['minute']==360
    for key in ['inventory','storage','health_points','knowledge_points','skill_points','buildings','activities','quests']:
        assert state[key]==before[key]
    assert state['vitality']['max']==before['vitality']['max']
    for offset in [2,3,4]:apply(state,'world_resume',{'owner':'test-world'},NOW+offset)
    assert state['vitality']['current']==max(1,hp-10) and state['stamina']['current']==stamina


def test_offline_discarded_and_life_pause_preserves_real_deadlines():
    state=journey(24+59/60)
    original=copy.deepcopy(state)
    apply(state,'world_resume',{'owner':'test-world'},NOW+86400*3)
    assert clock_view(state,NOW+86400*3)['minute']==pytest.approx(59)
    assert not state['world_clock']['last_night']
    assert state['vitality']==original['vitality']
    now=NOW+86400*3
    apply(state,'world_pause',{'owner':'test-world'},now+.5)
    minute=clock_view(state,now+.5)['minute']
    for t in [now+100,now+86400]:
        assert clock_view(state,t)['minute']==minute
    assert life_task_views(state,now+86400)['date'] != life_task_views(state,NOW)['date']
    apply(state,'world_resume',{'owner':'new-world'},now+86400)
    assert clock_view(state,now+86400)['minute']==minute


def test_new_owner_does_not_settle_old_views_tail_or_pause_it():
    state=journey(24+59/60)
    apply(state,'world_resume',{'owner':'other-world'},NOW+3)
    assert state['world_clock']['last_night'] is None
    assert clock_view(state,NOW+3)['minute']==pytest.approx(59)
    apply(state,'world_pause',{'owner':'test-world'},NOW+4)
    assert state['world_clock']['owner']=='other-world' and state['world_clock']['running_until']>NOW+4


def test_sleep_advances_date_preserves_production_real_timer_and_daily_quota():
    state=journey(22);bed(state)
    state['plots']={'plot_0':{'planted_at':NOW-10,'ready_at':NOW+50}}
    state['gathered']={'wood_1':NOW+30}
    state['timer']={'id':'timer-test','topic':'读书','elapsed':0,'started_at':NOW,'running':True}
    state['daily']={'2027-01-15':{'wisdom':100}}
    before=copy.deepcopy(state)
    apply(state,'rest',{'target':'home_bed','expected_day':1},NOW)
    assert clock_view(state,NOW)=={'day':2,'minute':360,'day_seconds':1800}
    assert state['stamina']['current']==100 and state['vitality']['current']==100
    for key in ['plots','gathered','timer','daily','inventory','buildings','storage']:
        assert state[key]==before[key]
    with pytest.raises(RuleError):apply(state,'rest',{'target':'home_bed','expected_day':1},NOW+1)
    assert clock_view(state,NOW+1)['day']==2


def test_free_short_rest_is_available_at_zero_but_cannot_cross_deadline():
    state=journey(stamina=0,hp=1);bed(state)
    apply(state,'short_rest',{'target':'home_bed','expected_day':1},NOW)
    assert state['stamina']['current']==20 and state['vitality']['current']==11
    assert clock_view(state,NOW)['minute']==390 and state['inventory']['gold']==20
    state=journey(24.5);bed(state)
    with pytest.raises(RuleError):apply(state,'short_rest',{'target':'home_bed','expected_day':1},NOW)
    with pytest.raises(RuleError):apply(state,'rest',{'target':'home_bed','expected_day':True},NOW)
    state['location']='overworld'
    with pytest.raises(RuleError):apply(state,'rest',{'target':'home_bed','expected_day':1},NOW)


@pytest.mark.parametrize('old_hour',[0.5,2,8.5,23.5])
def test_legacy_resident_clock_migration_is_idempotent_and_nonpunitive(old_hour):
    state=journey()
    state['world_clock']={'elapsed':(1440+old_hour*60-510)*1.25,'updated_at':NOW-86400,'running_until':NOW-86390,'day_seconds':1800}
    before=copy.deepcopy(state)
    ensure_clock(state,NOW)
    assert not state['world_clock']['last_night'] and state['world_clock']['running_until']==0
    assert state['inventory']==before['inventory'] and state['vitality']==before['vitality']
    assert clock_view(state,NOW)['minute']==pytest.approx(360 if 1<=old_hour<6 else old_hour*60)
    migrated=copy.deepcopy(state);ensure_clock(state,NOW+1000)
    assert state==migrated


def test_pre_clock_save_gets_additive_defaults_without_resetting_player():
    state=journey();state.pop('world_clock');state['inventory']['gold']=283
    old=copy.deepcopy(state)
    ensure_clock(state,NOW)
    assert clock_view(state,NOW)['minute']==360 and state['inventory']['gold']==283
    assert {k:v for k,v in state.items() if k!='world_clock'}==old
    assert upgrade_state(state)==state


def api_journey(client,monkeypatch,hour=22):
    current=[NOW];monkeypatch.setattr('app.main.time.time',lambda:current[0])
    cmd(client,'create',{'name':'接口旅人'})
    with Session.begin() as db:
        player=db.scalar(select(Player));state=journey(hour);bed(state);player.state=state
    return current


def test_sleep_api_lost_response_and_competing_receipts_do_not_skip_two_days(client,monkeypatch):
    api_journey(client,monkeypatch)
    key=str(uuid.uuid4());data={'target':'home_bed','expected_day':1}
    assert cmd(client,'rest',data,key).status_code==200
    assert cmd(client,'rest',data,key).json()['replayed']
    assert cmd(client,'rest',data).status_code==422
    state=client.get('/api/state').json()['state']
    assert clock_view(state,NOW)['day']==2


def test_simultaneous_deadline_and_sleep_settle_one_night(client,monkeypatch):
    current=api_journey(client,monkeypatch,24+59/60);current[0]+=1.25
    def action(index):
        return cmd(client,'world_resume',{'owner':'test-world'}) if index==0 else cmd(client,'rest',{'target':'home_bed','expected_day':1})
    with ThreadPoolExecutor(2) as pool: list(pool.map(action,range(2)))
    state=client.get('/api/state').json()['state']
    assert clock_view(state,current[0])['day']==2
    assert state['world_clock']['last_night']['kind']=='faint'
    assert state['vitality']['current']==70 and state['stamina']['current']==37
    # A delayed movement command from yesterday cannot move the returned actor.
    assert cmd(client,'move',{'world_day':1,'location':'home','x':250,'y':180}).status_code==200
    assert client.get('/api/state').json()['state']['position']==state['position']


def test_legacy_session_persists_once_and_recovery_carries_clock(client,monkeypatch):
    current=api_journey(client,monkeypatch)
    with Session.begin() as db:
        player=db.scalar(select(Player));state=copy.deepcopy(player.state)
        state.pop('world_clock');player.state=state
    first=client.post('/api/session').json()['state']
    current[0]+=86400
    second=client.post('/api/session').json()['state']
    assert first['world_clock']==second['world_clock']
    assert second['inventory']==first['inventory']
    key=client.post('/api/recovery-file').json()['recovery_key']
    from fastapi.testclient import TestClient
    from app.main import app
    with TestClient(app) as other:
        other.post('/api/recover',json={'recovery_key':key})
        assert other.get('/api/state').json()['state']['world_clock']==second['world_clock']


def test_simultaneous_legacy_boots_and_inventory_mutation_preserve_both(client,monkeypatch):
    api_journey(client,monkeypatch)
    with Session.begin() as db:
        player=db.scalar(select(Player));state=copy.deepcopy(player.state)
        state.pop('world_clock');state.update(location='overworld',position={'x':328,'y':396})
        state['tools']['held']='axe';state['tools']['resources']['wood_1']={'stage':'tree','work':5,'version':5}
        player.state=state
    def request(index):
        return client.post('/api/session') if index==0 else cmd(client,'tool_strike',{'target':'wood_1','expected_version':5})
    with ThreadPoolExecutor(2) as pool: replies=list(pool.map(request,range(2)))
    assert [r.status_code for r in replies]==[200,200]
    state=client.get('/api/state').json()['state']
    assert state['inventory']['wood']==6 and state['world_clock']['version']==2
