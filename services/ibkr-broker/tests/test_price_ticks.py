import unittest

from app.price_ticks import normalize_bracket_prices, pick_increment, round_price

# MiFID II style table (liquidity band) as BME returns it via reqMarketRule.
BME_RULE = {
    1: [
        {"lowEdge": 0.0, "increment": 0.0001},
        {"lowEdge": 1.0, "increment": 0.0005},
        {"lowEdge": 5.0, "increment": 0.001},
        {"lowEdge": 10.0, "increment": 0.002},
        {"lowEdge": 20.0, "increment": 0.005},
        {"lowEdge": 50.0, "increment": 0.01},
    ]
}


def _on_tick(value: float, inc: float) -> bool:
    return abs(round(value / inc) * inc - value) < 1e-9


class TestPriceTicks(unittest.TestCase):
    def test_rep_stop_loss_28_574_becomes_valid_bme_tick(self) -> None:
        sl = round_price(28.574, "up", 0.0001, BME_RULE)
        self.assertAlmostEqual(sl, 28.575)
        self.assertTrue(_on_tick(sl, 0.005))

    def test_rep_bracket_conservative_directions(self) -> None:
        out = normalize_bracket_prices(
            side="BUY", entry=29.013, take_profit=29.871, stop_loss=28.574,
            min_tick=0.0001, rules=BME_RULE,
        )
        self.assertAlmostEqual(out["entry"], 29.01)   # never pay more
        self.assertAlmostEqual(out["take_profit"], 29.87)  # exit sooner
        self.assertAlmostEqual(out["stop_loss"], 28.575)   # smaller loss
        for v in out.values():
            self.assertTrue(_on_tick(v, 0.005))

    def test_band_edge(self) -> None:
        self.assertEqual(pick_increment(49.999, None, BME_RULE), pick_increment(20, None, BME_RULE))
        self.assertAlmostEqual(round_price(50.004, "down", None, BME_RULE), 50.0)

    def test_us_penny_tick_and_default(self) -> None:
        self.assertAlmostEqual(round_price(123.456, "down", 0.01, None), 123.45)
        self.assertAlmostEqual(round_price(123.456, "up", None, None), 123.46)

    def test_bracket_order_kept(self) -> None:
        out = normalize_bracket_prices(
            side="BUY", entry=10.003, take_profit=10.004, stop_loss=10.0021,
            min_tick=0.01, rules=None,
        )
        self.assertLess(out["stop_loss"], out["entry"])
        self.assertGreater(out["take_profit"], out["entry"])


if __name__ == "__main__":
    unittest.main()
