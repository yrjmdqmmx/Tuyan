"""
render_worker.py — sandboxed matplotlib renderer.

This module executes ONE plot job. The untrusted (LLM-generated) code is run
inside a freshly-SPAWNED CHILD PROCESS (see run_render below), never in the
FastAPI worker process.

SECURITY MODEL — read this carefully. The REAL security boundary is NOT the
Python "restricted builtins" trick. CPython cannot safely run hostile code
in-process: a determined attacker WILL escape the builtins whitelist (e.g. via
().__class__.__base__.__subclasses__() or fn.__globals__["__builtins__"]
["__import__"]) and reach the genuine os/subprocess. We assume that escape
happens. The boundary that actually contains the damage is, in order:

  1. SCRUBBED, SECRET-FREE CHILD ENVIRONMENT. The child is spawned with an
     explicit minimal env (PATH, MPLBACKEND=Agg, HOME, MPLCONFIGDIR, LANG)
     and NOTHING else. PLOT_WORKER_TOKEN and every other inherited secret are
     stripped before the child exists. So even a FULL Python escape that
     reaches os.environ finds no secret to exfiltrate — os.environ is empty of
     anything sensitive. This is layer #1 of the boundary and lives in this
     file (run_render) + app.py (which deletes the token from os.environ at
     startup and keeps it only in a private module variable for auth).
  2. CONTAINER NETWORK-EGRESS DENY. The Compose internal bridge and project-scoped
     DOCKER-USER firewall deny worker-initiated connections. Even if escaped code
     reaches a real socket, it cannot reach the internet or internal services,
     so it cannot phone home with whatever it scraped. See README.
  3. READ-ONLY ROOT FILESYSTEM + NON-ROOT UID + DROPPED CAPABILITIES, set at
     deploy time (see README). Escaped code cannot tamper with the image,
     write outside tmpfs, or escalate.
  4. RESOURCE LIMITS (POSIX RLIMIT_CPU / RLIMIT_FSIZE / RLIMIT_NPROC where
     available) cap CPU / file-write / fork blast radius; the container cgroup
     memory limit bounds RSS (RLIMIT_AS is intentionally NOT used — it breaks
     numpy/OpenBLAS, which reserve huge virtual space). The PARENT additionally
     enforces a hard WALL-CLOCK timeout and kills the child if it hangs
     (CPU-limit only fires on CPU time, not on sleep()/blocking I/O).

DEFENSE-IN-DEPTH ONLY (NOT the boundary): the child also forces matplotlib Agg,
runs user code under a restricted __builtins__ whitelist, and uses a guarded
__import__ that allows only a plotting allowlist and denies os/subprocess/etc.
by name. These RAISE THE COST of a casual escape and stop accidental imports,
but they are explicitly NOT relied on to contain a hostile attacker — layers
1–4 are. Do not re-document these as the boundary.

'spawn' (not fork) is used so the child gets a clean interpreter with none of
the parent's open sockets / DB handles / file descriptors.

Residual risk and the full deploy checklist are documented in README.md.
"""

from __future__ import annotations

import base64
import io
import multiprocessing as mp
import os
import queue as _queue
import re
import threading
import time
from typing import Any, Dict, Optional

# Wall-clock timeout the PARENT enforces by killing the child (seconds).
WALL_CLOCK_TIMEOUT_S = 20
# CPU seconds the CHILD is allowed (RLIMIT_CPU). Lower than wall clock so CPU
# spins die first; wall clock is the backstop for sleep()/blocking.
CPU_LIMIT_S = 10
# NOTE: we deliberately do NOT cap RLIMIT_AS. numpy/OpenBLAS reserve a very large
# *virtual* address space (independent of resident RSS), so an RLIMIT_AS cap makes
# the BLAS allocator fail at import ("OpenBLAS: Memory allocation still failed
# after 10 retries"), crashing the render child. The real memory bound is the
# container cgroup memory limit (set at deploy); RLIMIT_CPU + the parent's
# wall-clock kill bound CPU and time, and the child env pins BLAS to one thread.
# Max bytes the child may write to any single file (RLIMIT_FSIZE). We do not
# need disk at all, but matplotlib font caches etc. may touch tmp; keep a
# small allowance rather than 0 so legitimate cache writes do not crash.
FSIZE_LIMIT_BYTES = 16 * 1024 * 1024
# Output DPI for the rendered PNG.
RENDER_DPI = 200

# ---------------------------------------------------------------------------
# SECRET-FREE CHILD ENVIRONMENT (boundary layer #1).
#
# The untrusted child is spawned with ONLY these environment variables and
# nothing inherited from the parent. This is the difference between a Python
# escape stealing PLOT_WORKER_TOKEN (and any other secret in the parent's env)
# vs. finding an empty cupboard. Keep this list minimal: only what matplotlib
# + the interpreter genuinely need to render a PNG headlessly.
#
#   PATH         — so the interpreter / fontconfig can find binaries.
#   MPLBACKEND   — force the headless Agg backend (no display / GUI loop).
#   HOME         — matplotlib/fontconfig look here for caches; point at tmp.
#   MPLCONFIGDIR — explicit writable matplotlib cache dir (tmpfs at deploy).
#   LANG/LC_ALL  — deterministic text rendering; avoids locale warnings.
#
# Deliberately ABSENT: PLOT_WORKER_TOKEN and every other inherited variable.
# PATH is resolved from the live env at spawn time (so the container's real
# PATH is used) but falls back to a safe default.
# ---------------------------------------------------------------------------
_TMP_HOME = "/tmp"
_MPLCONFIGDIR = "/tmp/mpl"


def _build_child_env() -> Dict[str, str]:
    """Construct the explicit, secret-free environment for the child process.

    Built fresh from a tiny allowlist — it never copies the parent's env, so
    no secret can ride along by accident. PATH is taken from the current
    process if present (to respect the container image) but defaults safely.
    """
    return {
        "PATH": os.environ.get("PATH", "/usr/local/bin:/usr/bin:/bin"),
        "MPLBACKEND": "Agg",
        "HOME": _TMP_HOME,
        "MPLCONFIGDIR": _MPLCONFIGDIR,
        "LANG": "C.UTF-8",
        "LC_ALL": "C.UTF-8",
        # Pin BLAS/OpenMP to a single thread. Without this, OpenBLAS (pulled in by
        # numpy, which matplotlib imports) sizes a per-thread memory arena to the
        # host CPU count and fails to allocate ("Memory allocation still failed
        # after 10 retries"), crashing the render child. One thread is plenty for
        # rendering a plot and keeps the footprint small.
        "OPENBLAS_NUM_THREADS": "1",
        "OMP_NUM_THREADS": "1",
        "MKL_NUM_THREADS": "1",
        "NUMEXPR_NUM_THREADS": "1",
        "VECLIB_MAXIMUM_THREADS": "1",
        "OPENBLAS_MAIN_FREE": "1",
    }


# multiprocessing 'spawn' snapshots os.environ at proc.start() time and there
# is no per-Process env kwarg. To hand the child a scrubbed env WITHOUT a race
# against concurrent /render calls (the FastAPI endpoint runs in a threadpool),
# we briefly swap os.environ for the minimal env under this lock, start the
# child, then restore. The lock serialises ONLY the few microseconds of
# start(); rendering itself stays fully concurrent across children.
#
# This is belt-and-suspenders: app.py ALSO deletes PLOT_WORKER_TOKEN from
# os.environ at import, so the token is not present to leak even if this swap
# were somehow bypassed. The swap additionally strips any OTHER secret the
# platform may have injected (DB URLs, cloud creds, etc.).
_SPAWN_ENV_LOCK = threading.Lock()

# ---------------------------------------------------------------------------
# Import allowlist. Anything not matching is rejected by the guard __import__.
# We match on the TOP-LEVEL package name plus an explicit deny list so a
# sneaky "import matplotlib.cbook; matplotlib.cbook.os" style trick still
# cannot reach os via a fresh import.
# ---------------------------------------------------------------------------
_ALLOWED_TOP_LEVEL = {
    "matplotlib",
    "mpl_toolkits",   # matplotlib 3d / axes_grid helpers
    "numpy",
    "pandas",
    "math",
    "cmath",
    "json",
    "datetime",
    "random",
    "statistics",
    "itertools",
    "functools",
    "collections",
    "decimal",
    "fractions",
    "re",
    "string",
    "textwrap",
    "warnings",       # pandas/matplotlib emit warnings on import
}

# Hard deny list — these must NEVER be importable even if some allowed package
# tries to pull them transitively at import time we cannot stop that, but we
# can stop the USER code from naming them directly.
_DENIED_MODULES = {
    "os",
    "sys",
    "socket",
    "subprocess",
    "shutil",
    "pathlib",
    "ctypes",
    "cffi",
    "importlib",
    "imp",
    "pickle",
    "marshal",
    "shelve",
    "multiprocessing",
    "threading",
    "asyncio",
    "signal",
    "resource",
    "pty",
    "fcntl",
    "mmap",
    "tempfile",
    "glob",
    "io",            # block raw file IO via io.open
    "builtins",
    "__builtin__",
    "gc",
    "inspect",
    "code",
    "codeop",
    "runpy",
    "pdb",
    "bdb",
    "trace",
    "http",
    "urllib",
    "urllib2",
    "ftplib",
    "smtplib",
    "telnetlib",
    "requests",
    "httpx",
    "aiohttp",
    "ssl",
    "select",
    "selectors",
    "platform",
    "getpass",
    "pwd",
    "grp",
    "webbrowser",
    "sqlite3",
    "dbm",
}


def _build_guarded_import():
    """Return a restricted __import__ used inside the child's exec globals.

    DEFENSE-IN-DEPTH, NOT A BOUNDARY. This stops accidental and casual imports
    of os/subprocess/socket etc. A determined attacker can still reach the real
    __import__ via attribute walking; that is fine, because the secret-free env
    (layer #1), the no-egress NetworkPolicy (layer #2), the read-only/non-root
    container (layer #3) and the resource limits (layer #4) are what actually
    contain the damage. See the module docstring and README.
    """
    real_import = __import__  # the genuine builtin, captured in the child

    def guarded_import(name, globals=None, locals=None, fromlist=(), level=0):
        top = name.split(".", 1)[0]
        if top in _DENIED_MODULES or name in _DENIED_MODULES:
            raise ImportError(f"import of '{name}' is not permitted in the sandbox")
        if top not in _ALLOWED_TOP_LEVEL:
            raise ImportError(
                f"import of '{name}' is not permitted in the sandbox "
                f"(allowed: {', '.join(sorted(_ALLOWED_TOP_LEVEL))})"
            )
        # Block "from matplotlib import os"-style fromlist smuggling.
        if fromlist:
            for f in fromlist:
                if f in _DENIED_MODULES:
                    raise ImportError(
                        f"import of '{name}.{f}' is not permitted in the sandbox"
                    )
        return real_import(name, globals, locals, fromlist, level)

    return guarded_import


def _build_safe_builtins():
    """A whitelist of harmless builtins; dangerous ones are simply absent.

    DEFENSE-IN-DEPTH, NOT A BOUNDARY. Removing open/eval/exec/etc. raises the
    cost of an escape and stops accidental misuse, but it does NOT make the
    in-process sandbox safe against hostile code — see the module docstring.
    The actual boundary is the scrubbed secret-free env + no egress + read-only
    non-root container + resource limits.
    """
    import builtins as _b

    # Only expose names that cannot be trivially used to escape. Notably
    # ABSENT: open, eval, exec, compile, input, __import__ (we inject a
    # guarded one separately), globals, locals, vars, dir, getattr/setattr
    # are allowed for normal plotting ergonomics but file/exec primitives are
    # not. memoryview/breakpoint/help/exit/quit are omitted.
    allowed_names = [
        "abs", "all", "any", "ascii", "bin", "bool", "bytearray", "bytes",
        "callable", "chr", "complex", "dict", "divmod", "enumerate", "filter",
        "float", "format", "frozenset", "getattr", "hasattr", "hash", "hex",
        "id", "int", "isinstance", "issubclass", "iter", "len", "list", "map",
        "max", "min", "next", "object", "oct", "ord", "pow", "print", "range",
        "repr", "reversed", "round", "set", "setattr", "slice", "sorted",
        "str", "sum", "tuple", "type", "zip", "True", "False", "None",
        # Exceptions so user code can try/except sensibly.
        "Exception", "ValueError", "TypeError", "KeyError", "IndexError",
        "RuntimeError", "ZeroDivisionError", "ArithmeticError",
        "AttributeError", "StopIteration", "NotImplementedError",
        "OverflowError", "FloatingPointError",
    ]
    safe = {}
    for n in allowed_names:
        if hasattr(_b, n):
            safe[n] = getattr(_b, n)
    # Inject the guarded importer so `import numpy` works but `import os` fails.
    safe["__import__"] = _build_guarded_import()
    return safe


def _apply_resource_limits():
    """Apply POSIX resource limits inside the child. No-op on platforms
    (e.g. Windows) where the resource module is unavailable."""
    try:
        import resource  # noqa: F401  (intentionally imported here, in child)
    except Exception:
        return  # Not available (Windows / restricted) — rely on wall clock.

    def _set(which, soft, hard=None):
        if hard is None:
            hard = soft
        try:
            resource.setrlimit(which, (soft, hard))
        except (ValueError, OSError):
            pass  # Best effort; some limits may be unsettable in the sandbox.

    _set(resource.RLIMIT_CPU, CPU_LIMIT_S, CPU_LIMIT_S + 2)
    # RLIMIT_AS intentionally NOT set — see note by ADDRESS_SPACE_LIMIT_BYTES /
    # the removed constant: it breaks numpy/OpenBLAS. Memory is bounded by the
    # container cgroup limit instead.
    _set(resource.RLIMIT_FSIZE, FSIZE_LIMIT_BYTES)
    # No core dumps.
    _set(resource.RLIMIT_CORE, 0)
    # Prevent fork bombs / spawning helper processes where supported.
    if hasattr(resource, "RLIMIT_NPROC"):
        _set(resource.RLIMIT_NPROC, 64)


def _extract_code(code_text: str) -> str:
    """Strip a ```python ...``` fence if present (LLM output convention)."""
    match = re.search(r"```(?:python)?(.*?)```", code_text, re.DOTALL)
    return match.group(1).strip() if match else code_text.strip()


# Patterns scrubbed from error strings before they are returned to the caller,
# so a traceback message can never leak host filesystem layout or a secret that
# escaped code may have managed to embed in an exception. The error string is
# meant only to help the LLM critic loop fix bad *plotting* code, so collapsing
# paths/tokens loses nothing useful.
_ABS_PATH_RE = re.compile(r"(?:/[\w.\-]+){2,}/?")          # /usr/lib/python/...
_LONG_SECRET_RE = re.compile(r"\b[A-Za-z0-9_\-]{24,}\b")    # token-ish blobs
_MAX_ERROR_LEN = 300


def _sanitize_error(name: str, detail: str) -> str:
    """Build a caller-safe error string: '<ExcType>: <sanitized detail>'.

    Strips absolute paths (host layout) and long token-like blobs (secrets),
    truncates length. Never raises — sanitisation failure degrades to the bare
    exception type name.
    """
    try:
        msg = str(detail)
        msg = _ABS_PATH_RE.sub("<path>", msg)
        msg = _LONG_SECRET_RE.sub("<redacted>", msg)
        msg = msg.replace("\n", " ").replace("\r", " ").strip()
        if len(msg) > _MAX_ERROR_LEN:
            msg = msg[:_MAX_ERROR_LEN] + "…"
        return f"{name}: {msg}" if msg else name
    except Exception:
        return name


def _child_render(code_text: str, result_q) -> None:
    """Runs in the CHILD process. Puts a dict on result_q and returns.

    Never raises out of the process: any failure is captured as an error
    string so the caller (and the Core critic loop) can revise the code.
    """
    try:
        _apply_resource_limits()

        # Force headless backend BEFORE pyplot is configured for display.
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt

        plt.close("all")
        plt.rcdefaults()

        code_clean = _extract_code(code_text)

        exec_globals: Dict[str, Any] = {
            "__builtins__": _build_safe_builtins(),
            "__name__": "__plot__",
        }

        # compile/exec of the user code is performed by US here in the already
        # untrusted child. exec/eval/compile are absent from exec_globals, which
        # only makes a *casual* escape harder — it is NOT what keeps us safe.
        # Safety comes from this child having a secret-free env, no network
        # egress, a read-only/non-root container, and resource limits (see the
        # module docstring). We assume hostile code may fully escape this exec.
        compiled = compile(code_clean, "<plot-code>", "exec")
        exec(compiled, exec_globals)  # noqa: S102 — runs in the scrubbed child.

        if not plt.get_fignums():
            result_q.put({"ok": False, "error": "code produced no matplotlib figure"})
            return

        buf = io.BytesIO()
        plt.savefig(buf, format="png", bbox_inches="tight", dpi=RENDER_DPI)
        plt.close("all")
        buf.seek(0)
        b64 = base64.b64encode(buf.read()).decode("utf-8")
        result_q.put({"ok": True, "image_base64": b64})
    except BaseException as e:  # noqa: BLE001 — must never escape the child.
        # Single line, no full traceback; scrub host paths + secret-like blobs.
        result_q.put({"ok": False, "error": _sanitize_error(type(e).__name__, e)})


def run_render(code_text: str, timeout_s: int = WALL_CLOCK_TIMEOUT_S) -> Dict[str, Any]:
    """Render `code_text` in a hardened child process with a wall-clock kill.

    Returns {"ok": True, "image_base64": "..."} or
            {"ok": False, "error": "..."}.
    """
    if not isinstance(code_text, str) or not code_text.strip():
        return {"ok": False, "error": "empty code"}

    # 'spawn' gives a clean interpreter (no inherited file descriptors / state
    # from the API process) — important so untrusted code cannot reach an
    # already-open socket or DB handle from the parent.
    ctx = mp.get_context("spawn")
    result_q = ctx.Queue()
    proc = ctx.Process(target=_child_render, args=(code_text, result_q), daemon=True)

    # BOUNDARY LAYER #1: hand the child a SECRET-FREE env. multiprocessing has
    # no per-Process env kwarg and 'spawn' snapshots os.environ at start() time,
    # so we briefly swap in the minimal env under a lock (the FastAPI endpoint
    # runs in a threadpool, so /render can overlap). The lock only serialises
    # the microseconds of start(); the children then render concurrently.
    #
    # After this swap the child's os.environ contains ONLY _build_child_env()
    # plus whatever the platform's spawn launcher injects — never
    # PLOT_WORKER_TOKEN or any other inherited secret. So a full Python escape
    # that reaches os.environ finds nothing worth stealing.
    child_env = _build_child_env()
    with _SPAWN_ENV_LOCK:
        saved_env = dict(os.environ)
        try:
            os.environ.clear()
            os.environ.update(child_env)
            proc.start()
        finally:
            # Restore the parent's env no matter what — the parent still needs
            # its normal environment (the token already lives only in app.py's
            # private variable, not here).
            os.environ.clear()
            os.environ.update(saved_env)

    # Read the result FIRST (before join). This is critical: a rendered PNG is
    # tens-to-hundreds of KB, larger than the OS pipe buffer behind the Queue.
    # If we joined before draining, the child would block mid-write to the pipe
    # (nobody reading) and we would mis-report a successful render as a hang.
    # Draining here lets the child finish its write and exit cleanly.
    #
    # We poll with short gets rather than one long blocking get so that a child
    # killed early by a signal (RLIMIT_CPU SIGXCPU, cgroup OOM, segfault)
    # is reported promptly instead of after the full wall-clock window. The
    # overall deadline still bounds sleep()/blocking code that RLIMIT_CPU can't
    # catch — that is the wall-clock backstop.
    deadline = time.monotonic() + timeout_s
    result: Optional[Dict[str, Any]] = None
    while True:
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            break
        try:
            result = result_q.get(timeout=min(0.2, remaining))
            break  # got the result
        except _queue.Empty:
            # Nothing yet. If the child has exited, give the queue one short
            # grace get to drain any payload still in flight from the feeder
            # thread, then stop — it died without (fully) reporting.
            if not proc.is_alive():
                try:
                    result = result_q.get(timeout=0.5)
                except (_queue.Empty, Exception):
                    result = None
                break
        except Exception:
            result = None  # Defensive: never let queue internals escape.
            break

    # Reap the child. If it overran (or wedged), terminate then SIGKILL.
    remaining = max(0.0, deadline - time.monotonic())
    proc.join(remaining if result is None else 2)
    timed_out = False
    if proc.is_alive():
        # Still running after the deadline (or after we got a result and gave
        # it 2s to exit). If we never got a result, this is a wall-clock
        # overrun (sleep()/blocking/CPU spin) that we are now force-killing.
        timed_out = result is None
        proc.terminate()
        proc.join(2)
        if proc.is_alive():  # still stuck — SIGKILL.
            proc.kill()
            proc.join(2)

    if result is not None:
        return result

    if timed_out:
        # We force-killed a child that produced nothing within the wall clock.
        return {"ok": False, "error": f"render timed out after {timeout_s}s"}
    if proc.exitcode == 0:
        # Exited cleanly but produced nothing — should not happen; do not claim
        # a timeout. Treat as an empty render.
        return {"ok": False, "error": "render produced no result"}
    # Negative exitcode == killed by signal (e.g. SIGXCPU from RLIMIT_CPU, OOM
    # from the container cgroup, or a C-level segfault in numpy/matplotlib).
    return {"ok": False, "error": f"render process exited abnormally (exitcode={proc.exitcode})"}


if __name__ == "__main__":
    # Tiny self-test: render a trivial plot.
    demo = "import matplotlib.pyplot as plt\nplt.plot([1,2,3],[3,1,2])\nplt.title('demo')\n"
    out = run_render(demo)
    print({"ok": out.get("ok"), "len": len(out.get("image_base64", "")), "err": out.get("error")})
