import os
import tempfile
import unittest
from pathlib import Path

from app import order_send_brakes as brakes


class TestOrderSendBrakes(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.mkdtemp(prefix="forgeos-brake-")
        os.environ["FORGEOS_CACHE_DIR"] = self.tmp
        brakes.reset_order_send_brakes_for_tests()

    def tearDown(self) -> None:
        brakes.reset_order_send_brakes_for_tests()
        os.environ.pop("FORGEOS_CACHE_DIR", None)

    def test_symbol_blocked_after_no_ack_same_day(self) -> None:
        brakes.record_place_no_ack("WFC")
        self.assertTrue(brakes.symbol_blocked_for_no_ack_today("WFC"))
        with self.assertRaises(RuntimeError):
            brakes.assert_order_send_allowed(symbol="WFC", transmit=True, what_if=False)

    def test_wfc_storm_stops_after_first_failure(self) -> None:
        """15/10 pattern: repeated WFC every few minutes — broker blocks after first NO_ACK."""
        brakes.record_place_no_ack("WFC")
        for _ in range(5):
            with self.assertRaises(RuntimeError):
                brakes.assert_order_send_allowed(symbol="WFC", transmit=True, what_if=False)

    def test_global_pause_after_four_no_ack_in_window(self) -> None:
        for sym in ("BAC", "BAC", "WFC", "SOFI"):
            brakes.record_place_no_ack(sym)
        paused, reason = brakes.global_pause_active()
        self.assertTrue(paused)
        self.assertIsNotNone(reason)
        with self.assertRaises(RuntimeError):
            brakes.assert_order_send_allowed(symbol="PYPL", transmit=True, what_if=False)

    def test_what_if_bypasses_brakes(self) -> None:
        brakes.record_place_no_ack("WFC")
        brakes.assert_order_send_allowed(symbol="WFC", transmit=True, what_if=True)


if __name__ == "__main__":
    unittest.main()
