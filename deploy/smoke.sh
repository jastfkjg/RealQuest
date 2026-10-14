#!/usr/bin/env bash
# Isolated PostgreSQL + API + Nginx check, with no host ports or production volumes.
set -euo pipefail
umask 077
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)
temporary=$(mktemp -d)
project="rq-check-$(basename "$temporary" | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9-')"
frontend_image="$project-frontend"
backend_image="$project-backend"
compose() { docker compose --project-name "$project" -f "$temporary/compose.json" "$@"; }
cleanup() {
    local smoke_exit_code=$?
    trap - EXIT
    if [[ -f "$temporary/compose.json" ]]; then compose down --volumes --remove-orphans --timeout 5 >/dev/null || true; fi
    docker image rm "$frontend_image" "$backend_image" >/dev/null 2>&1 || true
    rm -rf "$temporary"
    exit "$smoke_exit_code"
}
trap cleanup EXIT
docker build -f "$root/frontend/Dockerfile" -t "$frontend_image" "$root"
docker build -t "$backend_image" "$root/backend"
export REALQUEST_FRONTEND_IMAGE="$frontend_image" REALQUEST_BACKEND_IMAGE="$backend_image"
export POSTGRES_PASSWORD=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
export COOKIE_SECURE=true ALLOWED_ORIGINS=https://realquest.test
docker compose -f "$root/deploy/compose.prod.yaml" config --format json > "$temporary/rendered.json"
python3 - "$temporary/rendered.json" "$temporary/compose.json" "$project" <<'CONFIG'
import json, sys
from pathlib import Path
config = json.loads(Path(sys.argv[1]).read_text())
project = sys.argv[3]
config['name'] = project
config['volumes']['postgres_data']['name'] = project + '-postgres-data'
config['networks']['default']['name'] = project + '-private'
config['networks']['proxy'] = {'name': project + '-proxy'}
Path(sys.argv[2]).write_text(json.dumps(config))
CONFIG
compose up -d --wait --wait-timeout 120 db
compose run --rm --no-deps -T backend alembic upgrade head
compose up -d --no-deps --wait --wait-timeout 120 backend frontend
compose exec -T backend python - > "$temporary/session.json" <<'SESSION'
import json, uuid
from urllib.request import Request, urlopen
with urlopen(Request('http://frontend/api/session', data=b'{}', headers={'Content-Type': 'application/json', 'Origin': 'https://realquest.test'})) as response:
    cookie = response.headers['Set-Cookie']
    assert 'Secure' in cookie and 'HttpOnly' in cookie and 'SameSite=strict' in cookie
    session = json.load(response)
headers = {'Content-Type': 'application/json', 'Origin': 'https://realquest.test', 'Cookie': cookie.split(';')[0]}
command = {'request_id': str(uuid.uuid4()), 'action': 'create', 'data': {'name': '部署验证旅人', 'appearance': 1}, 'save_id': session['save_id']}
with urlopen(Request('http://frontend/api/command', data=json.dumps(command).encode(), headers=headers)) as response:
    saved = json.load(response)
with urlopen(Request('http://frontend/api/recovery-file', data=b'{}', headers=headers)) as response:
    recovery = json.load(response)
print(json.dumps({'cookie': cookie.split(';')[0], 'save_id': session['save_id'], 'state': saved['state'], 'recovery_key': recovery['recovery_key']}))
SESSION
compose restart backend frontend
compose up -d --no-deps --wait --wait-timeout 120 backend frontend
compose exec -T -e "TEST_SESSION=$(cat "$temporary/session.json")" backend python - <<'PERSISTENCE'
import json, os
from urllib.request import Request, urlopen
from urllib.error import HTTPError
saved = json.loads(os.environ['TEST_SESSION'])
with urlopen(Request('http://frontend/api/state', headers={'Cookie': saved['cookie']})) as response:
    restored = json.load(response)
assert restored['save_id'] == saved['save_id'] and restored['state'] == saved['state']
with urlopen('http://frontend/api/health') as response:
    assert json.load(response)['status'] == 'ok'
with urlopen(Request('http://frontend/api/recover', data=json.dumps({'recovery_key': saved['recovery_key']}).encode(), headers={'Content-Type': 'application/json', 'Origin': 'https://realquest.test'})) as response:
    assert json.load(response)['restored'] is True
    recovered_cookie = response.headers['Set-Cookie'].split(';')[0]
with urlopen(Request('http://frontend/api/state', headers={'Cookie': recovered_cookie})) as response:
    assert json.load(response)['save_id'] == saved['save_id']
try:
    urlopen(Request('http://frontend/api/session', data=b'{}', headers={'Origin': 'https://untrusted.test'}))
except HTTPError as error:
    assert error.code == 403
else:
    raise AssertionError('Cross-origin write was accepted')
PERSISTENCE
compose exec -T db pg_dump -U realquest -d realquest --format=custom > "$temporary/backup.dump"
compose exec -T db pg_restore --list < "$temporary/backup.dump" >/dev/null
compose exec -T db psql -U realquest -d postgres -c 'CREATE DATABASE realquest_restore_check' >/dev/null
compose exec -T db pg_restore --exit-on-error -U realquest -d realquest_restore_check < "$temporary/backup.dump"
restored_players=$(compose exec -T db psql -U realquest -d realquest_restore_check -Atqc 'SELECT count(*) FROM players')
[[ "$restored_players" == 1 ]]
restored_keys=$(compose exec -T db psql -U realquest -d realquest_restore_check -Atqc 'SELECT count(*) FROM recovery_keys')
[[ "$restored_keys" == 1 ]]
printf 'PostgreSQL migration, Nginx/API, secure session, restart persistence and dump/restore checks passed.\n'
