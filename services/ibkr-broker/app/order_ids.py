"""Consecutive IBKR order id allocation (bracket-safe)."""

from __future__ import annotations

import logging
import threading
from typing import Any

log = logging.getLogger("ibkr-broker")


def allocate_consecutive_order_ids(client: Any, count: int) -> list[int]:
    """One reqIds/nextValidId round-trip, then local N..N+count-1.

    Rapid repeated reqIds(-1) can yield duplicate ids (15/10 WFC: SL and TP both 2113).
    """
    if count < 1:
        raise ValueError("count must be >= 1")
    client.ensure_connected()
    event = threading.Event()
    client._pending_next_id_event = event
    try:
        client.reqIds(-1)
        if not event.wait(timeout=5.0):
            raise RuntimeError("Timeout esperando nextValidId() para ids consecutivos")
        if client.next_order_id is None:
            raise RuntimeError("No existe un identificador de orden válido (nextValidId)")
        start = int(client.next_order_id)
        client.next_order_id = start + count
        ids = list(range(start, start + count))
        log.info("Allocated consecutive orderIds=%s (count=%s)", ids, count)
        return ids
    finally:
        client._pending_next_id_event = None
