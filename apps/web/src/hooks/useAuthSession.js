import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AUTH_ENABLED, authClient } from '../config';

/** One controller for the workbench and standalone pages. Never accept a stale session response. */
export function useAuthSession({ authEnabled = AUTH_ENABLED, client = authClient, initialSession = null } = {}) {
  const [session, setSession] = useState(initialSession);
  const [isPending, setIsPending] = useState(authEnabled && !initialSession);
  const [error, setError] = useState(null);
  const generationRef = useRef(0);
  const [generation, setGeneration] = useState(0);
  const mounted = useRef(false);
  const initial = useRef(initialSession);
  const initialized = useRef(false);

  const advanceGeneration = useCallback(() => {
    generationRef.current += 1;
    if (mounted.current) setGeneration(generationRef.current);
    return generationRef.current;
  }, []);
  const isCurrentGeneration = useCallback((candidate) => mounted.current && candidate === generationRef.current, []);

  const clear = useCallback(() => {
    advanceGeneration();
    if (!mounted.current) return;
    setSession(null); setError(null); setIsPending(false);
  }, [advanceGeneration]);

  const refresh = useCallback(async () => {
    const requestGeneration = advanceGeneration();
    if (!authEnabled) {
      if (mounted.current) { setSession(null); setError(null); setIsPending(false); }
      return null;
    }
    if (mounted.current) { setSession(null); setIsPending(true); setError(null); }
    try {
      const { data, error: authError } = await client.getSession();
      if (!isCurrentGeneration(requestGeneration)) return null;
      const next = authError ? null : data || null;
      setSession(next); setError(authError || null); setIsPending(false);
      return next;
    } catch (reason) {
      if (!isCurrentGeneration(requestGeneration)) return null;
      setSession(null); setError(reason || new Error('登录状态检查失败。')); setIsPending(false);
      return null;
    }
  }, [advanceGeneration, authEnabled, client, isCurrentGeneration]);

  const signOut = useCallback(async () => {
    clear();
    const requestGeneration = generationRef.current;
    try {
      const result = await client.signOut();
      if (result?.error && isCurrentGeneration(requestGeneration)) setError(result.error);
      return result || null;
    } catch (reason) {
      if (isCurrentGeneration(requestGeneration)) setError(reason || new Error('退出账号未完成，请重试。'));
      return null;
    }
  }, [clear, client, isCurrentGeneration]);

  useEffect(() => {
    mounted.current = true;
    if (!initialized.current && initial.current) setIsPending(false);
    else void refresh();
    initialized.current = true;
    return () => {
      mounted.current = false;
      generationRef.current += 1;
    };
  }, [refresh]);

  return useMemo(() => ({ session, isPending, error, refresh, clear, signOut, generation, isCurrentGeneration, authEnabled, client }),
    [session, isPending, error, refresh, clear, signOut, generation, isCurrentGeneration, authEnabled, client]);
}
