import json, sqlite3, unittest
from unittest.mock import patch
from services import simswap

class FakeResponse:
    def __init__(self, payload): self.payload = json.dumps(payload).encode("utf-8")
    def __enter__(self): return self
    def __exit__(self, *args): return False
    def read(self, limit=-1): return self.payload[:limit]

class SimSwapTests(unittest.TestCase):
    def test_check_posts_camara_payload_and_returns_boolean(self):
        with patch.object(simswap.urllib.request, "urlopen", return_value=FakeResponse({"swapped": True})) as call:
            result = simswap.check_sim_swap("+27821234567", 24, token="test-token",
                base_url="https://operator.example/camara/sim-swap/v1")
        request = call.call_args.args[0]
        self.assertEqual(request.full_url, "https://operator.example/camara/sim-swap/v1/check")
        self.assertEqual(json.loads(request.data), {"phoneNumber": "+27821234567", "maxAge": 24})
        self.assertTrue(result["swapped"])
        self.assertNotIn("raw", result)

    def test_retrieve_date_posts_phone_number(self):
        with patch.object(simswap.urllib.request, "urlopen", return_value=FakeResponse({"latestSimChange": None})):
            result = simswap.retrieve_sim_swap_date("+27821234567", token="test-token",
                base_url="https://operator.example/v1")
        self.assertIsNone(result["latest_sim_change"])

    def test_validates_number_window_and_provider_url(self):
        with self.assertRaisesRegex(simswap.SimSwapError, "E.164"):
            simswap.check_sim_swap("0821234567", token="x", base_url="https://operator.example")
        with self.assertRaisesRegex(simswap.SimSwapError, "1 through 2400"):
            simswap.check_sim_swap("+27821234567", 2401, token="x", base_url="https://operator.example")
        with self.assertRaisesRegex(simswap.SimSwapError, "HTTPS"):
            simswap.check_sim_swap("+27821234567", token="x", base_url="http://operator.example")

    def test_requires_explicit_credentials_and_base(self):
        with patch.dict("os.environ", {}, clear=True):
            with self.assertRaisesRegex(simswap.SimSwapError, "token is required"):
                simswap.check_sim_swap("+27821234567")

    def test_audit_stores_hmac_fingerprint_not_phone_number(self):
        con = sqlite3.connect(":memory:")
        simswap.init_audit_db(con)
        simswap.persist_check(con, {"phone_number": "+27821234567", "max_age_hours": 24,
            "swapped": False, "queried_at": "2026-11-23T12:00:00+00:00"}, audit_key="a" * 40)
        fingerprint, swapped = con.execute("SELECT phone_fingerprint, swapped FROM sim_swap_check").fetchone()
        self.assertNotIn("+27821234567", fingerprint)
        self.assertEqual(swapped, 0)

if __name__ == "__main__": unittest.main()
