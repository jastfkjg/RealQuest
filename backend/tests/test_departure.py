"""Departure behavior, conservation, retry safety and compatible saves."""
import copy
import uuid
from collections import deque
from concurrent.futures import ThreadPoolExecutor
import pytest
from sqlalchemy import select
from test_game import client, cmd
from app.db import Session
from app.models import Player
from app.rules import apply, initial_state, upgrade_state, RuleError
from app.daynight import clock_view, DAY_SECONDS
from app.journey import quotes
from app.world import map_for, walkable
NOW=1800000000


def ready():
    s=initial_state();apply(s,'create',{'name':'远行旅人'},NOW)
    s['world_clock']['running_until']=0
    s['quests']['settle_in']['status']='claimed'
    s['quests']['leave_valley']={'status':'active','accepted_at':NOW}
    # This suite exercises the independent travel segment after its new prerequisite.
    s['village_combat']['gate_open']=True
    return s


def approach(s,location,target):
    s['location']=location
    obj=next(o for o in map_for(location)['objects'] if o['id']==target)
    s['position']={'x':obj['x'],'y':obj['y']+24}


def go(s,location,target,option):
    approach(s,location,target)
    return apply(s,'travel',{'target':target,'option':option,'expected_day':clock_view(s,NOW)['day'],'expected_location':location},NOW)


def test_ferry_chapter_stay_return_claim_conserves_old_progress():
    s=ready();before=copy.deepcopy(s)
    for loc,target,option in [('overworld','village_departure','depart'),('crossing','adu','rope'),('crossing','adu','ferry'),('mountain','mountain_pass','climb'),('city','to_inn','enter_inn'),('inn','lanya','deliver'),('inn','lanya','book')]:go(s,loc,target,option)
    assert s['stamina']['current']==40
    s['position']={'x':288,'y':152};apply(s,'rest',{'target':'inn_bed','expected_day':1},NOW)
    assert s['location']=='inn' and s['stamina']['current']==100 and clock_view(s,NOW)['day']==2
    for loc,target,option in [('inn','inn_exit','exit_inn'),('city','to_mountain','descend'),('mountain','to_crossing','cross_back'),('crossing','to_village','village')]:go(s,loc,target,option)
    approach(s,'overworld','board');apply(s,'quest_claim',{'quest_id':'leave_valley'},NOW)
    assert s['quests']['leave_valley']['status']=='claimed' and s['inventory']['gold']==20-6-6+12-8-6+20
    for key in ['storage','buildings','health_points','activities']:assert s[key]==before[key]
    with pytest.raises(RuleError):apply(s,'quest_claim',{'quest_id':'leave_valley'},NOW)


@pytest.mark.parametrize('method,level,gold',[('repair_self',1,20),('repair_help',0,10)])
def test_both_bridge_methods_charge_once_and_return_free(method,level,gold):
    s=ready();s['inventory'].update(plank=6,stone=4);s['skill_growth']['building']=level
    go(s,'crossing','river_bridge',method);before=copy.deepcopy(s)
    with pytest.raises(RuleError):go(s,'crossing','river_bridge',method)
    assert s==before
    go(s,'crossing','river_bridge','bridge');go(s,'mountain','to_crossing','cross_back')
    assert s['departure']['bridge_repaired'] and s['inventory']['gold']==gold
    assert s['inventory']['plank']==s['inventory']['stone']==0


@pytest.mark.parametrize('option,target,location',[('repair_self','river_bridge','crossing'),('bridge','river_bridge','crossing'),('climb','mountain_pass','mountain'),('book','lanya','inn'),('deliver','lanya','inn')])
def test_failed_actions_preserve_resources(option,target,location):
    s=ready();s['inventory']['gold']=0;s['quests'].pop('leave_valley')
    approach(s,location,target);before=copy.deepcopy(s)
    with pytest.raises(RuleError):go(s,location,target,option)
    assert s==before


def test_current_stamina_and_arrival_deadline():
    s=ready();s['departure']['rope_ready']=True;s['stamina'].update(current=59,max=150,updated_at=NOW)
    approach(s,'mountain','mountain_pass');before=copy.deepcopy(s)
    with pytest.raises(RuleError,match='当前体力'):go(s,'mountain','mountain_pass','climb')
    assert s==before
    s['stamina']['current']=60;s['world_clock']['elapsed']=(22*60-360)*DAY_SECONDS/1440
    before=copy.deepcopy(s)
    with pytest.raises(RuleError,match='01:00'):go(s,'mountain','mountain_pass','climb')
    assert s==before


def test_no_money_has_work_and_escape_route_without_repeated_rewards():
    s=ready();s['inventory']['gold']=0
    go(s,'crossing','adu','dock_work');go(s,'crossing','adu','ferry')
    assert s['location']=='mountain' and s['inventory']['gold']==0
    go(s,'mountain','mountain_camp','trail_work');go(s,'mountain','mountain_camp','rope')
    assert s['inventory']['gold']==6 and s['departure']['rope_ready']
    before=copy.deepcopy(s)
    with pytest.raises(RuleError):go(s,'mountain','mountain_camp','trail_work')
    assert s==before
    go(s,'mountain','to_crossing','cross_back');assert s['inventory']['gold']==0


def test_inn_requires_paid_same_day_faint_returns_home():
    s=ready();approach(s,'inn','inn_bed');s['position']={'x':288,'y':152};before=copy.deepcopy(s)
    with pytest.raises(RuleError,match='订房'):apply(s,'rest',{'target':'inn_bed','expected_day':1},NOW)
    assert s==before
    go(s,'inn','lanya','book');s['stamina']['current']=17
    s['world_clock']['elapsed']=(1500-360)*DAY_SECONDS/1440
    apply(s,'world_resume',{'owner':'departure-test'},NOW)
    assert s['location']=='home' and s['stamina']['current']==17 and s['vitality']['current']==90
    approach(s,'inn','inn_bed');before=copy.deepcopy(s)
    with pytest.raises(RuleError,match='订房'):apply(s,'rest',{'target':'inn_bed','expected_day':2},NOW)
    assert s==before and 'slept_inn' not in s['events']


def test_old_save_additive_only():
    s=ready();s.pop('departure');s['inventory']['wood']=19;s['storage']['stone']=27
    s['activities']=[{'id':'old-note','kind':'study','amount':25,'date':'2026-10-01','xp':25}]
    before=copy.deepcopy(s);after=upgrade_state(s)
    assert s==before
    for key in before:assert after[key]==before[key]
    assert not after['departure']['bridge_repaired']


def test_all_new_object_interactions_and_arrival_points_reachable():
    for map_id,start in [('crossing',(128,400)),('mountain',(128,472)),('city',(160,480)),('inn',(240,294))]:
        m=map_for(map_id);queue=deque([start]);seen={start}
        assert walkable(*start,location=map_id)
        while queue:
            x,y=queue.popleft()
            for p in [(x+8,y),(x-8,y),(x,y+8),(x,y-8)]:
                if p not in seen and walkable(*p,location=map_id):seen.add(p);queue.append(p)
        for obj in m['objects']:assert any((x-obj['x'])**2+(y-obj['y'])**2<=60**2 for x,y in seen),(map_id,obj['id'])
    for q in quotes(ready(),NOW)['options']:
        if q['destination']:assert walkable(**q['position'],location=q['destination']),q['id']


def test_concurrent_booking_delivery_receipts_and_recovery(client):
    cmd(client,'create',{'name':'双签旅人'})
    with Session.begin() as db:
        p=db.scalar(select(Player));s=ready();approach(s,'inn','lanya');p.state=s
    def act(option,key=None):return cmd(client,'travel',{'target':'lanya','option':option,'expected_day':1,'expected_location':'inn'},key)
    with ThreadPoolExecutor(2) as pool:assert sorted(pool.map(lambda _:act('book').status_code,range(2)))==[200,422]
    key=str(uuid.uuid4());first=act('deliver',key);second=act('deliver',key)
    assert first.status_code==second.status_code==200 and second.json()['replayed']
    current=client.get('/api/state').json()['state']
    assert current['inventory']['gold']==24 and current['departure']['letter_delivered']
    credential=client.post('/api/recovery-file').json()['recovery_key']
    assert client.post('/api/recover',json={'recovery_key':credential}).status_code==200
    assert client.get('/api/state').json()['state']==current
    assert act('book').status_code==422 and client.get('/api/state').json()['state']==current


def test_stale_day_location_remote_target_rejected(client):
    cmd(client,'create',{'name':'路口旅人'})
    with Session.begin() as db:
        p=db.scalar(select(Player));s=ready();approach(s,'crossing','adu');p.state=s
    for change in [{'expected_day':2},{'expected_location':'inn'},{'target':'lanya','option':'book'}]:
        data={'target':'adu','option':'ferry','expected_day':1,'expected_location':'crossing',**change}
        assert cmd(client,'travel',data).status_code==422
    assert client.get('/api/state').json()['state']['inventory']['gold']==20
