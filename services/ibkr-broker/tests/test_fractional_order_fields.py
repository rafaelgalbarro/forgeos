from ibapi.order import Order

from app.main import IBAPI_INFO, IBKRClient


def test_fractional_buy_sets_cashqty_not_whole_share(monkeypatch):
    monkeypatch.setitem(IBAPI_INFO, "fractional_orders_supported", True)
    monkeypatch.setitem(IBAPI_INFO, "server_version", 170)

    proposal = {
        "symbol": "NVDA",
        "side": "BUY",
        "quantity": 0.429,
        "limit_price": 200.0,
        "currency": "USD",
        "sec_type": "STK",
        "fractional": True,
        "cash_qty_usd": 85.8,
        "bracket": False,
    }
    order = Order()
    meta = IBKRClient._apply_us_stock_order_size(order, proposal, 0.429, 200.0, leg="parent")

    assert meta["mode"] == "cashQty"
    assert float(order.totalQuantity) == 0
    assert float(order.cashQty) == 85.8
    assert order.totalQuantity != 1


def test_whole_share_when_not_fractional(monkeypatch):
    monkeypatch.setitem(IBAPI_INFO, "fractional_orders_supported", False)
    proposal = {
        "side": "BUY",
        "quantity": 1.0,
        "limit_price": 50.0,
        "currency": "USD",
        "fractional": False,
    }
    order = Order()
    meta = IBKRClient._apply_us_stock_order_size(order, proposal, 1.0, 50.0)
    assert meta["mode"] == "whole"
    assert float(order.totalQuantity) == 1.0
