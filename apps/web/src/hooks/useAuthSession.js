import { useEffect, useState } from 'react';
import { AUTH_ENABLED, authClient } from '../config';

export function useAuthSession() {
  const [session, setSession] = useState(null);
  const [isPending, setIsPending] = useState(AUTH_ENABLED);
  const [error, setError] = useState(null);

  async function refresh() {
    if (!AUTH_ENABLED) {
      setIsPending(false);
      setSession(null);
      setError(null);
      return null;
    }
    setIsPending(true);
    const { data, error: authError } = await authClient.getSession();
    setSession(data || null);
    setError(authError || null);
    setIsPending(false);
    return data || null;
  }

  function clear() {
    setSession(null);
    setError(null);
    setIsPending(false);
  }

  useEffect(() => {
    let cancelled = false;
    if (!AUTH_ENABLED) {
      setIsPending(false);
      return undefined;
    }
    authClient.getSession()
      .then(({ data, error: authError }) => {
        if (cancelled) return;
        setSession(data || null);
        setError(authError || null);
      })
      .finally(() => {
        if (!cancelled) setIsPending(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { session, isPending, error, refresh, clear };
}
