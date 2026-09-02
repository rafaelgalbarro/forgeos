import json
import importlib.util
from pathlib import Path
import time

ROOT = Path(__file__).resolve().parents[1]
MAIN_PATH = ROOT / "services" / "ibkr-broker" / "app" / "main.py"
spec = importlib.util.spec_from_file_location("ibkr_broker_main", MAIN_PATH)
if spec is None or spec.loader is None:
    raise RuntimeError("No se pudo cargar services/ibkr-broker/app/main.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
ibkr = module.ibkr


def run() -> str:
    try:
        ibkr.connect_gateway()

        # max nominal 25 EUR, conservative 1 EUR ~= 1.2 USD
        quantity = 20.0
        proposal = {
            "symbol": "USD",
            "sec_type": "CASH",
            "currency": "JPY",
            "exchange": "IDEALPRO",
            "side": "BUY",
            "quantity": quantity,
            "limit_price": 157.914,
            "account": "U24225949",
        }
        ibkr.place_limit_order_validated(proposal, transmit=False, what_if=False)
        return "ORDER_ACCEPTED_BY_TWS"
    except Exception:
        return "ORDER_REJECTED"
    finally:
        if ibkr.isConnected():
            ibkr.disconnect()


if __name__ == "__main__":
    print(run())
