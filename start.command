#!/bin/bash
set -e
cd "$(dirname "$0")"

if command -v python3.14 >/dev/null 2>&1; then
  PYTHON=python3.14
elif command -v python3 >/dev/null 2>&1; then
  PYTHON=python3
else
  echo "请先安装 Python 3.14。"
  exit 1
fi

exec "$PYTHON" scripts/start.py "$@"
