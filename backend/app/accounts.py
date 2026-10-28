"""Password and abuse controls, independent of gameplay and reward rules."""
import hashlib
import hmac
import re
import secrets
import threading
import time
from fastapi import HTTPException
from sqlalchemy import delete, select
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.dialects.postgresql import insert as postgres_insert
from .db import Session, engine
from .models import Account, AccountSession, AuthThrottle

SESSION_SECONDS = 30 * 24 * 60 * 60
_hash_slots = threading.BoundedSemaphore(2)


def username_key(value):
    value = value.strip().lower()
    if not re.fullmatch(r'[a-z0-9_]{3,24}', value):
        raise HTTPException(422, '用户名需为3–24位英文字母、数字或下划线，不区分大小写')
    return value


def password_hash(password, salt=None):
    salt = salt or secrets.token_hex(16)
    # Bound per-process memory when several FastAPI workers hash concurrently.
    with _hash_slots:
        digest = hashlib.scrypt(password.encode('utf-8'), salt=bytes.fromhex(salt),
                                n=131072, r=8, p=1, maxmem=256 * 1024 * 1024).hex()
    return f'scrypt$131072$8$1${salt}${digest}'


def verify_password(password, encoded):
    # Fixed parameters prevent an untrusted hash from requesting unbounded work.
    return hmac.compare_digest(password_hash(password, encoded.split('$')[4]), encoded)


def validate_password(password):
    if not 15 <= len(password) <= 128:
        raise HTTPException(422, '密码需为15–128个字符，可使用空格和中文；请妥善保存，暂不支持自助找回')


def throttle(request, username, action):
    """Reserve attempts atomically across workers, without holding a lock while hashing."""
    now = time.time()
    peer = request.client.host if request.client else 'unknown'
    buckets = [(f'{action}:ip:{peer}', 30), (f'{action}:name:{username}', 10)]
    insert = sqlite_insert if engine.dialect.name == 'sqlite' else postgres_insert
    blocked = False
    with Session.begin() as db:
        db.execute(delete(AuthThrottle).where(AuthThrottle.reset_at <= now))
        for raw, limit in buckets:
            key = hashlib.sha256(raw.encode()).hexdigest()
            db.execute(insert(AuthThrottle).values(key=key, attempts=0, reset_at=now + 300).on_conflict_do_nothing())
            row = db.scalar(select(AuthThrottle).where(AuthThrottle.key == key).with_for_update())
            if row.attempts >= limit:
                blocked = True
            else:
                row.attempts += 1
    if blocked:
        raise HTTPException(429, '尝试次数过多，请5分钟后重试', headers={'Retry-After': '300'})


def account_view(db, player_id):
    account = db.scalar(select(Account).where(Account.player_id == player_id))
    return {'username': account.username} if account else None


def new_session(db, account):
    now = time.time()
    db.execute(delete(AccountSession).where(AccountSession.expires_at <= now))
    token = secrets.token_urlsafe(32)
    db.add(AccountSession(token_hash=hashlib.sha256(token.encode()).hexdigest(),
                          account_id=account.id, expires_at=now + SESSION_SECONDS))
    return token
