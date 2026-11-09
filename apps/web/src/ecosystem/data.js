export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_ROWS = 5000;
const unsafeKeys = new Set(['__proto__', 'prototype', 'constructor']);

export function validateRows(rows) {
  if (!Array.isArray(rows) || !rows.length || rows.length > MAX_ROWS) throw Error('请提供 1–5,000 行数据。');
  const columns = [...new Set(rows.flatMap(row => row && typeof row === 'object' && !Array.isArray(row) ? Object.keys(row) : []))];
  if (!columns.length || columns.length > 40 || columns.some(key => !key.trim() || key.length > 80 || unsafeKeys.has(key))) throw Error('需要 1–40 个有效列名，每个最多 80 字符，不能重复或为空。');
  for (const row of rows) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) throw Error('JSON 必须是对象行数组。');
    for (const value of Object.values(row)) if (!(value === null || typeof value === 'string' && value.length <= 1000 || typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 1e100)) throw Error('单元格只支持有限数字（绝对值不超过 1e100）、文本（最多 1,000 字符）或 null。');
  }
  return { rows, columns, numeric: columns.filter(key => rows.some(row => typeof row[key] === 'number') && rows.every(row => row[key] == null || typeof row[key] === 'number')) };
}

function csvRows(text) {
  // Choose the delimiter from the header outside quotes. Tabs inside CSV text
  // cells are data; commas inside TSV text cells are data.
  let inHeaderQuote = false, commas = 0, tabs = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') { if (inHeaderQuote && text[i + 1] === '"') i++; else inHeaderQuote = !inHeaderQuote; }
    else if (!inHeaderQuote) { if (char === '\n' || char === '\r') break; if (char === ',') commas++; if (char === '\t') tabs++; }
  }
  const delimiter = tabs > commas ? '\t' : ',';
  const rows = []; let row = [], cell = '', quoted = false, closed = false;
  const pushCell = () => { row.push(cell); cell = ''; closed = false; if (row.length > 40) throw Error('表格最多支持 40 列。'); };
  const pushRow = () => { pushCell(); if (row.some(value => value.trim())) rows.push(row); row = []; if (rows.length > MAX_ROWS + 1) throw Error('表格最多支持 5,000 行数据。'); };
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') { quoted = false; closed = true; }
      else cell += char;
    } else if (char === delimiter) pushCell();
    else if (char === '\n' || char === '\r') { if (char === '\r' && text[i + 1] === '\n') i++; pushRow(); }
    else if (char === '"' && !cell && !closed) quoted = true;
    else if (closed || char === '"') throw Error('CSV 引号格式不正确。');
    else cell += char;
  }
  if (quoted) throw Error('CSV 中有未闭合的引号。');
  if (cell || row.length || closed) pushRow();
  const headers = rows.shift()?.map(value => value.trim()) || [];
  if (new Set(headers).size !== headers.length) throw Error('CSV 的列名不能重复。');
  return rows.map(values => {
    if (values.length !== headers.length) throw Error('CSV 每一行的列数应与表头一致。');
    const result = Object.create(null);
    headers.forEach((key, i) => {
      const value = values[i].trim();
      result[key] = !value ? null : /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(value) && Number.isFinite(Number(value)) ? Number(value) : value;
    });
    return result;
  });
}

export function parseTable(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > MAX_FILE_BYTES) throw Error('表格不能超过 5 MiB。');
  const source = text.replace(/^\uFEFF/, '').trim();
  if (!source) throw Error('请上传 CSV / JSON，或粘贴带表头的数据。');
  let rows;
  if (source.startsWith('[') || source.startsWith('{')) {
    try { rows = JSON.parse(source); } catch { throw Error('JSON 格式不正确，请提供对象行数组。'); }
  } else rows = csvRows(source);
  return validateRows(rows);
}

export function exampleTable(chart) {
  if (chart === 'sankey') return 'source,target,value\n样本采集,质量合格,72\n样本采集,质量复核,28\n质量合格,分析完成,65\n质量合格,分析复核,7\n质量复核,分析完成,18\n质量复核,分析复核,10';
  return 'time,response,group\n0,2.1,A\n1,3.4,A\n2,4.8,A\n3,5.2,A\n4,6.4,A\n0,1.8,B\n1,2.5,B\n2,3.1,B\n3,4.3,B\n4,4.7,B';
}

export async function readScientificFile(file) {
  if (!file || !file.size || file.size > MAX_FILE_BYTES) throw Error('请选择非空且不超过 5 MiB 的文件。');
  if (!/\.(vtk|vtu|vtp|stl)$/i.test(file.name)) throw Error('当前支持单文件 VTK、VTU、VTP 或 STL。');
  const buffer = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (let offset = 0; offset < buffer.length; offset += 16384) binary += String.fromCharCode(...buffer.subarray(offset, offset + 16384));
  return { name: file.name, base64: btoa(binary) };
}
