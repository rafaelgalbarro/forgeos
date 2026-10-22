#!/usr/bin/env bash
# PM2 runner (forgeos-mt5-bridge): runs the bridge with a 64-bit Windows Python inside the MT5 container
# (the MetaTrader5 package only ships win_amd64 wheels), as the user that owns the Wine prefix.
set -u
C=mt5
until docker inspect -f '{{.State.Running}}' "$C" 2>/dev/null | grep -q true; do echo "esperando contenedor $C…"; sleep 10; done
U="$(docker exec "$C" stat -c %u /config/.wine 2>/dev/null || echo 0)"
dx() { docker exec -u "$U" -e DISPLAY=:1 -e HOME=/config -e WINEPREFIX=/config/.wine -e WINEDEBUG=-all -e "WINEDLLOVERRIDES=mscoree=d;mshtml=d" "$C" "$@"; }
find_py64() {
  dx sh -c 'find /config/.wine/drive_c -iname python.exe 2>/dev/null | grep -vi -e scripts -e "(x86)" -e "-32" -e venv | head -1'
}
PY="$(find_py64)"
if [ -z "$PY" ]; then
  echo "instalando Python 3.9 de 64 bits en Wine…"
  dx sh -c 'cd /tmp && curl -sSLo py64.exe https://www.python.org/ftp/python/3.9.13/python-3.9.13-amd64.exe && wine py64.exe /quiet InstallAllUsers=1 PrependPath=0 Include_test=0 TargetDir="C:\\Python39-64"' || true
  sleep 5
  PY="$(find_py64)"
fi
if [ -z "$PY" ]; then echo "python.exe 64 bits de Wine no encontrado"; sleep 60; exit 1; fi
# pm2 restart only kills the `docker exec` client: kill bridges left running inside the container.
# Also kill stray terminal64.exe instances (each failed initialize may spawn one); the bridge starts a fresh one.
# (host-level pkill: the container shares the kernel and may lack procps)
pkill -f "mt5_bridge.py"; pkill -f "terminal64.exe"; sleep 3; pkill -9 -f "mt5_bridge.py"; pkill -9 -f "terminal64.exe"
WINPY="Z:${PY//\//\\}"
echo "bridge: $WINPY (uid $U)"
if ! dx wine "$WINPY" -c "import MetaTrader5" >/dev/null 2>&1; then
  echo "instalando paquete MetaTrader5…"
  dx wine "$WINPY" -m pip install --upgrade --no-warn-script-location pip MetaTrader5 2>&1 | tail -3
fi
echo "wine: $(dx wine --version 2>/dev/null)"
# Start the terminal ourselves (detached, on the VNC display); the bridge then attaches to it.
docker exec -d -u "$U" -e DISPLAY=:1 -e HOME=/config -e WINEPREFIX=/config/.wine -e WINEDEBUG=-all -e "WINEDLLOVERRIDES=mscoree=d;mshtml=d" "$C" \
  wine 'C:\Program Files\MetaTrader 5\terminal64.exe'
sleep 40
exec docker exec -u "$U" -e DISPLAY=:1 -e HOME=/config -e WINEPREFIX=/config/.wine -e WINEDEBUG=-all -e "WINEDLLOVERRIDES=mscoree=d;mshtml=d" -w /config/forgeos "$C" wine "$WINPY" 'Z:\config\forgeos\mt5_bridge.py'
