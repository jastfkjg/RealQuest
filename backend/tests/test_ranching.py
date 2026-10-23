import copy
import uuid
import pytest
from test_game import fresh, client, create
from app.rules import apply, upgrade_state, RuleError
from app.ranching import ANIMALS, SHELTERS, FACILITIES, PRODUCTS, RECIPES, stage, settle_ranch, ranch_view, animal_position
from app.daynight import DAY_SECONDS
from app.db import Session
from app.models import Player
from sqlalchemy import select


def ranch_state():
    s=fresh();s.update(location='pasture',position={'x':448,'y':440})
    s['world_clock'].update(elapsed=0,updated_at=100,running_until=0)
    s['inventory'].update(gold=100000,wood=10000,stone=10000,animal_feed=10000)
    return s


def buy(s, species):
    a=ANIMALS[species];s['skill_growth']['ranching']=a['level'];s['ranch']['buildings'][a['shelter']]=a['shelter_level']
    if a.get('facility'):s['ranch']['facilities'][a['facility']]=True
    s['position']={'x':448,'y':440}
    apply(s,'ranch_buy',{'target':'ranch_ledger','species':species,'expected_next':s['ranch']['next_id']},100)
    key=list(s['ranch']['animals'])[-1];s['position']=animal_position(s,key)
    return key


def advance(s, days):
    s['world_clock']['elapsed']+=days*DAY_SECONDS
    settle_ranch(s,100)


@pytest.mark.parametrize('species',ANIMALS)
def test_seven_animals_three_stages_and_exact_production(species):
    s=ranch_state();key=buy(s,species);spec=ANIMALS[species];a=s['ranch']['animals'][key]
    assert stage(a)==1 and a['age']==0 and not a['products']
    for day in range(spec['young_days']+spec['growing_days']+max(1,spec['period'])):
        apply(s,'ranch_feed',{'target':key},100);advance(s,1);a=s['ranch']['animals'][key]
        if day+1==spec['young_days']:assert stage(a)==2 and not a['products']
        if day+1==spec['young_days']+spec['growing_days']:assert stage(a)==3 and not a['products']
    if species=='horse':
        assert not a['products'];apply(s,'ranch_feed',{'target':key},100);apply(s,'ranch_mount',{'target':key},100)
        assert ranch_view(s,100)['speed_multiplier']==1.45
        apply(s,'ranch_dismount',{},100);assert s['ranch']['mounted'] is None
    else:
        assert a['products']=={spec['product']:1}
        apply(s,'ranch_collect',{'target':key},100)
        s.update(location='shop',position={'x':240,'y':188});gold=s['inventory']['gold']
        apply(s,'market_trade',{'target':'shop_counter','side':'sell','item':spec['product']},100)
        assert s['inventory'][spec['product']]==0 and s['inventory']['gold']==gold+PRODUCTS[spec['product']]['sell']


def test_building_quotes_capacity_and_purchase_guards():
    s=ranch_state()
    for shelter,spec in SHELTERS.items():
        for level in range(3):
            from app.construction import settle_construction
            s.update(location='workshop',position={'x':96,'y':288})
            before=copy.deepcopy(s['inventory']);apply(s,'construction_order',{'target':'carpenter','building':shelter,'expected_level':level},100)
            s['world_clock']['elapsed']+=DAY_SECONDS;settle_construction(s,100)
            assert s['ranch']['buildings'][shelter]==level+1
            assert all(s['inventory'][k]==before[k]-v for k,v in spec['costs'][level].items())
        with pytest.raises(RuleError):apply(s,'construction_order',{'target':'carpenter','building':shelter,'expected_level':3},100)
    s=ranch_state();old=copy.deepcopy(s)
    with pytest.raises(RuleError,match='禽舍'):apply(s,'ranch_buy',{'target':'ranch_ledger','species':'chicken','expected_next':1},100)
    assert s==old
    s['ranch']['buildings']['coop']=1
    with pytest.raises(RuleError,match='养殖'):apply(s,'ranch_buy',{'target':'ranch_ledger','species':'duck','expected_next':1},100)
    s['skill_growth']['ranching']=1
    with pytest.raises(RuleError,match='饮水池'):apply(s,'ranch_buy',{'target':'ranch_ledger','species':'duck','expected_next':1},100)
    apply(s,'ranch_facility',{'target':'ranch_ledger','facility':'water'},100)
    for i in range(4):apply(s,'ranch_buy',{'target':'ranch_ledger','species':'duck','expected_next':i+1},100)
    with pytest.raises(RuleError,match='空位'):apply(s,'ranch_buy',{'target':'ranch_ledger','species':'chicken','expected_next':5},100)


def test_feed_pause_offline_sleep_capacity_and_pet_quality():
    s=ranch_state();key=buy(s,'chicken');a=s['ranch']['animals'][key]
    advance(s,4);assert a['age']==0
    apply(s,'ranch_feed',{'target':key,'days':3},100);a=s['ranch']['animals'][key];before=copy.deepcopy(a)
    settle_ranch(s,1000000);assert a==before
    s.update(location='home',position={'x':336,'y':112})
    day=int(s['world_clock']['elapsed']/DAY_SECONDS)+1
    apply(s,'rest',{'target':'home_bed','kind':'sleep','expected_day':day},100)
    a=s['ranch']['animals'][key];assert a['age']==DAY_SECONDS
    s.update(location='pasture',position=animal_position(s,key))
    for i in range(5):
        apply(s,'ranch_pet',{'target':key},100)
        with pytest.raises(RuleError):apply(s,'ranch_pet',{'target':key},100)
        if s['ranch']['animals'][key]['feed_seconds']<=DAY_SECONDS:apply(s,'ranch_feed',{'target':key},100)
        advance(s,1)
        if i<4 and s['ranch']['animals'][key]['products']:apply(s,'ranch_collect',{'target':key},100)
    apply(s,'ranch_collect',{'target':key},100)
    assert s['inventory']['fine_egg']>=1
    for i in range(8):
        if s['ranch']['animals'][key]['feed_seconds']<=DAY_SECONDS:apply(s,'ranch_feed',{'target':key},100)
        advance(s,1)
    a=s['ranch']['animals'][key];assert sum(a['products'].values())==3
    apply(s,'ranch_collect',{'target':key},100)
    a=s['ranch']['animals'][key];assert a['progress']==0
    advance(s,0.2);assert not a['products']


def test_feed_orders_crafting_and_processing_all_products():
    s=ranch_state();feed=s['inventory']['animal_feed'];gold=s['inventory']['gold']
    apply(s,'ranch_feed_buy',{'target':'ranch_ledger','amount':10},100)
    assert s['inventory']['animal_feed']==feed+10 and s['inventory']['gold']==gold-20
    for item,count in [('wheat',4),('corn',12)]:
        s['inventory'][item]=1;before=s['inventory']['animal_feed'];apply(s,'ranch_feed_craft',{'target':'ranch_ledger','item':item},100)
        assert s['inventory']['animal_feed']==before+count and s['inventory'][item]==0
    for recipe_id,r in RECIPES.items():
        s['ranch']['facilities'][r['facility']]=True
        for fine in [False,True]:
            prefix='fine_' if fine else '';s['inventory'][prefix+r['input']]=1
            apply(s,'ranch_process',{'target':'ranch_ledger','recipe':recipe_id,'fine':fine},100)
            with pytest.raises(RuleError):apply(s,'ranch_process',{'target':'ranch_ledger','recipe':recipe_id},100)
            advance(s,r['days']);apply(s,'ranch_job_collect',{'target':'ranch_ledger','facility':r['facility']},100)
            assert s['inventory'][prefix+r['output']]==1
            with pytest.raises(RuleError):apply(s,'ranch_job_collect',{'target':'ranch_ledger','facility':r['facility']},100)


def test_old_save_fields_preserved_and_gate_requires_real_approach():
    s=fresh();s.pop('ranch');before=copy.deepcopy(s);u=upgrade_state(s)
    assert all(u[k]==v for k,v in before.items()) and not u['ranch']['animals']
    with pytest.raises(RuleError):apply(u,'ranch_enter',{},100)
    u['position']={'x':400,'y':600};apply(u,'ranch_enter',{},100);assert u['location']=='pasture'
    u['position']={'x':448,'y':496};apply(u,'ranch_exit',{},100);assert u['location']=='overworld'


def test_receipts_purchase_and_collection_exactly_once(client):
    create(client)
    with Session.begin() as db:
        p=db.scalar(select(Player));s=ranch_state();s['ranch']['buildings']['coop']=1;p.state=s
    body={'action':'ranch_buy','data':{'target':'ranch_ledger','species':'chicken','expected_next':1},'request_id':str(uuid.uuid4())}
    first=client.post('/api/command',json=body);assert first.status_code==200
    replay=client.post('/api/command',json=body);assert replay.status_code==200 and replay.json()['replayed']
    assert len(replay.json()['state']['ranch']['animals'])==1
    body['request_id']=str(uuid.uuid4());assert client.post('/api/command',json=body).status_code==422

    with Session.begin() as db:
        p=db.scalar(select(Player));s=copy.deepcopy(p.state);s['position']=animal_position(s,'animal_1');s['ranch']['animals']['animal_1']['products']={'egg':2};p.state=s
    body={'action':'ranch_collect','data':{'target':'animal_1'},'request_id':str(uuid.uuid4())}
    first=client.post('/api/command',json=body);assert first.status_code==200
    assert client.post('/api/command',json=body).json()['state']['inventory']['egg']==2
    body['request_id']=str(uuid.uuid4());assert client.post('/api/command',json=body).status_code==422


def test_clock_takeover_discards_unconfirmed_tail_for_animals_and_processing():
    s = ranch_state()
    key = buy(s, 'chicken')
    apply(s, 'ranch_feed', {'target': key}, 100)
    s['ranch']['facilities']['mayo'] = True
    s['inventory']['egg'] = 1
    s['position'] = {'x': 448, 'y': 440}
    apply(s, 'ranch_process', {'target': 'ranch_ledger', 'recipe': 'egg_mayo'}, 100)
    apply(s, 'world_resume', {'owner': 'first-world'}, 100)
    apply(s, 'world_resume', {'owner': 'second-world'}, 105)
    assert s['world_clock']['elapsed'] == 0
    assert s['ranch']['animals'][key]['age'] == 0
    assert s['ranch']['animals'][key]['feed_seconds'] == DAY_SECONDS
    assert ranch_view(copy.deepcopy(s), 105)['jobs']['mayo']['remaining_days'] == .5
    apply(s, 'world_pause', {'owner': 'first-world'}, 106)
    assert s['ranch']['animals'][key]['age'] == 0
    apply(s, 'world_pause', {'owner': 'second-world'}, 107)
    assert s['ranch']['animals'][key]['age'] == 2
    after = copy.deepcopy(s['ranch'])
    apply(s, 'world_resume', {'owner': 'second-world'}, 100000)
    assert s['ranch'] == after


def test_accepted_ranch_mutation_commits_time_before_expired_lease():
    s = ranch_state()
    key = buy(s, 'chicken')
    apply(s, 'ranch_feed', {'target': key}, 100)
    apply(s, 'world_resume', {'owner': 'first-world'}, 100)
    apply(s, 'ranch_pet', {'target': key}, 105)
    assert s['world_clock']['elapsed'] == 5
    assert s['ranch']['animals'][key]['age'] == 5
    apply(s, 'world_resume', {'owner': 'first-world'}, 1000)
    assert s['ranch']['animals'][key]['age'] == 5
    apply(s, 'world_pause', {'owner': 'first-world'}, 1005)
    assert s['ranch']['animals'][key]['age'] == 10


def test_mount_cleared_in_saved_state_on_indoor_entry_and_starvation():
    s = ranch_state()
    key = buy(s, 'horse')
    s['ranch']['animals'][key]['age'] = 8 * DAY_SECONDS
    apply(s, 'ranch_feed', {'target': key}, 100)
    apply(s, 'ranch_mount', {'target': key}, 100)
    from app.world import OBJECTS
    s.update(location='overworld', position={k: next(o for o in OBJECTS if o['id'] == 'home')[k] for k in ('x', 'y')})
    apply(s, 'enter', {'target': 'home'}, 100)
    assert s['location'] == 'home' and s['ranch']['mounted'] is None
    s.update(location='pasture', position=animal_position(s, key))
    apply(s, 'ranch_mount', {'target': key}, 100)
    s['ranch']['animals'][key]['feed_seconds'] = 1
    apply(s, 'world_resume', {'owner': 'horse-world'}, 100)
    apply(s, 'world_resume', {'owner': 'horse-world'}, 102)
    assert s['ranch']['mounted'] is None
    assert ranch_view(s, 102)['speed_multiplier'] == 1
    with pytest.raises(RuleError, match='口粮'):
        apply(s, 'ranch_mount', {'target': key}, 102)


def save_fixture(state):
    with Session.begin() as db:
        db.scalar(select(Player)).state = copy.deepcopy(state)


def saved_fixture():
    with Session() as db:
        return copy.deepcopy(db.scalar(select(Player)).state)


def post_ranch(client, action, data, request_id=None):
    return client.post('/api/command', json={'action': action, 'data': data,
        'request_id': request_id or str(uuid.uuid4())})


@pytest.mark.parametrize('action,data', [
    ('ranch_build', {'building': 'coop', 'expected_level': 0}),
    ('ranch_facility', {'facility': 'mayo'}),
    ('ranch_buy', {'species': 'chicken', 'expected_next': 1}),
    ('ranch_feed_buy', {'amount': 1}),
    ('ranch_feed_craft', {'item': 'wheat'}),
    ('ranch_process', {'recipe': 'egg_mayo'}),
])
def test_rejected_resource_mutations_leave_database_unchanged(client, action, data):
    create(client)
    s = ranch_state()
    s['inventory'].update(gold=0, wood=0, wheat=0, egg=0)
    if action == 'ranch_buy':
        s['ranch']['buildings']['coop'] = 1
    if action == 'ranch_process':
        s['ranch']['facilities']['mayo'] = True
    save_fixture(s)
    result = post_ranch(client, action, {'target': 'ranch_ledger', **data})
    assert result.status_code == 422
    assert saved_fixture() == s


def test_feed_capacity_herd_atomicity_and_hungry_growth_resume(client):
    create(client)
    s = ranch_state()
    chicken = buy(s, 'chicken')
    cow = buy(s, 'cow')
    s['inventory']['animal_feed'] = 3  # A chicken plus a cow need four.
    s['position'] = {'x': 448, 'y': 440}
    save_fixture(s)
    assert post_ranch(client, 'ranch_feed_all', {'target': 'ranch_ledger'}).status_code == 422
    assert saved_fixture() == s
    s['inventory']['animal_feed'] = 4
    save_fixture(s)
    assert post_ranch(client, 'ranch_feed_all', {'target': 'ranch_ledger'}).status_code == 200
    s = saved_fixture()
    assert s['inventory']['animal_feed'] == 0
    assert all(a['feed_seconds'] == DAY_SECONDS for a in s['ranch']['animals'].values())
    s['inventory']['animal_feed'] = 10
    s['position'] = animal_position(s, chicken)
    save_fixture(s)
    # A three-day addition would overflow the existing one-day ration.
    assert post_ranch(client, 'ranch_feed', {'target': chicken, 'days': 3}).status_code == 422
    assert saved_fixture() == s
    # Three elapsed days consume only one fed day, without catch-up after refill.
    advance(s, 3)
    assert all(a['age'] == DAY_SECONDS and a['feed_seconds'] == 0 for a in s['ranch']['animals'].values())
    apply(s, 'ranch_feed', {'target': chicken}, 100)
    advance(s, 1)
    assert s['ranch']['animals'][chicken]['age'] == 2 * DAY_SECONDS
    assert s['ranch']['animals'][cow]['age'] == DAY_SECONDS
    assert not s['ranch']['animals'][chicken]['products']


def test_parallel_build_buy_feed_collect_process_and_sell_conserve_resources(client):
    from concurrent.futures import ThreadPoolExecutor
    create(client)
    s = ranch_state()
    save_fixture(s)

    def parallel(action, data, request_ids=None):
        keys = request_ids or [str(uuid.uuid4()), str(uuid.uuid4())]
        with ThreadPoolExecutor(max_workers=2) as pool:
            return list(pool.map(lambda key: post_ranch(client, action, data, key), keys))

    s.update(location='workshop',position={'x':96,'y':288});save_fixture(s)
    results = parallel('construction_order', {'target': 'carpenter', 'building': 'coop', 'expected_level': 0})
    assert sorted(r.status_code for r in results) == [200, 422]
    after = saved_fixture()
    assert after['ranch']['buildings']['coop'] == 0 and after['construction']['job']['building']=='coop'
    from app.construction import settle_construction
    after['world_clock']['elapsed']+=DAY_SECONDS;settle_construction(after,100)
    after.update(location='pasture',position={'x':448,'y':440});save_fixture(after)
    assert after['inventory']['gold'] == s['inventory']['gold'] - SHELTERS['coop']['costs'][0]['gold']
    results = parallel('ranch_buy', {'target': 'ranch_ledger', 'species': 'chicken', 'expected_next': 1})
    assert sorted(r.status_code for r in results) == [200, 422]
    s = saved_fixture()
    assert len(s['ranch']['animals']) == 1
    assert s['inventory']['gold'] == after['inventory']['gold'] - ANIMALS['chicken']['price']
    s['position'] = animal_position(s, 'animal_1')
    save_fixture(s)
    receipt = str(uuid.uuid4())
    results = parallel('ranch_feed', {'target': 'animal_1'}, [receipt, receipt])
    assert [r.status_code for r in results] == [200, 200]
    assert sorted(r.json()['replayed'] for r in results) == [False, True]
    after = saved_fixture()
    assert after['ranch']['animals']['animal_1']['feed_seconds'] == DAY_SECONDS
    assert after['inventory']['animal_feed'] == s['inventory']['animal_feed'] - 1
    # The same request identity cannot be reused to feed a different quantity.
    assert post_ranch(client, 'ranch_feed', {'target': 'animal_1', 'days': 3}, receipt).status_code == 409
    after['ranch']['animals']['animal_1']['products'] = {'egg': 2, 'fine_egg': 1}
    save_fixture(after)
    results = parallel('ranch_collect', {'target': 'animal_1'})
    assert sorted(r.status_code for r in results) == [200, 422]
    s = saved_fixture()
    assert s['inventory']['egg'] == 2 and s['inventory']['fine_egg'] == 1
    s['ranch']['facilities']['mayo'] = True
    s['position'] = {'x': 448, 'y': 440}
    save_fixture(s)
    results = parallel('ranch_process', {'target': 'ranch_ledger', 'recipe': 'egg_mayo'})
    assert sorted(r.status_code for r in results) == [200, 422]
    after = saved_fixture()
    assert after['inventory']['egg'] == 1 and len(after['ranch']['jobs']) == 1
    assert post_ranch(client, 'ranch_job_collect', {'target': 'ranch_ledger', 'facility': 'mayo'}).status_code == 422
    after['world_clock']['elapsed'] += DAY_SECONDS
    save_fixture(after)
    results = parallel('ranch_job_collect', {'target': 'ranch_ledger', 'facility': 'mayo'})
    assert sorted(r.status_code for r in results) == [200, 422]
    s = saved_fixture()
    assert s['inventory']['mayonnaise'] == 1 and not s['ranch']['jobs']
    s.update(location='shop', position={'x': 240, 'y': 188})
    save_fixture(s)
    results = parallel('market_trade', {'target': 'shop_counter', 'side': 'sell', 'item': 'mayonnaise'})
    assert sorted(r.status_code for r in results) == [200, 422]
    after = saved_fixture()
    assert after['inventory']['mayonnaise'] == 0
    assert after['inventory']['gold'] == s['inventory']['gold'] + PRODUCTS['mayonnaise']['sell']


def test_read_projection_does_not_commit_growth_or_unconfirmed_offline_time(client, monkeypatch):
    create(client)
    s = ranch_state()
    key = buy(s, 'chicken')
    apply(s, 'ranch_feed', {'target': key}, 100)
    apply(s, 'world_resume', {'owner': 'ranch-view'}, 100)
    save_fixture(s)
    monkeypatch.setattr('app.main.time.time', lambda: 105)
    first = client.get('/api/state').json()['state']
    assert first['ranching']['animals'][key]['age'] == 5
    assert saved_fixture() == s
    monkeypatch.setattr('app.main.time.time', lambda: 10000)
    offline = client.post('/api/session').json()['state']
    assert offline['ranching']['animals'][key]['age'] == 0
    assert offline['ranching']['animals'][key]['feed_seconds'] == DAY_SECONDS
    assert saved_fixture() == s


def test_processing_stays_paused_in_life_mode_and_sleep_finishes_once(client, monkeypatch):
    create(client)
    s = ranch_state()
    s['ranch']['facilities']['cheese'] = True
    s['inventory']['fine_milk'] = 1
    apply(s, 'ranch_process', {'target': 'ranch_ledger', 'recipe': 'milk_cheese', 'fine': True}, 100)
    apply(s, 'world_resume', {'owner': 'ranch-view'}, 100)
    apply(s, 'world_pause', {'owner': 'ranch-view'}, 105)
    save_fixture(s)
    monkeypatch.setattr('app.main.time.time', lambda: 1000000)
    before = client.get('/api/state').json()['state']
    assert not before['ranching']['jobs']['cheese']['ready']
    assert before['ranching']['jobs']['cheese']['remaining_days'] == pytest.approx(1 - 5 / DAY_SECONDS)
    s = saved_fixture()
    s.update(location='home', position={'x': 336, 'y': 112})
    save_fixture(s)
    assert post_ranch(client, 'rest', {'target': 'home_bed', 'expected_day': 1}).status_code == 200
    s = saved_fixture()
    s.update(location='pasture', position={'x': 448, 'y': 440})
    save_fixture(s)
    receipt = str(uuid.uuid4())
    result = post_ranch(client, 'ranch_job_collect', {'target': 'ranch_ledger', 'facility': 'cheese'}, receipt)
    assert result.status_code == 200
    assert post_ranch(client, 'ranch_job_collect', {'target': 'ranch_ledger', 'facility': 'cheese'}, receipt).json()['replayed']
    assert saved_fixture()['inventory']['fine_cheese'] == 1
    assert saved_fixture()['inventory']['fine_milk'] == 0


@pytest.mark.parametrize('species', ['chicken', 'duck', 'sheep', 'cow', 'goat', 'pig'])
def test_chunked_time_and_single_interval_have_same_growth_and_products(species):
    s = ranch_state()
    key = buy(s, species)
    a = s['ranch']['animals'][key]
    a['age'] = (ANIMALS[species]['young_days'] + ANIMALS[species]['growing_days']) * DAY_SECONDS - DAY_SECONDS / 2
    apply(s, 'ranch_feed', {'target': key, 'days': 3}, 100)
    large = copy.deepcopy(s)
    advance(large, 8)
    for _ in range(16):
        advance(s, .5)
    assert s['ranch']['animals'] == large['ranch']['animals']
    assert s['ranch']['animals'][key]['feed_seconds'] == 0


def test_pasture_gate_blocks_new_tilling_but_preserves_existing_crops():
    from app.world import HOME_LAND, map_for
    from app.farm_land import cell_at, soil_reason
    cell = cell_at(HOME_LAND, 424, 584)
    assert soil_reason(HOME_LAND, cell) is not None
    s = ranch_state()
    s.update(location='overworld', position={'x': cell['x'], 'y': cell['y']})
    before = copy.deepcopy(s['inventory'])
    with pytest.raises(RuleError, match='不能开垦'):
        apply(s, 'till', {'target': cell['id']}, 100)
    assert s['inventory'] == before
    s['farm']['tilled'].append(cell['id'])
    s['plots'][cell['id']] = {'planted_at': 10, 'ready_at': 20}
    upgraded = upgrade_state(s)
    assert upgraded['farm'] == s['farm'] and upgraded['plots'] == s['plots']
    assert any(o['id'] == cell['id'] for o in map_for('overworld', upgraded, 100)['objects'])
    apply(upgraded, 'harvest', {'target': cell['id']}, 100)
    assert upgraded['inventory']['crop'] == before['crop'] + 2


def test_mount_follows_outdoor_travel_and_dismounts_in_inn_or_cave():
    from app.world import map_for
    s = ranch_state()
    key = buy(s, 'horse')
    s['ranch']['animals'][key]['age'] = 8 * DAY_SECONDS
    apply(s, 'ranch_feed', {'target': key, 'days': 3}, 100)
    apply(s, 'ranch_mount', {'target': key}, 100)
    s['quests']['settle_in']['status'] = 'claimed'
    s['village_combat']['gate_open'] = True
    s['departure'].update(bridge_repaired=True, rope_ready=True)
    s['location'] = 'overworld'
    for option, target, destination in [
        ('depart', 'village_departure', 'crossing'),
        ('bridge', 'river_bridge', 'mountain'),
        ('climb', 'mountain_pass', 'city'),
        ('enter_inn', 'to_inn', 'inn'),
    ]:
        obj = next(o for o in map_for(s['location'])['objects'] if o['id'] == target)
        s['position'] = {k: obj[k] for k in ('x', 'y')}
        apply(s, 'travel', {'target': target, 'option': option,
            'expected_location': s['location'], 'expected_day': 1}, 100)
        assert s['location'] == destination
        assert s['ranch']['mounted'] == (None if destination == 'inn' else key)
        assert ranch_view(s, 100)['speed_multiplier'] == (1 if destination == 'inn' else 1.45)
    # The cave maps intentionally do not expose the outdoor flag.
    for floor in range(1, 6):
        s['ranch']['mounted'] = key
        s['location'] = f'cave_{floor}'
        settle_ranch(s, 100)
        assert s['ranch']['mounted'] is None
