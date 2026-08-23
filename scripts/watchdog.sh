#!/bin/bash
# ForgeOS external watchdog — health + IBKR auto-reconnect every 5 minutes.
# Secrets from env (never hardcode API keys):
#   IBKR_INTERNAL_API_KEY, IBKR_SERVICE_URL, FORGEOS_HEALTH_URL, WATCHDOG_LOG

set -u

FORGEOS_HEALTH_URL="${FORGEOS_HEALTH_URL:-http://localhost:3000/api/health}"
IBKR_SERVICE_URL="${IBKR_SERVICE_URL:-http://localhost:8002}"
IBKR_INTERNAL_API_KEY="${IBKR_INTERNAL_API_KEY:-}"
WATCHDOG_LOG="${WATCHDOG_LOG:-/var/log/forgeos-watchdog.log}"
PM2_APP_NAME="${PM2_APP_NAME:-forgeos}"
SLEEP_SEC="${WATCHDOG_SLEEP_SEC:-300}"

mkdir -p "$(dirname "$WATCHDOG_LOG")" 2>/dev/null || true

log() {
  echo "$(date -Iseconds) — $*" | tee -a "$WATCHDOG_LOG"
}

while true; do
  STATUS=$(curl -s --max-time 10 "$FORGEOS_HEALTH_URL" \
    | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','down'))" 2>/dev/null || echo "down")
  if [ "$STATUS" != "ok" ]; then
    if command -v pm2 >/dev/null 2>&1; then
      pm2 restart "$PM2_APP_NAME" || true
      log "forgeos reiniciado (health=$STATUS)"
    else
      log "forgeos health=$STATUS (pm2 no disponible)"
    fi
  fi

  if [ -n "$IBKR_INTERNAL_API_KEY" ]; then
    CONNECTED=$(curl -s --max-time 15 \
      -H "x-internal-api-key: ${IBKR_INTERNAL_API_KEY}" \
      "${IBKR_SERVICE_URL}/api/ibkr/status" \
      | python3 -c "import sys,json; print(json.load(sys.stdin).get('connected',False))" 2>/dev/null || echo "False")
    if [ "$CONNECTED" != "True" ]; then
      curl -s -X POST --max-time 180 \
        -H "x-internal-api-key: ${IBKR_INTERNAL_API_KEY}" \
        -H "Content-Type: application/json" \
        -d '{}' \
        "${IBKR_SERVICE_URL}/api/ibkr/auto-reconnect" >/dev/null || true
      log "IBKR reconexión intentada (connected=$CONNECTED)"
    fi
  else
    log "IBKR_INTERNAL_API_KEY vacío — skip check IBKR"
  fi

  sleep "$SLEEP_SEC"
done
