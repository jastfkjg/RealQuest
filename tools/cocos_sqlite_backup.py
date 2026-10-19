"""Private SQLite backups and verified restore to a new file; no source writes."""
import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
import shutil
import signal
import sqlite3
import tempfile
import time
from datetime import datetime, timezone


def encoded(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True,
                      separators=(',', ':'), allow_nan=False).encode('utf8')


def digest(value):
    return hashlib.sha256(value).hexdigest()


def file_digest(file):
    with file.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


def safe_path(value, *, exists=True, directory=False):
    path = Path(value).absolute()
    if path.resolve(strict=exists) != path or path.is_symlink():
        raise ValueError('Use a real path without symlink ancestors')
    if exists and (not path.is_dir() if directory else not path.is_file()):
        raise ValueError('Expected a regular directory' if directory else 'Expected a regular database file')
    if not exists:
        safe_path(path.parent, directory=True)
        if os.path.lexists(path):
            raise FileExistsError('Destination already exists; preserved without overwrite')
    return path


def read_connection(file):
    connection = sqlite3.connect(file.as_uri() + '?mode=ro', uri=True,
                                 timeout=1, isolation_level=None)
    try:
        connection.execute('PRAGMA query_only=ON')
        connection.execute('PRAGMA trusted_schema=OFF')
        return connection
    except BaseException:
        connection.close()
        raise


def snapshot(connection):
    """Hash every table/schema in one read transaction, including duplicate rows."""
    owned = not connection.in_transaction
    if owned:
        connection.execute('BEGIN')
    try:
        if connection.execute('PRAGMA integrity_check').fetchall() != [('ok',)]:
            raise ValueError('SQLite integrity check failed')
        if connection.execute('PRAGMA foreign_key_check').fetchall():
            raise ValueError('SQLite foreign-key check failed')
        schema = connection.execute('SELECT type,name,tbl_name,sql FROM sqlite_master ORDER BY type,name').fetchall()
        names = [row[0] for row in connection.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")]
        if not {'players', 'receipts'}.issubset(names):
            raise ValueError('Not a RealQuest database: missing players/receipts')
        tables = []
        for name in names:
            quoted = '"' + name.replace('"', '""') + '"'
            cursor = connection.execute('SELECT * FROM ' + quoted)
            columns = [column[0] for column in cursor.description]
            if name == 'players' and not {'id', 'token_hash', 'state'}.issubset(columns):
                raise ValueError('Unrecognized RealQuest players schema')
            hashes = []
            for row in cursor:
                values = [{'sqlite_blob': base64.b64encode(value).decode('ascii')} if isinstance(value, bytes)
                          else {'sqlite_float': value.hex()} if isinstance(value, float) else value for value in row]
                hashes.append(digest(encoded(values)))
            tables.append({'name': name, 'columns': columns, 'rows': len(hashes),
                           'sha256': digest(encoded(sorted(hashes)))})
        versions = [row[0] for row in connection.execute('SELECT version_num FROM alembic_version ORDER BY version_num')] if 'alembic_version' in names else []
        result = {'schemaSHA256': digest(encoded(schema)), 'tables': tables,
                  'migrations': versions,
                  'userVersion': connection.execute('PRAGMA user_version').fetchone()[0],
                  'applicationId': connection.execute('PRAGMA application_id').fetchone()[0]}
        return {**result, 'sha256': digest(encoded(result))}
    finally:
        if owned:
            connection.rollback()


def inspect_database(database):
    file = safe_path(database)
    connection = read_connection(file)
    try:
        result = snapshot(connection)
        return {'snapshot': result, 'journalMode': connection.execute('PRAGMA journal_mode').fetchone()[0]}
    finally:
        connection.close()


def sync_file(file):
    with file.open('rb') as handle:
        os.fsync(handle.fileno())


def sync_directory(directory):
    fd = os.open(directory, os.O_RDONLY)
    try:
        os.fsync(fd)
    finally:
        os.close(fd)


def backup_database(database, output, timeout=60):
    source_file, target = safe_path(database), safe_path(output, exists=False)
    source = read_connection(source_file)
    allocated = False
    try:
        journal = source.execute('PRAGMA journal_mode').fetchone()[0]
        wal = Path(str(source_file) + '-wal')
        wal_bytes = wal.stat().st_size if wal.exists() else 0
        target.mkdir(mode=0o700)
        allocated = True
        destination = target / 'database.sqlite'
        fd = os.open(destination, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
        os.close(fd)
        deadline = time.monotonic() + timeout
        def progress(status, remaining, total):
            if time.monotonic() > deadline:
                raise TimeoutError('SQLite backup timed out; source preserved')
        copy = sqlite3.connect(destination, isolation_level=None)
        try:
            source.backup(copy, pages=128, progress=progress, sleep=0.05)
            # Make the artifact independent of any WAL/SHM companion files.
            if copy.execute('PRAGMA journal_mode=DELETE').fetchone()[0] != 'delete':
                raise ValueError('Backup could not be made standalone')
            state = snapshot(copy)
        finally:
            copy.close()
        sync_file(destination)
        manifest = {'format': 'realquest-sqlite-backup', 'version': 1,
                    'createdAt': datetime.now(timezone.utc).isoformat(),
                    'sourceName': source_file.name,
                    'sourceStorage': {'journalMode': journal, 'walBytesAtStart': wal_bytes},
                    'database': {'file': 'database.sqlite', 'bytes': destination.stat().st_size,
                                 'sha256': file_digest(destination)}, 'snapshot': state}
        with (target / 'manifest.json').open('x', encoding='utf8') as handle:
            json.dump(manifest, handle, ensure_ascii=False, indent=2)
            handle.write('\n')
            handle.flush()
            os.fsync(handle.fileno())
        os.chmod(target / 'manifest.json', 0o600)
        sync_directory(target)
        verify_backup(target)
        return {'operation': 'backup', 'directory': str(target), **manifest}
    except BaseException:
        if allocated:
            shutil.rmtree(target)
        raise
    finally:
        source.close()


def verify_backup(directory):
    folder = safe_path(directory, directory=True)
    if sorted(path.name for path in folder.iterdir()) != ['database.sqlite', 'manifest.json']:
        raise ValueError('Backup must contain exactly its standalone database and manifest')
    manifest_file = safe_path(folder / 'manifest.json')
    manifest = json.loads(manifest_file.read_text(encoding='utf8'))
    if manifest.get('format') != 'realquest-sqlite-backup' or manifest.get('version') != 1:
        raise ValueError('Unsupported SQLite backup manifest')
    record = manifest.get('database', {})
    if record.get('file') != 'database.sqlite':
        raise ValueError('Unsafe backup database path')
    file = safe_path(folder / 'database.sqlite')
    if file.stat().st_size != record.get('bytes') or file_digest(file) != record.get('sha256'):
        raise ValueError('Backup database bytes changed or are incomplete')
    inspected = inspect_database(file)
    if inspected['journalMode'] != 'delete' or inspected['snapshot'] != manifest.get('snapshot'):
        raise ValueError('Backup schema/table fingerprint mismatch')
    return manifest


def restore_database(directory, destination):
    target = safe_path(destination, exists=False)
    folder = safe_path(directory, directory=True)
    manifest = verify_backup(folder)
    fd, temporary = tempfile.mkstemp(prefix='.realquest-restore-', suffix='.sqlite', dir=target.parent)
    temporary = Path(temporary)
    linked = False
    try:
        with os.fdopen(fd, 'wb') as copy, (folder / 'database.sqlite').open('rb') as source:
            shutil.copyfileobj(source, copy)
            copy.flush()
            os.fsync(copy.fileno())
        if file_digest(temporary) != manifest['database']['sha256'] or inspect_database(temporary)['snapshot'] != manifest['snapshot']:
            raise ValueError('Staged restore differs from the verified backup')
        # Atomic no-clobber activation. An existing file is never replaced.
        os.link(temporary, target)
        linked = True
        sync_directory(target.parent)
        return {'operation': 'restore', 'database': str(target), 'snapshot': manifest['snapshot']}
    except BaseException:
        if linked and target.exists() and target.samefile(temporary):
            target.unlink()
        raise
    finally:
        temporary.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='operation', required=True)
    backup = sub.add_parser('backup')
    backup.add_argument('--database', required=True)
    backup.add_argument('--output', required=True)
    backup.add_argument('--timeout-seconds', type=int, default=60, choices=range(1, 301))
    verify = sub.add_parser('verify')
    verify.add_argument('--backup', required=True)
    restore = sub.add_parser('restore')
    restore.add_argument('--backup', required=True)
    restore.add_argument('--destination', required=True)
    inspect = sub.add_parser('inspect')
    inspect.add_argument('--database', required=True)
    args = parser.parse_args()
    def interrupted(signum, frame):
        raise InterruptedError('SQLite operation cancelled; existing files preserved')
    for signum in [signal.SIGINT, signal.SIGTERM]:
        signal.signal(signum, interrupted)
    try:
        if args.operation == 'backup':
            result = backup_database(args.database, args.output, args.timeout_seconds)
        elif args.operation == 'verify':
            result = {'operation': 'verify', **verify_backup(args.backup)}
        elif args.operation == 'restore':
            result = restore_database(args.backup, args.destination)
        else:
            result = {'operation': 'inspect', **inspect_database(args.database)}
        print(json.dumps(result, ensure_ascii=False))
        return 0
    except (OSError, ValueError, sqlite3.Error) as error:
        print(json.dumps({'operation': args.operation, 'error': str(error)}, ensure_ascii=False))
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
