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
ACTION="$(echo "$RAW" | awk '{print $1}' | tr -cd 'a-z-')"
# Argumento opcional (p. ej. un ticker): solo mayúsculas, dígitos, punto y guion.
ARG="$(echo "$RAW" | awk '{print $2}' | tr -cd 'A-Z0-9.-' | cut -c1-12)"

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
  npm install --no-audit --no-fund 2>&1 | tail -2
  if ! npm run build > /tmp/forgeos-build.log 2>&1; then
    tail -30 /tmp/forgeos-build.log
    echo "ABORTADO: el build ha fallado — NO se reinicia nada."
    exit 4
  fi
  grep -E "Compiled|Generating static" /tmp/forgeos-build.log | tail -2

  sec "REINICIO"
  pm2 restart forgeos forgeos-scheduler forgeos-crypto-engine ibkr-broker --update-env > /dev/null && echo "reiniciados: forgeos forgeos-scheduler forgeos-crypto-engine ibkr-broker"
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
  if ! (cd /tmp && "$PY" -c "import sys; sys.path.insert(0, '$DEST.new'); import ibapi.client as c; print('SERVER_VERSION', c.SERVER_VERSION if hasattr(c,'SERVER_VERSION') else '?')" 2>&1); then
    echo "falta alguna dependencia; instalando protobuf…"
    "$PY" -m pip install -q --break-system-packages protobuf 2>&1 | tail -2
    (cd /tmp && "$PY" -c "import sys; sys.path.insert(0, '$DEST.new'); import ibapi.client as c; print('SERVER_VERSION', c.SERVER_VERSION)") || { echo "ABORTADO: no importa"; rm -rf "$DEST.new"; exit 5; }
  fi
  (cd /tmp && "$PY" -c "import sys; sys.path.insert(0, '$DEST.new'); from ibapi import server_versions as v; print('MIN_SERVER_VER_FRACTIONAL_POSITIONS', getattr(v,'MIN_SERVER_VER_FRACTIONAL_POSITIONS','?'))" 2>&1 | tail -1)

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
  update-script)
    git fetch -q origin && git show "origin/$BRANCH:deploy/remote/forgeos-remote.sh" > /tmp/forgeos-remote.new \
      && bash -n /tmp/forgeos-remote.new && install -m 700 /tmp/forgeos-remote.new /usr/local/bin/forgeos-remote \
      && echo "script remoto actualizado a $(git log -1 --format=%h "origin/$BRANCH")" ;;
  *) echo "Acción no permitida: '$ACTION' (status | deploy | patches | broker-proposals | diff | align | readiness | update-script | trace TICKER | cycle-trace)"; exit 2 ;;
esac
