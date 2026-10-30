"""NO_ACK brakes inside the IBKR broker process (all live send paths)."""

from __future__ import annotations

import json
import logging
import os
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

log = logging.getLogger("ibkr-broker")

WINDOW_MS = 30 * 60_000
PAUSE_MS = 2 * 60 * 60_000
MAX_EVENTS = 3

REJECT_EVENTS_FILE = "ibkr-stocks-reject-events.json"
PAUSE_FILE = "ibkr-stocks-execution-pause.json"
SYMBOL_DAY_FILE = "ibkr-broker-no-ack-symbol-day.json"


def _utc_today() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def forgeos_cache_dir() -> Path:
    explicit = os.getenv("FORGEOS_CACHE_DIR", "").strip()
    if explicit:
        return Path(explicit)
    here = Path(__file__).resolve()
    for base in [here.parent, *here.parents]:
        if (base / "package.json").exists() or (base / ".forgeos").exists():
            return base / ".forgeos" / "cache"
    return Path(".forgeos/cache")


def _read_json(path: Path) -> dict[str, Any]:
    try:
        if not path.exists():
            return {}
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _telegram(message: str) -> None:
    token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
    chat_id = os.getenv("TELEGRAM_CHAT_ID", "").strip()
    if not token or not chat_id:
        log.warning("Telegram skip (TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID unset): %s", message[:120])
        return
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    body = urllib.parse.urlencode(
        {"chat_id": chat_id, "text": message, "parse_mode": "HTML"},
    ).encode("utf-8")
    try:
        req = urllib.request.Request(url, data=body, method="POST")
        with urllib.request.urlopen(req, timeout=10):
            pass
    except Exception as exc:
        log.warning("Telegram send failed: %s", exc)


def _load_symbol_blocks() -> dict[str, str]:
    raw = _read_json(forgeos_cache_dir() / SYMBOL_DAY_FILE)
    blocks = raw.get("symbols") if isinstance(raw.get("symbols"), dict) else raw
    if not isinstance(blocks, dict):
        return {}
    return {str(k).upper(): str(v) for k, v in blocks.items()}


def _save_symbol_block(symbol: str) -> None:
    path = forgeos_cache_dir() / SYMBOL_DAY_FILE
    blocks = _load_symbol_blocks()
    blocks[symbol.upper()] = _utc_today()
    _write_json(path, {"updatedAt": datetime.now(timezone.utc).isoformat(), "symbols": blocks})


def symbol_blocked_for_no_ack_today(symbol: str) -> bool:
    sym = symbol.strip().upper()
    if not sym:
        return False
    return _load_symbol_blocks().get(sym) == _utc_today()


def global_pause_active() -> tuple[bool, str | None]:
    path = forgeos_cache_dir() / PAUSE_FILE
    raw = _read_json(path)
    until_s = raw.get("pausedUntil")
    if not until_s:
        return False, None
    try:
        until = datetime.fromisoformat(str(until_s).replace("Z", "+00:00"))
    except ValueError:
        return False, None
    now = datetime.now(timezone.utc)
    if until.tzinfo is None:
        until = until.replace(tzinfo=timezone.utc)
    if now >= until:
        return False, None
    reason = raw.get("reason") or f"pausa hasta {until.isoformat()}"
    return True, str(reason)


def assert_order_send_allowed(*, symbol: str | None, transmit: bool, what_if: bool, closing: bool = False) -> None:
    if what_if or not transmit:
        return
    # Exits of an existing long are never braked: the brake must not leave a position stuck
    # (INTC 30/10: stop-loss sells refused all day after one premarket NO_ACK).
    if closing:
        return
    paused, reason = global_pause_active()
    if paused:
        raise RuntimeError(f"BROKER_NO_ACK_BRAKE global: {reason}")
    sym = (symbol or "").strip().upper()
    if sym and symbol_blocked_for_no_ack_today(sym):
        raise RuntimeError(
            f"BROKER_NO_ACK_BRAKE symbol {sym}: NO_ACK hoy — sin nuevas órdenes hasta mañana UTC",
        )


def record_place_no_ack(symbol: str) -> dict[str, Any]:
    """After NO_ACK on a symbol: block symbol for UTC day; 4th event in 30m → 2h global pause."""
    sym = symbol.strip().upper()
    now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
    cache = forgeos_cache_dir()
    events_path = cache / REJECT_EVENTS_FILE
    raw = _read_json(events_path)
    events = raw.get("events") if isinstance(raw.get("events"), list) else []
    events = [e for e in events if isinstance(e, dict) and now_ms - int(e.get("at", 0)) < WINDOW_MS]
    events.append({"at": now_ms, "symbol": sym, "kind": "NO_ACK", "source": "ibkr-broker"})
    _write_json(
        events_path,
        {"updatedAt": datetime.now(timezone.utc).isoformat(), "events": events},
    )
    if sym:
        _save_symbol_block(sym)

    paused = False
    if len(events) > MAX_EVENTS:
        pause_path = cache / PAUSE_FILE
        existing_paused, _ = global_pause_active()
        if not existing_paused:
            until = datetime.fromtimestamp((now_ms + PAUSE_MS) / 1000, tz=timezone.utc)
            reason = (
                f">3 NO_ACK/rechazos en 30 min ({len(events)} eventos: "
                + ", ".join(f"{e.get('symbol')}:{e.get('kind')}" for e in events[-5:])
                + ") → pausa 2h"
            )
            _write_json(
                pause_path,
                {
                    "pausedUntil": until.isoformat(),
                    "reason": reason,
                    "triggeredAt": datetime.now(timezone.utc).isoformat(),
                    "telegramSent": True,
                    "source": "ibkr-broker",
                },
            )
            _telegram(f"🛑 <b>FRENO STOCKS (broker)</b>: {reason}\nSin órdenes hasta {until.isoformat()}")
            log.error("BROKER_NO_ACK_BRAKE global: %s", reason)
            paused = True
        else:
            paused = True

    return {"symbolBlocked": sym, "countInWindow": len(events), "globalPaused": paused}


def reset_order_send_brakes_for_tests() -> None:
    cache = forgeos_cache_dir()
    for name in (REJECT_EVENTS_FILE, PAUSE_FILE, SYMBOL_DAY_FILE):
        p = cache / name
        if p.exists():
            p.unlink()
