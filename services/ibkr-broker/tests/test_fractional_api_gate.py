import pytest

from app.main import IBKRClient, IBAPI_INFO, MIN_FRACTIONAL_API_VERSION


def test_fractional_qty_detection():
    assert IBKRClient._is_fractional_share_qty(0.1) is True
    assert IBKRClient._is_fractional_share_qty(1.0) is False
    assert IBKRClient._is_fractional_share_qty(2.0) is False


def test_fractional_blocked_when_api_too_old(monkeypatch):
    monkeypatch.setitem(IBAPI_INFO, "fractional_orders_supported", False)
    monkeypatch.setitem(IBAPI_INFO, "server_version", 81)
    with pytest.raises(RuntimeError, match="10285"):
        IBKRClient._assert_fractional_order_allowed(0.1)


def test_fractional_allowed_when_api_current(monkeypatch):
    monkeypatch.setitem(IBAPI_INFO, "fractional_orders_supported", True)
    monkeypatch.setitem(IBAPI_INFO, "server_version", MIN_FRACTIONAL_API_VERSION)
    IBKRClient._assert_fractional_order_allowed(0.1)
