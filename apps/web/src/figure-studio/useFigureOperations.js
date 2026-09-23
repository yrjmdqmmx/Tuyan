import { useEffect, useRef, useState } from 'react';
import { queryOperation, requestEdit, requestPlan, resumeOperation } from './api.js';
import { operationPending, readOperationPointers, returnedOperation, saveOperationPointers } from './operations.js';

/** Only start/resume can invoke a model. Querying after transport loss is read-only. */
export default function useFigureOperations({ userId, identity }) {
  const current = useRef(identity); current.current = identity;
  const rowsRef = useRef([]);
  const [state, setState] = useState({ identity, rows: [] });
  const requests = useRef(new Set());
  function publish(rows) {
    if (current.current !== identity) return;
    rowsRef.current = rows;
    setState({ identity, rows }); saveOperationPointers(userId, rows);
  }
  function update(id, change) {
    if (current.current !== identity) return;
    publish(rowsRef.current.map(row => row.requestId === id ? { ...row, ...change } : row));
  }
  async function query(row) {
    const key = `${identity}:${row.requestId}`;
    if (current.current !== identity || requests.current.has(key)) return null;
    requests.current.add(key); update(row.requestId, { checking: true });
    try {
      const operation = returnedOperation(await queryOperation(row.requestId), row, { readOnlyQuery: true });
      update(row.requestId, { ...operation, checking: false, queryError: '' }); return operation;
    } catch (error) {
      update(row.requestId, { checking: false, queryError: `${error.message || '暂时无法查询'} 未重新发送模型请求。` }); return null;
    } finally { requests.current.delete(key); }
  }
  useEffect(() => {
    current.current = identity;
    const rows = readOperationPointers(userId);
    rowsRef.current = rows; setState({ identity, rows });
    if (userId) for (const row of rows) if (!row.localNotSent) void query(row);
    return () => { current.current = null; };
  }, [identity, userId]);
  const rows = state.identity === identity ? state.rows : [];
  useEffect(() => {
    const active = rows.filter(row => ['queued', 'running'].includes(row.status));
    if (!active.length) return undefined;
    const timer = setTimeout(() => { for (const row of active) void query(row); }, 5000);
    return () => clearTimeout(timer);
  }, [state, identity]);
  async function start(kind, payload, routeIdentity) {
    if (current.current !== identity || rowsRef.current.some(operationPending)) throw new Error('请先查询尚未确认的原操作，未发起新调用。');
    const row = { requestId: payload.requestId, kind, documentContext: payload.documentContext, routeIdentity, createdAt: new Date().toISOString(), status: 'running' };
    publish([row, ...rowsRef.current].slice(0, 20));
    try {
      const response = await (kind === 'plan' ? requestPlan(payload) : requestEdit(payload));
      const operation = returnedOperation(response, row);
      update(row.requestId, operation); return operation;
    } catch (error) {
      if (current.current !== identity) return null;
      if (error.details?.requestState === 'not_sent' || error.requestState === 'not_sent') {
        update(row.requestId, { status: 'blocked', localNotSent: true, recovery: { canResume: false, requestState: 'not_sent', billingStatus: 'not_called', message: error.message }, queryError: '' });
      } else {
        update(row.requestId, { status: 'unconfirmed', queryError: '请求结果待查询，未自动重发。' });
        return await query(row);
      }
      return null;
    }
  }
  async function resume(row, apiKeys) {
    const stored = rowsRef.current.find(item => item.requestId === row.requestId);
    if (current.current !== identity || stored?.status !== 'blocked' || row.bindingMismatch || stored.bindingMismatch || !row.recovery?.canResume || row.recovery.requestState === 'unknown' || row.recovery.retryAt && Date.parse(row.recovery.retryAt) > Date.now()) return null;
    update(row.requestId, { status: 'running', queryError: '' });
    try {
      const operation = returnedOperation(await resumeOperation(row.requestId, apiKeys), row);
      update(row.requestId, operation); return operation;
    } catch (error) {
      update(row.requestId, { status: 'unconfirmed', queryError: `${error.message} 将查询原操作，不重复恢复。` });
      return await query(row);
    }
  }
  return { rows, start, query, resume, acknowledge: row => update(row.requestId, { acknowledged: true }) };
}
