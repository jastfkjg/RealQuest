import copy
import hashlib
import json
import os
import re
import secrets
import time
import uuid
from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.exception_handlers import request_validation_exception_handler
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy import select, delete, text, or_
from sqlalchemy.exc import IntegrityError
from .db import Session, engine
from .models import Player, Receipt, RecoveryKey, GuestSession, ClientDeletion, Account, AccountSession
from .accounts import username_key, password_hash, verify_password, validate_password, throttle, account_view, new_session
from .rules import initial_state, upgrade_state, apply, RuleError, study_task_views, exercise_task_views, recover_stamina, GATHER_COSTS, STAMINA_SECONDS, life_task_views, character_growth_options, HEALTH_CAPACITY_GAIN
from .quests import quest_views
from .world import WORLD
from .market import market_view
from .residents import routine_definitions, ensure_clock, social_view
from .daynight import sleep_rules

app = FastAPI(title='RealQuest API', version='0.1.0')
DUMMY_PASSWORD_HASH = password_hash('dummy password for missing accounts', '0' * 32)
COOKIE = os.getenv('SESSION_COOKIE_NAME', 'realquest_session')
SECURE_COOKIE = os.getenv('COOKIE_SECURE', 'false').lower() == 'true'
ALLOWED_ORIGINS = set(os.getenv('ALLOWED_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:8080,http://127.0.0.1:8080').split(','))

@app.exception_handler(RequestValidationError)
async def safe_account_validation(request, error):
    # Pydantic's default errors echo invalid input, including submitted passwords.
    if request.url.path.startswith('/api/account/'):
        return JSONResponse({'detail': '账号或密码格式不正确'}, status_code=422)
    return await request_validation_exception_handler(request, error)

@app.middleware('http')
async def protect_origin(request: Request, call_next):
    if request.method in ['POST', 'DELETE']:
        origin = request.headers.get('origin')
        if (origin and origin not in ALLOWED_ORIGINS) or request.headers.get('sec-fetch-site') == 'cross-site':
            return Response('Origin not allowed', status_code=403)
    response = await call_next(request)
    response.headers['Cache-Control'] = 'no-store'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    return response

class Command(BaseModel):
    model_config = ConfigDict(extra='forbid')
    request_id: str = Field(min_length=8, max_length=80)
    action: str = Field(min_length=1, max_length=32)
    data: dict = Field(default_factory=dict)
    save_id: str | None = Field(default=None, min_length=36, max_length=36)

def token_hash(request):
    # Explicit client credentials take precedence; never fall back to another
    # player's browser cookie after a malformed/expired Authorization header.
    authorization = request.headers.get('authorization')
    if authorization is not None:
        match = re.fullmatch(r'Bearer ([A-Za-z0-9_-]{43})', authorization)
        if not match:
            raise HTTPException(401, '客户端会话格式无效，请重新连接原存档')
        token = match.group(1)
    else:
        token = request.cookies.get(COOKIE)
    if not token:
        raise HTTPException(401, '游客会话已失效，请刷新页面重新进入')
    return hashlib.sha256(token.encode()).hexdigest()

def player_query(hashed):
    return select(Player).where(or_(Player.token_hash == hashed,
        Player.id.in_(select(GuestSession.player_id).where(GuestSession.token_hash == hashed)),
        Player.id.in_(select(Account.player_id).join(AccountSession, AccountSession.account_id == Account.id)
                      .where(AccountSession.token_hash == hashed, AccountSession.expires_at > time.time()))))

def player_for(db, request, lock=False):
    query = player_query(token_hash(request))
    player = db.scalar(query.with_for_update() if lock else query)
    if not player:
        raise HTTPException(401, '游客会话已失效，请刷新页面重新进入')
    return player

def lock_sqlite(db):
    if engine.dialect.name == 'sqlite':
        db.execute(text('BEGIN IMMEDIATE'))

def snapshot(state, **extra):
    view=upgrade_state(state)
    now = time.time()
    if view['character']:
        ensure_clock(view, now)
    if view['stamina']['current'] < view['stamina']['max']:
        recover_stamina(view, now)
    view['exercise_task_log'] = exercise_task_views(view)
    view['life_journal'] = life_task_views(view, now)
    view['stamina_rules'] = {'gather_costs': GATHER_COSTS, 'seconds_per_point': STAMINA_SECONDS, 'capacity_per_point': HEALTH_CAPACITY_GAIN}
    view['character_growth_options'] = character_growth_options(view)
    view['market'] = market_view(view, now)
    from .farming import farm_view
    view['farming'] = farm_view(view, now)
    view['npc_social'] = social_view(view, view['market']['date'])
    view['sleep_rules'] = sleep_rules()
    from .journey import quotes
    view['travel'] = quotes(view, now)
    from .combat import combat_view
    view['combat'] = combat_view(view, now)
    view['quest_log']=quest_views(view)
    view['study_task_log']=study_task_views(view)
    view['study_plan_log']=sorted(view['study_plans'].values(), key=lambda p: p['created_at'], reverse=True)
    return {'state': view, 'server_time': now, **extra}

@app.get('/api/health')
def health():
    with Session() as db:
        db.execute(text('SELECT 1'))
    return {'status': 'ok'}

@app.post('/api/session')
def session(request: Request, response: Response):
    with Session.begin() as db:
        # Clock migration writes player state; serialize it with game commands.
        lock_sqlite(db)
        existing = request.cookies.get(COOKIE)
        player = db.scalar(player_query(hashlib.sha256(existing.encode()).hexdigest()).with_for_update()) if existing else None
        if not player:
            token = secrets.token_urlsafe(32)
            player = Player(id=str(uuid.uuid4()), token_hash=hashlib.sha256(token.encode()).hexdigest(), state=initial_state())
            db.add(player)
            response.set_cookie(COOKIE, token, httponly=True, samesite='strict', secure=SECURE_COOKIE, max_age=31536000)
        if player.state.get('character') and (player.state.get('world_clock') or {}).get('version') != 2:
            updated = copy.deepcopy(player.state)
            ensure_clock(updated, time.time())
            player.state = updated
        return snapshot(player.state, world={**WORLD, 'residents': routine_definitions()}, save_id=player.id)

@app.get('/api/state')
def state(request: Request):
    with Session() as db:
        player = player_for(db, request)
        return snapshot(player.state, save_id=player.id, account=account_view(db, player.id))

@app.post('/api/client-session')
def client_session(request: Request):
    """Opt-in guest transport for Cocos. Does not replace the Web cookie.

    This is not WeChat/Douyin/Bilibili account verification. Platform account
    exchange and explicit account linking remain separate migration work.
    """
    with Session.begin() as db:
        lock_sqlite(db)
        extra = {}
        if request.headers.get('authorization') is not None:
            player = player_for(db, request, lock=True)
        else:
            token = secrets.token_urlsafe(32)
            player = Player(id=str(uuid.uuid4()), token_hash=hashlib.sha256(token.encode()).hexdigest(), state=initial_state())
            db.add(player)
            extra['session_token'] = token
        if player.state.get('character') and (player.state.get('world_clock') or {}).get('version') != 2:
            updated = copy.deepcopy(player.state)
            ensure_clock(updated, time.time())
            player.state = updated
        return snapshot(player.state, world={**WORLD, 'residents': routine_definitions()}, save_id=player.id, account=account_view(db, player.id), **extra)


class AccountCredentials(BaseModel):
    model_config = ConfigDict(extra='forbid')
    username: str = Field(max_length=64)
    password: str = Field(max_length=128, repr=False)
    save_id: str | None = Field(default=None, min_length=36, max_length=36)


@app.post('/api/account/register')
def register_account(body: AccountCredentials, request: Request):
    username = username_key(body.username)
    validate_password(body.password)
    throttle(request, username, 'register')
    encoded = password_hash(body.password)
    try:
        with Session.begin() as db:
            lock_sqlite(db)
            if request.headers.get('authorization') is not None:
                player = player_for(db, request, lock=True)
                if body.save_id != player.id:
                    raise HTTPException(409, '旅程已变化，请刷新核对后绑定')
                if account_view(db, player.id):
                    raise HTTPException(409, '此旅程已绑定账号，请直接登录')
            else:
                if body.save_id is not None:
                    raise HTTPException(401, '请先连接要绑定的游客旅程')
                player = Player(id=str(uuid.uuid4()), token_hash=hashlib.sha256(secrets.token_bytes(32)).hexdigest(), state=initial_state())
                db.add(player)
                db.flush()
            account = Account(id=str(uuid.uuid4()), username=username, password_hash=encoded,
                              player_id=player.id, created_at=time.time())
            db.add(account)
            db.flush()  # Enforce uniqueness before revoking any guest credentials.
            # Old guest/recovery files must not bypass the newly bound password.
            db.execute(delete(GuestSession).where(GuestSession.player_id == player.id))
            db.execute(delete(RecoveryKey).where(RecoveryKey.player_id == player.id))
            player.token_hash = hashlib.sha256(secrets.token_bytes(32)).hexdigest()
            token = new_session(db, account)
            return snapshot(player.state, world={**WORLD, 'residents': routine_definitions()},
                            save_id=player.id, session_token=token, account={'username': username})
    except IntegrityError:
        raise HTTPException(409, '用户名不可用，或此旅程已绑定账号；请更换用户名或直接登录')


@app.post('/api/account/login')
def login_account(body: AccountCredentials, request: Request):
    username = username_key(body.username)
    throttle(request, username, 'login')
    with Session() as db:
        account = db.scalar(select(Account).where(Account.username == username))
        encoded = account.password_hash if account else DUMMY_PASSWORD_HASH
        account_id = account.id if account else None
    valid = verify_password(body.password, encoded)
    if not account_id or not valid:
        raise HTTPException(401, '用户名或密码不正确')
    with Session.begin() as db:
        lock_sqlite(db)
        account = db.scalar(select(Account).where(Account.id == account_id).with_for_update())
        if not account or account.password_hash != encoded:
            raise HTTPException(401, '用户名或密码不正确')
        player = db.get(Player, account.player_id) if account.player_id else None
        if not player:
            # Deleting a journey preserves the login; the next login starts empty.
            player = Player(id=str(uuid.uuid4()), token_hash=hashlib.sha256(secrets.token_bytes(32)).hexdigest(), state=initial_state())
            db.add(player)
            db.flush()
            account.player_id = player.id
        token = new_session(db, account)
        return snapshot(player.state, world={**WORLD, 'residents': routine_definitions()},
                        save_id=player.id, session_token=token, account={'username': account.username})


@app.post('/api/account/logout')
def logout_account(request: Request):
    if request.headers.get('authorization') is None:
        raise HTTPException(401, '请使用当前账号会话退出')
    hashed = token_hash(request)
    with Session.begin() as db:
        db.execute(delete(AccountSession).where(AccountSession.token_hash == hashed))
    # Idempotent even when a committed response was lost; never deletes saves.
    return {'logged_out': True}

@app.post('/api/command')
def command(body: Command, request: Request):
    try:
        serialized = json.dumps({'action': body.action, 'data': body.data}, sort_keys=True, allow_nan=False)
    except ValueError:
        raise HTTPException(422, '请求包含无效数值')
    if len(serialized) > 4096:
        raise HTTPException(422, '请求过大')
    fingerprint = hashlib.sha256(serialized.encode()).hexdigest()
    with Session.begin() as db:
        lock_sqlite(db)
        player = player_for(db, request, lock=True)
        if body.save_id is not None and body.save_id != player.id:
            raise HTTPException(409, '旅程已在另一页面切换，请刷新后再操作')
        previous = db.scalar(select(Receipt).where(Receipt.player_id == player.id, Receipt.request_id == body.request_id))
        if previous:
            if previous.fingerprint != fingerprint:
                raise HTTPException(409, '请求标识已经用于不同操作')
            return snapshot(player.state, message=previous.changes['message'], replayed=True, save_id=player.id)
        before = upgrade_state(player.state)
        tick_receipt = before['village_combat'].get('tick_receipt', {})
        if body.action == 'cave_tick' and tick_receipt.get('request_id') == body.request_id:
            if tick_receipt['fingerprint'] != fingerprint:
                raise HTTPException(409, '请求标识已经用于不同操作')
            return snapshot(player.state, message='', replayed=True, save_id=player.id)
        updated = copy.deepcopy(before)
        try:
            message = apply(updated, body.action, body.data, time.time())
        except RuleError as error:
            raise HTTPException(422, str(error))
        updated['revision'] += 1
        if body.action == 'cave_tick':
            # The ordered encounter sequence rejects old inputs; retain only the
            # latest retry receipt instead of a ledger row for every network tick.
            updated['village_combat']['tick_receipt'] = {'request_id': body.request_id, 'fingerprint': fingerprint}
        player.state = updated
        changes = {'message': message, 'xp': updated['xp'] - before['xp'], 'inventory': {key: value-before['inventory'].get(key,0) for key,value in updated['inventory'].items() if value != before['inventory'].get(key,0)}, 'revision': updated['revision']}
        changes.update(health_points=updated['health_points'] - before['health_points'],
                       health_invested=updated['health_invested'] - before['health_invested'],
                       stamina_max=updated['stamina']['max'] - before['stamina']['max'])
        changes.update(knowledge_points=updated['knowledge_points'] - before['knowledge_points'],
                       skill_points=updated['skill_points'] - before['skill_points'],
                       knowledge_growth={key: value - before['knowledge_growth'][key]
                                         for key, value in updated['knowledge_growth'].items()})
        changes.update(vitality_max=updated['vitality']['max'] - before['vitality']['max'],
                       skill_growth={key: value - before['skill_growth'][key]
                                     for key, value in updated['skill_growth'].items()})
        if body.action != 'cave_tick' or changes['inventory']:
            db.add(Receipt(id=str(uuid.uuid4()), player_id=player.id, request_id=body.request_id, fingerprint=fingerprint, action=body.action, changes=changes, created_at=time.time()))
        return snapshot(updated, message=message, replayed=False, save_id=player.id)

class RecoveryInput(BaseModel):
    model_config = ConfigDict(extra='forbid')
    recovery_key: str = Field(min_length=43, max_length=43, pattern=r'^[A-Za-z0-9_-]+$')

def recovery_player(db, body):
    key = db.get(RecoveryKey, hashlib.sha256(body.recovery_key.encode()).hexdigest())
    player = db.get(Player, key.player_id) if key else None
    if not player or account_view(db, player.id):
        raise HTTPException(404, '未找到这份凭证对应的旅程，请确认连接的是原来的服务器；已删除的存档无法恢复')
    return player

@app.post('/api/recovery-file')
def recovery_file(request: Request):
    with Session.begin() as db:
        lock_sqlite(db)
        player = player_for(db, request, lock=True)
        if account_view(db, player.id):
            raise HTTPException(403, '账号旅程请使用用户名和密码接续；可在数据管理中导出完整数据')
        if not player.state['character']:
            raise HTTPException(422, '创建角色后才能保存旅程凭证')
        token = secrets.token_urlsafe(32)
        db.add(RecoveryKey(token_hash=hashlib.sha256(token.encode()).hexdigest(), player_id=player.id, created_at=time.time()))
        return {'format': 'realquest-recovery', 'version': 1, 'recovery_key': token,
                'character_name': player.state['character']['name'], 'saved_at': time.time()}

@app.post('/api/recovery-preview')
def recovery_preview(body: RecoveryInput):
    with Session() as db:
        player = recovery_player(db, body)
        state = upgrade_state(player.state)
        return {'save_id': player.id, 'character': state['character'], 'plan_count': len(state['study_plans']),
                'record_count': len(state['activities']), 'timer': state['timer'], 'revision': state['revision']}

@app.post('/api/recover')
def recover(body: RecoveryInput, response: Response):
    with Session.begin() as db:
        lock_sqlite(db)
        player = recovery_player(db, body)
        token = secrets.token_urlsafe(32)
        db.add(GuestSession(token_hash=hashlib.sha256(token.encode()).hexdigest(), player_id=player.id))
        response.set_cookie(COOKIE, token, httponly=True, samesite='strict', secure=SECURE_COOKIE, max_age=31536000)
        return {'restored': True}

@app.post('/api/client-recover')
def client_recover(body: RecoveryInput):
    """Exchange the existing v1 recovery credential without replacing Web cookies."""
    with Session.begin() as db:
        lock_sqlite(db)
        player = recovery_player(db, body)
        token = secrets.token_urlsafe(32)
        db.add(GuestSession(token_hash=hashlib.sha256(token.encode()).hexdigest(), player_id=player.id))
        return snapshot(player.state, world={**WORLD, 'residents': routine_definitions()},
                        save_id=player.id, session_token=token)

@app.get('/api/export')
def export(request: Request):
    with Session() as db:
        player = player_for(db, request)
        ledger = db.scalars(select(Receipt).where(Receipt.player_id == player.id).order_by(Receipt.created_at)).all()
        return {'state': player.state, 'ledger': [{'action': item.action, 'created_at': item.created_at, 'changes': item.changes} for item in ledger]}


class WebJourneyInput(BaseModel):
    model_config = ConfigDict(extra='forbid')
    save_id: str = Field(min_length=36, max_length=36)


@app.post('/api/client-from-web')
def client_from_web(body: WebJourneyInput, request: Request):
    """Explicitly continue an existing cookie journey, never create a player."""
    if request.headers.get('authorization') is not None:
        raise HTTPException(400, '接续原网页旅程需使用此浏览器的原会话')
    with Session.begin() as db:
        lock_sqlite(db)
        player = player_for(db, request, lock=True)
        if player.id != body.save_id:
            raise HTTPException(409, '原网页旅程已变化，请重新查找并核对')
        if not player.state.get('character'):
            raise HTTPException(422, '此浏览器尚无已登记的原网页旅程')
        token = secrets.token_urlsafe(32)
        db.add(GuestSession(token_hash=hashlib.sha256(token.encode()).hexdigest(), player_id=player.id))
        return snapshot(player.state, world={**WORLD, 'residents': routine_definitions()},
                        save_id=player.id, session_token=token)


class ClientDeletionInput(WebJourneyInput):
    request_id: str = Field(min_length=8, max_length=80)


@app.post('/api/client-delete')
def client_delete(body: ClientDeletionInput, request: Request):
    # A cookie may belong to a different journey. Never use it for this action.
    if request.headers.get('authorization') is None:
        raise HTTPException(401, '请先连接要删除的旅程')
    hashed = token_hash(request)
    with Session.begin() as db:
        lock_sqlite(db)
        receipt = db.get(ClientDeletion, (hashed, body.request_id))
        if receipt:
            if receipt.save_id != body.save_id:
                raise HTTPException(409, '删除请求与旅程不一致')
            return {'deleted': True, 'save_id': receipt.save_id}
        player = db.scalar(player_query(hashed).with_for_update())
        if not player:
            # A concurrent committed deletion may have won the player lock.
            receipt = db.get(ClientDeletion, (hashed, body.request_id))
            if receipt and receipt.save_id == body.save_id:
                return {'deleted': True, 'save_id': receipt.save_id}
            raise HTTPException(401, '旅程会话已失效，请核对删除结果')
        if player.id != body.save_id:
            raise HTTPException(409, '旅程已变化，请重新核对后操作')
        db.execute(delete(Receipt).where(Receipt.player_id == player.id))
        db.execute(delete(RecoveryKey).where(RecoveryKey.player_id == player.id))
        db.execute(delete(GuestSession).where(GuestSession.player_id == player.id))
        # Serialize with login before revoking sessions. Otherwise a concurrent
        # login could leave a token that reactivates when this account starts over.
        db.scalar(select(Account).where(Account.player_id == player.id).with_for_update())
        db.execute(delete(AccountSession).where(AccountSession.account_id.in_(select(Account.id).where(Account.player_id == player.id))))
        db.delete(player)
        db.add(ClientDeletion(token_hash=hashed, request_id=body.request_id,
                              save_id=body.save_id, created_at=time.time()))
        # Deliberately leave any other journey's Web cookie untouched.
        return {'deleted': True, 'save_id': body.save_id}

@app.delete('/api/session')
def delete_session(request: Request, response: Response):
    with Session.begin() as db:
        lock_sqlite(db)
        player = player_for(db, request, lock=True)
        db.execute(delete(Receipt).where(Receipt.player_id == player.id))
        db.execute(delete(RecoveryKey).where(RecoveryKey.player_id == player.id))
        db.execute(delete(GuestSession).where(GuestSession.player_id == player.id))
        db.scalar(select(Account).where(Account.player_id == player.id).with_for_update())
        db.execute(delete(AccountSession).where(AccountSession.account_id.in_(select(Account.id).where(Account.player_id == player.id))))
        db.delete(player)
    response.delete_cookie(COOKIE)
    return {'deleted': True}
