import unittest

from app.order_ids import allocate_consecutive_order_ids


class _FakeClient:
    next_order_id = 2112
    _pending_next_id_event = None

    def ensure_connected(self) -> None:
        return None

    def reqIds(self, _n: int) -> None:
        if self._pending_next_id_event is not None:
            self._pending_next_id_event.set()


class TestConsecutiveOrderIds(unittest.TestCase):
    def test_three_distinct_ids_single_reqids(self) -> None:
        client = _FakeClient()
        ids = allocate_consecutive_order_ids(client, 3)
        self.assertEqual(ids, [2112, 2113, 2114])
        self.assertEqual(client.next_order_id, 2115)


if __name__ == "__main__":
    unittest.main()
