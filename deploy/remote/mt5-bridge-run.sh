#!/usr/bin/env bash
# PM2 runner (forgeos-mt5-bridge): runs the bridge with a 64-bit Windows Python inside the MT5 container
# (the MetaTrader5 package only ships win_amd64 wheels), as the user that owns the Wine prefix.
set -u
C=mt5
until docker inspect -f '{{.State.Running}}' "$C" 2>/dev/null | grep -q true; do echo "esperando contenedor $C…"; sleep 10; done
U="$(docker exec "$C" stat -c %u /config/.wine 2>/dev/null || echo 0)"
dx() { docker exec -u "$U" -e DISPLAY=:1 -e HOME=/config -e WINEPREFIX=/config/.wine -e WINEDEBUG=-all -e "WINEDLLOVERRIDES=mscoree=d;mshtml=d" "$C" "$@"; }
# pm2 restart only kills the `docker exec` client: kill bridges left running inside the container.
# Also kill stray terminal64.exe instances (each failed initialize may spawn one); the bridge starts a fresh one.
# (host-level pkill: the container shares the kernel and may lack procps)
pkill -f "mt5_bridge.py"; pkill -f "terminal64.exe"; sleep 3; pkill -9 -f "mt5_bridge.py"; pkill -9 -f "terminal64.exe"
find_py64() {
  # Latest MetaTrader5 wheels need a recent Python (old 3.9 wheels speak an outdated IPC protocol).
  dx sh -c 'ls /config/.wine/drive_c/Python312-64/python.exe 2>/dev/null'
}
PY="$(find_py64)"
if [ -z "$PY" ]; then
  echo "instalando Python 3.12 de 64 bits en Wine…"
  dx sh -c 'cd /tmp && curl -sSLo py312.exe https://www.python.org/ftp/python/3.12.10/python-3.12.10-amd64.exe && wine py312.exe /quiet InstallAllUsers=1 PrependPath=0 Include_test=0 TargetDir="C:\\Python312-64"; wineserver -w' || true
  sleep 5
  PY="$(find_py64)"
fi
if [ -z "$PY" ]; then echo "python.exe 64 bits de Wine no encontrado"; sleep 60; exit 1; fi
WINPY="Z:${PY//\//\\}"
echo "bridge: $WINPY (uid $U)"
echo "MetaTrader5 py: $(dx wine "$WINPY" -c "import MetaTrader5 as m; print(m.__version__)" 2>/dev/null)"
if ! dx wine "$WINPY" -c "import MetaTrader5" >/dev/null 2>&1; then
  echo "instalando paquete MetaTrader5…"
  dx wine "$WINPY" -m pip install --upgrade --no-warn-script-location pip MetaTrader5 2>&1 | tail -3
fi
echo "wine: $(dx wine --version 2>/dev/null)"
# Start config: log in at launch (no login dialog) and allow algo trading for the Python API.
CF=/root/mt5-config/forgeos
if [ -f "$CF/mt5-credentials.json" ]; then
  python3 - "$CF" <<'PY'
import json, os, sys
d = sys.argv[1]
c = json.load(open(os.path.join(d, "mt5-credentials.json")))
ini = ("[Common]\r\nLogin=%s\r\nPassword=%s\r\nServer=%s\r\nKeepPrivate=1\r\nNewsEnable=0\r\n"
       "[Experts]\r\nAllowLiveTrading=1\r\nAllowDllImport=0\r\nEnabled=1\r\nAccount=0\r\nProfile=0\r\n") % (c["login"], c["password"], c["server"])
p = os.path.join(d, "start.ini")
with open(p, "w", encoding="utf-16") as fh:
    fh.write(ini)
os.chmod(p, 0o600)
PY
  chown "$U" "$CF/start.ini"
fi
# Start the terminal ourselves (detached, on the VNC display); the bridge then attaches to it.
docker exec -d -u "$U" -e DISPLAY=:1 -e HOME=/config -e WINEPREFIX=/config/.wine -e WINEDEBUG=-all -e "WINEDLLOVERRIDES=mscoree=d;mshtml=d" "$C" \
  wine 'C:\Program Files\MetaTrader 5\terminal64.exe' '/config:Z:\config\forgeos\start.ini'
sleep 40
exec docker exec -u "$U" -e DISPLAY=:1 -e HOME=/config -e WINEPREFIX=/config/.wine -e WINEDEBUG=-all -e "WINEDLLOVERRIDES=mscoree=d;mshtml=d" -w /config/forgeos "$C" wine "$WINPY" 'Z:\config\forgeos\mt5_bridge.py'
