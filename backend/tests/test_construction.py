import copy
import pytest
from test_game import fresh, client, create
from app.rules import apply, upgrade_state, RuleError
from app.construction import construction_view, placement_reason, settle_construction
from app.daynight import DAY_SECONDS
from app.world import walkable, clear_path


def workshop():
    s=fresh();s.update(location='workshop',position={'x':96,'y':288})
    s['inventory'].update(wood=200,plank=100,stone=100,gold=10000)
    s['world_clock'].update(updated_at=100,running_until=0,elapsed=0)
    return s


def make_box(s, recipe='wooden_chest'):
    s.update(location='workshop',position={'x':96,'y':288})
    apply(s,'construction_learn',{'target':'carpenter','recipe':recipe},100)
    s['position']={'x':240,'y':196}
    apply(s,'construction_craft',{'target':'workshop_counter','recipe':recipe},100)
    s.update(location='home',position={'x':240,'y':300})
    apply(s,'construction_place',{'recipe':recipe,'x':144,'y':288},100)
    return 'player_chest_1'


def transfer(s,key,**data):
    s['position']={'x':144,'y':256}
    return apply(s,'construction_transfer',dict(target=key,chest=key,expected_version=s['construction']['chests'][key]['version'],item='wood',direction='store',amount=1,**data),100)


def test_complete_chain_move_and_reload_preserves_individual_contents():
    s=workshop();key=make_box(s);transfer(s,key)
    box=s['construction']['chests'][key];assert box['items']=={'wood':1}
    apply(s,'construction_rename',{'target':key,'chest':key,'expected_version':1,'name':'种子和木料'},100)
    before=copy.deepcopy(box['items'])
    apply(s,'construction_move',{'target':key,'chest':key,'expected_version':2,'x':384,'y':288},100)
    s=upgrade_state(s);box=s['construction']['chests'][key]
    assert box['items']==before and box['name']=='种子和木料' and box['x']==384
    assert not walkable(384,280,'home',s,100)
    assert not clear_path({'x':340,'y':280},{'x':420,'y':280},'home',s,100)
    s['position']={'x':384,'y':248};wood=s['inventory']['wood']
    apply(s,'construction_transfer',{'target':key,'chest':key,'expected_version':3,'item':'wood','direction':'withdraw','amount':1},100)
    assert s['inventory']['wood']==wood+1 and s['construction']['chests'][key]['items']['wood']==0


def test_recipe_knowledge_and_skill_are_distinct_and_failure_spends_nothing():
    s=workshop();s['position']={'x':240,'y':196};before=copy.deepcopy(s['inventory'])
    with pytest.raises(RuleError,match='图纸'):apply(s,'construction_craft',{'target':'workshop_counter','recipe':'wooden_chest'},100)
    s['construction']['blueprints'].append('reinforced_chest')
    with pytest.raises(RuleError,match='建造2'):apply(s,'construction_craft',{'target':'workshop_counter','recipe':'reinforced_chest'},100)
    assert s['inventory']==before
    s['skill_growth']['building']=2;apply(s,'construction_craft',{'target':'workshop_counter','recipe':'reinforced_chest'},100)
    assert s['inventory']['reinforced_chest']==1


@pytest.mark.parametrize('x,y',[(240,336),(336,96),(144,144),(float('nan'),144),(True,96),(145,288)])
def test_invalid_placement_preserves_stock(x,y):
    s=workshop();s.update(location='home',position={'x':240,'y':300});s['inventory']['wooden_chest']=1
    before=copy.deepcopy(s['inventory'])
    with pytest.raises(RuleError):apply(s,'construction_place',{'recipe':'wooden_chest','x':x,'y':y},100)
    assert s['inventory']==before and not s['construction']['chests']


def test_full_box_allows_existing_stack_but_rejects_new_item_and_stale_version():
    s=workshop();key=make_box(s);s['position']={'x':144,'y':256}
    box=s['construction']['chests'][key];box['items']={f'fixture_{i}':1 for i in range(11)}|{'wood':1}
    transfer(s,key)
    before=copy.deepcopy(s['inventory'])
    with pytest.raises(RuleError,match='已满'):apply(s,'construction_transfer',{'target':key,'chest':key,'expected_version':1,'item':'stone','direction':'store','amount':1},100)
    assert s['inventory']==before
    with pytest.raises(RuleError,match='已变化'):apply(s,'construction_move',{'target':key,'chest':key,'expected_version':0,'x':384,'y':288},100)
    assert box['x']==144


def test_order_charges_once_pauses_offline_and_completes_on_game_time():
    s=workshop();before=copy.deepcopy(s['inventory'])
    apply(s,'construction_order',{'target':'carpenter','building':'coop','expected_level':0},100)
    assert s['ranch']['buildings']['coop']==0 and s['construction']['job']
    charged=copy.deepcopy(s['inventory'])
    with pytest.raises(RuleError,match='正在施工'):apply(s,'construction_order',{'target':'carpenter','building':'barn','expected_level':0},100)
    assert s['inventory']==charged
    settle_construction(s,1000000);assert s['ranch']['buildings']['coop']==0
    s['world_clock']['elapsed']=DAY_SECONDS;settle_construction(s,100)
    assert s['ranch']['buildings']['coop']==1 and not s['construction']['job']
    settle_construction(s,100);assert len(s['construction']['completed'])==1
    assert s['inventory']['gold']<before['gold']


def test_sleep_completion_aid_and_legacy_saves():
    s=workshop();old_storage=copy.deepcopy(s['storage']);s['ranch']['intro_aid']={'coop':True,'chicken':True}
    apply(s,'construction_order',{'target':'carpenter','building':'coop','expected_level':0},100)
    assert s['construction']['job']['costs']=={} and 'coop' not in s['ranch']['intro_aid']
    s.update(location='home',position={'x':336,'y':160})
    apply(s,'rest',{'target':'home_bed','expected_day':1},100)
    assert s['ranch']['buildings']['coop']==1 and s['storage']==old_storage
    assert not s['construction']['job']


def test_old_endpoints_cannot_bypass_carpenter_and_distance_is_checked():
    s=workshop();s.update(location='pasture',position={'x':448,'y':440})
    with pytest.raises(RuleError,match='木匠'):apply(s,'ranch_build',{'target':'ranch_ledger','building':'coop','expected_level':0},100)
    with pytest.raises(RuleError,match='走近'):apply(s,'construction_order',{'target':'carpenter','building':'coop','expected_level':0},100)
    s.update(location='home',position={'x':96,'y':200})
    with pytest.raises(RuleError,match='木匠'):apply(s,'upgrade',{'target':'home_desk'},100)


def test_api_replay_and_parallel_transfer_keep_exactly_one_debit(client):
    from concurrent.futures import ThreadPoolExecutor
    from test_ranching import save_fixture, saved_fixture, post_ranch
    create(client);s=workshop();key=make_box(s);s['position']={'x':144,'y':256};save_fixture(s)
    data={'target':key,'chest':key,'expected_version':0,'item':'wood','amount':4,'direction':'store'}
    with ThreadPoolExecutor(max_workers=2) as pool:
        results=list(pool.map(lambda _:post_ranch(client,'construction_transfer',data),range(2)))
    assert sorted(r.status_code for r in results)==[200,422]
    after=saved_fixture();assert after['inventory']['wood']==s['inventory']['wood']-4
    assert after['construction']['chests'][key]['items']['wood']==4
    receipt='box-retry';data.update(expected_version=1,direction='withdraw',amount=2)
    first=post_ranch(client,'construction_transfer',data,receipt)
    replay=post_ranch(client,'construction_transfer',data,receipt)
    assert first.status_code==replay.status_code==200 and replay.json()['replayed']
    assert saved_fixture()['construction']['chests'][key]['items']['wood']==2


def test_two_boxes_remain_independent_and_bad_amount_is_atomic():
    s=workshop();key=make_box(s);transfer(s,key)
    s['inventory']['wooden_chest']=1;s['position']={'x':240,'y':300}
    apply(s,'construction_place',{'recipe':'wooden_chest','x':384,'y':288},100)
    assert s['construction']['chests']['player_chest_2']['items']=={}
    s['position']={'x':144,'y':256};before=copy.deepcopy(s)
    with pytest.raises(RuleError):apply(s,'construction_transfer',{'target':key,'chest':key,'expected_version':1,'item':'wood','direction':'store','amount':True},100)
    assert s==before
