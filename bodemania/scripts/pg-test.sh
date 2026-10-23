#!/usr/bin/env bash
# Sobe (ou derruba) um Postgres 16 descartável para testar as migrações do Supabase.
#   scripts/pg-test.sh start   → cria o cluster e escuta em localhost:54329
#   scripts/pg-test.sh stop    → desliga e apaga os dados
# Em CI use o service container do GitHub Actions e defina TEST_DATABASE_URL.
set -euo pipefail
BIN=${PG_BIN:-/usr/lib/postgresql/16/bin}
DATA=${PGDATA_TEST:-/var/lib/postgresql/bodemania-test}
PORT=${PGPORT_TEST:-54329}
as_pg() { if [ "$(id -u)" = 0 ]; then runuser -u postgres -- "$@"; else "$@"; fi; }

case "${1:-start}" in
  start)
    if [ ! -d "$DATA" ]; then
      mkdir -p "$(dirname "$DATA")"; [ "$(id -u)" = 0 ] && chown postgres:postgres "$(dirname "$DATA")" || true
      as_pg "$BIN/initdb" -D "$DATA" -U postgres --auth=trust >/dev/null
    fi
    as_pg "$BIN/pg_ctl" -D "$DATA" -o "-p $PORT -k $DATA -c listen_addresses=127.0.0.1" -l "$DATA/log.txt" -w start >/dev/null
    echo "postgresql://postgres@127.0.0.1:$PORT/postgres"
    ;;
  stop)
    as_pg "$BIN/pg_ctl" -D "$DATA" -m fast stop >/dev/null 2>&1 || true
    rm -rf "$DATA"
    ;;
esac
