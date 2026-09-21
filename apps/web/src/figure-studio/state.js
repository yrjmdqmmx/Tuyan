import { applyCommands, createDocument, validateDocument } from '@paperbanana/figure-core';

export const STORAGE_KEY = 'tuyan.figure-studio.source.v1';
export const MAX_SOURCE_BYTES = 12 * 1024 * 1024;
export const copy = (value) => JSON.parse(JSON.stringify(value));

export function checkedDocument(value) {
  const result = validateDocument(value);
  if (result === false || result?.valid === false || result?.ok === false) {
    throw new Error(result.errors?.map((error) => error.message || error).join('；') || '源稿结构无效。');
  }
  return copy(value);
}

export function parseSource(text) {
  if (new TextEncoder().encode(text).length > MAX_SOURCE_BYTES) throw new Error('源稿超过 12 MB，请缩小嵌入图片后再导入。');
  return checkedDocument(JSON.parse(text));
}

export function initialHistory(storage = globalThis.localStorage) {
  let document;
  let recoveryError = '';
  try {
    const saved = storage?.getItem(STORAGE_KEY);
    if (saved) document = parseSource(saved);
  } catch { recoveryError = '本机草稿无法读取。已打开空白图稿；原缓存未删除，请从源稿文件恢复。'; }
  return { document: document || createDocument({ title: '未命名图稿' }), past: [], future: [], recoveryError };
}

export function historyReducer(state, action) {
  if (action.type === 'commands') {
    const document = applyCommands(state.document, action.commands, { baseRevision: action.baseRevision ?? state.document.revision });
    return { ...state, document, past: [...state.past.slice(-49), copy(state.document)], future: [], recoveryError: '' };
  }
  if (action.type === 'open') return { document: checkedDocument(action.document), past: [], future: [], recoveryError: '' };
  if (action.type === 'undo' || action.type === 'redo') {
    const undo = action.type === 'undo';
    const source = undo ? state.past : state.future;
    if (!source.length) return state;
    const document = checkedDocument({ ...copy(source[source.length - 1]), revision: state.document.revision + 1 });
    return { ...state, document,
      past: undo ? state.past.slice(0, -1) : [...state.past, copy(state.document)],
      future: undo ? [...state.future, copy(state.document)] : state.future.slice(0, -1),
    };
  }
  return state;
}

export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function filename(title, extension) {
  return `${String(title || '图稿').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').slice(0, 80)}.${extension}`;
}

export function objectBounds(element) {
  if ('x1' in element) return { x: Math.min(element.x1, element.x2), y: Math.min(element.y1, element.y2), width: Math.abs(element.x2 - element.x1), height: Math.abs(element.y2 - element.y1) };
  return { x: element.x, y: element.y, width: element.width, height: element.height };
}

export function movePatch(element, dx, dy) {
  return 'x1' in element
    ? { x1: element.x1 + dx, y1: element.y1 + dy, x2: element.x2 + dx, y2: element.y2 + dy }
    : { x: element.x + dx, y: element.y + dy };
}

export function makeElement(type, count = 0) {
  const id = `${type}-${crypto.randomUUID()}`;
  const offset = (count % 8) * 2;
  const box = { id, type, x: 20 + offset, y: 20 + offset, width: 35, height: 18 };
  if (type === 'text') return { ...box, text: '在右侧编辑文字', fontSize: 6, fontFamily: 'Arial', fontWeight: 400, color: '#172033', role: 'label' };
  if (type === 'line' || type === 'arrow') return { id, type, x1: 20 + offset, y1: 45 + offset, x2: 70 + offset, y2: 45 + offset, stroke: '#334155', strokeWidth: 0.35 };
  return { ...box, fill: type === 'panel' ? '#ffffff' : '#eff6ff', stroke: '#64748b', strokeWidth: 0.3, ...(type === 'panel' ? { width: 70, height: 50 } : {}) };
}
