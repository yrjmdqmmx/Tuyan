import { useCallback, useEffect, useRef, useState } from 'react';
import { loadPresentedModelRegistry } from '../lib/modelCatalog.js';

/** Read-only catalog requests; a late response cannot restore an obsolete session. */
export default function useModelCatalog({ apiBase, enabled = true }) {
  const [registry, setRegistry] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);
  const refresh = useCallback(async () => {
    if (!enabled) return;
    const id = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const next = await loadPresentedModelRegistry(apiBase);
      if (requestId.current === id) setRegistry(next);
    } catch (cause) {
      if (requestId.current !== id) return;
      setRegistry(null);
      setError(`模型目录读取失败：${cause?.message || '服务暂不可用'}。请稍后刷新。`);
    } finally {
      if (requestId.current === id) setLoading(false);
    }
  }, [apiBase, enabled]);

  useEffect(() => {
    if (!enabled) return undefined;
    refresh();
    const timer = setInterval(refresh, 60_000);
    return () => {
      requestId.current += 1;
      clearInterval(timer);
    };
  }, [enabled, refresh]);

  return { registry, error, loading, refresh };
}
