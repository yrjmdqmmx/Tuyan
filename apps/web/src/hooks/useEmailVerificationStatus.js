import { useEffect, useState } from 'react';
import { AUTH_BASE_DEFAULT } from '../config';

// The observer exists only in this registration panel's memory. It cannot
// verify an address, create a session, or query an arbitrary email account.
export function useEmailVerificationStatus(token) {
  const [status, setStatus] = useState('pending');
  useEffect(() => {
    setStatus('pending');
    if (!token) return undefined;
    const deadline = Date.now() + 3600000;
    let stopped = false;
    let controller = null;
    async function check() {
      if (stopped || controller || document.visibilityState === 'hidden') return;
      if (Date.now() >= deadline) {
        stopped = true;
        window.clearInterval(timer);
        setStatus('expired');
        return;
      }
      controller = new AbortController();
      const timeout = window.setTimeout(() => controller?.abort(), 8000);
      try {
        const response = await fetch(`${AUTH_BASE_DEFAULT.replace(/\/$/, '')}/api/auth/verification-status`, {
          method: 'POST', credentials: 'omit', cache: 'no-store',
          headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }), signal: controller.signal,
        });
        if (!response.ok) throw new Error('Verification status unavailable');
        const data = await response.json();
        if (!['verified', 'pending'].includes(data?.status)) throw new Error('Verification status unavailable');
        if (stopped) return;
        setStatus(data.status);
        if (data.status === 'verified') {
          stopped = true;
          window.clearInterval(timer);
        }
      } catch {
        if (!stopped) setStatus('unavailable');
      } finally {
        window.clearTimeout(timeout);
        controller = null;
      }
    }
    const timer = window.setInterval(check, 10000);
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    check();
    return () => {
      stopped = true;
      controller?.abort();
      window.clearInterval(timer);
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, [token]);
  return status;
}
