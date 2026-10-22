#!/usr/bin/env bash
# PM2 runner (forgeos-mt5-bridge): runs the bridge with the Windows Python inside the MT5 container.
set -u
C=mt5
until docker inspect -f '{{.State.Running}}' "$C" 2>/dev/null | grep -q true; do echo "esperando contenedor $C…"; sleep 10; done
PY="$(docker exec "$C" sh -c 'find /config/.wine/drive_c -iname python.exe -path "*Python3*" 2>/dev/null | grep -vi scripts | head -1')"
if [ -z "$PY" ]; then echo "python.exe de Wine no encontrado (¿primera instalación en curso?)"; sleep 30; exit 1; fi
WINPY="Z:${PY//\//\\}"
echo "bridge: $WINPY"
exec docker exec -e WINEDEBUG=-all "$C" sh -c "cd /config/forgeos && wine '$WINPY' 'Z:\\config\\forgeos\\mt5_bridge.py'"
