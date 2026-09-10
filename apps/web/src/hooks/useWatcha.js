import { useCallback, useEffect, useRef, useState } from 'react';
import { isWatchaCallback, watchaAuthorizeUrl, watchaRequest } from '../lib/watcha.js';

const empty = { available: false, linked: false, pending: null, hasPassword: false, emailVerified: false };
export function useWatcha(apiBase, userId, enabled, onAuthenticated) {
  const [status, setStatus] = useState(empty), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [statusError, setStatusError] = useState('');
  const popup = useRef(null), sequence = useRef(0), mounted = useRef(true), callback = useRef(onAuthenticated);
  const awaitingResult = useRef(false), activeUser = useRef(userId);
  activeUser.current = userId;
  callback.current = onAuthenticated;
  const refresh = useCallback(async () => {
    const generation = ++sequence.current;
    if (!enabled) { setStatus(empty); setStatusError(''); return empty; }
    try {
      const data = await watchaRequest(apiBase, 'status');
      const result = { available: data.available === true, linked: data.linked === true, hasPassword: data.hasPassword === true,
        emailVerified: data.emailVerified === true, pending: data.pending && typeof data.pending.nickname === 'string' ? { nickname: data.pending.nickname.slice(0, 100) } : null };
      if (mounted.current && generation === sequence.current) {
        setStatus(result);
        setStatusError('');
        // Some browsers sever window.opener during the provider redirect. A focus
        // or manual refresh still recovers the authoritative Gateway session.
        if (awaitingResult.current && (result.pending || result.linked)) {
          awaitingResult.current = false;
          popup.current?.close(); popup.current = null; setBusy(false);
          if (result.linked && !activeUser.current) await callback.current?.();
        }
      }
      return result;
    } catch {
      if (mounted.current && generation === sequence.current) setStatusError('暂时无法确认观猹登录状态，请检查网络并刷新状态。当前输入已保留。');
      return null;
    }
  }, [apiBase, enabled]);

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; sequence.current++; popup.current?.close(); }; }, []);
  useEffect(() => { setError(''); setNotice(''); void refresh(); }, [refresh, userId]);

  useEffect(() => {
    if (!enabled) return;
    async function finish(result) {
      if (!popup.current) return;
      const opened = popup.current; popup.current = null; opened.close();
      const current = await refresh();
      if (!mounted.current) return;
      setBusy(false);
      if (result === 'error') setError('观猹授权未完成，请重新尝试。');
      else if (!current) return;
      else if (current.linked) { setNotice('观猹登录已完成。'); }
      else if (current.pending) setNotice('观猹授权已完成，请选择创建或绑定图研账号。');
      else setNotice('授权窗口已关闭，工作台内容已保留。');
    }
    const message = (event) => { if (isWatchaCallback(event, popup.current, window.location.origin)) void finish(event.data.status); };
    const timer = window.setInterval(() => { if (popup.current?.closed) void finish('closed'); }, 600);
    const focus = () => { if (popup.current?.closed) void finish('closed'); else void refresh(); };
    window.addEventListener('message', message); window.addEventListener('focus', focus);
    return () => { window.clearInterval(timer); window.removeEventListener('message', message); window.removeEventListener('focus', focus); };
  }, [refresh, enabled]);

  async function start(intent = 'login') {
    if (busy || !status.available) return false;
    setError(''); setNotice('');
    // Open while still in the click gesture. Never navigate the workspace away.
    const opened = window.open('about:blank', '_blank', 'popup,width=520,height=740');
    if (!opened) { setError('浏览器阻止了授权弹窗，请允许弹窗后重试。当前输入已保留。'); return false; }
    popup.current?.close(); popup.current = opened; awaitingResult.current = true; setBusy(true);
    try {
      const data = await watchaRequest(apiBase, 'start', { intent, returnOrigin: window.location.origin });
      const url = watchaAuthorizeUrl(data.url);
      if (popup.current !== opened || opened.closed) return false;
      opened.location.replace(url.toString()); return true;
    } catch (failure) {
      opened.close(); if (popup.current === opened) popup.current = null;
      awaitingResult.current = false;
      setBusy(false); setError(failure.message || '暂时无法发起观猹登录。'); return false;
    }
  }
  async function run(action, body, noticeText, authenticated = false) {
    if (busy) return false;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await watchaRequest(apiBase, action, body);
      if (authenticated) awaitingResult.current = false;
      await refresh(); setNotice(noticeText);
      if (authenticated) await callback.current?.();
      return result;
    } catch (failure) { setError(failure.message || '操作未完成，请稍后重试。'); return false; }
    finally { setBusy(false); }
  }
  return { status, busy, error: error || statusError, notice, refresh, start,
    requestCode: (purpose, email) => run('email-code', { purpose, ...(email ? { email } : {}) }, '验证码已发送，请检查邮箱。'),
    complete: (email, code) => run('complete', { email, code }, '图研账号已创建并绑定观猹。', true),
    link: () => run('link', {}, '观猹已绑定当前图研账号。', true),
    unlink: (code) => run('unlink', { code }, '已解绑观猹，仍可使用邮箱和密码登录。'),
    deletionConfirmation: (code) => run('delete-confirmation', { code }, ''),
  };
}
