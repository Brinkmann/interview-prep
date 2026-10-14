#!/usr/bin/env bash
# Starts a throwaway local Postgres, applies the Supabase stand-in and all migrations,
# and prints the DATABASE_URL to use for the RLS tests.
set -euo pipefail
DIR="${LOCAL_DB_DIR:-${TMPDIR:-/tmp}/interview-prep-db}"
PORT="${LOCAL_DB_PORT:-54329}"
BIN="$(ls -d /usr/lib/postgresql/*/bin | sort -V | tail -1)"
HERE="$(cd "$(dirname "$0")/.." && pwd)"

if [ "$(id -u)" = "0" ]; then RUN=(runuser -u postgres --); else RUN=(); fi
[ -f "$DIR/data/postmaster.pid" ] && "${RUN[@]}" "$BIN/pg_ctl" -D "$DIR/data" -m fast stop >/dev/null || true
rm -rf "$DIR" && mkdir -p "$DIR"
[ "$(id -u)" = "0" ] && chown postgres "$DIR"
"${RUN[@]}" "$BIN/initdb" -D "$DIR/data" -U postgres --auth=trust >/dev/null
"${RUN[@]}" "$BIN/pg_ctl" -D "$DIR/data" -o "-p $PORT -k $DIR" -l "$DIR/log" start >/dev/null

URL="postgresql://postgres@127.0.0.1:$PORT/postgres"
psql "$URL" -q -v ON_ERROR_STOP=1 -f "$HERE/scripts/local-shim.sql"
for f in "$HERE"/supabase/migrations/*.sql; do psql "$URL" -q -v ON_ERROR_STOP=1 -f "$f"; done
echo "$URL"
