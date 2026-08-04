"""
Read-only ForgeOS Investment connection validation.
Never places orders. Never changes IBKR_READ_ONLY or LIVE_TRADING_ENABLED.
"""
from __future__ import annotations

import json
import re
import socket
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IBKR_DIR = ROOT / "services" / "ibkr-broker"


def mask_account(account: str) -> str:
    if not account:
        return "NONE"
    if len(account) <= 4:
        return "***"
    return account[:2] + "***" + account[-2:]


def load_env_file(path: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    if not path.exists():
        return out
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        out[k.strip()] = v.strip().strip('"').strip("'")
    return out


def http_json(url: str, headers: dict[str, str] | None = None, method: str = "GET", timeout: int = 30) -> tuple[int, object]:
    req = urllib.request.Request(url, method=method, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            try:
                return resp.status, json.loads(body)
            except json.JSONDecodeError:
                return resp.status, body
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        try:
            return e.code, json.loads(body)
        except json.JSONDecodeError:
            return e.code, body
    except Exception as e:
        return 0, {"error": str(e)}


def contains_fake_markers(obj: object) -> bool:
    text = json.dumps(obj, default=str).upper()
    return bool(re.search(r"\bDU\d|PAPER_SIM|\bDEMO\b|FIXTURE|MOCK|STUB", text))


def socket_open(host: str, port: int, timeout: float = 3.0) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def http_text(url: str, timeout: int = 120) -> str:
    try:
        with urllib.request.urlopen(url, timeout=timeout) as resp:
            return resp.read().decode("utf-8", errors="replace")
    except Exception:
        return ""


def main() -> int:
    forge_env = load_env_file(ROOT / ".env.local")
    ibkr_env = load_env_file(IBKR_DIR / ".env")
    service_url = forge_env.get("IBKR_SERVICE_URL", "http://127.0.0.1:8000").rstrip("/")
    internal_key = forge_env.get("IBKR_INTERNAL_API_KEY") or ibkr_env.get("INTERNAL_API_KEY")
    headers = {"x-internal-api-key": internal_key} if internal_key else {}

    report: dict[str, object] = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "ORDERS_SENT": 0,
    }

    report["IBKR_SOCKET_4001"] = "PASS" if socket_open("127.0.0.1", 4001) else "FAIL"

    code, health = http_json(f"{service_url}/health", headers)
    report["FASTAPI_8000"] = "PASS" if code == 200 and isinstance(health, dict) and health.get("ok") else "FAIL"

    # FastAPI IBKR chain
    status: dict = {}
    try:
        code, st = http_json(f"{service_url}/api/ibkr/status", headers)
        if isinstance(st, dict) and not st.get("connected"):
            http_json(f"{service_url}/api/ibkr/connect", headers, method="POST", timeout=45)
            code, st = http_json(f"{service_url}/api/ibkr/status", headers)
        status = st if isinstance(st, dict) else {}
    except Exception as e:
        status = {"error": str(e)}

    accounts = status.get("managedAccounts") or []
    masked = [mask_account(a) for a in accounts]
    report["masked_accounts"] = masked
    report["nextValidId"] = status.get("nextValidId")
    report["ibkrReadOnly_service"] = status.get("ibkrReadOnly")
    report["liveTradingEnabled_service"] = status.get("liveTradingEnabled")

    paper_accounts = [a for a in accounts if str(a).upper().startswith("DU")]
    live_session = (
        status.get("connected") is True
        and status.get("nextValidId") is not None
        and len(accounts) > 0
        and len(paper_accounts) == 0
        and report["IBKR_SOCKET_4001"] == "PASS"
    )
    report["TWS_LIVE_SESSION"] = "PASS" if live_session else "FAIL"
    report["REAL_ACCOUNTS"] = "PASS" if len(accounts) > 0 and len(paper_accounts) == 0 else "FAIL"

    _, account = http_json(f"{service_url}/api/ibkr/account", headers, timeout=45)
    account_ok = False
    if isinstance(account, dict):
        account_ok = len(account) > 0 and not account.get("error")
    report["REAL_ACCOUNT_SUMMARY"] = "PASS" if account_ok else "FAIL"

    _, positions = http_json(f"{service_url}/api/ibkr/positions", headers, timeout=45)
    pos_list: list = []
    if isinstance(positions, list):
        pos_list = positions
    elif isinstance(positions, dict):
        pos_list = positions.get("positions") or []
    report["REAL_POSITIONS"] = "PASS" if len(pos_list) > 0 else "FAIL"
    report["position_count"] = len(pos_list)

    _, orders = http_json(f"{service_url}/api/ibkr/orders", headers, timeout=45)
    order_list: list = []
    if isinstance(orders, list):
        order_list = orders
    elif isinstance(orders, dict):
        order_list = orders.get("orders") or []
    report["open_orders_count"] = len(order_list)

    # ForgeOS
    code_ready, ready = http_json("http://localhost:3000/api/ready", timeout=15)
    report["FORGEOS_3000"] = "PASS" if code_ready == 200 else "FAIL"

    _, broker_status = http_json("http://localhost:3000/api/broker/status", timeout=45)
    broker_ok = isinstance(broker_status, dict) and broker_status.get("connected") is True
    if isinstance(broker_status, str):
        broker_ok = False
    report["broker_status_connected"] = broker_ok

    _, broker_account = http_json("http://localhost:3000/api/broker/account", timeout=45)
    _, broker_positions = http_json("http://localhost:3000/api/broker/positions", timeout=45)
    broker_positions_list: list = []
    if isinstance(broker_positions, list):
        broker_positions_list = broker_positions
    elif isinstance(broker_positions, dict):
        broker_positions_list = broker_positions.get("positions") or []

    page_html = http_text("http://localhost:3000/investment/broker", timeout=180)
    report["investment_broker_page"] = {
        "DATA_SOURCE_IBKR": "IBKR_LIVE_READ_ONLY" in page_html,
        "STATUS_CONNECTED": "CONNECTED" in page_html.upper(),
        "IBKR_READ_ONLY_true": "IBKR_READ_ONLY" in page_html and "true" in page_html.lower(),
        "LIVE_TRADING_ENABLED_false": "LIVE_TRADING_ENABLED" in page_html and "false" in page_html.lower(),
    }

    # Market data — streaming quotes route not implemented; history only
    report["LIVE_MARKET_DATA"] = "FAIL"
    report["market_data_note"] = "No /api/ibkr/quotes or bid/ask/last route; LIVE_MARKET_DATA cannot be confirmed for trading"
    sample_positions = pos_list[:3]
    market_samples = []
    for p in sample_positions:
        sym = p.get("symbol")
        con_id = p.get("conId")
        _, hist = http_json(
            f"{service_url}/api/ibkr/history?symbol={sym}&duration=1 D&barSize=1 day",
            headers,
            timeout=60,
        )
        bars = hist.get("bars") if isinstance(hist, dict) else None
        market_samples.append(
            {
                "symbol": sym,
                "conId": con_id,
                "bid": None,
                "ask": None,
                "last": bars[-1]["close"] if bars and len(bars) > 0 else None,
                "timestamp": bars[-1]["date"] if bars and len(bars) > 0 else None,
                "marketDataType": "HISTORICAL_ONLY" if bars else "UNAVAILABLE",
            }
        )
    report["market_data_samples"] = market_samples

    # Position compare (first non-zero)
    compare = None
    if pos_list:
        for fp in pos_list:
            if not fp.get("position"):
                continue
            sym = fp.get("symbol")
            match = next((x for x in broker_positions_list if x.get("symbol") == sym), None)
            if match:
                compare = {
                    "symbol": sym,
                    "tws_quantity": fp.get("position"),
                    "tws_avgCost": fp.get("avgCost"),
                    "forgeos_quantity": match.get("position"),
                    "forgeos_avgCost": match.get("avgCost"),
                    "quantity_match": fp.get("position") == match.get("position"),
                    "avgCost_match": abs(float(fp.get("avgCost") or 0) - float(match.get("avgCost") or 0)) < 0.02,
                }
                break
    report["position_compare"] = compare
    report["POSITION_COMPARE"] = (
        "PASS"
        if compare and compare.get("quantity_match") and compare.get("avgCost_match")
        else "FAIL"
    )

    fake = contains_fake_markers(
        {
            "accounts": accounts,
            "positions": pos_list,
            "broker_status": broker_status,
            "broker_account": broker_account,
            "broker_positions": broker_positions,
        }
    )
    report["DEMO_OR_FALLBACK_DETECTED"] = "YES" if fake else "NO"

    # Final gates
    all_pass = (
        report["TWS_LIVE_SESSION"] == "PASS"
        and report["IBKR_SOCKET_4001"] == "PASS"
        and report["FASTAPI_8000"] == "PASS"
        and report["FORGEOS_3000"] == "PASS"
        and report["REAL_ACCOUNTS"] == "PASS"
        and report["REAL_POSITIONS"] == "PASS"
        and report["REAL_ACCOUNT_SUMMARY"] == "PASS"
        and report["LIVE_MARKET_DATA"] == "PASS"
        and report["DEMO_OR_FALLBACK_DETECTED"] == "NO"
        and broker_ok
        and report.get("POSITION_COMPARE") == "PASS"
    )
    report["conclusion"] = "REAL_CONNECTIONS_CONFIRMED" if all_pass else "REAL_CONNECTIONS_NOT_CONFIRMED"

    out_path = ROOT / "artifacts" / "certification" / "real-connections-check.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(report, indent=2, default=str), encoding="utf-8")

    print("TWS_LIVE_SESSION:", report["TWS_LIVE_SESSION"])
    print("IBKR_SOCKET_4001:", report["IBKR_SOCKET_4001"])
    print("FASTAPI_8000:", report["FASTAPI_8000"])
    print("FORGEOS_3000:", report["FORGEOS_3000"])
    print("REAL_ACCOUNTS:", report["REAL_ACCOUNTS"])
    print("REAL_POSITIONS:", report["REAL_POSITIONS"])
    print("REAL_ACCOUNT_SUMMARY:", report["REAL_ACCOUNT_SUMMARY"])
    print("LIVE_MARKET_DATA:", report["LIVE_MARKET_DATA"])
    print("DEMO_OR_FALLBACK_DETECTED:", report["DEMO_OR_FALLBACK_DETECTED"])
    print("ORDERS_SENT:", report["ORDERS_SENT"])
    print("masked_accounts:", ", ".join(masked) if masked else "NONE")
    print("conclusion:", report["conclusion"])
    return 0 if all_pass else 1


if __name__ == "__main__":
    sys.exit(main())
