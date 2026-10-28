"""Inventory tools and persistent, server-owned resource work. No durability."""
import json
import math
from pathlib import Path
from .daynight import clock_elapsed, DAY_SECONDS

CATALOG = json.loads(Path(__file__).with_name('tool_catalog.json').read_text())
TOOLS = {t['id']:t for t in CATALOG['tools']}
TIERS = CATALOG['tiers']
MATERIALS = CATALOG['materials']
RESOURCES = CATALOG['resources']
INTERVAL = .48


def ensure_tools(state):
    if 'tools' not in state:
        # One grant per journey, including pre-tool saves. Never duplicate an
        # already owned or stored tool, or touch crops, balances or equipment.
        state['tools'] = dict(version=1, held=state.get('village_combat',{}).get('equipped') or None,
                              levels={k:0 for k in TOOLS}, water=20, next_at=0., sequence=0,
                              resources={}, planted={}, action=None)
        for key in TOOLS:
            if state['inventory'].get(key,0) + state.get('storage',{}).get(key,0) == 0:
                state['inventory'][key] = 1
        if state.get('character') and state.get('location')=='overworld':
            # A historical pile anchor can now be a trunk. Move only an
            # intersecting old position to the nearest safe point beside it.
            from .world import WORLD
            p=state['position']
            colliders=WORLD['permanent_obstacles']+[n['collider'] for n in resource_objects(state,WORLD,0) if n['resource_state']['solid']]
            def safe_point(v):
                return 24<=v['x']<=WORLD['width']-24 and 32<=v['y']<=WORLD['height']-24 and not any(rx-9<v['x']<rx+w+9 and ry-7<v['y']<ry+h+7 for rx,ry,w,h in colliders)
            if not safe_point(p):
                candidates=[{'x':p['x']+dx,'y':p['y']+dy} for dx in range(-64,65,8) for dy in range(-64,65,8)]
                safe=[v for v in candidates if safe_point(v)]
                if safe:state['position']=min(safe,key=lambda v:math.hypot(v['x']-p['x'],v['y']-p['y']))
    for key in [*TOOLS,*MATERIALS]:
        state['inventory'].setdefault(key,0)
        state['storage'].setdefault(key,0)
    reconcile_held(state)


def reconcile_held(state):
    t=state.get('tools')
    if t and t['held'] and state['inventory'].get(t['held'],0)<=0:
        t['held']=None


def tool_name(state,key):
    return TIERS[state['tools']['levels'][key]]['name']+TOOLS[key]['name']


def stamina_cost(state,key):
    # Existing, deliberately invested skills improve work; actions do not mint
    # real-life growth points or silently raise those skills.
    return max(1,TOOLS[key]['stamina']-min(2,state['skill_growth'].get(TOOLS[key]['skill'],0)//3))


def resource_state(state,node,now):
    tick=clock_elapsed(state,now) if state.get('world_clock') else 0
    saved=state.get('tools',{}).get('resources',{}).get(node['id'])
    spec=RESOURCES[node['resource']]
    value=dict(stage='tree' if node['resource']=='tree' else 'whole',work=0,version=0)
    if saved:value.update(saved)
    if node.get('planted') and not saved:
        value.update(stage='sapling',ready_tick=node['ready_tick'])
    if value['stage']=='sapling' and tick>=value['ready_tick']:
        value.update(stage='tree',work=0,version=value['version']+1)
    if value['stage']=='depleted' and not node.get('home') and tick>=value.get('ready_tick',float('inf')):
        value.update(stage='sapling' if node['resource']=='tree' else 'whole',work=0,version=value['version']+1)
        if node['resource']=='tree':value['ready_tick']=value.get('ready_tick',tick)+3*DAY_SECONDS
        if value['stage']=='sapling' and tick>=value['ready_tick']:
            value.update(stage='tree',version=value['version']+1)
    total=spec['stump_work'] if value['stage']=='stump' else spec['work']
    return {**value,'total':total,'solid':value['stage'] not in ['depleted','sapling']}


def nodes_for(state,base):
    nodes=list(base.get('resource_nodes',[]))
    if base['id']=='overworld':
        nodes += [{**o,'kind':'resource','name':'新栽橡树','resource':'tree','home':True,'planted':True,
                   'hitbox':[o['x']-20,o['y']-46,40,62],'collider':[o['x']-10,o['y']-8,20,24]}
                  for o in state.get('tools',{}).get('planted',{}).values()]
    return nodes


def resource_objects(state,base,now):
    return [{**n,'resource_state':resource_state(state,n,now)} for n in nodes_for(state,base)]


def land_for(state,now):
    from .world import WORLD,HOME_LAND
    # Static terrain and facilities retain their exact geometry; tree trunks
    # and resource anchors are blocked only while that saved resource is solid.
    nodes=resource_objects(state,WORLD,now)
    return {**HOME_LAND,'blocked':HOME_LAND['permanent_blocked']+
            [n['collider'] for n in nodes if n['resource_state']['stage']!='depleted']}


def upgrade_quote(state,key):
    level=state['tools']['levels'][key]
    if level>=len(TIERS)-1:return dict(level=level,next=None,costs={},reasons=['已达到最高等级'])
    costs=TIERS[level+1]['costs']
    from .economy import money
    names={'wood':'木材','stone':'石料',**{k:v['name'] for k,v in MATERIALS.items()}}
    reasons=[('还差'+money(n-state['inventory'].get(k,0)) if k=='gold' else names.get(k,k)+'还差'+str(n-state['inventory'].get(k,0)))
             for k,n in costs.items() if state['inventory'].get(k,0)<n]
    if not state['inventory'].get(key,0):reasons.insert(0,'请把工具带在背包里')
    return dict(level=level,next=level+1,costs=costs,reasons=reasons)


def view(state,now):
    return dict(interval=INTERVAL,water_max=TIERS[state['tools']['levels']['watering_can']]['water'],
                costs={k:stamina_cost(state,k) for k in TOOLS},
                upgrades={k:upgrade_quote(state,k) for k in TOOLS})


def require_tool(state,key):
    from .rules import require
    require(state['inventory'].get(key,0)>0,'请先把'+TOOLS[key]['name']+'放进背包')


def hold(state,item):
    from .rules import require
    from .equipment import WEAPONS,equip
    from .farming import BY_SEED
    require(item is None or isinstance(item,str) and item in [*TOOLS,*BY_SEED,'tree_seed',*WEAPONS],'请选择工具、种子或武器')
    require(item is None or state['inventory'].get(item,0)>0,'背包里没有这件物品')
    require(not state['location'].startswith('cave_') or item in WEAPONS,'洞内请在装备页切换或卸下武器；回到户外再拿起工具或种子')
    if item in WEAPONS:equip(state,item)
    state['tools']['held']=item
    return '已收起手持物品' if item is None else '已拿起'+(tool_name(state,item) if item in TOOLS else '种子' if item in BY_SEED or item=='tree_seed' else WEAPONS[item]['name'])


def command(state,action,data,now):
    from .rules import require,spend,recover_stamina,bump
    from .world import map_for,WORLD,RIVER,LAKE,walkable
    t=state['tools']
    if action=='tool_hold':return hold(state,data.get('item'))
    if action=='tool_upgrade':
        key=data.get('item');require(isinstance(key,str) and key in TOOLS,'请选择有效工具')
        require(state['location']=='workshop' and data.get('target')=='blacksmith','请到工坊找阿焰升级工具')
        require(math.hypot(state['position']['x']-376,state['position']['y']-184)<=72,'请先走近铁匠阿焰')
        q=upgrade_quote(state,key)
        require(type(data.get('expected_level')) is int and data['expected_level']==q['level'],'工具等级已变化，请重新查看报价')
        require(not q['reasons'],'；'.join(q['reasons']))
        spend(state,q['costs']);t['levels'][key]+=1
        return '已升级为'+tool_name(state,key)+'；报价包含冶炼与锻造工钱。'
    require(state['location']=='overworld','请在户外使用工具')
    require(not state.get('ranch',{}).get('mounted'),'请先下马再使用工具')
    if action=='tool_refill':
        require_tool(state,'watering_can')
        x,y=state['position']['x'],state['position']['y']
        require(any(math.hypot(max(rx-x,0,x-rx-w),max(ry-y,0,y-ry-h))<=64 for rx,ry,w,h in RIVER+LAKE),'请走到河湖边补水')
        t['held']='watering_can'
        t['water']=TIERS[t['levels']['watering_can']]['water']
        return '水壶已装满，补水不消耗体力。'
    if action=='tree_plant':
        from .farm_land import cell_at,soil_reason
        land=land_for(state,now);cell=cell_at(land,data.get('x'),data.get('y'))
        require(cell is not None,'请选择家园草地')
        require(math.hypot(state['position']['x']-cell['x'],state['position']['y']-cell['y'])<=72,'请走近种树位置')
        reason=soil_reason(land,cell);require(reason is None,reason)
        require(cell['id'] not in state['farm']['tilled'],'请先用十字镐把空田恢复为草地')
        require(not any(abs(cell['x']-n['x'])<48 and abs(cell['y']-n['y'])<48 and resource_state(state,n,now)['stage']!='depleted' for n in nodes_for(state,WORLD)),'树木之间需要留出一格空地')
        key='sapling_'+cell['id'];old=t['planted'].get(key)
        require(old is None or resource_state(state,{**old,'resource':'tree','home':True,'planted':True},now)['stage']=='depleted','这里已经种树')
        spend(state,{'tree_seed':1})
        t['held']='tree_seed'
        t['planted'][key]=dict(id=key,x=cell['x'],y=cell['y'],ready_tick=clock_elapsed(state,now)+3*DAY_SECONDS)
        t['resources'][key]=dict(stage='sapling',work=0,version=(t['resources'].get(key,{}).get('version',0)+1),ready_tick=clock_elapsed(state,now)+3*DAY_SECONDS)
        reconcile_held(state)
        return '种下一棵橡树，3个游戏日后长成；离线暂停。'
    require(action=='tool_strike','未知工具操作')
    node=next((n for n in resource_objects(state,WORLD,now) if n['id']==data.get('target')),None)
    require(node is not None,'这处资源不存在')
    spec=RESOURCES[node['resource']];key=spec['tool'];value=node['resource_state']
    require_tool(state,key)
    require(t['held']==key,'请先拿起'+TOOLS[key]['name'])
    require(value['stage'] not in ['depleted','sapling'],'这处资源已耗尽或尚在生长')
    require(math.hypot(state['position']['x']-node['x'],state['position']['y']-node['y'])<=72,'请先走近这处资源')
    require(t['levels'][key]>=spec['level'],'需要'+TIERS[spec['level']]['name']+TOOLS[key]['name'])
    require(type(data.get('expected_version')) is int and data['expected_version']==value['version'],'资源状态已变化，请重新挥动')
    require(now+1e-7>=t['next_at'],'请等待本次工具动作结束')
    recover_stamina(state,now);cost=stamina_cost(state,key)
    require(state['stamina']['current']>=cost,f'体力不足，需要{cost}点；回家睡觉可以补满')
    state['stamina']['current']-=cost
    work=value['work']+TIERS[t['levels'][key]]['power']
    saved={k:v for k,v in value.items() if k not in ['total','solid']}
    saved.update(work=work,version=value['version']+1)
    drops={}
    if work>=value['total']:
        saved['work']=0
        if node['resource']=='tree' and value['stage']=='tree':
            saved['stage']='stump';drops=spec['drops']
        else:
            saved['stage']='depleted';drops={'wood':2} if node['resource']=='tree' else spec['drops']
            saved['ready_tick']=clock_elapsed(state,now)+(2 if node['resource']=='tree' else spec['days'])*DAY_SECONDS
        for item,n in drops.items():state['inventory'][item]+=n;bump(state,item,n)
        if 'first_gather' not in state['events']:state['events'].append('first_gather')
    t['resources'][node['id']]=saved;t['next_at']=now+INTERVAL;t['sequence']+=1
    t['action']=dict(kind=key,target=node['id'],x=node['x'],y=node['y'],started=now,until=now+INTERVAL,sequence=t['sequence'],drops=drops,stage=saved['stage'])
    names={'wood':'木材','stone':'石料',**{k:v['name'] for k,v in MATERIALS.items()}}
    return ('获得'+ '、'.join(names[k]+f'×{v}' for k,v in drops.items()) if drops else f'{node["name"]} · {min(work,value["total"])}/{value["total"]}')+f' · 体力−{cost}'
