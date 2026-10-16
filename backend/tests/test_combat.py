"""Public village commands and deterministic combat, without changing player data."""
import copy
import math
import uuid
from concurrent.futures import ThreadPoolExecutor
import pytest
from sqlalchemy import select
from test_game import client, cmd
from app.db import Session
from app.models import Player
from app.rules import initial_state, apply, upgrade_state, RuleError
from app.combat import WEAPONS, ENEMIES, floor_enemies, combat_view, ensure_combat, defeated
from app.world import map_for, walkable
from app.journey import quotes

NOW = 1800000000.
OWNER = 'combat-test-owner'


def player():
    s=initial_state(); apply(s,'create',{'name':'洞穴旅人'},NOW)
    s['world_clock'].update(owner=OWNER,running_until=0)
    return s


def at(s,location,target):
    s['location']=location
    o=next(o for o in map_for(location)['objects'] if o['id']==target)
    s['position']={'x':o['x'],'y':o['y']}


def enter(s):
    at(s,'overworld','cave_entry'); apply(s,'cave_interact',{'target':'cave_entry'},NOW)
    return s


def ticking(s,now,**data):
    s['world_clock'].update(owner=OWNER,updated_at=now,running_until=now+10)
    c=s['village_combat']
    return apply(s,'cave_tick',{'owner':OWNER,'location':s['location'],'encounter':c['encounter'],'seq':c['input_seq']+1,'dx':0,'dy':0,'aim_x':240,'aim_y':344,**data},now)


def test_new_player_can_buy_initial_weapon_without_stats_and_equip():
    s=player(); s['inventory']['gold']=32; at(s,'workshop','armory_counter')
    apply(s,'gear_buy',{'target':'armory_counter','item':'stone_sword'},NOW)
    apply(s,'gear_equip',{'item':'stone_sword'},NOW)
    assert s['inventory']['gold']==8 and s['village_combat']['equipped']=='stone_sword'
    assert s['knowledge_growth']=={'science':0,'magic':0}


@pytest.mark.parametrize('item,branch,level',[('stone_sword','magic',1),('reinforced_sword','science',1),('spring_spear','science',1),('glow_staff','magic',2)])
def test_crafting_gates_resources_and_exact_output(item,branch,level):
    s=player(); at(s,'workshop','armory_counter')
    s['inventory'].update(gold=100,plank=10,stone=10,shell=10,crystal=10,gel=10)
    before=copy.deepcopy(s)
    with pytest.raises(RuleError): apply(s,'gear_craft',{'target':'armory_counter','item':item},NOW)
    assert s==before
    s['skill_growth']['building']=1
    with pytest.raises(RuleError): apply(s,'gear_craft',{'target':'armory_counter','item':item},NOW)
    s['knowledge_growth'][branch]=level; before=copy.deepcopy(s['inventory'])
    apply(s,'gear_craft',{'target':'armory_counter','item':item},NOW)
    assert s['inventory'][item]==1
    for k,n in WEAPONS[item]['costs'].items(): assert s['inventory'][k]==before[k]-n


def test_five_floor_population_loot_and_shortcuts():
    s=enter(player()); totals={k:0 for k in ['slime','bat','beetle']}
    for floor in range(1,5):
        s['location']=f'cave_{floor}'
        enemies=floor_enemies(s,NOW)
        for enemy in enemies:
            totals[enemy['kind']]+=1; enemy['hp']=0; defeated(s,enemy)
    assert totals=={'slime':7,'bat':4,'beetle':4}
    assert s['inventory']['gold']==20+42
    assert (s['inventory']['gel'],s['inventory']['crystal'],s['inventory']['shell'])==(7,4,4)
    assert s['village_combat']['unlocked']==5
    at(s,'cave_1','cave_rope');apply(s,'cave_interact',{'target':'cave_rope'},NOW)
    assert s['location']=='cave_3'


def test_boss_first_stone_and_next_day_regular_reward_only():
    s=enter(player());s['location']='cave_5';e=floor_enemies(s,NOW)[0]
    e['hp']=0;defeated(s,e)
    assert s['inventory']['gate_stone']==1 and s['inventory']['gold']==50
    before=copy.deepcopy(s['inventory']);defeated(s,e);assert s['inventory']==before
    s['world_clock']['elapsed']=1800
    e=floor_enemies(s,NOW)[0];e['hp']=0;defeated(s,e)
    assert s['inventory']['gate_stone']==1 and s['inventory']['gold']==58


@pytest.mark.parametrize('boss,stone,magic',[(False,1,3),(True,0,3),(True,1,2)])
def test_gate_requires_all_conditions_without_consumption(boss,stone,magic):
    s=player();at(s,'overworld','village_departure')
    s['village_combat']['boss_first']=boss;s['inventory']['gate_stone']=stone;s['knowledge_growth']['magic']=magic
    before=copy.deepcopy(s)
    with pytest.raises(RuleError):apply(s,'gate_open',{},NOW)
    assert s==before
    assert any('石门' in r for r in next(o for o in quotes(s,NOW)['options'] if o['id']=='depart')['reasons'])


def test_gate_opens_once_and_never_relocks_after_return():
    s=player();at(s,'overworld','village_departure');s['village_combat']['boss_first']=True
    s['inventory']['gate_stone']=1;s['knowledge_growth']['magic']=3
    apply(s,'gate_open',{},NOW);apply(s,'gate_open',{},NOW)
    assert s['village_combat']['gate_open'] and s['inventory']['gate_stone']==0
    assert not any('石门' in r for r in next(o for o in quotes(s,NOW)['options'] if o['id']=='depart')['reasons'])
    with pytest.raises(RuleError):
        at(s,'overworld','cave_entry');apply(s,'stone_recover',{},NOW)


def test_legacy_departed_save_adds_passage_without_rewards_or_rewrite():
    s=player();s.pop('village_combat');s['location']='city';s['inventory']['wood']=17
    old=copy.deepcopy(s);v=upgrade_state(s)
    assert s==old and v['village_combat']['legacy_passage'] and v['village_combat']['gate_open']
    assert not v['village_combat']['boss_first'] and v['inventory']==old['inventory']


def test_server_clock_movement_pause_wrong_owner_and_huge_time_gap():
    s=enter(player());before=copy.deepcopy(s['position'])
    ticking(s,NOW,dx=1);ticking(s,NOW+.2,dx=1)
    assert math.isclose(s['position']['x']-before['x'],32,abs_tol=.001)
    apply(s,'world_pause',{'owner':OWNER},NOW+.2)
    frozen=copy.deepcopy(s['village_combat']);pos=copy.deepcopy(s['position'])
    apply(s,'cave_tick',dict(owner=OWNER,location='cave_1',encounter=s['village_combat']['encounter'],seq=s['village_combat']['input_seq']+1,dx=1,dy=0,aim_x=300,aim_y=300,attack=True),NOW+.3)
    assert s['position']==pos and s['village_combat']['time']==frozen['time']
    ticking(s,NOW+99,dx=1);assert s['position']==pos
    with pytest.raises(RuleError):apply(s,'cave_tick',{'owner':'other-page','location':'cave_1'},NOW+99)
    with pytest.raises(RuleError):apply(s,'move',{'x':600,'y':96},NOW+99)


def test_attack_uses_server_range_armor_cost_and_cooldown():
    s=enter(player());s['inventory']['stone_sword']=1;s['village_combat']['equipped']='stone_sword'
    enemies=floor_enemies(s,NOW);s['position']={'x':220,'y':344}
    ticking(s,NOW);ticking(s,NOW+.1,attack=True);ticking(s,NOW+.3,attack=True)
    assert s['stamina']['current']==99 and s['village_combat']['floors']['1'][0]['hp']==10
    ticking(s,NOW+.4,attack=True);assert s['stamina']['current']==99
    # Client-supplied damage and time are ignored, not applied as assets.
    ticking(s,NOW+.5,damage=999,elapsed=999)
    assert s['inventory']['gold']==20 and s['village_combat']['floors']['1'][0]['hp']==10


def test_reentry_reload_no_respawn_and_ordinary_day_reset():
    s=enter(player());e=floor_enemies(s,NOW)[0];e['hp']=0;defeated(s,e)
    apply(s,'cave_retreat',{},NOW);enter(s)
    assert floor_enemies(s,NOW)[0]['hp']==0
    s=upgrade_state(s);assert floor_enemies(s,NOW)[0]['hp']==0
    s['world_clock']['elapsed']=1800
    assert floor_enemies(s,NOW)[0]['hp']==18


def test_all_cave_anchors_spawns_and_monsters_have_walkable_routes():
    from collections import deque
    for floor in range(1,6):
        location=f'cave_{floor}';m=map_for(location);queue=deque([(64,352)]);seen={(64,352)}
        while queue:
            x,y=queue.popleft()
            for p in [(x+8,y),(x-8,y),(x,y+8),(x,y-8)]:
                if p not in seen and walkable(*p,location=location):seen.add(p);queue.append(p)
        for o in m['objects']:assert any(math.hypot(x-o['x'],y-o['y'])<60 for x,y in seen)


def test_buy_retry_and_gate_concurrency_are_transactional(client):
    cmd(client,'create',{'name':'武备结算'})
    with Session.begin() as db:
        p=db.scalar(select(Player));s=player();at(s,'workshop','armory_counter');s['inventory']['gold']=32;p.state=s
    key=str(uuid.uuid4());data={'target':'armory_counter','item':'stone_sword'}
    first=cmd(client,'gear_buy',data,key);again=cmd(client,'gear_buy',data,key)
    assert first.status_code==again.status_code==200 and again.json()['replayed']
    assert again.json()['state']['inventory']['gold']==8 and again.json()['state']['inventory']['stone_sword']==1
    with Session.begin() as db:
        p=db.scalar(select(Player));s=copy.deepcopy(p.state);at(s,'overworld','village_departure')
        s['village_combat']['boss_first']=True;s['inventory']['gate_stone']=1;s['knowledge_growth']['magic']=3;p.state=s
    with ThreadPoolExecutor(2) as pool:assert list(pool.map(lambda _:cmd(client,'gate_open',{}).status_code,range(2)))==[200,200]
    state=client.get('/api/state').json()['state']
    assert state['combat']['gate_open'] and state['inventory']['gate_stone']==0


def test_enemy_routes_around_pillar_and_cannot_windup_through_wall():
    from app.combat import step_enemies
    s=enter(player());c=s['village_combat'];e=floor_enemies(s,NOW)[0]
    e.update(x=340,y=352,phase='pursue');s['position']={'x':440,'y':352}
    start=math.hypot(e['x']-440,e['y']-352)
    for _ in range(180):
        c['time']+=.025;step_enemies(s,.025)
    assert math.hypot(e['x']-440,e['y']-352)<start-40
    assert all(walkable(e['x'],e['y'],'cave_1') for e in c['floors']['1'])


def test_soup_pause_interruption_limit_and_death_preserve_resources():
    from app.combat import tick, retreat
    s=enter(player());s['location']='cave_5';c=s['village_combat'];floor_enemies(s,NOW)
    def step(now, **data):
        s['world_clock'].update(owner=OWNER,updated_at=now,running_until=now+10)
        return tick(s, dict(owner=OWNER,location='cave_5',encounter=c['encounter'],seq=c['input_seq']+1,
                            dx=0,dy=0,aim_x=240,aim_y=344,**data), now)
    s['inventory']['soup']=3;s['vitality']['current']=50;s['position']={'x':64,'y':352}
    step(NOW);step(NOW+.1,soup=True)
    assert c['cast']['kind']=='soup'
    s['world_clock']['running_until']=0
    tick(s, dict(owner=OWNER,location='cave_5',encounter=c['encounter'],seq=c['input_seq']+1), NOW+.2)
    frozen=c['time'];c['last_tick']=0;step(NOW+10)
    assert c['time']==frozen and s['inventory']['soup']==3
    for i in range(7):step(NOW+10.2+i*.2)
    assert s['inventory']['soup']==2 and s['vitality']['current']==70 and c['soups_used']==1
    c['soup_at']=0;step(NOW+12,soup=True);step(NOW+12.1,soup=True)
    c['hurt_until']=c['time']+2
    for i in range(7):step(NOW+12.3+i*.2)
    assert s['inventory']['soup']==2
    c.update(cast=None,soups_used=2,soup_at=0)
    step(NOW+14,soup=True);assert c['cast'] is None
    before=copy.deepcopy(s['inventory']);stamina=s['stamina']['current'];c['unlocked']=5
    s['vitality']['current']=0;retreat(s,NOW+15,True)
    assert s['location']=='overworld' and s['vitality']['current']==30
    assert s['inventory']==before and s['stamina']['current']==stamina and c['unlocked']==5
    assert '5' not in c['floors']


def test_spell_fee_key_recovery_and_remote_gate_are_guarded():
    s=player();at(s,'library','spell_desk');s['knowledge_growth']['magic']=1
    apply(s,'spark_learn',{'target':'spell_desk'},NOW)
    assert s['inventory']['gold']==12
    with pytest.raises(RuleError):apply(s,'spark_learn',{'target':'spell_desk'},NOW)
    c=s['village_combat'];c['boss_first']=True
    at(s,'overworld','cave_entry');apply(s,'stone_recover',{},NOW)
    with pytest.raises(RuleError):apply(s,'stone_recover',{},NOW)
    s['knowledge_growth']['magic']=3
    with pytest.raises(RuleError):apply(s,'gate_open',{},NOW)
    assert s['inventory']['gate_stone']==1


def test_tick_receipts_bounded_and_ordered_across_retry_and_encounter(client):
    import time
    from sqlalchemy import func
    from app.models import Receipt
    cmd(client,'create',{'name':'战斗同步'})
    with Session.begin() as db:
        p=db.scalar(select(Player));s=enter(player());now=time.time()
        s['world_clock'].update(owner=OWNER,updated_at=now,running_until=now+10);p.state=s
    c=s['village_combat'];base=dict(owner=OWNER,location='cave_1',encounter=c['encounter'],dx=0,dy=0,aim_x=240,aim_y=344)
    key=str(uuid.uuid4());first=cmd(client,'cave_tick',{**base,'seq':1},key)
    retry=cmd(client,'cave_tick',{**base,'seq':1},key)
    assert first.status_code==retry.status_code==200 and retry.json()['replayed']
    assert cmd(client,'cave_tick',{**base,'seq':1,'dx':1},key).status_code==409
    for seq in range(2,12):assert cmd(client,'cave_tick',{**base,'seq':seq}).status_code==200
    assert cmd(client,'cave_tick',{**base,'seq':1}).status_code==422
    with Session() as db:
        assert db.scalar(select(func.count()).select_from(Receipt).where(Receipt.action=='cave_tick'))==0
    assert cmd(client,'cave_retreat').status_code==200
    with Session.begin() as db:
        p=db.scalar(select(Player));s=copy.deepcopy(p.state);at(s,'overworld','cave_entry');p.state=s
    assert cmd(client,'cave_interact',{'target':'cave_entry'}).status_code==200
    assert cmd(client,'cave_tick',{**base,'seq':12}).status_code==422


def test_departure_journal_tracks_combat_magic_and_gate_without_resetting_claims():
    from app.quests import progress, quest_views
    s=player();assert progress(s,'leave_valley')[:3]==[False,False,False]
    s['village_combat']['boss_first']=True;s['knowledge_growth']['magic']=3
    assert progress(s,'leave_valley')[:3]==[True,True,False]
    s['village_combat']['gate_open']=True;s['knowledge_growth']['magic']=0
    assert progress(s,'leave_valley')[:3]==[True,True,True]
    s['quests']['leave_valley']={'status':'claimed','accepted_at':NOW}
    assert next(q for q in quest_views(s) if q['id']=='leave_valley')['status']=='claimed'


def test_midnight_faint_takes_priority_over_combat_and_does_not_award_loot():
    s=enter(player());s['location']='cave_5';floor_enemies(s,NOW)
    s['vitality']['current']=5;s['inventory']['gate_stone']=0
    s['world_clock'].update(elapsed=1425,updated_at=NOW,running_until=0)
    before=copy.deepcopy(s['inventory'])
    apply(s,'cave_tick',{},NOW)
    assert s['location']=='home' and s['vitality']['current']==1
    assert s['world_clock']['last_night']['kind']=='faint' and s['inventory']==before
    assert not s['village_combat']['boss_first']


def test_boss_sweep_and_shard_wave_match_the_authoritative_tells():
    from app.combat import step_enemies, tick
    s=enter(player());s['location']='cave_5';c=s['village_combat'];e=floor_enemies(s,NOW)[0]
    s['position']={'x':440,'y':224};c['time']=1
    e.update(phase='windup',until=1,style='sweep',tx=440,ty=224)
    step_enemies(s,.025)
    assert s['vitality']['current']==92 and e['phase']=='recover'
    c['time']=4;c['hurt_until']=0;s['position']={'x':360,'y':224}
    e.update(phase='windup',until=4,style='sweep',tx=440,ty=224)
    step_enemies(s,.025);assert s['vitality']['current']==92
    e.update(phase='windup',until=4,style='shot',move=3,tx=360,ty=224)
    step_enemies(s,.025);assert len(c['projectiles'])==3
    # Overlapping shard colliders from one wave can deal at most six damage.
    c['projectiles']=[dict(x=360,y=224,angle=0,until=8,wave='test-wave') for _ in range(3)]
    c['last_tick']=NOW;s['world_clock'].update(owner=OWNER,updated_at=NOW+.1,running_until=NOW+10)
    tick(s,dict(owner=OWNER,location='cave_5',encounter=c['encounter'],seq=1,dx=0,dy=0,aim_x=400,aim_y=224),NOW+.1)
    assert s['vitality']['current']==86


def test_craft_retry_and_competing_last_materials_produce_one_weapon(client):
    cmd(client,'create',{'name':'图纸结算'})
    with Session.begin() as db:
        p=db.scalar(select(Player));s=player();at(s,'workshop','armory_counter')
        s['skill_growth']['building']=1;s['knowledge_growth']['science']=1
        s['inventory'].update(plank=2,stone=2);p.state=s
    key=str(uuid.uuid4());data={'target':'armory_counter','item':'stone_sword'}
    with ThreadPoolExecutor(2) as pool:
        statuses=list(pool.map(lambda _:cmd(client,'gear_craft',data,key).status_code,range(2)))
    assert statuses==[200,200]
    assert cmd(client,'gear_craft',data).status_code==422
    s=client.get('/api/state').json()['state']
    assert s['inventory']['stone_sword']==1 and s['inventory']['plank']==s['inventory']['stone']==0


def test_legacy_journal_labels_exemption_without_claiming_boss_achievement():
    from app.quests import quest_views
    s=player();s.pop('village_combat');s['location']='city';s=upgrade_state(s)
    quest=next(q for q in quest_views(s) if q['id']=='leave_valley')
    assert '旧旅程' in quest['objectives'][0] and quest['checks'][:3]==[True,True,True]
    assert not s['village_combat']['boss_first'] and not s['inventory']['gate_stone']
