import importlib
import os
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))


class ProductionAuthTests(unittest.TestCase):
    def tearDown(self):
        sys.modules.pop("production_auth", None)

    def test_production_mode_refuses_to_start_without_token(self):
        with patch.dict(
            os.environ,
            {"PLOT_WORKER_REQUIRE_TOKEN": "true"},
            clear=True,
        ):
            with self.assertRaisesRegex(RuntimeError, "PLOT_WORKER_TOKEN is required"):
                importlib.import_module("production_auth").load_worker_token()

    def test_configured_token_is_removed_from_child_environment(self):
        with patch.dict(
            os.environ,
            {
                "PLOT_WORKER_REQUIRE_TOKEN": "true",
                "PLOT_WORKER_TOKEN": "x" * 32,
            },
            clear=True,
        ):
            module = importlib.import_module("production_auth")
            token = module.load_worker_token()
            self.assertNotIn("PLOT_WORKER_TOKEN", os.environ)
            self.assertEqual(token, "x" * 32)


if __name__ == "__main__":
    unittest.main()
