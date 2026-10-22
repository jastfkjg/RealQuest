import copy
import uuid
import pytest
from test_game import fresh,client,create,cmd
from app.rules import apply,upgrade_state,RuleError
from app.farming import CROPS,capacity,progress
from app.world import WORLD,FARM_CELLS,map_for,walkable
from app.daynight import ensure_clock,DAY_SECONDS
from app.db import Session
from app.models import Player
from sqlalchemy import select

def farm_state():
 s=fresh();s['position']={'x':136,'y':440};s['world_clock'].update(elapsed=0,updated_at=100,running_until=0);s['inventory'].update(gold=1000,wood=100,stone=100);return s

def test_all_seeds_purchasable_at_level_zero_but_sowing_is_gated():
 for c in CROPS:
  s=farm_state();s.update(location='shop',position={'x':240,'y':188});before=s['inventory']['gold'];apply(s,'market_trade',{'target':'shop_counter','side':'buy','item':c['seed'],'amount':1},100);assert s['inventory'][c['seed']]>=1 and s['inventory']['gold']==before-c['buy']
  s.update(location='overworld',position={'x':136,'y':440});before=copy.deepcopy(s)
  if c['level']:
   with pytest.raises(RuleError,match='种植'):apply(s,'plant',{'target':'plot_0','seed':c['seed']},100)
   assert s==before
  s['skill_growth']['planting']=c['level'];apply(s,'plant',{'target':'plot_0','seed':c['seed']},100);assert s['plots']['plot_0']['crop_id']==c['id']

def test_each_crop_full_yield_regrowth_and_sale_cycle():
 for c in CROPS:
  s=farm_state();s['skill_growth']['planting']=c['level'];s['inventory'][c['seed']]=1;apply(s,'plant',{'target':'plot_0','seed':c['seed']},100)
  for turn in range(c['harvests']):
   p=s['plots']['plot_0'];s['world_clock']['elapsed']=p['ready_tick'];s['world_clock']['running_until']=0;apply(s,'harvest',{'target':'plot_0'},100)
   assert s['inventory'][c['item']]==c['yield']*(turn+1)
   assert ('plot_0' in s['plots'])==(turn+1<c['harvests'])
  assert s['inventory'][c['seed']]==0
  s.update(location='shop',position={'x':240,'y':188});gold=s['inventory']['gold'];apply(s,'market_trade',{'target':'shop_counter','side':'sell','item':c['item'],'amount':c['yield']*c['harvests']},100)
  assert s['inventory'][c['item']]==0 and s['inventory']['gold']==gold+c['sell']*c['yield']*c['harvests']

def test_clock_pause_sleep_water_and_legacy_progress():
 s=farm_state();apply(s,'plant',{'target':'plot_0'},100);p=s['plots']['plot_0'];assert progress(s,p,100000)==0
 before=p['ready_tick'];apply(s,'water',{'target':'plot_0'},100);assert s['plots']['plot_0']['ready_tick']==before*.9
 old=copy.deepcopy(s)
 with pytest.raises(RuleError):apply(s,'water',{'target':'plot_0'},100)
 assert s==old
 s.update(location='home',position={'x':336,'y':112});apply(s,'rest',{'target':'home_bed','kind':'sleep','world_day':1,'expected_day':1},100);assert progress(s,s['plots']['plot_0'],100)==1
 legacy=farm_state();legacy['plots']['plot_0']={'planted_at':100,'ready_at':160};legacy.pop('farm');s=upgrade_state(legacy);apply(s,'harvest',{'target':'plot_0'},160);assert s['inventory']['crop']==2 and s['inventory']['seed']==7

def test_free_tilling_persistence_capacity_reclaim_and_geometry():
 assert len(FARM_CELLS)>=36
 for cell in FARM_CELLS:
  assert walkable(cell['x'],cell['y'])
  s=farm_state();s['position']={'x':cell['x'],'y':cell['y']};gold=s['inventory']['gold'];apply(s,'till',{'target':cell['id']},100);assert cell['id'] in s['farm']['tilled'];assert s['inventory']['gold']==gold-4
  restored=upgrade_state(s);assert next(o for o in map_for('overworld',restored,100)['objects'] if o['id']==cell['id'])['kind']=='plot'
  apply(s,'plant',{'target':cell['id']},100)
  with pytest.raises(RuleError):apply(s,'reclaim',{'target':cell['id']},100)
  s['world_clock']['elapsed']=s['plots'][cell['id']]['ready_tick'];apply(s,'harvest',{'target':cell['id']},100);apply(s,'reclaim',{'target':cell['id']},100);assert cell['id'] not in s['farm']['tilled']
 s=farm_state();s['farm']['tilled']+=[o['id'] for o in FARM_CELLS[:12]];cell=FARM_CELLS[12];s['position']={'x':cell['x'],'y':cell['y']};before=copy.deepcopy(s)
 with pytest.raises(RuleError,match='上限'):apply(s,'till',{'target':cell['id']},100)
 assert s==before;s['buildings']['home']=2;assert capacity(s)==30;apply(s,'till',{'target':cell['id']},100)

@pytest.mark.parametrize('action,data',[('plant',{'seed':[]}),('plant',{'seed':'unknown'}),('water',{}),('harvest',{}),('till',{}),('reclaim',{})])
def test_rejections_do_not_consume_resources(action,data):
 s=farm_state()
 if action=='reclaim':s['stamina']['current']=0
 before=copy.deepcopy(s)
 with pytest.raises(RuleError):apply(s,action,{'target':'plot_0',**data},100)
 assert s==before

def test_receipt_retry_harvest_and_till_are_exactly_once(client):
 create(client)
 with Session() as db:
  p=db.scalar(select(Player));s=upgrade_state(p.state);cell=FARM_CELLS[0];s['position']={'x':cell['x'],'y':cell['y']};s['inventory'].update(gold=100,wood=10,stone=10);p.state=s;db.commit()
 body={'action':'till','data':{'target':cell['id']},'request_id':str(uuid.uuid4())};a=client.post('/api/command',json=body);assert a.status_code==200;b=client.post('/api/command',json=body);assert b.json()['state']==a.json()['state'] and b.json()['replayed'];assert a.json()['state']['inventory']['gold']==96
 body={'action':'plant','data':{'target':cell['id'],'seed':'seed'},'request_id':str(uuid.uuid4())};a=client.post('/api/command',json=body);assert a.status_code==200;assert client.post('/api/command',json=body).json()['state']==a.json()['state']
 with Session() as db:
  p=db.scalar(select(Player));s=copy.deepcopy(p.state);s['world_clock']['elapsed']=s['plots'][cell['id']]['ready_tick'];s['world_clock']['running_until']=0;p.state=s;db.commit()
 body={'action':'harvest','data':{'target':cell['id']},'request_id':str(uuid.uuid4())};a=client.post('/api/command',json=body);assert a.status_code==200;assert client.post('/api/command',json=body).json()['state']==a.json()['state'];assert a.json()['state']['inventory']['crop']==2

def test_competing_requests_cannot_till_or_harvest_twice(client):
 from concurrent.futures import ThreadPoolExecutor
 from fastapi.testclient import TestClient
 from app.main import app
 create(client)
 with Session() as db:
  player=db.scalar(select(Player));s=upgrade_state(player.state);cell=FARM_CELLS[0];s['position']={'x':cell['x'],'y':cell['y']};s['inventory'].update(gold=100,wood=10,stone=10);player.state=s;db.commit()
 cookies=dict(client.cookies)
 def request(action):
  with TestClient(app) as connection:
   connection.cookies.update(cookies)
   return connection.post('/api/command',json={'action':action,'data':{'target':cell['id']},'request_id':str(uuid.uuid4())}).status_code
 with ThreadPoolExecutor(max_workers=2) as pool:assert sorted(pool.map(request,['till','till']))==[200,422]
 with Session() as db:
  player=db.scalar(select(Player));s=copy.deepcopy(player.state);assert s['inventory']['gold']==96;s['plots'][cell['id']]={'planted_at':1,'ready_at':2};player.state=s;db.commit()
 with ThreadPoolExecutor(max_workers=2) as pool:assert sorted(pool.map(request,['harvest','harvest']))==[200,422]
 with Session() as db:
  player=db.scalar(select(Player));assert player.state['inventory']['crop']==2
