import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE_DEFAULT, LOCAL_CONSUMPTION_TEST } from '../config.js';
import useBackendRegistry from '../hooks/useBackendRegistry.js';
import { browserCredentialKey, emptyLibrary } from './workspaceModels.js';
import {useTokenDance} from '../hooks/useTokenDance.js';
import { tokenDanceLibraryAddition } from './tokenDanceLibrary.js';

export default function useWorkspaceModels(userId, base = API_BASE_DEFAULT) {
  const catalog = useBackendRegistry(base, { refreshMs: 0, timeoutMs: 60000 });
  const tokenDance = useTokenDance(base,userId,Boolean(userId));
  const [library, setLibrary] = useState(emptyLibrary), [summary, setSummary] = useState(null);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [ready, setReady] = useState(false);
  const live = useRef(true), lock = useRef(false);
  const importAttempt = useRef('');
  const guestKey = `tuyan.workspace-models.v1:${base}:guest`;
  const request = useCallback(async (path, body) => {
    const res = await fetch(base + path, { method: body ? 'PUT' : 'GET', credentials: 'include', cache: 'no-store', headers: { 'Content-Type': 'application/json', 'X-Workspace-Account': userId || '' }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(20000) });
    const data = await res.json();
    if (!res.ok) throw Error(data.error || data.message || '账号数据读取失败');
    return data;
  }, [base, userId]);
  const decorate = data => ({ ...data, connections: data.connections.map(c => ({ ...c, hasCredential: c.scope === 'browser' ? !!localStorage.getItem(browserCredentialKey(base, userId, c)) : c.hasCredential })) });
  const refresh = useCallback(async () => {
    importAttempt.current = '';
    try {
      const data = userId ? await request('/api/model-library') : JSON.parse(localStorage.getItem(guestKey) || 'null') || emptyLibrary();
      if (live.current) { setLibrary(decorate(data)); setReady(true); setError(''); }
    } catch (e) { if (live.current) setError(e.message); }
    if (userId && LOCAL_CONSUMPTION_TEST) try { const data = await request('/api/workspace-account'); if (live.current) setSummary(data); } catch (e) { if (live.current) setSummary({ error: e.message }); }
  }, [userId, request, guestKey]);
  useEffect(() => { live.current = true; void refresh(); return () => { live.current = false; }; }, [refresh]);
  async function save(next, credentialChange) {
    if (lock.current || !ready) return false;
    lock.current = true; setBusy(true); setError('');
    try {
      const connections = next.connections.map(({ hasCredential, ...c }) => c);
      const body = { revision: library.revision, connections, models: next.models };
      if (credentialChange?.value) {
        const c = connections.find(c => c.id === credentialChange.id);
        if (c.scope === 'account') body.credentials = { [c.id]: credentialChange.value };
        // Browser secrets are persisted only after metadata CAS succeeds.
      }
      const data = userId ? await request('/api/model-library', body) : { ...body, revision: body.revision + 1 };
      if (credentialChange?.value) {
        const connection = connections.find(c => c.id === credentialChange.id);
        if (connection.scope === 'browser') localStorage.setItem(browserCredentialKey(base, userId, connection), credentialChange.value);
      }
      if (!userId) localStorage.setItem(guestKey, JSON.stringify(data));
      if (live.current) setLibrary(decorate(data));
      return true;
    } catch (e) { if (live.current) setError(e.message); return false; }
    finally { lock.current = false; if (live.current) setBusy(false); }
  }
  const authorization = tokenDance.connection.available ? tokenDance.connection : summary?.tokenDance;
  useEffect(() => {
    if (!userId || !ready || busy || lock.current || !authorization?.connected || catalog.registryStatus !== 'ready') return;
    // One attempt per observed snapshot. Explicit refresh permits another attempt;
    // failed saves must not create a render/write loop or overwrite a CAS conflict.
    const signature = JSON.stringify([library.revision, catalog.registry?.providers?.tokendance?.models.map(m => m.id)]);
    if (importAttempt.current === signature) return;
    importAttempt.current = signature;
    try {
      const next = tokenDanceLibraryAddition(library, catalog.registry);
      if (next) void save(next);
    } catch (e) { setError(e.message); }
  }, [userId, ready, busy, authorization?.connected, library, catalog.registry, catalog.registryStatus]);
  return { ...catalog, library, summary:{...summary,tokenDance:authorization}, tokenDance, busy, ready, error, save, refresh, userId };
}
