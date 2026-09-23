import { sha256 } from './exportReport.js';
import { generationContextFromDocument } from '@paperbanana/figure-core';
const PREFIX = 'tuyan.figure-studio.operations.v1:';
const validId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{16,120}$/.test(value);
export async function documentContext(document) {
  const [digest, generationContextSha256] = await Promise.all([document, generationContextFromDocument(document)].map(value => sha256(new TextEncoder().encode(JSON.stringify(value)))));
  if (!digest || !generationContextSha256) throw new Error('当前浏览器不能核验图稿内容，未发送模型请求。请使用支持安全连接的浏览器。');
  return { id: document.id, revision: document.revision, sha256: digest, generationContextSha256 };
}
export function sameDocumentContext(a, b) { return Boolean(a && b && a.id === b.id && a.revision === b.revision && a.sha256 === b.sha256 && a.generationContextSha256 === b.generationContextSha256); }
export function routeIdentity(context) { return JSON.stringify({ mainRoute: context.mainRoute, providerRegions: context.providerRegions || {} }); }
export function operationPending(row) {
  return !row.acknowledged && (['queued', 'running', 'unconfirmed'].includes(row.status) || row.recovery?.requestState === 'unknown');
}
function pointer(row) {
  return { requestId: row.requestId, kind: row.kind, documentContext: row.documentContext, createdAt: row.createdAt,
    routeIdentity: row.routeIdentity, acknowledged: Boolean(row.acknowledged), localNotSent: row.localNotSent === true };
}
export function readOperationPointers(userId, storage = globalThis.localStorage) {
  if (!userId) return [];
  try {
    const rows = JSON.parse(storage?.getItem(PREFIX + encodeURIComponent(userId)) || '[]');
    return Array.isArray(rows) ? rows.filter(row => validId(row?.requestId) && ['plan', 'edit'].includes(row.kind)
      && typeof row.documentContext?.id === 'string' && Number.isSafeInteger(row.documentContext.revision)
      && /^[a-f0-9]{64}$/.test(row.documentContext.sha256)).slice(0, 20).map(row => ({ ...pointer(row), status: row.localNotSent ? 'blocked' : 'unconfirmed', ...(row.localNotSent ? { recovery: { canResume: false, requestState: 'not_sent', billingStatus: 'not_called', message: '原请求在发送前停止，可调整配置后重新提交。' } } : {}) })) : [];
  } catch { return []; }
}
export function saveOperationPointers(userId, rows, storage = globalThis.localStorage) {
  if (!userId) return;
  try { storage?.setItem(PREFIX + encodeURIComponent(userId), JSON.stringify(rows.slice(0, 20).map(pointer))); } catch { /* Server recovery remains queryable by request ID. */ }
}
export function returnedOperation(response, expected, { readOnlyQuery = false } = {}) {
  const row = response?.operation;
  if (!row || row.requestId !== expected.requestId || row.kind !== expected.kind
    || !['queued', 'running', 'succeeded', 'blocked'].includes(row.status)) throw new Error('操作响应与原请求或图稿内容不一致，未载入结果。');
  const bindingMismatch = !sameDocumentContext(row.documentContext, expected.documentContext);
  if (bindingMismatch && !readOnlyQuery) throw new Error('操作响应与原请求或图稿内容不一致，未载入结果。');
  if (row.status === 'succeeded' && (row.kind === 'plan' ? !row.result?.plan : !Array.isArray(row.result?.commands))) throw new Error('操作结果不完整，未载入图稿。');
  // A read-only query may expose failure/billing evidence from an older transport,
  // but cannot adopt that transport's different binding as the original request.
  return { ...expected, ...row, documentContext: expected.documentContext, bindingMismatch,
    observedDocumentContext: bindingMismatch ? row.documentContext : undefined };
}
