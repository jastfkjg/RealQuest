"""Authoritative equipment, permanent diagrams and regional quotes. No client-priced mutations."""
import json
from .economy import money
from pathlib import Path

CATALOG = json.loads(Path(__file__).with_name('equipment_catalog.json').read_text())
GEAR = {r['id']: r for r in CATALOG['equipment']}
WEAPONS = {k: v for k, v in GEAR.items() if v['slot'] == 'weapon'}
MATERIALS = CATALOG['materials']
LEGACY = ['stone_sword', 'reinforced_sword', 'spring_spear', 'glow_staff']
SLOTS = ['body', 'feet', 'charm']
NAMES = {'plank':'木板','stone':'石料','shell':'硬壳碎片','gel':'黏液胶质','crystal':'微光晶屑','gold':'银币', **{k:v['name'] for k,v in MATERIALS.items()}}


def ensure_equipment(state, legacy=False):
    c = state['village_combat']
    if 'gear_version' not in c:
        c.update(gear_version=1, blueprints={k:'旧版工艺传承' for k in LEGACY} if legacy else {},
                 legacy_use=[k for k in LEGACY if state['inventory'].get(k, 0)] if legacy else [],
                 gear={slot:None for slot in SLOTS}, weapon_hits={})
        # Recover earned special diagrams once during the old-save migration.
        if c.get('boss_first'):c['blueprints'].setdefault('crystal_sword','石壳守卫首胜')
        if 'rune_awakened' in state.get('events',[]):c['blueprints'].setdefault('rune_spear','沉睡符文手稿')
    for item in [*GEAR, *MATERIALS]:
        state['inventory'].setdefault(item, 0)
        state.setdefault('storage', {}).setdefault(item, 0)

    return c


def use_reasons(state, item):
    g = GEAR[item]
    if item in state['village_combat'].get('legacy_use', []): return []
    reasons=[]
    for label, current, needed in [
        ('永久体力上限',state['stamina']['max'],g.get('min_stamina',100)),
        ('科学',state['knowledge_growth']['science'],g.get('use_science',0)),
        ('魔法',state['knowledge_growth']['magic'],g.get('use_magic',0))]:
        if current < needed: reasons.append(f'{label} {current}/{needed}')
    return reasons


def craft_reasons(state, item):
    g=GEAR[item]; reasons=[]
    if item not in state['village_combat']['blueprints']: reasons.append('尚未学会图纸')
    for label,current,needed in [('建造',state['skill_growth']['building'],g['building']),
        ('科学',state['knowledge_growth']['science'],g['science']),('魔法',state['knowledge_growth']['magic'],g['magic_level'])]:
        if current < needed: reasons.append(f'需要{label}{needed}级（当前{current}）')
    if g['region']=='city' and state['location']!='city': reasons.append('需要苔桥城精密工作台')
    for key,n in g['costs'].items():
        if state['inventory'].get(key,0)<n: reasons.append('钱币还差'+money(n-state['inventory'].get(key,0)) if key=='gold' else f'{NAMES.get(key,key)}还差{n-state["inventory"].get(key,0)}')
    return reasons


def stats(state):
    c=state['village_combat']; result=dict(defense=0,dodge_bonus=0,hurt_bonus=0,heal_bonus=0,light=False)
    for slot in SLOTS:
        item=c['gear'].get(slot)
        if item not in GEAR or state['inventory'].get(item,0)<=0 or use_reasons(state,item): continue
        for key in result:
            result[key]=result[key] or GEAR[item].get(key,False) if key=='light' else result[key]+GEAR[item].get(key,0)
    result['dodge_bonus']=min(.3,result['dodge_bonus'])
    return result


def shop_view(state):
    city=state['location']=='city'; region='city' if city else 'village'
    offers=[k for k,g in GEAR.items() if g['region']==region and g['sale']]
    diagrams=[k for k,g in GEAR.items() if g['region']==region and g['blueprint_source']=='merchant']
    research=[k for k,g in GEAR.items() if city and g['region']=='city' and g['blueprint_source']=='research']
    return dict(region=region,name='苔桥城精密工坊' if city else '工坊武备台',target='city_armory' if city else 'armory_counter',
                offers=offers+['soup'],diagrams=diagrams,research=research,materials=MATERIALS if city else {},
                craft=[k for k in state['village_combat']['blueprints'] if k in GEAR and (GEAR[k]['region']=='village' or city)])


def research_reasons(state,item):
    g=GEAR[item];reasons=[]
    for label,current,needed in [('科学',state['knowledge_growth']['science'],g['science']),('魔法',state['knowledge_growth']['magic'],g['magic_level']),('建造',state['skill_growth']['building'],g['building'])]:
        if current<needed:reasons.append(f'需要{label}{needed}级')
    if not state['village_combat'].get('boss_first'):reasons.append('先取得石壳守卫首胜')
    return reasons


def view(state):
    c=state['village_combat']
    return {k:{**g,'craft_reasons':craft_reasons(state,k),'use_reasons':use_reasons(state,k),
               'known':k in c['blueprints'],'research_reasons':research_reasons(state,k)} for k,g in GEAR.items()}


def equip(state,item):
    from .rules import require
    c=state['village_combat']
    require(isinstance(item,str) and item in GEAR and state['inventory'].get(item,0)>0,'尚未持有这件装备')
    require(not c['cast'] and not c.get('dash') and (not c.get('action') or c['action']['until']<=c['time']),'动作结束后再切换装备')
    reasons=use_reasons(state,item);require(not reasons,'；'.join(reasons))
    g=GEAR[item]
    if g['slot']=='weapon': c['equipped']=item
    else: c['gear'][g['slot']]=item
    return '已装备'+g['name']


def remove_missing(state):
    c=state['village_combat']
    if c.get('equipped') and not state['inventory'].get(c['equipped'],0):c['equipped']=None
    for slot,item in c['gear'].items():
        if item and not state['inventory'].get(item,0):c['gear'][slot]=None


def command(state,action,data):
    from .rules import require,spend
    from .world import map_for
    import math
    c=state['village_combat']
    if action=='gear_equip':return equip(state,data.get('item'))
    if action=='gear_unequip':
        slot=data.get('slot');require(slot in ['weapon',*SLOTS],'请选择装备位置')
        require(not c['cast'] and not c.get('dash') and (not c.get('action') or c['action']['until']<=c['time']),'动作结束后再卸下装备')
        if slot=='weapon':c['equipped']=None
        else:c['gear'][slot]=None
        return '已卸下装备，物品保留在行囊中'
    shop=shop_view(state)
    require(state['location'] in ['workshop','city'] and data.get('target')==shop['target'],'请走近相应的武备柜台')
    obj=next((o for o in map_for(state['location'])['objects'] if o['id']==shop['target']),None)
    require(obj and math.hypot(state['position']['x']-obj['x'],state['position']['y']-obj['y'])<=72,'请先走近柜台')
    item=data.get('item');require(isinstance(item,str),'请选择物品')
    if action in ['blueprint_buy','blueprint_research']:
        require(item in (shop['diagrams'] if action=='blueprint_buy' else shop['research']),'这里没有这份图纸')
        require(item not in c['blueprints'],'已经学会这份图纸，无需重复购买')
        if action=='blueprint_research':
            reasons=research_reasons(state,item);require(not reasons,'；'.join(reasons))
        spend(state,{'gold':GEAR[item]['blueprint_price'],**({'crystal':6} if action=='blueprint_research' else {})})
        c['blueprints'][item]=shop['name']+'研究兑换' if action=='blueprint_research' else shop['name']+'商人'
        return '已学会'+GEAR[item]['name']+'图纸，可反复打造'
    if action=='gear_material_buy':
        require(item in shop['materials'],'这里没有这种制作材料')
        amount=data.get('amount',1);require(type(amount) is int and 1<=amount<=99,'购买数量需为1至99')
        spend(state,{'gold':MATERIALS[item]['price']*amount});state['inventory'][item]+=amount
        return '已购入'+MATERIALS[item]['name']+f' ×{amount}'
    if action=='gear_buy':
        require(item in shop['offers'],'这里没有这种商品')
        spend(state,{'gold':8 if item=='soup' else GEAR[item]['price']});state['inventory'][item]+=1
        return '已买入'+('便携菜汤' if item=='soup' else GEAR[item]['name'])
    if action=='gear_craft':
        require(item in GEAR,'没有这份装备配方')
        reasons=craft_reasons(state,item);require(not reasons,'；'.join(reasons))
        spend(state,GEAR[item]['costs']);state['inventory'][item]+=1
        return '已打造'+GEAR[item]['name']
    if action=='gear_sell':
        require(item in GEAR or item in ['gel','shell','crystal'],'关键物品不可出售')
        require(not c['cast'],'动作结束后再出售')
        spend(state,{item:1});state['inventory']['gold']+=GEAR[item]['price']//4 if item in GEAR else {'gel':1,'shell':2,'crystal':3}[item]
        remove_missing(state)
        return '已出售'+(GEAR[item]['name'] if item in GEAR else NAMES[item])
    raise ValueError('未知装备操作')
