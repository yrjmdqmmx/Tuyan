import { createAuthClient } from 'better-auth/react';

export const logoUrl = '/logo.svg';
export const API_BASE_DEFAULT = import.meta.env.VITE_API_BASE || '';
export const CUSTOM_API_BASE_ENABLED = import.meta.env.DEV && import.meta.env.VITE_ALLOW_CUSTOM_API_BASE === 'true';
export const BACKEND_MODE = import.meta.env.VITE_BACKEND_MODE || '';
export const CLIENT_VERSION = import.meta.env.VITE_CLIENT_VERSION || 'web-0.1.0';
export const AUTH_REQUIRED = import.meta.env.VITE_AUTH_REQUIRED === 'true';
export const AUTH_BASE_DEFAULT = import.meta.env.VITE_AUTH_BASE || (BACKEND_MODE === 'gateway' ? API_BASE_DEFAULT : '');
export const AUTH_ENABLED = AUTH_REQUIRED || import.meta.env.VITE_AUTH_ENABLED === 'true' || Boolean(import.meta.env.VITE_AUTH_BASE);
export const AUTH_UI_ENABLED = import.meta.env.VITE_AUTH_UI !== 'false';

export const authClient = createAuthClient({
  ...(AUTH_BASE_DEFAULT ? { baseURL: AUTH_BASE_DEFAULT } : {}),
  fetchOptions: {
    credentials: 'include',
  },
});
