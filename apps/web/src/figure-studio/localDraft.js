import { initialHistory, parseSource, STORAGE_KEY } from './state.js';

const LOCK_NAME = `${STORAGE_KEY}.write`;

// Capture the history and comparison token from the very same read. A second
// read after mounting could otherwise authorize a stale tab to overwrite it.
export function readLocalDraft(storage = globalThis.localStorage) {
  let baseline = null;
  const history = initialHistory({ getItem(key) { baseline = storage?.getItem(key) ?? null; return baseline; } });
  return { history, baseline, storage };
}

export function createLocalDraftSaver({ storage, baseline, recoveryError = '', locks = globalThis.navigator?.locks }) {
  let expected = baseline;
  let sequence = 0;
  let state = recoveryError
    ? { kind: 'conflict', external: baseline, message: '本机草稿无法读取，自动保存已暂停。' }
    : { kind: 'idle', message: '尚未保存' };
  const listeners = new Set();
  const publish = (next) => { state = next; listeners.forEach(listener => listener(state)); return state; };
  const conflict = (external) => publish({ kind: 'conflict', external, message: '其他标签页更新了本机存档，本页自动保存已暂停。' });
  const unavailable = () => publish({ kind: 'unavailable', message: '此浏览器无法安全协调多页保存，请下载源稿。' });
  const failed = () => publish({ kind: 'failed', message: '本机保存失败，请下载源稿。' });

  function inspect() {
    try {
      const actual = storage.getItem(STORAGE_KEY);
      if (actual !== expected || state.kind === 'conflict') return conflict(actual);
      return state;
    } catch { return failed(); }
  }

  function save(document, { isCurrent = () => true, adopt, external } = {}) {
    const ticket = ++sequence;
    const source = JSON.stringify(document);
    if (!locks?.request || !storage) return Promise.resolve(unavailable());
    return locks.request(LOCK_NAME, () => {
      // An edit/unmount while waiting must not let a queued old scene write.
      if (ticket !== sequence || !isCurrent()) return state;
      const actual = storage.getItem(STORAGE_KEY);
      if (adopt ? state.kind !== 'conflict' || actual !== external : state.kind === 'conflict' || actual !== expected) return conflict(actual);
      if (actual !== source) storage.setItem(STORAGE_KEY, source);
      expected = source;
      const after = storage.getItem(STORAGE_KEY);
      if (after !== source) return conflict(after);
      return publish({ kind: 'saved', message: '已保存在此浏览器' });
    }).catch(() => ticket === sequence && isCurrent() ? failed() : state);
  }

  function loadStored({ external, onOpen, isCurrent = () => true }) {
    const ticket = ++sequence;
    if (!locks?.request || !storage) return Promise.resolve(unavailable());
    return locks.request(LOCK_NAME, () => {
      if (ticket !== sequence || !isCurrent()) return state;
      const actual = storage.getItem(STORAGE_KEY);
      if (state.kind !== 'conflict' || actual !== external) return conflict(actual);
      let document;
      try {
        if (!actual) throw new Error('missing');
        document = parseSource(actual);
      } catch {
        return publish({ kind: 'conflict', external: actual, message: '本机存档无法读取，本页图稿保持不变。' });
      }
      // This is an explicit replacement, not a storage-event side effect. The
      // editor invalidates pending scene bindings through its normal open path.
      onOpen(document);
      expected = actual;
      return publish({ kind: 'saved', message: '已载入本机存档' });
    }).catch(() => ticket === sequence && isCurrent() ? failed() : state);
  }

  return {
    getState: () => state,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    inspect,
    save,
    loadStored,
  };
}
