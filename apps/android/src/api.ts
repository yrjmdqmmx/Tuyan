import * as SecureStore from 'expo-secure-store';

import { API_BASE_DEFAULT } from './constants';
import { CLIENT_PLATFORM, normalizeClientPlatform } from './client-platform';
import type { BackendMode, CurrentUser, HealthInfo, Job, JobPayload, ResultImage } from './types';

const AUTH_COOKIE_KEY = 'paperbanana_android_auth_cookie';

interface JsonRequestOptions {
  method?: 'GET' | 'POST';
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  includeAuth?: boolean;
  timeoutMs?: number;
}

interface SessionResponse {
  user?: {
    id?: string;
    email?: string;
    name?: string;
  };
}

export function normalizeApiBase(value: string) {
  return (value || API_BASE_DEFAULT).trim().replace(/\/+$/, '');
}

export function authBase(apiBase: string) {
  return `${normalizeApiBase(apiBase)}/api/auth`;
}

export async function fetchBackendHealth(apiBase: string): Promise<HealthInfo> {
  const base = normalizeApiBase(apiBase);
  const lafUrl = lafEndpoint(base);
  const candidates: Array<{ mode: BackendMode | 'laf-or-gateway'; url: string; method: 'GET' | 'POST'; body?: Record<string, unknown> }> =
    lafUrl === base
      ? [
          { mode: 'laf-or-gateway', url: base, method: 'GET' },
          { mode: 'laf-or-gateway', url: base, method: 'POST', body: { action: 'health' } },
        ]
      : [
          { mode: 'gateway', url: `${base}/health`, method: 'GET' },
          { mode: 'laf-or-gateway', url: lafUrl, method: 'GET' },
          { mode: 'laf-or-gateway', url: lafUrl, method: 'POST', body: { action: 'health' } },
          { mode: 'fastapi', url: `${base}/api/health`, method: 'GET' },
        ];

  let lastError: unknown = null;
  for (const candidate of candidates) {
    try {
      const data = await fetchJson<HealthInfo>(candidate.url, {
        method: candidate.method,
        body: candidate.body,
        includeAuth: false,
        timeoutMs: 12000,
      });
      if (candidate.mode === 'fastapi') {
        if (!data.ok) throw new Error('当前地址不是 FastAPI 后端');
        return { ...data, backendMode: 'fastapi' };
      }
      if (data.runtime === 'gateway') return { ...data, backendMode: 'gateway' };
      if (data.runtime === 'laf') return { ...data, backendMode: 'laf' };
      if (data.laf?.runtime === 'laf' || data.laf?.ok) return { ...data, backendMode: 'gateway' };
      throw new Error('当前地址不是 PaperBanana 后端');
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('后端暂时不可用');
}

export async function createJobRequest(apiBase: string, health: HealthInfo | null, payload: JobPayload) {
  const base = normalizeApiBase(apiBase);
  if (shouldUseLaf(base, health)) {
    const data = await fetchJson<{ jobId?: string; id?: string; status?: string }>(lafEndpoint(base), {
      method: 'POST',
      body: {
        action: 'createJob',
        clientPlatform: CLIENT_PLATFORM,
        configurationMode: payload.configurationMode,
        provider: payload.provider,
        apiKeys: payload.apiKeys,
        methodContent: payload.methodContent,
        caption: payload.caption,
        infographicCategory: payload.infographicCategory,
        mainModelName: payload.mainModelName,
        imageModelName: payload.imageGenModelName,
        pipelineMode: toLafPipeline(payload.pipelineMode),
        retrievalSetting: payload.retrievalSetting,
        aspectRatio: payload.aspectRatio,
        numCandidates: payload.numCandidates,
        maxCriticRounds: payload.maxCriticRounds,
        mock: payload.mock,
      },
    });
    return { id: data.jobId || data.id || '', status: data.status || 'queued' };
  }

  return fetchJson<{ id: string; status: string }>(`${base}/api/jobs`, {
    method: 'POST',
    body: {
      clientPlatform: CLIENT_PLATFORM,
      provider: payload.provider,
      configuration_mode: payload.configurationMode,
      api_keys: payload.apiKeys,
      task_name: payload.taskName,
      method_content: payload.methodContent,
      caption: payload.caption,
      infographic_category: payload.infographicCategory,
      main_model_name: payload.mainModelName,
      image_gen_model_name: payload.imageGenModelName,
      pipeline_mode: payload.pipelineMode,
      retrieval_setting: payload.retrievalSetting,
      aspect_ratio: payload.aspectRatio,
      num_candidates: payload.numCandidates,
      max_critic_rounds: payload.maxCriticRounds,
      mock: payload.mock,
    },
  });
}

export async function getJobRequest(apiBase: string, health: HealthInfo | null, jobId: string) {
  const base = normalizeApiBase(apiBase);
  if (shouldUseLaf(base, health)) {
    const data = await fetchJson<{ job?: unknown }>(lafEndpoint(base), {
      method: 'POST',
      body: { action: 'getJob', jobId },
    });
    return normalizeJob(data.job);
  }
  const data = await fetchJson<unknown>(`${base}/api/jobs/${jobId}`);
  return normalizeJob(data);
}

export async function userJobsRequest(apiBase: string, health: HealthInfo | null) {
  const base = normalizeApiBase(apiBase);
  if (health?.backendMode === 'gateway' || shouldUseLaf(base, health)) {
    const data = await fetchJson<{ jobs?: unknown[] }>(lafEndpoint(base), {
      method: 'POST',
      body: { action: 'myJobs', limit: 50 },
    });
    const jobs = (data.jobs || []).map(normalizeJob);
    return { jobs: await hydrateRecordImages(base, health, jobs) };
  }
  const data = await fetchJson<{ jobs?: unknown[] }>(`${base}/api/jobs?scope=mine&limit=50`);
  const jobs = (data.jobs || []).map(normalizeJob);
  return { jobs: await hydrateRecordImages(base, health, jobs) };
}

export async function adminJobsRequest(apiBase: string, health: HealthInfo | null, adminToken: string) {
  const base = normalizeApiBase(apiBase);
  if (shouldUseLaf(base, health)) {
    const data = await fetchJson<{ jobs?: unknown[] }>(lafEndpoint(base), {
      method: 'POST',
      body: { action: 'adminJobs', adminToken, limit: 50 },
    });
    return { jobs: (data.jobs || []).map(normalizeJob) };
  }
  const data = await fetchJson<{ jobs?: unknown[] }>(`${base}/api/admin/jobs?limit=50`, {
    headers: { 'x-admin-token': adminToken },
  });
  return { jobs: (data.jobs || []).map(normalizeJob) };
}

export async function getSession(apiBase: string): Promise<CurrentUser | null> {
  const session = await fetchJson<SessionResponse | null>(`${authBase(apiBase)}/get-session`, {
    method: 'GET',
  }).catch(() => null);
  const user = session?.user;
  if (!user?.id) return null;
  return {
    id: String(user.id),
    email: String(user.email || ''),
    name: String(user.name || ''),
  };
}

export async function signInEmail(apiBase: string, email: string, password: string) {
  await fetchJson(`${authBase(apiBase)}/sign-in/email`, {
    method: 'POST',
    body: { email, password },
  });
}

export async function signUpEmail(apiBase: string, email: string, password: string, name: string) {
  await fetchJson(`${authBase(apiBase)}/sign-up/email`, {
    method: 'POST',
    body: { email, password, name },
  });
}

export async function signOut(apiBase: string) {
  await fetchJson(`${authBase(apiBase)}/sign-out`, {
    method: 'POST',
    body: {},
  }).catch(() => undefined);
  await SecureStore.deleteItemAsync(AUTH_COOKIE_KEY).catch(() => undefined);
}

export function resolveImageUrl(apiBase: string, url: string) {
  if (!url) return '';
  if (/^(https?:|data:|file:|blob:)/i.test(url)) return url;
  return `${normalizeApiBase(apiBase)}${url.startsWith('/') ? url : `/${url}`}`;
}

export function formatErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');
  if (message.includes('Invalid email or password')) return '邮箱或密码不正确。';
  if (message.includes('User already exists')) return '这个邮箱已经注册，请直接登录。';
  if (message.includes('Missing API key')) return '缺少所选模型接口的 API Key。';
  if (message.includes('Incorrect API key') || message.includes('apikey-error')) return 'API Key 不正确，请确认模型服务和密钥匹配。';
  if (message.includes('Please log in') || message.includes('请先登录') || message.includes('Unauthorized')) return '请先登录后再使用任务记录。';
  if (message.includes('Forbidden')) return '当前账号没有权限查看这个任务。';
  if (message.includes('timeout') || message.includes('AbortError')) return '请求超时，请稍后重试。';
  if (message.includes('Network request failed')) return '无法连接后端，请确认网络可访问 Sealos 后端地址。';
  if (message.includes('password')) return '密码至少需要 8 位。';
  if (message.includes('ADMIN_TOKEN is not configured')) return '管理接口未启用：还没有配置 ADMIN_TOKEN。';
  if (message.includes('Admin API disabled')) return '管理接口未启用。';
  if (message.includes('HTTP 503')) return '服务暂时不可用，请稍后重试。';
  return message || '操作失败';
}

export function formatDate(value: unknown) {
  if (!value) return '';
  const date = new Date(value as string | number);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

async function hydrateRecordImages(apiBase: string, health: HealthInfo | null, jobs: Job[]) {
  return Promise.all(
    jobs.map(async (job) => {
      const hasImageUrl = job.result_images.some((image) => image.url);
      const hasResult = job.result_image_count > 0 || job.result_images.length > 0;
      if (job.status !== 'succeeded' || hasImageUrl || !hasResult) return job;
      try {
        const detail = await getJobRequest(apiBase, health, job.id);
        return { ...job, ...detail };
      } catch {
        return job;
      }
    }),
  );
}

async function fetchJson<T>(url: string, options: JsonRequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers || {}),
  };
  let body: string | undefined;
  if (options.body) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    body = JSON.stringify(options.body);
  }
  if (options.includeAuth !== false) {
    const cookie = await SecureStore.getItemAsync(AUTH_COOKIE_KEY).catch(() => '');
    if (cookie) headers.Cookie = cookie;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 60000);
  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method || (body ? 'POST' : 'GET'),
      headers,
      body,
      credentials: 'include',
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error || '请求失败');
    throw new Error(`Network request failed: ${url} (${message})`);
  } finally {
    clearTimeout(timeout);
  }

  await persistCookies(response.headers);
  const text = await response.text();
  let data: Record<string, unknown> = {};
  if (text) {
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      data = { detail: text };
    }
  }
  const code = Number(data.code || 0);
  if (!response.ok || (code && code !== 0)) {
    throw new Error(String(data.error || data.detail || data.message || `HTTP ${response.status}`));
  }
  return data as T;
}

async function persistCookies(headers: Headers) {
  const cookieLines = collectSetCookieHeaders(headers);
  if (!cookieLines.length) return;

  const currentCookie = (await SecureStore.getItemAsync(AUTH_COOKIE_KEY).catch(() => '')) || '';
  const cookieMap = parseCookieHeader(currentCookie);
  cookieLines.forEach((line) => {
    const pair = String(line).split(';')[0] || '';
    const index = pair.indexOf('=');
    if (index <= 0) return;
    const name = pair.slice(0, index).trim();
    const value = pair.slice(index + 1).trim();
    if (!value) {
      cookieMap.delete(name);
    } else {
      cookieMap.set(name, value);
    }
  });

  const nextCookie = Array.from(cookieMap.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
  if (nextCookie) {
    await SecureStore.setItemAsync(AUTH_COOKIE_KEY, nextCookie);
  } else {
    await SecureStore.deleteItemAsync(AUTH_COOKIE_KEY).catch(() => undefined);
  }
}

function collectSetCookieHeaders(headers: Headers) {
  const values: string[] = [];
  const extended = headers as Headers & {
    getSetCookie?: () => string[];
    map?: () => Record<string, string | string[]>;
    raw?: () => Record<string, string[]>;
  };
  const fromGetSetCookie = typeof extended.getSetCookie === 'function' ? extended.getSetCookie() : undefined;
  if (Array.isArray(fromGetSetCookie)) values.push(...fromGetSetCookie);

  const raw = typeof extended.raw === 'function' ? extended.raw() : undefined;
  if (raw?.['set-cookie']) values.push(...raw['set-cookie']);

  const mapped = typeof extended.map === 'function' ? extended.map() : undefined;
  const mappedCookie = mapped?.['set-cookie'] || mapped?.['Set-Cookie'];
  if (Array.isArray(mappedCookie)) values.push(...mappedCookie);
  if (typeof mappedCookie === 'string') values.push(mappedCookie);

  const direct = typeof headers.get === 'function' ? headers.get('set-cookie') || headers.get('Set-Cookie') : null;
  if (direct) values.push(...splitSetCookieHeader(direct));

  if (typeof headers.forEach === 'function') {
    headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') values.push(...splitSetCookieHeader(value));
    });
  }

  return Array.from(new Set(values.filter(Boolean)));
}

function splitSetCookieHeader(header: string) {
  return header
    .split(/,(?=\s*[^;,=\s]+=[^;,]*)/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseCookieHeader(header: string) {
  const cookieMap = new Map<string, string>();
  header.split(';').forEach((part) => {
    const pair = part.trim();
    const index = pair.indexOf('=');
    if (index <= 0) return;
    cookieMap.set(pair.slice(0, index), pair.slice(index + 1));
  });
  return cookieMap;
}

function shouldUseLaf(apiBase: string, health: HealthInfo | null) {
  if (health?.backendMode) return health.backendMode === 'laf' || health.backendMode === 'gateway';
  return apiBase.includes('sealoshzh.site') || apiBase.includes('paperbanana-api');
}

function lafEndpoint(apiBase: string) {
  if (apiBase.endsWith('/paperbanana-api')) return apiBase;
  return `${apiBase}/paperbanana-api`;
}

function toLafPipeline(mode: string) {
  if (mode === 'demo_full') return 'full';
  if (mode === 'vanilla') return 'vanilla';
  return 'planner_critic';
}

function normalizeJob(input: unknown): Job {
  const job = (input || {}) as Record<string, unknown>;
  const id = stringValue(job.id || job._id);
  const rawImages = Array.isArray(job.result_images)
    ? job.result_images
    : Array.isArray(job.resultImages)
      ? job.resultImages
      : [];
  const resultImages: ResultImage[] = rawImages.map((image, index) => {
    const item = (image || {}) as Record<string, unknown>;
    return {
      filename: stringValue(item.filename || item.url || `candidate-${index + 1}`),
      url: stringValue(item.url),
      candidate_id: numberValue(item.candidate_id ?? item.candidateId, index),
      mime_type: stringValue(item.mime_type || item.mimeType),
    };
  });

  return {
    id,
    status: stringValue(job.status || 'queued'),
    provider: stringValue(job.provider),
    client_platform: normalizeClientPlatform(job.client_platform || job.clientPlatform),
    user_id: stringValue(job.user_id || job.userId),
    user_email: stringValue(job.user_email || job.userEmail),
    configuration_mode: stringValue(job.configuration_mode || job.configurationMode || 'advanced'),
    method_content: stringValue(job.method_content || job.methodContent),
    caption: stringValue(job.caption),
    infographic_category: stringValue(job.infographic_category || job.infographicCategory || '方法框架图'),
    main_model_name: stringValue(job.main_model_name || job.mainModelName),
    image_gen_model_name: stringValue(job.image_gen_model_name || job.imageModelName),
    pipeline_mode: stringValue(job.pipeline_mode || job.pipelineMode),
    aspect_ratio: stringValue(job.aspect_ratio || job.aspectRatio),
    num_candidates: numberValue(job.num_candidates ?? job.numCandidates, 0),
    max_critic_rounds: numberValue(job.max_critic_rounds ?? job.maxCriticRounds, 0),
    prompt_char_count: numberValue(job.prompt_char_count ?? job.promptCharCount, 0),
    result_image_count: numberValue(job.result_image_count ?? job.resultImageCount, resultImages.length),
    result_images: resultImages,
    logs_tail: stringValue(job.logs_tail || (Array.isArray(job.logs) ? job.logs.slice(-10).join('\n') : '')),
    error: stringValue(job.error),
    created_at: dateValue(job.created_at || job.createdAt),
    updated_at: dateValue(job.updated_at || job.updatedAt),
    started_at: dateValue(job.started_at || job.startedAt),
    completed_at: dateValue(job.completed_at || job.completedAt),
  };
}

function stringValue(value: unknown) {
  return value == null ? '' : String(value);
}

function numberValue(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function dateValue(value: unknown) {
  if (typeof value === 'string' || typeof value === 'number') return value;
  return undefined;
}
