"""Progressive story contracts, using authoritative actions and isolated fixtures."""
import copy
import uuid
import pytest
from app.rules import initial_state, apply, upgrade_state, RuleError
from app.quests import quest_views, MAIN_QUESTS
from app.world import map_for
from app.daynight import clock_view
from app.combat import floor_enemies, defeated
from test_game import client, cmd, create
from app.db import Session
from app.models import Player
from sqlalchemy import select

NOW = 1800000000

def player():
    s=initial_state();apply(s,'create',{'name':'新生活'},NOW)
    s['world_clock']['running_until']=0
    return s

def at(s,place,target):
    o=next(o for o in map_for(place,s,NOW)['objects'] if o['id']==target)
    s.update(location=place,position={'x':o['x'],'y':o['y']})

def entries(s):
    return {q['id']:q for q in quest_views(s)}

def board(s,action,id):
    at(s,'overworld','board');return apply(s,action,{'quest_id':id},NOW)

def settle(s):
    at(s,'overworld','home');apply(s,'enter',{'target':'home'},NOW)
    at(s,'overworld','wood_1');apply(s,'gather',{'target':'wood_1'},NOW)
    board(s,'quest_claim','settle_in')

def crops(s,seed='seed'):
    for id in ['plot_0','plot_1']:
        at(s,'overworld',id);apply(s,'plant',{'target':id,'seed':seed},NOW)
    at(s,'home','home_bed');day=clock_view(s,NOW)['day']
    apply(s,'rest',{'target':'home_bed','kind':'sleep','expected_day':day,'world_day':day},NOW)
    for id in ['plot_0','plot_1']:
        at(s,'overworld',id);apply(s,'harvest',{'target':id},NOW)


def commission(s, building):
    from app.daynight import DAY_SECONDS
    from app.construction import settle_construction
    s.update(location='workshop',position={'x':96,'y':288})
    level=s['buildings']['home'] if building=='home' else s['ranch']['buildings'][building]
    apply(s,'construction_order',{'target':'carpenter','building':building,'expected_level':level},NOW)
    s['world_clock']['elapsed']+=DAY_SECONDS
    settle_construction(s,NOW)

def farm_and_home(s):
    settle(s);board(s,'quest_accept','first_harvest');crops(s)
    assert entries(s)['first_harvest']['status']=='ready'
    board(s,'quest_claim','first_harvest');assert s['inventory']['crop']==0
    board(s,'quest_accept','craft_planks')
    at(s,'workshop','workshop_counter');apply(s,'craft',{'target':'workshop_counter'},NOW)
    board(s,'quest_claim','craft_planks');board(s,'quest_accept','craft_home')
    commission(s,'home')
    board(s,'quest_claim','craft_home')

def ranch(s):
    board(s,'quest_accept','ranch_start')
    at(s,'overworld','pasture_gate');apply(s,'ranch_enter',{},NOW)
    commission(s,'coop')
    at(s,'pasture','ranch_ledger');apply(s,'ranch_buy',{'target':'ranch_ledger','species':'chicken','expected_next':1},NOW)
    at(s,'pasture','animal_1');apply(s,'ranch_feed',{'target':'animal_1','days':1},NOW)
    assert s['ranch']['animals']['animal_1']['age']==0
    assert entries(s)['ranch_start']['status']=='ready'
    board(s,'quest_claim','ranch_start')

def test_natural_farm_craft_build_ranch_chain_has_funding_without_grind():
    s=player();assert list(entries(s))==['settle_in']
    farm_and_home(s)
    assert 'ranch_start' in entries(s) and 'first_expedition' not in entries(s)
    ranch(s)
    assert 'first_expedition' in entries(s) and 'leave_valley' not in entries(s)
    # Actual earnings fund a normal sword after the coop/chicken, without inventory grants.
    at(s,'workshop','armory_counter');apply(s,'gear_buy',{'target':'armory_counter','item':'stone_sword'},NOW)
    apply(s,'gear_equip',{'item':'stone_sword'},NOW)
    assert s['inventory']['gold']>=0 and s['inventory']['animal_feed']==2
    assert upgrade_state(s)==s


def test_future_quests_hidden_and_direct_acceptance_rejected_without_mutation():
    s=player();settle(s)
    assert set(entries(s))=={'settle_in','first_harvest','market_neighbor'}
    for id in ['craft_planks','ranch_start','first_expedition','gate_story','leave_valley','forest_path','rune_research','wide_world']:
        before=copy.deepcopy(s)
        with pytest.raises(RuleError):board(s,'quest_accept',id)
        assert s==before
    at(s,'overworld','village_departure');before=copy.deepcopy(s)
    with pytest.raises(RuleError):apply(s,'intro_brief',{'target':'village_departure'},NOW)
    assert s==before


def test_radish_harvest_and_physical_delivery_are_distinct_and_completed_work_persists():
    s=player();settle(s);board(s,'quest_accept','first_harvest')
    s['inventory']['crop']=4
    assert entries(s)['first_harvest']['checks']==[False,True]
    s['stats']['harvest']=99;s['stats']['harvest_wheat']=99
    assert not entries(s)['first_harvest']['checks'][0]
    s['inventory']['crop']=0;crops(s)
    at(s,'shop','shop_counter');apply(s,'market_trade',{'target':'shop_counter','side':'sell','item':'crop','amount':1},NOW)
    assert entries(s)['first_harvest']['checks']==[True,False]
    before=copy.deepcopy(s);at(s,'overworld','board');before=copy.deepcopy(s)
    with pytest.raises(RuleError):apply(s,'quest_claim',{'quest_id':'first_harvest'},NOW)
    assert s==before
    crops(s);board(s,'quest_claim','first_harvest');assert s['inventory']['crop']==3
    assert entries(s)['first_harvest']['checks']==[True,True]
    gold=s['inventory']['gold']
    with pytest.raises(RuleError):board(s,'quest_claim','first_harvest')
    assert s['inventory']['gold']==gold


def test_early_crafting_building_and_care_are_recognized_without_repeating():
    s=player();farm_and_home(s);ranch(s)
    # Existing completed public actions are retained when a task is accepted later.
    s['quests'].pop('ranch_start');board(s,'quest_accept','ranch_start')
    assert entries(s)['ranch_start']['status']=='ready'
    s['quests'].pop('craft_planks');board(s,'quest_accept','craft_planks')
    assert entries(s)['craft_planks']['status']=='ready'


def test_expedition_clue_and_departure_reveal_order_and_gate_conditions():
    s=player();farm_and_home(s);ranch(s);board(s,'quest_accept','first_expedition')
    at(s,'workshop','armory_counter');apply(s,'gear_buy',{'target':'armory_counter','item':'stone_sword'},NOW);apply(s,'gear_equip',{'item':'stone_sword'},NOW)
    at(s,'overworld','cave_entry');apply(s,'cave_interact',{'target':'cave_entry'},NOW)
    # Deterministic combat fixture; actual combat is separately exercised in browser.
    for enemy in floor_enemies(s,NOW):enemy['hp']=0;defeated(s,enemy)
    apply(s,'cave_retreat',{},NOW);at(s,'overworld','workshop');apply(s,'enter',{'target':'workshop'},NOW)
    at(s,'workshop','armory_counter');apply(s,'intro_review',{},NOW)
    board(s,'quest_claim','first_expedition');assert 'gate_story' in entries(s) and 'leave_valley' not in entries(s)
    board(s,'quest_accept','gate_story');at(s,'overworld','library');apply(s,'enter',{'target':'library'},NOW)
    at(s,'overworld','village_departure');apply(s,'intro_brief',{'target':'village_departure'},NOW)
    board(s,'quest_claim','gate_story');assert 'gate_preparation' in entries(s) and 'leave_valley' not in entries(s)
    board(s,'quest_accept','gate_preparation')
    s['village_combat']['boss_first']=True;s['inventory']['gate_stone']=1
    assert entries(s)['gate_preparation']['status']=='active'
    s['knowledge_growth']['magic']=3;board(s,'quest_claim','gate_preparation')
    assert entries(s)['leave_valley']['status']=='available'
    apply(s,'quest_accept',{'quest_id':'leave_valley'},NOW)
    assert 'crossing_path' not in entries(s)
    at(s,'overworld','village_departure');apply(s,'gate_open',{},NOW)
    day=clock_view(s,NOW)['day'];apply(s,'travel',{'target':'village_departure','option':'depart','expected_day':day,'expected_location':'overworld'},NOW)
    at(s,'crossing','river_bridge');apply(s,'quest_claim',{'quest_id':'leave_valley'},NOW)
    assert 'crossing_path' in entries(s) and 'city_arrival' not in entries(s)
    apply(s,'quest_accept',{'quest_id':'crossing_path'},NOW)
    def travel(location, target, option):
        at(s,location,target)
        return apply(s,'travel',{'target':target,'option':option,'expected_day':clock_view(s,NOW)['day'],'expected_location':location},NOW)
    travel('crossing','adu','rope');travel('crossing','adu','ferry')
    # Settle on the arrival bank: no extra ferry fare or mandatory return journey.
    at(s,'mountain','mountain_camp');apply(s,'quest_claim',{'quest_id':'crossing_path'},NOW)
    assert entries(s)['city_arrival']['status']=='available'
    apply(s,'quest_accept',{'quest_id':'city_arrival'},NOW)
    # First-layer combat spends stamina; an ordinary camp restores enough to climb.
    if s['stamina']['current'] < 60: travel('mountain','mountain_camp','camp')
    travel('mountain','mountain_pass','climb');travel('city','to_inn','enter_inn')
    travel('inn','lanya','deliver');travel('inn','lanya','book')
    at(s,'inn','inn_bed');apply(s,'rest',{'target':'inn_bed','expected_day':clock_view(s,NOW)['day']},NOW)
    at(s,'inn','lanya');apply(s,'quest_claim',{'quest_id':'city_arrival'},NOW)
    assert entries(s)['return_visit']['kind']=='side'
    assert s['departure']['letter_delivered'] and s['inventory']['gold']>=0


def test_old_accepted_contracts_keep_objectives_rewards_and_progress_without_regrant():
    s=player();s.pop('quest_story');s['quests'].update(first_harvest={'status':'active','accepted_at':1},craft_home={'status':'claimed'},leave_valley={'status':'active','accepted_at':2})
    s['stats'].update(harvest=2,sold=1);before=copy.deepcopy(s['inventory']);s=upgrade_state(s)
    assert s['inventory']==before and s['quest_story']['legacy_departure']
    q=entries(s);assert q['first_harvest']['status']=='ready' and not q['first_harvest'].get('delivery')
    assert len(q['leave_valley']['objectives'])==9 and q['craft_home']['reward']=={'gold':20}
    assert 'craft_planks' not in q and 'ranch_start' not in q
    assert all(q[id]['status']=='available' for id in ['forest_path','rune_research','wide_world'])
    board(s,'quest_claim','first_harvest');assert s['inventory']['crop']==before['crop']
    assert upgrade_state(s)==s


def test_failed_feed_cannot_complete_ranch_task():
    s=player();farm_and_home(s);ranch(s);s['events'].remove('quest_chicken_fed');s['inventory']['animal_feed']=0
    s['quests']['ranch_start']['status']='active';at(s,'pasture','animal_1');before=copy.deepcopy(s)
    with pytest.raises(RuleError):apply(s,'ranch_feed',{'target':'animal_1','days':1},NOW)
    assert s==before and not entries(s)['ranch_start']['checks'][2]


def test_delivery_receipts_and_rejection_are_atomic(client):
    create(client)
    prepared=player();settle(prepared);board(prepared,'quest_accept','first_harvest');crops(prepared);at(prepared,'overworld','board')
    with Session.begin() as db:
        row=db.scalar(select(Player));row.state=prepared
    gold=prepared['inventory']['gold'];key=str(uuid.uuid4())
    for _ in range(2):
        reply=cmd(client,'quest_claim',{'quest_id':'first_harvest'},key);assert reply.status_code==200
        s=reply.json()['state'];assert s['inventory']['crop']==0 and s['inventory']['gold']==gold+16
    assert cmd(client,'quest_claim',{'quest_id':'first_harvest'}).status_code==422
    assert client.get('/api/state').json()['state']['quests']['first_harvest']['status']=='claimed'
