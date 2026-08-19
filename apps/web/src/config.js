import { createAuthClient } from 'better-auth/react';

const META_ENV = import.meta.env || {};

export const logoUrl = '/logo.svg';
export const API_BASE_DEFAULT = META_ENV.VITE_API_BASE || '';
export const CUSTOM_API_BASE_ENABLED = META_ENV.DEV && META_ENV.VITE_ALLOW_CUSTOM_API_BASE === 'true';
export const BACKEND_MODE = META_ENV.VITE_BACKEND_MODE || '';
export const CLIENT_VERSION = META_ENV.VITE_CLIENT_VERSION || 'web-0.1.0';
export const AUTH_REQUIRED = META_ENV.VITE_AUTH_REQUIRED === 'true';
export const AUTH_BASE_DEFAULT = META_ENV.VITE_AUTH_BASE || (BACKEND_MODE === 'gateway' ? API_BASE_DEFAULT : '');
export const AUTH_ENABLED = AUTH_REQUIRED || META_ENV.VITE_AUTH_ENABLED === 'true' || Boolean(META_ENV.VITE_AUTH_BASE);
export const AUTH_UI_ENABLED = META_ENV.VITE_AUTH_UI !== 'false';

export const authClient = createAuthClient({
  ...(AUTH_BASE_DEFAULT ? { baseURL: AUTH_BASE_DEFAULT } : {}),
  fetchOptions: {
    credentials: 'include',
  },
});
