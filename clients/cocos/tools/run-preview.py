"""Own the prototype API/proxy lifecycle; keep the original Web runtime separate."""
import argparse
import os
from pathlib import Path
import signal
import socket
import subprocess
import sys
import time

root = Path(__file__).resolve().parents[3]
python = root / 'backend/.venv/bin/python'
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--port',type=int,default=5422)
parser.add_argument('--api-port',type=int,default=8122)
args=parser.parse_args()
database = root / 'output/cocos-phase23/local-preview.db'
if not python.is_file():
    raise SystemExit('Prepare backend/.venv using the existing README first.')
if not (root / 'clients/cocos/web-phase23/web-desktop/index.html').is_file():
    raise SystemExit('Run the Cocos Web build first; see clients/cocos/README.md.')
for port in (args.port, args.api_port):
    with socket.socket() as check:
        # Match HTTPServer/uvicorn reuse semantics: a closed test listener may
        # leave TIME_WAIT connections, which are not an occupied service.
        check.setsockopt(socket.SOL_SOCKET,socket.SO_REUSEADDR,1)
        try:
            check.bind(('127.0.0.1', port))
        except OSError:
            raise SystemExit(f'Port {port} is already in use; existing processes were preserved.')
database.parent.mkdir(parents=True, exist_ok=True)
env = {**os.environ, 'DATABASE_URL': 'sqlite:///' + str(database), 'SESSION_COOKIE_NAME': 'realquest_cocos_local', 'ALLOWED_ORIGINS': f'http://127.0.0.1:{args.port}'}
subprocess.run([str(python), '-m', 'alembic', 'upgrade', 'head'], cwd=root / 'backend', env=env, check=True)
children = []


def stop(_signal, _frame):
    raise KeyboardInterrupt


signal.signal(signal.SIGTERM, stop)
signal.signal(signal.SIGINT, stop)
try:
    children.append(subprocess.Popen([str(python), '-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', str(args.api_port)], cwd=root / 'backend', env=env))
    children.append(subprocess.Popen([sys.executable, str(root / 'clients/cocos/tools/serve.py'), '--port', str(args.port), '--api-port', str(args.api_port), '--build', 'web-phase23/web-desktop'], cwd=root, env=env))
    print(f'Preview: http://127.0.0.1:{args.port} — isolated prototype saves; Ctrl+C stops both services.', flush=True)
    while all(p.poll() is None for p in children):
        time.sleep(0.5)
except KeyboardInterrupt:
    pass
finally:
    for child in children:
        if child.poll() is None:
            child.terminate()
    for child in children:
        try:
            child.wait(timeout=8)
        except subprocess.TimeoutExpired:
            print(f'Process {child.pid} did not exit; inspect this exact process before cleanup.', file=sys.stderr)
