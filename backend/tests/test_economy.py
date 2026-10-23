"""Money boundaries, one-time noncash aid and saved contracts, using real commands."""
import copy
import uuid
import pytest
from sqlalchemy import select
from test_game import client, cmd, create
from test_quest_chain import player, farm_and_home, ranch, at, board, NOW
from app.rules import apply, upgrade_state, RuleError
from app.economy import money
from app.quests import definition_for
from app.ranching import ranch_view, ANIMALS, PRODUCTS, SHELTERS, FEED_PRICE
from app.farming import CROPS
from app.db import Session
from app.models import Player

@pytest.mark.parametrize('value,display', [(0,'0银'),(99,'99银'),(100,'1金'),(101,'1金 1银'),(245,'2金 45银'),(100000,'1,000金')])
def test_denominations_are_only_a_display(value, display):
    assert money(value) == display


def test_non_cash_startup_aid_keeps_early_weapon_affordable_and_cannot_repeat():
    s=player();farm_and_home(s)
    assert s['inventory']['gold']==24  # 20 + 10 + 16 - 30 + 8
    view=ranch_view(s,NOW)
    assert view['buildings']['coop']['next_costs']=={}
    assert next(a for a in view['catalog']['animals'] if a['id']=='chicken')['price']==0
    assert ANIMALS['chicken']['price']==60 and SHELTERS['coop']['costs'][0]['gold']==80
    ranch(s)
    assert s['inventory']['gold']==36
    view=ranch_view(s,NOW)
    assert view['buildings']['coop']['next_costs']['gold']==240
    assert next(a for a in view['catalog']['animals'] if a['id']=='chicken')['price']==60
    at(s,'pasture','ranch_ledger');before=copy.deepcopy(s)
    with pytest.raises(RuleError):apply(s,'ranch_buy',{'target':'ranch_ledger','species':'chicken','expected_next':2},NOW)
    assert s==before
    at(s,'workshop','armory_counter');apply(s,'gear_buy',{'target':'armory_counter','item':'stone_sword'},NOW)
    assert s['inventory']['gold']==12 and len(s['ranch']['animals'])==1
    before=copy.deepcopy(s)
    with pytest.raises(RuleError):board(s,'quest_claim','craft_home')
    assert s['inventory']==before['inventory'] and s['ranch']==before['ranch']


def test_aid_survives_rejected_purchase_and_reload():
    s=player();farm_and_home(s);at(s,'pasture','ranch_ledger')
    from test_quest_chain import commission
    commission(s,'coop');at(s,'pasture','ranch_ledger')
    before=copy.deepcopy(s)
    with pytest.raises(RuleError):apply(s,'ranch_buy',{'target':'ranch_ledger','species':'chicken','expected_next':99},NOW)
    assert s==before
    s=upgrade_state(s)
    apply(s,'ranch_buy',{'target':'ranch_ledger','species':'chicken','expected_next':1},NOW)
    assert s['inventory']['gold']==24 and not s['ranch']['intro_aid']


def test_old_balance_and_accepted_contract_survive_upgrade_exactly_once():
    old=player();old.pop('economy_version');old['inventory']['gold']=245
    old['quests']['craft_home']={'status':'active','accepted_at':NOW}
    old['buildings']['home']=2
    before=copy.deepcopy(old);s=upgrade_state(old)
    assert old==before and s['inventory']==old['inventory']
    assert upgrade_state(s)==s
    assert definition_for(s,'craft_home')['reward']['gold']==160
    board(s,'quest_claim','craft_home')
    assert s['inventory']['gold']==405 and 'intro_aid' not in s['ranch']
    before=copy.deepcopy(s)
    with pytest.raises(RuleError):board(s,'quest_claim','craft_home')
    assert s['inventory']==before['inventory']
    assert definition_for(s,'first_harvest')['reward']['gold']==16  # unaccepted: new balance


def test_crossing_gold_boundary_and_response_replay_are_one_ledger(client):
    create(client)
    with Session.begin() as db:
        p=db.scalar(select(Player));s=upgrade_state(p.state)
        s.update(location='shop',position={'x':240,'y':188});s['inventory'].update(gold=98,wood=2);p.state=s
    key=str(uuid.uuid4());sale={'target':'shop_counter','side':'sell','item':'wood','amount':2}
    first=cmd(client,'market_trade',sale,key);assert first.status_code==200
    assert first.json()['state']['inventory']['gold']==102 and money(first.json()['state']['inventory']['gold'])=='1金 2银'
    again=cmd(client,'market_trade',sale,key);assert again.json()['replayed']
    assert again.json()['state']['inventory']==first.json()['state']['inventory']
    purchase=cmd(client,'market_trade',{'target':'shop_counter','side':'buy','item':'seed','amount':2}).json()
    assert purchase['state']['inventory']['gold']==98
    assert client.get('/api/state').json()['state']['inventory']['gold']==98


def test_renewable_production_needs_investment_and_has_bounded_returns():
    # Gross cash per plot-cycle excludes the value of time, land and stamina.
    # Six starter plots earn 36 silver net per radish cycle, versus 84 before.
    radish=CROPS[0];assert (radish['sell']*radish['yield']-radish['buy'])*6==36
    for c in CROPS:
        days=c['days']+(c['harvests']-1)*c['regrow_days']
        net=c['sell']*c['yield']*c['harvests']-c['buy']
        assert 0<net/days<=25
    # A separately bought chicken repays its price in ten productive days at
    # ordinary quality, before shelter/material costs and two growing days.
    assert ANIMALS['chicken']['price']/(PRODUCTS['egg']['sell']-FEED_PRICE)==10
    for a in ANIMALS.values():
        if a['product']:assert PRODUCTS[a['product']]['sell']/a['period']-a['feed']*FEED_PRICE>0
