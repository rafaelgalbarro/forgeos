from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os
import secrets
import socket
import sqlite3
import sys
import threading
import time
import uuid
from contextlib import asynccontextmanager
from decimal import Decimal, ROUND_DOWN
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Literal

log = logging.getLogger("ibkr-broker")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s %(message)s",
    datefmt="%H:%M:%S",
)

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

# ForgeOS supervised live trading universe (Starter IBKR allowlist when live mode is off).
DEFAULT_ALLOWED_SYMBOLS = (
    "SPY,QQQ,IWM,TLT,ARKK,AAPL,MSFT,NVDA,TSLA,AMZN,GOOGL,META,"
    "EZU,VGK,ASML,SAP,SHOP,SHEL,BP,"
    "EWJ,FXI,EWY,BABA,NIO,TSM,"
    "MELI,GRAB,DLO,IBN,"
    "IBIT,FETH"
)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")
    app_env: str = "development"
    internal_api_key: str = Field(min_length=24)
    approval_secret: str = Field(min_length=24)
    ibkr_host: str = "127.0.0.1"
    ibkr_port: int = 7497
    ibkr_client_id: int = 41
    ibkr_account_id: str = ""
    ibkr_account_ids: str = ""
    ibkr_connect_timeout_seconds: int = 12
    ibkr_read_only: bool = True
    live_trading_enabled: bool = False
    proposal_ttl_seconds: int = 600
    max_order_notional: float = 250
    max_order_quantity: float = 2
    allowed_symbols: str = DEFAULT_ALLOWED_SYMBOLS
    allowed_currencies: str = "EUR,USD"
    allowed_exchanges: str = "SMART"
    database_path: str = "./forgeos_ibkr.sqlite3"
    allow_outside_rth: bool = False
    forex_enabled: bool = False
    forex_max_spread_pips: float = 3
    forex_max_positions: int = 3
    forex_risk_pct: float = 2
    forex_stop_pips: float = 20
    forex_tp_pips: float = 40
    forex_min_confidence: float = 0.75
    forex_min_units: float = 25_000
    forex_allowed_pairs: str = "EURUSD,GBPUSD,USDJPY,USDCHF,AUDUSD,USDCAD,EURGBP,EURJPY,GBPJPY"
    max_forex_order_units: float = 25_000

    def csv_set(self, value: str) -> set[str]:
        return {item.strip().upper() for item in value.split(",") if item.strip()}

    def configured_account_ids(self) -> list[str]:
        """Primary IBKR_ACCOUNT_ID first, then IBKR_ACCOUNT_IDS extras."""
        ids: list[str] = []
        for raw in (self.ibkr_account_id, *self.ibkr_account_ids.split(",")):
            account = raw.strip()
            if account and account not in ids:
                ids.append(account)
        return ids

    def default_account_id(self, managed: list[str] | None = None) -> str:
        if self.ibkr_account_id.strip():
            return self.ibkr_account_id.strip()
        configured = self.configured_account_ids()
        if configured:
            return configured[0]
        if managed:
            return managed[0]
        return ""


settings = Settings()


def apply_whatif_legacy_attr_compat(order: Order) -> None:
    """Scope-limited compat for FX What-If on legacy TWS/API combos.

    Keeps legacy optional attrs effectively omitted on this specific order
    path without patching global ibapi encoder behavior.
    """
    order.eTradeOnly = ""
    order.firmQuoteOnly = ""
    order.nbboPriceCap = ""


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
    sec_type: str = Field(default="STK", min_length=1, max_length=10)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    exchange: str = Field(default="SMART", min_length=1, max_length=20)
    primary_exchange: str | None = None
    rationale: str = Field(min_length=10, max_length=4000)
    strategy_id: str = "manual-supervised"
    outside_rth: bool = False
    account: str | None = None


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
        self._account_lock = threading.Lock()
        self._acct_update_done: dict[str, threading.Event] = {}
        self.positions_done = threading.Event()
        self.orders_done = threading.Event()
        self.history_done = threading.Event()
        self.history_bars: dict[int, list[dict[str, Any]]] = {}
        self.history_meta: dict[str, Any] = {}
        self.reader_thread: threading.Thread | None = None
        self._history_lock = threading.Lock()
        self.contract_details_data: dict[int, Any] = {}
        self.contract_details_done: dict[int, threading.Event] = {}
        self.market_rules_data: dict[int, list[dict[str, float]]] = {}
        self.market_rules_done: dict[int, threading.Event] = {}
        self.place_ack_events: dict[int, threading.Event] = {}
        self.place_ack_status: dict[int, str] = {}
        self.place_ack_errors: dict[int, list[dict[str, Any]]] = {}
        self.order_context: dict[int, dict[str, Any]] = {}
        self.tick_data: dict[int, dict[str, Any]] = {}
        self.tick_done: dict[int, threading.Event] = {}
        self._tick_lock = threading.Lock()
        self._forex_req_seq = 9300
        self._quote_req_seq = 9600

    def nextValidId(self, orderId: int) -> None:
        log.info("nextValidId=%s (connection ready)", orderId)
        self.next_order_id = orderId

    def managedAccounts(self, accountsList: str) -> None:
        from_tws = [account for account in accountsList.split(",") if account]
        configured = settings.configured_account_ids()
        self.accounts = list(dict.fromkeys([*from_tws, *configured]))

    def error(self, reqId, errorCode, errorString, advancedOrderRejectJson="") -> None:
        entry = {"reqId": reqId, "code": errorCode, "message": errorString, "advanced": advancedOrderRejectJson}
        self.errors.append(entry)
        # Always log order-related errors loudly
        if isinstance(reqId, int) and reqId in self.place_ack_events:
            ctx = self.order_context.get(reqId, {})
            kind = ctx.get("kind", "ORDER")
            log.warning("%s error orderId=%s code=%s: %s %s", kind, reqId, errorCode, errorString, advancedOrderRejectJson or "")
            self.place_ack_errors.setdefault(reqId, []).append(entry)
            self.place_ack_events[reqId].set()
        elif int(errorCode) not in {2104, 2106, 2158, 2119}:
            # Skip noisy market-data-farm connectivity messages
            log.info("IBKR error reqId=%s code=%s: %s", reqId, errorCode, errorString)
        # Hard historical-data failures should unblock waiters (never invent bars).
        if reqId in self.history_bars and int(errorCode) in {162, 200, 354, 366, 420, 10168}:
            self.history_done.set()

    def accountSummary(self, reqId, account, tag, value, currency) -> None:
        self.account_data.setdefault(account, {})[tag] = {"value": value, "currency": currency}

    def accountSummaryEnd(self, reqId: int) -> None:
        self.account_done.set()

    def updateAccountValue(self, key, val, currency, accountName) -> None:
        wanted = {
            "NetLiquidation",
            "TotalCashValue",
            "AvailableFunds",
            "BuyingPower",
            "GrossPositionValue",
            "MaintMarginReq",
            "UnrealizedPnL",
            "RealizedPnL",
        }
        if key in wanted and accountName:
            self.account_data.setdefault(accountName, {})[key] = {"value": val, "currency": currency}

    def accountDownloadEnd(self, accountName: str) -> None:
        done = self._acct_update_done.get(accountName)
        if done:
            done.set()

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

    def orderStatus(self, orderId, status, filled, remaining, avgFillPrice, permId, parentId, lastFillPrice, clientId, whyHeld, mktCapPrice=0.0) -> None:
        ctx = self.order_context.get(orderId, {})
        kind = ctx.get("kind", "ORDER")
        level = logging.WARNING if status in ("Inactive", "Cancelled", "ApiCancelled") else logging.INFO
        log.log(
            level,
            "%s STATUS orderId=%s status=%s filled=%s remaining=%s avgFill=%.4f lastFill=%.4f permId=%s clientId=%s whyHeld=%s mktCapPrice=%s",
            kind, orderId, status, filled, remaining, avgFillPrice, lastFillPrice, permId, clientId, whyHeld, mktCapPrice,
        )
        if status == "Inactive":
            log.warning(
                "⚠ ORDER %s INACTIVE — IBKR silently rejected. Common causes: "
                "insufficient buying power, margin violation, outside market hours without outsideRth, "
                "invalid price increment, or account restrictions. Check TWS Messages window.",
                orderId,
            )
        if orderId in self.place_ack_events:
            self.place_ack_status[orderId] = status
            self.place_ack_events[orderId].set()

    def openOrder(self, orderId, contract, order, orderState) -> None:
        warning_text = getattr(orderState, "warningText", "") or ""
        init_margin = getattr(orderState, "initMarginChange", "") or ""
        maint_margin = getattr(orderState, "maintMarginChange", "") or ""
        log.info(
            "OPEN ORDER orderId=%s %s %s %s qty=%s lmt=%s status=%s acct=%s initMargin=%s maintMargin=%s",
            orderId, order.action, contract.symbol, order.orderType,
            order.totalQuantity, order.lmtPrice, orderState.status,
            getattr(order, "account", "?"), init_margin, maint_margin,
        )
        if warning_text:
            log.warning("OPEN ORDER orderId=%s warningText: %s", orderId, warning_text)
        entry = {
            "orderId": orderId,
            "symbol": contract.symbol,
            "action": order.action,
            "orderType": order.orderType,
            "quantity": float(order.totalQuantity),
            "limitPrice": float(order.lmtPrice) if order.lmtPrice else None,
            "status": orderState.status,
            "account": getattr(order, "account", None),
            "warningText": warning_text if warning_text else None,
            "initMarginChange": init_margin if init_margin else None,
            "maintMarginChange": maint_margin if maint_margin else None,
        }
        self.orders_data.append(entry)
        if orderId in self.place_ack_events:
            self.place_ack_status[orderId] = orderState.status
            self.place_ack_events[orderId].set()

    def openOrderEnd(self) -> None:
        log.info("OPEN ORDER END — %d orders in snapshot", len(self.orders_data))
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

    def tickPrice(self, reqId, tickType, price, attrib) -> None:
        with self._tick_lock:
            bucket = self.tick_data.setdefault(reqId, {"bid": None, "ask": None, "last": None})
            if tickType == 1:
                bucket["bid"] = price
            elif tickType == 2:
                bucket["ask"] = price
            elif tickType in (4, 9):
                bucket["last"] = price
            if bucket.get("bid") is not None and bucket.get("ask") is not None:
                done = self.tick_done.get(reqId)
                if done:
                    done.set()

    def tickSize(self, reqId, tickType, size) -> None:
        return

    def contractDetails(self, reqId: int, contractDetails) -> None:
        self.contract_details_data[reqId] = contractDetails

    def contractDetailsEnd(self, reqId: int) -> None:
        event = self.contract_details_done.get(reqId)
        if event:
            event.set()

    def marketRule(self, marketRuleId: int, priceIncrements) -> None:
        self.market_rules_data[marketRuleId] = [
            {"lowEdge": float(price_increment.lowEdge), "increment": float(price_increment.increment)}
            for price_increment in priceIncrements
        ]
        event = self.market_rules_done.get(marketRuleId)
        if event:
            event.set()

    def _tws_reachable(self, timeout_seconds: float = 0.6) -> bool:
        try:
            with socket.create_connection(
                (settings.ibkr_host, settings.ibkr_port),
                timeout=timeout_seconds,
            ):
                return True
        except OSError:
            return False

    def _reset_socket_state(self) -> None:
        """Clear half-open ibapi sockets so reconnect does not hit settimeout(None)."""
        try:
            if getattr(self, "conn", None) is not None:
                self.disconnect()
        except Exception:
            pass
        try:
            self.conn = None
        except Exception:
            pass
        self.next_order_id = None

    def connect_gateway(self) -> dict[str, Any]:
        if self.isConnected() and self.next_order_id is not None:
            return self.status()

        if not self._tws_reachable():
            self._reset_socket_state()
            raise ConnectionError(
                f"TWS/Gateway offline — nothing listening on {settings.ibkr_host}:{settings.ibkr_port}"
            )

        try:
            if not self.isConnected():
                # Avoid ibapi settimeout on a dead conn from a prior failed attempt.
                if getattr(self, "conn", None) is not None and not self.isConnected():
                    self._reset_socket_state()
                self.connect(settings.ibkr_host, settings.ibkr_port, clientId=settings.ibkr_client_id)
                self.reader_thread = threading.Thread(target=self.run, daemon=True, name="ibkr-reader")
                self.reader_thread.start()
        except Exception as exc:
            self._reset_socket_state()
            raise ConnectionError(f"IBKR connect failed: {exc}") from exc

        deadline = time.time() + settings.ibkr_connect_timeout_seconds
        while time.time() < deadline:
            if self.isConnected() and self.next_order_id is not None:
                return self.status()
            time.sleep(0.1)
        self._reset_socket_state()
        raise TimeoutError("No se recibió nextValidId desde IB Gateway")

    def ensure_connected(self) -> None:
        if not self.isConnected() or self.next_order_id is None:
            self.connect_gateway()

    def status(self) -> dict[str, Any]:
        reachable = self._tws_reachable()
        return {
            "connected": self.isConnected(),
            "twsReachable": reachable,
            "state": "CONNECTED" if self.isConnected() else ("TWS_OFFLINE" if not reachable else "DISCONNECTED"),
            "nextOrderIdReady": self.next_order_id is not None,
            "nextValidId": self.next_order_id,
            "managedAccounts": list(dict.fromkeys([*self.accounts, *settings.configured_account_ids()])),
            "defaultAccountId": settings.default_account_id(self.accounts),
            "configuredAccountIds": settings.configured_account_ids(),
            "recentErrors": self.errors[-10:],
            "ibkrReadOnly": settings.ibkr_read_only,
            "liveTradingEnabled": settings.live_trading_enabled,
            "host": settings.ibkr_host,
            "port": settings.ibkr_port,
        }

    def _known_accounts(self) -> list[str]:
        ids: list[str] = []
        for account in [*settings.configured_account_ids(), *self.accounts]:
            if account and account not in ids:
                ids.append(account)
        return ids

    def _fill_account_via_updates(self, account: str, timeout: float = 8.0) -> None:
        """reqAccountUpdates for a specific account when summary 'All' omitted it."""
        done = threading.Event()
        self._acct_update_done[account] = done
        try:
            self.reqAccountUpdates(True, account)
            done.wait(timeout)
        finally:
            try:
                self.reqAccountUpdates(False, account)
            except Exception:
                pass
            self._acct_update_done.pop(account, None)

    def account_summary(self) -> dict[str, Any]:
        self.ensure_connected()
        with self._account_lock:
            self.account_data = {}
            self.account_done.clear()
            tags = "NetLiquidation,TotalCashValue,AvailableFunds,BuyingPower,GrossPositionValue,MaintMarginReq,UnrealizedPnL,RealizedPnL"
            self.reqAccountSummary(9101, "All", tags)
            if not self.account_done.wait(10):
                raise TimeoutError("Timeout leyendo cuenta")
            self.cancelAccountSummary(9101)
            for account in self._known_accounts():
                tags_for = self.account_data.get(account) or {}
                if "NetLiquidation" not in tags_for and "TotalCashValue" not in tags_for:
                    self._fill_account_via_updates(account)
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
        sec_type: str = "STK",
        use_rth: int | None = None,
    ) -> dict[str, Any]:
        """
        READ_ONLY historical bars via reqHistoricalData.
        STK uses SMART/TRADES; CASH uses IDEALPRO/MIDPOINT.
        Never calls placeOrder. Does not flip IBKR_READ_ONLY / LIVE_TRADING_ENABLED.
        Empty bars are returned as-is when TWS lacks market-data permissions — never invented.
        """
        cleaned_sec = (sec_type or "STK").upper().strip()
        if cleaned_sec not in {"STK", "CASH"}:
            cleaned_sec = "STK"
        if cleaned_sec == "CASH":
            exchange_value = (exchange or "IDEALPRO").upper().strip() or "IDEALPRO"
            if exchange_value == "SMART":
                exchange_value = "IDEALPRO"
            show = (what_to_show or "MIDPOINT").upper().strip() or "MIDPOINT"
            if show == "TRADES":
                show = "MIDPOINT"
            rth = 0 if use_rth is None else int(use_rth)
        else:
            exchange_value = (exchange or "SMART").upper().strip() or "SMART"
            show = (what_to_show or "TRADES").upper().strip() or "TRADES"
            rth = 1 if use_rth is None else int(use_rth)

        with self._history_lock:
            self.ensure_connected()
            req_id = 9201
            self.history_bars = {req_id: []}
            self.history_meta = {}
            self.history_done.clear()
            before_errors = len(self.errors)
            contract = Contract()
            contract.symbol = symbol.upper().strip()
            contract.secType = cleaned_sec
            contract.currency = currency.upper().strip() or "USD"
            contract.exchange = exchange_value
            self.reqHistoricalData(
                req_id,
                contract,
                "",
                duration,
                bar_size,
                show,
                rth,
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
                "whatToShow": show,
                "secType": contract.secType,
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
        return self.place_limit_order_validated(proposal, transmit=True, what_if=False)

    def _next_forex_req_id(self) -> int:
        self._forex_req_seq += 1
        return self._forex_req_seq

    def _next_quote_req_id(self) -> int:
        self._quote_req_seq += 1
        return self._quote_req_seq

    def stock_quote(
        self,
        symbol: str,
        *,
        currency: str = "USD",
        exchange: str = "SMART",
        sec_type: str = "STK",
        timeout: float = 5.0,
    ) -> dict[str, Any]:
        """READ_ONLY bid/ask/last via reqMktData (STK SMART or CASH IDEALPRO)."""
        cleaned = symbol.strip().upper()
        cleaned_sec = (sec_type or "STK").upper().strip()
        if cleaned_sec not in {"STK", "CASH"}:
            cleaned_sec = "STK"
        if cleaned_sec == "CASH":
            exchange_value = (exchange or "IDEALPRO").upper().strip() or "IDEALPRO"
            if exchange_value == "SMART":
                exchange_value = "IDEALPRO"
        else:
            exchange_value = (exchange or "SMART").upper().strip() or "SMART"
        currency_value = (currency or "USD").upper().strip() or "USD"
        with self._tick_lock:
            self.ensure_connected()
            req_id = self._next_quote_req_id()
            done = threading.Event()
            self.tick_done[req_id] = done
            self.tick_data[req_id] = {"bid": None, "ask": None, "last": None}
            contract = Contract()
            contract.symbol = cleaned
            contract.secType = cleaned_sec
            contract.currency = currency_value
            contract.exchange = exchange_value
            before_errors = len(self.errors)
            self.reqMktData(req_id, contract, "", False, False, [])
            done.wait(timeout)
            try:
                self.cancelMktData(req_id)
            except Exception:
                pass
            ticks = dict(self.tick_data.get(req_id, {}))
            self.tick_done.pop(req_id, None)
            self.tick_data.pop(req_id, None)
            bid = ticks.get("bid")
            ask = ticks.get("ask")
            last = ticks.get("last")
            mid = None
            if isinstance(bid, (int, float)) and isinstance(ask, (int, float)) and bid > 0 and ask >= bid:
                mid = (bid + ask) / 2.0
            current = last if isinstance(last, (int, float)) and last > 0 else mid
            return {
                "symbol": cleaned,
                "secType": cleaned_sec,
                "currency": currency_value,
                "exchange": exchange_value,
                "bid": bid if isinstance(bid, (int, float)) and bid > 0 else None,
                "ask": ask if isinstance(ask, (int, float)) and ask > 0 else None,
                "last": last if isinstance(last, (int, float)) and last > 0 else None,
                "mid": mid,
                "currentPrice": current if isinstance(current, (int, float)) and current > 0 else None,
                "recentErrors": self.errors[before_errors:][-3:],
                "mode": "READ_ONLY",
            }

    def forex_quote(self, pair: dict[str, Any], *, timeout: float = 8.0) -> dict[str, Any]:
        """READ_ONLY bid/ask for IDEALPRO CASH via reqMktData."""
        try:
            from .forex_pairs import build_cash_contract, pip_size
        except ImportError:
            from forex_pairs import build_cash_contract, pip_size  # type: ignore

        with self._tick_lock:
            self.ensure_connected()
            req_id = self._next_forex_req_id()
            done = threading.Event()
            self.tick_done[req_id] = done
            self.tick_data[req_id] = {"bid": None, "ask": None, "last": None}
            contract = build_cash_contract(pair)
            before_errors = len(self.errors)
            self.reqMktData(req_id, contract, "", False, False, [])
            done.wait(timeout)
            try:
                self.cancelMktData(req_id)
            except Exception:
                pass
            ticks = dict(self.tick_data.get(req_id, {}))
            self.tick_done.pop(req_id, None)
            self.tick_data.pop(req_id, None)
            bid = ticks.get("bid")
            ask = ticks.get("ask")
            last = ticks.get("last")
            mid = None
            spread = None
            spread_pips = None
            size = pip_size(pair)
            if isinstance(bid, (int, float)) and isinstance(ask, (int, float)) and ask >= bid:
                mid = (bid + ask) / 2.0
                spread = ask - bid
                spread_pips = spread / size if size else None
            return {
                "pairId": pair["pair_id"],
                "display": pair["display"],
                "symbol": pair["symbol"],
                "currency": pair["currency"],
                "secType": "CASH",
                "exchange": "IDEALPRO",
                "bid": bid,
                "ask": ask,
                "last": last,
                "mid": mid,
                "spread": spread,
                "spreadPips": spread_pips,
                "pipSize": size,
                "recentErrors": self.errors[before_errors:][-3:],
                "mode": "READ_ONLY",
            }

    def forex_history(
        self,
        pair: dict[str, Any],
        *,
        duration: str = "5 D",
        bar_size: str = "5 mins",
        what_to_show: str = "MIDPOINT",
    ) -> dict[str, Any]:
        """READ_ONLY FX bars — MIDPOINT on IDEALPRO CASH (not equity TRADES)."""
        try:
            from .forex_pairs import build_cash_contract
        except ImportError:
            from forex_pairs import build_cash_contract  # type: ignore

        with self._history_lock:
            self.ensure_connected()
            req_id = self._next_forex_req_id()
            self.history_bars = {req_id: []}
            self.history_meta = {}
            self.history_done.clear()
            before_errors = len(self.errors)
            contract = build_cash_contract(pair)
            self.reqHistoricalData(
                req_id,
                contract,
                "",
                duration,
                bar_size,
                what_to_show,
                0,
                1,
                False,
                [],
            )
            finished = self.history_done.wait(25)
            bars = list(self.history_bars.get(req_id, []))
            return {
                "pairId": pair["pair_id"],
                "display": pair["display"],
                "symbol": contract.symbol,
                "currency": contract.currency,
                "secType": "CASH",
                "exchange": "IDEALPRO",
                "duration": duration,
                "barSize": bar_size,
                "whatToShow": what_to_show,
                "bars": bars,
                "count": len(bars),
                "finished": finished,
                "recentErrors": self.errors[before_errors:][-5:],
                "mode": "READ_ONLY",
                "note": (
                    f"{len(bars)} FX bars"
                    if bars
                    else "NO_DATA — empty FX history (subscription/pacing/timeout); never invented"
                ),
            }

    def _resolve_contract_details(self, contract: Contract):
        self.ensure_connected()
        req_id = (self.next_order_id or 1000) + 100_000
        done = threading.Event()
        self.contract_details_done[req_id] = done
        self.contract_details_data.pop(req_id, None)
        self.reqContractDetails(req_id, contract)
        if not done.wait(10):
            self.contract_details_done.pop(req_id, None)
            raise TimeoutError("Timeout en reqContractDetails")
        details = self.contract_details_data.get(req_id)
        self.contract_details_done.pop(req_id, None)
        self.contract_details_data.pop(req_id, None)
        if details is None:
            raise RuntimeError("ContractDetails vacío")
        return details

    def _resolve_market_rules(self, market_rule_ids: str) -> dict[int, list[dict[str, float]]]:
        rules: dict[int, list[dict[str, float]]] = {}
        for part in (market_rule_ids or "").split(","):
            value = part.strip()
            if not value:
                continue
            rule_id = int(value)
            done = threading.Event()
            self.market_rules_done[rule_id] = done
            self.market_rules_data.pop(rule_id, None)
            self.reqMarketRule(rule_id)
            if done.wait(10):
                rules[rule_id] = self.market_rules_data.get(rule_id, [])
            self.market_rules_done.pop(rule_id, None)
        return rules

    @staticmethod
    def _pick_price_increment(price: Decimal, details, rules: dict[int, list[dict[str, float]]]) -> Decimal:
        candidates: list[Decimal] = []
        for entries in rules.values():
            active: Decimal | None = None
            for row in entries:
                low_edge = Decimal(str(row["lowEdge"]))
                increment = Decimal(str(row["increment"]))
                if price >= low_edge:
                    active = increment
            if active is not None and active > 0:
                candidates.append(active)
        min_tick = getattr(details, "minTick", None)
        if min_tick not in (None, ""):
            tick = Decimal(str(min_tick))
            if tick > 0:
                candidates.append(tick)
        if not candidates:
            raise RuntimeError("No se pudo resolver minTick/marketRule increment")
        # Use the strictest increment among active constraints.
        return max(candidates)

    @staticmethod
    def _normalize_price(price: float, details, rules: dict[int, list[dict[str, float]]]) -> float:
        value = Decimal(str(price))
        increment = IBKRClient._pick_price_increment(value, details, rules)
        normalized = (value / increment).to_integral_value(rounding=ROUND_DOWN) * increment
        return float(normalized)

    @staticmethod
    def _normalize_quantity(quantity: float, details) -> float:
        qty = Decimal(str(quantity))
        min_size = getattr(details, "minSize", None)
        size_increment = getattr(details, "sizeIncrement", None)

        normalized = qty
        if min_size not in (None, ""):
            min_value = Decimal(str(min_size))
            if min_value > 0 and normalized < min_value:
                normalized = min_value
        if size_increment not in (None, ""):
            step = Decimal(str(size_increment))
            if step > 0:
                base = Decimal("0")
                if min_size not in (None, ""):
                    min_value = Decimal(str(min_size))
                    if min_value > 0:
                        base = min_value
                if normalized < base:
                    normalized = base
                else:
                    steps = ((normalized - base) / step).to_integral_value(rounding=ROUND_DOWN)
                    normalized = base + (steps * step)
        if normalized <= 0:
            raise RuntimeError("Cantidad inválida tras normalización")
        return float(normalized)

    def _log_buying_power(self, account: str) -> None:
        """Log available buying power before placing an order."""
        try:
            summary = self.account_summary()
            acct_data = summary.get(account, {})
            bp = acct_data.get("BuyingPower", {}).get("value", "?")
            avail = acct_data.get("AvailableFunds", {}).get("value", "?")
            nav = acct_data.get("NetLiquidation", {}).get("value", "?")
            log.info("PRE-ORDER account=%s NAV=%s AvailableFunds=%s BuyingPower=%s", account, nav, avail, bp)
        except Exception as exc:
            log.warning("PRE-ORDER buying power check failed: %s", exc)

    def place_limit_order_validated(self, proposal: dict[str, Any], *, transmit: bool, what_if: bool) -> int:
        self.ensure_connected()
        if self.next_order_id is None:
            raise RuntimeError("No existe un identificador de orden válido")
        order_id = self.next_order_id
        self.next_order_id += 1
        contract = Contract()
        contract.symbol = proposal["symbol"]
        contract.secType = proposal.get("sec_type", "STK")
        contract.currency = proposal["currency"]
        contract.exchange = proposal["exchange"]
        if proposal.get("primary_exchange"):
            contract.primaryExchange = proposal["primary_exchange"]
        details = self._resolve_contract_details(contract)
        market_rules = self._resolve_market_rules(getattr(details, "marketRuleIds", "") or "")
        normalized_qty = self._normalize_quantity(float(proposal["quantity"]), details)
        normalized_price = self._normalize_price(float(proposal["limit_price"]), details, market_rules)
        order = Order()
        order.action = proposal["side"]
        order.orderType = "LMT"
        order.totalQuantity = normalized_qty
        order.lmtPrice = normalized_price
        order.tif = "DAY"
        order.outsideRth = bool(proposal.get("outside_rth")) and settings.allow_outside_rth
        order.whatIf = what_if
        order.transmit = transmit
        account = (proposal.get("account") or settings.default_account_id(self.accounts) or "").strip()
        if account:
            order.account = account
        apply_whatif_legacy_attr_compat(order)

        notional = normalized_qty * normalized_price
        log.info(
            "PLACING ORDER id=%s %s %s qty=%s lmt=%s notional=%.2f transmit=%s whatIf=%s acct=%s outsideRth=%s",
            order_id, order.action, contract.symbol, normalized_qty,
            normalized_price, notional, transmit, what_if, account, order.outsideRth,
        )
        self._log_buying_power(account)

        ack = threading.Event()
        self.place_ack_events[order_id] = ack
        self.place_ack_status.pop(order_id, None)
        self.place_ack_errors.pop(order_id, None)
        self.order_context[order_id] = {
            "kind": "ORDER",
            "symbol": contract.symbol,
            "currency": contract.currency,
            "account": account,
        }
        self.placeOrder(order_id, contract, order)
        ack.wait(6)
        errors = self.place_ack_errors.get(order_id, [])
        status = self.place_ack_status.get(order_id, "NO_ACK")
        log.info("PLACE RESULT id=%s status=%s errors=%d", order_id, status, len(errors))
        for err in errors:
            log.warning("  err code=%s: %s", err.get("code"), err.get("message"))

        reject_codes = {103, 107, 109, 110, 321, 322, 387, 388, 10243, 10250, 10268, 10269, 10270, 201}
        if any(int(err["code"]) in reject_codes for err in errors):
            raise RuntimeError(f"ORDER_REJECTED: {errors[-1]['code']} {errors[-1]['message']}")

        if status == "Inactive":
            log.error(
                "ORDER %s went INACTIVE immediately — IBKR silently rejected. "
                "symbol=%s qty=%s lmt=%s notional=%.2f acct=%s. "
                "Check TWS Messages log for the reason (margin, permissions, hours, price).",
                order_id, contract.symbol, normalized_qty, normalized_price, notional, account,
            )

        # Post-place verification
        try:
            time.sleep(2)
            verify_orders = self.open_orders()
            matched = [o for o in verify_orders if o.get("orderId") == order_id]
            if matched:
                v = matched[0]
                log.info(
                    "POST-PLACE VERIFY id=%s status=%s warningText=%s",
                    order_id, v.get("status"), v.get("warningText") or "none",
                )
            else:
                log.warning(
                    "ORDER id=%s NOT FOUND in open orders after 2s — "
                    "instantly filled, auto-cancelled, or silently rejected",
                    order_id,
                )
        except Exception as exc:
            log.warning("POST-PLACE VERIFY failed: %s", exc)
        self.order_context.pop(order_id, None)

        return order_id

    def place_forex_limit_order(
        self,
        pair: dict[str, Any],
        *,
        side: str,
        quantity: float,
        limit_price: float,
        transmit: bool,
        account: str,
    ) -> int:
        """Place FOREX LMT with secType=CASH and exchange=IDEALPRO (avoids IBKR 321)."""
        try:
            from .forex_pairs import build_cash_contract
        except ImportError:
            from forex_pairs import build_cash_contract  # type: ignore

        self.ensure_connected()
        if self.next_order_id is None:
            raise RuntimeError("No existe un identificador de orden válido")

        contract = build_cash_contract(pair)
        details = None
        try:
            details = self._resolve_contract_details(contract)
            qualified = getattr(details, "contract", None)
            if qualified is not None:
                contract = qualified
        except Exception:
            contract = build_cash_contract(pair)
            details = None

        contract.symbol = str(pair["symbol"])
        contract.secType = "CASH"
        contract.currency = str(pair["currency"])
        contract.exchange = "IDEALPRO"

        qty = float(quantity)
        if details is not None:
            try:
                qty = self._normalize_quantity(qty, details)
            except Exception:
                pass
        cap = min(float(settings.max_forex_order_units), 25_000.0)
        floor = float(settings.forex_min_units)
        if floor > cap:
            floor = cap
        qty = max(floor, min(cap, qty))

        price = float(limit_price)
        if details is not None:
            try:
                rules = self._resolve_market_rules(getattr(details, "marketRuleIds", "") or "")
                price = self._normalize_price(price, details, rules)
            except Exception:
                tick = 0.01 if pair.get("jpy_quoted") else 0.00005
                price = float(int(price / tick) * tick) if tick > 0 else price
        else:
            tick = 0.01 if pair.get("jpy_quoted") else 0.00005
            price = float(int(price / tick) * tick) if tick > 0 else price

        order_id = self.next_order_id
        self.next_order_id += 1
        order = Order()
        order.action = side
        order.orderType = "LMT"
        order.totalQuantity = qty
        order.lmtPrice = price
        order.tif = "DAY"
        order.outsideRth = False
        order.whatIf = False
        order.transmit = transmit
        if account:
            order.account = account
        apply_whatif_legacy_attr_compat(order)
        notional = qty * price
        log.info(
            "PLACING FOREX ORDER id=%s %s %s/%s qty=%s lmt=%s notional=%.2f transmit=%s acct=%s",
            order_id, side, contract.symbol, contract.currency, qty, price, notional, transmit, account,
        )
        self._log_buying_power(account)

        ack = threading.Event()
        self.place_ack_events[order_id] = ack
        self.place_ack_status.pop(order_id, None)
        self.place_ack_errors.pop(order_id, None)
        self.order_context[order_id] = {
            "kind": "FOREX",
            "pair": f"{contract.symbol}/{contract.currency}",
            "account": account,
        }
        self.placeOrder(order_id, contract, order)
        ack.wait(6)
        errors = self.place_ack_errors.get(order_id, [])
        status = self.place_ack_status.get(order_id, "NO_ACK")
        log.info("FOREX PLACE RESULT id=%s status=%s errors=%d", order_id, status, len(errors))
        for err in errors:
            log.warning("  err code=%s: %s", err.get("code"), err.get("message"))

        reject_codes = {103, 107, 109, 110, 321, 322, 387, 388, 10243, 10250, 10268, 10269, 10270, 201}
        forex_201 = next((err for err in errors if int(err.get("code", 0)) == 201), None)
        if forex_201 is not None:
            raise RuntimeError(
                "FOREX_ORDER_REJECTED_201: "
                f"{forex_201.get('message')} — probable falta de permisos FX para la cuenta {account}"
            )
        if any(int(err["code"]) in reject_codes for err in errors):
            raise RuntimeError(f"ORDER_REJECTED: {errors[-1]['code']} {errors[-1]['message']}")

        if status == "Inactive":
            log.error(
                "FOREX ORDER %s went INACTIVE — IBKR silently rejected. "
                "pair=%s/%s qty=%s lmt=%s notional=%.2f acct=%s. "
                "Check TWS Messages log.",
                order_id, contract.symbol, contract.currency, qty, price, notional, account,
            )

        # Post-place verification
        try:
            time.sleep(2)
            verify_orders = self.open_orders()
            matched = [o for o in verify_orders if o.get("orderId") == order_id]
            if matched:
                v = matched[0]
                log.info(
                    "FOREX POST-PLACE VERIFY id=%s status=%s warningText=%s",
                    order_id, v.get("status"), v.get("warningText") or "none",
                )
            else:
                log.warning(
                    "FOREX ORDER id=%s NOT FOUND in open orders after 2s",
                    order_id,
                )
        except Exception as exc:
            log.warning("FOREX POST-PLACE VERIFY failed: %s", exc)
        self.order_context.pop(order_id, None)

        return order_id


    def cancel_order(self, order_id: int) -> None:
        self.ensure_connected()
        oid = int(order_id)
        try:
            from ibapi.order_cancel import OrderCancel

            self.cancelOrder(oid, OrderCancel())
        except (ImportError, TypeError):
            self.cancelOrder(oid)  # type: ignore[call-arg]


ibkr = IBKRClient()


def require_key(x_internal_api_key: str = Header(default="")) -> None:
    if not x_internal_api_key or not hmac.compare_digest(settings.internal_api_key, x_internal_api_key):
        raise HTTPException(401, "Clave interna no válida")


def evaluate_risk(p: ProposalCreate) -> list[dict[str, Any]]:
    # Live supervised mode: symbol allowlist disabled — risk gates are nominal/qty/currency/exchange.
    symbols = set() if settings.live_trading_enabled else settings.csv_set(settings.allowed_symbols)
    currencies = settings.csv_set(settings.allowed_currencies)
    exchanges = settings.csv_set(settings.allowed_exchanges)
    notional = p.quantity * p.limit_price
    symbol_detail: Any = "disabled (live_trading_enabled)" if settings.live_trading_enabled else sorted(symbols)
    checks = [
        {"name": "quantity_limit", "passed": p.quantity <= settings.max_order_quantity, "detail": f"máximo {settings.max_order_quantity}"},
        {"name": "notional_limit", "passed": notional <= settings.max_order_notional, "detail": f"nominal {notional:.2f}; máximo {settings.max_order_notional:.2f}"},
        {"name": "symbol_allowlist", "passed": not symbols or p.symbol.upper() in symbols, "detail": symbol_detail},
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


@app.post("/api/ibkr/reconnect", dependencies=auth)
def reconnect():
    """Reset socket state and reconnect to TWS/Gateway."""
    try:
        ibkr._reset_socket_state()
        result = ibkr.connect_gateway()
        audit("IBKR_RECONNECTED", None, result)
        return {**result, "reconnected": True}
    except Exception as exc:
        audit("IBKR_RECONNECT_FAILED", None, {"error": str(exc)})
        raise HTTPException(503, str(exc)) from exc


@app.get("/api/ibkr/status", dependencies=auth)
def status():
    return ibkr.status()


def _offline_read_error(exc: Exception) -> dict[str, Any]:
    """Structured offline-safe payload when TWS is down — never invents account data."""
    message = str(exc)
    state = "TWS_OFFLINE" if "offline" in message.lower() or "nothing listening" in message.lower() else "UNAVAILABLE"
    return {
        "connected": False,
        "state": state,
        "error": message,
        "twsReachable": ibkr._tws_reachable(),
        "ibkrReadOnly": settings.ibkr_read_only,
        "liveTradingEnabled": settings.live_trading_enabled,
    }


@app.get("/api/ibkr/account", dependencies=auth)
def account():
    try:
        return ibkr.account_summary()
    except Exception as exc:
        # Offline-safe JSON (not empty 503) so UIs can show TWS_OFFLINE honestly.
        raise HTTPException(status_code=503, detail=_offline_read_error(exc)) from exc


@app.get("/api/ibkr/positions", dependencies=auth)
def positions():
    try:
        return ibkr.positions()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=_offline_read_error(exc)) from exc


@app.get("/api/ibkr/orders", dependencies=auth)
def orders():
    try:
        return ibkr.open_orders()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=_offline_read_error(exc)) from exc


@app.get("/api/ibkr/history", dependencies=auth)
def history(
    symbol: str = "AAPL",
    duration: str = "1 M",
    barSize: str = "1 day",
    whatToShow: str = "TRADES",
    currency: str = "USD",
    exchange: str = "SMART",
    secType: str = "STK",
):
    """
    READ_ONLY historical bars (reqHistoricalData).
    STK: SMART/TRADES. CASH FOREX: symbol=EUR&currency=USD&secType=CASH&exchange=IDEALPRO.
    Does not place orders and does not change LIVE_TRADING_ENABLED / IBKR_READ_ONLY.
    """
    cleaned = symbol.strip().upper()
    if not cleaned or len(cleaned) > 20:
        raise HTTPException(400, "symbol inválido")
    allowed_durations = {"1 D", "5 D", "1 W", "2 W", "1 M", "3 M", "6 M", "1 Y"}
    allowed_bars = {"1 min", "5 mins", "15 mins", "1 hour", "4 hours", "1 day"}
    allowed_sec = {"STK", "CASH"}
    cleaned_sec = (secType or "STK").strip().upper()
    if cleaned_sec not in allowed_sec:
        raise HTTPException(400, f"secType no permitida; use una de {sorted(allowed_sec)}")
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
            sec_type=cleaned_sec,
        )
        audit("IBKR_HISTORY_READ", cleaned, {"count": result.get("count", 0), "duration": duration, "barSize": barSize})
        return result
    except Exception as exc:
        audit("IBKR_HISTORY_FAILED", cleaned, {"error": str(exc)})
        raise HTTPException(503, str(exc)) from exc


@app.get("/api/ibkr/quote", dependencies=auth)
def stock_quote(
    symbol: str,
    currency: str = "USD",
    exchange: str = "SMART",
    secType: str = "STK",
):
    """READ_ONLY bid/ask/last (reqMktData). STK default; CASH uses IDEALPRO."""
    cleaned = symbol.strip().upper()
    if not cleaned or len(cleaned) > 20:
        raise HTTPException(400, "symbol inválido")
    cleaned_sec = (secType or "STK").strip().upper()
    if cleaned_sec not in {"STK", "CASH"}:
        raise HTTPException(400, "secType inválido; use STK o CASH")
    try:
        result = ibkr.stock_quote(
            cleaned,
            currency=currency.strip().upper() or "USD",
            exchange=exchange.strip().upper() or "SMART",
            sec_type=cleaned_sec,
        )
        audit("IBKR_QUOTE_READ", cleaned, {"bid": result.get("bid"), "ask": result.get("ask"), "last": result.get("last")})
        return result
    except Exception as exc:
        audit("IBKR_QUOTE_FAILED", cleaned, {"error": str(exc)})
        raise HTTPException(503, str(exc)) from exc


@app.get("/api/proposals", dependencies=auth)
def list_proposals():
    with db() as connection:
        rows = connection.execute("SELECT * FROM proposals ORDER BY created_at DESC LIMIT 200").fetchall()
    return [proposal_from_row(row) for row in rows]


@app.post("/api/proposals", dependencies=auth)
def create_proposal(payload: ProposalCreate):
    normalized = payload.model_copy(
        update={
            "symbol": payload.symbol.upper(),
            "sec_type": payload.sec_type.upper(),
            "currency": payload.currency.upper(),
            "exchange": payload.exchange.upper(),
            "account": (payload.account or settings.default_account_id(ibkr.accounts) or None),
        }
    )
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
        ack_status = ibkr.place_ack_status.get(order_id, "UNKNOWN")
        with db() as connection:
            current = connection.execute("SELECT status FROM proposals WHERE id=?", (proposal_id,)).fetchone()
            if not current or current["status"] != "APPROVED":
                raise HTTPException(409, "La propuesta ya fue consumida")
            connection.execute("UPDATE proposals SET status='EXECUTED',executed_at=?,ibkr_order_id=? WHERE id=?", (utcnow().isoformat(), order_id, proposal_id))
        audit("ORDER_SUBMITTED", proposal_id, {"ibkrOrderId": order_id, "ibkrStatus": ack_status})
        result = get_proposal(proposal_id)
        result["ibkrStatus"] = ack_status
        if ack_status == "Inactive":
            result["ibkrWarning"] = "Order went Inactive — IBKR silently rejected. Check TWS Messages."
        return result
    except HTTPException:
        raise
    except Exception as exc:
        audit("ORDER_SUBMIT_FAILED", proposal_id, {"error": str(exc)})
        raise HTTPException(503, str(exc)) from exc


@app.delete("/api/orders/{order_id}", dependencies=auth)
def cancel_broker_order(order_id: int):
    if emergency_stop():
        raise HTTPException(423, "Parada de emergencia activada")
    if not settings.live_trading_enabled:
        raise HTTPException(423, "LIVE_TRADING_ENABLED está desactivado")
    if settings.ibkr_read_only:
        raise HTTPException(423, "IBKR_READ_ONLY sigue activado")
    try:
        ibkr.cancel_order(order_id)
        audit("ORDER_CANCELLED", str(order_id), {"ibkrOrderId": order_id})
        return {"ok": True, "orderId": order_id, "cancelled": True}
    except HTTPException:
        raise
    except Exception as exc:
        audit("ORDER_CANCEL_FAILED", str(order_id), {"error": str(exc)})
        raise HTTPException(503, str(exc)) from exc


@app.post("/api/control/emergency-stop", dependencies=auth)
def set_emergency_stop(enabled: bool):
    with db() as connection:
        connection.execute("UPDATE control_state SET value=?,updated_at=? WHERE key='emergency_stop'", ("true" if enabled else "false", utcnow().isoformat()))
    audit("EMERGENCY_STOP_CHANGED", None, {"enabled": enabled})
    return {"enabled": enabled}


class ForexOrderRequest(BaseModel):
    pair_id: str = Field(min_length=6, max_length=12)
    side: Literal["BUY", "SELL"]
    quantity: float = Field(gt=0)
    limit_price: float = Field(gt=0)
    rationale: str = Field(default="FOREX LMT supervised", min_length=5, max_length=4000)
    transmit: bool = False
    outside_rth: bool = False
    account: str = ""
    sec_type: Literal["CASH"] = "CASH"
    exchange: Literal["IDEALPRO"] = "IDEALPRO"


def _forex_pair_or_404(pair_id: str) -> dict[str, Any]:
    try:
        from .forex_pairs import get_pair
    except ImportError:
        from forex_pairs import get_pair  # type: ignore
    pair = get_pair(pair_id)
    if not pair:
        raise HTTPException(404, f"Par FOREX desconocido: {pair_id}")
    allowed = settings.csv_set(settings.forex_allowed_pairs)
    if allowed and pair["pair_id"] not in allowed:
        raise HTTPException(403, f"Par no permitido: {pair['pair_id']}")
    return pair


@app.get("/api/forex/quotes", dependencies=auth)
def forex_quotes(pair: str | None = None):
    """READ_ONLY bid/ask for configured FOREX pairs (IDEALPRO CASH)."""
    try:
        from .forex_pairs import FOREX_PAIRS
    except ImportError:
        from forex_pairs import FOREX_PAIRS  # type: ignore

    allowed = settings.csv_set(settings.forex_allowed_pairs)
    universe = [p for p in FOREX_PAIRS if not allowed or p["pair_id"] in allowed]
    if pair:
        selected = _forex_pair_or_404(pair)
        universe = [selected]
    quotes: list[dict[str, Any]] = []
    errors: list[str] = []
    for item in universe:
        try:
            quotes.append(ibkr.forex_quote(item))
        except Exception as exc:
            errors.append(f"{item['pair_id']}: {exc}")
            quotes.append(
                {
                    "pairId": item["pair_id"],
                    "display": item["display"],
                    "symbol": item["symbol"],
                    "currency": item["currency"],
                    "secType": "CASH",
                    "exchange": "IDEALPRO",
                    "bid": None,
                    "ask": None,
                    "mid": None,
                    "spreadPips": None,
                    "error": str(exc),
                    "mode": "READ_ONLY",
                }
            )
    return {
        "generatedAt": utcnow().isoformat(),
        "forexEnabled": settings.forex_enabled,
        "count": len(quotes),
        "quotes": quotes,
        "errors": errors,
        "ibkrReadOnly": settings.ibkr_read_only,
        "liveTradingEnabled": settings.live_trading_enabled,
        "mode": "READ_ONLY",
    }


@app.get("/api/forex/positions", dependencies=auth)
def forex_positions():
    """Open IDEALPRO/CASH positions only."""
    try:
        rows = ibkr.positions()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=_offline_read_error(exc)) from exc
    fx = [
        row
        for row in rows
        if str(row.get("secType", "")).upper() == "CASH"
        or str(row.get("exchange", "")).upper() == "IDEALPRO"
    ]
    return {
        "generatedAt": utcnow().isoformat(),
        "count": len(fx),
        "positions": fx,
        "maxPositions": settings.forex_max_positions,
        "mode": "READ_ONLY",
    }


@app.get("/api/forex/history", dependencies=auth)
def forex_history(
    pair: str = "EURUSD",
    duration: str = "5 D",
    barSize: str = "5 mins",
    whatToShow: str = "MIDPOINT",
):
    selected = _forex_pair_or_404(pair)
    try:
        return ibkr.forex_history(selected, duration=duration, bar_size=barSize, what_to_show=whatToShow)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=_offline_read_error(exc)) from exc


@app.post("/api/forex/order", dependencies=auth)
def forex_order(payload: ForexOrderRequest):
    """
    Transmit FOREX LMT on IDEALPRO CASH after Telegram approval.
    Quantity is clamped to 25_000 (never the 500k broker ceiling).
    Live transmit requires FOREX_ENABLED + LIVE_TRADING + not READ_ONLY.
    """
    if emergency_stop():
        raise HTTPException(423, "Emergency stop activo")
    selected = _forex_pair_or_404(payload.pair_id)
    log.info(
        "FOREX API REQUEST pair=%s side=%s qty=%s lmt=%s transmit=%s requestedAccount=%s",
        selected["pair_id"],
        payload.side,
        payload.quantity,
        payload.limit_price,
        payload.transmit,
        payload.account or "default",
    )

    cap = min(float(settings.max_forex_order_units), 25_000.0)
    floor = float(settings.forex_min_units)
    if floor > cap:
        floor = cap
    quantity = float(payload.quantity)
    if quantity < floor:
        quantity = floor
    if quantity > cap:
        quantity = cap

    transmit = bool(payload.transmit)
    if transmit:
        if not settings.forex_enabled:
            raise HTTPException(423, "FOREX_ENABLED=false — solo stage permitido")
        if not settings.live_trading_enabled:
            raise HTTPException(423, "LIVE_TRADING_ENABLED=false")
        if settings.ibkr_read_only:
            raise HTTPException(423, "IBKR_READ_ONLY=true — no transmit")

    try:
        open_fx = [
            row
            for row in ibkr.positions()
            if str(row.get("secType", "")).upper() == "CASH"
        ]
    except Exception:
        open_fx = []
    if len(open_fx) >= settings.forex_max_positions and transmit:
        raise HTTPException(409, f"Máximo {settings.forex_max_positions} posiciones FOREX")

    account = (payload.account or settings.default_account_id(ibkr.accounts) or "").strip()
    proposal = {
        "symbol": selected["symbol"],
        "sec_type": "CASH",
        "currency": selected["currency"],
        "exchange": "IDEALPRO",
        "side": payload.side,
        "quantity": quantity,
        "limit_price": float(payload.limit_price),
        "outside_rth": False,
        "account": account,
        "rationale": payload.rationale,
    }
    try:
        log.info(
            "FOREX DISPATCH pair=%s side=%s qty=%s lmt=%s account=%s transmit=%s",
            selected["pair_id"],
            payload.side,
            quantity,
            payload.limit_price,
            account or "default",
            transmit,
        )
        order_id = ibkr.place_forex_limit_order(
            selected,
            side=payload.side,
            quantity=quantity,
            limit_price=float(payload.limit_price),
            transmit=transmit,
            account=account,
        )
        ack_status = ibkr.place_ack_status.get(order_id, "UNKNOWN")
        audit(
            "FOREX_ORDER_STAGED" if not transmit else "FOREX_ORDER_SUBMITTED",
            selected["pair_id"],
            {"orderId": order_id, "transmit": transmit, "ibkrStatus": ack_status, **proposal},
        )
        result = {
            "ok": True,
            "pairId": selected["pair_id"],
            "ibkrOrderId": order_id,
            "ibkrStatus": ack_status,
            "transmit": transmit,
            "staged": not transmit,
            "proposal": proposal,
            "mode": "STAGED" if not transmit else "LIVE_GATED",
        }
        if ack_status == "Inactive":
            result["ibkrWarning"] = "Order went Inactive — IBKR silently rejected. Check TWS Messages."
        log.info(
            "FOREX API RESULT pair=%s orderId=%s ibkrStatus=%s staged=%s",
            selected["pair_id"],
            order_id,
            ack_status,
            not transmit,
        )
        return result
    except Exception as exc:
        audit("FOREX_ORDER_FAILED", selected["pair_id"], {"error": str(exc), **proposal})
        raise HTTPException(503, str(exc)) from exc
