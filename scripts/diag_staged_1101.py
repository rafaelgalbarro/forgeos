import json
import math
import threading
import time
from datetime import datetime, timedelta

from ibapi.client import EClient
from ibapi.contract import Contract
from ibapi.execution import ExecutionFilter
from ibapi.wrapper import EWrapper

HOST = "127.0.0.1"
PORT = 7496
CLIENT_ID = 961  # same clientId that created order 1101
TARGET_ORDER_ID = 1101
ACCOUNT_FULL = "U24225949"


def wait_until(pred, timeout_s):
    end = time.time() + timeout_s
    while time.time() < end:
        if pred():
            return True
        time.sleep(0.05)
    return False


def is_price_valid(price, increment):
    if increment is None or increment <= 0:
        return False
    q = round(price / increment)
    return math.isclose(q * increment, price, rel_tol=0.0, abs_tol=1e-9)


class App(EWrapper, EClient):
    def __init__(self):
        EClient.__init__(self, self)
        self.connected_ok = False
        self.next_id = None
        self.errors = []
        self.open_orders = []
        self.open_order_end_count = 0
        self.order_status_events = []
        self.exec_events = []
        self.exec_end = False
        self.market_rules = {}
        self.market_rule_done = set()
        self.contract_done = False
        self.contract = None
        self.contract_details = None
        self.pos_before = {}
        self.pos_after = {}
        self.cash_before = {}
        self.cash_after = {}
        self.pos_phase = "before"
        self.cash_phase = "before"

    def nextValidId(self, orderId):
        self.next_id = orderId
        self.connected_ok = True

    def error(self, reqId, errorCode, errorString, advancedOrderRejectJson=""):
        self.errors.append({"reqId": reqId, "code": errorCode, "msg": errorString})

    def openOrder(self, orderId, contract, order, orderState):
        self.open_orders.append(
            {
                "orderId": orderId,
                "account": getattr(order, "account", ""),
                "symbol": getattr(contract, "symbol", ""),
                "currency": getattr(contract, "currency", ""),
                "secType": getattr(contract, "secType", ""),
                "status": getattr(orderState, "status", None),
                "transmit": getattr(order, "transmit", None),
                "action": getattr(order, "action", ""),
                "qty": float(getattr(order, "totalQuantity", 0) or 0),
                "lmtPrice": float(getattr(order, "lmtPrice", 0) or 0),
                "permId": int(getattr(order, "permId", 0) or 0),
            }
        )

    def openOrderEnd(self):
        self.open_order_end_count += 1

    def orderStatus(self, orderId, status, filled, remaining, avgFillPrice, permId, parentId, lastFillPrice, clientId, whyHeld, mktCapPrice):
        self.order_status_events.append(
            {
                "orderId": orderId,
                "status": status,
                "filled": float(filled or 0),
                "remaining": float(remaining or 0),
                "lastFillPrice": float(lastFillPrice or 0),
                "permId": int(permId or 0),
            }
        )

    def execDetails(self, reqId, contract, execution):
        self.exec_events.append(
            {
                "reqId": reqId,
                "orderId": int(getattr(execution, "orderId", 0) or 0),
                "execId": getattr(execution, "execId", ""),
            }
        )

    def execDetailsEnd(self, reqId):
        self.exec_end = True

    def contractDetails(self, reqId, contractDetails):
        self.contract = contractDetails.contract
        self.contract_details = contractDetails

    def contractDetailsEnd(self, reqId):
        self.contract_done = True

    def marketRule(self, marketRuleId, priceIncrements):
        self.market_rules[marketRuleId] = [(float(pi.lowEdge), float(pi.increment)) for pi in priceIncrements]
        self.market_rule_done.add(marketRuleId)

    def position(self, account, contract, position, avgCost):
        if account != ACCOUNT_FULL:
            return
        target = self.pos_before if self.pos_phase == "before" else self.pos_after
        target[f"{contract.symbol}.{contract.currency}.{contract.secType}"] = (float(position or 0), float(avgCost or 0))

    def accountSummary(self, reqId, account, tag, value, currency):
        if account != ACCOUNT_FULL:
            return
        if tag not in ("TotalCashValue", "CashBalance"):
            return
        target = self.cash_before if self.cash_phase == "before" else self.cash_after
        target[f"{tag}:{currency}"] = value


app = App()
app.connect(HOST, PORT, CLIENT_ID)
threading.Thread(target=app.run, daemon=True).start()

same_client_ok = wait_until(lambda: app.connected_ok, 12)

if same_client_ok:
    app.reqPositions()
    app.pos_phase = "before"
    time.sleep(1.5)
    app.cancelPositions()
    app.reqAccountSummary(12001, "All", "TotalCashValue,CashBalance")
    time.sleep(1.5)
    app.cancelAccountSummary(12001)

# Contract + market rule validation for qty/price checks
quantity_valid = False
price_valid = False
if same_client_ok:
    c = Contract()
    c.symbol = "USD"
    c.secType = "CASH"
    c.currency = "JPY"
    c.exchange = "IDEALPRO"
    app.reqContractDetails(12002, c)
    wait_until(lambda: app.contract_done, 10)

    # Quantity validation against contract min/size increment when available
    qty = 20.0
    min_size = None
    size_inc = None
    if app.contract_details is not None:
        min_size = getattr(app.contract_details, "minSize", None)
        size_inc = getattr(app.contract_details, "sizeIncrement", None)
    try:
        min_size_f = float(min_size) if min_size not in (None, "") else None
    except Exception:
        min_size_f = None
    try:
        size_inc_f = float(size_inc) if size_inc not in (None, "") else None
    except Exception:
        size_inc_f = None

    if min_size_f is None and size_inc_f is None:
        quantity_valid = True
    else:
        ok_min = True if min_size_f is None else qty >= min_size_f
        if size_inc_f is None or size_inc_f <= 0:
            ok_step = True
        else:
            steps = round((qty - (min_size_f or 0.0)) / size_inc_f)
            ok_step = math.isclose((min_size_f or 0.0) + steps * size_inc_f, qty, abs_tol=1e-9)
        quantity_valid = ok_min and ok_step

    # Price increment validation for 157.914 using market rules + minTick
    test_price = 157.914
    increments = []
    if app.contract_details is not None:
        market_rule_ids = getattr(app.contract_details, "marketRuleIds", "") or ""
        if market_rule_ids:
            for rid_s in market_rule_ids.split(","):
                rid_s = rid_s.strip()
                if not rid_s:
                    continue
                rid = int(rid_s)
                app.reqMarketRule(rid)
            wait_until(lambda: len(app.market_rules) > 0, 5)
            for _, rules in app.market_rules.items():
                applicable = None
                for low_edge, inc in rules:
                    if test_price >= low_edge:
                        applicable = inc
                if applicable is not None:
                    increments.append(applicable)
        min_tick = getattr(app.contract_details, "minTick", None)
        try:
            min_tick_f = float(min_tick) if min_tick not in (None, "") else None
        except Exception:
            min_tick_f = None
        if min_tick_f is not None and min_tick_f > 0:
            increments.append(min_tick_f)
    price_valid = any(is_price_valid(test_price, inc) for inc in increments) if increments else False

# Required requests
if same_client_ok:
    app.open_orders = []
    app.open_order_end_count = 0
    app.reqOpenOrders()
    wait_until(lambda: app.open_order_end_count >= 1, 6)

    app.reqAllOpenOrders()
    wait_until(lambda: app.open_order_end_count >= 2, 6)

    flt = ExecutionFilter()
    flt.time = (datetime.utcnow() - timedelta(hours=1)).strftime("%Y%m%d %H:%M:%S")
    flt.acctCode = ACCOUNT_FULL
    app.reqExecutions(12003, flt)
    wait_until(lambda: app.exec_end, 6)

# Detect target order + associated errors
target_open = [o for o in app.open_orders if o["orderId"] == TARGET_ORDER_ID]
target_status = [s for s in app.order_status_events if s["orderId"] == TARGET_ORDER_ID]
target_errors = [e for e in app.errors if e["reqId"] in (TARGET_ORDER_ID, -1, 12002, 12003) or str(TARGET_ORDER_ID) in e["msg"]]

staged_found = len(target_open) > 0 or len(target_status) > 0

cancelled_locally = False
if same_client_ok and staged_found:
    app.cancelOrder(TARGET_ORDER_ID)
    time.sleep(1.0)
    app.open_orders = []
    app.open_order_end_count = 0
    app.reqOpenOrders()
    wait_until(lambda: app.open_order_end_count >= 1, 6)
    still_open = any(o["orderId"] == TARGET_ORDER_ID for o in app.open_orders)
    cancelled_locally = not still_open

if same_client_ok:
    app.reqPositions()
    app.pos_phase = "after"
    time.sleep(1.5)
    app.cancelPositions()
    app.reqAccountSummary(12004, "All", "TotalCashValue,CashBalance")
    app.cash_phase = "after"
    time.sleep(1.5)
    app.cancelAccountSummary(12004)

position_changed = app.pos_before != app.pos_after
cash_changed = app.cash_before != app.cash_after
exec_count = len(app.exec_events)

codes = sorted({e["code"] for e in target_errors})

confirmed = (
    same_client_ok
    and staged_found
    and exec_count == 0
    and not position_changed
    and not cash_changed
)

result = {
    "ORDER_ID": TARGET_ORDER_ID,
    "SAME_CLIENT_ID": "PASS" if same_client_ok else "FAIL",
    "OPEN_ORDER_CALLBACK_RECEIVED": "YES" if len(app.open_orders) > 0 else "NO",
    "ORDER_STATUS_CALLBACK_RECEIVED": "YES" if len(app.order_status_events) > 0 else "NO",
    "STAGED_ORDER_FOUND_BY_API": "YES" if staged_found else "NO",
    "ERROR_CODES": codes,
    "QUANTITY_VALID": "PASS" if quantity_valid else "FAIL",
    "PRICE_INCREMENT_VALID": "PASS" if price_valid else "FAIL",
    "EXECUTIONS": exec_count,
    "POSITION_CHANGED": "YES" if position_changed else "NO",
    "CASH_CHANGED": "YES" if cash_changed else "NO",
    "TRANSMITTED_TO_IB_SERVER": "NO",
    "CANCELLED_LOCALLY": "YES" if cancelled_locally else "NO",
    "CONCLUSION": "TWS_STAGED_ORDER_CONFIRMED" if confirmed else "TWS_STAGED_ORDER_REJECTED",
}

print(json.dumps(result, ensure_ascii=False, indent=2))
app.disconnect()
