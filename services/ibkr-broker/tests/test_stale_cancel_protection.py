import unittest

from app.main import IBKRClient


class TestStaleCancelKeepsProtection(unittest.TestCase):
    def test_only_old_buy_entries_are_cancelled(self) -> None:
        client = IBKRClient()
        client.ensure_connected = lambda: None
        rows = [
            {"orderId": 1, "action": "BUY", "parentId": 0, "orderType": "LMT", "status": "Submitted", "symbol": "SAN"},
            {"orderId": 2, "action": "SELL", "parentId": 1, "orderType": "LMT", "status": "Submitted", "symbol": "SAN"},
            {"orderId": 3, "action": "SELL", "parentId": 1, "orderType": "STP", "status": "PreSubmitted", "symbol": "SAN"},
            {"orderId": 4, "action": "SELL", "parentId": 0, "orderType": "STP", "status": "PreSubmitted", "symbol": "TEF"},
        ]
        client.open_orders = lambda: rows
        cancelled: list[int] = []
        client.cancel_order = lambda oid: cancelled.append(oid)
        client.presubmitted_seen_at = {1: 0.0, 2: 0.0, 3: 0.0, 4: 0.0}  # all "old"
        out = client.cancel_stale_presubmitted(max_age_seconds=300)
        self.assertEqual(cancelled, [1])
        self.assertEqual(out["count"], 1)


if __name__ == "__main__":
    unittest.main()
