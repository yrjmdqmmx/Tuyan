# plot-worker

A small, **sandboxed** FastAPI service that renders matplotlib code to a PNG.

It exists because PaperBanana's visualizer/vanilla agents generate matplotlib
**code with an LLM** and then execute it to produce statistical plots (see the
root `agents/visualizer_agent.py` `_execute_plot_code_worker`). Executing
LLM-generated code is a remote-code-execution surface. The root implementation
does a raw `exec(code, {})` in a `ProcessPoolExecutor` with **no** import
restrictions, **no** resource limits, and **no** wall-clock kill. This service
keeps the same render contract but locks the execution down.

## What it is

- `POST /render` runs the supplied matplotlib code in a **hardened child
  process** and returns the figure as base64-encoded **PNG**.
- `GET /health` returns `{ "ok": true, "runtime": "plot-worker" }`.

## /render contract

Request (JSON):

```json
{ "code": "import matplotlib.pyplot as plt\nplt.plot([1,2,3])", "token": "..." }
```

- `code` (string, required): Python source. A leading ```` ```python … ``` ````
  fence is stripped automatically (LLM output convention).
- `token` (string, optional): auth token; may instead be sent as the
  `X-Plot-Worker-Token` header.

Response (always HTTP 200 unless auth/size fails):

```json
{ "ok": true,  "image_base64": "<base64 PNG>" }
{ "ok": false, "error": "ValueError: ..." }
```

`ok: false` with an `error` string is a **normal** outcome (bad code, timeout,
no figure produced). It is returned as HTTP 200 on purpose so the Laf
**critic/revise loop** can read the error and regenerate the code. Auth
failures are `401`; oversized payloads are `413`.

## Environment

| Var | Meaning |
| --- | --- |
| `PLOT_WORKER_TOKEN` | Shared secret. If **set**, every `/render` must present a matching `token` (body) or `X-Plot-Worker-Token` (header), compared in constant time. If **unset**, the service runs in **open mode** (local dev / no-egress-only). **`app.py` reads this once at startup, caches it in a private variable, and then `os.environ.pop()`s it** — so it is gone from the environment the render child would inherit. The token is never forwarded to the child. |
| `PLOT_WORKER_REQUIRE_TOKEN` | Set to `true` in production. Startup then fails unless `PLOT_WORKER_TOKEN` is at least 32 bytes. Local development remains backward compatible when the flag is absent. |
| `MPLBACKEND=Agg` | Headless backend (set in the Dockerfile and re-set in the child's scrubbed env). |
| `MPLCONFIGDIR=/tmp/mpl` | Writable matplotlib cache dir for the non-root user. |

The render child does **not** inherit the parent's environment. It is spawned
with an explicit minimal env (`PATH`, `MPLBACKEND=Agg`, `HOME=/tmp`,
`MPLCONFIGDIR=/tmp/mpl`, `LANG`/`LC_ALL`) and nothing else — see
`render_worker._build_child_env`. Do not put any secret the child should be
allowed to see in these.

Tunables (constants in `render_worker.py`): `WALL_CLOCK_TIMEOUT_S=20`,
`CPU_LIMIT_S=10`, `ADDRESS_SPACE_LIMIT_BYTES=512MB`, `RENDER_DPI=200`.

## Run locally

```bash
pip install -r requirements.txt
PLOT_WORKER_TOKEN=dev-secret uvicorn app:app --host 0.0.0.0 --port 8000

curl -s localhost:8000/health
curl -s localhost:8000/render -H 'content-type: application/json' \
  -d '{"token":"dev-secret","code":"import matplotlib.pyplot as plt\nplt.plot([1,2,3],[3,1,2])"}'
```

## Security model

This service runs **untrusted, LLM-generated code**. Treat it as hostile, and
**assume the in-process Python sandbox WILL be escaped**. CPython is not
designed to safely run hostile code in-process: a security review confirmed an
escape out of the "restricted builtins" via `().__class__.__base__.__subclasses__()`
and via `plt.plot.__globals__["__builtins__"]["__import__"]`, reaching
`subprocess`/`os.system`, reading `/etc/passwd`, and stealing
`os.environ["PLOT_WORKER_TOKEN"]`.

So the restricted builtins are **NOT the boundary**. The boundary is the four
OS/deploy-level layers below — designed so that a *full* Python escape still
yields nothing useful.

### The real boundary

**Layer 1 — Scrubbed, secret-free child environment.** The child that `exec`s
untrusted code is spawned with an **explicit minimal env** built from scratch
(`PATH`, `MPLBACKEND=Agg`, `HOME=/tmp`, `MPLCONFIGDIR=/tmp/mpl`, `LANG`/`LC_ALL`)
and **nothing inherited** from the parent. Independently, `app.py` reads
`PLOT_WORKER_TOKEN` once at startup, caches it privately, and **deletes it from
`os.environ`** so it cannot ride along even by accident. Result: a full escape
that reaches `os.environ` in the child finds an **empty cupboard** — no token,
no DB URL, no cloud creds. There is nothing to exfiltrate. (Implemented in
`render_worker.run_render` — a lock-guarded `os.environ` swap around the spawn —
and `app.py`'s `_PLOT_WORKER_TOKEN`.)

**Layer 2 — Network-egress DENY.** A Kubernetes **NetworkPolicy**
([`networkpolicy.yaml`](./networkpolicy.yaml)) **denies all egress** from the
pod and allows only ingress from the trusted caller. Even if escaped code opens
a real socket, it cannot reach the internet, internal services, or cloud
metadata — so it cannot phone home with anything it scraped. The worker only
needs **inbound** HTTP; it never originates a connection.

**Layer 3 — Read-only rootfs, non-root, dropped capabilities.** Deploy with a
**read-only root filesystem** (`tmpfs` for `/tmp` and `/tmp/mpl`), **non-root**
uid (the image already runs as uid 10001), `allowPrivilegeEscalation: false`,
and **all Linux capabilities dropped**. Escaped code cannot tamper with the
image, persist, or escalate.

**Layer 4 — Resource limits + wall-clock kill.** POSIX `RLIMIT_*` set in the
child cap the blast radius: `RLIMIT_CPU≈10s` (CPU spin dies via `SIGXCPU`),
`RLIMIT_AS≈512MB` (memory bomb killed), `RLIMIT_FSIZE≈16MB` (no large writes),
`RLIMIT_CORE=0`, `RLIMIT_NPROC≈64` where supported (fork-bomb mitigation). The
parent enforces a hard **wall-clock timeout** (~20s) and `terminate()`/`kill()`s
the child if it overruns — catching `sleep()`/blocking that CPU limits miss.
Each job runs in a freshly **`spawn`ed** child (not `fork`) so it inherits no
open sockets / DB handles / FDs from the API process; the child is
`daemon=True` and reports its result over a `Queue`. Rendering goes only to an
in-memory `BytesIO` buffer.

### Defense-in-depth only (NOT the boundary)

The in-process Python restrictions **raise the cost of a casual escape and stop
accidental misuse**, but are explicitly not relied on to contain a hostile
attacker:

- A custom `__builtins__` **whitelist** omits `open`, `eval`, `exec`,
  `compile`, `input`, `breakpoint`, `help`, `exit/quit`.
- A **guarded `__import__`** allows only a plotting allowlist (`matplotlib`,
  `mpl_toolkits`, `numpy`, `pandas`, `math`, `json`, `datetime`, …) and
  hard-denies `os`, `sys`, `socket`, `subprocess`, `ctypes`, `importlib`,
  `pickle`, `threading`, `multiprocessing`, `urllib`/`requests`/`httpx`, `ssl`,
  `io`, `builtins`, `inspect`, etc. — including `from x import os` fromlist
  smuggling.

Treat these as a speed bump, **not a wall**. The wall is layers 1–4.

### Error sanitization

Error strings returned to the caller (`{"ok": false, "error": "..."}`) are
sanitized in `render_worker._sanitize_error`: absolute filesystem paths are
collapsed to `<path>`, long token-like blobs to `<redacted>`, newlines are
stripped, and length is truncated. Tracebacks are never returned in full. This
prevents a crafted exception message from leaking host layout or a secret that
escaped code tried to smuggle out through an error.

### Residual risk

- C-level crashes / segfaults in numpy/matplotlib are contained to the child
  but could be used for DoS within the configured limits.
- `RLIMIT_*` and `terminate/kill` are **POSIX-only**. On non-POSIX hosts only
  the wall-clock timeout applies.
- NetworkPolicy (layer 2) is enforced only by a CNI that supports it (Cilium,
  Calico, …). Verify your CNI; layer 1 (secret-free env) holds regardless.

### Deploy checklist — REQUIRED in any shared environment

The deployment MUST apply all of the following. Layers 1 and 4 ship in the
code/image; layers 2 and 3 are your responsibility at deploy time:

1. **Apply the NetworkPolicy.** `kubectl apply -f networkpolicy.yaml` (adjust
   namespace, `podSelector` labels, and the ingress source to your gateway/Laf).
   Confirm your CNI enforces NetworkPolicy. On the supported Hong Kong
   single-host deployment, use `deploy/hk-single-host/compose.yaml` plus
   `scripts/install-worker-firewall.sh`; the worker joins only the internal
   `172.29.0.0/24` bridge and `DOCKER-USER` rejects worker-initiated traffic.
2. **Run read-only rootfs + non-root + drop capabilities** via the pod's
   `securityContext`, e.g.:

   ```yaml
   securityContext:
     runAsNonRoot: true
     runAsUser: 10001
     allowPrivilegeEscalation: false
     readOnlyRootFilesystem: true
     capabilities:
       drop: ["ALL"]
     seccompProfile:
       type: RuntimeDefault     # stricter custom profile is better
   volumes:
     - name: tmp
       emptyDir: { medium: Memory }    # tmpfs for /tmp + /tmp/mpl
   # mount `tmp` at /tmp (MPLCONFIGDIR=/tmp/mpl) since rootfs is read-only.
   ```

3. **Require `PLOT_WORKER_TOKEN`.** Open mode is for local dev only.
4. Consider **gVisor / Kata** for true kernel isolation if available.

### Why a confirmed escape now yields nothing

The reviewed escape stole `os.environ["PLOT_WORKER_TOKEN"]` and reached the
network. After this redesign:

- The token is **deleted from `os.environ`** in the parent and **never inherited
  by the child** (scrubbed minimal env) — `os.environ` in the child holds no
  secret, so there is nothing to steal.
- Even with a stolen secret (there is none) or scraped file contents, **egress
  is denied** — escaped code cannot send anything anywhere.
- File reads are bounded by a **read-only, non-root, capability-dropped**
  container; CPU/RAM/forks by **RLIMITs**; hangs by the **wall-clock kill**.
- Error messages are **sanitized** so a crafted exception cannot smuggle host
  paths or secrets back through the response.
