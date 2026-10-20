"""Trusted fixed template executed by DataViz MCP; JSON never becomes source code."""

import html
import json
from pathlib import Path

import panel as pn
from bokeh.layouts import column, row
from bokeh.models import ColumnDataSource, CustomJS, Div, Select, Slider, TextInput
from bokeh.plotting import figure
from bokeh.resources import INLINE

pn.extension()
request = json.loads(Path("request.json").read_text())
data = request["data"]
o = request.get("options", {})
columns = sorted(set().union(*(r.keys() for r in data)))
numeric = [
    key
    for key in columns
    if any(type(r.get(key)) in (int, float) for r in data)
    and all(r.get(key) is None or type(r[key]) in (int, float) for r in data)
]
x = o["x"]
y = o.get("y", x)
if y not in numeric:
    y = x
raw = ColumnDataSource({key: [r.get(key) for r in data] for key in columns})
chart = o.get("chart", "scatter")
selected = sorted(
    [
        (r[x], r.get(y))
        for r in data
        if type(r.get(x)) in (int, float)
        and (chart == "histogram" or type(r.get(y)) in (int, float))
    ],
    key=lambda pair: pair[0],
)
source = ColumnDataSource(
    {"x": [r[0] for r in selected], "y": [r[1] for r in selected]}
)
hist_data = {"left": [], "right": [], "top": []}
if chart == "histogram" and selected:
    lo, hi = selected[0][0], selected[-1][0]
    if lo == hi:
        lo, hi = lo - 0.5, hi + 0.5
    width = (hi - lo) / 20
    counts = [0] * 20
    for value, _ in selected:
        counts[min(19, max(0, int((value - lo) / width)))] += 1
    hist_data = {
        "left": [lo + i * width for i in range(20)],
        "right": [lo + (i + 1) * width for i in range(20)],
        "top": counts,
    }
hist = ColumnDataSource(hist_data)
p = figure(
    width=900,
    height=500,
    title=o.get("title", "他山科研生态 · DataViz MCP"),
    x_axis_label=x,
    y_axis_label=y,
    tools="pan,wheel_zoom,box_zoom,reset,save",
    active_scroll="wheel_zoom",
)
p.x_range.only_visible = True
p.y_range.only_visible = True
points = p.scatter(
    "x",
    "y",
    source=source,
    size=7,
    alpha=0.7,
    color="#3c7c78",
    visible=chart == "scatter",
)
line = p.line(
    "x", "y", source=source, line_width=2, color="#3c7c78", visible=chart == "line"
)
bars = p.quad(
    left="left",
    right="right",
    bottom=0,
    top="top",
    source=hist,
    fill_color="#3c7c78",
    line_color="white",
    visible=chart == "histogram",
)
x_select = Select(title="X 字段", value=x, options=numeric, width=200)
y_select = Select(
    title="Y 字段", value=y, options=numeric, width=200, disabled=chart == "histogram"
)
chart_select = Select(
    title="图型",
    value=o.get("chart", "scatter"),
    options=[("scatter", "散点图"), ("line", "折线图"), ("histogram", "直方图")],
    width=180,
)
search = TextInput(title="全文筛选（各列匹配）", value="", width=350)
bins = Slider(
    title="直方图区间数",
    start=5,
    end=50,
    value=20,
    step=1,
    width=250,
    disabled=chart != "histogram",
)
group_key = o.get("group")
groups = sorted(set(str(r.get(group_key, "")) for r in data))[:100] if group_key else []
group_select = Select(
    title="分组筛选",
    value="__all__",
    options=[("__all__", "全部")] + [(str(i), v) for i, v in enumerate(groups)],
    width=200,
)
status = Div(text=f"{len(selected)} / {len(data)} 行", width=850)
callback = CustomJS(
    args=dict(
        raw=raw,
        source=source,
        hist=hist,
        p=p,
        xaxis=p.xaxis[0],
        yaxis=p.yaxis[0],
        points=points,
        line=line,
        bars=bars,
        xs=x_select,
        ys=y_select,
        cs=chart_select,
        search=search,
        bins=bins,
        gs=group_select,
        status=status,
        group_key=group_key,
        groups=groups,
    ),
    code="""
const d=raw.data, keys=Object.keys(d), n=d[keys[0]].length;
const term=search.value_input.trim().toLocaleLowerCase(), pairs=[];
for(let i=0;i<n;i++) {
  if(term && !keys.some(k=>String(d[k][i]??'').toLocaleLowerCase().includes(term))) continue;
  if(group_key && gs.value!=='__all__' && String(d[group_key][i]??'')!==groups[Number(gs.value)]) continue;
  const x=d[xs.value][i], y=d[ys.value][i];
  if(typeof x!=='number'||!Number.isFinite(x)) continue;
  if(cs.value!=='histogram' && (typeof y!=='number'||!Number.isFinite(y))) continue;
  pairs.push([x,y]);
}
pairs.sort((a,b)=>a[0]-b[0]);
source.data={x:pairs.map(v=>v[0]),y:pairs.map(v=>v[1])}; source.change.emit();
const isHist=cs.value==='histogram';
points.visible=cs.value==='scatter'; line.visible=cs.value==='line'; bars.visible=isHist;
ys.disabled=isHist; bins.disabled=!isHist;
xaxis.axis_label=xs.value; yaxis.axis_label=isHist?'计数':ys.value;
if(isHist && pairs.length) {
  let lo=pairs[0][0],hi=pairs[pairs.length-1][0];
  if(lo===hi){lo-=0.5;hi+=0.5;}
  const size=(hi-lo)/bins.value, top=Array(bins.value).fill(0);
  for(const v of pairs) top[Math.min(bins.value-1,Math.max(0,Math.floor((v[0]-lo)/size)))]++;
  hist.data={left:top.map((_,i)=>lo+i*size),right:top.map((_,i)=>lo+(i+1)*size),top};
} else {hist.data={left:[],right:[],top:[]};}
hist.change.emit(); status.text=String(pairs.length)+' / '+String(n)+' 行（缺失值不参与当前图型）';
// DataRange1d follows the updated sources without resetting user tool state.
""",
)
search.js_on_change("value_input", callback)
for widget in [x_select, y_select, chart_select, bins, group_select]:
    widget.js_on_change("value", callback)
if chart == "histogram":
    p.yaxis[0].axis_label = "计数"
layout = column(
    Div(
        text="<h2>"
        + html.escape(o.get("title", "他山科研生态 · DataViz MCP"))
        + "</h2><p>切换字段、图型，或输入文本筛选数据。所有交互均在当前页面本地执行。</p>"
    ),
    row(x_select, y_select, chart_select),
    row(search, group_select, bins),
    status,
    p,
)
pn.pane.Bokeh(layout).save(
    "output.html", resources=INLINE, title=o.get("title", "DataViz MCP"), embed=False
)
path = Path("output.html")
output = path.read_text()
csp = "default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; worker-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"
output = output.replace(
    "<head>",
    '<head><meta http-equiv="Content-Security-Policy" content="'
    + html.escape(csp, quote=True)
    + '">',
    1,
)
path.write_text(output)
result = {
    "format": "html",
    "summary": {
        "chart": o.get("chart", "scatter"),
        "rows": len(data),
        "columns": columns,
        "numericColumns": numeric,
        "x": x,
        "y": y,
        "group": group_key,
        "renderer": "dataviz_mcp.validation + dataviz_mcp.utils.execute_in_module + Panel/Bokeh",
        "interactive": True,
        "inlineAssets": True,
        "networkAccess": False,
        "groupFilterLimit": 100,
    },
}
