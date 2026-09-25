import { figureStudioRequest } from '@paperbanana/api';
import { API_BASE_DEFAULT } from '../config.js';

export function studioRequest(action, payload = {}, { signal } = {}) {
  const base = API_BASE_DEFAULT.replace(/\/$/, '');
  const endpoint = base.endsWith('/paperbanana-api') ? base : `${base}/paperbanana-api`;
  return figureStudioRequest(endpoint, action, payload, { signal });
}

export const getCapabilities = (options) => studioRequest('figureStudioCapabilities', {}, options);
export const requestPlan = (payload, options) => studioRequest('figureStudioPlan', payload, options);
export const requestEdit = (payload, options) => studioRequest('figureStudioEdit', payload, options);
export const requestExport = (payload, options) => studioRequest('figureStudioExport', payload, options);
export const queryOperation = (requestId, options) => studioRequest('figureStudioOperation', { requestId }, options);
export const resumeOperation = (requestId, apiKeys, options) => studioRequest('figureStudioResume', { requestId, ...(apiKeys ? { apiKeys } : {}) }, options);
