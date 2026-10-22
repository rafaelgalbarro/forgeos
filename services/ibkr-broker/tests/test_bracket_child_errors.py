import threading
import unittest

from app.main import IBKRClient, OrderRejectedError, assert_place_ack_accepted


class TestBracketChildErrors(unittest.TestCase):
    def test_child_110_wakes_parent_and_is_reported(self) -> None:
        client = IBKRClient()
        parent, sl = 3000, 3002
        client.place_ack_events[parent] = threading.Event()
        client.place_ack_events[sl] = threading.Event()
        client._bracket_child_parent[sl] = parent
        client.order_context[sl] = {"kind": "BRACKET_SL"}

        client.error(sl, 110, "The price does not conform to the minimum price variation for this contract.")

        self.assertTrue(client.place_ack_events[parent].is_set())
        # placement merges child errors into the parent list (same as main loop)
        client.place_ack_errors.setdefault(parent, []).extend(client.place_ack_errors.pop(sl))
        with self.assertRaises(OrderRejectedError) as ctx:
            assert_place_ack_accepted(client, parent)
        self.assertTrue(ctx.exception.reject_reason.startswith("110 "))


class TestEurAccountRouting(unittest.TestCase):
    def test_eur_account_from_base_currency(self) -> None:
        import os
        os.environ.pop("IBKR_EUR_STOCKS_ACCOUNT_ID", None)
        client = IBKRClient()
        client.account_data = {
            "U24225949": {"NetLiquidation": {"value": "143", "currency": "USD"}},
            "U15513057": {"NetLiquidation": {"value": "368", "currency": "EUR"}},
        }
        self.assertEqual(client._eur_stocks_account(), "U15513057")

    def test_eur_account_env_wins(self) -> None:
        import os
        os.environ["IBKR_EUR_STOCKS_ACCOUNT_ID"] = "U15513057"
        try:
            client = IBKRClient()
            self.assertEqual(client._eur_stocks_account(), "U15513057")
        finally:
            os.environ.pop("IBKR_EUR_STOCKS_ACCOUNT_ID", None)


if __name__ == "__main__":
    unittest.main()
