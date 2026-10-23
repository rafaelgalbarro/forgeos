"""
ForgeOS MT5 bridge — runs with the *Windows* Python inside the MetaTrader 5 Wine container
(gmag11/metatrader5_vnc), next to the terminal, and exposes a tiny HTTP JSON API on
0.0.0.0:8004 (published only on 127.0.0.1 of the host).

Credentials: Z:\\config\\forgeos\\mt5-credentials.json  {"login": 123, "password": "...", "server": "..."}
Auth: header X-Bridge-Key must match Z:\\config\\forgeos\\bridge-key.txt
Only stdlib + MetaTrader5.
"""

import json
import os
import threading
import time
import traceback
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

import MetaTrader5 as mt5

BASE = os.environ.get("FORGEOS_MT5_DIR", r"Z:\config\forgeos")
LOCK = threading.Lock()
STATE = {"initialized": False, "last_error": None, "login": None, "server": None}

TF = {
    "M1": mt5.TIMEFRAME_M1, "M5": mt5.TIMEFRAME_M5, "M15": mt5.TIMEFRAME_M15,
    "M30": mt5.TIMEFRAME_M30, "H1": mt5.TIMEFRAME_H1, "H4": mt5.TIMEFRAME_H4, "D1": mt5.TIMEFRAME_D1,
}


def _read(name, default=None):
    try:
        with open(os.path.join(BASE, name), "r", encoding="utf-8") as fh:
            return fh.read()
    except Exception:
        return default


def bridge_key():
    return (_read("bridge-key.txt", "") or "").strip()


def ensure_init():
    if STATE["initialized"] and mt5.terminal_info() is not None and mt5.account_info() is not None:
        return True
    creds_raw = _read("mt5-credentials.json")
    if not creds_raw:
        STATE["last_error"] = "sin credenciales (mt5-credentials.json)"
        return False
    creds = json.loads(creds_raw)
    mt5.shutdown()
    oanda = r"C:\Program Files\OANDA TMS MT5 Terminal\terminal64.exe"
    term = creds.get("path") or (oanda if os.path.exists(oanda) else r"C:\Program Files\MetaTrader 5\terminal64.exe")
    # The runner starts the terminal already logged in (/config:start.ini). Attach first without
    # credentials: passing them makes the terminal open its (WebView) login dialog under Wine.
    if mt5.initialize(path=term, timeout=180000):
        a = mt5.account_info()
        if a is not None and int(a.login) == int(creds["login"]):
            STATE.update(initialized=True, last_error=None, login=int(creds["login"]), server=str(creds["server"]))
            return True
        STATE["last_error"] = "terminal conectado pero sin sesión en %s (cuenta=%s)" % (creds["login"], getattr(a, "login", None))
        if a is None:
            return False
    mt5.shutdown()
    ok = mt5.initialize(path=term, login=int(creds["login"]), password=str(creds["password"]), server=str(creds["server"]), timeout=180000)
    if not ok:
        STATE["initialized"] = False
        STATE["last_error"] = "initialize: %s" % (mt5.last_error(),)
        return False
    STATE.update(initialized=True, last_error=None, login=int(creds["login"]), server=str(creds["server"]))
    return True


def sym_info(symbol):
    info = mt5.symbol_info(symbol)
    if info is None:
        return None
    if not info.visible:
        mt5.symbol_select(symbol, True)
        info = mt5.symbol_info(symbol)
    return info


def resolve(base):
    """EUR_USD → tradable broker symbol. OANDA TMS lists EURUSD (view only, trade disabled) and
    EURUSD.pro (tradable): prefer symbols whose trade mode is FULL, then the shortest name."""
    want = base.replace("_", "").replace("/", "").upper()
    cands = []
    for s in (mt5.symbols_get("*" + want + "*") or []):
        name = s.name.upper()
        if not name.startswith(want):
            continue
        cands.append(s)
    if not cands:
        exact = mt5.symbol_info(want)
        return want if exact is not None else None
    full = getattr(mt5, "SYMBOL_TRADE_MODE_FULL", 4)
    cands.sort(key=lambda s: (0 if s.trade_mode == full else 1 if s.trade_mode != 0 else 2, len(s.name), s.name))
    best = cands[0]
    mt5.symbol_select(best.name, True)
    return best.name


def account():
    a = mt5.account_info()
    t = mt5.terminal_info()
    return {
        "login": a.login, "server": a.server, "currency": a.currency, "balance": a.balance,
        "equity": a.equity, "margin": a.margin, "margin_free": a.margin_free, "leverage": a.leverage,
        "trade_allowed": bool(a.trade_allowed), "trade_expert": bool(a.trade_expert),
        "terminal_trade_allowed": bool(t.trade_allowed) if t else None,
        "connected": bool(t.connected) if t else None, "demo": a.trade_mode == mt5.ACCOUNT_TRADE_MODE_DEMO,
        "margin_mode_netting": a.margin_mode == mt5.ACCOUNT_MARGIN_MODE_RETAIL_NETTING,
    }


def symbol_payload(symbol):
    info = sym_info(symbol)
    if info is None:
        return None
    tick = mt5.symbol_info_tick(symbol)
    return {
        "symbol": symbol, "digits": info.digits, "point": info.point,
        "contract_size": info.trade_contract_size, "volume_min": info.volume_min,
        "volume_step": info.volume_step, "volume_max": info.volume_max,
        "tick_size": info.trade_tick_size, "tick_value": info.trade_tick_value,
        "tick_value_loss": getattr(info, "trade_tick_value_loss", info.trade_tick_value),
        "stops_level": info.trade_stops_level, "filling_mode": info.filling_mode,
        "trade_mode": info.trade_mode, "currency_profit": info.currency_profit, "currency_base": info.currency_base,
        "bid": tick.bid if tick else None, "ask": tick.ask if tick else None, "time": tick.time if tick else None,
    }


def rates(symbol, tf, count):
    sym_info(symbol)
    arr = mt5.copy_rates_from_pos(symbol, TF[tf], 0, int(count) + 1)
    if arr is None:
        raise RuntimeError("copy_rates: %s" % (mt5.last_error(),))
    rows = [
        {"time": int(r["time"]), "open": float(r["open"]), "high": float(r["high"]),
         "low": float(r["low"]), "close": float(r["close"]), "volume": float(r["tick_volume"])}
        for r in arr
    ]
    return rows[:-1]  # drop the forming bar: closed candles only


def filling_for(info):
    fm = info.filling_mode
    if fm & 1:
        return mt5.ORDER_FILLING_FOK
    if fm & 2:
        return mt5.ORDER_FILLING_IOC
    return mt5.ORDER_FILLING_RETURN


def order(body):
    symbol = body["symbol"]
    info = sym_info(symbol)
    if info is None:
        raise RuntimeError("símbolo desconocido %s" % symbol)
    side = body["side"]
    tick = mt5.symbol_info_tick(symbol)
    price = tick.ask if side == "long" else tick.bid
    sl = round(float(body["sl"]), info.digits)
    tp = round(float(body["tp"]), info.digits)
    if not sl or not tp:
        raise RuntimeError("SL y TP obligatorios")
    req = {
        "action": mt5.TRADE_ACTION_DEAL, "symbol": symbol, "volume": float(body["volume"]),
        "type": mt5.ORDER_TYPE_BUY if side == "long" else mt5.ORDER_TYPE_SELL,
        "price": price, "sl": sl, "tp": tp, "deviation": int(body.get("deviation", 10)),
        "magic": 26102026, "comment": str(body.get("comment", "forgeos"))[:28],
        "type_time": mt5.ORDER_TIME_GTC, "type_filling": filling_for(info),
    }
    res = mt5.order_send(req)
    if res is None:
        raise RuntimeError("order_send None: %s" % (mt5.last_error(),))
    if res.retcode != mt5.TRADE_RETCODE_DONE:
        raise RuntimeError("retcode %s %s" % (res.retcode, res.comment))
    return {"order": res.order, "deal": res.deal, "price": res.price, "volume": res.volume, "position": getattr(res, "order", None)}


def trade_check():
    """Dry-run (order_check, nothing is sent): can this account actually trade right now?"""
    symbol = resolve("EUR_USD")
    info = sym_info(symbol)
    tick = mt5.symbol_info_tick(symbol)
    if info is None or tick is None:
        return {"ok": False, "retcode": None, "comment": "sin cotización %s" % symbol}
    d = 50 * 10 * info.point
    req = {
        "action": mt5.TRADE_ACTION_DEAL, "symbol": symbol, "volume": float(info.volume_min),
        "type": mt5.ORDER_TYPE_BUY, "price": tick.ask, "sl": round(tick.ask - d, info.digits),
        "tp": round(tick.ask + d, info.digits), "deviation": 10, "magic": 26102026,
        "type_time": mt5.ORDER_TIME_GTC, "type_filling": filling_for(info),
    }
    r = mt5.order_check(req)
    if r is None:
        return {"ok": False, "retcode": None, "comment": str(mt5.last_error())}
    return {"ok": r.retcode == 0, "retcode": r.retcode, "comment": r.comment, "symbol": symbol}


def positions():
    out = []
    for p in mt5.positions_get() or []:
        out.append({
            "ticket": p.ticket, "symbol": p.symbol, "side": "long" if p.type == mt5.POSITION_TYPE_BUY else "short",
            "volume": p.volume, "price_open": p.price_open, "sl": p.sl, "tp": p.tp, "profit": p.profit,
            "magic": p.magic, "comment": p.comment, "time": p.time,
        })
    return out


def close(ticket):
    pos = [p for p in (mt5.positions_get(ticket=int(ticket)) or [])]
    if not pos:
        raise RuntimeError("posición %s no encontrada" % ticket)
    p = pos[0]
    info = sym_info(p.symbol)
    tick = mt5.symbol_info_tick(p.symbol)
    req = {
        "action": mt5.TRADE_ACTION_DEAL, "symbol": p.symbol, "volume": p.volume, "position": p.ticket,
        "type": mt5.ORDER_TYPE_SELL if p.type == mt5.POSITION_TYPE_BUY else mt5.ORDER_TYPE_BUY,
        "price": tick.bid if p.type == mt5.POSITION_TYPE_BUY else tick.ask, "deviation": 20,
        "magic": 26102026, "comment": "forgeos close", "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": filling_for(info),
    }
    res = mt5.order_send(req)
    if res is None or res.retcode != mt5.TRADE_RETCODE_DONE:
        raise RuntimeError("cierre falló: %s" % (getattr(res, "comment", mt5.last_error()),))
    return {"price": res.price}


def closed_result(ticket):
    deals = mt5.history_deals_get(position=int(ticket)) or []
    pl = sum(d.profit + d.commission + d.swap + getattr(d, "fee", 0.0) for d in deals)
    exits = [d for d in deals if d.entry in (mt5.DEAL_ENTRY_OUT, mt5.DEAL_ENTRY_OUT_BY)]
    return {"found": bool(deals), "closed": bool(exits), "pnl": pl,
            "exit_price": exits[-1].price if exits else None,
            "reason": int(exits[-1].reason) if exits else None}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass

    def _send(self, code, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _auth(self):
        key = bridge_key()
        return bool(key) and self.headers.get("X-Bridge-Key", "") == key

    def _handle(self, method):
        if not self._auth():
            return self._send(401, {"error": "unauthorized"})
        url = urlparse(self.path)
        q = {k: v[0] for k, v in parse_qs(url.query).items()}
        body = {}
        if method == "POST":
            n = int(self.headers.get("Content-Length", "0") or 0)
            body = json.loads(self.rfile.read(n) or b"{}")
        if not STATE["initialized"]:
            return self._send(200 if url.path == "/health" else 503,
                              {"ok": False, "state": STATE, "error": STATE["last_error"] or "iniciando sesión en MT5…"})
        with LOCK:
            try:
                if url.path == "/health":
                    ok = ensure_init()
                    return self._send(200, {"ok": ok, "state": STATE, "account": account() if ok else None})
                if not ensure_init():
                    return self._send(503, {"error": STATE["last_error"]})
                if url.path == "/account":
                    return self._send(200, account())
                if url.path == "/resolve":
                    return self._send(200, {"symbol": resolve(q.get("base", ""))})
                if url.path == "/symbol":
                    p = symbol_payload(q["symbol"])
                    return self._send(200 if p else 404, p or {"error": "símbolo no encontrado"})
                if url.path == "/rates":
                    return self._send(200, rates(q["symbol"], q.get("tf", "M15"), int(q.get("count", 400))))
                if url.path == "/tradecheck":
                    return self._send(200, trade_check())
                if url.path == "/positions":
                    return self._send(200, positions())
                if url.path == "/closed":
                    return self._send(200, closed_result(q["ticket"]))
                if url.path == "/order" and method == "POST":
                    return self._send(200, order(body))
                if url.path == "/close" and method == "POST":
                    return self._send(200, close(body["ticket"]))
                return self._send(404, {"error": "ruta desconocida"})
            except Exception as exc:  # noqa: BLE001
                return self._send(500, {"error": str(exc), "trace": traceback.format_exc()[-600:]})

    def do_GET(self):
        self._handle("GET")

    def do_POST(self):
        self._handle("POST")


def _init_loop():
    fails = 0
    while not STATE["initialized"]:
        with LOCK:
            ok = ensure_init()
        print("init=%s err=%s" % (ok, STATE["last_error"]), flush=True)
        if ok:
            break
        fails += 1
        # Let a slow first start / live update finish; only after 3 failures kill the terminal
        # (a failed initialize can leave a terminal64.exe behind; never let them pile up).
        if fails % 3 == 0:
            try:
                mt5.shutdown()
                os.system("taskkill /F /IM terminal64.exe >NUL 2>&1")
            except Exception:  # noqa: BLE001
                pass
        time.sleep(60)


if __name__ == "__main__":
    srv = ThreadingHTTPServer(("0.0.0.0", 8004), Handler)
    print("mt5 bridge listening on 8004", flush=True)
    threading.Thread(target=_init_loop, daemon=True).start()
    srv.serve_forever()
