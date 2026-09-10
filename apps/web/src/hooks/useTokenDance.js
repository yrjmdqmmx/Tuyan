import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchJson } from '@paperbanana/api';

export function captureTokenDanceCallback(location, history) {
  const url = new URL(location.href);
  if (url.searchParams.get('tokendance_callback') !== '1') return null;
  const result = { state: url.searchParams.get('state') || '', code: url.searchParams.get('code') || '', cancelled: url.searchParams.has('error') || !url.searchParams.get('code') };
  for (const key of ['tokendance_callback', 'code', 'state', 'error', 'error_description']) url.searchParams.delete(key);
  history.replaceState(null, '', url.pathname + url.search + url.hash);
  return result;
}
// Strip the one-use code before the app makes requests or renders the page.
const callback = typeof window === 'undefined' ? null : captureTokenDanceCallback(window.location, window.history);
let callbackPromise;

export function useTokenDance(apiBase, userId, ready) {
  const [connection, setConnection] = useState({ connected: false, available: false });
  const [wallet, setWallet] = useState(null), [payment, setPayment] = useState(null);
  const [payments, setPayments] = useState([]), [historyLoaded, setHistoryLoaded] = useState(false);
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false);
  const currentUser = useRef(userId); currentUser.current = userId;
  const context = `${apiBase}\0${userId || ''}`;
  const currentContext = useRef(context); currentContext.current = context;
  const operations = useRef({ context, count: 0 });
  if (operations.current.context !== context) operations.current = { context, count: 0 };
  const [stateContext, setStateContext] = useState(context);
  const endpoint = apiBase.endsWith('/paperbanana-api') ? apiBase : `${apiBase}/paperbanana-api`;
  const request = useCallback(async (action, body = {}) => {
    if (currentContext.current !== context) throw new Error('账户已切换，请重新操作。');
    const result = await fetchJson(endpoint, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...body }) });
    // A response from the previous account must never populate this account's wallet or payment UI.
    if (currentContext.current !== context) throw new Error('账户已切换，请重新操作。');
    return result;
  }, [endpoint, context]);
  const refresh = useCallback(async () => {
    if (!userId) return;
    const result = await request('tokenDanceStatus');
    if (currentUser.current === userId) setConnection(result);
    return result;
  }, [request, userId]);
  useEffect(() => {
    setConnection({ connected: false, available: false }); setWallet(null); setPayment(null); setPayments([]); setHistoryLoaded(false); setError(''); setNotice(''); setBusy(false); setStateContext(context);
    if (ready && userId) refresh().catch(() => {});
  }, [ready, userId, refresh]);
  useEffect(() => {
    if (!ready || !userId || !callback) return;
    if (!callbackPromise) callbackPromise = request(callback.cancelled ? 'tokenDanceCancel' : 'tokenDanceExchange', callback).finally(() => { callback.code = ''; });
    callbackPromise.then(() => {
      if (currentUser.current !== userId) return;
      setNotice(callback.cancelled ? '观猹 TokenDance 授权已取消。' : '观猹 TokenDance 已连接，可以选择模型。');
      refresh().catch(() => {});
      const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('tuyan-tokendance') : null;
      channel?.postMessage('connection-changed'); channel?.close();
      if (!callback.cancelled && window.name === 'tuyan-tokendance') window.close();
    }).catch(err => { if (currentUser.current === userId) setError(err.message); });
  }, [ready, userId, request, refresh]);
  useEffect(() => {
    const refreshOnFocus = () => { refresh().catch(() => {}); };
    window.addEventListener('focus', refreshOnFocus);
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('tuyan-tokendance') : null;
    if (channel) channel.onmessage = refreshOnFocus;
    return () => { window.removeEventListener('focus', refreshOnFocus); channel?.close(); };
  }, [refresh]);
  async function perform(operation) {
    if (currentContext.current !== context) return null;
    operations.current.count++;
    setBusy(true); setError(''); setNotice('');
    try { return await operation(); } catch (err) { if (currentContext.current === context) setError(err.message); return null; } finally { if (currentContext.current === context) { operations.current.count--; setBusy(operations.current.count > 0); } }
  }
  async function authorize() {
    if (!userId) { setError('请先登录图研，再连接观猹 TokenDance。'); return; }
    const popup = window.open('about:blank', 'tuyan-tokendance', 'popup,width=680,height=760');
    await perform(async () => {
      try {
        const flow = await request('tokenDanceAuthorize', { platform: 'web' });
        if (popup) popup.location.replace(flow.authorizationUrl);
        else { setError('浏览器阻止了授权窗口，请允许弹窗后重试。'); await request('tokenDanceCancel', { state: flow.state }); }
      } catch (err) { popup?.close(); throw err; }
    });
  }
  async function balance() { return perform(async () => { const result = await request('tokenDanceBalance'); setWallet(result.wallet); return result; }); }
  async function disconnect() { return perform(async () => { await request('tokenDanceDisconnect'); setWallet(null); setPayment(null); setPayments([]); setHistoryLoaded(false); await refresh(); setNotice('已解除图研连接。若需撤销远端 Key，请前往观猹 TokenDance 密钥管理。'); }); }
  async function createPayment(amount) {
    return perform(async () => {
      const result = await request('tokenDancePaymentCreate', { amount, attemptId: crypto.randomUUID() });
      setPayment(result); setPayments(rows => [result, ...rows.filter(row => row.attemptId !== result.attemptId)].slice(0, 10)); return result;
    });
  }
  async function recoverPayment() {
    return perform(async () => {
      const result = await request('tokenDancePayments');
      setPayments(result.payments); setHistoryLoaded(true);
      const row = result.payments.find(item => item.session?.status === 'pending');
      setPayment(previous => result.payments.find(item => item.attemptId === previous?.attemptId) || row || null);
      if (result.payments.some(item => item.state === 'unknown' || item.state === 'creating')) setNotice('存在创建结果未确认的订单，请到观猹 TokenDance 核对，暂不重复创建。');
      return result;
    });
  }
  async function paymentStatus(attemptId = payment?.attemptId) {
    if (!attemptId) return;
    return perform(async () => {
      const result = await request('tokenDancePaymentStatus', { attemptId });
      setPayment(result);
      setPayments(rows => rows.map(row => row.attemptId === attemptId ? { ...row, ...result } : row));
      if (result.session?.status === 'paid') {
        const result = await request('tokenDanceBalance'); setWallet(result.wallet);
        setNotice('充值已确认到账。可以返回原任务继续。');
      }
      return result;
    });
  }
  useEffect(() => {
    if (!payment?.session || payment.session.status !== 'pending') return;
    let cancelled = false, timer;
    const tick = async () => {
      try {
        const result = await request('tokenDancePaymentStatus', { attemptId: payment.attemptId });
        if (cancelled) return;
        setPayment(result);
        setPayments(rows => rows.map(row => row.attemptId === result.attemptId ? { ...row, ...result } : row));
        if (result.session.status === 'paid') {
          const result = await request('tokenDanceBalance');
          if (!cancelled) { setWallet(result.wallet); setNotice('充值已确认到账。可以返回原任务继续。'); }
        }
        else if (result.session.status === 'pending' && result.session.expired_at * 1000 > Date.now()) timer = setTimeout(tick, 3000);
        else if (result.session.status === 'pending') setNotice('支付会话已过期，请查询最终状态后再创建新订单。');
      } catch (err) { if (!cancelled) setError(err.message); }
    };
    timer = setTimeout(tick, 3000);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [payment?.attemptId, payment?.session?.status, request, userId]);
  const state = stateContext === context ? { connection, wallet, payment, payments, historyLoaded, error, notice, busy } : { connection: { connected: false, available: false }, wallet: null, payment: null, payments: [], historyLoaded: false, error: '', notice: '', busy: false };
  return { ...state, authorize, disconnect, balance, createPayment, recoverPayment, paymentStatus, request, perform, userId };
}

export function isTokenDanceWalletEntry(search) { return new URLSearchParams(search).has('tokendance_wallet'); }
