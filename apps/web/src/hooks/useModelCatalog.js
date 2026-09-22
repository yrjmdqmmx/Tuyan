import { useCallback, useEffect, useRef, useState } from 'react';
import { loadPresentedModelRegistry } from '../lib/modelCatalog.js';

/** Read-only catalog requests; a late response cannot restore an obsolete session. */
export default function useModelCatalog({ apiBase, enabled = true, contextKey = '' }) {
  const context = `${apiBase}\0${contextKey}`;
  const currentContext = useRef(context); currentContext.current = context;
  const [state, setState] = useState({ context, registry: null, error: '', loading: false });
  const requestId = useRef(0);
  const refresh = useCallback(async () => {
    if (!enabled) return;
    const id = ++requestId.current;
    setState(previous => ({ context, registry: previous.context === context ? previous.registry : null, error: '', loading: true }));
    try {
      const next = await loadPresentedModelRegistry(apiBase);
      if (requestId.current === id && currentContext.current === context) setState({ context, registry: next, error: '', loading: false });
    } catch (cause) {
      if (requestId.current !== id || currentContext.current !== context) return;
      setState({ context, registry: null, error: `模型目录读取失败：${cause?.message || '服务暂不可用'}。请稍后刷新。`, loading: false });
    }
  }, [apiBase, enabled, context]);

  useEffect(() => {
    if (!enabled) return undefined;
    refresh();
    const timer = setInterval(refresh, 60_000);
    return () => {
      requestId.current += 1;
      clearInterval(timer);
    };
  }, [enabled, refresh]);

  const visible = state.context === context ? state : { registry: null, error: '', loading: enabled };
  return { registry: visible.registry, error: visible.error, loading: enabled && visible.loading, refresh };
}
