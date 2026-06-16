#!/usr/bin/env bash
# Start the project's self-managed local MySQL (separate from any system MySQL).
# Data lives in apps/api/.mysql-data (gitignored). Listens on 127.0.0.1:3307.
# Usage:  bash scripts/local_mysql.sh        # start (foreground-safe, backgrounds itself)
#         bash scripts/local_mysql.sh stop   # stop
set -euo pipefail
API_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BASEDIR="/opt/homebrew/opt/mysql"
MYSQLD="$BASEDIR/bin/mysqld"
DATADIR="$API_DIR/.mysql-data"
SOCK="$DATADIR/mysql.sock"
PIDFILE="$DATADIR/mysqld.pid"
PORT=3307

if [ "${1:-start}" = "stop" ]; then
  [ -f "$PIDFILE" ] && kill "$(cat "$PIDFILE")" 2>/dev/null && echo "stopped" || echo "not running"
  exit 0
fi

if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
  echo "already running (pid $(cat "$PIDFILE"))"; exit 0
fi

nohup "$MYSQLD" --no-defaults --basedir="$BASEDIR" --datadir="$DATADIR" \
  --port="$PORT" --socket="$SOCK" --pid-file="$PIDFILE" \
  --mysqlx=OFF --bind-address=127.0.0.1 \
  > "$DATADIR/mysqld.log" 2>&1 &
echo "starting on 127.0.0.1:$PORT (pid $!) ..."
