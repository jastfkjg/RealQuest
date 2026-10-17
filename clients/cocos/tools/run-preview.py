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
parser.add_argument('--port',type=int,default=5431)
parser.add_argument('--api-port',type=int,default=8130)
parser.add_argument('--web-port',type=int,help='Also serve the existing Web build against this isolated API')
parser.add_argument('--database',default='output/cave-polish/local-preview.db',help='Preview database; default preserves the previous local sample')
args=parser.parse_args()
database = (root / args.database).resolve()
if not python.is_file():
    raise SystemExit('Prepare backend/.venv using the existing README first.')
if not (root / 'clients/cocos/web-village-polish/web-desktop/index.html').is_file():
    raise SystemExit('Run the Cocos Web build first; see clients/cocos/README.md.')
ports=[args.port,args.api_port]+([args.web_port] if args.web_port else [])
if len(set(ports)) != len(ports):
    raise SystemExit('Preview ports must be distinct.')
if args.web_port and not (root / 'frontend/dist/index.html').is_file():
    raise SystemExit('Build the existing frontend first: cd frontend && npm run build')
for port in ports:
    with socket.socket() as check:
        # Match HTTPServer/uvicorn reuse semantics: a closed test listener may
        # leave TIME_WAIT connections, which are not an occupied service.
        check.setsockopt(socket.SOL_SOCKET,socket.SO_REUSEADDR,1)
        try:
            check.bind(('127.0.0.1', port))
        except OSError:
            raise SystemExit(f'Port {port} is already in use; existing processes were preserved.')
database.parent.mkdir(parents=True, exist_ok=True)
origins=','.join(f'http://127.0.0.1:{port}' for port in [args.port,args.web_port] if port)
env = {**os.environ, 'DATABASE_URL': 'sqlite:///' + str(database), 'SESSION_COOKIE_NAME': 'realquest_polish_local', 'ALLOWED_ORIGINS': origins}
subprocess.run([str(python), '-m', 'alembic', 'upgrade', 'head'], cwd=root / 'backend', env=env, check=True)
children = []


def stop(_signal, _frame):
    raise KeyboardInterrupt


signal.signal(signal.SIGTERM, stop)
signal.signal(signal.SIGINT, stop)
try:
    children.append(subprocess.Popen([str(python), '-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', str(args.api_port)], cwd=root / 'backend', env=env))
    children.append(subprocess.Popen([sys.executable, str(root / 'clients/cocos/tools/serve.py'), '--port', str(args.port), '--api-port', str(args.api_port), '--build', 'web-village-polish/web-desktop'], cwd=root, env=env))
    if args.web_port:
        children.append(subprocess.Popen([sys.executable, str(root / 'clients/cocos/tools/serve.py'), '--port', str(args.web_port), '--api-port', str(args.api_port), '--build', '../../frontend/dist'], cwd=root, env=env))
        print(f'Web: http://127.0.0.1:{args.web_port}',flush=True)
    print(f'Cocos: http://127.0.0.1:{args.port} — isolated prototype saves; Ctrl+C stops owned services.', flush=True)
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
