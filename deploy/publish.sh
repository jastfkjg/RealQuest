#!/usr/bin/env bash
set -euo pipefail
umask 077
[[ "${TARGET_ENVIRONMENT:-}" == tencent-prod && "${DEPLOY_TARGET:-}" == "$TARGET_ENVIRONMENT" ]] || { echo 'Configure DEPLOY_TARGET=tencent-prod in the selected Environment' >&2; exit 1; }
[[ "${REVISION:-}" =~ ^[a-f0-9]{40}$ && "${GITHUB_RUN_ID:-}" =~ ^[1-9][0-9]*$ && "${GITHUB_RUN_ATTEMPT:-}" =~ ^[1-9][0-9]*$ ]]
[[ "$(git rev-parse HEAD)" == "$REVISION" ]] || { echo 'Checkout must match the tested image revision' >&2; exit 1; }
python3 deploy/validate.py release "${RELEASE_FILE:?}" --revision "$REVISION" --run-id "${BUILD_RUN_ID:?}" --repository "${GITHUB_REPOSITORY:?}"
[[ "${SSH_HOST:-}" =~ ^[a-zA-Z0-9][a-zA-Z0-9.-]*$ && "${SSH_USER:-}" =~ ^[a-z_][a-z0-9_-]*$ ]]
SSH_PORT=${SSH_PORT:-22}
[[ "$SSH_PORT" =~ ^[0-9]+$ ]] && (( SSH_PORT >= 1 && SSH_PORT <= 65535 ))
[[ -n "${SSH_KEY:-}" && -n "${SSH_KNOWN_HOSTS:-}" ]]
temporary=$(mktemp -d)
trap 'rm -rf "$temporary"' EXIT
printf '%s\n' "$SSH_KEY" > "$temporary/key"
printf '%s\n' "$SSH_KNOWN_HOSTS" > "$temporary/known_hosts"
chmod 600 "$temporary/key" "$temporary/known_hosts"
mkdir "$temporary/source"
cp -R deploy "$temporary/source/deploy"
cp "$RELEASE_FILE" "$temporary/source/release.json"
SSH=(ssh -i "$temporary/key" -p "$SSH_PORT" -o BatchMode=yes -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$temporary/known_hosts" -o ConnectTimeout=15)
destination="$SSH_USER@$SSH_HOST"
release="/opt/realquest/releases/source-${REVISION}-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}"
"${SSH[@]}" "$destination" "umask 077; mkdir '$release'"
tar --exclude='__pycache__' -C "$temporary/source" -czf - deploy release.json | "${SSH[@]}" "$destination" "tar -xzf - -C '$release'"
"${SSH[@]}" "$destination" "bash '$release/deploy/deploy.sh' '$TARGET_ENVIRONMENT'"
