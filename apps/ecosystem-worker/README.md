# 他山科研生态 rendering worker

Private HTTP worker for the Tuyan gateway. It actually invokes three pinned upstream engines:

| Tool | Upstream API | Output |
| --- | --- | --- |
| Semiotic 3.12.1 | `semiotic/server.renderChart` | standalone SVG |
| VizNoir 0.10.1 / VTK 9.7.1 | `viznoir.tools.render.render_impl` with a local `VTKRunner` | 960 × 640 PNG |
| DataViz MCP 0.3.1 | `dataviz_mcp.validation` and `dataviz_mcp.utils.execute_in_module` execute a checked-in template | standalone interactive HTML, Panel 1.9.4 / Bokeh 3.9.2 assets inline |

Upstreams: [Semiotic](https://github.com/nteract/semiotic), [VizNoir](https://github.com/kimimgo/viznoir), [DataViz MCP](https://github.com/SuMayaBee/DataViz-MCP). The published packages and installed source were inspected on 2026-10-20. `requirements.lock` pins every Python transitive dependency with hashes; `node/package-lock.json` pins the Node graph. The nested Node project is deliberately outside the root `apps/*` pnpm workspace package pattern.

DataViz's upstream service executes arbitrary Python and exposes editing/publishing. That server is **not** started here. This adapter invokes the real upstream syntax/import/security/extension validation and module executor on `dashboard_template.py`; it reads client data from a private JSON file. Users cannot supply Python, JavaScript, renderer arguments, local paths, remote URLs, or packages. Dashboard controls are fixed Bokeh CustomJS: numeric X/Y selection, chart switching, full-text filtering, group filtering (first 100 distinct groups), and histogram bin count. The HTML works without a Python server or network connection.

## Run locally

From this directory, with Python 3.12 and Node 24 or later:

```sh
uv venv --python 3.12 .venv
uv pip sync --python .venv/bin/python requirements.lock
npm ci --prefix node --ignore-scripts --no-audit --no-fund
# Set ECOSYSTEM_WORKER_TOKEN through your secret manager or shell environment.
.venv/bin/python -m uvicorn app:app --host 127.0.0.1 --port 8092 --workers 1 --no-access-log
```

`ECOSYSTEM_WORKER_TOKEN` is required; an unset token fails closed. Keep the port private. The gateway authenticates users, checks origin/account ownership and rate limits, then supplies this internal bearer. There is no CORS or browser authentication on the worker.

```sh
uv pip install --python .venv/bin/python -r requirements-test.txt
.venv/bin/python -m pytest -q
.venv/bin/python tests/smoke.py
.venv/bin/python tests/browser_smoke.py
```

`tests/smoke.py` writes real rendered artifacts to ignored `smoke-output/`; it compares changed-input bytes for all three engines, and exercises a real uploaded mesh. The browser smoke launches an isolated headless Chrome (override `CHROME_BIN`), verifies dashboard controls update Bokeh models, and checks there are no page errors or HTTP(S) resource requests. The smoke outputs contain synthetic data only. On macOS, first VTK import may spend tens of seconds in OS dylib signature validation; it can exceed the request timeout on a cold cache. Linux is the supported deployment target; native macOS smoke does not prove the container backend.

## HTTP contract

`GET /health` reports installed package versions, Python version, concurrency and VizNoir enums. It returns 503 for a missing engine/token. Version presence is **not** a live rendering readiness check; perform the real three-engine smoke on each target image.

`POST /render` requires `Authorization: Bearer <ECOSYSTEM_WORKER_TOKEN>` and `Content-Type: application/json`. The entire strict JSON body is at most 8 MiB. Duplicate properties, NaN/Infinity and unknown top-level/options properties are rejected.

```json
{"tool":"semiotic","data":[{"time":1,"value":3,"series":"A"},{"time":2,"value":8,"series":"A"}],"options":{"chart":"line","x":"time","y":"value","group":"series","title":"Measured response"}}
```

```json
{"tool":"dataviz","data":[{"time":1,"value":3},{"time":2,"value":8}],"options":{"chart":"scatter","x":"time","y":"value","title":"Explore response"}}
```

```json
{"tool":"viznoir","options":{"sample":true,"camera":"isometric","colormap":"Viridis"}}
```

For a mesh, replace `sample` with `"file":{"name":"mesh.vtu","base64":"…"}` at the top level. File bytes are at most 5 MiB; original names are validated but never used as filesystem paths. Files are assigned `input.<extension>` within a per-request private temporary directory. No filesystem path or URL input is accepted.

Tabular input is 1–5,000 rows with at most 40 distinct columns. Column names are at most 80 characters. Cells are string (2,000 characters), finite number (magnitude ≤ 1e100), or null; booleans, objects and arrays are rejected. X/Y numeric charts do not coerce strings to numbers. Missing numeric values are omitted and Semiotic reports the count. `title` is at most 160 characters. `group` is an optional column name.

| Tool | Options |
| --- | --- |
| Semiotic | `chart`: `scatter` (default), `line`, `bar`, `sankey`; `x`, `y`, optional `group`, `title` |
| DataViz | `chart`: `scatter` (default), `line`, `histogram`; `x`, `y` (optional for histogram), optional `group`, `title` |
| VizNoir | exactly one of uploaded `file` or `options.sample:true`; optional `field`, `camera`, `colormap` |

Sankey uses `x` = source, `group` = target, `y` = positive flow value. It accepts up to 1,000 edges and 100 nodes, requires nonempty source/target strings up to 100 characters, and rejects cycles/self-loops. Bar charts use the selected category field and numerical value; Semiotic's own aggregation/rendering behavior is retained.

VizNoir cameras: `isometric` (default), `top`, `front`, `right`, `left`, `back`, `bottom`. Colormaps: `Viridis` (default), `Plasma`, `Cool to Warm`. The optional field is an exact scalar-array name, with point/cell association detected from the mesh. Omission selects the first finite scalar array. Geometry without scalar arrays receives a clearly reported, generated `Elevation` field. This is a geometric coordinate gradient, not measured simulation data. The built-in sphere is explicitly a synthetic sample.

Mesh support is deliberately narrower than upstream VizNoir: legacy ASCII `.vtk` POLYDATA / UNSTRUCTURED_GRID, uncompressed ASCII XML `.vtu` / `.vtp`, and ASCII or binary `.stl`. XML entities, references, compressed/binary/appended arrays and all other formats are rejected. Export with ASCII/no compression. Parsed meshes require 1–1,000,000 points and cells, finite coordinate bounds and finite scalar ranges. This is a bounded surface render, not the full upstream CFD/animation/pipeline editor.

Success:

```json
{"tool":"semiotic","format":"svg","base64":"PHN2Zy…","filename":"tashan-semiotic.svg","engineVersion":"3.12.1","summary":{"chart":"line","rows":2,"renderedRows":2,"omittedRows":0,"x":"time","y":"value","group":"series","renderer":"semiotic/server.renderChart"}}
```

`format` is exactly `svg`, `png`, or `html` for Semiotic, VizNoir and DataViz respectively. The artifact limit is 24 MiB **before** base64; the gateway must allow approximately 32 MiB response JSON plus metadata. Output names are assigned by the server. VizNoir summary includes point/cell counts, actual selected field/association, available scalar fields, generated-elevation flag and sample flag. DataViz summary records the real upstream executor, Panel/Bokeh versions, numeric columns, controls and inline/no-network policy.

Errors: `{"error":{"code":"invalid_input","message":"…"}}`. Typical statuses: 400 invalid schema/JSON, 401 invalid bearer, 413 oversized request, 415 wrong content type, 422 invalid mesh/render failure/output limit, 429 renderer busy, 499 client disconnected, 503 missing configuration, 504 75-second timeout. Errors omit secrets and stack traces. Requests/results are not persisted or logged.

## Container boundary

Build with `docker build -t tuyan-ecosystem-worker .`. The image runs as UID/GID 10001, listens on 8092, and supports a read-only root filesystem with writable `/tmp`. Recommended runtime controls: `read_only: true`, `/tmp` tmpfs of 256 MiB or more owned by 10001, `cap_drop: [ALL]`, `no-new-privileges`, memory ≤ 2 GiB, PID limit 96, two CPU cores or fewer, and a private internal network accessible only by the gateway. Do not attach cloud/model credentials or mount source data, Docker sockets or host directories. Use the existing approved sandbox runtime if available. There is no need for GPU or X server; Linux uses Mesa OSMesa.

Each request runs in a fresh subprocess/session with an allowlisted environment that excludes the worker bearer and provider credentials. Only that process is given its temporary data directory. Limits: 75-second wall deadline, 65/70 CPU seconds, 3 GiB Linux virtual address space, 26 MiB maximum individual file, 128 open files, no core dumps, 384 MiB Node heap, 64 KiB per diagnostic stream. The parent checks actual artifact size at 24 MiB. A shared filesystem lock limits concurrency to one and returns busy immediately. The complete process group is killed on completion, timeout, disconnect or cancellation; pipes are drained and temporary inputs/outputs/caches removed. Container memory/tmpfs/PID limits supply aggregate bounds beyond per-process limits. This process control is not a general arbitrary-code sandbox; only trusted fixed templates are executable.

Display HTML in an iframe sandbox with `allow-scripts` **without** `allow-same-origin`. The generated HTML contains a no-network CSP (`connect-src 'none'`, no external scripts/styles, no frames/workers/forms). Bokeh CustomJS needs inline scripts and `unsafe-eval`; this should stay confined to the opaque iframe origin. SVG should use an image preview. Exported HTML includes the user's data and must remain account-scoped at the gateway.

## Verification boundary

Native verification covers actual upstream output for three tools, changed data/output, all Semiotic chart modes, DataViz offline interaction, uploaded VTK, invalid files, strict auth/body/schema, subprocess timeout and descendant cleanup, diagnostic bounds, disconnect handling and concurrency cleanup. No model inference is used. Docker is not started automatically by these tests; Linux image build, OSMesa rendering and runtime resource controls must be checked on a Docker-capable staging host before production publication.
