"""Actual SQLite/WAL and no-clobber backup contract; no player data."""
import hashlib
import json
import math
import os
from pathlib import Path
import shutil
import sqlite3
import tempfile
import unittest
from unittest.mock import patch
import cocos_sqlite_backup as backup

ROOT = Path(__file__).resolve().parents[1]


class BackupContract(unittest.TestCase):
    def setUp(self):
        parent = ROOT / 'output/cocos-backup-tests'
        parent.mkdir(exist_ok=True)
        self.temporary = tempfile.TemporaryDirectory(prefix='fixture-', dir=parent)
        self.root = Path(self.temporary.name).resolve()
        self.database = self.root / '源 数据.db'
        self.writer = sqlite3.connect(self.database)
        self.writer.execute('PRAGMA journal_mode=WAL')
        self.writer.executescript('''
            CREATE TABLE players(id TEXT PRIMARY KEY,token_hash TEXT,state TEXT);
            CREATE TABLE receipts(id TEXT PRIMARY KEY,player_id TEXT REFERENCES players(id),request_id TEXT,changes TEXT);
            CREATE TABLE typed(value BLOB,note TEXT);
        ''')
        self.writer.execute('PRAGMA wal_checkpoint(TRUNCATE)')
        self.state = json.dumps({'name': '只用于备份测试', 'inventory': {'gold': 23}, 'note': '中文历史'}, ensure_ascii=False)
        self.writer.execute('INSERT INTO players VALUES(?,?,?)', ('save-a', 'unit-secret-hash', self.state))
        self.writer.execute('INSERT INTO receipts VALUES(?,?,?,?)', ('receipt-a', 'save-a', 'once-a', '{"xp":5}'))
        self.writer.executemany('INSERT INTO typed VALUES(?,?)', [(b'\x00\xff', '二进制'), (None, None), (1.25, '浮点'), (math.inf, '无穷'), ('重复', '行'), ('重复', '行')])
        self.writer.commit()
        self.output = self.root / 'backup'

    def tearDown(self):
        self.writer.close()
        self.temporary.cleanup()
        self.assertFalse(self.root.exists())

    def made(self):
        return backup.backup_database(self.database, self.output)

    def test_wal_commits_restore_all_rows_types_duplicates_and_private_permissions(self):
        raw = self.root / 'raw-main-only.db'
        shutil.copyfile(self.database, raw)
        with sqlite3.connect(raw) as incomplete:
            self.assertEqual(incomplete.execute('SELECT count(*) FROM players').fetchone()[0], 0)
        result = self.made()
        self.assertGreater(result['sourceStorage']['walBytesAtStart'], 32)
        self.assertEqual(result['sourceStorage']['journalMode'], 'wal')
        self.assertEqual(backup.inspect_database(self.database)['snapshot'], result['snapshot'])
        self.assertNotIn('只用于备份测试', (self.output / 'manifest.json').read_text())
        restored = self.root / 'restored.db'
        backup.restore_database(self.output, restored)
        with sqlite3.connect(restored) as connection:
            self.assertEqual(connection.execute('SELECT state FROM players').fetchone()[0], self.state)
            self.assertEqual(connection.execute('SELECT * FROM typed').fetchall(), self.writer.execute('SELECT * FROM typed').fetchall())
            self.assertEqual(connection.execute('PRAGMA journal_mode').fetchone()[0], 'delete')
        self.assertEqual(restored.stat().st_mode & 0o777, 0o600)
        self.assertEqual((self.output / 'database.sqlite').stat().st_mode & 0o777, 0o600)
        self.assertEqual((self.output / 'manifest.json').stat().st_mode & 0o777, 0o600)

    def test_existing_backup_and_restore_targets_preserve_all_bytes(self):
        self.made()
        before = (self.output / 'manifest.json').read_bytes()
        with self.assertRaises(FileExistsError):
            self.made()
        self.assertEqual((self.output / 'manifest.json').read_bytes(), before)
        existing = self.root / 'existing.db'
        existing.write_bytes(b'preserve-existing-database')
        with self.assertRaises(FileExistsError):
            backup.restore_database(self.output, existing)
        self.assertEqual(existing.read_bytes(), b'preserve-existing-database')

    def test_corrupt_database_and_manifest_are_rejected_without_target(self):
        self.made()
        file = self.output / 'database.sqlite'
        original = file.read_bytes()
        file.write_bytes(original[:-100])
        with self.assertRaisesRegex(ValueError, 'bytes changed'):
            backup.restore_database(self.output, self.root / 'not-created.db')
        self.assertFalse((self.root / 'not-created.db').exists())
        file.write_bytes(original)
        manifest = self.output / 'manifest.json'
        data = json.loads(manifest.read_text())
        data['snapshot']['tables'][0]['rows'] += 1
        manifest.write_text(json.dumps(data))
        with self.assertRaisesRegex(ValueError, 'fingerprint'):
            backup.verify_backup(self.output)

    def test_bad_sqlite_with_recomputed_file_hash_still_fails_integrity(self):
        self.made()
        file = self.output / 'database.sqlite'
        file.write_bytes(b'invalid SQLite file')
        manifest = self.output / 'manifest.json'
        data = json.loads(manifest.read_text())
        data['database'].update(bytes=file.stat().st_size, sha256=hashlib.sha256(file.read_bytes()).hexdigest())
        manifest.write_text(json.dumps(data))
        with self.assertRaises(sqlite3.DatabaseError):
            backup.verify_backup(self.output)

    def test_source_backup_destination_and_ancestor_symlinks_are_rejected(self):
        link = self.root / 'source-link.db'
        link.symlink_to(self.database)
        with self.assertRaisesRegex(ValueError, 'symlink'):
            backup.backup_database(link, self.output)
        self.made()
        backup_link = self.root / 'backup-link'
        backup_link.symlink_to(self.output, target_is_directory=True)
        with self.assertRaisesRegex(ValueError, 'symlink'):
            backup.verify_backup(backup_link)
        parent_link = self.root / 'parent-link'
        parent_link.symlink_to(self.root, target_is_directory=True)
        with self.assertRaisesRegex(ValueError, 'symlink'):
            backup.restore_database(self.output, parent_link / 'new.db')

    def test_path_traversal_unsupported_version_and_extra_files_fail_closed(self):
        self.made()
        file = self.output / 'manifest.json'
        original = file.read_text()
        for patch_value, message in [({'database': {'file': '../源 数据.db'}}, 'Unsafe'), ({'version': 99}, 'Unsupported')]:
            data = json.loads(original)
            data.update(patch_value)
            file.write_text(json.dumps(data))
            with self.assertRaisesRegex(ValueError, message):
                backup.verify_backup(self.output)
        file.write_text(original)
        (self.output / 'unexpected.key').write_bytes(b'private-file')
        with self.assertRaisesRegex(ValueError, 'exactly'):
            backup.verify_backup(self.output)

    def test_unrelated_sqlite_foreign_key_corruption_and_failed_backup_cleanup(self):
        wrong = self.root / 'wrong.db'
        with sqlite3.connect(wrong) as connection:
            connection.execute('CREATE TABLE other(value)')
        with self.assertRaisesRegex(ValueError, 'Not a RealQuest'):
            backup.backup_database(wrong, self.output)
        self.assertFalse(self.output.exists())
        self.writer.execute('INSERT INTO receipts VALUES(?,?,?,?)', ('bad', 'missing-player', 'bad', '{}'))
        self.writer.commit()
        with self.assertRaisesRegex(ValueError, 'foreign-key'):
            self.made()
        self.assertFalse(self.output.exists())
        self.assertEqual(self.writer.execute('SELECT count(*) FROM receipts').fetchone()[0], 2)

    def test_cancelled_backup_cleans_only_its_new_directory(self):
        before = self.writer.execute('SELECT * FROM players').fetchall()
        with patch.object(backup, 'snapshot', side_effect=InterruptedError('controlled cancellation')):
            with self.assertRaises(InterruptedError):
                self.made()
        self.assertFalse(self.output.exists())
        self.assertEqual(self.writer.execute('SELECT * FROM players').fetchall(), before)

    def test_atomic_no_clobber_race_preserves_winner_and_cleans_staging(self):
        self.made()
        target = self.root / 'race.db'
        link = os.link
        def occupied(source, destination):
            target.write_bytes(b'concurrent-owner')
            return link(source, destination)
        with patch.object(backup.os, 'link', side_effect=occupied):
            with self.assertRaises(FileExistsError):
                backup.restore_database(self.output, target)
        self.assertEqual(target.read_bytes(), b'concurrent-owner')
        self.assertEqual(list(self.root.glob('.realquest-restore-*')), [])

    def test_failed_directory_sync_removes_only_own_new_link(self):
        self.made()
        target = self.root / 'failed.db'
        with patch.object(backup, 'sync_directory', side_effect=OSError('controlled fsync failure')):
            with self.assertRaises(OSError):
                backup.restore_database(self.output, target)
        self.assertFalse(target.exists())
        self.assertEqual(list(self.root.glob('.realquest-restore-*')), [])
        backup.verify_backup(self.output)


if __name__ == '__main__':
    unittest.main()
