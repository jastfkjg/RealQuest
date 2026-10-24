"""Unit and real-process checks for the local launcher; never use a manual/player DB."""
import argparse
from contextlib import closing, redirect_stdout
import hashlib
import http.cookiejar
import importlib.util
import io
import json
import os
from pathlib import Path
import shutil
import signal
import socket
import sqlite3
import subprocess
import sys
import tempfile
import time
import unittest
from unittest.mock import patch
import urllib.request

ROOT = Path(__file__).resolve().parents[3]
SPEC = importlib.util.spec_from_file_location('preview', Path(__file__).with_name('run-preview.py'))
preview = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(preview)
OUTPUT = ROOT / 'output/cocos-startup'


class PreflightTests(unittest.TestCase):
    def setUp(self):
        OUTPUT.mkdir(parents=True, exist_ok=True)
        self.temp = tempfile.TemporaryDirectory(prefix='unit-', dir=OUTPUT)
        self.directory = Path(self.temp.name)
        self.build = ROOT / 'clients/cocos' / ('test-preview-' + self.directory.name)
        self.build.mkdir()
        (self.build / 'index.html').write_text('fixture')
        self.database = self.directory / 'saves/new.db'
        self.args = preview.arguments(['--build', str(self.build), '--database', str(self.database)])
        self.ports = patch.object(preview, 'check_port')
        self.ports.start()
        self.build_guard = patch.object(preview, 'verify_build')
        self.build_guard.start()

    def tearDown(self):
        self.build_guard.stop()
        self.ports.stop()
        shutil.rmtree(self.build)
        self.temp.cleanup()

    def test_new_database_preflight_creates_nothing(self):
        before = sorted(self.directory.rglob('*'))
        plan = preview.preflight(self.args)
        self.assertFalse(plan['databaseExists'])
        self.assertEqual(plan['database'], str(self.database))
        self.assertEqual(sorted(self.directory.rglob('*')), before)

    def test_check_command_creates_no_database_lock_ready_or_parent(self):
        self.args.check = True
        self.args.ready_file = str(self.directory / 'new/ready.json')
        with patch.object(preview, 'arguments', return_value=self.args), patch.object(preview, 'check_dependencies'), redirect_stdout(io.StringIO()):
            self.assertEqual(preview.main(), 0)
        self.assertEqual(list(self.directory.iterdir()), [])

    def test_invalid_ports_and_same_port(self):
        self.args.api_port = self.args.port
        with self.assertRaises(preview.PreviewError):
            preview.preflight(self.args)
        self.ports.stop()
        try:
            for port in [0, -1, 65536]:
                with self.assertRaises(preview.PreviewError):
                    preview.check_port(port)
        finally:
            self.ports.start()

    def test_invalid_build_does_not_create_database_parent(self):
        self.args.build = 'missing-preview-package/web-desktop'
        with self.assertRaises(preview.PreviewError):
            preview.preflight(self.args)
        self.assertFalse(self.database.parent.exists())

    def test_missing_receipt_blocks_start_before_save_is_created(self):
        self.build_guard.stop()
        with self.assertRaisesRegex(preview.PreviewError, 'no current-source receipt'):
            preview.preflight(self.args)
        self.assertFalse(self.database.parent.exists())

    def test_stale_build_blocks_start_and_preserves_existing_save(self):
        self.build_guard.stop()
        (self.build / 'realquest-build.json').write_text(json.dumps({
            'schema_version': 1,
            'source': {'identity': {'platform': 'web-desktop', 'debug': False,
                                    'sourceMaps': False}, 'sha256': 'outdated-client'},
        }))
        self.database.parent.mkdir()
        with closing(sqlite3.connect(self.database)) as db:
            db.execute('create table retained(value text)')
            db.execute("insert into retained values ('player-progress')")
            db.commit()
        before = self.database.read_bytes()
        with self.assertRaisesRegex(preview.PreviewError, 'stale relative to current Cocos'):
            preview.preflight(self.args)
        self.assertEqual(self.database.read_bytes(), before)
        self.assertFalse(preview.lease_path(self.database).exists())

    def test_existing_non_sqlite_and_symlink_preserved(self):
        self.database.parent.mkdir()
        self.database.write_bytes(b'not a database')
        with self.assertRaises(preview.PreviewError):
            preview.preflight(self.args)
        self.assertEqual(self.database.read_bytes(), b'not a database')
        self.database.unlink()
        target = self.directory / 'target.db'
        with closing(sqlite3.connect(target)) as db:
            with db:
                db.execute('create table retained(value text)')
        self.database.symlink_to(target)
        before = target.read_bytes()
        with self.assertRaises(preview.PreviewError):
            preview.preflight(self.args)
        self.assertEqual(target.read_bytes(), before)

    def test_database_inside_public_package_rejected(self):
        self.args.database = str(self.build / 'private.db')
        with self.assertRaises(preview.PreviewError):
            preview.preflight(self.args)
        self.assertFalse((self.build / 'private.db').exists())

    def test_ready_file_cannot_replace_existing_or_leave_output(self):
        ready = self.directory / 'ready.json'
        ready.write_text('preserved')
        self.args.ready_file = str(ready)
        with self.assertRaises(preview.PreviewError):
            preview.preflight(self.args)
        self.assertEqual(ready.read_text(), 'preserved')
        self.args.ready_file = str(ROOT / 'ready.json')
        with self.assertRaises(preview.PreviewError):
            preview.preflight(self.args)

    def test_cookie_name_and_timeouts(self):
        for cookie in ['', '中文', 'contains-hyphen']:
            self.args.cookie_name = cookie
            with self.assertRaises(preview.PreviewError):
                preview.preflight(self.args)
        for value in ['0', '-1', 'nan', 'inf']:
            with self.assertRaises(argparse.ArgumentTypeError):
                preview.positive_seconds(value)

    def test_explicit_flags_override_cocos_environment(self):
        with patch.dict(os.environ, {'REALQUEST_COCOS_PORT': '5551', 'REALQUEST_COCOS_API_PORT': '8551', 'REALQUEST_COCOS_DATABASE': str(self.database), 'REALQUEST_COCOS_PREVIEW_BUILD': str(self.build), 'DATABASE_URL': 'do-not-use'}):
            env = preview.arguments([])
            self.assertEqual((env.port, env.api_port), (5551, 8551))
            explicit = preview.arguments(['--port', '5552', '--database', str(self.directory / 'explicit.db')])
            plan = preview.preflight(explicit)
            self.assertEqual(plan['port'], 5552)
            self.assertEqual(plan['database'], str(self.directory / 'explicit.db'))
            self.assertTrue(plan['inheritedDatabaseURLIgnored'])

    def test_existing_sqlite_read_only_and_live_lease(self):
        self.database.parent.mkdir()
        with closing(sqlite3.connect(self.database)) as db:
            with db:
                db.execute('create table retained(value text)')
                db.execute('insert into retained values (?)', ('same bytes',))
        before = self.database.read_bytes()
        self.assertTrue(preview.preflight(self.args)['databaseExists'])
        self.assertEqual(self.database.read_bytes(), before)

        self.assertFalse(preview.lease_path(self.database).exists())
        with preview.database_lease(self.database):
            marker = preview.lease_path(self.database).read_bytes()
            with self.assertRaises(preview.PreviewError):
                preview.preflight(self.args)
            self.assertEqual(preview.lease_path(self.database).read_bytes(), marker)
        self.assertTrue(preview.preflight(self.args)['databaseExists'])
        self.assertEqual(self.database.read_bytes(), before)

    def test_fixture_launch_rejects_wrong_database_before_creation(self):
        from test_guard import assert_launch_fixture
        parent = ROOT / 'output/cocos-regression'
        parent.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(prefix='startup-guard-', dir=parent) as temp:
            run = Path(temp)
            directory = run / 'suites/guard'
            directory.mkdir(parents=True)
            config = {'directory': str(directory), 'runDirectory': str(run), 'suite': 'guard',
                      'runId': 'guard-fixture', 'nonce': 'owned-fixture', 'controllerPID': os.getppid(),
                      'database': str(directory / 'test.db'), 'build': {'directory': str(self.build)},
                      'baseURL': 'http://127.0.0.1:5551', 'apiURL': 'http://127.0.0.1:8551'}
            file = directory / 'config.json'
            file.write_text(json.dumps(config))
            (run / 'run.json').write_text(json.dumps(config))
            with patch.dict(os.environ, {'REALQUEST_COCOS_TEST_CONFIG': str(file), 'REALQUEST_TEST_RUN_ID': config['runId']}):
                assert_launch_fixture(directory / 'test.db', self.build, 5551, 8551, directory / 'ready.json')
                for database, port, ready in [(self.database, 5551, directory / 'ready.json'),
                                               (directory / 'test.db', 5552, directory / 'ready.json'),
                                               (directory / 'test.db', 5551, self.directory / 'ready.json')]:
                    with self.assertRaises(AssertionError):
                        assert_launch_fixture(database, self.build, port, 8551, ready)
                config['controllerPID'] += 1
                file.write_text(json.dumps(config))
                with self.assertRaises(AssertionError):
                    assert_launch_fixture(directory / 'test.db', self.build, 5551, 8551, directory / 'ready.json')
            self.assertFalse((directory / 'test.db').exists())
            self.assertFalse(self.database.parent.exists())


def free_ports(count):
    sockets = []
    try:
        for _ in range(count):
            sock = socket.socket()
            sock.bind(('127.0.0.1', 0))
            sockets.append(sock)
        return [sock.getsockname()[1] for sock in sockets]
    finally:
        for sock in sockets:
            sock.close()


def alive(pid):
    try:
        os.kill(pid, 0)
        return True
    except ProcessLookupError:
        return False


def fingerprint(database):
    with closing(sqlite3.connect(database.as_uri() + '?mode=ro', uri=True)) as db:
        rows = list(db.iterdump())
    return hashlib.sha256('\n'.join(rows).encode()).hexdigest()


def integration(build):
    OUTPUT.mkdir(parents=True, exist_ok=True)
    directory = Path(tempfile.mkdtemp(prefix='run-', dir=OUTPUT))
    report = {'kind': 'launcher-real-process-not-game-coverage', 'directory': str(directory), 'complete': False, 'checks': [], 'launchers': [], 'children': []}
    current = None
    logs = []
    all_processes = []
    cookie = 'rq_startup_' + directory.name.replace('-', '_')
    clean_env = {k: v for k, v in os.environ.items() if k not in ['REALQUEST_COCOS_TEST_CONFIG', 'REALQUEST_TEST_RUN_ID', 'DATABASE_URL']}
    clean_env['PYTHONDONTWRITEBYTECODE'] = '1'

    def command(database, ports, ready=None, extra=()):
        args = [str(ROOT / 'start.command'), '--build', str(build), '--database', str(database), '--port', str(ports[0]), '--api-port', str(ports[1]), '--cookie-name', cookie]
        if ready:
            args += ['--ready-file', str(ready)]
        return args + list(extra)

    def start(database, ports, name, extra=(), env=None):
        ready = directory / (name + '-ready.json')
        log = (directory / (name + '.log')).open('w')
        logs.append(log)
        proc = subprocess.Popen(command(database, ports, ready, extra), cwd=ROOT, env=env or clean_env, stdout=log, stderr=subprocess.STDOUT)
        all_processes.append(proc)
        report['launchers'].append(proc.pid)
        return proc, ready

    def wait_for(proc, ready):
        deadline = time.monotonic() + 60
        while time.monotonic() < deadline:
            if proc.poll() is not None:
                raise AssertionError(f'Launcher exited before ready: {proc.returncode}; see {directory}')
            try:
                value = json.loads(ready.read_text())
                assert value['state'] == 'ready' and value['pid'] == proc.pid
                assert value['parent_pid'] == os.getpid()
                report['children'].extend(value['children'])
                return value
            except (FileNotFoundError, json.JSONDecodeError):
                time.sleep(0.05)
        raise AssertionError('Launcher readiness deadline exceeded')

    def stop(proc, ready=None):
        if proc.poll() is None:
            proc.terminate()
        proc.wait(timeout=15)
        if ready and ready.exists():
            value = json.loads(ready.read_text())
            assert not any(alive(pid) for pid in value['children']), 'Owned service remained alive'

    def record(name, **evidence):
        report['checks'].append({'name': name, 'passed': True, **evidence})
        (directory / 'result.json').write_text(json.dumps(report, indent=2) + '\n')
        print('PASS ' + name, flush=True)

    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

    def request(origin, path, data=None, headers=None):
        req = urllib.request.Request(origin + path, data=json.dumps(data).encode() if data is not None else None, headers={'Content-Type': 'application/json', 'Origin': origin, **(headers or {})})
        with opener.open(req, timeout=5) as response:
            return json.load(response)

    try:
        ports = free_ports(3)
        database = directory / 'normal/test.db'
        check = subprocess.run(command(database, ports, extra=['--check']), cwd=ROOT, env=clean_env, capture_output=True, text=True, timeout=30)
        assert check.returncode == 0, check.stderr
        assert not database.parent.exists()
        record('check-only-creates-no-database-lock-ready-or-parent')

        occupied = socket.socket()
        try:
            occupied.bind(('127.0.0.1', ports[0]))
            occupied.listen()
            failure = subprocess.run(command(database, ports), cwd=ROOT, env=clean_env, capture_output=True, text=True, timeout=20)
            assert failure.returncode != 0 and not database.parent.exists()
            assert occupied.getsockname()[1] == ports[0]
            record('occupied-port-preserves-listener-and-no-migration')
        finally:
            occupied.close()

        current, ready = start(database, ports, 'normal')
        info = wait_for(current, ready)
        assert info['database'] == str(database) and info['cookie'] == cookie
        origin = f'http://127.0.0.1:{ports[0]}'
        cocos = f'http://127.0.0.1:{ports[0]}'
        assert request(cocos, '/api/health')['status'] == 'ok'
        web = request(origin, '/api/session', {})
        save_id = web['save_id']
        created = request(origin, '/api/command', {'request_id': 'launcher-create', 'save_id': save_id, 'action': 'create', 'data': {'name': '启动接续测试'}})
        assert created['state']['character']['name'] == '启动接续测试'
        old_export = request(origin, '/api/export')
        continued = request(cocos, '/api/client-from-web', {'save_id': save_id})
        assert continued['save_id'] == save_id
        bearer = {'Authorization': 'Bearer ' + continued['session_token']}
        assert request(cocos, '/api/export', headers=bearer) == old_export
        record('actual-readiness-cookie-and-bearer-same-save-and-full-export', saveID=save_id, sameAPI=True)

        lease_before = preview.lease_path(database).read_bytes()
        other_ports = free_ports(3)
        second = subprocess.run(command(database, other_ports), cwd=ROOT, env=clean_env, capture_output=True, text=True, timeout=20)
        assert second.returncode != 0 and 'already owned' in second.stderr
        assert preview.lease_path(database).read_bytes() == lease_before
        assert request(cocos, '/api/health')['status'] == 'ok'
        assert request(cocos, '/api/export', headers=bearer) == old_export
        record('same-database-lease-rejects-second-launcher-preserves-first')

        stop(current, ready)
        assert current.returncode == 0
        before = fingerprint(database)
        readonly = subprocess.run(command(database, ports, extra=['--check']), cwd=ROOT, env=clean_env, capture_output=True, text=True, timeout=30)
        assert readonly.returncode == 0 and fingerprint(database) == before
        record('normal-stop-all-owned-children-exit-and-check-preserves-full-database')
        current, ready = start(database, ports, 'restart')
        info = wait_for(current, ready)
        assert fingerprint(database) == before
        assert request(origin, '/api/state')['save_id'] == save_id
        assert request(cocos, '/api/state', headers=bearer)['save_id'] == save_id
        assert request(cocos, '/api/export', headers=bearer) == old_export
        record('same-database-restart-keeps-full-data-cookie-and-cocos-token')

        os.kill(info['children'][0], signal.SIGTERM)
        current.wait(timeout=15)
        assert current.returncode != 0
        stop(current, ready)
        assert fingerprint(database) == before
        record('unexpected-api-exit-stops-siblings-and-keeps-data')

        fake = directory / 'migration-fixture'
        fake.mkdir()
        marker = fake / 'pid.json'
        (fake / 'alembic.py').write_text('import json,os,time\nfrom pathlib import Path\nPath(' + repr(str(marker)) + ').write_text(json.dumps({"pid":os.getpid()}))\ntime.sleep(120)\n')
        env = {**clean_env, 'PYTHONPATH': str(fake)}
        pending_db = directory / 'cancel/test.db'
        current, ready = start(pending_db, free_ports(3), 'migration-cancel', env=env)
        deadline = time.monotonic() + 20
        while not marker.exists() and time.monotonic() < deadline:
            assert current.poll() is None
            time.sleep(0.05)
        migration_pid = json.loads(marker.read_text())['pid']
        report['children'].append(migration_pid)
        assert not ready.exists()
        stop(current)
        assert not alive(migration_pid) and not pending_db.exists()
        with preview.database_lease(pending_db, check_only=True):
            pass
        record('migration-interruption-closes-owned-process-before-releasing-lease', migrationPID=migration_pid)

        marker.unlink()
        current, ready = start(directory / 'timeout/test.db', free_ports(3), 'migration-timeout', ['--migration-timeout', '0.5'], env)
        current.wait(timeout=20)
        assert current.returncode != 0 and not ready.exists()
        migration_pid = json.loads(marker.read_text())['pid']
        report['children'].append(migration_pid)
        assert not alive(migration_pid)
        record('migration-hard-timeout-cleans-process-and-writes-no-ready', migrationPID=migration_pid)
        report['complete'] = True
    finally:
        for proc in all_processes:
            if proc.poll() is None:
                proc.terminate()
            try:
                proc.wait(timeout=15)
            except subprocess.TimeoutExpired:
                proc.kill()
                proc.wait(timeout=3)
        for log in logs:
            log.close()
        report['launchersExited'] = all(p.poll() is not None for p in all_processes)
        report['childrenExited'] = not any(alive(pid) for pid in report['children'])
        (directory / 'result.json').write_text(json.dumps(report, indent=2) + '\n')
        print('Launcher report: ' + str(directory / 'result.json'), flush=True)
        assert report['launchersExited'] and report['childrenExited'], 'Launcher cleanup failed; inspect exact report PIDs'
    return 0 if report['complete'] else 1


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--unit', action='store_true')
    parser.add_argument('--build')
    args = parser.parse_args()
    if args.unit:
        unittest.main(argv=[sys.argv[0]])
    else:
        if not args.build:
            parser.error('--build is required for real process checks')
        def interrupt(_signal, _frame):
            raise KeyboardInterrupt
        signal.signal(signal.SIGINT, interrupt)
        signal.signal(signal.SIGTERM, interrupt)
        raise SystemExit(integration(Path(args.build).resolve()))
