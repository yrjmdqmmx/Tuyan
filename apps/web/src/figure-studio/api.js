import { fetchJson } from '@paperbanana/api';
import { API_BASE_DEFAULT } from '../config.js';

export function studioRequest(action, payload = {}, { signal } = {}) {
  const base = API_BASE_DEFAULT.replace(/\/$/, '');
  const endpoint = base.endsWith('/paperbanana-api') ? base : `${base}/paperbanana-api`;
  const body = JSON.stringify({ ...payload, action });
  if (new TextEncoder().encode(body).length > 768 * 1024) throw new Error('此次请求超过服务端 768 KiB 限制，尚未发送。请缩小嵌入图片；仍可在本机编辑并下载 SVG 或源稿。');
  return fetchJson(endpoint, {
    method: 'POST', credentials: 'include', signal,
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

export const getCapabilities = () => studioRequest('figureStudioCapabilities');
export const getModels = () => studioRequest('modelRegistry');
export const requestPlan = (payload) => studioRequest('figureStudioPlan', payload);
export const requestEdit = (payload) => studioRequest('figureStudioEdit', payload);
export const requestExport = (payload) => studioRequest('figureStudioExport', payload);
