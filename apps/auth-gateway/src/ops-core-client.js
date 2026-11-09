import { parseOpsQuery } from '../../../packages/api/src/ops-read-contract.mjs';

/** A closed GET-only transport. No agent URL, action, admin token or headers. */
export function createOpsCoreClient({ url, token, fetchImpl = globalThis.fetch }) {
  return async (kind, input) => {
    const query = parseOpsQuery(kind, input);
    const target = new URL(kind === 'health' ? '/internal/operations' : `/internal/operations/${kind}`, url);
    for (const [key, value] of Object.entries(query)) target.searchParams.set(key, value);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    timeout.unref?.();
    try {
      const response = await fetchImpl(target, { method: 'GET', redirect: 'error', signal: controller.signal,
        headers: { 'x-paperbanana-operations-token': token, accept: 'application/json' } });
      if (!response.ok || !response.body) { await response.body?.cancel(); throw new Error(); }
      const reader = response.body.getReader();
      const chunks = [];
      let size = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 128 * 1024) throw new Error();
          chunks.push(Buffer.from(value));
        }
      } finally { await reader.cancel().catch(() => {}); }
      return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch { throw new Error('Operations source unavailable'); }
    finally { clearTimeout(timeout); }
  };
}
