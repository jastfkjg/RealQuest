from sqlalchemy import String, JSON, ForeignKey, UniqueConstraint, Float
from sqlalchemy.orm import Mapped, mapped_column
from .db import Base

class Player(Base):
    __tablename__ = 'players'
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    state: Mapped[dict] = mapped_column(JSON)

class Receipt(Base):
    __tablename__ = 'receipts'
    __table_args__ = (UniqueConstraint('player_id', 'request_id'),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    player_id: Mapped[str] = mapped_column(ForeignKey('players.id', ondelete='CASCADE'), index=True)
    request_id: Mapped[str] = mapped_column(String(80))
    fingerprint: Mapped[str] = mapped_column(String(64))
    action: Mapped[str] = mapped_column(String(32))
    changes: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[float] = mapped_column(Float)

class RecoveryKey(Base):
    __tablename__ = 'recovery_keys'
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    player_id: Mapped[str] = mapped_column(ForeignKey('players.id', ondelete='CASCADE'), index=True)
    created_at: Mapped[float] = mapped_column(Float)

class GuestSession(Base):
    __tablename__ = 'guest_sessions'
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    player_id: Mapped[str] = mapped_column(ForeignKey('players.id', ondelete='CASCADE'), index=True)

class Account(Base):
    __tablename__ = 'accounts'
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    username: Mapped[str] = mapped_column(String(24), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(256))
    player_id: Mapped[str | None] = mapped_column(ForeignKey('players.id', ondelete='SET NULL'), unique=True)
    created_at: Mapped[float] = mapped_column(Float)

class AccountSession(Base):
    __tablename__ = 'account_sessions'
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    account_id: Mapped[str] = mapped_column(ForeignKey('accounts.id', ondelete='CASCADE'), index=True)
    expires_at: Mapped[float] = mapped_column(Float)

class AuthThrottle(Base):
    __tablename__ = 'auth_throttles'
    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    attempts: Mapped[int]
    reset_at: Mapped[float] = mapped_column(Float)

class ClientDeletion(Base):
    """Minimal receipt for confirming a committed deletion after a lost reply.

    No plaintext credentials or gameplay data survive in this table.
    """
    __tablename__ = 'client_deletions'
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    request_id: Mapped[str] = mapped_column(String(80), primary_key=True)
    save_id: Mapped[str] = mapped_column(String(36))
    created_at: Mapped[float] = mapped_column(Float)
