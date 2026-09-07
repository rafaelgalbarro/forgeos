"""FOREX pair universe — IBKR IDEALPRO CASH contracts."""

from __future__ import annotations

from typing import Any

FOREX_PAIRS: list[dict[str, Any]] = [
    {"pair_id": "EURUSD", "display": "EUR/USD", "symbol": "EUR", "currency": "USD", "jpy_quoted": False},
    {"pair_id": "GBPUSD", "display": "GBP/USD", "symbol": "GBP", "currency": "USD", "jpy_quoted": False},
    {"pair_id": "USDJPY", "display": "USD/JPY", "symbol": "USD", "currency": "JPY", "jpy_quoted": True},
    {"pair_id": "USDCHF", "display": "USD/CHF", "symbol": "USD", "currency": "CHF", "jpy_quoted": False},
    {"pair_id": "AUDUSD", "display": "AUD/USD", "symbol": "AUD", "currency": "USD", "jpy_quoted": False},
    {"pair_id": "USDCAD", "display": "USD/CAD", "symbol": "USD", "currency": "CAD", "jpy_quoted": False},
    {"pair_id": "EURGBP", "display": "EUR/GBP", "symbol": "EUR", "currency": "GBP", "jpy_quoted": False},
    {"pair_id": "EURJPY", "display": "EUR/JPY", "symbol": "EUR", "currency": "JPY", "jpy_quoted": True},
    {"pair_id": "GBPJPY", "display": "GBP/JPY", "symbol": "GBP", "currency": "JPY", "jpy_quoted": True},
]

FOREX_PAIR_BY_ID = {p["pair_id"]: p for p in FOREX_PAIRS}


def normalize_pair_id(raw: str) -> str:
    return raw.replace("/", "").replace("-", "").replace("_", "").upper().strip()


def get_pair(pair_id: str) -> dict[str, Any] | None:
    return FOREX_PAIR_BY_ID.get(normalize_pair_id(pair_id))


def pip_size(pair: dict[str, Any]) -> float:
    return 0.01 if pair.get("jpy_quoted") else 0.0001


def build_cash_contract(pair: dict[str, Any]):
    from ibapi.contract import Contract

    contract = Contract()
    contract.symbol = pair["symbol"]
    contract.secType = "CASH"
    contract.currency = pair["currency"]
    contract.exchange = "IDEALPRO"
    return contract
