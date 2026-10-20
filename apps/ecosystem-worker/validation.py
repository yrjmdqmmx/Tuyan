"""Small, explicit data contract. No client code, path, URL, or renderer kwargs."""

import base64
import binascii
import math
import re
import struct
import xml.etree.ElementTree as ET

MAX_BODY = 8 * 1024 * 1024
MAX_FILE = 5 * 1024 * 1024
MAX_OUTPUT = 24 * 1024 * 1024
CAMERAS = ("isometric", "top", "front", "right", "left", "back", "bottom")
COLORMAPS = ("Viridis", "Plasma", "Cool to Warm")


class InvalidInput(ValueError):
    pass


def require(condition, message):
    if not condition:
        raise InvalidInput(message)


def text(value, label, limit=128):
    require(
        isinstance(value, str)
        and 0 < len(value) <= limit
        and not any(ord(c) < 32 for c in value),
        f"{label} must be a nonempty string up to {limit} characters.",
    )
    return value


def mesh_bytes(file):
    require(
        isinstance(file, dict) and set(file) == {"name", "base64"},
        "file requires only name and base64.",
    )
    name = text(file["name"], "Filename")
    require(
        not re.search(r"[/\\:]|\.\.", name), "Filename must not contain paths or URLs."
    )
    suffix = "." + name.rsplit(".", 1)[-1].lower()
    require(
        suffix in (".vtk", ".vtu", ".vtp", ".stl"),
        "Supported files: .vtk, .vtu, .vtp, .stl.",
    )
    encoded = file["base64"]
    require(
        isinstance(encoded, str) and len(encoded) <= (MAX_FILE + 2) // 3 * 4,
        "File exceeds 5 MiB.",
    )
    try:
        raw = base64.b64decode(encoded, validate=True)
    except (binascii.Error, ValueError):
        raise InvalidInput("File must contain valid base64.") from None
    require(0 < len(raw) <= MAX_FILE, "File must be between 1 byte and 5 MiB.")
    if suffix in (".vtu", ".vtp"):
        require(
            not re.search(rb"<!|https?://|file://", raw, re.I),
            "XML declarations with entities, external references and URLs are forbidden.",
        )
        try:
            root = ET.fromstring(raw)
        except ET.ParseError:
            raise InvalidInput(
                "Mesh XML is malformed; use an ASCII VTK XML export."
            ) from None
        expected = "PolyData" if suffix == ".vtp" else "UnstructuredGrid"
        require(
            root.tag == "VTKFile" and root.get("type") == expected,
            "Mesh XML type does not match the extension.",
        )
        for node in root.iter():
            require(
                node.tag
                in {
                    "VTKFile",
                    expected,
                    "Piece",
                    "PointData",
                    "CellData",
                    "FieldData",
                    "Points",
                    "Cells",
                    "Verts",
                    "Lines",
                    "Strips",
                    "Polys",
                    "DataArray",
                    "InformationKey",
                    "Value",
                },
                "Unsupported mesh XML element.",
            )
            for key, value in node.attrib.items():
                require(
                    key.lower()
                    not in ("source", "file", "filename", "href", "url", "compressor")
                    and not re.search(r"://|[/\\]", value),
                    "Mesh XML external references and compression are forbidden.",
                )
                if key == "format":
                    require(
                        value == "ascii",
                        "Only ASCII VTK XML arrays are supported; disable compression and appended/binary export.",
                    )
                if key.startswith("NumberOf"):
                    require(
                        value.isdigit() and int(value) <= 1_000_000,
                        "Mesh declared size is too large.",
                    )
    elif suffix == ".vtk":
        try:
            decoded = raw.decode("ascii")
        except UnicodeDecodeError:
            raise InvalidInput(
                "Only legacy ASCII .vtk exports are supported."
            ) from None
        lines = decoded.splitlines()
        require(
            len(lines) >= 4
            and lines[0].lower().startswith("# vtk datafile")
            and lines[2].strip() == "ASCII",
            "Only legacy ASCII .vtk exports are supported.",
        )
        require(
            lines[3].strip() in ("DATASET POLYDATA", "DATASET UNSTRUCTURED_GRID"),
            "Legacy VTK supports POLYDATA and UNSTRUCTURED_GRID only.",
        )
        require(
            not re.search(r"https?://|file://", decoded, re.I),
            "External references are forbidden.",
        )
        for count in re.findall(
            r"(?m)^\s*(?:POINTS|CELLS|POLYGONS|LINES|VERTICES|TRIANGLE_STRIPS|POINT_DATA|CELL_DATA)\s+(\d+)",
            decoded,
        ):
            require(int(count) <= 1_000_000, "Mesh declared size is too large.")
    else:
        binary = (
            len(raw) >= 84 and len(raw) == 84 + struct.unpack("<I", raw[80:84])[0] * 50
        )
        ascii_stl = (
            raw.lstrip().startswith(b"solid")
            and b"endsolid" in raw
            and b"facet normal" in raw
        )
        require(binary or ascii_stl, "STL content is malformed.")
    return suffix, raw


def validate(payload):
    require(
        isinstance(payload, dict)
        and not set(payload) - {"tool", "data", "file", "options"},
        "Request accepts only tool, data, file and options.",
    )
    tool = payload.get("tool")
    require(tool in ("semiotic", "viznoir", "dataviz"), "Unknown visualization tool.")
    options = payload.get("options", {})
    require(isinstance(options, dict), "options must be an object.")
    allowed = (
        {"sample", "field", "camera", "colormap"}
        if tool == "viznoir"
        else {"chart", "x", "y", "group", "title"}
    )
    require(not set(options) - allowed, "Unsupported renderer option.")
    if tool == "viznoir":
        require("data" not in payload, "VizNoir accepts a mesh file or sample only.")
        require(type(options.get("sample", False)) is bool, "sample must be boolean.")
        require(
            bool(options.get("sample")) != ("file" in payload),
            "Choose exactly one mesh file or sample=true.",
        )
        require(
            options.get("camera", "isometric") in CAMERAS, "Unsupported camera preset."
        )
        require(
            options.get("colormap", "Viridis") in COLORMAPS, "Unsupported colormap."
        )
        if "field" in options:
            text(options["field"], "Field", 128)
        if "file" in payload:
            mesh_bytes(payload["file"])
        return payload
    require("file" not in payload, "Tabular tools accept data rows, not mesh files.")
    data = payload.get("data")
    require(
        isinstance(data, list) and 1 <= len(data) <= 5000,
        "Provide between 1 and 5000 data rows.",
    )
    columns = set()
    for row in data:
        require(
            isinstance(row, dict) and 1 <= len(row) <= 40,
            "Each row must have 1 to 40 columns.",
        )
        for key, value in row.items():
            text(key, "Column name", 80)
            require(
                key not in ("__proto__", "constructor", "prototype"),
                "Reserved column name.",
            )
            columns.add(key)
            require(
                value is None or type(value) in (str, int, float),
                "Cells may only be strings, finite numbers or null.",
            )
            if isinstance(value, str):
                require(
                    len(value) <= 2000 and "\x00" not in value,
                    "Cell string exceeds 2000 characters or contains NUL.",
                )
            elif value is not None:
                require(
                    abs(value) <= 1e100 and math.isfinite(value),
                    "Numbers must be finite and at most 1e100 in magnitude.",
                )
    require(len(columns) <= 40, "At most 40 columns across all rows.")
    charts = (
        ("scatter", "line", "bar", "sankey")
        if tool == "semiotic"
        else ("scatter", "line", "histogram")
    )
    chart = options.get("chart", "scatter")
    require(chart in charts, "Unsupported chart type.")
    for key in ("x", "y"):
        if chart == "histogram" and key == "y" and key not in options:
            continue
        require(
            isinstance(options.get(key), str) and options[key] in columns,
            f"{key} must name a data column.",
        )
    if "group" in options:
        require(
            isinstance(options["group"], str) and options["group"] in columns,
            "group must name a data column.",
        )
    if "title" in options:
        text(options["title"], "Title", 160)
    numeric_fields = ["x"] if chart == "histogram" else ["y"]
    if chart in ("scatter", "line"):
        numeric_fields.append("x")
    for field in numeric_fields:
        require(
            any(type(r.get(options[field])) in (int, float) for r in data),
            f"{field} needs at least one numeric value.",
        )
        require(
            all(
                r.get(options[field]) is None or type(r[options[field]]) in (int, float)
                for r in data
            ),
            f"{field} must contain numbers or null; convert text values first.",
        )
    if chart == "sankey":
        require(
            options.get("group") in columns,
            "Sankey requires group as the target column.",
        )
        require(len(data) <= 1000, "Sankey supports at most 1000 edges.")
        graph = {}
        for row in data:
            a, b, value = (
                row.get(options["x"]),
                row.get(options["group"]),
                row.get(options["y"]),
            )
            require(
                isinstance(a, str)
                and isinstance(b, str)
                and len(a) <= 100
                and len(b) <= 100
                and a
                and b,
                "Sankey source and target must be nonempty text up to 100 characters.",
            )
            require(
                type(value) in (float, int) and value > 0,
                "Sankey values must be positive numbers.",
            )
            graph.setdefault(a, set()).add(b)
            graph.setdefault(b, set())
        require(len(graph) <= 100, "Sankey supports at most 100 nodes.")
        remaining = {k: set(v) for k, v in graph.items()}
        while remaining:
            sinks = {k for k, v in remaining.items() if not v}
            require(bool(sinks), "Sankey requires an acyclic graph without self-loops.")
            remaining = {k: v - sinks for k, v in remaining.items() if k not in sinks}
    return payload
