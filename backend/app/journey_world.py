"""Additive geography beyond the original village; no old river crossing is moved."""
TRAVEL_NPCS = [
    {'id':'adu','name':'阿渡','kind':'travel_npc','role':'渡口船夫','location':'crossing','x':352,'y':320,'activity':'守着渡船，替旅人准备绳索','walking':False,'phase':0},
    {'id':'lanya','name':'岚姨','kind':'travel_npc','role':'灯穗旅店主人','location':'inn','x':176,'y':200,'activity':'收信、备餐，也为旅人留一盏灯','walking':False,'phase':0},
]

def passage(id, name, x, y, destination):
    return {'id':id,'name':name,'kind':'passage','x':x,'y':y,'destination':destination}

def outdoor(id, name, width, height, objects, obstacles, trees):
    return {'id':id,'name':name,'outdoor':True,'width':width,'height':height,'tile':16,
            'objects':objects,'obstacles':obstacles + [[x-10,y-8,20,24] for x,y in trees], 'trees':trees}

AREAS = {
    'crossing': outdoor('crossing','苇风渡口',800,560,[
        passage('to_village','林间归路 · 回响村庄',96,400,'overworld'),
        passage('river_bridge','旧桥桥头 · 修桥或过桥',424,240,'mountain'),
        *[n for n in TRAVEL_NPCS if n['location']=='crossing'],
        {'id':'crossing_camp','kind':'travel','name':'渡口长椅 · 小憩','x':224,'y':352},
    ],[[472,0,144,560],[48,96,160,88]],[(72,64),(232,72),(360,64),(424,88),(712,72),(728,200),(712,392),(640,464),(56,480),(336,480)]),
    'mountain': outdoor('mountain','苍脊山道',880,600,[
        passage('to_crossing','河岸下行道 · 返回渡口',96,472,'crossing'),
        passage('mountain_pass','苍脊山口 · 翻山进城',736,184,'city'),
        {'id':'mountain_camp','kind':'travel','name':'山间营地 · 准备行装','x':240,'y':416},
    ],[[0,0,880,96],[328,208,224,96],[448,400,288,112],[32,128,112,128]],[(64,352),(176,112),(288,144),(592,112),(800,80),(808,480),(360,520),(56,552)]),
    'city': outdoor('city','苔桥城 · 南门街',800,600,[
        passage('to_mountain','南城门 · 翻山返乡',128,480,'mountain'),
        passage('to_inn','灯穗旅店 · 进门',352,240,'inn'),
        {'id':'city_armory','kind':'armory','name':'精密工坊 · 武备与图纸','x':520,'y':320},
        {'id':'city_supplies','kind':'travel','name':'行旅补给台 · 绳索与热食','x':608,'y':344},
        {'id':'city_notice','kind':'travel','name':'南门告示 · 城市消息','x':480,'y':440},
    ],[[256,112,192,96],[544,160,144,112],[0,0,800,72],[0,72,48,528],[752,72,48,528]],[(96,120),(176,176),(680,480),(672,96)]),
}
