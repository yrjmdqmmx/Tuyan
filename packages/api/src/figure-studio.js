import { fetchJson } from './client.js';

export const FIGURE_STUDIO_ACTIONS = Object.freeze(['figureStudioCapabilities', 'figureStudioPlan', 'figureStudioEdit', 'figureStudioExport']);

/** Authenticated Node gateway only. One request, no paid retry or job fallback. */
export function figureStudioRequest(endpoint, action, payload = {}) {
  if (!FIGURE_STUDIO_ACTIONS.includes(action)) throw new TypeError('不支持的图稿操作。');
  return fetchJson(endpoint, {
    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, action }),
  });
}
