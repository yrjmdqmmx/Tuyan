import { fetchJson } from './client.js';

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
  const data = await fetchJson(apiEndpoint(apiBase));
  if (data.runtime !== 'gateway') throw new Error('当前地址不是图研认证网关');
  return { ...data, backendMode: 'gateway' };
}

export async function createJobRequest(apiBase, health, payload) {
  assertGatewayBackend(health);
  const data = await fetchJson(apiEndpoint(apiBase), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'createJob',
      clientPlatform: CLIENT_PLATFORM,
      configurationMode: payload.configurationMode,
      provider: payload.modelRoutes?.main?.accessProvider || payload.provider,
      apiKeys: payload.apiKeys,
      modelRoutes: payload.modelRoutes,
      thinkingConfig: payload.thinkingConfig,
      providerRegions: payload.providerRegions,
      taskName: payload.taskName,
      methodContent: payload.methodContent,
      negativePrompt: payload.negativePrompt,
      caption: payload.caption,
      infographicCategory: payload.infographicCategory,
      outputFormat: payload.outputFormat,
      imageSize: payload.imageSize,
      mainModelName: payload.mainModelName,
      imageModelName: payload.imageGenModelName,
      referenceVisionModelName: payload.referenceVisionModelName,
      referenceImageMode: payload.referenceImageMode,
      referenceImages: payload.referenceImages || [],
      pipelineMode: toCorePipeline(payload.pipelineMode),
      retrievalSetting: payload.retrievalSetting,
      manualReferenceIds: payload.manualReferenceIds || [],
      aspectRatio: payload.aspectRatio,
      numCandidates: payload.numCandidates,
      maxCriticRounds: payload.maxCriticRounds,
    }),
  });
  return { id: data.jobId, status: data.status };
}

export async function referenceLibraryRequest(apiBase, health, opts = {}) {
  assertGatewayBackend(health);
  if (opts.referenceIds !== undefined) {
    const incompatibleFields = ['scope', 'limit'].filter((field) => opts[field] !== undefined);
    if (incompatibleFields.length) {
      throw new Error(`referenceIds cannot be combined with ${incompatibleFields.join(', ')}`);
    }
  }
  const hasV2OnlyField = ['scope', 'page', 'pageSize', 'visualCategory', 'researchDomain', 'referenceIds']
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
      ...(opts.referenceIds !== undefined ? { referenceIds: opts.referenceIds } : {}),
    }
    : {
      action: 'referenceLibrary',
      taskName: opts.taskName || 'diagram',
      query: opts.query || '',
      limit: opts.limit || 24,
    };
  const data = await fetchJson(apiEndpoint(apiBase), {
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

export async function refineImageRequest(apiBase, health, payload = {}) {
  assertGatewayBackend(health);
  const data = await fetchJson(apiEndpoint(apiBase), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'refineImage',
      clientPlatform: CLIENT_PLATFORM,
      configurationMode: payload.configurationMode,
      provider: payload.modelRoutes?.main?.accessProvider || payload.provider,
      apiKeys: payload.apiKeys,
      modelRoutes: payload.modelRoutes,
      thinkingConfig: payload.thinkingConfig,
      providerRegions: payload.providerRegions,
      mainModelName: payload.mainModelName,
      imageModelName: payload.imageModelName,
      referenceVisionModelName: payload.referenceVisionModelName,
      sourceImageUrl: payload.sourceImageUrl,
      sourceImageObjectKey: payload.sourceImageObjectKey,
      sourceImageUpload: payload.sourceImageUpload ? { objectKey: payload.sourceImageUpload.objectKey } : undefined,
      refineInputs: payload.refineInputs,
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

export async function optimizeInputsRequest(apiBase, health, payload) {
  assertGatewayBackend(health);
  const data = await fetchJson(apiEndpoint(apiBase), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'optimizeInputs',
      target: payload.target,
      inputs: payload.inputs,
      mainRoute: payload.mainRoute,
      providerRegions: payload.providerRegions,
      apiKey: payload.apiKey,
    }),
  });
  return { target: data.target, optimizedText: data.optimizedText };
}

export async function prepareReferenceUploadRequest(apiBase, health, files) {
  assertGatewayBackend(health);
  const data = await fetchJson(apiEndpoint(apiBase), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'prepareReferenceUpload', files }),
  });
  return { uploads: data.uploads || [] };
}

export async function finalizeReferenceUploadRequest(apiBase, health, uploads, options = {}) {
  return referenceUploadLifecycleRequest(apiBase, health, 'finalizeReferenceUpload', uploads, options)
}

export async function abortReferenceUploadRequest(apiBase, health, uploads) {
  return referenceUploadLifecycleRequest(apiBase, health, 'abortReferenceUpload', uploads)
}

async function referenceUploadLifecycleRequest(apiBase, health, action, uploads, options = {}) {
  assertGatewayBackend(health);
  return fetchJson(apiEndpoint(apiBase), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, uploads, ...(options.purpose === 'refine' ? { purpose: 'refine' } : {}) }),
  })
}

export async function modelCapabilityRequest(apiBase, health, provider, model) {
  assertGatewayBackend(health);
  return fetchJson(apiEndpoint(apiBase), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'modelCapability', provider, model }),
  });
}

export async function modelRegistryRequest(apiBase, health, provider = '') {
  assertGatewayBackend(health);
  return fetchJson(apiEndpoint(apiBase), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'modelRegistry', provider: provider || undefined }),
  });
}

async function benchmarkRequest(apiBase, health, body) {
  if (!isGatewayBackend(health)) throw new Error('模型横评需要使用图研认证网关后端。');
  return fetchJson(apiEndpoint(apiBase), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function benchmarkLeaderboardRequest(apiBase, health, options = {}) {
  return benchmarkRequest(apiBase, health, {
    action: 'benchmarkLeaderboard',
    ...(options.lane ? { lane: options.lane } : {}),
    ...(options.axis ? { axis: options.axis } : {}),
  });
}

export function benchmarkModelProfileRequest(apiBase, health, identity) {
  const fields = typeof identity === 'string' ? { modelId: identity } : identity || {};
  return benchmarkRequest(apiBase, health, { action: 'benchmarkModelProfile', ...fields });
}

export function benchmarkCaseEvidenceRequest(apiBase, health, caseId, options = {}) {
  return benchmarkRequest(apiBase, health, {
    action: 'benchmarkCaseEvidence',
    caseId,
    ...(options.cursor ? { cursor: options.cursor } : {}),
    ...(options.limit ? { limit: options.limit } : {}),
  });
}

export function benchmarkMethodologyRequest(apiBase, health) {
  return benchmarkRequest(apiBase, health, { action: 'benchmarkMethodology' });
}

export function benchmarkPromptSubmissionRequest(apiBase, health, payload = {}) {
  return benchmarkRequest(apiBase, health, { action: 'benchmarkPromptSubmission', ...payload });
}

const BENCHMARK_ADMIN_ACTIONS = new Set([
  'adminBenchmarkCandidates',
  'adminBenchmarkApprove',
  'adminBenchmarkControl',
  'adminBenchmarkReviewExport',
  'adminBenchmarkReviewImport',
  'adminBenchmarkPublish',
  'adminBenchmarkPromptQueue',
  'adminBenchmarkPromptDigest',
  'adminBenchmarkPromptDecision',
]);

export function adminBenchmarkRequest(apiBase, health, action, payload = {}) {
  if (!BENCHMARK_ADMIN_ACTIONS.has(action)) throw new Error('未知的模型横评站长动作。');
  return benchmarkRequest(apiBase, health, { action, ...payload });
}

export async function providerAccountCatalogRequest(apiBase, health, payload = {}) {
  if (payload.provider !== 'ark') throw new Error('账号模型验证仅支持 Ark。');
  if (!Array.isArray(payload.probes)) throw new Error('Ark 验证模型列表必须是数组。');
  if (payload.probes.length > 3) throw new Error('Ark 每次最多验证 3 个模型。');
  if (!isGatewayBackend(health)) throw new Error('Ark 模型验证需要使用 图研认证网关后端。');
  return fetchJson(apiEndpoint(apiBase), {
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
  assertGatewayBackend(health);
  const data = await fetchJson(apiEndpoint(apiBase), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'getJob', jobId, adminToken: options.adminToken || undefined }),
  });
  return normalizeJob(data.job);
}

// Admin operations use the authenticated gateway and never accept a browser-supplied admin token.
export async function adminOperationsRequest(apiBase, action, payload = {}, { signal } = {}) {
  const actions = ['adminOverview', 'adminUserList', 'adminUserDetail', 'adminTaskList', 'adminTaskDetail', 'adminTaskFollowup', 'adminCommunityList', 'adminCommunityDetail', 'adminCommunityEdit', 'adminFeedbackList', 'adminBenchmarkPromptDecision'];
  if (!actions.includes(action)) throw new Error('Unsupported admin operation');
  return fetchJson(apiEndpoint(apiBase), { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, action }), signal });
}

export async function adminStatusRequest(apiBase, health) {
  if (isGatewayBackend(health)) {
    const data = await fetchJson(apiEndpoint(apiBase), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'adminStatus' }),
    });
    return { isAdmin: Boolean(data.isAdmin) };
  }
  return { isAdmin: false };
}

export async function adminJobsRequest(apiBase, health) {
  if (isGatewayBackend(health)) {
    const data = await fetchJson(apiEndpoint(apiBase), {
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
  if (isGatewayBackend(health)) {
    const data = await fetchJson(apiEndpoint(apiBase), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'adminUsers', limit: 100 }),
    });
    return { users: (data.users || []).map(normalizeAuthUser) };
  }
  throw new Error('账号后台需要先启用登录网关。');
}

export async function submitFeedbackRequest(apiBase, health, payload = {}) {
  assertGatewayBackend(health);
  const data = await fetchJson(apiEndpoint(apiBase), {
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

export async function adminFeedbackRequest(apiBase, health, opts = {}) {
  if (isGatewayBackend(health)) {
    const data = await fetchJson(apiEndpoint(apiBase), {
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
  throw new Error('反馈后台需要使用 图研认证网关后端。');
}

export async function userJobsRequest(apiBase, health) {
  if (isGatewayBackend(health)) {
    const data = await fetchJson(apiEndpoint(apiBase), {
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

function isGatewayBackend(health) {
  return (!health?.backendMode || health.backendMode === 'gateway')
    && (!health?.runtime || health.runtime === 'gateway');
}
function assertGatewayBackend(health) {
  if (!isGatewayBackend(health)) throw new Error('请使用图研认证网关。');
}

function apiEndpoint(apiBase) {
  if (apiBase.endsWith('/paperbanana-api')) return apiBase;
  return `${apiBase}/paperbanana-api`;
}

function toCorePipeline(mode) {
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
  const negativePrompt = job.negative_prompt ?? job.negativePrompt ?? '';
  return {
    id: job.id || job._id,
    status: job.status,
    recovery: job.recovery || null,
    providerCalls: job.providerCalls || [],
    refineInputs: job.refineInputs || null,
    refineInputMetadata: job.refineInputMetadata || null,
    failure: job.failure || null,
    referenceSelection: job.referenceSelection || null,
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
    configuration_mode: job.configuration_mode || job.configurationMode || 'simple',
    method_content: job.method_content || job.methodContent || '',
    negative_prompt: negativePrompt,
    negativePrompt,
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
    if (accessProvider && modelId) routes[role] = { accessProvider, modelId, ...(accessProvider === 'custom' && route.custom ? { custom: route.custom } : {}) };
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

export async function universalApiCheckRequest(apiBase, health, payload) {
  if (!isGatewayBackend(health)) throw new Error('当前后端不支持通用 API 接入。');
  return fetchJson(apiEndpoint(apiBase), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'universalApiCheck', route: payload.route, connection: payload.connection, selectedModelId: payload.selectedModelId, check: payload.check, apiKeys: payload.apiKeys }) });
}
