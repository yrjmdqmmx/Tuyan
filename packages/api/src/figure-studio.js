import { ApiError, fetchJson } from './client.js';

export const FIGURE_STUDIO_ACTIONS = Object.freeze([
  'figureStudioCapabilities', 'figureStudioPlan', 'figureStudioEdit', 'figureStudioExport',
  'figureStudioOperation', 'figureStudioResume',
]);
const OPERATION_ACTIONS = new Set(['figureStudioPlan', 'figureStudioEdit', 'figureStudioOperation', 'figureStudioResume']);

/** Authenticated Node gateway only. One request, no paid retry or job fallback. */
export function figureStudioRequest(endpoint, action, payload = {}, { signal } = {}) {
  if (!FIGURE_STUDIO_ACTIONS.includes(action)) throw new TypeError('不支持的图稿操作。');
  // The caller owns the ID: a lost response must query this operation, never
  // silently mint a new paid request or fall back to legacy image generation.
  if (OPERATION_ACTIONS.has(action) && !/^[A-Za-z0-9_-]{16,120}$/.test(payload.requestId || '')) {
    throw new ApiError('缺少有效的画布操作标识，请保留原操作记录后重新提交。', {
      code: 400, details: { requestState: 'not_sent' },
    });
  }
  const body = JSON.stringify({ ...payload, action });
  if (new TextEncoder().encode(body).length > 768 * 1024) {
    throw new ApiError('此次请求超过服务端 768 KiB 限制，请缩小嵌入图片；仍可在本机编辑并下载 SVG 或源稿。', {
      code: 413, details: { requestState: 'not_sent' },
    });
  }
  return fetchJson(endpoint, {
    method: 'POST', credentials: 'include', signal, headers: { 'Content-Type': 'application/json' }, body,
  });
}
