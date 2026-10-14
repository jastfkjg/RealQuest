#!/usr/bin/env bash
# Shared by local deployment checks and the server-side release script.
compose_release() {
    local release=$1
    shift
    docker compose --project-name realquest --env-file "$app_root/app.env" --env-file "$release/images.env" -f "$release/deploy/compose.prod.yaml" "$@"
}
schema_revision() {
    local release=$1 table
    table=$(compose_release "$release" exec -T db psql -U realquest -d realquest -Atqc "SELECT to_regclass('public.alembic_version')") || return 1
    if [[ -n "$table" ]]; then
        compose_release "$release" exec -T db psql -U realquest -d realquest -Atqc 'SELECT version_num FROM alembic_version ORDER BY version_num'
    fi
}
snapshot_database() {
    local release=$1 snapshot temporary
    temporary=$(mktemp "$app_root/backups/realquest-$(date -u +%Y%m%dT%H%M%SZ).XXXXXXXX") || return 1
    snapshot="$temporary.dump"
    mv "$temporary" "$snapshot" || { rm -f "$temporary"; return 1; }
    if ! compose_release "$release" exec -T db pg_dump -U realquest -d realquest --format=custom > "$snapshot"; then
        rm -f "$snapshot"
        return 1
    fi
    if [[ ! -s "$snapshot" ]] || ! compose_release "$release" exec -T db pg_restore --list < "$snapshot" >/dev/null; then
        rm -f "$snapshot"
        return 1
    fi
    printf '%s\n' "$snapshot"
}
