"""Authoritative geography shared with the Phaser renderer."""
from math import hypot

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
WORLD = {'id':'overworld','name':'回响大陆','width':1920,'height':1280,'tile':16,'objects':OBJECTS,'trees':TREES,'obstacles':OBSTACLES,'regions':REGIONS,'interiors':INTERIORS}

def map_for(location='overworld', state=None, now=None):
    base = WORLD if location == 'overworld' else INTERIORS[location]
    if state is None or now is None:
        return base
    from .residents import resident_objects
    return {**base, 'objects': [o for o in base['objects'] if o['kind'] != 'npc'] + resident_objects(state, now, location)}

def walkable(x,y,location='overworld'):
    world=map_for(location)
    return 24 <= x <= world['width']-24 and 32 <= y <= world['height']-24 and not any(rx-9 < x < rx+w+9 and ry-7 < y < ry+h+7 for rx,ry,w,h in world['obstacles'])

def clear_path(a,b,location='overworld'):
    steps=max(1,int(hypot(b['x']-a['x'],b['y']-a['y'])/4))
    return all(walkable(a['x']+(b['x']-a['x'])*i/steps,a['y']+(b['y']-a['y'])*i/steps,location) for i in range(1,steps+1))
