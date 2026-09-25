import { useEffect, useId, useState } from 'react';
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import { connectorEndpoints } from '@paperbanana/figure-core';

export const TYPE_LABELS = { text: '文字', rect: '矩形', ellipse: '椭圆', line: '线段', arrow: '箭头', panel: '面板', image: '图片' };

function Field({ label, value, onCommit, type = 'text', min, max, step = '0.1', options, suggestions, disabled = false }) {
  const listId = useId();
  const [draft, setDraft] = useState(String(value ?? ''));
  useEffect(() => setDraft(String(value ?? '')), [value]);
  const commit = () => {
    if (draft === String(value ?? '')) return;
    if (type === 'number' && (!Number.isFinite(Number(draft)) || draft.trim() === '')) { setDraft(String(value)); return; }
    onCommit(type === 'number' ? Number(draft) : draft);
  };
  return <label className="field fs-field"><span>{label}</span>{options ? <select value={value ?? ''} disabled={disabled} onChange={(event) => onCommit(event.target.value)}>{options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select> : type === 'textarea' ? <textarea value={draft} disabled={disabled} onChange={(event) => setDraft(event.target.value)} onBlur={commit} rows={4} /> : <input type={type} value={draft} disabled={disabled} min={min} max={max} step={step} list={suggestions ? listId : undefined} onChange={(event) => setDraft(event.target.value)} onBlur={commit} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} />}{suggestions && <datalist id={listId}>{suggestions.map((suggestion) => <option value={suggestion} key={suggestion} />)}</datalist>}</label>;
}

export default function Inspector({ document, selectedId, onCommands, onDelete }) {
  const element = document.elements.find((item) => item.id === selectedId);
  const patch = (key, value) => onCommands([{ type: 'update', id: element.id, patch: { [key]: value } }]);
  const reorder = (direction) => {
    const ids = document.elements.map((item) => item.id);
    const at = ids.indexOf(element.id);
    const to = Math.max(0, Math.min(ids.length - 1, at + direction));
    [ids[at], ids[to]] = [ids[to], ids[at]];
    onCommands([{ type: 'reorder', ids }]);
  };
  if (!element) return <div className="fs-inspector fs-panel-content">
    <h3>图稿设置</h3><p className="fs-muted">选择画布上的对象，调整文字、位置与样式。</p>
    <div className="fs-field-grid"><Field label="宽度 / mm" type="number" value={document.canvas.widthMm} onCommit={(widthMm) => onCommands([{ type: 'canvas', patch: { widthMm } }])} /><Field label="高度 / mm" type="number" value={document.canvas.heightMm} onCommit={(heightMm) => onCommands([{ type: 'canvas', patch: { heightMm } }])} /></div>
    <Field label="画布背景" type="color" value={document.canvas.background} onCommit={(background) => onCommands([{ type: 'canvas', patch: { background } }])} />
    <div className="fs-note">尺寸按最终刊出大小设置。文字字号使用 pt，对象位置与尺寸使用 mm。</div>
  </div>;
  const line = element.type === 'line' || element.type === 'arrow';
  const endpoints = line ? connectorEndpoints(element, document.elements) : null;
  function bindEndpoint(key, value) {
    if (value) { patch(key, value); return; }
    const coordinateKeys = key === 'fromId' ? ['x1', 'y1'] : ['x2', 'y2'];
    onCommands([{ type: 'update', id: element.id, patch: { [key]: null, ...Object.fromEntries(coordinateKeys.map((coordinate) => [coordinate, endpoints[coordinate]])) } }]);
  }
  return <div className="fs-inspector fs-panel-content" key={element.id}>
    <div className="fs-section-heading"><h3>{TYPE_LABELS[element.type]}属性</h3><span className="fs-object-id" title={element.id}>{element.id.slice(0, 12)}</span></div>
    {element.type === 'text' && <>
      <Field label="文字内容" type="textarea" value={element.text} onCommit={(value) => patch('text', value)} />
      <Field label="字体" value={element.fontFamily} suggestions={[...new Set(['Arial', 'Arial Unicode MS', 'Helvetica', 'Courier', 'Symbol', 'Times New Roman', 'Courier New', ...(document.ruleOverrides['standard-font']?.value || [])])]} onCommit={(value) => patch('fontFamily', value)} />
      <p className="fs-micro">可直接填写字体名称。外部编辑软件和转换服务须安装同一字体；字体改变后请重新核对最终排版。</p>
      <div className="fs-field-grid"><Field label="字号 / pt" type="number" value={element.fontSize} onCommit={(value) => patch('fontSize', value)} /><Field label="字重" value={['bold', 700].includes(element.fontWeight) ? 700 : 400} options={[[400, '常规'], [700, '粗体']]} onCommit={(value) => patch('fontWeight', Number(value))} /></div>
      <Field label="文字用途" value={element.role} options={[["label", "普通文字"], ["panel-label", "面板标签"]]} onCommit={(value) => patch('role', value)} />
      <Field label="文字颜色" type="color" value={element.color} onCommit={(value) => patch('color', value)} />
    </>}
    <h4>位置与大小</h4>
    <div className="fs-field-grid">{(line ? ['x1', 'y1', 'x2', 'y2'] : ['x', 'y', 'width', 'height']).map((key) => <Field key={key} label={`${({ width: '宽', height: '高' }[key] || key.toUpperCase())} / mm`} type="number" value={endpoints ? Math.round(endpoints[key] * 100) / 100 : element[key]} disabled={line && Boolean(key.endsWith('1') ? element.fromId : element.toId)} onCommit={(value) => patch(key, value)} />)}</div>
    {element.fill !== undefined && <Field label="填充颜色" type="color" value={element.fill === 'none' ? '#ffffff' : element.fill} onCommit={(value) => patch('fill', value)} />}
    {element.fill !== undefined && <label className="fs-check"><input type="checkbox" checked={element.fill === 'none'} onChange={(event) => patch('fill', event.target.checked ? 'none' : '#ffffff')} />无填充</label>}
    {element.stroke !== undefined && <><Field label="描边颜色" type="color" value={element.stroke === 'none' ? '#64748b' : element.stroke} onCommit={(value) => patch('stroke', value)} /><Field label="线宽 / mm" type="number" value={element.strokeWidth} min="0" onCommit={(value) => patch('strokeWidth', value)} /></>}
    {element.type !== 'panel' && <Field label="所属面板" value={element.parentId || ''} options={[["", "独立对象"], ...document.elements.filter((item) => item.type === 'panel').map((item) => [item.id, `面板 ${item.id.slice(-6)}`])]} onCommit={(value) => patch('parentId', value || null)} />}
    {line && <>{['fromId', 'toId'].map((key) => <Field key={key} label={key === 'fromId' ? '起点连接对象' : '终点连接对象'} value={element[key] || ''} options={[["", "自由端点"], ...document.elements.filter((item) => ['rect', 'ellipse', 'panel', 'image'].includes(item.type)).map((item) => [item.id, `${TYPE_LABELS[item.type]} ${item.id.slice(-6)}`])]} onCommit={(value) => bindEndpoint(key, value)} />)}{(element.fromId || element.toId) && <p className="fs-micro">已绑定的端点随对象移动。解除连接后可拖动整条线；绑定期间请移动连接对象。</p>}</>}
    {element.type === 'image' && <div className="fs-note">图片作为一个对象保留，内部像素内容不会变成可编辑的文字或形状。</div>}
    <h4>图层</h4><div className="fs-button-row"><button onClick={() => reorder(1)}><ArrowUp size={14} />上移</button><button onClick={() => reorder(-1)}><ArrowDown size={14} />下移</button><button className="fs-danger" onClick={onDelete}><Trash2 size={14} />删除</button></div>
  </div>;
}

export { Field };
