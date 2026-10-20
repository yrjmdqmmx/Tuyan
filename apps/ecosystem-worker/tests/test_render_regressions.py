"""Real engine regressions for mesh fields and extreme histogram values."""

import ast
import base64
import html
import json
import math
from pathlib import Path
import re
import shutil
import subprocess
import sys

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app import render_payload, supervise
from validation import validate

WORKER = Path(__file__).resolve().parents[1]
TWO_SCALARS = """# vtk DataFile Version 3.0
Two measured scalar arrays
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
SCALARS pressure float 1
LOOKUP_TABLE default
0 1 2 4
SCALARS temperature float 1
LOOKUP_TABLE default
10 90 20 40
"""


async def render_mesh(content, extension, field=None):
    return await render_payload(
        validate(
            {
                "tool": "viznoir",
                "file": {
                    "name": "two-fields." + extension,
                    "base64": base64.b64encode(content).decode(),
                },
                "options": {"field": field} if field else {},
            }
        )
    )


@pytest.mark.asyncio
@pytest.mark.parametrize("association", ["POINTS", "CELLS"])
async def test_legacy_vtk_selects_second_scalar(association):
    content = TWO_SCALARS.replace(
        "POINT_DATA", "CELL_DATA" if association == "CELLS" else "POINT_DATA"
    ).encode()
    pressure = await render_mesh(content, "vtk", "pressure")
    temperature = await render_mesh(content, "vtk", "temperature")
    summary = temperature["summary"]
    assert summary["availableFields"] == [
        {"name": "pressure", "association": association},
        {"name": "temperature", "association": association},
    ]
    assert summary["field"] == "temperature"
    assert summary["association"] == association
    assert summary["renderer"] == "viznoir.tools.render.render_impl"
    assert not summary["generatedElevation"]
    assert base64.b64decode(temperature["base64"]).startswith(b"\x89PNG\r\n\x1a\n")
    assert pressure["base64"] != temperature["base64"]


@pytest.mark.asyncio
@pytest.mark.parametrize("extension", ["vtp", "vtu", "stl"])
async def test_other_mesh_formats_still_render(tmp_path, extension):
    import vtk

    reader = vtk.vtkGenericDataObjectReader()
    reader.ReadFromInputStringOn()
    reader.SetInputString(TWO_SCALARS)
    reader.ReadAllScalarsOn()
    reader.Update()
    mesh = reader.GetOutput()
    if extension == "vtu":
        append = vtk.vtkAppendFilter()
        append.SetInputData(mesh)
        append.Update()
        mesh = append.GetOutput()
    writer = {
        "vtp": vtk.vtkXMLPolyDataWriter,
        "vtu": vtk.vtkXMLUnstructuredGridWriter,
        "stl": vtk.vtkSTLWriter,
    }[extension]()
    path = tmp_path / ("mesh." + extension)
    writer.SetFileName(str(path))
    writer.SetInputData(mesh)
    if extension == "stl":
        writer.SetFileTypeToASCII()
    else:
        writer.SetDataModeToAscii()
        writer.SetCompressorTypeToNone()
    assert writer.Write() == 1
    field = None if extension == "stl" else "temperature"
    result = await render_mesh(path.read_bytes(), extension, field)
    assert base64.b64decode(result["base64"]).startswith(b"\x89PNG\r\n\x1a\n")
    assert result["summary"]["points"] == result["summary"]["cells"] == 4
    assert result["summary"]["field"] == ("Elevation" if field is None else field)
    assert result["summary"]["generatedElevation"] == (extension == "stl")
    if field:
        assert {item["name"] for item in result["summary"]["availableFields"]} == {
            "pressure",
            "temperature",
        }


@pytest.mark.asyncio
async def test_cell_scalar_wins_over_same_named_point_vector(tmp_path):
    import vtk

    content = (
        TWO_SCALARS.split("POINT_DATA")[0]
        + """POINT_DATA 4
VECTORS pressure float
1 2 3  2 3 4  3 4 5  4 5 6
CELL_DATA 4
SCALARS pressure float 1
LOOKUP_TABLE default
10 90 20 40
"""
    )
    mesh = tmp_path / "input.vtk"
    mesh.write_text(content)
    (tmp_path / "request.json").write_text(
        json.dumps(
            {
                "tool": "viznoir",
                "_mesh": str(mesh),
                "options": {"field": "pressure"},
            }
        )
    )
    assert await supervise(tmp_path, None) == 0
    result = json.loads((tmp_path / "result.json").read_text())
    assert result["summary"]["association"] == "CELLS"
    assert (tmp_path / "output.png").read_bytes().startswith(b"\x89PNG\r\n\x1a\n")
    # Inspect exactly what VizNoir rereads: no same-named point array remains.
    reader = vtk.vtkGenericDataObjectReader()
    reader.SetFileName(str(tmp_path / "normalized.vtk"))
    reader.Update()
    normalized = reader.GetOutput()
    assert normalized.GetPointData().GetNumberOfArrays() == 0
    assert normalized.GetCellData().GetNumberOfArrays() == 1
    scalars = normalized.GetCellData().GetScalars()
    assert scalars.GetName() == "pressure"
    assert [scalars.GetValue(i) for i in range(4)] == [10, 90, 20, 40]


def template_parts():
    tree = ast.parse((WORKER / "dashboard_template.py").read_text())
    function = next(
        node
        for node in tree.body
        if isinstance(node, ast.FunctionDef) and node.name == "histogram_bounds"
    )
    namespace = {"math": math}
    exec(
        compile(ast.Module(body=[function], type_ignores=[]), "<template>", "exec"),
        namespace,
    )
    callback = next(
        node
        for node in ast.walk(tree)
        if isinstance(node, ast.Call)
        and isinstance(node.func, ast.Name)
        and node.func.id == "CustomJS"
    )
    code = ast.literal_eval(
        next(kw.value for kw in callback.keywords if kw.arg == "code")
    )
    return namespace["histogram_bounds"], code


HISTOGRAM_VALUES = [
    [1e20, 1e20],
    [1e100, 1e100],
    [-1e100, -1e100],
    [0, 0],
    [5e-324, 5e-324],
    [5e-324, 1e-323],
    [1e20, math.nextafter(1e20, math.inf)],
    [-1e100, 1e100],
]


@pytest.mark.parametrize("values", HISTOGRAM_VALUES)
def test_histogram_bounds_and_actual_customjs_are_finite(values):
    bounds, code = template_parts()
    for count in (5, 20, 50):
        lo, hi = bounds(min(values), max(values))
        edges = [lo + i * ((hi - lo) / count) for i in range(count + 1)]
        assert all(math.isfinite(edge) for edge in edges)
        assert all(a < b for a, b in zip(edges, edges[1:]))
        assert lo <= min(values) <= max(values) <= hi
    # Execute the shipped callback, including chart selection and filtering,
    # against only the Bokeh model interface it consumes. No copied bin logic.
    harness = r"""
const fs=require('node:fs'), {values,code}=JSON.parse(fs.readFileSync(0,'utf8'));
const raw={data:{x:values}}, source={change:{emit(){}}}, hist={change:{emit(){}}};
const line_source={change:{emit(){}}},row_groups=values.map(()=>0);
const xs={value:'x'},ys={value:'x'},cs={value:'histogram'};
const search={value_input:''},bins={value:20},gs={value:'__all__'};
const points={},line={},bars={},xaxis={},yaxis={},status={},group_key=null;
const run=new Function('raw','source','hist','xs','ys','cs','search','bins','gs',
  'points','line','bars','xaxis','yaxis','status','group_key','row_groups','line_source',code);
const outputs=[];
for(const count of [5,20,50]) {
  bins.value=count;
  run(raw,source,hist,xs,ys,cs,search,bins,gs,points,line,bars,xaxis,yaxis,status,group_key,row_groups,line_source);
  outputs.push(hist.data);
}
process.stdout.write(JSON.stringify(outputs));
"""
    process = subprocess.run(
        [shutil.which("node"), "-e", harness],
        input=json.dumps({"values": values, "code": code}),
        capture_output=True,
        text=True,
        timeout=10,
        check=True,
    )
    for result in json.loads(process.stdout):
        assert sum(result["top"]) == len(values)
        assert all(
            math.isfinite(v) for key in ["left", "right", "top"] for v in result[key]
        )
        assert all(a < b for a, b in zip(result["left"], result["right"]))


def dictionaries(value):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from dictionaries(child)
    elif isinstance(value, list):
        for child in value:
            yield from dictionaries(child)


def html_models(result):
    output = base64.b64decode(result["base64"]).decode()
    documents = [
        json.loads(html.unescape(text))
        for text in re.findall(
            r'<script type="application/json"[^>]*>(.*?)</script>', output, re.S
        )
    ]
    return list(dictionaries(documents))


@pytest.mark.asyncio
@pytest.mark.parametrize("value", [1e20, -1e100])
async def test_real_dataviz_constant_histogram(value):
    result = await render_payload(
        validate(
            {
                "tool": "dataviz",
                "data": [{"x": value}, {"x": value}],
                "options": {"chart": "histogram", "x": "x"},
            }
        )
    )
    histograms = []
    for model in html_models(result):
        if model.get("name") == "ColumnDataSource":
            entries = model.get("attributes", {}).get("data", {}).get("entries", [])
            fields = dict(entries)
            if set(fields) == {"left", "right", "top"}:
                histograms.append(fields)
    assert len(histograms) == 1
    hist = histograms[0]
    assert sum(hist["top"]) == 2
    assert all(math.isfinite(v) for values in hist.values() for v in values)
    assert all(a < b for a, b in zip(hist["left"], hist["right"]))
    assert result["engineVersion"] == "0.3.1"


@pytest.mark.asyncio
async def test_real_dataviz_group_ids_and_separate_lines():
    data = [
        {"x": 0, "y": 1, "dose": 1e-6},
        {"x": 1, "y": 2, "dose": 1e-6},
        {"x": 0, "y": 10, "dose": None},
        {"x": 1, "y": 20, "dose": None},
    ]
    result = await render_payload(
        validate(
            {
                "tool": "dataviz",
                "data": data,
                "options": {"chart": "line", "x": "x", "y": "y", "group": "dose"},
            }
        )
    )
    models = html_models(result)
    line_data = next(
        dict(m["attributes"]["data"]["entries"])
        for m in models
        if m.get("name") == "ColumnDataSource"
        and {k for k, _ in m.get("attributes", {}).get("data", {}).get("entries", [])}
        == {"xs", "ys"}
    )
    assert line_data == {"xs": [[0, 1], [0, 1]], "ys": [[1, 2], [10, 20]]}
    callback = next(m for m in models if m.get("name") == "CustomJS")
    args = dict(callback["attributes"]["args"]["entries"])
    group_menu = next(
        m["attributes"]
        for m in models
        if m.get("name") == "Select"
        and m.get("attributes", {}).get("title") == "分组筛选"
    )
    harness = r"""
const fs=require('node:fs'),input=JSON.parse(fs.readFileSync(0,'utf8'));
const raw={data:{x:input.data.map(r=>r.x),y:input.data.map(r=>r.y),dose:input.data.map(r=>r.dose)}};
const source={change:{emit(){}}},hist={change:{emit(){}}},line_source={change:{emit(){}}};
const xs={value:'x'},ys={value:'y'},cs={value:'line'},search={value_input:''},bins={value:20},gs={value:'__all__'};
const points={},line={},bars={},xaxis={},yaxis={},status={};
const run=new Function('raw','source','hist','xs','ys','cs','search','bins','gs',
 'points','line','bars','xaxis','yaxis','status','group_key','row_groups','line_source',input.code);
const outputs=[];
for(const [id] of input.options) {
  gs.value=id;
  run(raw,source,hist,xs,ys,cs,search,bins,gs,points,line,bars,xaxis,yaxis,status,'dose',input.row_groups,line_source);
  outputs.push({id,status:status.text,line:line_source.data,points:source.data});
}
process.stdout.write(JSON.stringify(outputs));
"""
    process = subprocess.run(
        [shutil.which("node"), "-e", harness],
        input=json.dumps(
            {
                "data": data,
                "code": callback["attributes"]["code"],
                "row_groups": args["row_groups"],
                "options": group_menu["options"],
            }
        ),
        text=True,
        capture_output=True,
        timeout=10,
    )
    assert process.returncode == 0, process.stderr
    outputs = json.loads(process.stdout)
    assert outputs[0]["line"] == line_data
    assert all(result["status"].startswith("2 / 4") for result in outputs[1:])
    assert [result["line"]["ys"] for result in outputs[1:]] == [[[1, 2]], [[10, 20]]]
    assert all(len(result["points"]["x"]) == 2 for result in outputs[1:])
