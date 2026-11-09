import MenuSelect from '../components/MenuSelect.jsx';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Box, ChartNoAxesCombined, Download, FlaskConical, Layers3, LoaderCircle, Upload } from 'lucide-react';
import { API_BASE_DEFAULT } from '../config.js';
import { exampleTable, MAX_FILE_BYTES, parseTable, readScientificFile } from './data.js';
import { downloadResult, isolatedHtml, renderEcosystem, RESULT_MIME } from './client.js';

import { ECOSYSTEM_TOOLS } from './catalog.js';
const ICONS = { semiotic: ChartNoAxesCombined, viznoir: Box, dataviz: Layers3 };
const TOOLS = ECOSYSTEM_TOOLS.map(tool => ({ ...tool, icon: ICONS[tool.id] }));

const PREVIEWS = {
  semiotic: new URL('./previews/semiotic.svg', import.meta.url).href,
  viznoir: new URL('./previews/viznoir.png', import.meta.url).href,
  dataviz: new URL('./previews/dataviz.png', import.meta.url).href,
};

export default function ResearchEcosystem({ account = {}, base = API_BASE_DEFAULT, request = renderEcosystem, initialTool = null }) {
  const [selected, setSelected] = useState(() => TOOLS.some(tool => tool.id === initialTool) ? initialTool : null);
  const tool = TOOLS.find(item => item.id === selected);
  return <section className="te-root" aria-label="他山科研生态">
    {!tool ? <>
      <div className="te-intro"><h2>让科研数据，成为看得见的结果</h2><p>精选他山收录的科研工具，在图研中完成可视化与探索。</p></div>
      <div className="te-catalog">{TOOLS.map(({ icon: Icon, ...item }) => <article className={`te-tool te-tool-${item.id}`} key={item.id}>
        <div className="te-tool-preview" aria-hidden="true">
          <div className="te-preview-sheet"><img src={PREVIEWS[item.id]} alt="" width="720" height="440" decoding="async" /></div>
          <span className="te-preview-caption">示例预览</span>
        </div>
        <div className="te-tool-copy"><span className="te-engine"><Icon size={16} strokeWidth={1.6} aria-hidden="true" />{item.engine}</span><h3>{item.name}</h3><p>{item.description}</p><div className="te-formats"><span>{item.input}</span><ArrowRight size={13} aria-hidden="true" /><span>{item.output}</span></div></div>
        <button type="button" className="te-open" onClick={() => setSelected(item.id)} aria-label={`打开${item.name}`}>打开工具<ArrowUpRight size={18} aria-hidden="true" /></button>
      </article>)}</div>
      <p className="te-attribution">工具由原作者开源提供，他山收录，图研适配。各工具保留原项目来源与许可。</p>
    </> : <>
      <div className="te-workbench-header"><button type="button" className="te-back" onClick={() => setSelected(null)}><ArrowLeft size={16} />全部工具</button><nav aria-label="切换科研工具">{TOOLS.map(item => <button type="button" key={item.id} aria-current={selected === item.id ? 'page' : undefined} onClick={() => setSelected(item.id)}>{item.engine}</button>)}</nav></div>
      <div className="te-tool-heading"><div><h2>{tool.name}</h2><p>{tool.description}</p></div><a href={tool.source} target="_blank" rel="noreferrer">项目来源<ArrowUpRight size={14} /></a></div>
      <ToolWorkbench key={`${account.user?.id || 'guest'}:${tool.id}`} tool={tool} account={account} base={base} request={request} />
      <p className="te-attribution"><a href={tool.catalog} target="_blank" rel="noreferrer">他山收录</a><span>·</span><a href={tool.source} target="_blank" rel="noreferrer">{tool.engine} / {tool.license}</a></p>
    </>}
  </section>;
}

function ToolWorkbench({ tool, account, base, request }) {
  const [text, setText] = useState(''), [chart, setChart] = useState('scatter'), [fields, setFields] = useState({});
  const [title, setTitle] = useState(''), [file, setFile] = useState(null), [sample, setSample] = useState(false);
  const [field, setField] = useState(''), [camera, setCamera] = useState('isometric'), [colormap, setColormap] = useState('Viridis');
  const [availableFields, setAvailableFields] = useState([]);
  const [busy, setBusy] = useState(false), [reading, setReading] = useState(false), [error, setError] = useState(''), [result, setResult] = useState(null);
  const [synthetic, setSynthetic] = useState(false), [zoom, setZoom] = useState(100);
  const pending = useRef(null), revision = useRef(0), alive = useRef(true), fileInput = useRef(null);
  const inputId = useId(), spatial = tool.id === 'viznoir';
  useEffect(() => { alive.current = true; return () => { alive.current = false; revision.current++; pending.current?.abort(); }; }, []);
  const table = useMemo(() => { try { return text ? parseTable(text) : null; } catch (e) { return { error: e.message }; } }, [text]);
  const columns = table?.columns || [], numeric = table?.numeric || [];
  const x = fields.x ?? (chart === 'bar' || chart === 'sankey' ? columns[0] : numeric[0]) ?? '';
  const y = fields.y ?? (chart === 'sankey' ? numeric[0] : numeric.find(key => key !== x) || numeric[0]) ?? '';
  const group = fields.group ?? (chart === 'sankey' ? columns.find(key => key !== x && key !== y) || '' : '');
  function edit(fn) { revision.current++; pending.current?.abort(); pending.current = null; setBusy(false); setResult(null); setError(''); fn(); }
  async function upload(event) {
    const picked = event.target.files?.[0]; event.target.value = ''; if (!picked) return;
    edit(() => {}); const current = revision.current; setReading(true);
    try {
      if (!picked.size || picked.size > MAX_FILE_BYTES) throw Error('请选择非空且不超过 5 MiB 的文件。');
      const value = spatial ? await readScientificFile(picked) : await picked.text();
      if (!spatial) parseTable(value);
      if (!alive.current || current !== revision.current) return;
      if (spatial) { setFile(value); setSample(false); setField(''); setAvailableFields([]); } else { setText(value); setFields({}); }
      setSynthetic(false);
    } catch (e) { if (alive.current && current === revision.current) setError(e.message); }
    finally { if (alive.current) setReading(false); }
  }
  function useExample() { edit(() => { setSynthetic(true); if (spatial) { setFile(null); setSample(true); setField(''); setAvailableFields([]); } else { setText(exampleTable(chart)); setFields({}); } }); }
  async function run(event) {
    event.preventDefault(); if (busy || reading) return;
    if (!account.user?.id) { account.onSignIn?.(); return; }
    setError(''); setResult(null);
    try {
      if (spatial && !file && !sample) throw Error('请上传三维文件，或载入示例数据。');
      const data = spatial ? null : parseTable(text);
      if (data && (!x || !y || chart === 'sankey' && !group)) throw Error('请选择所需的数据字段。');
      const payload = spatial ? { tool: tool.id, ...(file ? { file } : {}), options: { sample, ...(field.trim() ? { field: field.trim() } : {}), camera, colormap } }
        : { tool: tool.id, data: data.rows, options: { chart, x, y, ...(group ? { group } : {}), ...(title.trim() ? { title: title.trim() } : {}) } };
      const current = ++revision.current, controller = new AbortController(); pending.current = controller; setBusy(true);
      try {
        const value = await request({ base, userId: account.user.id, payload, signal: controller.signal });
        if (alive.current && revision.current === current) { setResult(value); setZoom(100); if (spatial) setAvailableFields([...new Set((value.summary?.availableFields || []).map(item => item.name))]); }
      } catch (e) { if (alive.current && revision.current === current && e.name !== 'AbortError') setError(e.message || '本次处理未完成，请重试。'); }
      finally { if (alive.current && revision.current === current) { setBusy(false); pending.current = null; } }
    } catch (e) { setError(e.message); }
  }
  const select = (label, name, choices, value, optional = false) => <label className="te-field">{label}<MenuSelect value={value} onChange={event => edit(() => setFields(current => ({ ...current, [name]: event.target.value })))}><option value="">{optional ? '不分组' : '选择字段'}</option>{choices.map(key => <option value={key} key={key}>{key}</option>)}</MenuSelect></label>;
  return <div className="te-workbench">
    <form className="te-input" onSubmit={run}>
      <div className="te-input-title"><h3>{spatial ? '科学数据' : '数据与图表'}</h3><button type="button" onClick={useExample} disabled={reading}>载入示例</button></div>
      <input ref={fileInput} id={inputId} className="te-file-native" type="file" accept={spatial ? '.vtk,.vtu,.vtp,.stl' : '.csv,.tsv,.json'} onChange={upload} tabIndex={-1} />
      <button type="button" className="te-upload" onClick={() => fileInput.current?.click()} disabled={reading}><Upload size={18} /><span>{reading ? '正在读取文件…' : file?.name || `上传 ${spatial ? 'VTK / VTU / VTP / STL' : 'CSV / JSON'}`}</span></button>
      {spatial ? <p className="te-hint">最大 5 MiB；VTK / VTU / VTP 支持无压缩 ASCII，STL 支持文本或二进制。没有数值字段时按高度着色。</p> : <label className="te-field te-data-label">或粘贴表格数据<textarea aria-label="表格数据" value={text} placeholder={'time,response,group\n0,2.1,A\n1,3.4,A'} onChange={event => edit(() => { setText(event.target.value); setFields({}); setSynthetic(false); })} spellCheck={false} /><span className="te-hint">首行为列名，最多 5,000 行、40 列、5 MiB。</span></label>}
      {synthetic && <p className="te-sample-note"><FlaskConical size={14} />当前为合成示例数据，仅用于体验工具。</p>}
      {table?.error && <p className="te-validation" role="status">{table.error}</p>}
      {table?.rows && <details className="te-table-details"><summary>{table.rows.length} 行 · {columns.length} 列 · 查看数据</summary><div className="te-table-scroll"><table><thead><tr>{columns.slice(0, 8).map(key => <th key={key}>{key}</th>)}</tr></thead><tbody>{table.rows.slice(0, 5).map((row, i) => <tr key={i}>{columns.slice(0, 8).map(key => <td key={key}>{String(row[key] ?? '—')}</td>)}</tr>)}</tbody></table></div><p className="te-hint">预览前 5 行、8 列，计算使用全部已载入数据。</p></details>}
      <div className="te-options">
        {spatial ? <>
          <label className="te-field">着色字段{availableFields.length ? <MenuSelect value={field} onChange={event => edit(() => setField(event.target.value))}><option value="">自动选择</option>{availableFields.map(name=><option key={name} value={name}>{name}</option>)}</MenuSelect> : <input value={field} maxLength={128} placeholder="自动选择（可填写字段名称）" onChange={event => edit(() => setField(event.target.value))} />}<span className="te-hint">首次渲染后，可从数据中识别到的字段中选择。</span></label>
          <label className="te-field">视角<MenuSelect value={camera} onChange={event => edit(() => setCamera(event.target.value))}><option value="isometric">等轴测</option><option value="front">正面</option><option value="top">俯视</option><option value="right">右侧</option></MenuSelect></label>
          <label className="te-field">色标<MenuSelect value={colormap} onChange={event => edit(() => setColormap(event.target.value))}><option value="Viridis">Viridis</option><option value="Cool to Warm">冷暖对比</option><option value="Plasma">Plasma</option></MenuSelect></label>
        </> : <>
          <label className="te-field">图表类型<MenuSelect value={chart} onChange={event => edit(() => { setChart(event.target.value); setFields({}); })}><option value="scatter">散点图</option><option value="line">折线图</option>{tool.id === 'semiotic' ? <><option value="bar">柱状图</option><option value="sankey">桑基图</option></> : <option value="histogram">直方图</option>}</MenuSelect></label>
          <div className="te-field-pair">{select(chart === 'sankey' ? '来源字段' : '横轴字段', 'x', chart === 'bar' || chart === 'sankey' ? columns : numeric, x)}{select(chart === 'sankey' ? '流量字段' : '纵轴字段', 'y', numeric, y)}</div>
          {select(chart === 'sankey' ? '目标字段' : '分组字段（可选）', 'group', columns, group, chart !== 'sankey')}
          <label className="te-field">图表标题（可选）<input value={title} maxLength={120} placeholder="为这次结果命名" onChange={event => edit(() => setTitle(event.target.value))} /></label>
        </>}
      </div>
      {error && <p className="te-error" role="alert">{error}</p>}
      <button className="te-submit" type="submit" disabled={busy || reading || !!table?.error}>{busy ? <><LoaderCircle size={17} className="tw-spin" />正在处理…</> : !account.user?.id ? '登录后使用' : spatial ? '开始渲染' : '生成可视化'}</button>
      <p className="te-hint te-retention">结果保留在当前页面，请及时下载。切换工具或离开页面后清空。</p>
    </form>
    <div className="te-output" aria-busy={busy}>
      <div className="te-output-heading"><h3>{result ? '可视化结果' : '结果预览'}</h3>{result && <button type="button" onClick={() => downloadResult(result)}><Download size={16} />下载 {result.format.toUpperCase()}</button>}</div>
      {result ? <ResultView result={result} zoom={zoom} onZoom={setZoom} /> : <div className="te-empty-result">{busy ? <LoaderCircle size={32} className="tw-spin" /> : <tool.icon size={40} strokeWidth={1.3} />}<p>{busy ? '正在处理你的数据' : '从一份数据开始'}</p><span>{busy ? '结果完成后会显示在这里。' : '上传文件或载入示例，选择参数后即可生成。'}</span></div>}
      {result && <p className="te-result-meta">由 {tool.engine}{result.engineVersion ? ` ${result.engineVersion}` : ''} 渲染{synthetic ? ' · 合成示例' : ''}{spatial ? ` · 字段 ${result.summary?.field || '自动'} · 视图用于呈现已有数据` : ''}</p>}
      {result?.summary?.generatedElevation && <p className="te-result-meta">Elevation 由几何位置生成，用于显示高度，不代表实测物理量。</p>}
    </div>
  </div>;
}

function ResultView({ result, zoom, onZoom }) {
  const html = useMemo(() => result.format === 'html' ? isolatedHtml(result) : null, [result]);
  if (html) return <iframe className="te-html-result" title="DataViz 交互数据探索结果" srcDoc={html} sandbox="allow-scripts" referrerPolicy="no-referrer" />;
  return <><div className="te-image-result"><img src={`data:${RESULT_MIME[result.format]};base64,${result.base64}`} alt={`${result.tool} 可视化结果`} style={{ width: `${zoom}%`, maxWidth: 'none' }} /></div><label className="te-zoom">预览缩放<input type="range" min="50" max="200" step="10" value={zoom} onChange={event => onZoom(Number(event.target.value))} />{zoom}%</label></>;
}
