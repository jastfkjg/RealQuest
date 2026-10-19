"""Upgrade an isolated populated v001 save without changing its JSON or ledger."""
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import sys


def test_recovery_migration_preserves_existing_save(tmp_path):
    backend = Path(__file__).resolve().parents[1]
    database = tmp_path / 'legacy.db'
    env = {**os.environ, 'DATABASE_URL': f'sqlite:///{database}'}
    def upgrade(target):
        subprocess.run([sys.executable, '-m', 'alembic', 'upgrade', target], cwd=backend, env=env, check=True, capture_output=True)
    upgrade('001')
    saved = json.dumps({'character': {'name': '旧旅人'}, 'xp': 25, 'timer': {'elapsed': 61, 'running': False}})
    with sqlite3.connect(database) as db:
        db.execute('INSERT INTO players (id, token_hash, state) VALUES (?, ?, ?)', ('legacy-player', 'a' * 64, saved))
        db.execute('INSERT INTO receipts VALUES (?, ?, ?, ?, ?, ?, ?)', ('receipt', 'legacy-player', 'original-request', 'b' * 64, 'timer_finish', '{"xp":25}', 10))
    upgrade('002')
    with sqlite3.connect(database) as db:
        db.execute('INSERT INTO recovery_keys VALUES (?, ?, ?)', ('c' * 64, 'legacy-player', 10))
        db.execute('INSERT INTO guest_sessions VALUES (?, ?)', ('d' * 64, 'legacy-player'))
    upgrade('head'); upgrade('head')
    with sqlite3.connect(database) as db:
        assert db.execute('SELECT state FROM players').fetchone()[0] == saved
        assert db.execute('SELECT count(*) FROM receipts').fetchone()[0] == 1
        assert db.execute('SELECT version_num FROM alembic_version').fetchone()[0] == '003'
        assert db.execute('SELECT count(*) FROM recovery_keys').fetchone()[0] == 1
        assert db.execute('SELECT count(*) FROM guest_sessions').fetchone()[0] == 1
        assert db.execute('SELECT count(*) FROM client_deletions').fetchone()[0] == 0
