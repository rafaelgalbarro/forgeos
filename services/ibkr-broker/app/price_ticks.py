"""Tick-size normalisation for IBKR limit / stop prices.

IBKR rejects any price that is not a multiple of the active price increment
(error 110 "The price does not conform to the minimum price variation").
European venues (BME, Xetra, Euronext) use MiFID II tick tables that depend on
the price band, so the increment must come from the contract's market rule,
not from a fixed 2-decimal rounding.
"""

from __future__ import annotations

from decimal import ROUND_CEILING, ROUND_FLOOR, ROUND_HALF_UP, Decimal
from typing import Any, Iterable, Literal

RoundMode = Literal["down", "up", "nearest"]

_DEFAULT_TICK = Decimal("0.01")


def _dec(value: Any) -> Decimal:
    return Decimal(str(value))


def pick_increment(
    price: Any,
    min_tick: Any = None,
    rules: dict[int, Iterable[dict[str, Any]]] | None = None,
) -> Decimal:
    """Strictest increment active at `price` across market rules and minTick."""
    value = _dec(price)
    candidates: list[Decimal] = []
    for entries in (rules or {}).values():
        active: Decimal | None = None
        for row in sorted(entries or [], key=lambda r: float(r["lowEdge"])):
            if value >= _dec(row["lowEdge"]):
                active = _dec(row["increment"])
        if active is not None and active > 0:
            candidates.append(active)
    if min_tick not in (None, "", 0, 0.0):
        tick = _dec(min_tick)
        if tick > 0:
            candidates.append(tick)
    if not candidates:
        return _DEFAULT_TICK
    return max(candidates)


def round_to_increment(price: Any, increment: Decimal, mode: RoundMode) -> float:
    value = _dec(price)
    if increment <= 0:
        return float(value)
    rounding = {"down": ROUND_FLOOR, "up": ROUND_CEILING, "nearest": ROUND_HALF_UP}[mode]
    steps = (value / increment).to_integral_value(rounding=rounding)
    return float(steps * increment)


def round_price(
    price: Any,
    mode: RoundMode,
    min_tick: Any = None,
    rules: dict[int, Iterable[dict[str, Any]]] | None = None,
) -> float:
    """Round to a valid tick. The increment is re-evaluated at the result so a
    price crossing a band edge still lands on a valid tick."""
    inc = pick_increment(price, min_tick, rules)
    out = round_to_increment(price, inc, mode)
    inc2 = pick_increment(out, min_tick, rules)
    if inc2 != inc:
        out = round_to_increment(out, inc2, mode)
    return out


def normalize_bracket_prices(
    *,
    side: str,
    entry: float,
    take_profit: float | None,
    stop_loss: float | None,
    min_tick: Any = None,
    rules: dict[int, Iterable[dict[str, Any]]] | None = None,
) -> dict[str, float | None]:
    """Conservative rounding for a bracket.

    BUY : entry down (never pay more), TP down (exit sooner), SL up (smaller loss).
    SELL: entry up, TP up, SL down.
    Keeps SL < entry < TP (BUY) by at least one tick.
    """
    buy = str(side).upper() == "BUY"
    e = round_price(entry, "down" if buy else "up", min_tick, rules)
    tp = sl = None
    if take_profit is not None:
        tp = round_price(take_profit, "down" if buy else "up", min_tick, rules)
        inc = float(pick_increment(e, min_tick, rules))
        if buy and tp <= e:
            tp = round_price(e + inc, "up", min_tick, rules)
        if not buy and tp >= e:
            tp = round_price(e - inc, "down", min_tick, rules)
    if stop_loss is not None:
        sl = round_price(stop_loss, "up" if buy else "down", min_tick, rules)
        inc = float(pick_increment(e, min_tick, rules))
        if buy and sl >= e:
            sl = round_price(e - inc, "down", min_tick, rules)
        if not buy and sl <= e:
            sl = round_price(e + inc, "up", min_tick, rules)
    return {"entry": e, "take_profit": tp, "stop_loss": sl}
