#!/usr/bin/env bash
# Install official IBKR TWS API pythonclient (not PyPI ibapi) for services/ibkr-broker.
# IBKR does not host the bundle on public git — download the Stable/Latest ZIP from:
#   https://interactivebrokers.github.io/  (accept license, Mac/Unix ZIP for Ubuntu)
#
# Usage (Ubuntu):
#   export IBKR_TWS_API_ZIP=/tmp/twsapi_macunix.1037.01.zip
#   ./scripts/install-ibkr-tws-pythonclient.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${IBKR_TWS_API_INSTALL_DIR:-$REPO_ROOT/services/ibkr-broker/tws-api/pythonclient}"
ZIP="${IBKR_TWS_API_ZIP:-}"

echo "==> ForgeOS IBKR TWS pythonclient install"
echo "    destination: $DEST"

if [[ -z "$ZIP" || ! -f "$ZIP" ]]; then
  cat >&2 <<EOF
Set IBKR_TWS_API_ZIP to the Mac/Unix TWS API zip you downloaded from:
  https://interactivebrokers.github.io/
Example:
  IBKR_TWS_API_ZIP=~/Downloads/twsapi_macunix.1037.01.zip $0
EOF
  exit 1
fi

if ! command -v unzip >/dev/null 2>&1; then
  echo "unzip is required (apt install unzip)" >&2
  exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
unzip -q "$ZIP" -d "$TMP"

PYCLIENT=""
for candidate in \
  "$TMP"/IBJts/source/pythonclient \
  "$TMP"/twsapi/source/pythonclient \
  "$TMP"/*/source/pythonclient; do
  if [[ -d "$candidate" ]]; then
    PYCLIENT="$candidate"
    break
  fi
done

if [[ -z "$PYCLIENT" ]]; then
  echo "Could not find source/pythonclient inside zip — check IBKR bundle layout" >&2
  exit 1
fi

mkdir -p "$(dirname "$DEST")"
rm -rf "$DEST"
cp -a "$PYCLIENT" "$DEST"

echo "==> Installed pythonclient at: $DEST"
echo "Set in services/ibkr-broker/.env (and PM2 ecosystem):"
echo "  IBKR_TWS_API_PYTHONPATH=$DEST"
echo "Restart ibkr-broker after setting the variable."
