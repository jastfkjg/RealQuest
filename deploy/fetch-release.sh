#!/usr/bin/env bash
# Download metadata only from this repository's successful main-branch CI.
set -euo pipefail
umask 077
[[ "${BUILD_RUN_ID:-}" =~ ^[1-9][0-9]*$ && "${GITHUB_REPOSITORY:-}" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]]
directory=${1:?Set a metadata download directory}
mkdir -p "$directory/artifact"
gh api "repos/$GITHUB_REPOSITORY/actions/runs/$BUILD_RUN_ID" > "$directory/run.json"
# Check provenance before downloading any artifact.
python3 - "$directory/run.json" <<'RUN'
import json, os, sys
sys.path.insert(0, 'deploy')
from validate import workflow_run
workflow_run(json.load(open(sys.argv[1])), os.environ['BUILD_RUN_ID'], os.environ['GITHUB_REPOSITORY'])
RUN
gh run download "$BUILD_RUN_ID" --repo "$GITHUB_REPOSITORY" --name realquest-release --dir "$directory/artifact"
revision=$(python3 deploy/validate.py artifact "$directory/artifact/release.json" "$directory/run.json" --run-id "$BUILD_RUN_ID" --repository "$GITHUB_REPOSITORY")
printf 'revision=%s\n' "$revision" >> "${GITHUB_OUTPUT:?}"
