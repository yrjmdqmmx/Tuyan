import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchBackendHealth } from '@paperbanana/api';

// Retry quickly for a brief interruption, then at most once per minute until
// recovery. Only read-only health checks use this policy, never task requests.
const RETRY_DELAYS = Object.freeze([1000, 3000, 10000, 30000, 60000]);

// This helper bounds read-only requests, including transports that ignore abort.
export function boundedRead(read, timeoutMs, controller) {
  const { signal } = controller;
  if (signal.aborted) return Promise.reject(signal.reason);
  let onAbort;
  const timer = setTimeout(() => controller.abort(new Error('服务信息读取超时')), timeoutMs);
  return Promise.race([
    Promise.resolve().then(() => {
      if (signal.aborted) throw signal.reason;
      return read(signal);
    }),
    new Promise((_, reject) => {
      onAbort = () => reject(signal.reason || new Error('读取已取消'));
      signal.addEventListener('abort', onAbort, { once: true });
    }),
  ]).finally(() => { clearTimeout(timer); signal.removeEventListener('abort', onAbort); });
}

function connectionMessage(error) {
  if (error?.message === '服务信息读取超时') return '连接检查超时，将自动重试。';
  if (error?.status) return `服务暂时不可用（HTTP ${error.status}），将自动重试。`;
  return '暂时无法确认服务连接，将自动重试。';
}

export default function useBackendHealth(apiBase, {
  readHealth = fetchBackendHealth, timeoutMs = 15000, retryDelays = RETRY_DELAYS,
} = {}) {
  const [state, setState] = useState(null);
  const retryRef = useRef(null);
  const retryHealth = useCallback(() => retryRef.current?.(), []);

  useEffect(() => {
    let stopped = false, pending = false, failed = true, retryIndex = 0;
    let controller, timer;
    const canCheck = () => document.visibilityState !== 'hidden' && navigator.onLine !== false;
    const pause = () => {
      clearTimeout(timer);
      if (failed && !pending) setState(previous => ({
        apiBase, health: null, status: 'paused',
        error: navigator.onLine === false ? '网络已断开，联网后会自动检查连接。' : previous?.apiBase === apiBase ? previous.error : '',
      }));
    };
    async function check(reset = false) {
      if (stopped || pending) return;
      clearTimeout(timer);
      if (!canCheck()) { pause(); return; }
      if (reset) retryIndex = 0;
      pending = true;
      controller = new AbortController();
      setState({ apiBase, health: null, error: '', status: 'checking' });
      try {
        const health = await boundedRead(signal => readHealth(apiBase, { signal }), timeoutMs, controller);
        if (stopped) return;
        if (!health || health.runtime !== 'gateway' || health.ok === false || (health.code && health.code !== 0)) {
          throw new Error('服务状态返回异常');
        }
        failed = false;
        setState({ apiBase, health, error: '', status: 'ready' });
      } catch (error) {
        if (stopped) return;
        failed = true;
        const delay = retryDelays[Math.min(retryIndex++, retryDelays.length - 1)];
        const willRetry = Number.isFinite(delay) && delay >= 0;
        setState({ apiBase, health: null, error: connectionMessage(error), status: !canCheck() ? 'paused' : willRetry ? 'retrying' : 'error' });
        if (willRetry && canCheck()) timer = setTimeout(() => void check(), delay);
      } finally {
        pending = false;
      }
    }
    const retry = () => check(true);
    const recover = () => {
      if (!canCheck()) { pause(); return; }
      // A healthy page does not repeatedly fetch capabilities on every focus.
      if (failed) void check();
    };
    retryRef.current = retry;
    void check();
    window.addEventListener('online', recover);
    window.addEventListener('offline', recover);
    window.addEventListener('pageshow', recover);
    document.addEventListener('visibilitychange', recover);
    return () => {
      stopped = true;
      clearTimeout(timer);
      controller?.abort();
      if (retryRef.current === retry) retryRef.current = null;
      window.removeEventListener('online', recover);
      window.removeEventListener('offline', recover);
      window.removeEventListener('pageshow', recover);
      document.removeEventListener('visibilitychange', recover);
    };
  }, [apiBase, readHealth, timeoutMs, retryDelays]);

  const current = state?.apiBase === apiBase ? state : null;
  return { health: current?.health || null, healthError: current?.error || '', healthStatus: current?.status || 'checking', retryHealth };
}
