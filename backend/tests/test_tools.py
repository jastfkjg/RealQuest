import copy
import json
import uuid
import pytest
from test_game import fresh,client,create,cmd
from app.rules import apply,upgrade_state,RuleError
from app.tools import TOOLS,TIERS,resource_objects,land_for,resource_state
from app.world import WORLD,map_for,walkable
from app.daynight import DAY_SECONDS
from app.farm_land import available_cells,soil_reason
from app.db import Session
from app.models import Player
from sqlalchemy import select

def near(s,key):
    n=next(n for n in resource_objects(s,WORLD,100) if n['id']==key)
    s.update(location='overworld',position={'x':n['x'],'y':n['y']+44})
    return n

def strike(s,key,now):
    n=next(n for n in resource_objects(s,WORLD,now) if n['id']==key)
    return apply(s,'tool_strike',{'target':key,'expected_version':n['resource_state']['version']},now)

def test_starter_tools_migrate_once_without_changing_existing_possessions():
    s=fresh();s.pop('tools');s['storage']['axe']=1;s['inventory']['axe']=0
    s['inventory'].update(gold=123,wood=9);s['plots']['plot_0']={'planted_at':12,'ready_at':34}
    before=copy.deepcopy(s);new=upgrade_state(s)
    assert new['inventory']['axe']==0 and new['storage']['axe']==1
    assert all(new['inventory'][k]==1 for k in TOOLS if k!='axe')
    assert new['inventory']['gold']==123 and new['plots']==before['plots']
    new['inventory']['hoe']=0
    assert upgrade_state(new)['inventory']['hoe']==0
    assert s==before

def test_holding_changes_no_quantity_and_preserves_a_stowed_weapon():
    s=fresh();s['inventory']['stone_sword']=1
    apply(s,'gear_equip',{'item':'stone_sword'},100);assert s['tools']['held']=='stone_sword'
    inv=copy.deepcopy(s['inventory']);apply(s,'tool_hold',{'item':'axe'},101)
    assert s['inventory']==inv and s['village_combat']['equipped']=='stone_sword' and s['tools']['held']=='axe'
    apply(s,'tool_hold',{'item':None},102);assert s['tools']['held'] is None
    s['inventory']['axe']=0;before=copy.deepcopy(s)
    with pytest.raises(RuleError):apply(s,'tool_hold',{'item':'axe'},103)
    assert s==before

def test_tree_multiple_hits_stump_and_clearing_persist_and_release_collision():
    s=fresh();n=near(s,'wood_1');apply(s,'tool_hold',{'item':'axe'},100)
    for i in range(5):strike(s,'wood_1',100+i)
    assert s['inventory']['wood']==0 and s['tools']['resources']['wood_1']['work']==5
    assert upgrade_state(json.loads(json.dumps(s)))['tools']==s['tools']
    strike(s,'wood_1',105)
    assert s['tools']['resources']['wood_1']['stage']=='stump'
    assert s['inventory']['wood']==6 and s['inventory']['tree_seed']==1
    assert not walkable(n['x'],n['y'],'overworld',s,106)
    for i in range(3):strike(s,'wood_1',106+i)
    assert s['inventory']['wood']==8 and s['stats']['wood']==8 and 'first_gather' in s['events']
    assert s['stamina']['current']==82 and walkable(n['x'],n['y'],'overworld',s,109)
    s['world_clock']['elapsed']+=20*DAY_SECONDS
    assert resource_state(s,n,100)['stage']=='depleted'

def test_cleared_home_tree_frees_real_soil_not_only_the_picture():
    s=fresh();s['farm']['tilled']=[];before={c['id'] for c in available_cells(land_for(s,100))}
    for node in resource_objects(s,WORLD,100):
        if node.get('home') and node['resource']=='tree':s['tools']['resources'][node['id']]={'stage':'depleted','work':0,'version':1}
    after={c['id'] for c in available_cells(land_for(s,100))}
    assert after-before
    key=next(iter(after-before));cell=next(c for c in available_cells(land_for(s,100)) if c['id']==key)
    s['position']={'x':cell['x'],'y':cell['y']}
    apply(s,'till',{'x':cell['x'],'y':cell['y']},100)
    assert key in s['farm']['tilled']

@pytest.mark.parametrize('key,item,level,hits',[('stone_1','stone',0,3),('stone_3','copper_ore',0,5),('stone_5','iron_ore',1,4),('stone_7','gold_ore',2,3)])
def test_mining_types_gate_power_and_drops(key,item,level,hits):
    s=fresh();near(s,key);apply(s,'tool_hold',{'item':'pickaxe'},100)
    if level:
        before=copy.deepcopy(s)
        with pytest.raises(RuleError,match='需要'):strike(s,key,100)
        assert s==before
    s['tools']['levels']['pickaxe']=level
    for i in range(hits):strike(s,key,100+i)
    assert s['tools']['resources'][key]['stage']=='depleted' and s['inventory'][item]>0
    assert s['stamina']['current']==100-3*hits

def test_mine_regrowth_uses_game_time_not_wall_clock_and_has_new_version():
    s=fresh();n=near(s,'stone_3');apply(s,'tool_hold',{'item':'pickaxe'},100)
    for i in range(5):strike(s,n['id'],100+i)
    v=resource_state(s,n,1000000);assert v['stage']=='depleted'
    s['world_clock']['elapsed']=s['tools']['resources'][n['id']]['ready_tick']
    v=resource_state(s,n,106);assert v['stage']=='whole' and v['version']==6
    strike(s,n['id'],106);assert s['tools']['resources'][n['id']]['version']==7

def test_wild_tree_reseeds_but_home_clearing_stays_empty():
    s=fresh();n=near(s,'wood_4');s['tools']['resources'][n['id']]={'stage':'depleted','work':0,'version':9,'ready_tick':1000}
    s['world_clock']['elapsed']=1000
    assert resource_state(s,n,100)['stage']=='sapling'
    s['world_clock']['elapsed']=1000+3*DAY_SECONDS
    assert resource_state(s,n,100)['stage']=='tree'

@pytest.mark.parametrize('change',[{'held':'hoe'},{'stamina':1},{'position':{'x':240,'y':320}},{'version':99},{'next_at':200},{'inventory':0}])
def test_strike_rejections_do_not_change_work_or_resources(change):
    s=fresh();near(s,'wood_1');s['tools']['held']='axe'
    if 'held' in change:s['tools']['held']=change['held']
    if 'stamina' in change:s['stamina'].update(current=change['stamina'],updated_at=100)
    if 'position' in change:s['position']=change['position']
    if 'next_at' in change:s['tools']['next_at']=change['next_at']
    if 'inventory' in change:s['inventory']['axe']=change['inventory'];s['tools']['held']=None
    before=copy.deepcopy(s)
    with pytest.raises(RuleError):apply(s,'tool_strike',{'target':'wood_1','expected_version':change.get('version',0)},100)
    assert s==before

def test_resource_version_and_shared_cooldown_reject_duplicate_different_requests():
    s=fresh();near(s,'stone_1');s['tools']['held']='pickaxe';strike(s,'stone_1',100)
    before=copy.deepcopy(s)
    with pytest.raises(RuleError):apply(s,'tool_strike',{'target':'stone_1','expected_version':0},101)
    assert s==before
    with pytest.raises(RuleError):strike(s,'stone_1',100.1)
    assert s==before

def test_upgrade_all_four_tools_has_authoritative_costs_and_no_duplicates():
    for key in TOOLS:
        s=fresh();s.update(location='workshop',position={'x':376,'y':184});s['inventory'].update(gold=1000,copper_ore=50,iron_ore=50,gold_ore=50,wood=100,stone=100)
        for level in range(3):
            inv=copy.deepcopy(s['inventory']);apply(s,'tool_upgrade',{'target':'blacksmith','item':key,'expected_level':level},100)
            assert s['tools']['levels'][key]==level+1 and s['inventory'][key]==1
            for material,amount in TIERS[level+1]['costs'].items():assert s['inventory'][material]==inv[material]-amount
            before=copy.deepcopy(s)
            with pytest.raises(RuleError):apply(s,'tool_upgrade',{'target':'blacksmith','item':key,'expected_level':level},101)
            assert s==before
        assert upgrade_state(s)['tools']['levels'][key]==3

def test_watering_uses_owned_tool_water_and_stamina_and_free_refill():
    s=fresh();s['position']={'x':136,'y':440};apply(s,'plant',{'target':'plot_0'},100)
    apply(s,'water',{'target':'plot_0'},100)
    assert s['tools']['water']==19 and s['tools']['held']=='watering_can' and s['stamina']['current']==96
    s['tools']['water']=0;s['plots']['plot_0']['watered']=False;before=copy.deepcopy(s)
    with pytest.raises(RuleError,match='水壶空'):apply(s,'water',{'target':'plot_0'},101)
    assert s==before
    s['position']={'x':424,'y':488};s['tools']['levels']['watering_can']=2
    stamina=s['stamina']['current'];apply(s,'tool_refill',{},102)
    assert s['tools']['water']==60 and s['stamina']['current']==stamina

def test_tree_seed_replant_growth_and_land_protection():
    s=fresh();s['inventory']['tree_seed']=1;s['farm']['tilled']=[]
    land=land_for(s,100);cell=next(c for c in available_cells(land) if all(abs(c['x']-n['x'])>=48 or abs(c['y']-n['y'])>=48 for n in resource_objects(s,WORLD,100)))
    s['position']={'x':cell['x'],'y':cell['y']};apply(s,'tool_hold',{'item':'tree_seed'},100)
    apply(s,'tree_plant',{'x':cell['x'],'y':cell['y']},100)
    key='sapling_'+cell['id'];n=next(n for n in resource_objects(s,WORLD,100) if n['id']==key)
    assert n['resource_state']['stage']=='sapling' and s['tools']['held'] is None and s['inventory']['tree_seed']==0
    assert soil_reason(land_for(s,100),cell) and walkable(cell['x'],cell['y'],'overworld',s,100)
    assert resource_state(s,n,1000000)['stage']=='sapling'
    s['world_clock']['elapsed']=s['tools']['planted'][key]['ready_tick']
    assert resource_state(s,n,100)['stage']=='tree' and soil_reason(land_for(s,100),cell)
    s['position']={'x':cell['x'],'y':cell['y']+44};s['tools']['held']='axe'
    for i in range(9):strike(s,key,101+i)
    s['world_clock']['elapsed']+=10*DAY_SECONDS
    assert resource_state(s,{**n,'home':True},200)['stage']=='depleted'
    apply(s,'tree_plant',{'x':cell['x'],'y':cell['y']},200)
    assert s['tools']['resources'][key]['stage']=='sapling' and s['inventory']['tree_seed']==0

def test_legacy_gather_can_never_mint_timed_material_piles():
    s=fresh();near(s,'wood_1');before=copy.deepcopy(s)
    with pytest.raises(RuleError):apply(s,'gather',{'target':'wood_1'},100)
    assert s==before and not any(o['kind'] in ['wood','stone'] for o in map_for('overworld',s,100)['objects'])

def test_strike_and_upgrade_receipts_replay_exactly_once(client):
    create(client)
    with Session.begin() as db:
        p=db.scalar(select(Player));s=upgrade_state(p.state);near(s,'stone_1');s['tools']['held']='pickaxe';p.state=s
    request=str(uuid.uuid4());r=cmd(client,'tool_strike',{'target':'stone_1','expected_version':0},request)
    assert r.status_code==200
    again=cmd(client,'tool_strike',{'target':'stone_1','expected_version':0},request)
    assert again.status_code==200 and again.json()['replayed']
    assert again.json()['state']['tools']['resources']==r.json()['state']['tools']['resources']
    assert again.json()['state']['stamina']['current']==r.json()['state']['stamina']['current']
    stale=cmd(client,'tool_strike',{'target':'stone_1','expected_version':0})
    assert stale.status_code==422 and '状态已变化' in stale.json()['detail']
    with Session.begin() as db:
        p=db.scalar(select(Player));s=upgrade_state(p.state);s.update(location='workshop',position={'x':376,'y':184});s['inventory'].update(gold=100,copper_ore=6,wood=6);p.state=s
    request=str(uuid.uuid4());a=cmd(client,'tool_upgrade',{'target':'blacksmith','item':'pickaxe','expected_level':0},request)
    assert a.status_code==200
    b=cmd(client,'tool_upgrade',{'target':'blacksmith','item':'pickaxe','expected_level':0},request)
    assert b.json()['replayed'] and b.json()['state']['inventory']==a.json()['state']['inventory']

@pytest.mark.parametrize('kind',['strike','upgrade'])
def test_competing_work_and_upgrade_requests_have_one_winner(client,kind):
    from concurrent.futures import ThreadPoolExecutor
    from fastapi.testclient import TestClient
    from app.main import app
    create(client)
    with Session.begin() as db:
        p=db.scalar(select(Player));s=upgrade_state(p.state)
        if kind=='strike':
            near(s,'wood_1');s['tools']['held']='axe';s['tools']['resources']['wood_1']={'stage':'tree','work':5,'version':5}
        else:
            s.update(location='workshop',position={'x':376,'y':184});s['inventory'].update(gold=100,copper_ore=6,wood=6)
        p.state=s
    cookies=dict(client.cookies)
    def request(_):
        with TestClient(app) as other:
            other.cookies.update(cookies)
            return cmd(other,'tool_strike' if kind=='strike' else 'tool_upgrade',{'target':'wood_1','expected_version':5} if kind=='strike' else {'target':'blacksmith','item':'axe','expected_level':0}).status_code
    with ThreadPoolExecutor(2) as pool:statuses=list(pool.map(request,range(2)))
    assert sorted(statuses)==[200,422]
    s=client.get('/api/state').json()['state']
    if kind=='strike':assert s['inventory']['wood']==6 and s['stamina']['current']==98 and s['tools']['resources']['wood_1']['version']==6
    else:assert s['tools']['levels']['axe']==1 and s['inventory']['gold']==70 and s['inventory']['copper_ore']==0
