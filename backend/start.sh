#!/bin/sh
set -eu
if [ "${REALQUEST_RUN_MIGRATIONS:-true}" = true ]; then
    alembic upgrade head
fi
exec "$@"
