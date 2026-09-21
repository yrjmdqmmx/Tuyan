import { ApiError, fetchJson } from './client.js';

export const FIGURE_STUDIO_ACTIONS = Object.freeze(['figureStudioCapabilities', 'figureStudioPlan', 'figureStudioEdit', 'figureStudioExport']);

/** Authenticated Node gateway only. One request, no paid retry or job fallback. */
export function figureStudioRequest(endpoint, action, payload = {}, { signal } = {}) {
  if (!FIGURE_STUDIO_ACTIONS.includes(action)) throw new TypeError('不支持的图稿操作。');
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
