"""Real dependency smoke, no mocks or external/model calls."""

import asyncio
import base64
import hashlib
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app import render_payload
from validation import validate


async def main():
    root = Path("smoke-output")
    root.mkdir(exist_ok=True)
    for tool in ["semiotic", "dataviz", "viznoir"]:
        hashes = []
        for revision in [0, 1]:
            options = (
                {"sample": True, "camera": "front" if revision else "isometric"}
                if tool == "viznoir"
                else {
                    "chart": "scatter",
                    "x": "time",
                    "y": "value",
                    "title": "Real smoke",
                }
            )
            payload = {"tool": tool, "options": options}
            if tool != "viznoir":
                payload["data"] = [
                    {"time": 1, "value": 3},
                    {"time": 2, "value": 8 + revision * 9},
                    {"time": 3, "value": 5},
                ]
            result = await render_payload(validate(payload))
            raw = base64.b64decode(result.pop("base64"))
            hashes.append(hashlib.sha256(raw).hexdigest())
            (root / f"{tool}-{revision}.{result['format']}").write_bytes(raw)
            if tool == "dataviz" and revision == 0:
                (root / "dash-test.html").write_bytes(raw)
            print(
                json.dumps(
                    {"tool": tool, "revision": revision, "bytes": len(raw), **result}
                ),
                flush=True,
            )
        assert hashes[0] != hashes[1], tool + " did not change"
        print(tool + " changed-input output differs", flush=True)
    for chart in ["line", "bar", "sankey"]:
        data = [
            {"x": 1, "y": 3, "g": "A"},
            {"x": 2, "y": 8, "g": "A"},
            {"x": 3, "y": 5, "g": "B"},
        ]
        if chart == "sankey":
            data = [
                {"x": "Research", "g": "Validation", "y": 8},
                {"x": "Validation", "g": "Publication", "y": 5},
            ]
        r = await render_payload(
            validate(
                {
                    "tool": "semiotic",
                    "data": data,
                    "options": {"chart": chart, "x": "x", "y": "y", "group": "g"},
                }
            )
        )
        (root / f"semiotic-{chart}.svg").write_bytes(base64.b64decode(r["base64"]))
        print("semiotic " + chart + " passed", flush=True)
    mesh_hashes = []
    for revision in [0, 1]:
        vtk = f"""# vtk DataFile Version 3.0
Synthetic tetrahedron
ASCII
DATASET POLYDATA
POINTS 4 float
0 0 0  1 0 0  0 1 0  0 0 1
POLYGONS 4 16
3 0 2 1
3 0 1 3
3 1 2 3
3 0 3 2
POINT_DATA 4
SCALARS measured float 1
LOOKUP_TABLE default
0 {1 if revision == 0 else 9} 2 4
"""
        r = await render_payload(
            validate(
                {
                    "tool": "viznoir",
                    "file": {
                        "name": "tetra.vtk",
                        "base64": base64.b64encode(vtk.encode()).decode(),
                    },
                    "options": {"field": "measured"},
                }
            )
        )
        raw = base64.b64decode(r["base64"])
        mesh_hashes.append(hashlib.sha256(raw).hexdigest())
        (root / f"viznoir-upload-{revision}.png").write_bytes(raw)
        assert r["summary"]["field"] == "measured" and not r["summary"]["sample"]
    assert mesh_hashes[0] != mesh_hashes[1], (
        "Changed uploaded scalar values did not change PNG"
    )
    print("viznoir uploaded mesh / changed scalar values passed", flush=True)


asyncio.run(main())
