import copy
import hashlib
import json
import os
import secrets
import time
import uuid
from fastapi import FastAPI, Request, Response, HTTPException
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy import select, delete, text, or_
from .db import Session, engine
from .models import Player, Receipt, RecoveryKey, GuestSession
from .rules import initial_state, upgrade_state, apply, RuleError, study_task_views, exercise_task_views, recover_stamina, GATHER_COSTS, STAMINA_SECONDS
from .quests import quest_views
from .world import WORLD

app = FastAPI(title='RealQuest API', version='0.1.0')
COOKIE = os.getenv('SESSION_COOKIE_NAME', 'realquest_session')
SECURE_COOKIE = os.getenv('COOKIE_SECURE', 'false').lower() == 'true'
ALLOWED_ORIGINS = set(os.getenv('ALLOWED_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:8080,http://127.0.0.1:8080').split(','))

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
    token = request.cookies.get(COOKIE)
    if not token:
        raise HTTPException(401, '游客会话已失效，请刷新页面重新进入')
    return hashlib.sha256(token.encode()).hexdigest()

def player_query(hashed):
    return select(Player).where(or_(Player.token_hash == hashed,
        Player.id.in_(select(GuestSession.player_id).where(GuestSession.token_hash == hashed))))

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
    if view['stamina']['current'] < view['stamina']['max']:
        recover_stamina(view, now)
    view['exercise_task_log'] = exercise_task_views(view)
    view['stamina_rules'] = {'gather_costs': GATHER_COSTS, 'seconds_per_point': STAMINA_SECONDS, 'capacity_per_point': 5}
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
        existing = request.cookies.get(COOKIE)
        player = db.scalar(player_query(hashlib.sha256(existing.encode()).hexdigest())) if existing else None
        if not player:
            token = secrets.token_urlsafe(32)
            player = Player(id=str(uuid.uuid4()), token_hash=hashlib.sha256(token.encode()).hexdigest(), state=initial_state())
            db.add(player)
            response.set_cookie(COOKIE, token, httponly=True, samesite='strict', secure=SECURE_COOKIE, max_age=31536000)
        return snapshot(player.state, world=WORLD, save_id=player.id)

@app.get('/api/state')
def state(request: Request):
    with Session() as db:
        player = player_for(db, request)
        return snapshot(player.state, save_id=player.id)

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
        updated = copy.deepcopy(before)
        try:
            message = apply(updated, body.action, body.data, time.time())
        except RuleError as error:
            raise HTTPException(422, str(error))
        updated['revision'] += 1
        player.state = updated
        changes = {'message': message, 'xp': updated['xp'] - before['xp'], 'inventory': {key: value-before['inventory'].get(key,0) for key,value in updated['inventory'].items() if value != before['inventory'].get(key,0)}, 'revision': updated['revision']}
        changes.update(health_points=updated['health_points'] - before['health_points'],
                       health_invested=updated['health_invested'] - before['health_invested'],
                       stamina_max=updated['stamina']['max'] - before['stamina']['max'])
        changes.update(knowledge_points=updated['knowledge_points'] - before['knowledge_points'],
                       knowledge_growth={key: value - before['knowledge_growth'][key]
                                         for key, value in updated['knowledge_growth'].items()})
        db.add(Receipt(id=str(uuid.uuid4()), player_id=player.id, request_id=body.request_id, fingerprint=fingerprint, action=body.action, changes=changes, created_at=time.time()))
        return snapshot(updated, message=message, replayed=False, save_id=player.id)

class RecoveryInput(BaseModel):
    model_config = ConfigDict(extra='forbid')
    recovery_key: str = Field(min_length=43, max_length=43, pattern=r'^[A-Za-z0-9_-]+$')

def recovery_player(db, body):
    key = db.get(RecoveryKey, hashlib.sha256(body.recovery_key.encode()).hexdigest())
    player = db.get(Player, key.player_id) if key else None
    if not player:
        raise HTTPException(404, '未找到这份凭证对应的旅程，请确认连接的是原来的服务器；已删除的存档无法恢复')
    return player

@app.post('/api/recovery-file')
def recovery_file(request: Request):
    with Session.begin() as db:
        lock_sqlite(db)
        player = player_for(db, request, lock=True)
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
        return {'character': state['character'], 'plan_count': len(state['study_plans']),
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

@app.get('/api/export')
def export(request: Request):
    with Session() as db:
        player = player_for(db, request)
        ledger = db.scalars(select(Receipt).where(Receipt.player_id == player.id).order_by(Receipt.created_at)).all()
        return {'state': player.state, 'ledger': [{'action': item.action, 'created_at': item.created_at, 'changes': item.changes} for item in ledger]}

@app.delete('/api/session')
def delete_session(request: Request, response: Response):
    with Session.begin() as db:
        lock_sqlite(db)
        player = player_for(db, request, lock=True)
        db.execute(delete(Receipt).where(Receipt.player_id == player.id))
        db.execute(delete(RecoveryKey).where(RecoveryKey.player_id == player.id))
        db.execute(delete(GuestSession).where(GuestSession.player_id == player.id))
        db.delete(player)
    response.delete_cookie(COOKIE)
    return {'deleted': True}
