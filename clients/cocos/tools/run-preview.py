"""Start an existing Cocos build with an explicit local save and owned API/proxy lifecycle."""
import argparse
from contextlib import contextmanager
import fcntl
import json
import math
import os
from pathlib import Path
import signal
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[3]
BACKEND_PYTHON = ROOT / 'backend/.venv/bin/python'


class PreviewError(RuntimeError):
    pass


def positive_seconds(value):
    number = float(value)
    if not math.isfinite(number) or number <= 0:
        raise argparse.ArgumentTypeError('Timeout must be a finite positive number.')
    return number


def arguments(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Read-only preflight; do not install, migrate, create files or start services')
    parser.add_argument('--port', type=int, default=os.environ.get('REALQUEST_COCOS_PORT', '5443'))
    parser.add_argument('--api-port', type=int, default=os.environ.get('REALQUEST_COCOS_API_PORT', '8143'))
    parser.add_argument('--build', default=os.environ.get('REALQUEST_COCOS_PREVIEW_BUILD', 'web-current/web-desktop'), help='Existing build relative to clients/cocos (default current build); no build or hot reload')
    parser.add_argument('--database', default=os.environ.get('REALQUEST_COCOS_DATABASE', 'output/cocos-local/local-preview.db'), help='SQLite path relative to repository or absolute; local development save')
    parser.add_argument('--cookie-name', default=os.environ.get('REALQUEST_COCOS_COOKIE', 'realquest_cocos'))
    parser.add_argument('--ready-file', help='New JSON file inside output; written only after all services respond')
    parser.add_argument('--startup-timeout', type=positive_seconds, default=45)
    parser.add_argument('--migration-timeout', type=positive_seconds, default=90)
    return parser.parse_args(argv)


def check_port(port):
    if not 1 <= port <= 65535:
        raise PreviewError('Ports must be in 1–65535.')
    with socket.socket() as check:
        check.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            check.bind(('127.0.0.1', port))
        except OSError as error:
            raise PreviewError(f'Port {port} is unavailable; existing processes were preserved ({error.strerror}).') from error


def lease_path(database):
    return database.with_name(database.name + '.preview.lock')


@contextmanager
def database_lease(database, check_only=False):
    """An advisory lease shared by these launchers; never trust stale PID text."""
    lock = lease_path(database)
    if check_only and not os.path.lexists(lock):
        yield
        return
    flags = os.O_RDONLY if check_only else os.O_RDWR | os.O_CREAT
    fd = os.open(lock, flags | os.O_NOFOLLOW, 0o600)
    try:
        try:
            fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as error:
            raise PreviewError('This database is already owned by another preview launcher; stop that launcher first.') from error
        if not check_only:
            os.ftruncate(fd, 0)
            os.write(fd, json.dumps({'pid': os.getpid(), 'repository': str(ROOT), 'database': str(database)}).encode())
        yield
    finally:
        os.close(fd)
    # Retain the inert inode: unlinking it could permit concurrent locks on two files.


def preflight(args):
    if not BACKEND_PYTHON.is_file():
        raise PreviewError('Prepare backend/.venv with Python3.14 and requirements.lock.txt; see README.')
    build = (ROOT / 'clients/cocos' / args.build).resolve()
    if not build.is_relative_to(ROOT / 'clients/cocos') or not (build / 'index.html').is_file():
        raise PreviewError('Build must be an existing Cocos Web package inside clients/cocos; run cocos:build first.')
    ports = [args.port, args.api_port]
    if len(set(ports)) != len(ports):
        raise PreviewError('Preview ports must be distinct.')
    if not args.cookie_name or not args.cookie_name.isascii() or not args.cookie_name.replace('_', '').isalnum():
        raise PreviewError('Cookie name must contain only ASCII letters, numbers or underscores.')
    selected = ROOT / args.database
    if selected.is_symlink():
        raise PreviewError('Select the real database path, not a database symlink.')
    database = selected.resolve()
    if database.exists():
        if not database.is_file():
            raise PreviewError('Database must be a regular SQLite file.')
        with database.open('rb') as source:
            if source.read(16) != b'SQLite format 3\x00':
                raise PreviewError('Existing database is not SQLite; preserved without migration.')
    ancestor = database.parent
    while not ancestor.exists():
        ancestor = ancestor.parent
    if not ancestor.is_dir():
        raise PreviewError('Database parent must be a directory.')
    ready = (ROOT / args.ready_file).resolve() if args.ready_file else None
    if ready and (not ready.is_relative_to(ROOT / 'output') or ready.exists()):
        raise PreviewError('Ready file must be a new file inside output.')
    for package in [build]:
        if database.is_relative_to(package):
            raise PreviewError('Database must not be inside a publicly served package.')
    if os.environ.get('REALQUEST_COCOS_TEST_CONFIG'):
        from test_guard import assert_launch_fixture
        assert_launch_fixture(database, build, args.port, args.api_port, ready)
    for port in ports:
        check_port(port)
    with database_lease(database, check_only=True):
        pass
    return {'kind': 'cocos-local-preview', 'build': str(build), 'database': str(database),
            'databaseExists': database.exists(), 'backendPython': str(BACKEND_PYTHON),
            'port': args.port, 'api_port': args.api_port, 'cookie': args.cookie_name,
            'origins': [f'http://127.0.0.1:{port}' for port in [args.port]],
            'ready_file': str(ready) if ready else None,
            'inheritedDatabaseURLIgnored': 'DATABASE_URL' in os.environ}


class OwnedProcesses:
    def __init__(self):
        self.children = []

    def start(self, command, *, cwd, env, **options):
        child = subprocess.Popen(command, cwd=cwd, env=env, **options)
        self.children.append(child)
        return child

    def run(self, command, *, cwd, env, timeout, capture=False):
        child = self.start(command, cwd=cwd, env=env,
                           stdout=subprocess.PIPE if capture else None,
                           stderr=subprocess.PIPE if capture else None, text=True)
        try:
            stdout, stderr = child.communicate(timeout=timeout)
        except subprocess.TimeoutExpired as error:
            raise PreviewError('Owned setup process timed out; stopping it before exit.') from error
        if child.returncode:
            # Dependency diagnostics are safe and contain no environment/token dump.
            raise PreviewError((stderr or '').strip() if capture else f'Setup process failed ({child.returncode}).')
        return stdout

    def close(self):
        previous = {sig: signal.signal(sig, signal.SIG_IGN) for sig in [signal.SIGINT, signal.SIGTERM]}
        try:
            for child in self.children:
                if child.poll() is None:
                    child.terminate()
            deadline = time.monotonic() + 8
            for child in self.children:
                try:
                    child.wait(timeout=max(0.01, deadline - time.monotonic()))
                except subprocess.TimeoutExpired:
                    print(f'Owned process {child.pid} did not exit after SIGTERM; terminating it.', file=sys.stderr)
                    child.kill()
                    child.wait(timeout=3)
        finally:
            for sig, handler in previous.items():
                signal.signal(sig, handler)


def check_dependencies(owned, env):
    code = (
        'import importlib.metadata as m,pathlib,sys; '
        'assert sys.version_info >= (3,14), "Backend requires Python3.14"; '
        f'rows=pathlib.Path({str(ROOT / "backend/requirements.lock.txt")!r}).read_text().splitlines(); '
        'assert all(m.version(name)==version for name,version in '
        '(row.split("==",1) for row in rows if row.strip() and not row.startswith("#"))), '
        '"Backend dependencies differ from requirements.lock.txt; install the lock before starting"'
    )
    owned.run([str(BACKEND_PYTHON), '-B', '-c', code], cwd=ROOT / 'backend', env=env, timeout=20, capture=True)


def wait_ready(services, urls, timeout):
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    deadline = time.monotonic() + timeout
    pending = set(urls)
    while pending and time.monotonic() < deadline:
        if any(child.poll() is not None for child in services):
            raise PreviewError('An owned service exited before readiness; stopping its siblings.')
        for url in list(pending):
            try:
                with opener.open(url, timeout=min(1, max(0.01, deadline - time.monotonic()))) as response:
                    if response.status == 200:
                        if url.endswith('/api/health') and json.load(response).get('status') != 'ok':
                            continue
                        pending.remove(url)
            except (urllib.error.URLError, TimeoutError, OSError, ValueError):
                pass
        if pending:
            time.sleep(0.1)
    if pending or any(child.poll() is not None for child in services):
        raise PreviewError('Owned services did not become ready before the startup deadline.')


def interrupted(_signal, _frame):
    raise KeyboardInterrupt


def main(argv=None):
    args = arguments(argv)
    owned = OwnedProcesses()
    previous = {sig: signal.signal(sig, interrupted) for sig in [signal.SIGINT, signal.SIGTERM]}
    try:
        plan = preflight(args)
        env = {**os.environ, 'DATABASE_URL': 'sqlite:///' + plan['database'],
               'SESSION_COOKIE_NAME': plan['cookie'], 'ALLOWED_ORIGINS': ','.join(plan['origins'])}
        check_dependencies(owned, env)
        print(json.dumps({**plan, 'checkOnly': args.check}, ensure_ascii=False), flush=True)
        if args.check:
            return 0
        database = Path(plan['database'])
        database.parent.mkdir(parents=True, exist_ok=True)
        with database_lease(database):
            try:
                owned.run([str(BACKEND_PYTHON), '-m', 'alembic', 'upgrade', 'head'],
                          cwd=ROOT / 'backend', env=env, timeout=args.migration_timeout)
                services = [owned.start([str(BACKEND_PYTHON), '-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', str(args.api_port)], cwd=ROOT / 'backend', env=env)]
                proxy = ROOT / 'clients/cocos/tools/serve.py'
                services.append(owned.start([sys.executable, str(proxy), '--port', str(args.port), '--api-port', str(args.api_port), '--build', plan['build']], cwd=ROOT, env=env))
                urls = [f'http://127.0.0.1:{args.api_port}/api/health', f'http://127.0.0.1:{args.port}/', f'http://127.0.0.1:{args.port}/api/health']
                wait_ready(services, urls, args.startup_timeout)
                if plan['ready_file']:
                    ready = Path(plan['ready_file'])
                    ready.parent.mkdir(parents=True, exist_ok=True)
                    fd = os.open(ready, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
                    with os.fdopen(fd, 'w') as output:
                        json.dump({**plan, 'state': 'ready', 'pid': os.getpid(), 'parent_pid': os.getppid(),
                                   'children': [p.pid for p in services], 'run_id': os.environ.get('REALQUEST_TEST_RUN_ID')}, output)
                print(f'Cocos ready: http://127.0.0.1:{args.port} — database: {database}; Ctrl+C stops owned services.', flush=True)
                while all(child.poll() is None for child in services):
                    time.sleep(0.25)
                raise PreviewError('An owned service exited; stopping its siblings.')
            finally:
                # Hold the lease through migration/startup cancellation and API exit.
                owned.close()
        return 0
    except KeyboardInterrupt:
        return 0
    except (PreviewError, OSError, ValueError, AssertionError) as error:
        print(f'Preview failed: {error}', file=sys.stderr)
        return 1
    finally:
        owned.close()
        for sig, handler in previous.items():
            signal.signal(sig, handler)


if __name__ == '__main__':
    raise SystemExit(main())
