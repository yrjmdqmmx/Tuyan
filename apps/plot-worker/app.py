"""
app.py — FastAPI front end for the sandboxed matplotlib plot worker.

Endpoints:
  POST /render  {code, token}  -> {ok, image_base64 (PNG), error?}
  GET  /health                 -> {ok: true, runtime: "plot-worker"}

Auth:
  If PLOT_WORKER_TOKEN is set in the environment, every /render request MUST
  present a matching token, either as the `X-Plot-Worker-Token` header or as a
  `token` field in the JSON body. Mismatch / missing -> 401. If the env var is
  NOT set, the service runs OPEN (intended only for local dev / a network with
  no egress). The README spells out the deployment expectations.

This process NEVER exec()s the untrusted code itself; it delegates to
render_worker.run_render, which SPAWNS a hardened, secret-free child. See
render_worker.py and README.md for the security model.

SECRET HANDLING: the auth token is read ONCE at import into a private module
variable and then DELETED from os.environ (see _PLOT_WORKER_TOKEN below). The
parent keeps the cached copy for auth; the variable is never forwarded to the
render child. Because it is gone from os.environ, the spawned child cannot
inherit it even in the (locked, but belt-and-suspenders) window in
render_worker.run_render — a full Python escape in the child finds no token to
exfiltrate. The REAL boundary is the scrubbed child env + the no-egress
NetworkPolicy + a read-only / non-root container + resource limits, NOT the
restricted-builtins trick (which is defense-in-depth only).
"""

from __future__ import annotations

import hmac
import os
from typing import Optional

from fastapi import FastAPI, Header
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from production_auth import load_worker_token
from render_worker import run_render, WALL_CLOCK_TIMEOUT_S

app = FastAPI(title="plot-worker", docs_url=None, redoc_url=None, openapi_url=None)

# Reject absurdly large payloads early (DoS guard). ~256 KB of code is plenty.
MAX_CODE_CHARS = 256 * 1024

# Read the auth token ONCE at import, cache it privately, then REMOVE it from
# os.environ. This is the parent's half of boundary layer #1: the secret no
# longer lives in the environment, so the spawned render child (which would
# otherwise inherit os.environ) has nothing to steal even if untrusted code
# fully escapes the in-process sandbox. `None` means open mode (local dev only).
_PLOT_WORKER_TOKEN: Optional[str] = load_worker_token()


class RenderRequest(BaseModel):
    code: str = Field(..., description="Python/matplotlib source to render.")
    token: Optional[str] = Field(None, description="Auth token (alt to header).")


def _check_auth(body_token: Optional[str], header_token: Optional[str]) -> bool:
    """Constant-time compare against the cached token (read from
    PLOT_WORKER_TOKEN at import, then removed from os.environ). If no token was
    configured, auth is disabled (open mode)."""
    expected = _PLOT_WORKER_TOKEN
    if not expected:
        return True  # Open mode — see README security note.
    provided = header_token or body_token or ""
    return hmac.compare_digest(provided, expected)


@app.get("/health")
def health():
    return {"ok": True, "runtime": "plot-worker"}


@app.post("/render")
def render(
    req: RenderRequest,
    x_plot_worker_token: Optional[str] = Header(default=None),
):
    if not _check_auth(req.token, x_plot_worker_token):
        return JSONResponse(status_code=401, content={"ok": False, "error": "unauthorized"})

    if len(req.code) > MAX_CODE_CHARS:
        return JSONResponse(
            status_code=413,
            content={"ok": False, "error": f"code exceeds {MAX_CODE_CHARS} chars"},
        )

    # run_render returns {"ok": True, "image_base64": ...} or
    # {"ok": False, "error": ...}. Both are HTTP 200 so the Laf critic loop can
    # read the error string and revise (errors are an expected outcome, not a
    # transport failure).
    result = run_render(req.code, timeout_s=WALL_CLOCK_TIMEOUT_S)
    return result
