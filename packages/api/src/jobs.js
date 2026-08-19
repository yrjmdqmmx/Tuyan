import { fetchJson } from './client.js';

const META_ENV = import.meta.env || {};
const BACKEND_MODE = META_ENV.VITE_BACKEND_MODE || '';
const CLIENT_PLATFORM = 'web';
const CLIENT_PLATFORM_LABELS = Object.freeze({
  web: 'Web 网页',
  miniprogram: '微信小程序',
  android: 'Android',
  ios: 'iOS',
  windows: 'Windows',
  macos: 'macOS',
  harmony: 'HarmonyOS',
});

export async function fetchBackendHealth(apiBase) {
  const candidates = BACKEND_MODE === 'gateway'
    ? [{ mode: 'gateway', url: lafEndpoint(apiBase) }]
    : lafEndpoint(apiBase) === apiBase
    ? [{ mode: 'laf', url: apiBase }]
    : [
        { mode: 'laf', url: lafEndpoint(apiBase) },
        { mode: 'fastapi', url: `${apiBase}/api/health` },
      ];

  let lastError = null;
  for (const candidate of candidates) {
    try {
      const data = await fetchJson(candidate.url);
      if (candidate.mode === 'laf' && data.runtime !== 'laf') throw new Error('当前地址不是 Laf 后端');
      if (candidate.mode === 'gateway' && data.runtime !== 'gateway') throw new Error('当前地址不是认证网关');
      if (candidate.mode === 'fastapi' && !data.ok) throw new Error('当前地址不是 FastAPI 后端');
      return { ...data, backendMode: candidate.mode };
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('后端暂时不可用');
}

export async function createJobRequest(apiBase, health, payload) {
  if (shouldUsePaperbananaApi(apiBase, health)) {
    const data = await fetchJson(lafEndpoint(apiBase), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'createJob',
        clientPlatform: CLIENT_PLATFORM,
        configurationMode: payload.configurationMode,
        provider: payload.modelRoutes?.main?.accessProvider || payload.provider,
        apiKeys: payload.apiKeys,
        modelRoutes: payload.modelRoutes,
        taskName: payload.taskName,
        methodContent: payload.methodContent,
        caption: payload.caption,
        infographicCategory: payload.infographicCategory,
        outputFormat: payload.outputFormat,
        imageSize: payload.imageSize,
        mainModelName: payload.mainModelName,
        imageModelName: payload.imageGenModelName,
        referenceVisionModelName: payload.referenceVisionModelName,
        referenceImageMode: payload.referenceImageMode,
        referenceImages: payload.referenceImages || [],
        pipelineMode: toLafPipeline(payload.pipelineMode),
        retrievalSetting: payload.retrievalSetting,
        manualReferenceIds: payload.manualReferenceIds || [],
        aspectRatio: payload.aspectRatio,
        numCandidates: payload.numCandidates,
        maxCriticRounds: payload.maxCriticRounds,
      }),
    });
    return { id: data.jobId, status: data.status };
  }

  return fetchJson(`${apiBase}/api/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientPlatform: CLIENT_PLATFORM,
      provider: payload.provider,
      configuration_mode: payload.configurationMode,
      api_keys: payload.apiKeys,
      task_name: payload.taskName,
      method_content: payload.methodContent,
      caption: payload.caption,
      infographic_category: payload.infographicCategory,
      output_format: payload.outputFormat,
      image_size: payload.imageSize,
      main_model_name: payload.mainModelName,
      image_gen_model_name: payload.imageGenModelName,
      reference_vision_model_name: payload.referenceVisionModelName,
      reference_image_mode: payload.referenceImageMode,
      reference_images: payload.referenceImages || [],
      pipeline_mode: payload.pipelineMode,
      retrieval_setting: payload.retrievalSetting,
      aspect_ratio: payload.aspectRatio,
      num_candidates: payload.numCandidates,
      max_critic_rounds: payload.maxCriticRounds,
      mock: payload.mock,
    }),
  });
}

export async function referenceLibraryRequest(apiBase, health, opts = {}) {
  if (shouldUsePaperbananaApi(apiBase, health)) {
    const hasV2OnlyField = ['scope', 'page', 'pageSize', 'visualCategory', 'researchDomain']
      .some((field) => opts[field] !== undefined);
    const legacyRequest = !hasV2OnlyField && (opts.taskName !== undefined || opts.limit !== undefined);
    const paginatedRequest = !legacyRequest;
    const requestBody = paginatedRequest
      ? {
          action: 'referenceLibrary',
          ...(opts.scope ? { scope: opts.scope } : {}),
          ...(opts.page !== undefined ? { page: opts.page } : {}),
          ...(opts.pageSize !== undefined ? { pageSize: opts.pageSize } : {}),
          ...(opts.query !== undefined ? { query: opts.query || '' } : {}),
          ...(opts.visualCategory ? { visualCategory: opts.visualCategory } : {}),
          ...(opts.researchDomain ? { researchDomain: opts.researchDomain } : {}),
          ...(opts.taskName ? { taskName: opts.taskName } : {}),
        }
      : {
          action: 'referenceLibrary',
          taskName: opts.taskName || 'diagram',
          query: opts.query || '',
          limit: opts.limit || 24,
        };
    const data = await fetchJson(lafEndpoint(apiBase), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: opts.signal,
    });
    const references = (data.references || []).map(normalizeRetrievedReference);
    const pageSize = positiveInteger(data.pageSize)
      || positiveInteger(paginatedRequest ? opts.pageSize : opts.limit)
      || 12;
    const totalItems = nonNegativeInteger(data.totalItems, references.length);
    return {
      references,
      totalItems,
      totalPages: positiveInteger(data.totalPages) || Math.max(1, Math.ceil(totalItems / pageSize)),
      page: positiveInteger(data.page) || 1,
      pageSize,
      facets: {
        visualCategories: normalizeReferenceFacets(data.facets?.visualCategories),
        researchDomains: normalizeReferenceFacets(data.facets?.researchDomains),
      },
      corpusVersion: String(data.corpusVersion || ''),
    };
  }

  throw new Error('参考案例库需要使用 Laf 或登录网关后端。');
}

export async function refineImageRequest(apiBase, health, payload = {}) {
  if (shouldUsePaperbananaApi(apiBase, health)) {
    const data = await fetchJson(lafEndpoint(apiBase), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'refineImage',
        clientPlatform: CLIENT_PLATFORM,
        configurationMode: payload.configurationMode,
        provider: payload.modelRoutes?.main?.accessProvider || payload.provider,
        apiKeys: payload.apiKeys,
        modelRoutes: payload.modelRoutes,
        mainModelName: payload.mainModelName,
        imageModelName: payload.imageModelName,
        referenceVisionModelName: payload.referenceVisionModelName,
        sourceImageUrl: payload.sourceImageUrl,
        sourceImageObjectKey: payload.sourceImageObjectKey,
        editInstruction: payload.editInstruction,
        aspectRatio: payload.aspectRatio,
        imageSize: payload.imageSize,
      }),
    });
    return {
      id: data.jobId,
      status: data.status,
      refineCapability: data.refineCapability || {
        mode: 'none',
        directEdit: false,
        reason: '当前后端未返回精修能力说明',
      },
    };
  }

  throw new Error('图片精修需要使用 Laf 或登录网关后端。');
}

export async function prepareReferenceUploadRequest(apiBase, health, files) {
  if (shouldUsePaperbananaApi(apiBase, health)) {
    const data = await fetchJson(lafEndpoint(apiBase), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'prepareReferenceUpload', files }),
    });
    return { uploads: data.uploads || [] };
  }

  throw new Error('参考图上传需要使用 Laf 或登录网关后端。');
}

export async function finalizeReferenceUploadRequest(apiBase, health, uploads) {
  return referenceUploadLifecycleRequest(apiBase, health, 'finalizeReferenceUpload', uploads)
}

export async function abortReferenceUploadRequest(apiBase, health, uploads) {
  return referenceUploadLifecycleRequest(apiBase, health, 'abortReferenceUpload', uploads)
}

async function referenceUploadLifecycleRequest(apiBase, health, action, uploads) {
  if (shouldUsePaperbananaApi(apiBase, health)) {
    return fetchJson(lafEndpoint(apiBase), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, uploads }),
    })
  }
  throw new Error('参考图上传生命周期需要使用 Laf 或登录网关后端。')
}

export async function modelCapabilityRequest(apiBase, health, provider, model) {
  if (shouldUsePaperbananaApi(apiBase, health)) {
    return fetchJson(lafEndpoint(apiBase), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'modelCapability', provider, model }),
    });
  }

  return {
    status: 'unknown',
    supportsReferenceImages: false,
    reason: '当前后端不支持模型能力查询',
    source: 'client-fallback',
    cached: false,
  };
}

export async function modelRegistryRequest(apiBase, health, provider = '') {
  if (shouldUsePaperbananaApi(apiBase, health)) {
    return fetchJson(lafEndpoint(apiBase), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'modelRegistry', provider: provider || undefined }),
    });
  }
  throw new Error('当前后端不支持服务端模型目录。');
}

export async function providerAccountCatalogRequest(apiBase, health, payload = {}) {
  if (payload.provider !== 'ark') throw new Error('账号模型验证仅支持 Ark。');
  if (!Array.isArray(payload.probes)) throw new Error('Ark 验证模型列表必须是数组。');
  if (payload.probes.length > 3) throw new Error('Ark 每次最多验证 3 个模型。');
  if (!shouldUsePaperbananaApi(apiBase, health)) throw new Error('Ark 模型验证需要使用 Laf 或登录网关后端。');
  return fetchJson(lafEndpoint(apiBase), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'providerAccountCatalog',
      provider: 'ark',
      apiKeys: { ark: payload.apiKeys?.ark || '' },
      probes: payload.probes,
      confirmPaidImageProbe: payload.confirmPaidImageProbe === true,
    }),
  });
}

export async function getJobRequest(apiBase, health, jobId, options = {}) {
  if (shouldUseLaf(apiBase, health)) {
    const data = await fetchJson(lafEndpoint(apiBase), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'getJob', jobId, adminToken: options.adminToken || undefined }),
    });
    return normalizeJob(data.job);
  }
  return fetchJson(`${apiBase}/api/jobs/${jobId}`);
}

export async function adminStatusRequest(apiBase, health) {
  if (BACKEND_MODE === 'gateway' || health?.backendMode === 'gateway') {
    const data = await fetchJson(lafEndpoint(apiBase), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'adminStatus' }),
    });
    return { isAdmin: Boolean(data.isAdmin) };
  }
  return { isAdmin: false };
}

export async function adminJobsRequest(apiBase, health) {
  if (BACKEND_MODE === 'gateway' || health?.backendMode === 'gateway') {
    const data = await fetchJson(lafEndpoint(apiBase), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'adminJobs', limit: 50 }),
    });
    const jobs = (data.jobs || []).map(normalizeJob);
    return { jobs };
  }
  throw new Error('站长后台需要先启用登录网关。');
}

export async function adminUsersRequest(apiBase, health) {
  if (BACKEND_MODE === 'gateway' || health?.backendMode === 'gateway') {
    const data = await fetchJson(lafEndpoint(apiBase), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'adminUsers', limit: 100 }),
    });
    return { users: (data.users || []).map(normalizeAuthUser) };
  }
  throw new Error('账号后台需要先启用登录网关。');
}

export async function submitFeedbackRequest(apiBase, health, payload = {}) {
  if (shouldUsePaperbananaApi(apiBase, health)) {
    const data = await fetchJson(lafEndpoint(apiBase), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'submitFeedback',
        message: payload.message,
        category: payload.category,
        jobId: payload.jobId,
        platform: payload.platform,
        clientVersion: payload.clientVersion,
        contact: payload.contact,
      }),
    });
    return { ok: data.ok !== false, id: data.id };
  }
  throw new Error('意见反馈需要使用 Laf 或登录网关后端。');
}

export async function adminFeedbackRequest(apiBase, health, opts = {}) {
  if (BACKEND_MODE === 'gateway' || health?.backendMode === 'gateway') {
    const data = await fetchJson(lafEndpoint(apiBase), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'adminFeedback',
        limit: opts.limit || 50,
        status: opts.status || undefined,
      }),
    });
    return { feedback: (data.feedback || []).map(normalizeFeedback) };
  }
  throw new Error('反馈后台需要使用 Laf 或登录网关后端。');
}

export async function userJobsRequest(apiBase, health) {
  if (BACKEND_MODE === 'gateway' || health?.backendMode === 'gateway') {
    const data = await fetchJson(lafEndpoint(apiBase), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'myJobs', limit: 50 }),
    });
    const jobs = (data.jobs || []).map(normalizeJob);
    return { jobs };
  }
  if (!shouldUseLaf(apiBase, health)) {
    const data = await fetchJson(`${apiBase}/api/jobs?scope=mine&limit=50`);
    const jobs = (data.jobs || []).map(normalizeJob);
    return { jobs };
  }
  throw new Error('任务记录需要先启用登录网关。');
}

export async function hydrateRecordImages(apiBase, health, jobs, options = {}) {
  return Promise.all(jobs.map(async (job) => {
    const images = job.result_images || [];
    const references = job.reference_images || [];
    const hasResult = job.result_image_count > 0 || images.length > 0;
    const hasReference = job.reference_image_count > 0 || references.length > 0;
    const allImages = [...images, ...references];
    const needsFreshDetail = allImages.some((image) => image.storage === 'bucket' || (image.url && !image.url.startsWith('data:')));
    if (job.status !== 'succeeded' && !hasReference) return job;
    if (!hasResult && !hasReference && !needsFreshDetail) return job;
    try {
      const detail = await getJobRequest(apiBase, health, job.id, options);
      return { ...job, ...detail };
    } catch {
      return job;
    }
  }));
}

function shouldUsePaperbananaApi(apiBase, health) {
  return BACKEND_MODE === 'gateway' || health?.backendMode === 'gateway' || shouldUseLaf(apiBase, health);
}

function shouldUseLaf(apiBase, health) {
  if (BACKEND_MODE === 'fastapi') return false;
  if (BACKEND_MODE === 'gateway') return true;
  if (BACKEND_MODE === 'laf') return true;
  if (health?.backendMode) return health.backendMode === 'laf';
  return apiBase.includes('paperbanana-api') || apiBase === '';
}

function lafEndpoint(apiBase) {
  if (apiBase.endsWith('/paperbanana-api')) return apiBase;
  return `${apiBase}/paperbanana-api`;
}

function toLafPipeline(mode) {
  if (mode === 'demo_full') return 'full';
  if (mode === 'vanilla') return 'vanilla';
  return 'planner_critic';
}

function normalizeJob(job = {}) {
  const rawReferenceImages = job.reference_images || job.referenceImages || [];
  const clientPlatform = normalizeClientPlatform(job.clientPlatform) || normalizeClientPlatform(job.client_platform);
  const modelRoutes = normalizeModelRoutes(job.modelRoutes ?? job.model_routes);
  const routingMode = job.routingMode ?? job.routing_mode ?? '';
  const modelRoutingVersion = job.modelRoutingVersion ?? job.model_routing_version ?? '';
  const modelRoutingSource = job.modelRoutingSource ?? job.model_routing_source ?? '';
  return {
    id: job.id || job._id,
    status: job.status,
    provider: job.provider,
    modelRoutes,
    model_routes: modelRoutes,
    routingMode,
    routing_mode: routingMode,
    modelRoutingVersion,
    model_routing_version: modelRoutingVersion,
    modelRoutingSource,
    model_routing_source: modelRoutingSource,
    clientPlatform,
    client_platform: clientPlatform,
    job_type: job.job_type || job.jobType || 'generate',
    user_id: job.user_id || job.userId || '',
    user_email: job.user_email || job.userEmail || '',
    configuration_mode: job.configuration_mode || job.configurationMode || 'advanced',
    method_content: job.method_content || job.methodContent || '',
    caption: job.caption || '',
    infographic_category: job.infographic_category || job.infographicCategory || '方法框架图',
    output_format: job.output_format || job.outputFormat || 'png',
    main_model_name: job.main_model_name || job.mainModelName || '',
    image_gen_model_name: job.image_gen_model_name || job.imageModelName || '',
    image_refine_mode: job.image_refine_mode || job.imageRefineMode || '',
    image_refine_reason: job.image_refine_reason || job.imageRefineReason || '',
    refine_mode: job.refine_mode || job.refineMode || '',
    refine_reason: job.refine_reason || job.refineReason || '',
    reference_vision_model_name: job.reference_vision_model_name || job.referenceVisionModelName || '',
    reference_image_mode: job.reference_image_mode || job.referenceImageMode || (rawReferenceImages.length ? 'vision_model' : ''),
    reference_image_mode_used: job.reference_image_mode_used || job.referenceImageModeUsed || (rawReferenceImages.length ? 'vision_model' : 'none'),
    pipeline_mode: job.pipeline_mode || job.pipelineMode || '',
    task_name: job.task_name || job.taskName || 'diagram',
    retrieval_setting: job.retrieval_setting || job.retrievalSetting || 'none',
    retrieved_reference_ids: job.retrieved_reference_ids || job.retrievedReferenceIds || [],
    retrieved_references: (job.retrieved_references || job.retrievedReferences || []).map(normalizeRetrievedReference),
    stages: (job.stages || []).map(normalizeJobStage),
    critic_mode: job.critic_mode || job.criticMode || '',
    aspect_ratio: job.aspect_ratio || job.aspectRatio || '',
    image_size: job.image_size || job.imageSize || '',
    num_candidates: job.num_candidates || job.numCandidates || 0,
    max_critic_rounds: job.max_critic_rounds || job.maxCriticRounds || 0,
    prompt_char_count: job.prompt_char_count || job.promptCharCount || 0,
    result_image_count: job.result_image_count || job.resultImageCount || (job.result_images || job.resultImages || []).length || 0,
    result_images: (job.result_images || job.resultImages || []).map((image, index) => ({
      filename: image.filename || image.url || `${index}`,
      object_key: image.object_key || image.objectKey || '',
      url: image.url,
      storage: image.storage || '',
      candidate_id: image.candidate_id ?? image.candidateId ?? index,
      mime_type: image.mime_type || image.mimeType || '',
    })),
    reference_image_count: job.reference_image_count || job.referenceImageCount || rawReferenceImages.length || 0,
    reference_images: rawReferenceImages.map((image, index) => ({
      filename: image.filename || `reference-${index + 1}`,
      object_key: image.object_key || image.objectKey || '',
      url: image.url,
      storage: image.storage || '',
      mime_type: image.mime_type || image.mimeType || '',
      size: Number(image.size || 0),
    })),
    logs_tail: job.logs_tail || (Array.isArray(job.logs) ? job.logs.slice(-10).join('\n') : ''),
    error: job.error || '',
    created_at: job.created_at || job.createdAt,
    updated_at: job.updated_at || job.updatedAt,
    started_at: job.started_at || job.startedAt,
    completed_at: job.completed_at || job.completedAt,
  };
}

function normalizeModelRoutes(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const routes = {};
  for (const role of ['main', 'image', 'vision']) {
    const route = value[role];
    if (!route || typeof route !== 'object' || Array.isArray(route)) continue;
    const accessProvider = typeof route.accessProvider === 'string' ? route.accessProvider.trim() : '';
    const modelId = typeof route.modelId === 'string' ? route.modelId.trim() : '';
    if (accessProvider && modelId) routes[role] = { accessProvider, modelId };
  }
  return Object.keys(routes).length ? routes : undefined;
}

function normalizeClientPlatform(value) {
  const platform = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return Object.hasOwn(CLIENT_PLATFORM_LABELS, platform) ? platform : '';
}

export function formatClientPlatform(value) {
  return CLIENT_PLATFORM_LABELS[normalizeClientPlatform(value)] || '未记录';
}

function normalizeRetrievedReference(item = {}) {
  const shortIntroZh = item.shortIntroZh || item.short_intro_zh || item.introZh || item.intro_zh || '';
  return {
    id: item.id || item._id || '',
    task_name: item.task_name || item.taskName || 'diagram',
    title: item.title || item.visualIntent || item.caption || '',
    summary: item.summary || item.content || item.methodExcerpt || '',
    titleZh: item.titleZh || item.title_zh || '',
    introZh: item.introZh || item.intro_zh || '',
    shortIntroZh,
    detailZh: item.detailZh || item.detail_zh || shortIntroZh,
    visualCategory: item.visualCategory || item.visual_category || '',
    researchDomain: item.researchDomain || item.research_domain || '',
    keywords: Array.isArray(item.keywords) ? item.keywords.map(String).filter(Boolean) : [],
    corpusVersion: item.corpusVersion || item.corpus_version || item.localizationVersion || '',
    image_url: item.image_url || item.imageUrl || item.url || '',
    image_object_key: item.image_object_key || item.imageObjectKey || item.objectKey || '',
    source: item.source || 'paperbanana-bench',
  };
}

function normalizeReferenceFacets(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({ value: String(item?.value || ''), count: nonNegativeInteger(item?.count, 0) }))
    .filter((item) => item.value && item.count > 0);
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : 0;
}

function nonNegativeInteger(value, fallback = 0) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : fallback;
}

function normalizeJobStage(stage = {}) {
  return {
    id: stage.id || stage._id || '',
    candidate_id: Number(stage.candidate_id ?? stage.candidateId ?? 0),
    type: stage.type || '',
    title: stage.title || '',
    round: Number(stage.round || 0),
    text: stage.text || stage.description || stage.message || '',
    suggestion: stage.suggestion || stage.criticSuggestion || '',
    image: stage.image ? normalizeStageImage(stage.image) : null,
    started_at: stage.started_at || stage.startedAt,
    completed_at: stage.completed_at || stage.completedAt,
    duration_ms: Number(stage.duration_ms ?? stage.durationMs ?? 0),
    error: stage.error || '',
  };
}

function normalizeStageImage(image = {}) {
  return {
    filename: image.filename || image.url || '',
    url: image.url || '',
    storage: image.storage || '',
    mime_type: image.mime_type || image.mimeType || '',
  };
}

function normalizeAuthUser(user = {}) {
  return {
    id: user.id || user._id || '',
    email: user.email || '',
    name: user.name || '',
    email_verified: Boolean(user.email_verified ?? user.emailVerified),
    image: user.image || '',
    created_at: user.created_at || user.createdAt,
    updated_at: user.updated_at || user.updatedAt,
    last_login_at: user.last_login_at || user.lastLoginAt,
    session_count: Number(user.session_count ?? user.sessionCount ?? 0),
    last_ip_address: user.last_ip_address || user.lastIpAddress || '',
    last_user_agent: user.last_user_agent || user.lastUserAgent || '',
  };
}

function normalizeFeedback(item = {}) {
  return {
    id: item.id || item._id || '',
    message: item.message || '',
    category: item.category || 'other',
    job_id: item.job_id || item.jobId || '',
    platform: item.platform || '',
    client_version: item.client_version || item.clientVersion || '',
    contact: item.contact || '',
    user_id: item.user_id || item.userId || '',
    user_email: item.user_email || item.userEmail || '',
    client_ip: item.client_ip || item.clientIp || '',
    user_agent: item.user_agent || item.userAgent || '',
    status: item.status || 'new',
    created_at: item.created_at || item.createdAt,
  };
}
