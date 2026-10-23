import copy
from concurrent.futures import ThreadPoolExecutor
import pytest
from test_game import fresh, client, create
from test_construction import workshop
from test_ranching import device, device_data, save_fixture, saved_fixture, post_ranch
from app.rules import apply, upgrade_state, RuleError
from app.production import MACHINES, CELLS
from app.construction import construction_view
from app.daynight import DAY_SECONDS
from app.world import walkable, clear_path


@pytest.mark.parametrize('facility', MACHINES)
def test_learn_skill_craft_place_use_move_pack_and_reload(facility):
    s=workshop();spec=MACHINES[facility]['craft'];item=spec['item']
    s['position']={'x':240,'y':196};before=copy.deepcopy(s['inventory'])
    with pytest.raises(RuleError,match='图纸'):
        apply(s,'construction_craft',{'target':'workshop_counter','recipe':item},100)
    s['position']={'x':96,'y':288}
    apply(s,'construction_learn',{'target':'carpenter','recipe':item},100)
    s['position']={'x':240,'y':196};s['skill_growth']['building']=spec['level']-1
    with pytest.raises(RuleError,match='建造'):
        apply(s,'construction_craft',{'target':'workshop_counter','recipe':item},100)
    assert s['inventory']==before and s['construction']['blueprints'].count(item)==1
    s['skill_growth']['building']=spec['level']
    apply(s,'construction_craft',{'target':'workshop_counter','recipe':item},100)
    assert all(s['inventory'][k]==before[k]-v for k,v in spec['costs'].items())
    assert s['inventory'][item]==1 and not s['ranch']['facilities'][facility]
    s.update(location='pasture',position={'x':448,'y':440})
    apply(s,'construction_machine_place',{'target':'ranch_ledger','recipe':item,'x':144,'y':480},100)
    key='machine_1';assert s['inventory'][item]==0 and s['ranch']['facilities'][facility]
    assert not walkable(144,468,'pasture',s,100)
    assert not clear_path({'x':100,'y':468},{'x':180,'y':468},'pasture',s,100)
    s['position']={'x':144,'y':520}
    from app.ranching import RECIPES
    recipe_id,r=next((k,v) for k,v in RECIPES.items() if v['facility']==facility)
    s['inventory'][r['input']]=1
    apply(s,'ranch_process',device_data(s,key,recipe=recipe_id),100)
    assert s['inventory'][r['input']]==0
    for action in ['construction_machine_move','construction_machine_pack']:
        with pytest.raises(RuleError,match='收取'):
            apply(s,action,device_data(s,key,x=720,y=480),100)
    s['world_clock']['elapsed']+=r['days']*DAY_SECONDS
    apply(s,'ranch_job_collect',device_data(s,key,facility=key),100)
    assert s['inventory'][r['output']]==1
    apply(s,'construction_machine_move',device_data(s,key,x=720,y=480),100)
    assert walkable(144,468,'pasture',s,100) and not walkable(720,468,'pasture',s,100)
    s=upgrade_state(s);assert s['construction']['machines'][key]['x']==720
    s['position']={'x':720,'y':520}
    apply(s,'construction_machine_pack',device_data(s,key),100)
    assert s['inventory'][item]==1 and not s['ranch']['facilities'][facility]
    assert item in s['construction']['blueprints'] and s['inventory'][r['output']]==1


def test_two_identical_machines_independent_and_busy_until_product_collected():
    s=workshop();first=device(s,'mayo')
    s['inventory']['mayo_machine']=1;s['position']={'x':448,'y':440}
    apply(s,'construction_machine_place',{'target':'ranch_ledger','recipe':'mayo_machine','x':720,'y':480},100)
    second='machine_2';s['inventory'].update(egg=1,fine_duck_egg=1)
    for key,recipe,fine in [(first,'egg_mayo',False),(second,'duck_mayo',True)]:
        m=s['construction']['machines'][key];s['position']={'x':m['x'],'y':520}
        apply(s,'ranch_process',device_data(s,key,recipe=recipe,fine=fine),100)
    assert len(s['ranch']['jobs'])==2
    s['world_clock']['elapsed']+=DAY_SECONDS
    with pytest.raises(RuleError,match='收取'):
        apply(s,'construction_machine_pack',device_data(s,second),100)
    apply(s,'ranch_job_collect',device_data(s,second,facility=second),100)
    assert first in s['ranch']['jobs'] and second not in s['ranch']['jobs']
    assert s['inventory']['fine_duck_mayo']==1
    m=s['construction']['machines'][first];s['position']={'x':m['x'],'y':520}
    apply(s,'ranch_job_collect',device_data(s,first,facility=first),100)
    assert s['inventory']['mayonnaise']==1 and not s['ranch']['jobs']


@pytest.mark.parametrize('position',[(448,496),(176,288),(144,480),(float('nan'),480),(True,480),(145,480)])
def test_invalid_or_reserved_placement_atomic(position):
    s=workshop();s.update(location='pasture',position={'x':448,'y':440});s['inventory']['mayo_machine']=1
    if position==(144,480):s['construction']['machines']['occupied']={'facility':'loom','x':144,'y':480,'version':0};s=upgrade_state(s)
    before=copy.deepcopy(s)
    with pytest.raises(RuleError):
        apply(s,'construction_machine_place',{'target':'ranch_ledger','recipe':'mayo_machine','x':position[0],'y':position[1]},100)
    assert s==before


def test_wrong_target_distance_recipe_version_and_shortcuts_cannot_consume():
    s=workshop();key=device(s,'mayo');s['inventory'].update(egg=1,milk=1)
    for data in [dict(target='ranch_ledger',recipe='egg_mayo',expected_version=0),device_data(s,key,recipe='milk_cheese'),dict(target=key,recipe='egg_mayo',expected_version=99),device_data(s,key,recipe='egg_mayo',fine=1)]:
        before=copy.deepcopy(s)
        with pytest.raises(RuleError):apply(s,'ranch_process',data,100)
        assert s==before
    s['position']={'x':448,'y':440};before=copy.deepcopy(s)
    with pytest.raises(RuleError,match='走近'):apply(s,'ranch_process',device_data(s,key,recipe='egg_mayo'),100)
    with pytest.raises(RuleError,match='图纸'):apply(s,'ranch_facility',{'target':'ranch_ledger','facility':'oil'},100)
    assert s==before


def test_legacy_devices_and_jobs_migrate_once_without_cost_or_time_changes():
    s=fresh();s['construction'].pop('production_version');s['construction'].pop('machines')
    s['ranch']['facilities'].update(mayo=True,cheese=True)
    job={'recipe':'milk_cheese','output':'fine_cheese','ready_tick':3210.5}
    s['ranch']['jobs']={'cheese':copy.deepcopy(job),'oil':{'recipe':'truffle_oil','output':'truffle_oil','ready_tick':9876}}
    old_inventory=copy.deepcopy(s['inventory']);old_storage=copy.deepcopy(s['storage']);clock=copy.deepcopy(s['world_clock'])
    u=upgrade_state(s)
    assert len(u['construction']['machines'])==3
    assert u['ranch']['jobs']['legacy_machine_cheese']==job and 'cheese' not in u['ranch']['jobs']
    assert u['inventory']==old_inventory and u['storage']==old_storage and u['world_clock']==clock
    assert upgrade_state(u)==u
    u.update(location='pasture',position={'x':624,'y':520});u['world_clock']['elapsed']=3211
    apply(u,'ranch_job_collect',device_data(u,'legacy_machine_cheese',facility='legacy_machine_cheese'),100)
    assert u['inventory']['fine_cheese']==1 and u['ranch']['jobs']['legacy_machine_oil']['ready_tick']==9876


def test_replayed_and_parallel_craft_place_process_collect_pack_exactly_once(client):
    create(client);s=workshop();key=device(s,'mayo');s['inventory']['egg']=2;save_fixture(s)
    data=device_data(s,key,recipe='egg_mayo')
    with ThreadPoolExecutor(max_workers=2) as pool:
        responses=list(pool.map(lambda _:post_ranch(client,'ranch_process',data),range(2)))
    assert sorted(r.status_code for r in responses)==[200,422]
    s=saved_fixture();assert s['inventory']['egg']==1 and len(s['ranch']['jobs'])==1
    s['world_clock']['elapsed']+=DAY_SECONDS;save_fixture(s);data=device_data(s,key,facility=key)
    first=post_ranch(client,'ranch_job_collect',data,'collect-once');replay=post_ranch(client,'ranch_job_collect',data,'collect-once')
    assert first.status_code==replay.status_code==200 and replay.json()['replayed']
    assert saved_fixture()['inventory']['mayonnaise']==1
    s=saved_fixture();data=device_data(s,key)
    with ThreadPoolExecutor(max_workers=2) as pool:
        responses=list(pool.map(lambda _:post_ranch(client,'construction_machine_pack',data),range(2)))
    assert sorted(r.status_code for r in responses)==[200,422]
    assert saved_fixture()['inventory']['mayo_machine']==1
    s=saved_fixture();s['position']={'x':448,'y':440};save_fixture(s)
    data={'target':'ranch_ledger','recipe':'mayo_machine','x':144,'y':480}
    with ThreadPoolExecutor(max_workers=2) as pool:
        responses=list(pool.map(lambda _:post_ranch(client,'construction_machine_place',data),range(2)))
    assert sorted(r.status_code for r in responses)==[200,422]
    assert saved_fixture()['inventory']['mayo_machine']==0 and len(saved_fixture()['construction']['machines'])==1


def test_craft_receipt_replay_and_failed_material_quote_preserve_ownership(client):
    create(client);s=workshop();s['skill_growth']['building']=4
    apply(s,'construction_learn',{'target':'carpenter','recipe':'oil_press'},100)
    s['position']={'x':240,'y':196};save_fixture(s)
    data={'target':'workshop_counter','recipe':'oil_press'}
    with ThreadPoolExecutor(max_workers=2) as pool:
        results=list(pool.map(lambda _:post_ranch(client,'construction_craft',data,'craft-oil-once'),range(2)))
    assert all(r.status_code==200 for r in results)
    assert sorted(r.json()['replayed'] for r in results)==[False,True]
    after=saved_fixture();assert after['inventory']['oil_press']==1
    assert after['inventory']['plank']==s['inventory']['plank']-8 and after['inventory']['stone']==s['inventory']['stone']-18
    after['inventory']['plank']=0;save_fixture(after)
    rejected=post_ranch(client,'construction_craft',data)
    assert rejected.status_code==422 and saved_fixture()==after
