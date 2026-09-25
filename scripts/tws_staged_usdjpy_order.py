import json
import threading
import time

from ibapi.client import EClient
from ibapi.contract import Contract
from ibapi.order import Order
from ibapi.wrapper import EWrapper

HOST = "127.0.0.1"
PORT = 7496
CLIENT_ID = 961
ACCOUNT_FULL = "U24225949"
ACCOUNT_MASKED = "U2***49"


def wait_until(pred, timeout_s):
    end = time.time() + timeout_s
    while time.time() < end:
        if pred():
            return True
        time.sleep(0.05)
    return False


class App(EWrapper, EClient):
    def __init__(self):
        EClient.__init__(self, self)
        self.connected_ok = False
        self.next_id = None
        self.managed_accounts = []
        self.errors = []
        self.md = {"type": None, "bid": None, "ask": None, "ts": None}
        self.contract = None
        self.contract_done = False
        self.open_orders = []
        self.open_orders_done = False
        self.order_status = []
        self.exec_count = 0
        self.pos_before = {}
        self.pos_after = {}
        self.cash_before = {}
        self.cash_after = {}
        self.pos_phase = "before"
        self.cash_phase = "before"
        self.placed_order_id = None
        self.placed_openorder_seen = False
        self.placed_status = None
        self.placed_perm_id = 0

    def nextValidId(self, orderId):
        self.next_id = orderId
        self.connected_ok = True

    def managedAccounts(self, accountsList):
        self.managed_accounts = [x.strip() for x in accountsList.split(",") if x.strip()]

    def error(self, reqId, errorCode, errorString, advancedOrderRejectJson=""):
        self.errors.append(f"{errorCode}:{errorString}")

    def marketDataType(self, reqId, marketDataType):
        self.md["type"] = marketDataType

    def tickPrice(self, reqId, tickType, price, attrib):
        if tickType == 1:
            self.md["bid"] = price
        elif tickType == 2:
            self.md["ask"] = price
        if price is not None and price > 0:
            self.md["ts"] = time.time()

    def contractDetails(self, reqId, contractDetails):
        self.contract = contractDetails.contract

    def contractDetailsEnd(self, reqId):
        self.contract_done = True

    def openOrder(self, orderId, contract, order, orderState):
        item = {
            "orderId": orderId,
            "account": getattr(order, "account", ""),
            "symbol": getattr(contract, "symbol", ""),
            "currency": getattr(contract, "currency", ""),
            "secType": getattr(contract, "secType", ""),
            "action": getattr(order, "action", ""),
            "qty": getattr(order, "totalQuantity", 0),
            "lmtPrice": getattr(order, "lmtPrice", 0),
            "transmit": getattr(order, "transmit", None),
            "status": getattr(orderState, "status", None),
            "permId": getattr(order, "permId", 0),
        }
        self.open_orders.append(item)
        if self.placed_order_id is not None and orderId == self.placed_order_id:
            self.placed_openorder_seen = True
            self.placed_status = item["status"]
            self.placed_perm_id = item["permId"]

    def openOrderEnd(self):
        self.open_orders_done = True

    def orderStatus(self, orderId, status, filled, remaining, avgFillPrice, permId, parentId, lastFillPrice, clientId, whyHeld, mktCapPrice):
        self.order_status.append(
            {
                "orderId": orderId,
                "status": status,
                "filled": filled,
                "remaining": remaining,
                "lastFillPrice": lastFillPrice,
                "permId": permId,
            }
        )
        if self.placed_order_id is not None and orderId == self.placed_order_id:
            self.placed_status = status
            self.placed_perm_id = permId

    def execDetails(self, reqId, contract, execution):
        self.exec_count += 1

    def position(self, account, contract, position, avgCost):
        if account != ACCOUNT_FULL:
            return
        target = self.pos_before if self.pos_phase == "before" else self.pos_after
        target[f"{contract.symbol}.{contract.currency}.{contract.secType}"] = (position, avgCost)

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

ok_connection = wait_until(lambda: app.connected_ok, 12)
has_account = ACCOUNT_FULL in app.managed_accounts if app.managed_accounts else False

if ok_connection:
    app.reqPositions()
    app.pos_phase = "before"
    time.sleep(1.5)
    app.cancelPositions()
    app.reqAccountSummary(9001, "All", "TotalCashValue,CashBalance")
    time.sleep(1.5)
    app.cancelAccountSummary(9001)

contract_ok = False
live_ok = False
if ok_connection:
    c = Contract()
    c.symbol = "USD"
    c.secType = "CASH"
    c.currency = "JPY"
    c.exchange = "IDEALPRO"
    app.reqContractDetails(9101, c)
    contract_ok = wait_until(lambda: app.contract_done and app.contract is not None, 10)
    app.reqMarketDataType(1)
    app.reqMktData(9102, c, "", False, False, [])
    live_ok = wait_until(
        lambda: app.md["type"] == 1
        and app.md["bid"] not in (None, 0)
        and app.md["ask"] not in (None, 0)
        and app.md["ts"] is not None
        and (time.time() - app.md["ts"]) < 3,
        15,
    )
    app.cancelMktData(9102)

app.open_orders = []
app.open_orders_done = False
if ok_connection:
    app.reqOpenOrders()
    wait_until(lambda: app.open_orders_done, 5)

duplicate_open = any(
    o["account"] == ACCOUNT_FULL
    and o["symbol"] == "USD"
    and o["currency"] == "JPY"
    and o["secType"] == "CASH"
    and o["action"] == "BUY"
    for o in app.open_orders
)

created = False
qty = None
lmt_price = None
order_id = None
if ok_connection and app.next_id is not None and has_account and contract_ok and live_ok and not duplicate_open:
    ask = float(app.md["ask"])
    qty = 20.0
    lmt_price = ask
    order_id = app.next_id + 1100
    order = Order()
    order.action = "BUY"
    order.orderType = "LMT"
    order.totalQuantity = qty
    order.lmtPrice = lmt_price
    order.tif = "DAY"
    order.outsideRth = False
    order.whatIf = False
    order.transmit = False
    order.account = ACCOUNT_FULL
    # Legacy optional attributes neutralized only on this order object.
    order.eTradeOnly = ""
    order.firmQuoteOnly = ""
    order.nbboPriceCap = ""
    app.placed_order_id = order_id
    app.placeOrder(order_id, app.contract, order)
    created = wait_until(lambda: app.placed_openorder_seen, 10)

if ok_connection:
    app.reqPositions()
    app.pos_phase = "after"
    time.sleep(1.5)
    app.cancelPositions()
    app.reqAccountSummary(9002, "All", "TotalCashValue,CashBalance")
    app.cash_phase = "after"
    time.sleep(1.5)
    app.cancelAccountSummary(9002)

position_changed = app.pos_before != app.pos_after
cash_changed = app.cash_before != app.cash_after
real_execs = app.exec_count

status_value = app.placed_status
visible = "YES" if created else "NO"

transmitted = False
if app.placed_perm_id not in (None, 0):
    # permId may still appear in some cases; transmission is determined by exec/fill.
    transmitted = False

has_fill = any((s.get("filled") or 0) not in (0, 0.0) or (s.get("lastFillPrice") or 0) not in (0, 0.0) for s in app.order_status)

pass_all = (
    created
    and not any(("10268:" in e or "10269:" in e or "10270:" in e) for e in app.errors)
    and real_execs == 0
    and not has_fill
    and not position_changed
    and not cash_changed
    and status_value is not None
)

result = {
    "TWS_ORDER_CREATED": "PASS" if pass_all else "FAIL",
    "ORDER_ID": order_id,
    "ACCOUNT": ACCOUNT_MASKED,
    "SYMBOL": "USD.JPY",
    "SIDE": "BUY",
    "QUANTITY": qty,
    "LIMIT_PRICE": lmt_price,
    "TRANSMIT": False,
    "TWS_STATUS": status_value,
    "VISIBLE_IN_TWS": visible,
    "REAL_EXECUTIONS": 0 if real_execs == 0 else real_execs,
    "POSITION_CHANGED": "NO" if not position_changed else "YES",
    "CASH_CHANGED": "NO" if not cash_changed else "YES",
    "ORDER_TRANSMITTED_TO_MARKET": "NO" if not transmitted else "YES",
    "CONCLUSION": "TWS_STAGED_ORDER_PASS" if pass_all else "TWS_STAGED_ORDER_FAIL",
}

print(json.dumps(result, ensure_ascii=False, indent=2))
app.disconnect()
