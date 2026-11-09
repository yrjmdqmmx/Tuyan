"""Private authenticated renderer. Start with exactly one Uvicorn worker."""

import asyncio
import base64
import fcntl
import hmac
from importlib.metadata import PackageNotFoundError, version
import json
import os
from pathlib import Path
import shutil
import signal
import sys
import tempfile

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from validation import (
    CAMERAS,
    COLORMAPS,
    InvalidInput,
    MAX_BODY,
    MAX_OUTPUT,
    mesh_bytes,
    validate,
)

BASE = Path(__file__).resolve().parent
TIMEOUT_SECONDS = 75
LOG_LIMIT = 64 * 1024
app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)


class RenderFailure(Exception):
    def __init__(self, status, code, message):
        self.status, self.code, self.message = status, code, message


def error(status, code, message):
    return JSONResponse(
        {"error": {"code": code, "message": message}},
        status_code=status,
        headers={"Cache-Control": "no-store"},
    )


def versions():
    result = {}
    for name in ("viznoir", "vtk", "dataviz-mcp", "panel", "bokeh"):
        try:
            result[name] = version(name)
        except PackageNotFoundError:
            result[name] = None
    try:
        result["semiotic"] = json.loads(
            (BASE / "node/node_modules/semiotic/package.json").read_text()
        )["version"]
    except (OSError, KeyError, ValueError):
        result["semiotic"] = None
    return result


@app.get("/health")
async def health():
    installed = versions()
    ready = (
        bool(os.environ.get("ECOSYSTEM_WORKER_TOKEN"))
        and all(installed.values())
        and bool(shutil.which("node"))
    )
    return JSONResponse(
        {
            "status": "ok" if ready else "unavailable",
            "versions": installed,
            "python": sys.version.split()[0],
            "concurrency": 1,
            "timeoutSeconds": TIMEOUT_SECONDS,
            "viznoir": {"cameras": CAMERAS, "colormaps": COLORMAPS},
        },
        status_code=200 if ready else 503,
    )


def child_env(folder):
    node = shutil.which("node")
    if not node:
        raise RenderFailure(503, "engine_unavailable", "Node renderer is unavailable.")
    # Explicit allowlist: no worker bearer, cloud credentials, proxies, or API keys.
    return {
        "PATH": str(Path(sys.executable).parent)
        + os.pathsep
        + str(Path(node).parent)
        + os.pathsep
        + "/usr/bin:/bin",
        "HOME": str(folder),
        "TMPDIR": str(folder),
        "XDG_CACHE_HOME": str(folder / "cache"),
        "MPLCONFIGDIR": str(folder / "mpl"),
        "NUMBA_CACHE_DIR": str(folder / "numba"),
        "PYTHONDONTWRITEBYTECODE": "1",
        "PYTHONUNBUFFERED": "1",
        "OPENBLAS_NUM_THREADS": "1",
        "OMP_NUM_THREADS": "1",
        "MKL_NUM_THREADS": "1",
        "NUMBA_NUM_THREADS": "1",
        "VECLIB_MAXIMUM_THREADS": "1",
        "ECOSYSTEM_NODE_BIN": node,
        "LANG": "C.UTF-8",
        "LC_ALL": "C.UTF-8",
    }


def terminate_group(process):
    try:
        os.killpg(process.pid, signal.SIGKILL)
    except ProcessLookupError:
        pass


async def supervise(folder, request, command=None):
    proc = await asyncio.create_subprocess_exec(
        *(command or [sys.executable, str(BASE / "child.py")]),
        cwd=folder,
        env=child_env(folder),
        start_new_session=True,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )

    async def drain(stream):
        total = 0
        while part := await stream.read(8192):
            total += len(part)
            if total > LOG_LIMIT:
                raise RenderFailure(
                    422,
                    "renderer_output_limit",
                    "Renderer diagnostics exceeded their limit.",
                )

    async def disconnect():
        while True:
            if request is not None and await request.is_disconnected():
                raise RenderFailure(499, "client_disconnected", "Client disconnected.")
            await asyncio.sleep(0.15)

    jobs = [
        asyncio.create_task(proc.wait()),
        asyncio.create_task(drain(proc.stdout)),
        asyncio.create_task(drain(proc.stderr)),
        asyncio.create_task(disconnect()),
    ]
    try:
        async with asyncio.timeout(TIMEOUT_SECONDS):
            while not jobs[0].done():
                await asyncio.wait(
                    jobs, timeout=0.1, return_when=asyncio.FIRST_EXCEPTION
                )
                for task in jobs[1:]:
                    if task.done() and not task.cancelled() and task.exception():
                        raise task.exception()
            await asyncio.gather(*jobs[1:3])
        return proc.returncode
    except TimeoutError:
        raise RenderFailure(
            504,
            "render_timeout",
            "Rendering exceeded 75 seconds; use a smaller dataset or simpler mesh.",
        ) from None
    finally:
        # Kill the complete group even after success: no grandchildren survive.
        terminate_group(proc)
        for task in jobs:
            if not task.done():
                task.cancel()
        await asyncio.gather(*jobs, return_exceptions=True)

        async def discard(stream):
            while await stream.read(8192):
                pass

        # A full pipe must be drained after SIGKILL before Process.wait can finish.
        await asyncio.wait_for(
            asyncio.gather(discard(proc.stdout), discard(proc.stderr), proc.wait()),
            timeout=3,
        )


async def render_payload(payload, request=None):
    # flock coordinates even an accidentally duplicated process on the same host.
    lock = open(Path(tempfile.gettempdir()) / "tuyan-ecosystem-render.lock", "a")
    try:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise RenderFailure(
                429, "worker_busy", "Renderer is busy; try again shortly."
            ) from None
        with tempfile.TemporaryDirectory(prefix="tuyan-ecosystem-") as temporary:
            folder = Path(temporary)
            safe_request = dict(payload)
            if "file" in payload:
                suffix, raw = mesh_bytes(payload["file"])
                mesh = folder / ("input" + suffix)
                mesh.write_bytes(raw)
                safe_request.pop("file")
                safe_request["_mesh"] = str(mesh)
            (folder / "request.json").write_text(
                json.dumps(safe_request, ensure_ascii=True)
            )
            code = await supervise(folder, request)
            if code:
                message = "Rendering failed; verify input data, field names and mesh encoding."
                detail = folder / "error.json"
                if detail.exists() and detail.stat().st_size <= 1024:
                    try:
                        message = str(json.loads(detail.read_text())["message"])[:240]
                    except (ValueError, KeyError):
                        pass
                raise RenderFailure(422, "render_failed", message)
            result_file = folder / "result.json"
            if not result_file.is_file() or result_file.stat().st_size > 32 * 1024:
                raise RenderFailure(
                    502, "invalid_result", "Renderer returned invalid metadata."
                )
            meta = json.loads(result_file.read_text())
            fmt = meta.get("format")
            expected = {"semiotic": "svg", "viznoir": "png", "dataviz": "html"}[
                payload["tool"]
            ]
            if fmt != expected:
                raise RenderFailure(
                    502, "invalid_result", "Renderer returned an unexpected format."
                )
            output = folder / ("output." + fmt)
            if not output.is_file() or not 0 < output.stat().st_size <= MAX_OUTPUT:
                raise RenderFailure(
                    422, "result_too_large", "Renderer output must not exceed 24 MiB."
                )
            return {
                "tool": payload["tool"],
                "format": fmt,
                "base64": base64.b64encode(output.read_bytes()).decode("ascii"),
                "filename": f"tashan-{payload['tool']}.{fmt}",
                "engineVersion": meta["engineVersion"],
                "summary": meta["summary"],
            }
    finally:
        lock.close()


def reject_constant(_):
    raise ValueError("Nonfinite JSON number")


def unique_keys(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("Duplicate JSON property")
        result[key] = value
    return result


@app.post("/render")
async def render(request: Request):
    token = os.environ.get("ECOSYSTEM_WORKER_TOKEN", "")
    if not token:
        return error(
            503, "not_configured", "Renderer authentication is not configured."
        )
    auth = request.headers.get("authorization", "")
    if not hmac.compare_digest(auth.encode(), ("Bearer " + token).encode()):
        return error(401, "unauthorized", "Renderer authentication failed.")
    if (
        request.headers.get("content-type", "").split(";", 1)[0].strip().lower()
        != "application/json"
    ):
        return error(415, "content_type", "Use application/json.")
    try:
        content = bytearray()
        async for chunk in request.stream():
            content.extend(chunk)
            if len(content) > MAX_BODY:
                return error(413, "body_too_large", "Request exceeds 8 MiB.")
        try:
            payload = json.loads(
                content, parse_constant=reject_constant, object_pairs_hook=unique_keys
            )
        except (ValueError, RecursionError, UnicodeDecodeError):
            return error(
                400,
                "invalid_json",
                "Request must contain strict JSON without duplicate properties or nonfinite numbers.",
            )
        validate(payload)
        result = await render_payload(payload, request)
        return JSONResponse(result, headers={"Cache-Control": "no-store"})
    except InvalidInput as exc:
        return error(400, "invalid_input", str(exc)[:240])
    except RenderFailure as exc:
        return error(exc.status, exc.code, exc.message)
    except (OSError, ValueError, KeyError, TypeError, OverflowError):
        return error(502, "render_failed", "Renderer could not process this request.")
