import copy
import hashlib
import json
import os
import secrets
import time
import uuid
from fastapi import FastAPI, Request, Response, HTTPException
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy import select, delete, text
from .db import Session, engine
from .models import Player, Receipt
from .rules import initial_state, upgrade_state, apply, RuleError
from .quests import quest_views
from .world import WORLD

app = FastAPI(title='RealQuest API', version='0.1.0')
COOKIE = 'realquest_session'
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

def token_hash(request):
    token = request.cookies.get(COOKIE)
    if not token:
        raise HTTPException(401, '游客会话已失效，请刷新页面重新进入')
    return hashlib.sha256(token.encode()).hexdigest()

def player_for(db, request, lock=False):
    query = select(Player).where(Player.token_hash == token_hash(request))
    player = db.scalar(query.with_for_update() if lock else query)
    if not player:
        raise HTTPException(401, '游客会话已失效，请刷新页面重新进入')
    return player

def lock_sqlite(db):
    if engine.dialect.name == 'sqlite':
        db.execute(text('BEGIN IMMEDIATE'))

def snapshot(state, **extra):
    view=upgrade_state(state)
    view['quest_log']=quest_views(view)
    return {'state': view, 'server_time': time.time(), **extra}

@app.get('/api/health')
def health():
    with Session() as db:
        db.execute(text('SELECT 1'))
    return {'status': 'ok'}

@app.post('/api/session')
def session(request: Request, response: Response):
    with Session.begin() as db:
        existing = request.cookies.get(COOKIE)
        player = db.scalar(select(Player).where(Player.token_hash == hashlib.sha256(existing.encode()).hexdigest())) if existing else None
        if not player:
            token = secrets.token_urlsafe(32)
            player = Player(id=str(uuid.uuid4()), token_hash=hashlib.sha256(token.encode()).hexdigest(), state=initial_state())
            db.add(player)
            response.set_cookie(COOKIE, token, httponly=True, samesite='strict', secure=SECURE_COOKIE, max_age=31536000)
        return snapshot(player.state, world=WORLD)

@app.get('/api/state')
def state(request: Request):
    with Session() as db:
        return snapshot(player_for(db, request).state)

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
        previous = db.scalar(select(Receipt).where(Receipt.player_id == player.id, Receipt.request_id == body.request_id))
        if previous:
            if previous.fingerprint != fingerprint:
                raise HTTPException(409, '请求标识已经用于不同操作')
            return snapshot(player.state, message=previous.changes['message'], replayed=True)
        before = upgrade_state(player.state)
        updated = copy.deepcopy(before)
        try:
            message = apply(updated, body.action, body.data, time.time())
        except RuleError as error:
            raise HTTPException(422, str(error))
        updated['revision'] += 1
        player.state = updated
        changes = {'message': message, 'xp': updated['xp'] - before['xp'], 'inventory': {key: value-before['inventory'].get(key,0) for key,value in updated['inventory'].items() if value != before['inventory'].get(key,0)}, 'revision': updated['revision']}
        db.add(Receipt(id=str(uuid.uuid4()), player_id=player.id, request_id=body.request_id, fingerprint=fingerprint, action=body.action, changes=changes, created_at=time.time()))
        return snapshot(updated, message=message, replayed=False)

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
        db.delete(player)
    response.delete_cookie(COOKIE)
    return {'deleted': True}
