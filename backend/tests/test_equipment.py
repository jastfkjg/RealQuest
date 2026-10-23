"""Public equipment behavior and resource integrity using isolated deterministic player fixtures."""
import copy
import uuid
from concurrent.futures import ThreadPoolExecutor
import pytest
from sqlalchemy import select
from test_game import client,cmd
from test_combat import player,at,enter,ticking,NOW
from app.models import Player
from app.db import Session
from app.rules import apply,upgrade_state,RuleError
from app import equipment
from app.combat import WEAPONS,floor_enemies,attack_hit,damage_enemy,hurt_player,defeated


def funded(city=False):
    s=player();at(s,'city' if city else 'workshop','city_armory' if city else 'blacksmith')
    s['inventory'].update(gold=30000,plank=300,stone=300,gel=300,shell=300,crystal=300,alloy=300,mechanism=300,energy_cell=300,focus_core=300)
    s['stamina'].update(max=200,current=200,updated_at=NOW);s['skill_growth']['building']=10;s['knowledge_growth'].update(science=12,magic=12)
    return s


def test_regional_stock_cannot_be_bypassed_with_forged_requests():
    s=funded();q=equipment.shop_view(s)
    assert 'flintlock' in q['offers'] and 'clockwork_pistol' not in q['offers']
    for action,item in [('gear_buy','clockwork_pistol'),('blueprint_buy','repeater_smg'),('blueprint_research','prism_rifle'),('gear_material_buy','alloy')]:
        before=copy.deepcopy(s)
        with pytest.raises(RuleError):apply(s,action,dict(target='blacksmith',item=item),NOW)
        assert s==before
    at(s,'city','city_armory');q=equipment.shop_view(s)
    assert 'clockwork_pistol' in q['offers'] and 'repeater_smg' not in q['offers']
    assert 'prism_rifle' in q['research'] and set(q['materials'])==set(equipment.MATERIALS)
    s['position']={'x':128,'y':480};before=copy.deepcopy(s)
    with pytest.raises(RuleError):apply(s,'blueprint_buy',dict(target='city_armory',item='clockwork_pistol'),NOW)
    assert s==before


@pytest.mark.parametrize('item',list(equipment.GEAR))
def test_every_item_has_real_acquisition_crafting_use_and_restoration(item):
    g=equipment.GEAR[item];s=funded(g['region']=='city');c=s['village_combat'];target=equipment.shop_view(s)['target']
    if g['blueprint_source']=='merchant':apply(s,'blueprint_buy',dict(target=target,item=item),NOW)
    elif g['blueprint_source']=='research':
        c['boss_first']=True;apply(s,'blueprint_research',dict(target=target,item=item),NOW)
    elif g['blueprint_source']=='boss':
        enter(s);s['location']='cave_5';e=floor_enemies(s,NOW)[0];e['hp']=0;defeated(s,e);at(s,'workshop','armory_counter')
    else:
        s['attributes']['wisdom']=25;at(s,'overworld','ruins');apply(s,'explore',dict(target='ruins'),NOW);at(s,'city','city_armory')
    assert item in s['village_combat']['blueprints'];before=copy.deepcopy(s['inventory'])
    target=equipment.shop_view(s)['craft_target'];at(s,s['location'],target)
    apply(s,'gear_craft',dict(target=target,item=item),NOW)
    assert s['inventory'][item]==before[item]+1
    for key,n in g['costs'].items():assert s['inventory'][key]==before[key]-n
    apply(s,'gear_equip',dict(item=item),NOW)
    c=s['village_combat']
    assert (c['equipped'] if g['slot']=='weapon' else c['gear'][g['slot']])==item
    restored=upgrade_state(s);assert restored['village_combat']['blueprints']==c['blueprints']
    assert restored['village_combat']['gear']==c['gear'] and restored['inventory']==s['inventory']


def test_diagram_is_permanent_and_separate_from_wielding_and_purchase():
    s=funded();s['skill_growth']['building']=0;s['knowledge_growth']['science']=0
    apply(s,'gear_buy',dict(target='blacksmith',item='spring_spear'),NOW)
    assert not equipment.GEAR['spring_spear']['id'] in s['village_combat']['blueprints']
    before=copy.deepcopy(s)
    with pytest.raises(RuleError):apply(s,'gear_equip',dict(item='spring_spear'),NOW)
    assert s==before
    apply(s,'blueprint_buy',dict(target='blacksmith',item='spring_spear'),NOW)
    before=copy.deepcopy(s)
    with pytest.raises(RuleError):apply(s,'blueprint_buy',dict(target='blacksmith',item='spring_spear'),NOW)
    assert s==before
    at(s,'workshop','armory_counter')
    with pytest.raises(RuleError):apply(s,'gear_craft',dict(target='armory_counter',item='spring_spear'),NOW)
    s['knowledge_growth']['science']=1;s['skill_growth']['building']=1
    for _ in range(2):apply(s,'gear_craft',dict(target='armory_counter',item='spring_spear'),NOW)
    assert s['inventory']['spring_spear']==3 and 'spring_spear' in s['village_combat']['blueprints']


def test_permanent_stamina_gate_and_cooldown_survive_switches():
    s=funded();s['inventory']['stone_hammer']=1;s['stamina'].update(max=100,current=100)
    before=copy.deepcopy(s)
    with pytest.raises(RuleError):apply(s,'gear_equip',dict(item='stone_hammer'),NOW)
    assert s==before
    s['stamina'].update(max=110,current=0);apply(s,'gear_equip',dict(item='stone_hammer'),NOW)
    c=s['village_combat'];c['attack_at']=8;c['time']=5;s['inventory']['wooden_bow']=1
    apply(s,'gear_equip',dict(item='wooden_bow'),NOW);assert s['village_combat']['attack_at']==8
    c=s['village_combat'];c['cast']=dict(until=6);before=copy.deepcopy(s)
    with pytest.raises(RuleError):apply(s,'gear_unequip',dict(slot='weapon'),NOW)
    assert s==before


def test_armor_slots_effects_sale_and_storage_are_authoritative():
    s=funded();c=s['village_combat']
    for item in ['shell_armor','scout_boots','lantern_charm']:
        s['inventory'][item]=1;apply(s,'gear_equip',dict(item=item),NOW)
    assert equipment.stats(s)==dict(defense=3,dodge_bonus=.15,hurt_bonus=0,heal_bonus=5,light=True)
    assert hurt_player(s,10) and s['vitality']['current']==93
    apply(s,'gear_sell',dict(target='blacksmith',item='shell_armor'),NOW)
    assert s['village_combat']['gear']['body'] is None and equipment.stats(s)['defense']==0
    at(s,'home','home_chest');apply(s,'store',dict(target='home_chest',item='scout_boots',amount=1),NOW)
    assert s['village_combat']['gear']['feet'] is None and s['storage']['scout_boots']==1
    apply(s,'withdraw',dict(target='home_chest',item='scout_boots',amount=1),NOW)
    assert s['village_combat']['gear']['feet'] is None and s['inventory']['scout_boots']==1


@pytest.mark.parametrize('id',['wooden_bow','repeating_crossbow','flintlock','clockwork_pistol','repeater_smg','prism_rifle','glow_staff','frost_staff','ember_staff','archmage_staff'])
def test_all_ranged_families_require_actual_contact_and_wall_collision(id):
    s=enter(funded());c=s['village_combat'];s['position']={'x':220,'y':240};es=c['floors']['1']
    for e in es:e.update(x=320,y=240,phase='recover',until=50)
    w=WEAPONS[id];attack_hit(s,dict(w,kind='weapon',angle=0,weapon_id=id))
    assert len(c['projectiles'])==1 and all(e['hp']==18 for e in es)
    # Public combat ticks advance collision and damage; no direct HP mutation.
    c['last_tick']=NOW
    for i in range(1,8):ticking(s,NOW+i*.1)
    assert any(e['hp']<18 for e in s['village_combat']['floors']['1'])
    s=enter(funded());c=s['village_combat'];s['position']={'x':264,'y':120};es=c['floors']['1']
    for e in es:e.update(x=352,y=120,phase='recover',until=50)
    attack_hit(s,dict(w,kind='weapon',angle=0,weapon_id=id));c['last_tick']=NOW
    for i in range(1,8):ticking(s,NOW+i*.1)
    assert all(e['hp']==18 for e in s['village_combat']['floors']['1']) and not s['village_combat']['projectiles']


def test_fixed_effects_are_timed_and_deterministic():
    s=enter(funded());c=s['village_combat'];e=c['floors']['1'][0];e['hp']=100;e['max_hp']=100
    def hit(id):damage_enemy(s,e,dict(WEAPONS[id],angle=0,weapon_id=id))
    hit('frost_staff');assert e['slow_until']==1.5
    hit('stone_hammer');assert e['shatter_until']==2
    hit('ember_staff');assert e['burn_at']==.6
    before=e['hp'];hit('crystal_sword');hit('crystal_sword');hit('crystal_sword')
    assert before-e['hp']==16*3+4


def test_unarmed_attack_and_offensive_spell_cannot_deal_damage():
    s=enter(funded());c=s['village_combat'];c['spark_learned']=True;s['position']={'x':220,'y':240}
    for e in c['floors']['1']:e.update(x=240,y=240,phase='recover',until=50)
    c['last_tick']=NOW
    for i in range(1,8):ticking(s,NOW+i*.1,attack=True,spark=True)
    assert all(e['hp']==18 for e in s['village_combat']['floors']['1']) and s['stamina']['current']==200


def test_old_save_migration_preserves_owned_weapon_and_original_crafting():
    s=funded();s['inventory']['glow_staff']=1;s['village_combat']['equipped']='glow_staff'
    for key in ['gear_version','gear','blueprints','legacy_use','weapon_hits']:s['village_combat'].pop(key)
    s['knowledge_growth']['magic']=0;before=copy.deepcopy(s['inventory']);restored=upgrade_state(s)
    assert restored['inventory']==before and restored['village_combat']['equipped']=='glow_staff'
    assert set(equipment.LEGACY)<=set(restored['village_combat']['blueprints'])
    assert not equipment.use_reasons(restored,'glow_staff')


def test_blueprint_duplicate_request_and_concurrent_purchase_charge_once(client):
    cmd(client,'create',dict(name='图纸回执'))
    with Session.begin() as db:db.scalar(select(Player)).state=funded()
    key=str(uuid.uuid4());data=dict(target='blacksmith',item='wooden_bow')
    with ThreadPoolExecutor(2) as pool:results=list(pool.map(lambda _:cmd(client,'blueprint_buy',data,key),range(2)))
    assert [r.status_code for r in results]==[200,200]
    assert results[0].json()['state']['inventory']==results[1].json()['state']['inventory']
    s=results[0].json()['state'];assert s['inventory']['gold']==30000-equipment.GEAR['wooden_bow']['blueprint_price']
    assert cmd(client,'blueprint_buy',data).status_code==422


def test_lantern_charm_soup_heals_exact_bonus_and_reports_it():
    s=enter(funded());c=s['village_combat'];c['gear']['charm']='lantern_charm'
    s['inventory'].update(lantern_charm=1,soup=1);s['position']={'x':64,'y':352}
    s['vitality']['current']=50;s['stamina']['current']=50;c['last_tick']=NOW
    ticking(s,NOW+.1,soup=True)
    for i in range(2,16):ticking(s,NOW+i*.1)
    assert s['inventory']['soup']==0 and s['vitality']['current']==75 and s['stamina']['current']==65
    assert '生命 +25' in s['village_combat']['message']
