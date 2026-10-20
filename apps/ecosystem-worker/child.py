"""One disposable process per render, including the real upstream engines."""

import asyncio
import json
import os
from pathlib import Path
import resource
import sys

BASE = Path(__file__).resolve().parent


def limits():
    resource.setrlimit(resource.RLIMIT_CPU, (65, 70))
    resource.setrlimit(resource.RLIMIT_FSIZE, (26 * 1024 * 1024, 26 * 1024 * 1024))
    resource.setrlimit(resource.RLIMIT_NOFILE, (128, 128))
    resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
    if sys.platform == "linux":
        resource.setrlimit(resource.RLIMIT_AS, (3 * 1024**3, 3 * 1024**3))


async def viznoir(request):
    import math
    import vtk
    from viznoir.config import PVConfig
    from viznoir.core.runner import VTKRunner
    from viznoir.core.worker import InProcessExecutor
    from viznoir.engine.readers import read_dataset
    from viznoir.tools.render import render_impl
    from importlib.metadata import version

    o = request.get("options", {})
    sample = o.get("sample", False)
    if sample:
        sphere = vtk.vtkSphereSource()
        sphere.SetThetaResolution(64)
        sphere.SetPhiResolution(48)
        sphere.Update()
        dataset = sphere.GetOutput()
    elif Path(request["_mesh"]).suffix == ".vtk":
        # Legacy readers otherwise load only the first SCALARS declaration.
        # Keep every scalar available for explicit field selection.
        reader = vtk.vtkGenericDataObjectReader()
        reader.SetFileName(request["_mesh"])
        reader.ReadAllScalarsOn()
        reader.Update()
        dataset = reader.GetOutput()
    else:
        dataset = read_dataset(request["_mesh"])
    if (
        not isinstance(dataset, vtk.vtkDataSet)
        or not 0 < dataset.GetNumberOfPoints() <= 1_000_000
        or not 0 < dataset.GetNumberOfCells() <= 1_000_000
    ):
        raise ValueError("Mesh must contain between 1 and 1,000,000 points and cells.")
    if not all(math.isfinite(v) and abs(v) < 1e100 for v in dataset.GetBounds()):
        raise ValueError("Mesh has invalid coordinate bounds.")
    arrays = []
    for association, attrs in [
        ("POINTS", dataset.GetPointData()),
        ("CELLS", dataset.GetCellData()),
    ]:
        for i in range(min(attrs.GetNumberOfArrays(), 100)):
            arr = attrs.GetArray(i)
            if (
                arr
                and arr.GetName()
                and len(arr.GetName()) <= 128
                and arr.GetNumberOfComponents() == 1
                and all(math.isfinite(v) for v in arr.GetRange())
            ):
                arrays.append((arr.GetName(), association))
    generated = not arrays
    if generated:
        elevation = vtk.vtkElevationFilter()
        elevation.SetInputData(dataset)
        bounds = dataset.GetBounds()
        elevation.SetLowPoint(bounds[0], bounds[2], bounds[4])
        elevation.SetHighPoint(bounds[1], bounds[3], bounds[5])
        elevation.Update()
        dataset = elevation.GetOutput()
        arrays = [("Elevation", "POINTS")]
    field = o.get("field", arrays[0][0])
    matching = [v for v in arrays if v[0] == field]
    if not matching:
        raise ValueError(
            "Requested scalar field does not exist; omit field to select automatically."
        )
    association = matching[0][1]
    attrs = dataset.GetPointData() if association == "POINTS" else dataset.GetCellData()
    # VizNoir resolves names point-first, even when association is supplied.
    # Keep only the chosen scalar in the private normalized dataset so a
    # same-named array in the other association cannot silently win.
    chosen = attrs.GetArray(field)
    dataset.GetPointData().Initialize()
    dataset.GetCellData().Initialize()
    attrs.SetScalars(chosen)
    # Normalize to a private, server-named VTK file before the upstream compiler.
    writer = vtk.vtkDataSetWriter()
    writer.SetFileName(str(Path("normalized.vtk").resolve()))
    writer.SetInputData(dataset)
    writer.SetFileTypeToBinary()
    if writer.Write() != 1:
        raise ValueError("Mesh normalization failed.")

    class MainThreadRunner(VTKRunner):
        async def _run_inprocess(self, script, output_dir, timeout):
            # VTK/Cocoa must render on the main thread on macOS. The enclosing
            # disposable process is supervised with a hard timeout on every OS.
            env = {"VIZNOIR_DATA_DIR": str(Path.cwd())}
            if sys.platform == "linux":
                env["VTK_DEFAULT_OPENGL_WINDOW"] = "vtkOSOpenGLRenderWindow"
            return InProcessExecutor().run(script, env, output_dir)

    runner = MainThreadRunner(
        PVConfig(
            data_dir=Path.cwd(),
            output_dir=Path.cwd(),
            default_timeout=65,
            render_backend="cpu",
            vtk_backend="osmesa",
        ),
        mode="local",
    )
    result = await render_impl(
        file_path=str(Path("normalized.vtk").resolve()),
        field_name=field,
        association=association,
        runner=runner,
        camera=o.get("camera", "isometric"),
        colormap=o.get("colormap", "Viridis"),
        width=960,
        height=640,
        output_filename="render.png",
    )
    if not result.image_bytes or not result.image_bytes.startswith(
        b"\x89PNG\r\n\x1a\n"
    ):
        raise ValueError("VizNoir did not return a PNG.")
    Path("output.png").write_bytes(result.image_bytes)
    return {
        "format": "png",
        "engineVersion": version("viznoir"),
        "summary": {
            "points": dataset.GetNumberOfPoints(),
            "cells": dataset.GetNumberOfCells(),
            "field": field,
            "association": association,
            "availableFields": [{"name": a, "association": b} for a, b in arrays],
            "generatedElevation": generated,
            "sample": sample,
            "camera": o.get("camera", "isometric"),
            "colormap": o.get("colormap", "Viridis"),
            "vtkVersion": vtk.vtkVersion.GetVTKVersion(),
            "renderer": "viznoir.tools.render.render_impl",
        },
    }


def dataviz():
    from dataviz_mcp.validation import ast_check, ruff_check, check_packages
    from dataviz_mcp.utils import execute_in_module, validate_extension_availability

    template = (BASE / "dashboard_template.py").read_text()
    if ast_check(template) or check_packages(template):
        raise ValueError("DataViz template validation failed.")
    ruff_check(template)
    validate_extension_availability(template)
    namespace = execute_in_module(template, "tuyan_fixed_dashboard", cleanup=True)
    from importlib.metadata import version

    result = namespace["result"]
    result["engineVersion"] = version("dataviz-mcp")
    result["summary"].update(
        panelVersion=version("panel"), bokehVersion=version("bokeh")
    )
    return result


if __name__ == "__main__":
    limits()
    request = json.loads(Path("request.json").read_text())
    if request["tool"] == "semiotic":
        os.execve(
            os.environ["ECOSYSTEM_NODE_BIN"],
            [
                os.environ["ECOSYSTEM_NODE_BIN"],
                "--max-old-space-size=384",
                "--disable-wasm-trap-handler",
                str(BASE / "node" / "render.mjs"),
            ],
            os.environ,
        )
    try:
        result = (
            asyncio.run(viznoir(request)) if request["tool"] == "viznoir" else dataviz()
        )
        Path("result.json").write_text(json.dumps(result))
    except ValueError as exc:
        # Only bounded messages authored above are exposed by the supervisor.
        allowed = (
            "Mesh must",
            "Mesh has",
            "Requested scalar",
            "Mesh normalization",
            "VizNoir did",
            "DataViz template",
        )
        message = (
            str(exc)
            if str(exc).startswith(allowed)
            else "Rendering failed; verify the input data and fields."
        )
        Path("error.json").write_text(json.dumps({"message": message[:240]}))
        sys.exit(1)
    except Exception:
        Path("error.json").write_text(
            json.dumps(
                {"message": "Rendering failed; verify the input data and fields."}
            )
        )
        sys.exit(1)
