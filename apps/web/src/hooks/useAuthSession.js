import { useCallback, useEffect, useRef, useState } from 'react';
import { AUTH_ENABLED, authClient } from '../config';

export function useAuthSession({ client = authClient, enabled = AUTH_ENABLED } = {}) {
  const [session, setSession] = useState(null);
  const [isPending, setIsPending] = useState(enabled);
  const [error, setError] = useState(null);
  const sequence = useRef(0), mounted = useRef(true), inFlight = useRef(0);

  const refresh = useCallback(async function refresh({ quiet = false } = {}) {
    const request = ++sequence.current;
    if (!enabled) {
      setIsPending(false);
      setSession(null);
      setError(null);
      return null;
    }
    if (!quiet) setIsPending(true);
    inFlight.current++;
    try {
      const { data, error: authError } = await client.getSession();
      if (!mounted.current || request !== sequence.current) return null;
      if (authError) { setError(authError); return null; }
      setSession(data || null);
      setError(null);
      return data || null;
    } catch (reason) {
      if (mounted.current && request === sequence.current) setError(reason);
      return null;
    } finally {
      inFlight.current--;
      if (mounted.current && request === sequence.current) setIsPending(false);
    }
  }, [client, enabled]);

  const clear = useCallback(function clear() {
    sequence.current++;
    setSession(null);
    setError(null);
    setIsPending(false);
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    return () => {
      mounted.current = false;
      sequence.current++;
    };
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return;
    let lastCheck = 0;
    const catchUp = () => {
      if (document.visibilityState === 'hidden' || inFlight.current || Date.now() - lastCheck < 3000) return;
      lastCheck = Date.now(); void refresh({ quiet: true });
    };
    window.addEventListener('focus', catchUp);
    window.addEventListener('online', catchUp);
    window.addEventListener('pageshow', catchUp);
    document.addEventListener('visibilitychange', catchUp);
    const timer = setInterval(catchUp, 30000);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', catchUp);
      window.removeEventListener('online', catchUp);
      window.removeEventListener('pageshow', catchUp);
      document.removeEventListener('visibilitychange', catchUp);
    };
  }, [enabled, refresh]);

  return { session, isPending, error, refresh, clear };
}
