"""The person sells; the stable workshop anvil only crafts. No player DB access."""
import copy
import pytest
from app.rules import apply, RuleError
from app.world import map_for, walkable
from app import equipment
from test_equipment import funded
from test_combat import at, NOW


def test_dedicated_npc_and_stable_workbench_are_reachable_and_distinct():
    objects=map_for('workshop')['objects']
    smith=next(o for o in objects if o['id']=='blacksmith')
    table=next(o for o in objects if o['id']=='armory_counter')
    assert smith['kind']=='blacksmith' and table['kind']=='armory'
    assert (table['x'],table['y'])==(376,280)
    assert all(walkable(o['x'],o['y'],'workshop') for o in [smith,table])
    assert abs(smith['y']-table['y'])>72


@pytest.mark.parametrize('action',['gear_buy','blueprint_buy','gear_sell'])
def test_anvil_cannot_trade_even_with_forged_merchant_target(action):
    s=funded();s['inventory']['stone_sword']=1;at(s,'workshop','armory_counter')
    for target in ['armory_counter','blacksmith']:
        before=copy.deepcopy(s)
        with pytest.raises(RuleError):apply(s,action,dict(target=target,item='stone_sword'),NOW)
        assert s==before


def test_merchant_cannot_craft_and_walking_to_workbench_uses_learned_recipe():
    s=funded();before=copy.deepcopy(s['inventory'])
    apply(s,'blueprint_buy',dict(target='blacksmith',item='stone_sword'),NOW)
    assert s['inventory']['gold']==before['gold']-8
    for target in ['blacksmith','armory_counter']:
        snapshot=copy.deepcopy(s)
        with pytest.raises(RuleError):apply(s,'gear_craft',dict(target=target,item='stone_sword'),NOW)
        assert s==snapshot
    at(s,'workshop','armory_counter');before=copy.deepcopy(s['inventory'])
    apply(s,'gear_craft',dict(target='armory_counter',item='stone_sword'),NOW)
    assert s['inventory']['stone_sword']==1 and s['inventory']['plank']==before['plank']-2
    assert 'stone_sword' in s['village_combat']['blueprints']


@pytest.mark.parametrize('amount',[0,-1,100,1.5,True,'2'])
def test_invalid_bulk_amount_is_rejected_without_mutation(amount):
    s=funded();s['inventory']['stone_sword']=5
    for action in ['gear_buy','gear_sell']:
        before=copy.deepcopy(s)
        with pytest.raises(RuleError):apply(s,action,dict(target='blacksmith',item='stone_sword',amount=amount),NOW)
        assert s==before


def test_bulk_quote_and_last_equipped_sale_are_exact():
    s=funded();s['inventory']['gold']=48
    apply(s,'gear_buy',dict(target='blacksmith',item='stone_sword',amount=2),NOW)
    assert s['inventory']['gold']==0 and s['inventory']['stone_sword']==2
    apply(s,'gear_equip',dict(item='stone_sword'),NOW)
    apply(s,'gear_sell',dict(target='blacksmith',item='stone_sword',amount=1),NOW)
    assert s['village_combat']['equipped']=='stone_sword'
    apply(s,'gear_sell',dict(target='blacksmith',item='stone_sword',amount=1),NOW)
    assert s['inventory']['gold']==12 and s['village_combat']['equipped'] is None


def test_insufficient_balance_does_not_learn_diagram_or_change_inventory():
    s=funded();s['inventory']['gold']=7
    for action in ['blueprint_buy','gear_buy']:
        before=copy.deepcopy(s)
        with pytest.raises(RuleError):apply(s,action,dict(target='blacksmith',item='stone_sword'),NOW)
        assert s==before
