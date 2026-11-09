import asyncio
import base64
import json
import os
from pathlib import Path
import sys

import httpx
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import app as worker
from validation import InvalidInput, mesh_bytes, validate

BASE_PAYLOAD = {
    "tool": "semiotic",
    "data": [{"x": 1, "y": 2}, {"x": 2, "y": 3}],
    "options": {"x": "x", "y": "y"},
}


@pytest.fixture
async def client(monkeypatch):
    monkeypatch.setenv("ECOSYSTEM_WORKER_TOKEN", "test-private-token")
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=worker.app),
        base_url="http://worker",
        headers={"Authorization": "Bearer test-private-token"},
    ) as value:
        yield value


@pytest.mark.asyncio
async def test_auth_before_body_and_health(client):
    response = await client.post(
        "/render", content="not-json", headers={"Authorization": "bad"}
    )
    assert response.status_code == 401
    assert "test-private-token" not in response.text
    health = await client.get("/health")
    assert health.status_code == 200
    assert health.json()["versions"]["viznoir"] == "0.10.1"
    assert health.json()["versions"]["dataviz-mcp"] == "0.3.1"
    assert health.json()["versions"]["semiotic"] == "3.12.1"


@pytest.mark.asyncio
async def test_unconfigured_fails_closed(client, monkeypatch):
    monkeypatch.delenv("ECOSYSTEM_WORKER_TOKEN")
    assert (await client.post("/render", json=BASE_PAYLOAD)).status_code == 503


@pytest.mark.asyncio
async def test_limits_and_strict_json(client):
    assert (
        await client.post(
            "/render",
            content=b" " * (8 * 1024 * 1024 + 1),
            headers={"Content-Type": "application/json"},
        )
    ).status_code == 413
    for raw in [
        '{"tool":"semiotic","tool":"dataviz"}',
        '{"data":NaN}',
        "[[[[",
        '{"data":1e999}',
    ]:
        response = await client.post(
            "/render", content=raw, headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 400
    assert (await client.post("/render", content="{}")).status_code == 415


@pytest.mark.parametrize(
    "change",
    [
        {"python": "import os"},
        {"options": {"x": "x", "y": "y", "code": "print(1)"}},
        {"data": [{"x": True, "y": 2}]},
        {"data": [{"x": float("nan"), "y": 2}]},
        {"data": [{"x": 1, "y": 2, "s": "a" * 2001}]},
        {"data": [{"x": 1, "y": 2}] * 5001},
        {"data": [{str(i): i for i in range(41)}]},
        {"data": [{"__proto__": 1}]},
        {"tool": "dataviz", "file": {"name": "test.vtk", "base64": "eA=="}},
    ],
)
def test_bad_tables(change):
    with pytest.raises(InvalidInput):
        validate({**BASE_PAYLOAD, **change})


@pytest.mark.parametrize(
    "file",
    [
        {"name": "../../secrets.vtu", "base64": "eA=="},
        {"name": "https://site/input.vtk", "base64": "eA=="},
        {"name": "test.exe", "base64": "eA=="},
        {"name": "mesh.stl", "base64": "bad!"},
        {
            "name": "a.vtu",
            "base64": base64.b64encode(
                b'<!DOCTYPE x [<!ENTITY y SYSTEM "file:///secret">]><VTKFile/>'
            ).decode(),
        },
        {
            "name": "a.vtu",
            "base64": base64.b64encode(
                b'<VTKFile type="UnstructuredGrid"><Piece Source="secret.vtu"/></VTKFile>'
            ).decode(),
        },
        {
            "name": "a.vtu",
            "base64": base64.b64encode(
                b'<VTKFile type="UnstructuredGrid"><DataArray format="binary"/></VTKFile>'
            ).decode(),
        },
        {"name": "bad.stl", "base64": base64.b64encode(b"not mesh").decode()},
    ],
)
def test_bad_mesh(file):
    with pytest.raises(InvalidInput):
        mesh_bytes(file)


def test_sankey_cycle_and_values():
    payload = {
        "tool": "semiotic",
        "options": {"chart": "sankey", "x": "a", "group": "b", "y": "v"},
        "data": [{"a": "one", "b": "two", "v": 1}, {"a": "two", "b": "one", "v": 1}],
    }
    with pytest.raises(InvalidInput, match="acyclic"):
        validate(payload)
    payload["data"] = [{"a": "one", "b": "two", "v": -1}]
    with pytest.raises(InvalidInput, match="positive"):
        validate(payload)


def test_child_env_excludes_secrets(tmp_path, monkeypatch):
    monkeypatch.setenv("ECOSYSTEM_WORKER_TOKEN", "never-in-child")
    monkeypatch.setenv("OPENAI_API_KEY", "never-in-child")
    env = worker.child_env(tmp_path)
    assert "ECOSYSTEM_WORKER_TOKEN" not in env and "OPENAI_API_KEY" not in env
    assert "never-in-child" not in str(env)
    assert env["HOME"] == str(tmp_path)


@pytest.mark.asyncio
async def test_timeout_kills_grandchild(tmp_path, monkeypatch):
    monkeypatch.setattr(worker, "TIMEOUT_SECONDS", 0.4)
    program = (
        "import subprocess,time,pathlib; p=subprocess.Popen(['"
        + sys.executable
        + "','-c','import time;time.sleep(30)']); pathlib.Path('pid').write_text(str(p.pid)); time.sleep(30)"
    )
    with pytest.raises(worker.RenderFailure) as exc:
        await worker.supervise(tmp_path, None, [sys.executable, "-c", program])
    assert exc.value.code == "render_timeout"
    pid = int((tmp_path / "pid").read_text())
    import psutil

    for _ in range(20):
        if (
            not psutil.pid_exists(pid)
            or psutil.Process(pid).status() == psutil.STATUS_ZOMBIE
        ):
            break
        await asyncio.sleep(0.05)
    else:
        pytest.fail("grandchild survived timeout")


@pytest.mark.asyncio
async def test_bounded_diagnostics(tmp_path):
    with pytest.raises(worker.RenderFailure) as exc:
        await worker.supervise(
            tmp_path, None, [sys.executable, "-c", "print('x'*1000000)"]
        )
    assert exc.value.code == "renderer_output_limit"


@pytest.mark.asyncio
async def test_disconnect_kills_child(tmp_path):
    class Disconnected:
        async def is_disconnected(self):
            return True

    with pytest.raises(worker.RenderFailure) as exc:
        await worker.supervise(
            tmp_path,
            Disconnected(),
            [sys.executable, "-c", "import time;time.sleep(30)"],
        )
    assert exc.value.code == "client_disconnected"


@pytest.mark.asyncio
async def test_busy_and_temp_cleanup(tmp_path, monkeypatch):
    monkeypatch.setattr(worker.tempfile, "tempdir", str(tmp_path))
    entered = asyncio.Event()
    release = asyncio.Event()

    async def slow(folder, request):
        entered.set()
        await release.wait()
        return 1

    monkeypatch.setattr(worker, "supervise", slow)
    task = asyncio.create_task(worker.render_payload(BASE_PAYLOAD))
    await entered.wait()
    try:
        with pytest.raises(worker.RenderFailure) as exc:
            await worker.render_payload(BASE_PAYLOAD)
        assert exc.value.code == "worker_busy"
    finally:
        release.set()
    with pytest.raises(worker.RenderFailure):
        await task
    assert [p for p in tmp_path.glob("tuyan-ecosystem-*") if p.is_dir()] == []


@pytest.mark.asyncio
async def test_real_semiotic_http(client):
    response = await client.post("/render", json=BASE_PAYLOAD)
    assert response.status_code == 200, response.text
    result = response.json()
    assert "<svg" in base64.b64decode(result["base64"]).decode()
    assert result["summary"]["renderedRows"] == 2


@pytest.mark.asyncio
async def test_real_mesh_parser_rejects_empty():
    content = (
        b"# vtk DataFile Version 3.0\nempty\nASCII\nDATASET POLYDATA\nPOINTS 0 float\n"
    )
    payload = {
        "tool": "viznoir",
        "file": {"name": "empty.vtk", "base64": base64.b64encode(content).decode()},
    }
    with pytest.raises(worker.RenderFailure) as exc:
        await worker.render_payload(validate(payload))
    assert exc.value.code == "render_failed"
    assert (
        "Traceback" not in exc.value.message
        and str(Path.home()) not in exc.value.message
    )
