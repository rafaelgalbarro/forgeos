# IBKR TWS API — official Python `pythonclient`

ForgeOS `services/ibkr-broker` must import **`ibapi` from Interactive Brokers’ TWS API bundle**, not the outdated **PyPI `ibapi` 9.81.x** snapshot. PyPI lacks current order fields and API version **≥ 163** required for **fractional shares** (IBKR error **10285** otherwise).

## Where to get it

1. **IBKR Account Management** → **Settings** → **API** → **Settings** → download **TWS API** (stable), or  
2. There is **no** official public git mirror — use the **Mac/Unix ZIP** from the download page; Python code is under `source/pythonclient/` inside the extracted bundle.

License: use only per IBKR’s API license; do not redistribute the bundle in git — install on each host.

## Ubuntu server (production)

1. Download **Stable** (or Latest) **Mac/Unix** ZIP from [interactivebrokers.github.io](https://interactivebrokers.github.io/) after accepting the license.  
2. Install:

```bash
cd /path/to/ForgeOS_App_Factory_v0_1
chmod +x scripts/install-ibkr-tws-pythonclient.sh
IBKR_TWS_API_ZIP=/path/to/twsapi_macunix.XXXX.zip ./scripts/install-ibkr-tws-pythonclient.sh
```

Default install path:

`services/ibkr-broker/tws-api/pythonclient`

### Broker `.env`

In `services/ibkr-broker/.env`:

```env
IBKR_TWS_API_PYTHONPATH=/path/to/ForgeOS_App_Factory_v0_1/services/ibkr-broker/tws-api/pythonclient
```

### PM2

In your PM2 ecosystem file for `ibkr-broker`, set the same variable:

```js
env: {
  IBKR_TWS_API_PYTHONPATH: "/path/to/.../services/ibkr-broker/tws-api/pythonclient",
}
```

Then:

```bash
pm2 restart ibkr-broker
```

Broker logs on start should show `ibapi path=... SERVER_VERSION=... fractional_ok=True`.

## Windows (dev / IB Gateway on same machine)

1. Install **TWS API** from IBKR (includes `source\pythonclient`).  
2. Or extract the Windows installer bundle and point `IBKR_TWS_API_PYTHONPATH` at `source\pythonclient`, or use the ZIP + install script on WSL/Linux.

3. In `services/ibkr-broker/.env`:

   ```env
   IBKR_TWS_API_PYTHONPATH=C:\TWS API\source\pythonclient
   ```

   or the path under `services\ibkr-broker\tws-api\pythonclient`.

## Verify (no live order)

With broker + TWS connected:

```bash
npx tsx scripts/ibkr-fractional-whatif.ts --account U24225949 --symbol AAPL --quantity 0.1
```

- **PyPI only**: broker refuses before placeOrder with a message to set `IBKR_TWS_API_PYTHONPATH`.  
- **Official client**: what-if runs with `transmit=false`, `whatIf=true`; response includes `ibapi.server_version`.

## Python venv note

`pip install -r requirements.txt` may still install PyPI `ibapi` for dependency metadata. **`IBKR_TWS_API_PYTHONPATH` is prepended to `sys.path` in `app/main.py`**, so the official tree wins when the path exists.
