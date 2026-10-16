"""Public village behavior, movement geometry and social reward conservation."""
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
from app.rules import apply, RuleError, upgrade_state
from app.residents import RESIDENTS, routine_definitions, resident_position, clock_view, social_view
from app.world import map_for, walkable, clear_path

NOW = datetime(2026,10,16,12,tzinfo=ZoneInfo('Asia/Shanghai')).timestamp()


def resident_state(id='lia', hour=8.5):
    s = fresh()
    s['world_clock']={'elapsed':(hour*60-510)*1.25,'updated_at':NOW,'running_until':NOW+10,'day_seconds':1800}
    p = resident_position(s,id,NOW)
    s['location'],s['position']=p['location'],{'x':p['x'],'y':p['y']}
    return s


def test_routes_are_walkable_and_only_cross_maps_at_doors():
    for npc in routine_definitions():
        for phase in npc['schedule']:
            assert sum(leg['seconds'] for leg in phase['legs']) < 75
            for leg in phase['legs']:
                for a,b in zip(leg['points'],leg['points'][1:]):
                    assert walkable(*a,leg['location']) and walkable(*b,leg['location'])
                    assert clear_path(dict(x=a[0],y=a[1]),dict(x=b[0],y=b[1]),leg['location'])
            for a,b in zip(phase['legs'],phase['legs'][1:]):
                assert 'overworld' in [a['location'],b['location']]
                inside = a if a['location']!='overworld' else b
                assert [240,328] in [inside['points'][0],inside['points'][-1]]


def test_clock_is_server_owned_and_distinct_from_real_daily_limits():
    s=resident_state(); c=clock_view(s,NOW)
    assert c['day']==1 and c['minute']==510
    # Offline time is bounded by a ten-second heartbeat lease, not hours.
    assert clock_view(s,NOW+1800)['minute']==518
    assert clock_view(s,NOW-100)['minute']==510
    for when in range(0,1801,3):
        apply(s,'world_resume',{'owner':'test-view'},NOW+when)
    assert clock_view(s,NOW+1800)=={'day':2,'minute':510,'day_seconds':1800}
    assert s['inventory']['gold']==20


def test_actual_movement_then_arrival_and_unique_map_membership():
    s=resident_state('noah',11)
    p=resident_position(s,'noah',NOW+10)
    assert p['walking'] and hypot_distance(p,{'x':576,'y':384})>72
    s['location']='overworld';s['position']={'x':576,'y':384}
    with pytest.raises(RuleError):apply(s,'talk',{'target':'noah'},NOW+10)
    s['position']={'x':p['x'],'y':p['y']}
    apply(s,'talk',{'target':'noah'},NOW+10)
    for when in [NOW,NOW+10,NOW+120,NOW+900]:
        ids=[]
        for location in ['overworld','shop','guild','library','home','workshop']:
            ids.extend(o['id'] for o in map_for(location,s,when)['objects'] if o['kind']=='npc')
        assert sorted(ids)==sorted(RESIDENTS)


def hypot_distance(a,b):
    from math import hypot
    return hypot(a['x']-b['x'],a['y']-b['y'])


def test_conversation_pause_release_expiry_and_stale_token():
    s=resident_state('noah',11);p=resident_position(s,'noah',NOW+10)
    s['position']={'x':p['x'],'y':p['y']}
    apply(s,'talk',{'target':'noah'},NOW+10)
    token=s['npc_encounter']['token']
    assert resident_position(s,'noah',NOW+50)['x']==p['x']
    apply(s,'npc_release',{'token':'old-token'},NOW+50)
    assert s['npc_encounter']['token']==token
    before=resident_position(s,'noah',NOW+50)
    apply(s,'npc_release',{'token':token},NOW+50)
    after=resident_position(s,'noah',NOW+50)
    assert hypot_distance(before,after)<.0001
    apply(s,'world_resume',{'owner':'test-view'},NOW+50)
    assert resident_position(s,'noah',NOW+51)['walking']
    # A bounded expiry resumes without a close command, even offline.
    apply(s,'talk',{'target':'noah'},NOW+50)
    for when in range(70,350,30):apply(s,'npc_keep',{'token':s['npc_encounter']['token']},NOW+when)
    assert s['npc_encounter']['until']<=NOW+350
    assert resident_position(s,'noah',NOW+500)['activity']!='正在和你聊天'


@pytest.mark.parametrize('id',RESIDENTS)
def test_greeting_gift_help_and_story_unlock_are_finite(id):
    s=resident_state(id);s['inventory']['plank']=2;s['inventory']['crop']=2
    apply(s,'talk',{'target':id},NOW)
    apply(s,'talk',{'target':id},NOW+1)
    assert s['relationships'][id]==1 and s['attributes']['bond']==5
    favorite=RESIDENTS[id]['favorite'];before=s['inventory'][favorite]
    apply(s,'npc_gift',{'target':id,'item':favorite,'gain':999},NOW+1)
    assert s['inventory'][favorite]==before-1 and s['relationships'][id]==3
    apply(s,'npc_help',{'target':id},NOW+2)
    assert s['relationships'][id]==4 and s['stamina']['current']==96
    for action,data in [('npc_gift',{'item':favorite}),('npc_help',{}),('npc_topic',{'topic':'memory'})]:
        with pytest.raises(RuleError):apply(s,action,{'target':id,**data},NOW+3)
    s['relationships'][id]=5
    assert apply(s,'npc_topic',{'target':id,'topic':'memory'},NOW+3)==RESIDENTS[id]['memory']
    assert social_view(s,'2026-10-16')[id]['memory_unlocked']
    # Many village days do not reset the actual day's gift/help quota.
    with pytest.raises(RuleError):apply(s,'npc_gift',{'target':id,'item':favorite},NOW+1800)


@pytest.mark.parametrize('item',['gold','unowned',[],None])
def test_invalid_gifts_preserve_inventory(item):
    s=resident_state();before=s['inventory'].copy()
    with pytest.raises(RuleError):apply(s,'npc_gift',{'target':'lia','item':item},NOW)
    assert s['inventory']==before and s['relationships']['lia']==0


def test_insufficient_gift_and_help_and_remote_requests_reject():
    s=resident_state();s['stamina'].update(current=0,updated_at=NOW)
    for action,data in [('npc_gift',{'item':'plank'}),('npc_help',{})]:
        with pytest.raises(RuleError):apply(s,action,{'target':'lia',**data},NOW)
    s['location']='home'
    with pytest.raises(RuleError):apply(s,'npc_topic',{'target':'lia','topic':'interest'},NOW)
    assert s['relationships']['lia']==0


def test_shop_counter_and_noah_commissions_work_away_from_original_anchors():
    s=resident_state('mira',12.8);s.update(location='shop',position={'x':240,'y':240})
    apply(s,'market_trade',{'target':'shop_counter','side':'buy','item':'seed','amount':1},NOW)
    assert s['inventory']['seed']==7 and s['inventory']['gold']==18
    with pytest.raises(RuleError):apply(s,'market_trade',{'target':'mira','side':'buy','item':'seed'},NOW)
    s=resident_state('noah',21);key=str(uuid.uuid4())
    assert s['location']=='guild'
    apply(s,'quest_accept',{'quest_id':'forest_path'},NOW)
    assert s['quests']['forest_path']['status']=='active'
    apply(s,'life_accept',{'target':'noah','task_id':key,'hours':1,'kind':'work'},NOW)
    assert s['life_tasks'][key]['ready_at']==NOW+3600
    apply(s,'life_claim',{'target':'noah','task_id':key},NOW+3600)
    assert s['skill_points']==1


def test_china_midnight_and_migration_preserve_player_assets():
    s=resident_state();before=s['inventory'].copy();s['npc_gifts']['lia']='2026-10-15'
    apply(s,'npc_gift',{'target':'lia','item':'seed'},NOW)
    assert s['inventory']['seed']==before['seed']-1
    old=copy.deepcopy(s)
    for key in ['npc_gifts','npc_helped','npc_encounter']:old.pop(key)
    migrated=upgrade_state(old)
    assert migrated['inventory']==s['inventory'] and migrated['character']==s['character']


def test_api_gift_retry_and_concurrent_commands_only_consume_once(client,monkeypatch):
    monkeypatch.setattr('app.main.time.time',lambda:NOW)
    create(client)
    with Session.begin() as db:
        player=db.scalar(select(Player));s=copy.deepcopy(player.state)
        s.update(location='overworld',position={'x':624,'y':272})
        s['inventory']['plank']=2;player.state=s
    key=str(uuid.uuid4());data={'target':'lia','item':'plank'}
    assert cmd(client,'npc_gift',data,key).status_code==200
    assert cmd(client,'npc_gift',data,key).json()['replayed']
    assert cmd(client,'npc_gift',data).status_code==422
    view=client.get('/api/state').json()['state']
    assert view['inventory']['plank']==1 and view['relationships']['lia']==2
    cookie=dict(client.cookies)
    def help_once(_):
        with TestClient(app) as other:
            other.cookies.update(cookie)
            return cmd(other,'npc_help',{'target':'lia'}).status_code
    with ThreadPoolExecutor(2) as pool:statuses=list(pool.map(help_once,range(2)))
    assert sorted(statuses)==[200,422]
    view=client.get('/api/state').json()['state']
    assert view['relationships']['lia']==3 and view['stamina']['current']==96


def test_reading_pauses_every_resident_and_inactive_tab_cannot_pause_active_view():
    s=resident_state('noah',11)
    apply(s,'world_resume',{'owner':'active-view'},NOW)
    from app.residents import clock_elapsed
    before=clock_elapsed(s,NOW+3)
    apply(s,'world_pause',{'owner':'old-view'},NOW+3)
    assert s['world_clock']['running_until']>NOW+3
    apply(s,'world_pause',{'owner':'active-view'},NOW+3)
    assert clock_elapsed(s,NOW+3600)==before
    positions=[resident_position(s,id,NOW+3) for id in RESIDENTS]
    assert [resident_position(s,id,NOW+3600) for id in RESIDENTS]==positions
    apply(s,'world_resume',{'owner':'new-view'},NOW+3600)
    assert clock_elapsed(s,NOW+3601)==before+1
    assert s['inventory']['gold']==20
