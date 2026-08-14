"""Production startup policy for the plot worker authentication token."""

from __future__ import annotations

import os
from typing import MutableMapping, Optional


def _enabled(value: Optional[str]) -> bool:
    return str(value or "").strip().lower() in {"1", "true", "yes", "on"}


def load_worker_token(env: MutableMapping[str, str] = os.environ) -> Optional[str]:
    """Read and remove the worker token before any render child can spawn.

    Production explicitly opts into fail-closed mode with
    ``PLOT_WORKER_REQUIRE_TOKEN=true``. Local development keeps the historical
    open mode unless that flag is set.
    """

    required = _enabled(env.pop("PLOT_WORKER_REQUIRE_TOKEN", None))
    token = str(env.pop("PLOT_WORKER_TOKEN", "")).strip() or None
    if required and (token is None or len(token.encode("utf-8")) < 32):
        raise RuntimeError(
            "PLOT_WORKER_TOKEN is required and must be at least 32 bytes when "
            "PLOT_WORKER_REQUIRE_TOKEN=true"
        )
    return token
