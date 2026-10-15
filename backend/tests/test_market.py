import copy
from datetime import datetime
from zoneinfo import ZoneInfo
from concurrent.futures import ThreadPoolExecutor
import uuid
import pytest
from test_game import client, cmd, create, fresh
from app.rules import apply, upgrade_state, RuleError
from app.market import market_view
from app.world import walkable
from app.quests import quest_views
from app.db import Session
from app.models import Player
from app.main import app
from fastapi.testclient import TestClient
from sqlalchemy import select

NOW = datetime(2026, 10, 15, 23, 59, tzinfo=ZoneInfo('Asia/Shanghai')).timestamp()

def shop_state():
    s = fresh()
    s.update(location='shop', position={'x':240,'y':240})
    s['inventory'].update(wood=12, stone=8, crop=8, plank=2)
    return s

def test_additive_migration_relocates_only_obstructed_legacy_position():
    s = fresh(); s['save_version'] = 2; s['position'] = {'x':800,'y':600}
    s.pop('market_orders'); s['relationships'].pop('mira')
    before = copy.deepcopy(s)
    updated = upgrade_state(s)
    assert s == before and updated['inventory'] == before['inventory']
    assert walkable(**updated['position'])
    assert abs(updated['position']['x'] - 800) < 150
    assert updated['relationships']['mira'] == 0 and updated['market_orders'] == {}
    assert upgrade_state(updated) == updated
    s['position'] = {'x':240,'y':320}
    assert upgrade_state(s)['position'] == s['position']

def test_prices_quantities_and_crop_story_progress():
    s = shop_state(); s['buildings']['workshop'] = 3
    apply(s,'market_trade',{'target':'mira','side':'sell','item':'crop','amount':5,'price':999},NOW)
    assert s['inventory']['gold'] == 70 and s['inventory']['crop'] == 3
    assert s['stats']['sold'] == 5 and s['stats']['market_sold'] == 5
    apply(s,'market_trade',{'target':'mira','side':'buy','item':'seed','amount':5},NOW)
    assert s['inventory']['gold'] == 60 and s['inventory']['seed'] == 11

@pytest.mark.parametrize('data', [
    {'side':'sell','item':'gold','amount':1}, {'side':'buy','item':'wood','amount':1},
    {'side':'sell','item':'crop','amount':0}, {'side':'sell','item':'crop','amount':True},
    {'side':'sell','item':'crop','amount':1.2}, {'side':'sell','item':'crop','amount':99},
    {'side':'buy','item':'seed','amount':99}, {'side':[], 'item':'crop','amount':1},
    {'side':'sell','item':[], 'amount':1},
])
def test_invalid_trade_has_no_mutation(data):
    s = shop_state(); before = copy.deepcopy(s)
    with pytest.raises(RuleError): apply(s,'market_trade',{'target':'mira',**data},NOW)
    assert s == before

def test_remote_trade_rejected():
    for location, pos in [('overworld',{'x':832,'y':688}), ('shop',{'x':240,'y':328})]:
        s=shop_state(); s.update(location=location,position=pos); before=copy.deepcopy(s)
        with pytest.raises(RuleError): apply(s,'market_trade',{'target':'mira','side':'buy','item':'seed'},NOW)
        assert s == before

def test_orders_reset_at_china_midnight_without_duplicate_reward():
    s=shop_state(); day=market_view(s,NOW)['date']
    apply(s,'market_deliver',{'target':'mira','date':day,'order_id':'timber'},NOW)
    assert s['inventory']['wood']==6 and s['inventory']['gold']==38
    before=copy.deepcopy(s)
    with pytest.raises(RuleError): apply(s,'market_deliver',{'target':'mira','date':day,'order_id':'timber'},NOW+1)
    assert s==before
    with pytest.raises(RuleError): apply(s,'market_deliver',{'target':'mira','date':day,'order_id':'masonry'},NOW+61)
    assert s==before
    tomorrow=market_view(s,NOW+61)
    assert tomorrow['date']=='2026-10-16' and not any(o['completed'] for o in tomorrow['orders'])
    apply(s,'market_deliver',{'target':'mira','date':tomorrow['date'],'order_id':'timber'},NOW+61)
    assert s['inventory']['wood']==0 and s['inventory']['gold']==56 and s['stats']['deliveries']==2

def test_insufficient_delivery_and_invalid_order_do_not_consume():
    s=shop_state(); s['inventory']['wood']=5; before=copy.deepcopy(s)
    for order in ['timber','missing',[]]:
        with pytest.raises(RuleError): apply(s,'market_deliver',{'target':'mira','date':market_view(s,NOW)['date'],'order_id':order},NOW)
        assert s==before

def test_story_chain_requires_home_goal_and_rewards_once():
    s=shop_state(); s['events'].append('visited_shop')
    apply(s,'quest_accept',{'quest_id':'market_neighbor'},NOW)
    apply(s,'market_trade',{'target':'mira','side':'sell','item':'plank'},NOW)
    apply(s,'quest_claim',{'quest_id':'market_neighbor'},NOW)
    gold=s['inventory']['gold']
    with pytest.raises(RuleError): apply(s,'quest_claim',{'quest_id':'market_neighbor'},NOW)
    assert s['inventory']['gold']==gold
    apply(s,'quest_accept',{'quest_id':'village_supplier'},NOW)
    for order in market_view(s,NOW)['orders']:
        apply(s,'market_deliver',{'target':'mira','date':market_view(s,NOW)['date'],'order_id':order['id']},NOW)
    assert next(q for q in quest_views(s) if q['id']=='village_supplier')['status']=='active'
    s['buildings']['home']=2
    apply(s,'quest_claim',{'quest_id':'village_supplier'},NOW)
    assert next(q for q in quest_views(s) if q['id']=='village_supplier')['status']=='claimed'

def test_api_replays_and_concurrent_delivery_have_one_reward(client):
    create(client)
    with Session.begin() as db:
        p=db.scalar(select(Player)); s=upgrade_state(p.state)
        s.update(location='shop',position={'x':240,'y':240});s['inventory']['wood']=12;p.state=s
    key=str(uuid.uuid4()); data={'target':'mira','side':'sell','item':'wood','amount':1}
    first=cmd(client,'market_trade',data,key).json()
    replay=cmd(client,'market_trade',data,key).json()
    assert replay['replayed'] and first['state']['inventory']==replay['state']['inventory']
    day=replay['state']['market']['date'];cookies=dict(client.cookies)
    def deliver(_):
        with TestClient(app) as other:
            other.cookies.update(cookies)
            return cmd(other,'market_deliver',{'target':'mira','date':day,'order_id':'timber'}).status_code
    with ThreadPoolExecutor(max_workers=2) as pool: statuses=list(pool.map(deliver,range(2)))
    assert sorted(statuses)==[200,422]
    state=client.get('/api/state').json()['state']
    assert state['inventory']['wood']==5 and state['inventory']['gold']==40
    assert state['stats']['deliveries']==1
