from __future__ import annotations

import hashlib
import hmac
import json
import os
import secrets
import sqlite3
import sys
import threading
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Literal

from fastapi import Depends, FastAPI, Header, HTTPException

# Prefer official IBKR TWS API pythonclient when available.
# Set IBKR_TWS_API_PYTHONPATH to e.g. C:\\TWS API\\source\\pythonclient
# so ibapi is imported from the official desktop installation.
official_api_path = os.getenv("IBKR_TWS_API_PYTHONPATH", "").strip()
if official_api_path and Path(official_api_path).exists():
    if official_api_path not in sys.path:
        sys.path.insert(0, official_api_path)

from ibapi.client import EClient
from ibapi.contract import Contract
from ibapi.order import Order
from ibapi.wrapper import EWrapper
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")
    app_env: str = "development"
    internal_api_key: str = Field(min_length=24)
    approval_secret: str = Field(min_length=24)
    ibkr_host: str = "127.0.0.1"
    ibkr_port: int = 4001
    ibkr_client_id: int = 41
    ibkr_account_id: str = ""
    ibkr_connect_timeout_seconds: int = 12
    ibkr_read_only: bool = True
    live_trading_enabled: bool = False
    proposal_ttl_seconds: int = 600
    max_order_notional: float = 250
    max_order_quantity: float = 2
    allowed_symbols: str = "AAPL,MSFT"
    allowed_currencies: str = "EUR,USD"
    allowed_exchanges: str = "SMART"
    database_path: str = "./forgeos_ibkr.sqlite3"

    def csv_set(self, value: str) -> set[str]:
        return {item.strip().upper() for item in value.split(",") if item.strip()}


settings = Settings()


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def db() -> sqlite3.Connection:
    connection = sqlite3.connect(settings.database_path)
    connection.row_factory = sqlite3.Row
    return connection


def init_db() -> None:
    Path(settings.database_path).parent.mkdir(parents=True, exist_ok=True)
    with db() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS proposals (
                id TEXT PRIMARY KEY,
                status TEXT NOT NULL,
                payload TEXT NOT NULL,
                risk_checks TEXT NOT NULL,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                approved_at TEXT,
                approval_nonce TEXT,
                executed_at TEXT,
                ibkr_order_id INTEGER
            );
            CREATE TABLE IF NOT EXISTS audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_type TEXT NOT NULL,
                entity_id TEXT,
                payload TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS control_state (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            """
        )
        connection.execute(
            "INSERT OR IGNORE INTO control_state(key,value,updated_at) VALUES('emergency_stop','false',?)",
            (utcnow().isoformat(),),
        )


def audit(event_type: str, entity_id: str | None, payload: dict[str, Any]) -> None:
    with db() as connection:
        connection.execute(
            "INSERT INTO audit_log(event_type,entity_id,payload,created_at) VALUES(?,?,?,?)",
            (event_type, entity_id, json.dumps(payload, ensure_ascii=False), utcnow().isoformat()),
        )


def emergency_stop() -> bool:
    with db() as connection:
        row = connection.execute("SELECT value FROM control_state WHERE key='emergency_stop'").fetchone()
        return bool(row and row["value"] == "true")


class ProposalCreate(BaseModel):
    symbol: str = Field(min_length=1, max_length=20)
    side: Literal["BUY", "SELL"]
    quantity: float = Field(gt=0)
    order_type: Literal["LMT"] = "LMT"
    limit_price: float = Field(gt=0)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    exchange: str = Field(default="SMART", min_length=1, max_length=20)
    primary_exchange: str | None = None
    rationale: str = Field(min_length=10, max_length=4000)
    strategy_id: str = "manual-supervised"


class DecisionRequest(BaseModel):
    decision: Literal["APPROVE", "REJECT"]
    confirmation_phrase: str


class ExecuteRequest(BaseModel):
    approval_token: str
    confirmation_phrase: str


class IBKRClient(EWrapper, EClient):
    def __init__(self) -> None:
        EWrapper.__init__(self)
        EClient.__init__(self, self)
        self.next_order_id: int | None = None
        self.accounts: list[str] = []
        self.errors: list[dict[str, Any]] = []
        self.account_data: dict[str, dict[str, Any]] = {}
        self.positions_data: list[dict[str, Any]] = []
        self.orders_data: list[dict[str, Any]] = []
        self.account_done = threading.Event()
        self.positions_done = threading.Event()
        self.orders_done = threading.Event()
        self.history_done = threading.Event()
        self.history_bars: dict[int, list[dict[str, Any]]] = {}
        self.history_meta: dict[str, Any] = {}
        self.reader_thread: threading.Thread | None = None
        self._history_lock = threading.Lock()

    def nextValidId(self, orderId: int) -> None:
        self.next_order_id = orderId

    def managedAccounts(self, accountsList: str) -> None:
        self.accounts = [account for account in accountsList.split(",") if account]

    def error(self, reqId, errorCode, errorString, advancedOrderRejectJson="") -> None:
        self.errors.append({"reqId": reqId, "code": errorCode, "message": errorString, "advanced": advancedOrderRejectJson})
        # Hard historical-data failures should unblock waiters (never invent bars).
        if reqId in self.history_bars and int(errorCode) in {162, 200, 354, 366, 420, 10168}:
            self.history_done.set()

    def accountSummary(self, reqId, account, tag, value, currency) -> None:
        self.account_data.setdefault(account, {})[tag] = {"value": value, "currency": currency}

    def accountSummaryEnd(self, reqId: int) -> None:
        self.account_done.set()

    def position(self, account, contract, position, avgCost) -> None:
        self.positions_data.append({
            "account": account,
            "conId": contract.conId,
            "symbol": contract.symbol,
            "secType": contract.secType,
            "exchange": contract.exchange,
            "currency": contract.currency,
            "position": float(position),
            "avgCost": float(avgCost),
        })

    def positionEnd(self) -> None:
        self.positions_done.set()

    def openOrder(self, orderId, contract, order, orderState) -> None:
        self.orders_data.append({
            "orderId": orderId,
            "symbol": contract.symbol,
            "action": order.action,
            "orderType": order.orderType,
            "quantity": float(order.totalQuantity),
            "limitPrice": float(order.lmtPrice) if order.lmtPrice else None,
            "status": orderState.status,
        })

    def openOrderEnd(self) -> None:
        self.orders_done.set()

    def historicalData(self, reqId, bar) -> None:
        self.history_bars.setdefault(reqId, []).append({
            "date": bar.date,
            "open": float(bar.open),
            "high": float(bar.high),
            "low": float(bar.low),
            "close": float(bar.close),
            "volume": float(bar.volume) if bar.volume is not None else None,
            "barCount": int(bar.barCount) if getattr(bar, "barCount", None) is not None else None,
            "average": float(bar.average) if getattr(bar, "average", None) is not None else None,
        })

    def historicalDataEnd(self, reqId: int, start: str, end: str) -> None:
        self.history_meta = {"reqId": reqId, "start": start, "end": end}
        self.history_done.set()

    def connect_gateway(self) -> dict[str, Any]:
        if not self.isConnected():
            self.connect(settings.ibkr_host, settings.ibkr_port, clientId=settings.ibkr_client_id)
            self.reader_thread = threading.Thread(target=self.run, daemon=True, name="ibkr-reader")
            self.reader_thread.start()
        deadline = time.time() + settings.ibkr_connect_timeout_seconds
        while time.time() < deadline:
            if self.isConnected() and self.next_order_id is not None:
                return self.status()
            time.sleep(0.1)
        raise TimeoutError("No se recibió nextValidId desde IB Gateway")

    def ensure_connected(self) -> None:
        if not self.isConnected() or self.next_order_id is None:
            self.connect_gateway()

    def status(self) -> dict[str, Any]:
        return {
            "connected": self.isConnected(),
            "nextOrderIdReady": self.next_order_id is not None,
            "nextValidId": self.next_order_id,
            "managedAccounts": self.accounts,
            "recentErrors": self.errors[-10:],
            "ibkrReadOnly": settings.ibkr_read_only,
            "liveTradingEnabled": settings.live_trading_enabled,
        }

    def account_summary(self) -> dict[str, Any]:
        self.ensure_connected()
        self.account_data = {}
        self.account_done.clear()
        tags = "NetLiquidation,TotalCashValue,AvailableFunds,BuyingPower,GrossPositionValue,MaintMarginReq,UnrealizedPnL,RealizedPnL"
        self.reqAccountSummary(9101, "All", tags)
        if not self.account_done.wait(10):
            raise TimeoutError("Timeout leyendo cuenta")
        self.cancelAccountSummary(9101)
        return self.account_data

    def positions(self) -> list[dict[str, Any]]:
        self.ensure_connected()
        self.positions_data = []
        self.positions_done.clear()
        self.reqPositions()
        if not self.positions_done.wait(10):
            raise TimeoutError("Timeout leyendo posiciones")
        self.cancelPositions()
        return self.positions_data

    def open_orders(self) -> list[dict[str, Any]]:
        self.ensure_connected()
        self.orders_data = []
        self.orders_done.clear()
        # reqAllOpenOrders reliably ends with openOrderEnd even when empty.
        self.reqAllOpenOrders()
        if not self.orders_done.wait(15):
            # Empty book often still returns []; treat soft timeout as empty snapshot.
            return list(self.orders_data)
        return self.orders_data

    def historical_bars(
        self,
        symbol: str,
        *,
        duration: str = "1 M",
        bar_size: str = "1 day",
        what_to_show: str = "TRADES",
        currency: str = "USD",
        exchange: str = "SMART",
        use_rth: int = 1,
    ) -> dict[str, Any]:
        """
        READ_ONLY historical bars via reqHistoricalData.
        Never calls placeOrder. Does not flip IBKR_READ_ONLY / LIVE_TRADING_ENABLED.
        Empty bars are returned as-is when TWS lacks market-data permissions — never invented.
        """
        with self._history_lock:
            self.ensure_connected()
            req_id = 9201
            self.history_bars = {req_id: []}
            self.history_meta = {}
            self.history_done.clear()
            before_errors = len(self.errors)
            contract = Contract()
            contract.symbol = symbol.upper().strip()
            contract.secType = "STK"
            contract.currency = currency.upper().strip() or "USD"
            contract.exchange = exchange.upper().strip() or "SMART"
            self.reqHistoricalData(
                req_id,
                contract,
                "",
                duration,
                bar_size,
                what_to_show,
                use_rth,
                1,
                False,
                [],
            )
            finished = self.history_done.wait(20)
            bars = list(self.history_bars.get(req_id, []))
            recent_errors = self.errors[before_errors:]
            note = (
                f"READ_ONLY historical bars via reqHistoricalData ({len(bars)} bars). "
                "Flags unchanged: IBKR_READ_ONLY / LIVE_TRADING_ENABLED not flipped. Zero orders."
            )
            if not bars:
                note = (
                    "NO_DATA — empty historical bars (timeout, pacing, or TWS market-data subscription). "
                    "Bars are never invented. Route is read-only."
                )
            if not finished and not bars:
                note = "NO_DATA — historicalDataEnd timeout; bars not invented."
            return {
                "symbol": contract.symbol,
                "duration": duration,
                "barSize": bar_size,
                "whatToShow": what_to_show,
                "currency": contract.currency,
                "exchange": contract.exchange,
                "bars": bars,
                "count": len(bars),
                "meta": self.history_meta,
                "recentErrors": recent_errors[-5:],
                "ibkrReadOnly": settings.ibkr_read_only,
                "liveTradingEnabled": settings.live_trading_enabled,
                "orderExecution": "disabled" if settings.ibkr_read_only or not settings.live_trading_enabled else "gated",
                "mode": "READ_ONLY",
                "note": note,
            }

    def place_limit_order(self, proposal: dict[str, Any]) -> int:
        self.ensure_connected()
        if self.next_order_id is None:
            raise RuntimeError("No existe un identificador de orden válido")
        order_id = self.next_order_id
        self.next_order_id += 1
        contract = Contract()
        contract.symbol = proposal["symbol"]
        contract.secType = "STK"
        contract.currency = proposal["currency"]
        contract.exchange = proposal["exchange"]
        if proposal.get("primary_exchange"):
            contract.primaryExchange = proposal["primary_exchange"]
        order = Order()
        order.action = proposal["side"]
        order.orderType = "LMT"
        order.totalQuantity = proposal["quantity"]
        order.lmtPrice = proposal["limit_price"]
        order.tif = "DAY"
        order.outsideRth = False
        order.transmit = True
        self.placeOrder(order_id, contract, order)
        return order_id


ibkr = IBKRClient()


def require_key(x_internal_api_key: str = Header(default="")) -> None:
    if not x_internal_api_key or not hmac.compare_digest(settings.internal_api_key, x_internal_api_key):
        raise HTTPException(401, "Clave interna no válida")


def evaluate_risk(p: ProposalCreate) -> list[dict[str, Any]]:
    symbols = settings.csv_set(settings.allowed_symbols)
    currencies = settings.csv_set(settings.allowed_currencies)
    exchanges = settings.csv_set(settings.allowed_exchanges)
    notional = p.quantity * p.limit_price
    checks = [
        {"name": "quantity_limit", "passed": p.quantity <= settings.max_order_quantity, "detail": f"máximo {settings.max_order_quantity}"},
        {"name": "notional_limit", "passed": notional <= settings.max_order_notional, "detail": f"nominal {notional:.2f}; máximo {settings.max_order_notional:.2f}"},
        {"name": "symbol_allowlist", "passed": not symbols or p.symbol.upper() in symbols, "detail": sorted(symbols)},
        {"name": "currency_allowlist", "passed": p.currency.upper() in currencies, "detail": sorted(currencies)},
        {"name": "exchange_allowlist", "passed": p.exchange.upper() in exchanges, "detail": sorted(exchanges)},
        {"name": "limit_order_only", "passed": p.order_type == "LMT", "detail": "solo LMT"},
    ]
    return checks


def proposal_from_row(row: sqlite3.Row) -> dict[str, Any]:
    payload = json.loads(row["payload"])
    return {
        "id": row["id"], "status": row["status"], **payload,
        "risk_checks": json.loads(row["risk_checks"]),
        "created_at": row["created_at"], "expires_at": row["expires_at"],
        "approved_at": row["approved_at"], "executed_at": row["executed_at"],
        "ibkr_order_id": row["ibkr_order_id"], "approval_nonce": row["approval_nonce"],
    }


def get_proposal(proposal_id: str) -> dict[str, Any]:
    with db() as connection:
        row = connection.execute("SELECT * FROM proposals WHERE id=?", (proposal_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Propuesta no encontrada")
    return proposal_from_row(row)


def approval_token(proposal_id: str, nonce: str, expiry: int) -> str:
    body = json.dumps({"id": proposal_id, "nonce": nonce, "exp": expiry}, separators=(",", ":"), sort_keys=True).encode()
    signature = hmac.new(settings.approval_secret.encode(), body, hashlib.sha256).hexdigest()
    return f"{body.hex()}.{signature}"


def verify_token(token: str, proposal_id: str, nonce: str) -> None:
    try:
        raw_hex, signature = token.split(".", 1)
        raw = bytes.fromhex(raw_hex)
        expected = hmac.new(settings.approval_secret.encode(), raw, hashlib.sha256).hexdigest()
        body = json.loads(raw.decode())
        valid = hmac.compare_digest(expected, signature) and body["id"] == proposal_id and body["nonce"] == nonce and int(body["exp"]) >= int(time.time())
        if not valid:
            raise ValueError
    except Exception as exc:
        raise HTTPException(403, "Token de aprobación no válido o caducado") from exc


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield
    if ibkr.isConnected():
        ibkr.disconnect()


app = FastAPI(title="ForgeOS IBKR Broker", version="1.0.0", lifespan=lifespan)
auth = [Depends(require_key)]


@app.get("/health", dependencies=auth)
def health():
    return {"ok": True, "liveTradingEnabled": settings.live_trading_enabled, "ibkrReadOnly": settings.ibkr_read_only, "emergencyStop": emergency_stop()}


@app.post("/api/ibkr/connect", dependencies=auth)
def connect():
    try:
        result = ibkr.connect_gateway()
        audit("IBKR_CONNECTED", None, result)
        return result
    except Exception as exc:
        audit("IBKR_CONNECT_FAILED", None, {"error": str(exc)})
        raise HTTPException(503, str(exc)) from exc


@app.get("/api/ibkr/status", dependencies=auth)
def status():
    return ibkr.status()


@app.get("/api/ibkr/account", dependencies=auth)
def account():
    try:
        return ibkr.account_summary()
    except Exception as exc:
        raise HTTPException(503, str(exc)) from exc


@app.get("/api/ibkr/positions", dependencies=auth)
def positions():
    try:
        return ibkr.positions()
    except Exception as exc:
        raise HTTPException(503, str(exc)) from exc


@app.get("/api/ibkr/orders", dependencies=auth)
def orders():
    try:
        return ibkr.open_orders()
    except Exception as exc:
        raise HTTPException(503, str(exc)) from exc


@app.get("/api/ibkr/history", dependencies=auth)
def history(
    symbol: str = "AAPL",
    duration: str = "1 M",
    barSize: str = "1 day",
    whatToShow: str = "TRADES",
    currency: str = "USD",
    exchange: str = "SMART",
):
    """
    READ_ONLY historical bars (reqHistoricalData).
    Does not place orders and does not change LIVE_TRADING_ENABLED / IBKR_READ_ONLY.
    """
    cleaned = symbol.strip().upper()
    if not cleaned or len(cleaned) > 20:
        raise HTTPException(400, "symbol inválido")
    allowed_durations = {"1 D", "5 D", "1 W", "2 W", "1 M", "3 M", "6 M", "1 Y"}
    allowed_bars = {"1 min", "5 mins", "15 mins", "1 hour", "1 day"}
    if duration not in allowed_durations:
        raise HTTPException(400, f"duration no permitida; use una de {sorted(allowed_durations)}")
    if barSize not in allowed_bars:
        raise HTTPException(400, f"barSize no permitida; use una de {sorted(allowed_bars)}")
    try:
        result = ibkr.historical_bars(
            cleaned,
            duration=duration,
            bar_size=barSize,
            what_to_show=whatToShow,
            currency=currency,
            exchange=exchange,
        )
        audit("IBKR_HISTORY_READ", cleaned, {"count": result.get("count", 0), "duration": duration, "barSize": barSize})
        return result
    except Exception as exc:
        audit("IBKR_HISTORY_FAILED", cleaned, {"error": str(exc)})
        raise HTTPException(503, str(exc)) from exc


@app.get("/api/proposals", dependencies=auth)
def list_proposals():
    with db() as connection:
        rows = connection.execute("SELECT * FROM proposals ORDER BY created_at DESC LIMIT 200").fetchall()
    return [proposal_from_row(row) for row in rows]


@app.post("/api/proposals", dependencies=auth)
def create_proposal(payload: ProposalCreate):
    normalized = payload.model_copy(update={"symbol": payload.symbol.upper(), "currency": payload.currency.upper(), "exchange": payload.exchange.upper()})
    checks = evaluate_risk(normalized)
    status_value = "PENDING" if all(check["passed"] for check in checks) else "BLOCKED"
    proposal_id = str(uuid.uuid4())
    now = utcnow()
    expires = now + timedelta(seconds=settings.proposal_ttl_seconds)
    with db() as connection:
        connection.execute(
            "INSERT INTO proposals(id,status,payload,risk_checks,created_at,expires_at) VALUES(?,?,?,?,?,?)",
            (proposal_id, status_value, normalized.model_dump_json(), json.dumps(checks), now.isoformat(), expires.isoformat()),
        )
    audit("PROPOSAL_CREATED", proposal_id, {"status": status_value, "riskChecks": checks})
    return get_proposal(proposal_id)


@app.post("/api/proposals/{proposal_id}/decision", dependencies=auth)
def decide(proposal_id: str, request: DecisionRequest):
    proposal = get_proposal(proposal_id)
    expected = f"{request.decision} {proposal_id}"
    if request.confirmation_phrase.strip() != expected:
        raise HTTPException(400, f"Escribe exactamente: {expected}")
    if proposal["status"] != "PENDING":
        raise HTTPException(409, f"Estado no decidible: {proposal['status']}")
    if datetime.fromisoformat(proposal["expires_at"]) < utcnow():
        with db() as connection:
            connection.execute("UPDATE proposals SET status='EXPIRED' WHERE id=?", (proposal_id,))
        raise HTTPException(409, "La propuesta ha caducado")
    if request.decision == "REJECT":
        with db() as connection:
            connection.execute("UPDATE proposals SET status='REJECTED' WHERE id=?", (proposal_id,))
        audit("PROPOSAL_REJECTED", proposal_id, {})
        return {"proposal": get_proposal(proposal_id)}
    nonce = secrets.token_urlsafe(24)
    with db() as connection:
        connection.execute("UPDATE proposals SET status='APPROVED',approved_at=?,approval_nonce=? WHERE id=?", (utcnow().isoformat(), nonce, proposal_id))
    audit("PROPOSAL_APPROVED", proposal_id, {})
    return {
        "proposal": get_proposal(proposal_id),
        "approvalToken": approval_token(proposal_id, nonce, int(time.time()) + 300),
        "executionConfirmationPhrase": f"EXECUTE LIVE {proposal_id}",
        "tokenExpiresInSeconds": 300,
    }


@app.post("/api/proposals/{proposal_id}/execute", dependencies=auth)
def execute(proposal_id: str, request: ExecuteRequest):
    if emergency_stop():
        raise HTTPException(423, "Parada de emergencia activada")
    if not settings.live_trading_enabled:
        raise HTTPException(423, "LIVE_TRADING_ENABLED está desactivado")
    if settings.ibkr_read_only:
        raise HTTPException(423, "IBKR_READ_ONLY sigue activado")
    proposal = get_proposal(proposal_id)
    if proposal["status"] != "APPROVED":
        raise HTTPException(409, f"Estado no ejecutable: {proposal['status']}")
    expected = f"EXECUTE LIVE {proposal_id}"
    if request.confirmation_phrase.strip() != expected:
        raise HTTPException(400, f"Escribe exactamente: {expected}")
    verify_token(request.approval_token, proposal_id, proposal["approval_nonce"])
    try:
        order_id = ibkr.place_limit_order(proposal)
        with db() as connection:
            current = connection.execute("SELECT status FROM proposals WHERE id=?", (proposal_id,)).fetchone()
            if not current or current["status"] != "APPROVED":
                raise HTTPException(409, "La propuesta ya fue consumida")
            connection.execute("UPDATE proposals SET status='EXECUTED',executed_at=?,ibkr_order_id=? WHERE id=?", (utcnow().isoformat(), order_id, proposal_id))
        audit("ORDER_SUBMITTED", proposal_id, {"ibkrOrderId": order_id})
        return get_proposal(proposal_id)
    except HTTPException:
        raise
    except Exception as exc:
        audit("ORDER_SUBMIT_FAILED", proposal_id, {"error": str(exc)})
        raise HTTPException(503, str(exc)) from exc


@app.post("/api/control/emergency-stop", dependencies=auth)
def set_emergency_stop(enabled: bool):
    with db() as connection:
        connection.execute("UPDATE control_state SET value=?,updated_at=? WHERE key='emergency_stop'", ("true" if enabled else "false", utcnow().isoformat()))
    audit("EMERGENCY_STOP_CHANGED", None, {"enabled": enabled})
    return {"enabled": enabled}
