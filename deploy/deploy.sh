#!/usr/bin/env bash
# Installs only RealQuest; never changes the gateway or deletes a database volume.
set -euo pipefail
umask 077
release=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)
target=${1:?Usage: deploy.sh tencent-prod}
app_root=${REALQUEST_ROOT:-/opt/realquest}
gateway_root=${GATEWAY_ROOT:-/opt/gateway}
[[ "$target" == tencent-prod && -r "$app_root/deployment-target" && "$(cat "$app_root/deployment-target")" == "$target" ]] || { echo 'RealQuest deployment target mismatch' >&2; exit 1; }
[[ -r "$gateway_root/deployment-target" && "$(cat "$gateway_root/deployment-target")" == tencent-shanghai-01 ]] || { echo 'Gateway host target mismatch' >&2; exit 1; }
[[ -d "$app_root/releases" && -d "$app_root/backups" ]]
python3 - "$release" "$app_root/releases" <<'CHECK'
from pathlib import Path
import sys
if Path(sys.argv[2]).resolve() not in Path(sys.argv[1]).resolve().parents:
    sys.exit('Stage the release under this application releases directory')
CHECK
python3 "$release/deploy/validate.py" env "$app_root/app.env"
python3 "$release/deploy/validate.py" release "$release/release.json"
exec 9>"$app_root/deploy.lock"
flock -w 120 9
python3 "$release/deploy/validate.py" images "$release/release.json" "$release/images.env"
source "$release/deploy/lib.sh"
trap 'rm -f "$release/compose.json"' EXIT
compose_release "$release" config --format json > "$release/compose.json"
python3 "$release/deploy/validate.py" compose "$release/compose.json" "$app_root/app.env" "$release/release.json"
rm "$release/compose.json" # Resolved config contains the database password.
trap - EXIT
docker network inspect realquest_proxy >/dev/null || { echo 'Publish the host gateway first to create realquest_proxy' >&2; exit 1; }
previous=''
if [[ -L "$app_root/current" ]]; then
    previous=$(python3 - "$app_root/current" <<'PREVIOUS'
from pathlib import Path
import sys
print(Path(sys.argv[1]).resolve())
PREVIOUS
)
    [[ -r "$previous/images.env" && -r "$previous/deploy/compose.prod.yaml" && "$previous" != "$release" ]] || { echo 'Invalid or already active release' >&2; exit 1; }
fi
db_running=$(docker ps -q --filter label=com.docker.compose.project=realquest --filter label=com.docker.compose.service=db)
volume_exists=false
if docker volume inspect realquest_postgres_data >/dev/null 2>&1; then volume_exists=true; fi
[[ -z "$previous" || "$volume_exists" == true ]] || { echo 'Production database volume is missing; recover it before deployment' >&2; exit 1; }
if [[ -z "$previous" && ( -n "$db_running" || "$volume_exists" == true ) ]]; then
    [[ -r "$app_root/database-managed" && "$(cat "$app_root/database-managed")" == tencent-prod:realquest_postgres_data ]] || { echo 'An unmanaged RealQuest database exists; adopt it explicitly before deployment' >&2; exit 1; }
fi
# Pull and validate before stopping any application. PostgreSQL is fixed to a reviewed digest.
compose_release "$release" pull
before_revision=''
if [[ "$volume_exists" == true ]]; then
    database_release=${previous:-$release}
    # A stopped database still contains production data and must be backed up.
    if [[ -z "$db_running" ]]; then compose_release "$database_release" up -d --wait --wait-timeout 120 db; fi
    before_revision=$(schema_revision "$database_release")
    snapshot=$(snapshot_database "$database_release")
    printf '%s\n' "$snapshot" > "$release/predeploy-backup"
fi
applications_stopped=false
migration_started=false
migration_succeeded=false
rollback() {
    local deployment_exit_code=$? current_revision=''
    trap - EXIT
    if [[ "$deployment_exit_code" != 0 && "$applications_stopped" == true ]]; then
        compose_release "$release" stop frontend backend || true
        if [[ -n "$previous" ]]; then
            current_revision=$(schema_revision "$previous") || current_revision=UNKNOWN
            if [[ "$migration_started" == false || ( "$migration_succeeded" == true && "$current_revision" == "$before_revision" ) ]]; then
                compose_release "$previous" up -d --no-deps --wait --wait-timeout 120 backend frontend || echo 'Application rollback failed; inspect logs' >&2
            else
                echo 'Database migration changed or may have changed data/schema. Applications remain stopped; review predeploy-backup before recovery. No automatic database restore/downgrade was performed.' >&2
            fi
        fi
    fi
    exit "$deployment_exit_code"
}
trap rollback EXIT
compose_release "$release" up -d --wait --wait-timeout 120 db
printf '%s\n' tencent-prod:realquest_postgres_data > "$app_root/database-managed"
applications_stopped=true
compose_release "$release" stop frontend backend
migration_started=true
compose_release "$release" run --rm --no-deps -T backend alembic upgrade head
migration_succeeded=true
compose_release "$release" up -d --no-deps --wait --wait-timeout 120 backend frontend
domain=$(python3 - "$app_root/app.env" "$release/deploy" <<'DOMAIN'
import sys
sys.path.insert(0, sys.argv[2])
from validate import environment_file
print(environment_file(sys.argv[1])['REALQUEST_DOMAIN'])
DOMAIN
)
health=$(curl --fail --silent --show-error --resolve "$domain:443:127.0.0.1" --connect-timeout 5 --max-time 10 --retry 6 --retry-delay 5 --retry-all-errors "https://$domain/api/health")
printf '%s' "$health" | python3 -c 'import json,sys; sys.exit(0 if json.load(sys.stdin).get("status")=="ok" else 1)'
[[ -z "$previous" ]] || ln -sfn "$previous" "$app_root/previous"
ln -sfn "$release" "$app_root/current"
applications_stopped=false
printf 'RealQuest deployed to %s\n' "$target"
