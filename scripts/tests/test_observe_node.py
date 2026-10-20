import importlib.util
from pathlib import Path
from http.server import BaseHTTPRequestHandler, HTTPServer
from socketserver import TCPServer
import threading
import unittest
from unittest.mock import patch
from types import SimpleNamespace

spec = importlib.util.spec_from_file_location("observe_node", Path(__file__).parents[1] / "observe-node.py")
observer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(observer)


class ObservationTests(unittest.TestCase):
    def test_container_probe_uses_private_loopback_and_never_passes_a_secret_argument(self):
        with patch.object(observer.subprocess, "run", return_value=SimpleNamespace(stdout='{"version":1}')) as run:
            result = observer.container_core_snapshot("isolated-core")
            self.assertTrue(result["available"])
            args = run.call_args.args[0]
            self.assertEqual(args[:4], ["docker", "exec", "isolated-core", "node"])
            self.assertIn("http://127.0.0.1:3000/internal/operations", args[-1])
            self.assertIn("process.env.PAPERBANANA_OPERATIONS_TOKEN", args[-1])
            self.assertNotIn("ADMIN_TOKEN", args[-1])
            self.assertNotIn("GATEWAY_TOKEN", args[-1])

    def test_credentials_only_go_to_literal_loopback_without_url_secrets(self):
        self.assertEqual(observer.validate_core_url("http://127.0.0.1:9000/internal/operations"),
                         "http://127.0.0.1:9000/internal/operations")
        for url in ["https://example.com/internal/operations", "http://127.0.0.1/internal/operations?token=secret",
                    "http://key:secret@127.0.0.1/internal/operations", "http://localhost/internal/operations",
                    "http://127.0.0.1/other"]:
            with self.assertRaises(ValueError):
                observer.validate_core_url(url)

    def test_collector_never_follows_redirect_with_transport_credentials(self):
        paths = []

        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):
                paths.append(self.path)
                self.send_response(302)
                self.send_header("Location", "/redirect-target")
                self.end_headers()

            def log_message(self, *args):
                pass

        class LoopbackServer(HTTPServer):
            def server_bind(self):
                TCPServer.server_bind(self)
                self.server_name, self.server_port = self.server_address

        server = LoopbackServer(("127.0.0.1", 0), Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            response = observer.core_snapshot(f"http://127.0.0.1:{server.server_port}/internal/operations",
                                              {"operationsToken": "fixture"})
            self.assertFalse(response["available"])
            self.assertEqual(paths, ["/internal/operations"])
            self.assertNotIn("fixture", str(response))
        finally:
            server.shutdown()
            thread.join()
            server.server_close()


if __name__ == "__main__":
    unittest.main()
