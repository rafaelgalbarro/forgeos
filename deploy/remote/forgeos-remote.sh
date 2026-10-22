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
# Acciones: status | deploy | patches | broker-proposals | diff | align
# Nunca imprime secretos (.env.local no se muestra).

set -uo pipefail
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
APP=/var/www/forgeos
BRANCH=feature/ibkr-live-supervised-v1
ACTION="${SSH_ORIGINAL_COMMAND:-${1:-}}"
ACTION="$(echo "$ACTION" | tr -cd 'a-z-')"

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
  *) echo "Acción no permitida: '$ACTION' (status | deploy | patches | broker-proposals | diff | align)"; exit 2 ;;
esac
