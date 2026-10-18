import { useCallback, useEffect, useRef, useState } from 'react';
import { AUTH_ENABLED, authClient } from '../config';

export function useAuthSession({ client = authClient, enabled = AUTH_ENABLED } = {}) {
  const [session, setSession] = useState(null);
  const [isPending, setIsPending] = useState(enabled);
  const [error, setError] = useState(null);
  const sequence = useRef(0), mounted = useRef(true);

  const refresh = useCallback(async function refresh() {
    const request = ++sequence.current;
    if (!enabled) {
      setIsPending(false);
      setSession(null);
      setError(null);
      return null;
    }
    setIsPending(true);
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

  return { session, isPending, error, refresh, clear };
}
