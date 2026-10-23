"""Authoritative geography used by the Cocos client and offline art tools."""
from math import hypot
import json
from pathlib import Path
from .farm_land import cell_by_id
from .journey_world import AREAS, TRAVEL_NPCS, passage
from .combat_world import CAVE_MAPS, CAVE_ENTRY

AREAS.update(CAVE_MAPS)

OBJECTS = [
    {'id': 'home', 'kind': 'building', 'name': '林间小屋', 'x': 160, 'y': 232, 'rect': [96, 128, 128, 80]},
    {'id': 'workshop', 'kind': 'building', 'name': '木作工坊', 'x': 352, 'y': 232, 'rect': [292, 136, 120, 72]},
    {'id': 'library', 'kind': 'building', 'name': '回响图书馆', 'x': 704, 'y': 232, 'rect': [632, 112, 144, 96]},
    {'id': 'guild', 'kind': 'building', 'name': '旅人公会', 'x': 1088, 'y': 552, 'rect': [1008, 408, 160, 112]},
    {'id': 'shop', 'kind': 'building', 'name': '风铃杂货铺', 'x': 832, 'y': 688, 'rect': [768, 568, 128, 96]},
    {'id': 'board', 'kind': 'board', 'name': '村庄告示板', 'x': 256, 'y': 272},
    {'id': 'lia', 'kind': 'npc', 'name': '莉亚', 'x': 624, 'y': 272},
    {'id': 'noah', 'kind': 'npc', 'name': '诺亚', 'x': 576, 'y': 384},
    {'id': 'wood_1', 'kind': 'wood', 'name': '落枝', 'x': 328, 'y': 352},
    {'id': 'wood_2', 'kind': 'wood', 'name': '落枝', 'x': 680, 'y': 432},
    {'id': 'wood_3', 'kind': 'wood', 'name': '落枝', 'x': 824, 'y': 328},
    {'id': 'stone_1', 'kind': 'stone', 'name': '矿石', 'x': 376, 'y': 432},
    {'id': 'stone_2', 'kind': 'stone', 'name': '矿石', 'x': 744, 'y': 512},
    {'id': 'ruins', 'kind': 'event', 'name': '沉睡的符文', 'x': 848, 'y': 160},
    {'id': 'grove', 'kind': 'landmark', 'name': '微光林地', 'x': 1584, 'y': 352},
    {'id': 'lake', 'kind': 'landmark', 'name': '风铃湖', 'x': 1104, 'y': 1008},
    {'id': 'quarry', 'kind': 'landmark', 'name': '旧采石场', 'x': 304, 'y': 1008},
    {'id': 'forest_cache', 'kind': 'chest', 'name': '旅人留下的木箱', 'x': 1744, 'y': 432},
    {'id': 'south_cache', 'kind': 'chest', 'name': '湖畔补给箱', 'x': 1408, 'y': 1104},
] + [{'id': f'plot_{i}', 'kind': 'plot', 'name': '田地', 'x': 136 + i % 3 * 48, 'y': 440 + i // 3 * 48} for i in range(6)] + [
    {'id': f'wood_{i+4}', 'kind': 'wood', 'name': '林间落枝', 'x': x, 'y': y}
    for i, (x,y) in enumerate([(1280,352),(1456,432),(1584,560),(1760,640),(848,800),(576,976)])
] + [
    {'id': f'stone_{i+3}', 'kind': 'stone', 'name': '石料', 'x': x, 'y': y}
    for i, (x,y) in enumerate([(1376,512),(1664,304),(176,896),(352,944),(256,1088),(848,1056)])
]
TREES = [(48,72),(208,56),(272,80),(384,64),(560,64),(800,64),(896,72),(912,256),(832,248),(720,608),(608,472),(888,408),(808,432),(856,528),(616,552),(680,592),(912,592),(64,304),(72,368),(56,552),(304,568),(384,552)]
# Deliberately leave the main paths and resource interaction points clear.
for row in range(6):
    for col in range(10):
        x, y = 992 + col*88 + (row%2)*16, 72 + row*112
        if 290 <= y <= 392 or (976 < x < 1216 and 368 < y < 584):
            continue
        if any(hypot(x-o['x'],y-o['y']) < 66 for o in OBJECTS):
            continue
        TREES.append((x,y))
TREES += [(48,720),(144,704),(344,736),(384,816),(64,1120),(176,1200),(384,1216),(576,736),(664,752),(752,704),(896,816),(1008,736),(1184,704),(1312,752),(1512,800),(1648,768),(1840,864),(1568,1120),(1728,1040),(1808,1192),(640,1152),(784,1216),(912,1152)]
RIVER = [[448,0,64,320],[448,384,64,488],[448,936,64,344]]
LAKE = [[1184,864,224,176],[1232,816,128,48],[1232,1040,128,32]]
OBSTACLES = [o['rect'] for o in OBJECTS if 'rect' in o] + [[x-10,y-8,20,24] for x,y in TREES] + RIVER + LAKE
REGIONS = [
    {'id':'home','name':'向阳家园','subtitle':'一方土地，一段新生活','x':0,'y':0,'width':448,'height':680},
    {'id':'village','name':'回响村庄','subtitle':'和每一位旅人打个招呼','x':512,'y':0,'width':720,'height':680},
    {'id':'grove','name':'微光林地','subtitle':'沿着风，去更远的地方','x':1232,'y':0,'width':688,'height':760},
    {'id':'quarry','name':'旧采石场','subtitle':'石缝里，也有新的生机','x':0,'y':680,'width':448,'height':600},
    {'id':'lake','name':'风铃湖畔','subtitle':'慢慢走，总会遇见新的风景','x':512,'y':680,'width':1408,'height':600},
]

def interior(key, name, objects, furniture):
    return {'id':key,'name':name,'width':480,'height':368,'tile':16,'spawn':{'x':240,'y':294},'objects':[{'id':f'{key}_exit','kind':'exit','name':'回到户外','x':240,'y':328}]+objects,'furniture':furniture,'trees':[], 'obstacles':[[0,0,480,64],[0,64,48,304],[432,64,48,304],[0,344,480,24]]+[f['rect'] for f in furniture if f.get('solid',True)]}

INTERIORS = {
    'shop': interior('shop','风铃杂货铺',[
        {'id':'mira','kind':'npc','name':'米拉 · 杂货铺店主','x':240,'y':188},
        {'id':'shop_counter','kind':'market','name':'寄售柜台 · 买卖与订单','x':240,'y':188},
    ],[{'kind':'workbench','rect':[136,112,208,40]},{'kind':'shelf','rect':[64,64,112,40]},{'kind':'shelf','rect':[296,64,112,40]},{'kind':'barrel','rect':[64,216,32,40]},{'kind':'chest','rect':[352,216,48,28]},{'kind':'plant','rect':[64,288,24,28]},{'kind':'rug','rect':[176,240,128,64],'solid':False}]),
    'home': interior('home','林间小屋',[
        {'id':'home_chest','kind':'storage','name':'家园储物箱','x':360,'y':192,'hitbox':[336,160,48,32]},
        {'id':'home_desk','kind':'station','building':'home','name':'家园手册 · 升级','x':96,'y':152,'hitbox':[80,136,28,40]},
        {'id':'home_reading','kind':'study','name':'窗边阅读角','x':144,'y':200,'hitbox':[110,130,66,48]},
        {'id':'home_bed','kind':'rest','name':'柔软的床 · 休息','x':336,'y':112,'hitbox':[304,72,72,80]},
    ],[{'kind':'bed','rect':[304,72,72,80]},{'kind':'desk','rect':[80,136,96,40]},{'kind':'chest','rect':[336,160,48,28]},{'kind':'fireplace','rect':[200,64,72,32]},{'kind':'plant','rect':[64,72,24,28]},{'kind':'rug','rect':[168,208,144,64],'solid':False}]),
    'workshop': interior('workshop','木作工坊',[
        {'id':'workshop_counter','kind':'station','building':'workshop','name':'工坊柜台 · 交易与制作','x':240,'y':196},
    ],[{'kind':'workbench','rect':[136,120,208,40]},{'kind':'shelf','rect':[64,64,112,40]},{'kind':'shelf','rect':[296,64,112,40]},{'kind':'barrel','rect':[64,224,32,40]},{'kind':'anvil','rect':[352,224,48,32]},{'kind':'rug','rect':[176,224,128,48],'solid':False}]),
    'library': interior('library','回响图书馆',[
        {'id':'library_desk','kind':'station','building':'library','name':'阅读桌 · 图书馆研究','x':240,'y':232},
    ],[{'kind':'books','rect':[64,64,112,48]},{'kind':'books','rect':[184,64,112,48]},{'kind':'books','rect':[304,64,112,48]},{'kind':'desk','rect':[192,168,96,40]},{'kind':'plant','rect':[64,256,24,28]},{'kind':'rug','rect':[144,232,192,56],'solid':False}]),
    'guild': interior('guild','旅人公会',[
        {'id':'guild_board','kind':'board','name':'公会委托台','x':240,'y':184},
    ],[{'kind':'notice','rect':[168,72,144,64]},{'kind':'desk','rect':[72,216,88,40]},{'kind':'chest','rect':[352,88,48,28]},{'kind':'rug','rect':[192,224,96,80],'solid':False}]),
}
INTERIORS['inn'] = interior('inn','灯穗旅店',[
    *[n for n in TRAVEL_NPCS if n['location']=='inn'],
    {'id':'inn_bed','kind':'rest','name':'客房床铺 · 付费住宿','x':336,'y':112},
],[{'kind':'bed','rect':[304,72,72,80]},{'kind':'desk','rect':[96,128,96,40]},
   {'kind':'fireplace','rect':[208,64,72,32]},{'kind':'plant','rect':[64,80,24,28]},
   {'kind':'rug','rect':[176,240,128,64],'solid':False}])
INTERIORS['inn']['objects'][0] = passage('inn_exit','返回南门街',240,328,'city')
OBJECTS.append(passage('village_departure','东行路牌 · 苇风渡口',1816,352,'crossing'))
OBJECTS.append(CAVE_ENTRY)
INTERIORS['workshop']['objects'].append({'id':'armory_counter','kind':'armory','name':'武备台 · 购买与打造','x':376,'y':280,'hitbox':[352,224,48,32]})
INTERIORS['library']['objects'].append({'id':'spell_desk','kind':'spellbook','name':'术式研习 · 火花术','x':112,'y':232})
# Farmable home lawn; the original six plot IDs and all landmarks stay stable.
FARM_CELLS = []
for row in range(9):
    for col in range(7):
        x,y=88+col*48,440+row*48
        if col in (1,2,3) and row in (0,1): continue
        if 116 <= x <= 160 and y <= 600: continue
        if any(x+23>rx and x-23<rx+w and y+23>ry and y-23<ry+h for rx,ry,w,h in OBSTACLES): continue
        if any(hypot(x-o['x'],y-o['y'])<42 for o in OBJECTS if o['kind']!='plot'): continue
        FARM_CELLS.append({'id':f'farm_{col}_{row}','kind':'soil','name':'可开垦土地','x':x,'y':y})
# Historical IDs only: new grass is resolved from coordinates, not this list.
ROADS = json.loads(Path(__file__).with_name('village_terrain.json').read_text())['roads']
HOME_LAND = {'bounds':[0,0,448,680],'origin':[88,440],'step':48,
             'legacy':[o for o in OBJECTS if o['kind']=='plot']+FARM_CELLS,
             'roads':ROADS,
             'blocked':OBSTACLES + [[o['x']-24,o['y']-24,48,48] for o in OBJECTS if o['kind'] not in ['plot','building']] +
                       [[389,211,32,24],[366,286,32,20],[64,202,32,20],[206,204,32,20],[72,270,32,20],[332,382,32,20]]}
WORLD = {'id':'overworld','name':'回响大陆','width':1920,'height':1280,'tile':16,'objects':OBJECTS,'trees':TREES,'obstacles':OBSTACLES,'regions':REGIONS,'interiors':INTERIORS,'areas':AREAS,'travel_npcs':TRAVEL_NPCS,'roads':ROADS,'cultivation':HOME_LAND}

# A connected home paddock leaves every existing field and saved crop intact.
from .ranching import SHELTERS
OBJECTS.append({'id':'pasture_gate','kind':'ranch_gate','name':'家园牧场入口','x':400,'y':600,'destination':'pasture'})
# Reserve new soil around the gate while leaving all previously tilled IDs and
# planted crops intact. HOME_LAND was built before this connected area existed.
HOME_LAND['blocked'].append([376,576,48,48])
AREAS['pasture'] = {'id':'pasture','name':'向阳牧场','width':896,'height':544,'tile':16,'outdoor':True,
    'objects':[
        {'id':'pasture_exit','kind':'ranch_exit','name':'回到家园','x':448,'y':496,'destination':'overworld'},
        {'id':'ranch_ledger','kind':'ranch_ledger','name':'牧场采购簿 · 米拉代订','x':448,'y':440},
        *[{'id':'shelter_'+key,'kind':'shelter','name':s['name']+' · 建造与照料','x':s['x'],'y':s['y']} for key,s in SHELTERS.items()]],
    'trees':[[40,72],[856,72],[40,392],[856,392]],
    'obstacles':[[s['x']-s['width']/2,s['y']-s['height'],s['width'],s['height']-24] for s in SHELTERS.values()]}

def map_for(location='overworld', state=None, now=None):
    base = WORLD if location == 'overworld' else (AREAS[location] if location in AREAS else INTERIORS[location])
    if state is None or now is None:
        return base
    from .residents import resident_objects
    tilled=set(state.get('farm',{}).get('tilled',[f'plot_{i}' for i in range(6)]))
    objects=[o for o in base['objects'] if o['kind'] not in ['npc','plot','soil']]
    if location=='overworld':
        objects += [{**cell,'kind':'plot','name':'田地'} for key in tilled if (cell:=cell_by_id(HOME_LAND,key))]
    if location=='pasture' and 'ranch' in state:
        from .ranching import ranch_objects
        objects += ranch_objects(state)
    obstacles = list(base['obstacles'])
    from .construction import chest_objects, CARPENTER
    if location == 'home':
        boxes = chest_objects(state)
        objects += boxes
        obstacles += [o['hitbox'] for o in boxes]
    if location == 'workshop':
        objects.append(CARPENTER)
    return {**base, 'objects': objects + resident_objects(state, now, location), 'obstacles': obstacles}

def walkable(x,y,location='overworld',state=None,now=None):
    world=map_for(location,state,now)
    return 24 <= x <= world['width']-24 and 32 <= y <= world['height']-24 and not any(rx-9 < x < rx+w+9 and ry-7 < y < ry+h+7 for rx,ry,w,h in world['obstacles'])

def clear_path(a,b,location='overworld',state=None,now=None):
    steps=max(1,int(hypot(b['x']-a['x'],b['y']-a['y'])/4))
    return all(walkable(a['x']+(b['x']-a['x'])*i/steps,a['y']+(b['y']-a['y'])*i/steps,location,state,now) for i in range(1,steps+1))
