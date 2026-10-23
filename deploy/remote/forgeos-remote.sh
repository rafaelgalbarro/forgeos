#!/usr/bin/env bash
# ForgeOS — acciones remotas permitidas para la clave de despliegue de GitHub Actions.
#
# Instalación (una vez, en el servidor):
#   git -C /var/www/forgeos fetch origin
#   git -C /var/www/forgeos show origin/feature/ibkr-live-supervised-v1:deploy/remote/forgeos-remote.sh > /usr/local/bin/forgeos-remote
#   chmod 700 /usr/local/bin/forgeos-remote
# y en /root/.ssh/authorized_keys:
#   restrict,command="/usr/local/bin/forgeos-remote" ssh-ed25519 AAAA... forgeos-github-actions
#
# La clave SOLO puede ejecutar este script; la acción llega en SSH_ORIGINAL_COMMAND.
# Acciones: status | deploy | patches | broker-proposals | diff | align | readiness
# Nunca imprime secretos (.env.local no se muestra).

set -uo pipefail
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
APP=/var/www/forgeos
BRANCH=feature/ibkr-live-supervised-v1
RAW="${SSH_ORIGINAL_COMMAND:-${*:-}}"
ACTION="$(echo "$RAW" | awk '{print $1}' | tr -cd 'a-z0-9-')"
# Argumento opcional (p. ej. un ticker): solo mayúsculas, dígitos, punto y guion.
ARG="$(echo "$RAW" | awk '{print $2}' | tr -cd 'A-Z0-9._:-' | cut -c1-60)"

cd "$APP" || { echo "No existe $APP"; exit 1; }
API_KEY="$(grep -E '^IBKR_INTERNAL_API_KEY=' .env.local 2>/dev/null | head -1 | cut -d= -f2-)"

sec() { printf '\n=== %s ===\n' "$1"; }

broker_python() {
  local p
  for p in services/ibkr-broker/.venv/bin/python services/ibkr-broker/venv/bin/python; do
    [ -x "$p" ] && { echo "$APP/$p"; return; }
  done
  command -v python3
}

do_status() {
  sec "GIT"
  git fetch -q origin 2>/dev/null
  echo "HEAD: $(git log -1 --format='%h %s')"
  echo "GitHub: $(git log -1 --format='%h %s' "origin/$BRANCH")"
  echo "Commits del servidor que no están en GitHub:"; git log --oneline --no-merges "origin/$BRANCH..HEAD" | head -20
  echo "Commits de GitHub pendientes de desplegar:"; git log --oneline "HEAD..origin/$BRANCH" | head -20
  echo "Cambios locales sin commit (sin .forgeos):"; git status --porcelain --untracked-files=no | grep -v ' .forgeos/' | head -20

  sec "PM2"
  pm2 jlist 2>/dev/null | python3 -c '
import sys, json, time
for p in json.load(sys.stdin):
    e = p.get("pm2_env", {})
    up = (time.time()*1000 - e.get("pm_uptime", 0)) / 60000 if e.get("status") == "online" else 0
    name, st, rs = p.get("name"), e.get("status"), e.get("restart_time")
    mem = (p.get("monit") or {}).get("memory", 0) // 1048576
    print("%-28s %-8s reinicios=%s uptime=%.0fm mem=%sMB" % (name, st, rs, up, mem))'

  sec "BROKER IBKR"
  local t0 t1
  t0=$(date +%s%N)
  curl -s --max-time 10 http://localhost:8002/api/ibkr/status -H "X-Internal-API-Key: $API_KEY" | python3 -c '
import sys, json
try: d = json.load(sys.stdin)
except Exception as e: print("sin respuesta:", e); sys.exit()
print("conectado=", d.get("connected"), "estado=", d.get("state"), "cuentas=", d.get("managedAccounts"))
for e in (d.get("recentErrors") or [])[-5:]: print("  error", e.get("code"), str(e.get("message"))[:120])'
  t1=$(date +%s%N); echo "tiempo de respuesta /status: $(( (t1 - t0) / 1000000 )) ms"
  pm2 logs ibkr-broker --lines 300 --nostream 2>&1 | grep -E "TICK NORMALIZE|ACCOUNT FIX|PLACE RESULT|err code=|Traceback|BROKER_NO_ACK" | tail -12

  sec "ÚLTIMAS PROPUESTAS IBKR"
  do_broker_proposals 12

  sec "KRAKEN FUTURES"
  grep -E "backfill|cycle .*signals|order error|held=" logs/forgeos-crypto-engine-out.log 2>/dev/null | tail -6

  sec "PANEL /investment"
  curl -s --max-time 40 "http://localhost:3000/api/investment/dashboard?wait=1" -H "X-Internal-API-Key: $API_KEY" | python3 -c '
import sys, json
try: d = json.load(sys.stdin)
except Exception as e: print("sin respuesta:", e); sys.exit()
b = d.get("brokerStatus") or {}
print("web: live=", d.get("liveTradingEnabled"), "readOnly=", d.get("ibkrReadOnly"), "modo=", d.get("mode"))
print("broker:", b.get("state"), b.get("dataSource"), "error=", b.get("error"))
for k in ("accountSummary", "positions", "portfolioSummary"):
    s = d.get(k) or {}
    print(k + ":", s.get("state"), "error=", s.get("error"))'
  echo "LIVE_TRADING_ENABLED en .env.local: $(grep -E '^LIVE_TRADING_ENABLED=' .env.local | cut -d= -f2)"
  echo "IBKR_READ_ONLY en .env.local: $(grep -E '^IBKR_READ_ONLY=' .env.local | cut -d= -f2)"

  sec "ACCIONES: CICLO Y PRE-MERCADO (últimas líneas)"
  pm2 logs forgeos --lines 600 --nostream 2>&1 | grep -E "\[Premarket\]|price-source|AutoExecute.*(enviada|ERROR|skip \(BROKER)|cuenta .* ignorada" | tail -12
}

do_broker_proposals() {
  local n="${1:-20}"
  python3 - "$n" <<'PY'
import sqlite3, json, sys
n = int(sys.argv[1])
try:
    c = sqlite3.connect("services/ibkr-broker/forgeos_ibkr.sqlite3")
    rows = c.execute("SELECT created_at,status,payload,ibkr_status,reject_reason FROM proposals ORDER BY created_at DESC LIMIT ?", (n,)).fetchall()
except Exception as e:
    print("sin acceso a la base de propuestas:", e); sys.exit()
for created, status, payload, ibs, reason in rows:
    try: p = json.loads(payload)
    except Exception: p = {}
    print(f"{str(created)[:19]} {status:9} {p.get('side','?'):4} {p.get('symbol','?'):6} qty={p.get('quantity')} lmt={p.get('limit_price')} sl={p.get('stop_loss')} cuenta={p.get('account')} ibkr={ibs} motivo={(reason or '')[:90]}")
PY
}

do_deploy() {
  sec "COMPROBACIONES PREVIAS"
  git fetch -q origin || { echo "git fetch falló"; exit 1; }
  local ahead dirty
  ahead=$(git rev-list --count --no-merges "origin/$BRANCH..HEAD")
  git checkout -q -- package-lock.json 2>/dev/null  # npm install lo reescribe en cada despliegue
  dirty=$(git status --porcelain --untracked-files=no | grep -v ' .forgeos/' | wc -l)
  if [ "$ahead" -gt 0 ]; then
    echo "ABORTADO: el servidor tiene $ahead commit(s) que no están en GitHub (usa la acción 'patches')."
    git log --oneline --no-merges "origin/$BRANCH..HEAD" | head
    exit 3
  fi
  if [ "$dirty" -gt 0 ]; then
    echo "ABORTADO: hay cambios locales sin commit:"; git status --porcelain --untracked-files=no | grep -v ' .forgeos/'
    exit 3
  fi
  echo "Desplegando $(git log -1 --format='%h %s' "origin/$BRANCH")"

  sec "COPIA DE ESTADO Y ACTUALIZACIÓN"
  local B; B=/root/forgeos-state-$(date +%Y%m%d-%H%M%S)
  cp -a .forgeos "$B" && echo "estado copiado en $B"
  git checkout -- .forgeos 2>/dev/null
  if ! git merge --ff-only "origin/$BRANCH"; then
    cp -a "$B/." .forgeos/; echo "ABORTADO: no es fast-forward"; exit 3
  fi
  cp -a "$B/." .forgeos/

  # Actualiza este script desde el repo (el despliegue ya ejecuta código del repo como root).
  if [ -f deploy/remote/forgeos-remote.sh ] && ! cmp -s deploy/remote/forgeos-remote.sh /usr/local/bin/forgeos-remote; then
    install -m 700 deploy/remote/forgeos-remote.sh /usr/local/bin/forgeos-remote && echo "script remoto actualizado"
  fi

  sec "TESTS DEL BROKER"
  (cd services/ibkr-broker && "$(broker_python)" -m pytest -q tests 2>&1 | tail -3) || true

  sec "BUILD"
  # MT5 (Wine) + PM2 apps leave little RAM for next build: make sure a 4 GB swap file exists.
  if [ "$(swapon --show --noheadings | wc -l)" = 0 ]; then
    [ -f /swapfile ] || { fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null; }
    swapon /swapfile && grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "swap activado: $(swapon --show --noheadings)"
  fi
  # Free RAM for the build: stop the MT5 bridge + terminal (restarted after the build).
  if pm2 describe forgeos-mt5-bridge >/dev/null 2>&1; then
    pm2 stop forgeos-mt5-bridge >/dev/null 2>&1
    echo "procesos MT5 antes: terminal=$(pgrep -fc terminal64.exe) puente=$(pgrep -fc mt5_bridge.py) wine=$(pgrep -fc wine)"
    pkill -f mt5_bridge.py; pkill -f terminal64.exe; sleep 3; pkill -9 -f mt5_bridge.py; pkill -9 -f terminal64.exe
    MT5_STOPPED=1
  fi
  free -m | sed -n 2,3p
  ps -eo rss,comm --sort=-rss | head -6 | awk '{printf "%6d MB %s\n", $1/1024, $2}'
  npm install --no-audit --no-fund 2>&1 | tail -2
  if ! npm run build > /tmp/forgeos-build.log 2>&1; then
    tail -30 /tmp/forgeos-build.log
    [ "${MT5_STOPPED:-0}" = 1 ] && pm2 restart forgeos-mt5-bridge >/dev/null 2>&1
    echo "ABORTADO: el build ha fallado — NO se reinicia nada."
    exit 4
  fi
  grep -E "Compiled|Generating static" /tmp/forgeos-build.log | tail -2

  sec "REINICIO"
  pm2 restart forgeos forgeos-scheduler forgeos-crypto-engine ibkr-broker --update-env > /dev/null && echo "reiniciados: forgeos forgeos-scheduler forgeos-crypto-engine ibkr-broker"
  if pm2 describe forgeos-forex-bot >/dev/null 2>&1; then pm2 restart forgeos-forex-bot --update-env >/dev/null && echo "reiniciado: forgeos-forex-bot"; fi
  for app in forgeos-eodhd-us-ws forgeos-alerts forgeos-scanner forgeos-reports; do
    pm2 describe "$app" >/dev/null 2>&1 && pm2 restart "$app" --update-env >/dev/null 2>&1 && echo "reiniciado: $app"
  done
  if [ "${MT5_STOPPED:-0}" = 1 ]; then pm2 restart forgeos-mt5-bridge --update-env >/dev/null && echo "reiniciado: forgeos-mt5-bridge"; fi
  sleep 20
  pm2 jlist 2>/dev/null | python3 -c '
import sys, json
for p in json.load(sys.stdin):
    if p.get("name") in ("forgeos","forgeos-scheduler","forgeos-crypto-engine","ibkr-broker"):
        print(p["name"], p["pm2_env"]["status"])'
}

do_diff() {
  git fetch -q origin
  sec "DIFERENCIAS servidor (HEAD) vs GitHub (origin/$BRANCH) — archivos"
  git diff --stat "origin/$BRANCH" HEAD -- . ':(exclude).forgeos' ':(exclude).env*' ':(exclude)package-lock.json' | tail -60
  sec "DIFERENCIAS — contenido (código)"
  git diff "origin/$BRANCH" HEAD -- app lib src scripts services ':(exclude)**/__tests__/**' ':(exclude).env*' | head -3000
}

# Alinea el servidor con GitHub: guarda el estado actual en una rama local de respaldo,
# deja HEAD = origin/$BRANCH (conserva .forgeos, .env.local y archivos no versionados)
# y despliega. Reversible: git reset --hard <rama de respaldo>.
do_align() {
  git fetch -q origin || { echo "git fetch falló"; exit 1; }
  local backup="server-backup-$(date +%Y%m%d-%H%M%S)"
  git branch "$backup" HEAD && echo "respaldo del estado actual: rama local $backup ($(git rev-parse --short HEAD))"
  git stash push -q -m "align $backup" -- package-lock.json 2>/dev/null && echo "package-lock.json local guardado en git stash"
  local B; B=/root/forgeos-state-$(date +%Y%m%d-%H%M%S)
  cp -a .forgeos "$B"
  git reset -q --hard "origin/$BRANCH" && echo "HEAD ahora = $(git log -1 --format='%h %s')"
  cp -a "$B/." .forgeos/
  do_deploy
}

show_env_file() {
  # Solo claves de configuración; cualquier clave con KEY/SECRET/TOKEN/PASS se muestra como "definida".
  local f="$1"
  [ -f "$f" ] || { echo "(no existe $f)"; return; }
  grep -E '^[A-Z0-9_]+=' "$f" | while IFS='=' read -r k v; do
    case "$k" in
      *KEY*|*SECRET*|*TOKEN*|*PASS*|*PASSWORD*|*WEBHOOK*|*CHAT_ID*) echo "$k=(definida)";;
      STOCKS_*|CRYPTO_*|FUTURES_*|LIVE_*|IBKR_*|US_*|EU_*|TRADING_*|PAPER_*|MAX_*|ALLOW*|KRAKEN_*|FOREX_*|PREMARKET*|IN_PLAY*|RUNNERS*|EODHD_WS*|RISK_*|DAILY_*) echo "$k=$v";;
    esac
  done
}

do_readiness() {
  sec "CONFIGURACIÓN .env.local (sin secretos)"
  show_env_file .env.local
  sec "CONFIGURACIÓN broker services/ibkr-broker/.env (sin secretos)"
  show_env_file services/ibkr-broker/.env
  sec "FRENOS Y BLOQUEOS"
  for f in ibkr-stocks-execution-pause.json ibkr-broker-no-ack-symbol-day.json ibkr-non-tradable.json kraken-futures-daily-risk.json; do
    echo "--- $f"; head -c 1500 ".forgeos/cache/$f" 2>/dev/null || echo "(no existe)"; echo
  done
  sec "PRE-MERCADO: preparación para operar en real"
  python3 - <<'PY'
import json
try:
    d = json.load(open(".forgeos/cache/us-premarket-shadow.json"))
except Exception as e:
    print("sin archivo de sombra:", e); raise SystemExit
sig = d.get("signals", [])
closed = [s for s in sig if s.get("closePrice") is not None and s.get("improved") is not None]
imp = sum(1 for s in closed if s.get("improved") is True)
print(f"señales registradas={len(sig)} cerradas={len(closed)} mejoraron={imp} → listo={len(closed) >= 20 and imp > len(closed)/2} (requiere ≥20 cerradas y mayoría mejorando)")
PY
  sec "CUENTAS IBKR (efectivo y posiciones)"
  curl -s --max-time 20 http://localhost:8002/api/ibkr/account -H "X-Internal-API-Key: $API_KEY" | python3 -c '
import sys, json
try: d = json.load(sys.stdin)
except Exception as e: print("sin respuesta:", e); sys.exit()
for acct, tags in (d or {}).items():
    if not isinstance(tags, dict): continue
    g = lambda k: (tags.get(k) or {}).get("value")
    c = lambda k: (tags.get(k) or {}).get("currency")
    print(acct, "base=", c("NetLiquidation"), "NAV=", g("NetLiquidation"), "Disponible=", g("AvailableFunds"), "USD=", g("CashBalance_USD"), "EUR=", g("CashBalance_EUR"))'
  curl -s --max-time 20 http://localhost:8002/api/ibkr/positions -H "X-Internal-API-Key: $API_KEY" | python3 -c '
import sys, json
try: rows = json.load(sys.stdin)
except Exception as e: print("sin respuesta:", e); sys.exit()
for r in rows or []:
    print("  ", r.get("account"), r.get("symbol"), r.get("position"), r.get("currency"), "coste=", r.get("avgCost"))'
  sec "BROKER: último error de Python (Traceback)"
  pm2 logs ibkr-broker --lines 3000 --nostream 2>&1 | grep -n "Traceback" | tail -3
  pm2 logs ibkr-broker --lines 3000 --nostream 2>&1 | awk '/Traceback/{buf=""; c=25} c>0{buf=buf $0 "\n"; c--} END{printf "%s", buf}' | cut -c1-220
  sec "ACCIONES: decisiones recientes del ciclo"
  pm2 logs forgeos --lines 4000 --nostream 2>&1 | grep -E "RECHAZADO|APROBADO|orden enviada|ORDER_REJECTED|Live IBKR submit blocked|premarket live not ready|Ninguna estrategia|fuera de sesión|capital insuficiente|STOCKS_EXECUTION|BROKER_NO_ACK|skip \(" | cut -c1-230 | tail -40
  sec "ACCIONES: resumen de ciclos"
  pm2 logs forgeos --lines 4000 --nostream 2>&1 | grep -iE "cycle (stocks|complete)|\[Cycle\]|phase=|session=" | cut -c1-200 | tail -10
  sec "SCHEDULER"
  pm2 logs forgeos-scheduler --lines 400 --nostream 2>&1 | grep -vE "^\s*$" | cut -c1-200 | tail -15
  sec "CRIPTO: motor"
  grep -E "venue=|held=|order error|ERROR|spot" logs/forgeos-crypto-engine-out.log 2>/dev/null | cut -c1-230 | tail -10
  tail -5 logs/forgeos-crypto-engine-error.log 2>/dev/null | cut -c1-230
}

do_trace() {
  local sym="$1"
  [ -n "$sym" ] || { echo "falta el ticker (ej.: trace NVDA)"; exit 2; }
  sec "TRAZA $sym en forgeos (últimas 6000 líneas)"
  pm2 logs forgeos --lines 6000 --nostream 2>&1 | grep -E "(\b|\[)$sym(\b|\])" | cut -c1-260 | tail -60
  sec "TRAZA $sym en broker"
  pm2 logs ibkr-broker --lines 3000 --nostream 2>&1 | grep -E "\b$sym\b" | cut -c1-260 | tail -20
}

do_cycle_trace() {
  sec "ÚLTIMO CICLO DE ACCIONES COMPLETO (forgeos, últimas 900 líneas sin ruido)"
  pm2 logs forgeos --lines 900 --nostream 2>&1 | grep -vE "ExperimentalWarning|trace-warnings|^\s*$" | cut -c1-240 | tail -250
  sec "BROKER: final del último Traceback"
  pm2 logs ibkr-broker --lines 3000 --nostream 2>&1 | awk '/Traceback/{buf=""; c=60} c>0{buf=buf $0 "\n"; c--} END{printf "%s", buf}' | grep -vE "site-packages|dist-packages|\^\^\^" | cut -c1-240 | tail -25
}

broker_pm2_python() {
  # Intérprete con el que PM2 ejecuta ibkr-broker (para instalar dependencias en el mismo entorno).
  pm2 jlist 2>/dev/null | python3 -c '
import sys, json
for p in json.load(sys.stdin):
    if p.get("name") == "ibkr-broker":
        e = p.get("pm2_env", {})
        print(e.get("exec_interpreter") or "", e.get("pm_exec_path") or "", e.get("pm_cwd") or "")'
}

wait_broker_connected() {
  local i
  for i in $(seq 1 30); do
    if curl -s --max-time 5 http://localhost:8002/api/ibkr/status -H "X-Internal-API-Key: $API_KEY" | grep -q '"connected":true'; then
      echo "broker conectado (tras $((i*3)) s)"; return 0
    fi
    sleep 3
  done
  echo "broker NO conectado tras 90 s"; return 1
}

do_install_twsapi() {
  local DEST="$APP/services/ibkr-broker/tws-api/pythonclient"
  sec "INTÉRPRETE DEL BROKER"
  read -r INTERP EXEC CWD <<< "$(broker_pm2_python)"
  echo "intérprete=$INTERP script=$EXEC cwd=$CWD"
  local PY="$INTERP"
  case "$PY" in ""|none|bash|sh|/bin/bash|/bin/sh) PY="$(broker_python)";; esac
  case "$PY" in */python*|python*) ;; *) PY="$(broker_python)";; esac
  echo "python usado: $PY ($("$PY" --version 2>&1))"

  sec "DESCARGA TWS API (Mac/Unix, versión estable)"
  command -v unzip >/dev/null || apt-get install -y -q unzip >/dev/null
  local page url tmp
  local base="https://download2.interactivebrokers.com/installers/tws-api"
  page="$(curl -sL --max-time 30 "$base/index.html")"
  [ -n "$page" ] || page="$(curl -sL --max-time 30 https://interactivebrokers.github.io/)"
  echo "página: $(printf '%s' "$page" | wc -c) bytes"
  # Enlaces candidatos (zip / macunix) tal como aparecen en la página
  printf '%s' "$page" | grep -oiE '(href|src)="[^"]*(zip|unix|download)[^"]*"' | sort -u | head -20
  url="$base/stable/tws-api-stable-linux-x64.sh"
  echo "url: $url"
  tmp="$(mktemp -d)"
  curl -sSL --max-time 300 -o "$tmp/twsapi.sh" "$url" || { echo "descarga fallida"; exit 5; }
  ls -la "$tmp/twsapi.sh"; head -c 400 "$tmp/twsapi.sh" | tr -cd '[:print:]\n' | head -5
  # Instalador desatendido (install4j: -q silencioso, -dir destino)
  (cd "$tmp" && timeout 600 sh twsapi.sh -q -dir "$tmp/inst" 2>&1 | tail -5)
  local pyc
  pyc="$(find "$tmp/inst" -type d -path '*source/pythonclient' 2>/dev/null | head -1)"
  if [ -z "$pyc" ]; then
    echo "No se encontró source/pythonclient tras instalar. Contenido:"; find "$tmp/inst" -maxdepth 3 | head -30
    exit 5
  fi
  echo "pythonclient: $pyc"
  rm -rf "$DEST.new"; mkdir -p "$(dirname "$DEST")"; cp -a "$pyc" "$DEST.new"
  cat "$(dirname "$(dirname "$pyc")")"/../API_VersionNum.txt 2>/dev/null | head -2

  sec "COMPROBACIÓN DE IMPORTACIÓN"
  if ! (cd /tmp && "$PY" -c "import sys; sys.path.insert(0, '$DEST.new'); import ibapi.client; from ibapi import server_versions as v; print('MAX_CLIENT_VER', v.MAX_CLIENT_VER)" 2>&1); then
    echo "falta alguna dependencia; instalando protobuf…"
    "$PY" -m pip install -q --break-system-packages protobuf 2>&1 | tail -2
    (cd /tmp && "$PY" -c "import sys; sys.path.insert(0, '$DEST.new'); import ibapi.client; from ibapi import server_versions as v; print('MAX_CLIENT_VER', v.MAX_CLIENT_VER)") || { echo "ABORTADO: no importa"; rm -rf "$DEST.new"; exit 5; }
  fi
  (cd /tmp && "$PY" -c "import sys; sys.path.insert(0, '$DEST.new'); from ibapi import server_versions as v; print('MIN_SERVER_VER_FRACTIONAL_SIZE_SUPPORT', getattr(v,'MIN_SERVER_VER_FRACTIONAL_SIZE_SUPPORT','?'))" 2>&1 | tail -1)

  sec "TESTS DEL BROKER CON LA LIBRERÍA OFICIAL"
  (cd services/ibkr-broker && IBKR_TWS_API_PYTHONPATH="$DEST.new" "$PY" -m pytest -q tests 2>&1 | tail -3)

  sec "ACTIVACIÓN"
  rm -rf "$DEST.old"; [ -d "$DEST" ] && mv "$DEST" "$DEST.old"
  mv "$DEST.new" "$DEST"
  pm2 restart ibkr-broker --update-env >/dev/null && echo "ibkr-broker reiniciado"
  if wait_broker_connected; then
    pm2 logs ibkr-broker --lines 80 --nostream 2>&1 | grep -E "ibapi path=" | tail -1
  else
    echo "ROLLBACK: vuelvo a la librería anterior"
    rm -rf "$DEST.failed"; mv "$DEST" "$DEST.failed"; [ -d "$DEST.old" ] && mv "$DEST.old" "$DEST"
    pm2 restart ibkr-broker --update-env >/dev/null; wait_broker_connected
    pm2 logs ibkr-broker --lines 80 --nostream 2>&1 | grep -iE "error|traceback|ibapi path" | tail -8
    exit 6
  fi
}

set_env_flag() {
  local key="$1" val="$2"
  mkdir -p /root/env-backups && chmod 700 /root/env-backups
  cp -a .env.local "/root/env-backups/.env.local.$(date +%Y%m%d-%H%M%S)"
  if grep -qE "^$key=" .env.local; then sed -i "s/^$key=.*/$key=$val/" .env.local; else echo "$key=$val" >> .env.local; fi
  echo "$key=$(grep -E "^$key=" .env.local | cut -d= -f2)"
}

do_fractional_on() {
  sec "PRUEBA whatIf DE FRACCIÓN (no envía orden real)"
  local out
  out="$(curl -s --max-time 40 -X POST http://localhost:8002/api/ibkr/fractional-whatif-probe -H "X-Internal-API-Key: $API_KEY" -H 'Content-Type: application/json' -d '{"account":"U24225949","symbol":"AAPL","quantity":0.1}')"
  echo "$out" | cut -c1-600
  if ! echo "$out" | grep -q '"ok":true'; then
    echo "ABORTADO: la prueba de fracciones no ha pasado; IBKR_FRACTIONAL_ENABLED sin cambios"; exit 7
  fi
  sec "ACTIVAR IBKR_FRACTIONAL_ENABLED"
  set_env_flag IBKR_FRACTIONAL_ENABLED true
  pm2 restart forgeos forgeos-scheduler --update-env >/dev/null && echo "forgeos y scheduler reiniciados"
}

do_fractional_off() {
  set_env_flag IBKR_FRACTIONAL_ENABLED false
  pm2 restart forgeos forgeos-scheduler --update-env >/dev/null && echo "forgeos y scheduler reiniciados"
}

do_unblock_eu() {
  python3 - <<'PY'
import json, datetime
p = ".forgeos/cache/ibkr-non-tradable.json"
d = json.load(open(p))
removed = [s for s in ("ITX", "DTE", "TEF") if d.get("entries", {}).pop(s, None) is not None]
d["updatedAt"] = datetime.datetime.utcnow().isoformat() + "Z"
json.dump(d, open(p, "w"), indent=2)
print("desbloqueados:", removed, "| siguen bloqueados:", sorted(d.get("entries", {}).keys()))
PY
}

do_orders() {
  sec "ÓRDENES ABIERTAS EN IBKR"
  curl -s --max-time 25 http://localhost:8002/api/ibkr/orders -H "X-Internal-API-Key: $API_KEY" | python3 -c '
import sys, json
try: rows = json.load(sys.stdin)
except Exception as e: print("sin respuesta:", e); sys.exit()
if isinstance(rows, dict): rows = rows.get("orders") or rows.get("data") or []
for o in rows or []:
    print("id=%s padre=%s %s %s %s %s qty=%s lmt=%s aux=%s estado=%s cuenta=%s tif=%s" % (
        o.get("orderId"), o.get("parentId"), o.get("action"), o.get("symbol"), o.get("orderType"),
        o.get("currency"), o.get("quantity"), o.get("limitPrice"), o.get("auxPrice"),
        o.get("status"), o.get("account"), o.get("tif")))
print("total:", len(rows or []))'
}

do_cancel_order() {
  local id="$1"
  case "$id" in ""|*[!0-9]*) echo "id de orden inválido: '$id'"; exit 2;; esac
  sec "CANCELAR ORDEN $id"
  curl -s --max-time 25 -X DELETE "http://localhost:8002/api/orders/$id" -H "X-Internal-API-Key: $API_KEY"; echo
  sleep 4
  do_orders
}

do_futures() {
  sec "KRAKEN FUTURES: diagnóstico de estrategias"
  curl -s --max-time 30 http://localhost:3000/api/trading/crypto/diagnostics -H "X-Internal-API-Key: $API_KEY" | python3 -c '
import sys, json
try: d = json.load(sys.stdin)
except Exception as e: print("sin respuesta:", e); sys.exit()
f = d.get("futures") or {}
e = f.get("engine") or {}
print("venue=", f.get("venue"), "shadow=", f.get("shadowMode"), "apalancamiento=", f.get("leverageCap"), "estrategias live=", f.get("liveStrategies"))
print("margen=", e.get("availableMargin"), "último ciclo=", e.get("lastCycleAt"), "lastCycle=", e.get("lastCycle"))
print("riesgo diario=", f.get("dailyRisk"))
diag = f.get("diagnostics") or {}
print("diagnóstico actualizado=", diag.get("updatedAt"), "último ciclo=", diag.get("lastCycleAt"))
for name, dirs in sorted((diag.get("strategies") or {}).items()):
    for side in ("long", "short"):
        r = (dirs or {}).get(side) or {}
        if not r.get("attempts"): continue
        top = sorted((r.get("discardReasons") or {}).items(), key=lambda x: -x[1])[:3]
        print("  %-28s %-5s intentos=%-6s señales=%-4s casi=%-3s | %s" % (name, side, r.get("attempts"), r.get("signals", r.get("buys")), r.get("nearMisses"), "; ".join("%s×%s" % (n, k) for k, n in top)))
bt = f.get("backtestReport") or {}
print("puerta backtest:", json.dumps(bt)[:600])'
  sec "KRAKEN FUTURES: /instruments (público)"
  python3 - <<'PY'
import json, urllib.request
try:
    d = json.load(urllib.request.urlopen("https://futures.kraken.com/derivatives/api/v3/instruments", timeout=20))
except Exception as e:
    print("error:", e); raise SystemExit
rows = d.get("instruments") or []
print("result=", d.get("result"), "filas=", len(rows), "claves=", list(d.keys())[:6])
pf = [r for r in rows if str(r.get("symbol", "")).upper().startswith("PF_")]
print("PF_* =", len(pf), "ejemplos de símbolo:", [r.get("symbol") for r in pf[:5]])
for want in ("PF_ETHUSD", "PF_LTCUSD", "PF_XBTUSD"):
    r = next((x for x in rows if str(x.get("symbol", "")).upper() == want), None)
    if r:
        print(want, {k: r.get(k) for k in ("symbol", "tradeable", "tickSize", "contractSize", "contractValueTradePrecision", "type", "postOnly", "minimumOrderSize")})
    else:
        print(want, "NO ENCONTRADO")
PY
  sec "KRAKEN FUTURES: cuenta, posiciones y órdenes (API privada)"
  python3 - <<'PY'
import time, hmac, hashlib, base64, urllib.request, json
env = dict(l.strip().split("=", 1) for l in open(".env.local") if "=" in l and not l.lstrip().startswith("#"))
def get(p):
    n = str(int(time.time() * 1000))
    a = base64.b64encode(hmac.new(base64.b64decode(env["KRAKEN_FUTURES_API_SECRET"]), hashlib.sha256((n + p).encode()).digest(), hashlib.sha512).digest()).decode()
    req = urllib.request.Request("https://futures.kraken.com/derivatives" + p, headers={"APIKey": env["KRAKEN_FUTURES_API_KEY"], "Nonce": n, "Authent": a})
    return json.load(urllib.request.urlopen(req, timeout=20))
try:
    flex = get("/api/v3/accounts")["accounts"]["flex"]
    print("margen disponible:", flex.get("availableMargin"), "| valor cartera:", flex.get("portfolioValue"), "| PnL:", flex.get("pnl"))
    pos = get("/api/v3/openpositions").get("openPositions", [])
    print("posiciones:", [(p.get("symbol"), p.get("side"), p.get("size"), p.get("price")) for p in pos] or "ninguna")
    ords = get("/api/v3/openorders").get("openOrders", [])
    for o in ords:
        print("  orden:", o.get("order_id"), o.get("symbol"), o.get("side"), o.get("orderType"), "size=", o.get("unfilledSize"), "lmt=", o.get("limitPrice"), "stop=", o.get("stopPrice"), "reduceOnly=", o.get("reduceOnly"))
    print("órdenes abiertas:", len(ords))
except Exception as e:
    print("error API privada:", e)
PY
  sec "KRAKEN FUTURES: últimas líneas del motor"
  grep -E "Kraken/Futures\] cycle" logs/forgeos-crypto-engine-out.log | tail -3 | cut -c1-900
  echo "--- errores de órdenes"
  grep -hE "order error|sendorder|private HTTP|setLeverage|leverage|TP en exchange|sin stop|Exit|exit" logs/forgeos-crypto-engine-out.log logs/forgeos-crypto-engine-error.log 2>/dev/null | tail -8 | cut -c1-600
  echo "--- últimas 15 líneas del motor (sin ciclos)"
  grep -vE "Kraken/Futures\] cycle|CryptoEngine\] analysis|ExperimentalWarning|trace-warnings" logs/forgeos-crypto-engine-out.log | tail -15 | cut -c1-400
}

# set-flag CLAVE:VALOR — solo claves de la lista y valores numéricos / true / false.
do_set_flag() {
  local key="${1%%:*}" val="${1#*:}"
  case "$key" in
    CRYPTO_LIVE_MAX_NOTIONAL_EUR|CRYPTO_LIVE_MAX_POSITIONS|FUTURES_MAX_LEVERAGE|STOCKS_EXECUTION_ENABLED|STOCKS_EXECUTION_US|STOCKS_EXECUTION_EU|STOCKS_EXECUTION_PREMARKET|STOCKS_MAX_POSITIONS_PER_ACCOUNT|FOREX_BOT_MODE|FOREX_BOT_LIVE_CONFIRM|FOREX_BOT_RISK_PCT|FOREX_BOT_MAX_POSITIONS|FOREX_BOT_MIN_LOT_MAX_RISK_PCT) ;;
    *) echo "clave no permitida: $key"; exit 2;;
  esac
  if [ "$key" = FOREX_BOT_MODE ]; then
    val="$(echo "$val" | tr 'A-Z' 'a-z')"
    case "$val" in shadow|live) ;; *) echo "valor no permitido: $val (shadow|live)"; exit 2;; esac
  else
    val="$(echo "$val" | sed 's/^TRUE$/true/; s/^FALSE$/false/')"
    case "$val" in true|false) ;; *[!0-9.]*|"") echo "valor no permitido: $val"; exit 2;; esac
  fi
  if [ "$key" = "FUTURES_MAX_LEVERAGE" ] && [ "${val%%.*}" -gt 1 ] 2>/dev/null; then echo "FUTURES_MAX_LEVERAGE > 1 no permitido por esta vía"; exit 2; fi
  sec "AJUSTE $key"
  echo "antes: $(grep -E "^$key=" .env.local | cut -d= -f2)"
  set_env_flag "$key" "$val"
  case "$key" in
    CRYPTO_*|FUTURES_*) pm2 restart forgeos-crypto-engine --update-env >/dev/null && echo "forgeos-crypto-engine reiniciado";;
    FOREX_*) pm2 restart forgeos-forex-bot --update-env >/dev/null && echo "forgeos-forex-bot reiniciado";;
    *) pm2 restart forgeos forgeos-scheduler --update-env >/dev/null && echo "forgeos y scheduler reiniciados";;
  esac
}

do_gateway_info() {
  sec "IB GATEWAY (Docker)"
  docker ps --format '{{.ID}} {{.Image}} {{.Names}} {{.Status}} {{.Ports}}' 2>&1 | head
  local c; c="$(docker ps --format '{{.Names}} {{.Image}}' | grep -iE 'ib|gateway|tws' | head -1 | awk '{print $1}')"
  [ -n "$c" ] || { echo "no encuentro el contenedor del gateway"; return; }
  echo "contenedor: $c"
  docker inspect "$c" --format 'imagen={{.Config.Image}} creado={{.Created}} restart={{.HostConfig.RestartPolicy.Name}}' 2>&1
  echo "variables (solo nombres):"; docker inspect "$c" --format '{{range .Config.Env}}{{println .}}{{end}}' | cut -d= -f1 | tr '\n' ' '; echo
  echo "TWS_VERSION / IB_GATEWAY_VERSION:"; docker inspect "$c" --format '{{range .Config.Env}}{{println .}}{{end}}' | grep -E '^(TWS_|IB_GATEWAY_VERSION|IBC_VERSION|TRADING_MODE|TWOFA|EXISTING_SESSION|AUTO_RESTART|RELOGIN)' | grep -viE 'PASSWORD|USERID|PASS' 
  echo "compose:"; docker inspect "$c" --format '{{index .Config.Labels "com.docker.compose.project.working_dir"}} {{index .Config.Labels "com.docker.compose.project.config_files"}}' 2>&1
}

GW_IMAGE_REPO="ghcr.io/gnzsnz/ib-gateway"

do_gateway_check() {
  sec "VERSIONES DISPONIBLES DE IB GATEWAY (solo descarga, no toca el contenedor)"
  local cur; cur="$(docker inspect ib-gateway --format '{{range .Config.Env}}{{println .}}{{end}}' | grep '^IB_GATEWAY_VERSION=' | cut -d= -f2)"
  echo "en uso: $cur"
  for tag in stable latest; do
    docker pull -q "$GW_IMAGE_REPO:$tag" >/dev/null 2>&1 || { echo "$tag: no se pudo descargar"; continue; }
    echo "$tag: $(docker inspect "$GW_IMAGE_REPO:$tag" --format '{{range .Config.Env}}{{println .}}{{end}}' | grep '^IB_GATEWAY_VERSION=' | cut -d= -f2)"
  done
}

# gateway-upgrade TAG — recrea el contenedor con la misma configuración y la imagen TAG
# (stable|latest). Si el broker no vuelve a conectar en 6 min, vuelve al contenedor anterior.
do_gateway_upgrade() {
  local tag="${1:-stable}"; tag="$(echo "$tag" | tr 'A-Z' 'a-z')"
  case "$tag" in stable|latest) ;; *) echo "tag no permitido: $tag"; exit 2;; esac
  local img="$GW_IMAGE_REPO:$tag"
  sec "ACTUALIZAR IB GATEWAY → $img"
  docker pull -q "$img" >/dev/null || { echo "no se pudo descargar $img"; exit 8; }
  local newv curv
  newv="$(docker inspect "$img" --format '{{range .Config.Env}}{{println .}}{{end}}' | grep '^IB_GATEWAY_VERSION=' | cut -d= -f2)"
  curv="$(docker inspect ib-gateway --format '{{range .Config.Env}}{{println .}}{{end}}' | grep '^IB_GATEWAY_VERSION=' | cut -d= -f2)"
  echo "actual=$curv nueva=$newv"
  if [ "$newv" = "$curv" ]; then echo "ya está en esa versión"; return 0; fi

  local envf; envf="$(mktemp)"; chmod 600 "$envf"
  # Solo variables propias (credenciales y ajustes); las de la imagen las pone la imagen nueva.
  docker inspect ib-gateway --format '{{range .Config.Env}}{{println .}}{{end}}' \
    | grep -E '^(TWS_USERID|TWS_PASSWORD|TRADING_MODE|CUSTOM_CONFIG|READ_ONLY_API|TWOFA_|EXISTING_SESSION|AUTO_RESTART|RELOGIN|TIME_ZONE|TZ=|VNC_|JAVA_HEAP|TWS_ACCEPT_INCOMING|BYPASS_WARNING|ALLOW_BLIND|SAVE_TWS|TWS_SETTINGS_PATH|TWS_COLD_RESTART|TWS_PASSWORD_FILE|TWS_USERID_PAPER|TWS_PASSWORD_PAPER)' > "$envf"
  local mounts ports
  mounts="$(docker inspect ib-gateway --format '{{range .Mounts}}-v {{.Source}}:{{.Destination}} {{end}}')"
  ports="$(docker inspect ib-gateway --format '{{range $p, $b := .HostConfig.PortBindings}}{{range $b}}-p {{.HostIp}}{{if .HostIp}}:{{end}}{{.HostPort}}:{{$p}} {{end}}{{end}}' | sed 's#/tcp##g')"
  echo "puertos: $ports"; echo "volúmenes: ${mounts:-ninguno}"; echo "variables trasladadas: $(cut -d= -f1 "$envf" | tr '\n' ' ')"

  docker rm -f ib-gateway-old >/dev/null 2>&1
  docker stop ib-gateway >/dev/null && docker rename ib-gateway ib-gateway-old
  # shellcheck disable=SC2086
  if ! docker run -d --name ib-gateway --restart always --env-file "$envf" $ports $mounts "$img" >/dev/null; then
    rm -f "$envf"; echo "docker run falló → vuelvo al anterior"
    docker rm -f ib-gateway >/dev/null 2>&1; docker rename ib-gateway-old ib-gateway && docker start ib-gateway >/dev/null; exit 8
  fi
  rm -f "$envf"
  echo "contenedor nuevo arrancado; esperando login (si IBKR pide 2FA, apruébalo en el móvil)…"
  local i ok=1
  for i in $(seq 1 36); do
    sleep 10
    curl -s --max-time 8 -X POST http://localhost:8002/api/ibkr/reconnect -H "X-Internal-API-Key: $API_KEY" >/dev/null 2>&1
    if curl -s --max-time 5 http://localhost:8002/api/ibkr/status -H "X-Internal-API-Key: $API_KEY" | grep -q '"connected":true'; then
      echo "broker conectado al gateway nuevo tras $((i*10)) s"; ok=0; break
    fi
  done
  if [ $ok -ne 0 ]; then
    echo "ROLLBACK: sin conexión en 6 min"
    docker logs --tail 30 ib-gateway 2>&1 | grep -viE 'password|userid' | tail -15
    docker rm -f ib-gateway >/dev/null; docker rename ib-gateway-old ib-gateway && docker start ib-gateway >/dev/null
    sleep 60; curl -s --max-time 8 -X POST http://localhost:8002/api/ibkr/reconnect -H "X-Internal-API-Key: $API_KEY" >/dev/null
    wait_broker_connected; exit 9
  fi
  curl -s --max-time 10 http://localhost:8002/api/ibkr/status -H "X-Internal-API-Key: $API_KEY" | python3 -c 'import sys,json; d=json.load(sys.stdin); print("estado:", d.get("state"), [e.get("code") for e in d.get("recentErrors", [])][-6:])'
  echo "el contenedor anterior queda parado como ib-gateway-old (borrar cuando todo vaya bien)"
}

do_gateway_rollback() {
  sec "VOLVER AL IB GATEWAY ANTERIOR"
  docker inspect ib-gateway-old >/dev/null 2>&1 || { echo "no existe ib-gateway-old"; exit 2; }
  mkdir -p /root/gateway-backups
  local ts; ts="$(date +%Y%m%d-%H%M%S)"
  # Guardar la configuración de ambos para hacer bien la actualización después.
  docker cp ib-gateway-old:/home/ibgateway/Jts "/root/gateway-backups/Jts-old-$ts" 2>/dev/null && echo "copia Jts antiguo: /root/gateway-backups/Jts-old-$ts"
  docker cp ib-gateway:/home/ibgateway/Jts "/root/gateway-backups/Jts-new-$ts" 2>/dev/null && echo "copia Jts nuevo: /root/gateway-backups/Jts-new-$ts"
  docker stop ib-gateway >/dev/null; docker rm -f ib-gateway-1050 >/dev/null 2>&1; docker rename ib-gateway ib-gateway-1050
  docker rename ib-gateway-old ib-gateway && docker start ib-gateway >/dev/null && echo "ib-gateway anterior arrancado"
  sleep 45
  pm2 restart ibkr-broker --update-env >/dev/null && echo "ibkr-broker reiniciado"
  wait_broker_connected
  sec "DIFERENCIAS DE CONFIGURACIÓN (jts.ini y ajustes API)"
  diff <(cat /root/gateway-backups/Jts-old-$ts/jts.ini 2>/dev/null) <(cat /root/gateway-backups/Jts-new-$ts/jts.ini 2>/dev/null) | grep -viE 'password|user' | head -30
  find /root/gateway-backups/Jts-old-$ts -maxdepth 2 -type f \( -name '*.xml' -o -name '*.ini' \) 2>/dev/null | head -10
}

do_gateway_logs() {
  sec "CONTENEDORES"
  docker ps -a --format '{{.Names}} {{.Image}} {{.Status}}' | grep -i gateway
  sec "LOG ib-gateway (últimas líneas, sin credenciales)"
  docker logs --tail 60 ib-gateway 2>&1 | grep -viE 'password|userid' | cut -c1-220 | tail -40
  sec "RECONEXIÓN DEL BROKER"
  curl -s --max-time 30 -X POST http://localhost:8002/api/ibkr/reconnect -H "X-Internal-API-Key: $API_KEY" | cut -c1-300; echo
  wait_broker_connected || true
}

# protect SYMBOL:CCY:ACCOUNT:QTY:STOP:TP — repone SL+TP (OCA, GTC) a una posición larga.
do_protect() {
  IFS=':' read -r sym ccy acct qty sl tp <<< "$1"
  [ -n "$tp" ] || { echo "uso: protect SYMBOL:CCY:ACCOUNT:QTY:STOP:TP"; exit 2; }
  sec "PROTEGER $sym ($acct) qty=$qty SL=$sl TP=$tp"
  curl -s --max-time 40 -X POST http://localhost:8002/api/ibkr/protect-position -H "X-Internal-API-Key: $API_KEY" -H 'Content-Type: application/json' \
    -d "{\"symbol\":\"$sym\",\"currency\":\"$ccy\",\"account\":\"$acct\",\"quantity\":$qty,\"stop_price\":$sl,\"take_profit\":$tp}"; echo
  sleep 3; do_orders
}

do_telegram_stats() {
  sec "TELEGRAM: envíos por proceso (logs actuales de PM2)"
  local f n
  for f in /root/.pm2/logs/*-out.log logs/*-out.log; do
    [ -f "$f" ] || continue
    n=$(grep -cE "sendMessage OK|Telegram.*enviado|telegram sent|sendDocument OK" "$f" 2>/dev/null)
    [ "${n:-0}" -gt 0 ] && echo "$n  $(basename "$f")  (desde $(head -c 25 "$f" | tr -d '\n'))"
  done
  sec "TELEGRAM: qué se envía (línea anterior a cada envío, agrupado)"
  for f in /root/.pm2/logs/forgeos-out.log /root/.pm2/logs/forgeos-scheduler-out.log logs/forgeos-crypto-engine-out.log /root/.pm2/logs/forgeos-alerts-out.log /root/.pm2/logs/forgeos-scanner-out.log /root/.pm2/logs/forgeos-reports-out.log; do
    [ -f "$f" ] || continue
    echo "--- $(basename "$f")"
    tail -n 200000 "$f" | grep -B3 "sendMessage intento" | grep -vE "sendMessage|^--$" \
      | sed -E 's/^[0-9: +-]+: //; s/^[0-9]+\|[a-z-]+ *\| //; s/[0-9]+(\.[0-9]+)?/N/g' | cut -c1-90 | sort | uniq -c | sort -rn | head -15
  done
  sec "TELEGRAM: mensajes enviados recientes (vista previa)"
  grep -hoE "sendMessage intento.*«.*»" /root/.pm2/logs/forgeos-out.log logs/forgeos-crypto-engine-out.log 2>/dev/null | sed -E 's/.*«(.*)»/\1/; s/[0-9]+([.,][0-9]+)?/N/g' | sort | uniq -c | sort -rn | head -25
  echo "duplicados omitidos: $(grep -hc 'duplicado omitido' /root/.pm2/logs/forgeos-out.log logs/forgeos-crypto-engine-out.log 2>/dev/null | paste -sd+ | bc 2>/dev/null)"
  sec "PROCESOS PM2 QUE PUEDEN ENVIAR A TELEGRAM"
  pm2 jlist 2>/dev/null | python3 -c '
import sys, json
for p in json.load(sys.stdin):
    e = p.get("pm2_env", {})
    print("%-26s %-8s script=%s" % (p.get("name"), e.get("status"), e.get("pm_exec_path")))'
}

# screenshot RUTA — RUTA en mayúsculas con '.' como '/', p. ej. INVESTMENT o INVESTMENT.PORTFOLIO
do_screenshot() {
  local path="/$(echo "${1:-INVESTMENT}" | tr 'A-Z.' 'a-z/')"
  if [ ! -d /opt/forgeos-shot/node_modules/playwright ]; then
    sec "INSTALANDO PLAYWRIGHT (solo la primera vez)"
    mkdir -p /opt/forgeos-shot && cd /opt/forgeos-shot && npm init -y >/dev/null 2>&1 && npm i -s playwright@1.48.2 >/dev/null 2>&1
    npx -y playwright@1.48.2 install --with-deps chromium 2>&1 | tail -2
    cd "$APP"
  fi
  sec "CAPTURA $path"
  node deploy/remote/page-shot.cjs "$path" /tmp/forgeos-shot 2>&1 | tail -40
  for v in desktop movil; do
    [ -f "/tmp/forgeos-shot-$v.jpg" ] || continue
    echo "-----BEGIN SHOT $v-----"; base64 -w0 "/tmp/forgeos-shot-$v.jpg"; echo; echo "-----END SHOT $v-----"
  done
}

do_signals() {
  local L=/root/.pm2/logs/forgeos-out.log
  sec "RESÚMENES DE CICLO DE ACCIONES (últimos)"
  grep -E "\[Cycle/stocks\] fase=" "$L" | tail -8 | cut -c1-260
  sec "SEÑALES BUY Y SU DESTINO (hoy, agrupado)"
  grep -E "\[Signal\] [A-Z.]+ BUY agents|\[Signal\] [A-Z.]+: BUY status|EXECUTED conf|SIGNAL_NO_CAPITAL|sin capital|capital insuficiente|RECHAZADO|Premarket SHADOW|posición duplicada|orden de compra pendiente|compra sin stop|ORDER_REJECTED|BROKER_NO_ACK|ManualBlock|no tradable|skip \(" "$L" \
    | sed -E 's/^[0-9]+\|[a-z-]+ *\| //; s/[0-9]+(\.[0-9]+)?/N/g' | cut -c1-150 | sort | uniq -c | sort -rn | head -40
  sec "ÚLTIMAS 30 SEÑALES BUY CON DETALLE"
  grep -E "\[Signal\] [A-Z.]+ BUY agents|\[Signal\] [A-Z.]+: BUY status|❌ RECHAZADO|SIGNAL_NO_CAPITAL|Premarket SHADOW" "$L" | tail -30 | cut -c1-260
  sec "MOTIVOS DE «ninguna señal» (estrategias, agrupado)"
  grep -oE "ninguna señal \([A-Z_]+\)" "$L" | sort | uniq -c | sort -rn | head
}

do_forex_backtest() {
  sec "BACKTEST FOREX (EODHD 5m → M15, ${1:-180} días)"
  local days; days="$(echo "${1:-180}" | tr -cd '0-9')"; [ -n "$days" ] || days=180
  timeout 900 node scripts/forex-bot.cjs backtest "$days" 2>&1 | grep -vE "ExperimentalWarning|trace-warnings" | tail -45
}

do_forex_optimize() {
  local tfs; tfs="$(echo "${1:-H1:H4}" | tr -cd 'A-Z0-9:')"; [ -n "$tfs" ] || tfs="H1:H4"
  sec "ESTRATEGIAS POR PAR (historia de OANDA vía MT5, marcos $tfs)"
  timeout 2400 node scripts/forex-bot.cjs optimize "$tfs" 2>&1 | grep -vE "ExperimentalWarning|trace-warnings" | tail -60
}

do_forex_playbook() {
  sec "FICHAS POR INSTRUMENTO (guía) — backtest con historia de OANDA"
  timeout 2400 node scripts/forex-bot.cjs playbook 2>&1 | grep -vE "ExperimentalWarning|trace-warnings" | tail -40
}

do_forex_methods() {
  sec "MÉTODOS PUBLICADOS (Raschke, Lien, Connors) — backtest con historia de OANDA"
  timeout 2400 node scripts/forex-bot.cjs methods 2>&1 | grep -vE "ExperimentalWarning|trace-warnings" | grep -vE "velas: .*fetch failed" | tail -45
}

do_forex_meanrev() {
  sec "RSI2 EN TENDENCIA (Connors) H1/H4 — backtest con historia de OANDA"
  timeout 2700 node scripts/forex-bot.cjs meanrev 2>&1 | grep -vE "ExperimentalWarning|trace-warnings|velas: " | grep -E "^\\||^#|Apta|Datos|\\[RSI2\\] .*(APTA|sin historia)|error" | tail -70
}

do_forex_ignition() {
  sec "IGNICIÓN DE MOMENTO + NOTICIAS (FX/CFD por MT5, cripto por Kraken) — backtest"
  timeout 3300 node scripts/forex-bot.cjs ignition 2>&1 | grep -vE "ExperimentalWarning|trace-warnings" | grep -E "APTA|noticias:|sin historia|error|^\\| " | tail -110
}

do_forex_bot() {
  sec "BOT FOREX"
  if ! pm2 describe forgeos-forex-bot >/dev/null 2>&1; then
    pm2 start ecosystem.config.js --only forgeos-forex-bot >/dev/null 2>&1 && pm2 save >/dev/null 2>&1 && echo "forgeos-forex-bot arrancado (primera vez)"
    sleep 40
  fi
  pm2 jlist 2>/dev/null | python3 -c '
import sys, json
for p in json.load(sys.stdin):
    if p.get("name") == "forgeos-forex-bot":
        e = p.get("pm2_env", {}); print("proceso:", e.get("status"), "reinicios:", e.get("restart_time"))'
  echo "modo: $(grep -E '^FOREX_BOT_MODE=' .env.local | cut -d= -f2 || true) (vacío = shadow) · OANDA: $(grep -qE '^OANDA_API_TOKEN=.+' .env.local && echo configurado || echo 'no configurado') · entorno: $(grep -E '^OANDA_ENV=' .env.local | cut -d= -f2)"
  echo "--- últimos ciclos"
  grep -hE "\[ForexBot\]" logs/forgeos-forex-bot-out.log 2>/dev/null | tail -6 | cut -c1-400
  tail -5 logs/forgeos-forex-bot-error.log 2>/dev/null | cut -c1-300
  echo "--- operaciones"
  python3 - <<'PY'
import json
try:
    t = json.load(open(".forgeos/forex-bot/trades.json"))
except Exception:
    print("sin operaciones todavía"); raise SystemExit
for x in t[-12:]:
    print(x.get("mode"), x.get("instrument"), x.get("side"), x.get("units"), "entrada", x.get("entry"), "SL", round(x.get("stop", 0), 5), "TP", round(x.get("takeProfit", 0), 5),
          "| cierre", x.get("closedAt", "abierta"), x.get("exitReason"), "P&L", x.get("pnl"))
PY
}

MT5_DIR=/root/mt5-config

mt5_key() { cat "$MT5_DIR/forgeos/bridge-key.txt" 2>/dev/null; }

do_mt5_setup() {
  sec "RECURSOS"
  df -h / | tail -1; free -m | sed -n '1,2p'
  sec "CONTENEDOR MT5"
  mkdir -p "$MT5_DIR/forgeos" && chmod 700 "$MT5_DIR" "$MT5_DIR/forgeos"
  if [ ! -s "$MT5_DIR/forgeos/bridge-key.txt" ]; then
    head -c 32 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 40 > "$MT5_DIR/forgeos/bridge-key.txt"; chmod 600 "$MT5_DIR/forgeos/bridge-key.txt"
  fi
  cp services/mt5-bridge/mt5_bridge.py "$MT5_DIR/forgeos/mt5_bridge.py"
  if ! docker inspect mt5 >/dev/null 2>&1; then
    docker pull -q gmag11/metatrader5_vnc:latest >/dev/null && echo "imagen descargada"
    local vncpass; vncpass="$(head -c 24 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 20)"
    echo "$vncpass" > "$MT5_DIR/forgeos/vnc-pass.txt"; chmod 600 "$MT5_DIR/forgeos/vnc-pass.txt"
    docker run -d --name mt5 --restart always \
      -e CUSTOM_USER=forgeos -e PASSWORD="$vncpass" \
      -p 127.0.0.1:3100:3000 -p 127.0.0.1:8004:8004 \
      -v "$MT5_DIR":/config gmag11/metatrader5_vnc:latest >/dev/null && echo "contenedor mt5 creado (solo accesible desde el propio servidor)"
  else
    docker start mt5 >/dev/null 2>&1; echo "contenedor mt5 ya existía"
  fi
  echo "esperando la primera instalación de MT5 + Python (hasta 15 min)…"
  local i
  for i in $(seq 1 90); do
    if docker exec mt5 sh -c 'ls /config/.wine/drive_c/Program\ Files/MetaTrader\ 5/terminal64.exe >/dev/null 2>&1 && find /config/.wine/drive_c -iname python.exe 2>/dev/null | grep -q .'; then
      echo "MT5 y Python instalados (tras $((i*10)) s)"; break
    fi
    sleep 10
  done
  docker logs --tail 15 mt5 2>&1 | cut -c1-200
  sec "ENTORNO"
  if ! grep -q '^MT5_BRIDGE_KEY=' .env.local; then echo "MT5_BRIDGE_KEY=$(mt5_key)" >> .env.local; echo "MT5_BRIDGE_KEY añadido a .env.local"; fi
  grep -q '^MT5_BRIDGE_URL=' .env.local || echo "MT5_BRIDGE_URL=http://127.0.0.1:8004" >> .env.local
  sec "PUENTE"
  if pm2 describe forgeos-mt5-bridge >/dev/null 2>&1; then pm2 restart forgeos-mt5-bridge >/dev/null; else pm2 start ecosystem.config.js --only forgeos-mt5-bridge >/dev/null; pm2 save >/dev/null 2>&1; fi
  sleep 20
  tail -5 logs/forgeos-mt5-bridge-out.log 2>/dev/null; tail -5 logs/forgeos-mt5-bridge-error.log 2>/dev/null
  echo "credenciales: $( [ -s "$MT5_DIR/forgeos/mt5-credentials.json" ] && echo guardadas || echo 'PENDIENTES (comando oculto)')"
}

do_mt5_shot() {
    docker exec mt5 sh -c 'xwd -root -silent -display :1' > /tmp/mt5.xwd 2>/dev/null
    if false; then :
    else python3 -c "import PIL" 2>/dev/null || pip3 install -q --break-system-packages pillow >/dev/null 2>&1
      python3 - <<'PY'
import struct
from PIL import Image
d = open("/tmp/mt5.xwd", "rb").read()
h = struct.unpack(">25I", d[:100])
hsize, w, ht, border, bpp, bpl, ncolors = h[0], h[4], h[5], h[7], h[11], h[12], h[19]
off = hsize + ncolors * 12
raw = d[off:off + bpl * ht]
mode = "BGRX" if border == 0 else "XRGB"
im = Image.frombytes("RGB", (w, ht), raw, "raw", mode, bpl)
im.thumbnail((1280, 1280)); im.save("/tmp/mt5.png")
PY
    fi
    echo "PNG-BEGIN"; base64 -w0 /tmp/mt5.png; echo; echo "PNG-END" 
}

do_mt5_status() {
  sec "MT5"
  docker ps --format '{{.Names}} {{.Status}}' | grep -E '^mt5 ' || echo "contenedor mt5 no está en marcha"
  pm2 jlist 2>/dev/null | python3 -c '
import sys, json
for p in json.load(sys.stdin):
    if p.get("name") == "forgeos-mt5-bridge": print("puente:", p["pm2_env"]["status"], "reinicios:", p["pm2_env"]["restart_time"])'
  # Sync bridge code + ownership (the Wine user inside the container must read /config/forgeos).
  if [ -d /root/mt5-config/forgeos ]; then
    local WU; WU="$(stat -c %u /root/mt5-config/.wine 2>/dev/null || echo 0)"
    if ! cmp -s services/mt5-bridge/mt5_bridge.py /root/mt5-config/forgeos/mt5_bridge.py; then
      cp services/mt5-bridge/mt5_bridge.py /root/mt5-config/forgeos/mt5_bridge.py; echo "puente actualizado"; MT5_RESTART=1
    fi
    if [ -n "$(find /root/mt5-config/forgeos ! -uid "$WU" 2>/dev/null | head -1)" ]; then
      chown -R "$WU" /root/mt5-config/forgeos; echo "permisos ajustados a uid $WU"; MT5_RESTART=1
    fi
    curl -s --max-time 10 http://127.0.0.1:8004/health >/dev/null 2>&1 || echo "puente sin respuesta (puede estar arrancando)"
    if [ "${MT5_RESTART:-0}" = 1 ] || [ "$(pm2 jlist 2>/dev/null | python3 -c 'import sys,json; print(next((p["pm2_env"]["status"] for p in json.load(sys.stdin) if p.get("name")=="forgeos-mt5-bridge"),""))')" != online ]; then
      pm2 restart forgeos-mt5-bridge --update-env >/dev/null 2>&1 || pm2 start ecosystem.config.js --only forgeos-mt5-bridge >/dev/null 2>&1
      echo "puente reiniciado; esperando 90 s…"; sleep 90
    fi
  fi
  echo "--- diagnóstico contenedor"
  docker exec mt5 sh -c 'ls -ld /config/.wine; ls "/config/.wine/drive_c/Program Files/MetaTrader 5/terminal64.exe" 2>&1; find /config/.wine/drive_c -iname python.exe 2>/dev/null | grep -vi scripts' 2>&1 | head -8
  docker exec mt5 sh -c 'ps -eo pid,etime,args | grep -iE "terminal64|python" | grep -v grep' 2>&1 | cut -c1-200 | head -6
  echo "--- logs del terminal"
  find /root/mt5-config/.wine/drive_c -path '*logs*' -name '2*.log' -mmin -180 2>/dev/null | head -4 | while IFS= read -r f; do
    echo "## ${f#/root/mt5-config/.wine/drive_c}"
    iconv -f UTF-16LE -t UTF-8 "$f" 2>/dev/null | tr -d '\r' | tail -15 | cut -c1-220
  done
  echo "--- herramientas X: $(docker exec mt5 sh -c 'for t in xwd import scrot xdotool wmctrl; do command -v $t >/dev/null && printf "%s " $t; done')"
  docker exec mt5 sh -c 'command -v wmctrl >/dev/null && DISPLAY=:1 wmctrl -l' 2>&1 | head -8
  : docker exec mt5 sh -c 'ls -t "/config/.wine/drive_c/Program Files/MetaTrader 5/logs/"*.log 2>/dev/null | head -1 | xargs -r -I{} sh -c "tail -15 \"{}\" | iconv -f UTF-16LE -t UTF-8 2>/dev/null || tail -15 \"{}\""' 2>&1 | tr -d '\000' | cut -c1-220 | tail -15
  local K; K="$(mt5_key)"
  for path in "/health" "/tradecheck" "/resolve?base=EUR_USD"; do
    echo "--- $path"; curl -s --max-time 90 "http://127.0.0.1:8004$path" -H "X-Bridge-Key: $K" | cut -c1-900; echo
  done
  local S; S="$(curl -s --max-time 30 "http://127.0.0.1:8004/resolve?base=EUR_USD" -H "X-Bridge-Key: $K" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("symbol") or "")' 2>/dev/null)"
  if [ -n "$S" ]; then
    echo "--- /symbol $S"; curl -s --max-time 30 "http://127.0.0.1:8004/symbol?symbol=$S" -H "X-Bridge-Key: $K" | cut -c1-900; echo
    echo "--- velas M15 (últimas 2)"; curl -s --max-time 30 "http://127.0.0.1:8004/rates?symbol=$S&tf=M15&count=2" -H "X-Bridge-Key: $K" | cut -c1-400; echo
  fi
  tail -6 logs/forgeos-mt5-bridge-out.log 2>/dev/null | cut -c1-300; tail -6 logs/forgeos-mt5-bridge-error.log 2>/dev/null | cut -c1-300
}

do_patches() {
  git fetch -q origin
  local n; n=$(git rev-list --count --no-merges "origin/$BRANCH..HEAD")
  echo "commits del servidor no presentes en GitHub: $n"
  [ "$n" -gt 0 ] && git format-patch --stdout --no-merges "origin/$BRANCH..HEAD" -- . ':(exclude).env*' ':(exclude).forgeos'
}

case "$ACTION" in
  status) do_status ;;
  deploy) do_deploy ;;
  patches) do_patches ;;
  broker-proposals) do_broker_proposals 40 ;;
  diff) do_diff ;;
  align) do_align ;;
  readiness) do_readiness ;;
  trace) do_trace "$ARG" ;;
  cycle-trace) do_cycle_trace ;;
  install-twsapi) do_install_twsapi ;;
  fractional-on) do_fractional_on ;;
  fractional-off) do_fractional_off ;;
  unblock-eu) do_unblock_eu ;;
  orders) do_orders ;;
  futures) do_futures ;;
  set-flag) do_set_flag "$ARG" ;;
  gateway-info) do_gateway_info ;;
  gateway-check) do_gateway_check ;;
  gateway-upgrade) do_gateway_upgrade "$ARG" ;;
  gateway-rollback) do_gateway_rollback ;;
  gateway-logs) do_gateway_logs ;;
  protect) do_protect "$ARG" ;;
  telegram-stats) do_telegram_stats ;;
  screenshot) do_screenshot "$ARG" ;;
  signals) do_signals ;;
  forex-backtest) do_forex_backtest "$ARG" ;;
  forex-bot) do_forex_bot ;;
  forex-optimize) do_forex_optimize "$ARG" ;;
  forex-playbook) do_forex_playbook ;;
  forex-methods) do_forex_methods ;;
  forex-meanrev) do_forex_meanrev ;;
  forex-ignition) do_forex_ignition ;;
  forex-lock)
    # Owner confirmation: lock a validated strategy so it may trade real money (ARG = strategy id).
    ID="$ARG" python3 - <<'PY'
import json, os, glob
want = os.environ["ID"].upper()
d = "/var/www/forgeos/.forgeos/forex-bot"
hit = False
for name in ("meanrev-latest.json", "methods-latest.json", "playbook-latest.json"):
    p = os.path.join(d, name)
    if not os.path.exists(p):
        continue
    j = json.load(open(p))
    for r in j.get("results", []):
        if r.get("id", "").upper() == want:
            if not r.get("liveEligible"):
                print("NO: %s no pasó la validación (%s)" % (r["id"], r.get("reason")))
            else:
                r["locked"] = True; hit = True
                print("confirmada para real: %s (%s)" % (r["id"], r.get("name")))
    json.dump(j, open(p, "w"), indent=2)
if not hit:
    print("sin cambios para %s" % want)
PY
    ;;
  mt5-setup) do_mt5_setup ;;
  mt5-status) do_mt5_status ;;
  mt5-wine9)
    # MT5 recent builds show "A debugger has been found" under Wine ≥10: pin Wine 9.0 inside the container.
    pm2 stop forgeos-mt5-bridge >/dev/null 2>&1; pkill -f mt5_bridge.py; pkill -f terminal64.exe; sleep 2; pkill -9 -f terminal64.exe
    docker exec mt5 sh -c '. /etc/os-release; echo "$PRETTY_NAME"; apt-get update -qq >/dev/null 2>&1; apt-cache madison winehq-stable | head -5'
    docker exec mt5 sh -c 'dpkg -l | grep -i wine | awk "{print \$2, \$3}"; ls /etc/apt/sources.list.d/; cat /etc/apt/sources.list.d/* 2>/dev/null | head -5; apt-cache madison wine wine64 winehq-devel winehq-staging 2>/dev/null | head -12'
    V="$(docker exec mt5 sh -c 'apt-cache madison winehq-stable | awk "{print \$3}" | grep "^9\.0" | head -1')"
    echo "versión 9.0 disponible: ${V:-ninguna}"
    if [ -z "$V" ]; then
      echo "instalando Wine 9.0 desde el pool de WineHQ…"
      docker exec mt5 sh -c 'set -e; cd /tmp; P=https://dl.winehq.org/wine-builds/debian/pool/main/w/wine; V=9.0.0.0~bookworm-1
        for f in wine-stable-amd64_${V}_amd64 wine-stable-i386_${V}_i386 wine-stable_${V}_amd64 winehq-stable_${V}_amd64; do
          curl -sSfLo "$f.deb" "$P/$f.deb" || { echo "no se pudo descargar $f"; exit 1; }; done
        DEBIAN_FRONTEND=noninteractive dpkg -i wine-stable-amd64_*.deb wine-stable-i386_*.deb wine-stable_*.deb winehq-stable_*.deb 2>&1 | tail -3
        apt-mark hold winehq-stable wine-stable wine-stable-amd64 wine-stable-i386 >/dev/null; wine --version' 2>&1 | tail -6
    fi
    if [ -n "$V" ]; then
      docker exec mt5 sh -c "DEBIAN_FRONTEND=noninteractive apt-get install -y -qq --allow-downgrades winehq-stable=$V wine-stable=$V wine-stable-amd64=$V wine-stable-i386=$V >/tmp/wine9.log 2>&1; tail -3 /tmp/wine9.log; apt-mark hold winehq-stable wine-stable wine-stable-amd64 wine-stable-i386 >/dev/null"
      docker exec mt5 wine --version
    fi
    # Update the prefix for the new Wine without the Mono/Gecko install dialogs (they block the terminal).
    WU="$(stat -c %u /root/mt5-config/.wine)"
    docker exec -u "$WU" -e HOME=/config -e WINEPREFIX=/config/.wine -e DISPLAY=:1 mt5 sh -c 'wineserver -k 2>/dev/null; WINEDLLOVERRIDES="mscoree=d;mshtml=d" wineboot -u >/dev/null 2>&1; wineserver -w; echo "prefijo actualizado"'
    pm2 restart forgeos-mt5-bridge >/dev/null 2>&1; echo "puente reiniciado" ;;
  mt5-wine-staging)
    # MetaQuotes forum: wine-staging ≥11.3 + Windows 11 mode carries a patch for the false "debugger found".
    pm2 stop forgeos-mt5-bridge >/dev/null 2>&1; pkill -f mt5_bridge.py; pkill -f terminal64.exe; sleep 2; pkill -9 -f terminal64.exe
    docker exec mt5 sh -c '
      set -e; cd /tmp; P=https://dl.winehq.org/wine-builds/debian/pool/main/w/wine-staging
      V=$(curl -sSf "$P/" | grep -o "wine-staging_[0-9.]*~bookworm-[0-9]*_amd64.deb" | sed "s/wine-staging_//; s/_amd64.deb//" | sort -V | tail -1)
      echo "wine-staging disponible: $V"; [ -n "$V" ]
      for f in wine-staging-amd64_${V}_amd64 wine-staging-i386_${V}_i386 wine-staging_${V}_amd64 winehq-staging_${V}_amd64; do
        curl -sSfLo "$f.deb" "$P/$f.deb"; done
      apt-mark unhold winehq-stable wine-stable wine-stable-amd64 wine-stable-i386 >/dev/null 2>&1 || true
      dpkg -r winehq-stable wine-stable wine-stable-amd64 wine-stable-i386:i386 >/dev/null 2>&1 || true
      apt-get update -qq >/dev/null 2>&1 || true
      DEBIAN_FRONTEND=noninteractive apt-get install -y -qq ./wine-staging-amd64_*.deb ./wine-staging-i386_*.deb ./wine-staging_*.deb ./winehq-staging_*.deb 2>&1 | tail -3
      wine --version' 2>&1 | tail -8
    WU="$(stat -c %u /root/mt5-config/.wine)"
    docker exec -u "$WU" -e HOME=/config -e WINEPREFIX=/config/.wine -e DISPLAY=:1 -e "WINEDLLOVERRIDES=mscoree=d;mshtml=d" mt5 sh -c '
      wineserver -k 2>/dev/null; wineboot -u >/dev/null 2>&1; wineserver -w
      wine winecfg /v win11 >/dev/null 2>&1; wineserver -w
      echo "versión Windows: $(wine reg query "HKLM\Software\Microsoft\Windows NT\CurrentVersion" /v CurrentBuild 2>/dev/null | grep -o "[0-9]\{5\}")"'
    pm2 restart forgeos-mt5-bridge >/dev/null 2>&1; echo "puente reiniciado" ;;
  mt5-oanda)
    # Install OANDA TMS' own MT5 build (ships OANDA's server list, so the terminal can reach OANDATMS-MT5).
    pm2 stop forgeos-mt5-bridge >/dev/null 2>&1; pkill -f mt5_bridge.py; pkill -f terminal64.exe; sleep 2; pkill -9 -f terminal64.exe
    WU="$(stat -c %u /root/mt5-config/.wine)"
    URL="$(curl -sSL -A 'Mozilla/5.0' https://www.oanda.com/eu-en/download 2>/dev/null | grep -oE 'https://download\.mql5\.com/cdn/web/[^"'"'"' ]+5setup\.exe[^"'"'"' ]*' | head -1)"
    [ -z "$URL" ] && URL="$(curl -sSL -A 'Mozilla/5.0' https://www.oanda.com/eu-en/trading/platforms/metatrader-5/ 2>/dev/null | grep -oE 'https://download\.mql5\.com/cdn/web/[^"'"'"' ]+5setup\.exe[^"'"'"' ]*' | head -1)"
    echo "instalador OANDA: ${URL:-no encontrado}"
    if [ -n "$URL" ]; then
      docker exec -u "$WU" -e HOME=/config -e WINEPREFIX=/config/.wine -e DISPLAY=:1 -e WINEDEBUG=-all -e "WINEDLLOVERRIDES=mscoree=d;mshtml=d" mt5 sh -c "
        cd /tmp && curl -sSLo oanda5setup.exe '$URL' && ls -la oanda5setup.exe && timeout 600 wine oanda5setup.exe /auto; sleep 20
        find /config/.wine/drive_c -iname terminal64.exe | grep -v '/MetaTrader 5/terminal64'; 
        find /config/.wine/drive_c -iname servers.dat -newer /tmp/oanda5setup.exe 2>/dev/null | head -3"
      pkill -f terminal64.exe
    fi
    pm2 restart forgeos-mt5-bridge >/dev/null 2>&1; echo "puente reiniciado" ;;
  mt5-stop)
    pm2 stop forgeos-mt5-bridge >/dev/null 2>&1; pkill -f mt5_bridge.py; pkill -f terminal64.exe; sleep 2; pkill -9 -f terminal64.exe
    echo "puente y terminal MT5 parados (sin reintentos de login)" ;;
  mt5-webview)
    # MT5 dialogs (login, risk warning) are WebView2 pages: install the Edge WebView2 runtime + xdotool.
    WU="$(stat -c %u /root/mt5-config/.wine)"
    docker exec mt5 sh -c 'command -v xdotool >/dev/null || (apt-get update -qq >/dev/null 2>&1; DEBIAN_FRONTEND=noninteractive apt-get install -y -qq xdotool >/dev/null 2>&1); command -v xdotool && echo "xdotool ok"'
    docker exec -u "$WU" -e HOME=/config -e WINEPREFIX=/config/.wine -e DISPLAY=:1 -e WINEDEBUG=-all mt5 sh -c '
      cd /tmp && curl -sSLo wv2.exe "https://go.microsoft.com/fwlink/?linkid=2124701" && ls -la wv2.exe &&
      timeout 900 wine wv2.exe /silent /install; echo "instalador WebView2 terminado: $?"
      find /config/.wine/drive_c -maxdepth 6 -iname msedgewebview2.exe 2>/dev/null | head -2'
    pm2 restart forgeos-mt5-bridge >/dev/null 2>&1; echo "puente reiniciado (el terminal se reabre)" ;;
  mt5-ui)
    # Drive the MT5 window: ARG like CLICK:500:300-TAB-ENTER-SPACE-ESC-WAIT (then a screenshot).
    for step in $(echo "$ARG" | tr '-' ' '); do
      case "$step" in
        CLICK:*) xy="${step#CLICK:}"; docker exec mt5 sh -c "DISPLAY=:1 xdotool mousemove ${xy%%:*} ${xy##*:} click 1" ;;
        DCLICK:*) xy="${step#DCLICK:}"; docker exec mt5 sh -c "DISPLAY=:1 xdotool mousemove ${xy%%:*} ${xy##*:} click --repeat 2 1" ;;
        TAB) docker exec mt5 sh -c 'DISPLAY=:1 xdotool key Tab' ;;
        ENTER) docker exec mt5 sh -c 'DISPLAY=:1 xdotool key Return' ;;
        SPACE) docker exec mt5 sh -c 'DISPLAY=:1 xdotool key space' ;;
        ESC) docker exec mt5 sh -c 'DISPLAY=:1 xdotool key Escape' ;;
        WAIT) sleep 5 ;;
        *) echo "paso desconocido: $step" ;;
      esac
      sleep 1
    done
    sleep 3
    docker exec mt5 sh -c 'DISPLAY=:1 xdotool search --onlyvisible --name . getwindowname %@ 2>/dev/null' | sort -u | head -12
    do_mt5_shot ;;
  mt5-shot) do_mt5_shot ;;
  mt5-test-order)
    # Real end-to-end test requested by the owner: BUY 0.01 EURUSD with SL/TP 20 pips, then close it.
    K="$(mt5_key)"; B=http://127.0.0.1:8004
    S="$(curl -s --max-time 30 "$B/resolve?base=EUR_USD" -H "X-Bridge-Key: $K" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("symbol") or "")')"
    Q="$(curl -s --max-time 30 "$B/symbol?symbol=$S" -H "X-Bridge-Key: $K")"
    echo "símbolo: $S"; echo "$Q" | python3 -c 'import sys,json; d=json.load(sys.stdin); print("bid/ask:", d["bid"], d["ask"], "spread:", round((d["ask"]-d["bid"])/d["point"]/10,1), "pips")'
    echo "--- comprobación en seco"; curl -s --max-time 30 "$B/tradecheck" -H "X-Bridge-Key: $K"; echo
    BODY="$(echo "$Q" | python3 -c 'import sys,json; d=json.load(sys.stdin); a=d["ask"]; p=d["point"]; print(json.dumps({"symbol":d["symbol"],"side":"long","volume":0.01,"sl":round(a-200*p,d["digits"]),"tp":round(a+200*p,d["digits"]),"comment":"forgeos test"}))')"
    echo "--- orden: $BODY"
    R="$(curl -s --max-time 60 -X POST "$B/order" -H "X-Bridge-Key: $K" -H 'Content-Type: application/json' -d "$BODY")"; echo "$R"
    T="$(echo "$R" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("order") or "")' 2>/dev/null)"
    if [ -n "$T" ]; then
      sleep 5
      echo "--- posición abierta"; curl -s --max-time 30 "$B/positions" -H "X-Bridge-Key: $K" | python3 -c "import sys,json; [print(p) for p in json.load(sys.stdin) if str(p['ticket'])=='$T']"
      echo "--- cierre"; curl -s --max-time 60 -X POST "$B/close" -H "X-Bridge-Key: $K" -H 'Content-Type: application/json' -d "{\"ticket\": $T}"; echo
      sleep 3
      echo "--- resultado"; curl -s --max-time 30 "$B/closed?ticket=$T" -H "X-Bridge-Key: $K"; echo
    fi ;;
  cancel-order) do_cancel_order "$ARG" ;;
  update-script)
    git fetch -q origin && git show "origin/$BRANCH:deploy/remote/forgeos-remote.sh" > /tmp/forgeos-remote.new \
      && bash -n /tmp/forgeos-remote.new && install -m 700 /tmp/forgeos-remote.new /usr/local/bin/forgeos-remote \
      && echo "script remoto actualizado a $(git log -1 --format=%h "origin/$BRANCH")" ;;
  *) echo "Acción no permitida: '$ACTION' (status | deploy | patches | broker-proposals | diff | align | readiness | update-script | trace TICKER | cycle-trace)"; exit 2 ;;
esac
