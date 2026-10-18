import { workspaceExecutionMiddleware } from './workspace-execution.js';
import {workflowRequiredRoles} from './workflow.js';
import cors from 'cors';
import express from 'express';
import { gzip } from 'node:zlib';
import { promisify } from 'node:util';

import { createBoundedAuthHandler } from './auth-http.js';
import { readGuestIdentity, resolveGuestIdentity } from './guest-identity.js';
import { createTuyanMcpRouter } from './mcp.js';
import { authorizeJobOwner, normalizeRefineSource } from './ownership.js';
import { redactErrorForLog } from './redaction.js';
import { createWorkspaceHistory } from './workspace-history.js';
import { createWorkspaceRouter } from './workspace-sync.js';
import { createModelLibraryRouter } from './model-library.js';

const gzipAsync = promisify(gzip);

const ADMIN_BACKEND_ACTIONS = new Set([
  'adminOperationsOverview',
  'adminTaskList',
  'adminTaskDetail',
  'adminTaskFollowup',
  'adminCommunityList',
  'adminCommunityDetail',
  'adminCommunityEdit',
  'adminContactMatches',
  'adminFeedbackList',
  'adminJobs',
  'adminFeedback',
  'importReferences',
  'evaluateJob',
  'pingPlotWorker',
  'initDatabase',
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
const ADMIN_MUTATING_ACTIONS = new Set(['adminTaskFollowup', 'adminCommunityEdit', 'adminBenchmarkPromptDecision', 'importReferences', 'evaluateJob', 'initDatabase']);
const MATERIAL_ACTIONS=new Set(['prepareMaterialUpload','finalizeMaterialUpload','getMaterial','listMaterialFiles','readMaterial','deleteMaterial']);
const MAINTENANCE_ACTIONS = new Set([
  ...MATERIAL_ACTIONS,
  'tokenDanceResume', 'providerResume', 'tokenDanceAuthorize', 'tokenDanceExchange', 'tokenDancePaymentCreate',
  'createJob',
  'refineImage',
  'prepareReferenceUpload',
  'finalizeReferenceUpload',
  'abortReferenceUpload',
  'providerAccountCatalog', 'universalApiCheck',
  'optimizeInputs',
  'submitFeedback',
  'benchmarkPromptSubmission',
  ...ADMIN_MUTATING_ACTIONS,
]);

export function createApp({
  config,
  auth,
  backend,
  isMaintenance,
  nowSeconds = () => Math.floor(Date.now() / 1000),
  randomBytes,
  logger = console,
  accountDeletion,
}) {
  const app = express();
  const accountDeletionOperations = new Map();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);
  app.use('/mcp', createTuyanMcpRouter({ logger, nowMs: () => nowSeconds() * 1000 }));

  const origins = new Set(config.frontendOrigins);
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || origins.has(origin)) return callback(null, true);
        const error = new Error('Origin not allowed');
        error.status = 403;
        return callback(error);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Workspace-Account'],
    }),
  );

  app.all('/api/auth/*', (request, response, next) => {
    const path = request.path.replace(/\/+$/, '');
    if (isMaintenance() && ((request.method === 'POST' && path.startsWith('/api/auth/watcha/'))
      || path === '/api/auth/oauth2/callback/watcha' || path === '/api/auth/watcha/mini-launch')) return maintenanceResponse(response, config);
    next();
  }, createBoundedAuthHandler(auth.webHandler));
  app.use('/api/workspace', createWorkspaceRouter({ auth, store: auth.workspaceStore, frontendOrigins: config.frontendOrigins, isMaintenance, history:createWorkspaceHistory({backend,auth}) }));
  app.use('/api/model-library', createModelLibraryRouter({ auth, store: auth.modelLibraryStore, frontendOrigins: config.frontendOrigins, isMaintenance }));
  app.use(express.json({ limit: '1mb' }));
  app.use('/paperbanana-api', workspaceExecutionMiddleware({ auth, backend, store: auth.workspaceExecutionStore, libraryStore: auth.modelLibraryStore, workspaceStore: auth.workspaceStore, frontendOrigins: config.frontendOrigins, isMaintenance }));
  app.use((request, response, next) => {
    response.on('finish', () => {
      logger.info?.('request completed', {
        method: request.method,
        path: request.path,
        status: response.statusCode,
      });
    });
    next();
  });

  const cachedHealth = () => {
    const authStatus = auth.cachedStatus();
    const backendStatus = backend.cachedStatus();
    return {
      code: 0,
      ok: true,
      runtime: 'gateway',
      workspaceExecutionContractVersion: 1,
      executionMode: 'production',
      executionEnabled: Boolean(auth.workspaceStore && auth.modelLibraryStore && auth.workspaceExecutionStore),
      inputOptimizationMaterialsVersion: 1,
      auth: 'better-auth',
      authReady: authStatus.ok === true,
      backend: backendStatus,
      dependencies: {
        auth: authStatus,
        backend: backendStatus,
      },
    };
  };

  app.get('/health', (_request, response) => response.status(200).json(cachedHealth()));
  app.get('/paperbanana-api', (_request, response) => response.status(200).json(cachedHealth()));
  app.get(
    '/ready',
    asyncRoute(async (request, response) => {
      const context = requestContext(request);
      const [authStatus, backendStatus] = await Promise.all([
        auth.ready().catch((error) => ({ ok: false, error: safeMessage(error) })),
        backend.ready(context).catch((error) => ({ ok: false, error: error.code || safeMessage(error) })),
      ]);
      const ok = Boolean(authStatus?.ok && backendStatus?.ok);
      return response.status(ok ? 200 : 503).json({
        code: ok ? 0 : 503,
        ok,
        runtime: 'gateway',
        auth: 'better-auth',
        authReady: authStatus?.ok === true,
        backend: backendStatus,
        dependencies: {
          auth: authStatus,
          backend: backendStatus,
        },
      });
    }),
  );

  app.get('/api/account/status', asyncRoute(async (request, response) => {
    const session = await requireSession(auth, request);
    if (!accountDeletion) return response.status(503).json({ code: 503, error: 'ACCOUNT_DELETION_CONTRACT_UNAVAILABLE' });
    return relay(response, await accountDeletion.status(String(session.user.id || '')));
  }));

  app.post(
    '/api/account/delete',
    asyncRoute(async (request, response) => {
      if (isMaintenance()) return maintenanceResponse(response, config);
      const session = await requireSession(auth, request);
      const sessionEmail = normalizedEmail(session.user.email);
      const requestedEmail = normalizedEmail(request.body?.email);
      const password = String(request.body?.password || '');
      const confirmationToken = String(request.body?.confirmationToken || '');
      if (!requestedEmail || (!password && !confirmationToken)) {
        return response.status(400).json({ code: 400, error: 'email and password or confirmationToken are required' });
      }
      if (sessionEmail !== requestedEmail) {
        return response.status(403).json({ code: 403, error: 'EMAIL_MISMATCH' });
      }

      const passwordValid = confirmationToken
        ? await auth.consumeDeletionConfirmation?.({ confirmationToken, session })
        : await auth.verifyPassword({ password, headers: request.headers });
      if (!passwordValid) {
        return response.status(401).json({ code: 401, error: confirmationToken ? 'WATCHA_INVALID_CONFIRMATION' : 'INVALID_PASSWORD' });
      }

      const userId = String(session.user.id || '');
      if (!accountDeletion) return response.status(503).json({ code: 503, error: 'ACCOUNT_DELETION_CONTRACT_UNAVAILABLE' });
      const deletion = await runOnce(accountDeletionOperations, userId, () => accountDeletion.request(userId));
      if (deletion.status !== 200 || deletion.data?.code !== 0 || deletion.data?.ok !== true) return relay(response, deletion);
      try {
        await auth.clearSessionCookie(request, response);
      } catch (error) {
        logger.warn?.('account deleted but session cookie clearing failed', {
          error: redactErrorForLog(error),
        });
      }
      return response.status(200).json({ code: 0, ok: true });
    }),
  );

  app.post(
    '/paperbanana-api',
    asyncRoute(async (request, response) => {
      const action = String(request.body?.action || 'health');
      if (action === 'health') return response.status(200).json(cachedHealth());
      if (MAINTENANCE_ACTIONS.has(action) && isMaintenance()) {
        return maintenanceResponse(response, config);
      }

      const context = requestContext(request);
      if (auth.deletionStore && (MATERIAL_ACTIONS.has(action)||['createJob', 'refineImage', 'prepareReferenceUpload', 'submitFeedback', 'benchmarkPromptSubmission', 'optimizeInputs'].includes(action))) {
        const session = await auth.optionalSession(request);
        const operation = session?.user?.id ? await auth.deletionStore.get(String(session.user.id)) : null;
        if (operation) return response.status(409).json({ code: 409, error: operation.status === 'review_required' ? 'ACCOUNT_DELETION_REVIEW_REQUIRED' : 'ACCOUNT_DELETION_PROCESSING' });
      }
      if (action === 'adminStatus') {
        const session = await auth.optionalSession(request);
        return response.status(200).json({ code: 0, isAdmin: isAdminUser(config, session?.user) });
      }

      if (action.startsWith('admin')) response.set('Cache-Control', 'no-store');
      if (['adminOverview', 'adminUserList', 'adminUserDetail'].includes(action)) {
        const adminSession = await requireAdmin(config, auth, request);
        if (!auth.adminAccounts) return response.status(503).json({ code: 503, error: '后台账号查询暂不可用' });
        const adminOptions = { adminAction: true, adminUserId: String(adminSession.user.id) };
        if (action === 'adminUserDetail') return response.json({ code: 0, ...await auth.adminAccounts.detail(request.body) });
        if (action === 'adminUserList') {
          let contactIds = [];
          if (request.body.searchBy === 'contact' && request.body.q) {
            const match = await backend.call({ action: 'adminContactMatches', q: request.body.q }, context, adminOptions);
            if (match.status !== 200 || match.data?.code !== 0) return relay(response, match);
            contactIds = match.data.userIds;
          }
          return response.json({ code: 0, ...await auth.adminAccounts.list(request.body, contactIds) });
        }
        const [accounts, operations] = await Promise.allSettled([
          auth.adminAccounts.overview(request.body),
          backend.call({ action: 'adminOperationsOverview', from: request.body.from, to: request.body.to }, context, adminOptions),
        ]);
        if (accounts.status === 'rejected' && accounts.reason?.status === 400) throw accounts.reason;
        const ops = operations.status === 'fulfilled' && operations.value.status === 200 && operations.value.data?.code === 0 ? operations.value.data : null;
        return response.json({ code: 0, users: accounts.status === 'fulfilled' ? { available: true, ...accounts.value } : { available: false, error: '账号统计暂不可用' },
          tasks: ops ? { available: true, ...ops.tasks } : { available: false, error: '任务统计暂不可用' }, community: ops?.community || { available: false, error: '社区统计暂不可用' }, asOf: new Date().toISOString() });
      }

      if (action === 'adminTokenDancePricing') {
        const session = await requireAdmin(config, auth, request);
        return relay(response, await backend.call({ action }, context, { adminAction: true, adminUserId: String(session.user.id) }));
      }
      if (['tokenDanceStatus', 'tokenDanceAuthorize', 'tokenDanceExchange', 'tokenDanceCancel', 'tokenDanceDisconnect', 'tokenDanceBalance', 'tokenDancePaymentCreate', 'tokenDancePaymentStatus', 'tokenDancePayments', 'tokenDanceResume', 'providerResume'].includes(action)) {
        const origin = request.get('origin');
        if (origin && !config.frontendOrigins.includes(origin)) return response.status(403).json({ code: 403, error: '不受信任的请求来源。' });
        if (backend.mode !== 'node') return response.status(503).json({ code: 503, error: '观猹 TokenDance 需要 Node Core 连接服务。' });
        const session = await requireSession(auth, request);
        return relay(response, await backend.call(request.body, context, { authUserId: String(session.user.id), timeoutMs: 40_000 }));
      }
      if (action === 'adminUsers') {
        await requireAdmin(config, auth, request);
        return response.status(200).json({ code: 0, ...(await auth.listUsers(request.body)) });
      }

      if (ADMIN_BACKEND_ACTIONS.has(action)) {
        const adminSession = await requireAdmin(config, auth, request);
        return relay(
          response,
          await backend.call(request.body, context, { adminAction: true, adminUserId: String(adminSession.user.id) }),
        );
      }

      if (
        action === 'modelRegistry'
        || action === 'modelCapability'
        || action === 'referenceLibrary'
        || action === 'benchmarkLeaderboard'
        || action === 'benchmarkModelProfile'
        || action === 'benchmarkMethodology'
        || action === 'benchmarkCaseEvidence'
      ) {
        // Evidence reads verify complete OSS bytes, hashes and metadata. Allow
        // their cross-region I/O a separate budget without slowing account checks.
        const evidenceRead = action === 'benchmarkModelProfile' || action === 'benchmarkCaseEvidence';
        const result = await backend.call(request.body, context, evidenceRead ? { timeoutMs: 60_000 } : undefined);
        return action === 'modelRegistry' ? relayModelRegistry(request, response, result) : relay(response, result);
      }

      if (action === 'benchmarkPromptSubmission') {
        const session = await requireSession(auth, request);
        return relay(
          response,
          await backend.call(
            {
              ...request.body,
              userId: String(session.user.id || ''),
              userEmail: String(session.user.email || ''),
              clientIp: context.clientIp,
            },
            context,
          ),
        );
      }

      if (action === 'optimizeInputs') {
        const td = ['tokendance','custom'].includes(request.body?.mainRoute?.accessProvider) || request.body?.materialFiles !== undefined;
        const session = td ? await requireSession(auth, request) : null;
        return relay(response, await backend.call({ ...normalizeOptimizeInputsBody(request.body), ...(td ? { userId: String(session.user.id) } : {}) }, context, { timeoutMs: request.body?.materialFiles?.length ? 120_000 : 50_000, ...(td ? { authUserId: String(session.user.id) } : {}) }));
      }

      if(MATERIAL_ACTIONS.has(action)){
        const principal=await writePrincipal(config,auth,request,response,nowSeconds,randomBytes);
        const {files,materialId,operation,jobId}=request.body||{};
        return relay(response,await backend.call({action,files,materialId,operation,jobId,userId:principal.userId,userEmail:principal.userEmail},context,{timeoutMs:75000,...(!principal.guestOwner?{authUserId:principal.userId}:{})}));
      }
      if (action === 'submitFeedback') {
        const session = await auth.optionalSession(request);
        return relay(
          response,
          await backend.call(
            {
              ...normalizeFeedbackBody(request.body),
              userId: String(session?.user?.id || ''),
              userEmail: String(session?.user?.email || ''),
            },
            context,
          ),
        );
      }

      if (
        action === 'createJob' ||
        action === 'prepareReferenceUpload' ||
        action === 'finalizeReferenceUpload' ||
        action === 'abortReferenceUpload' ||
        action === 'providerAccountCatalog' || action === 'universalApiCheck'
      ) {
        const activeRoles = action==='createJob' ? workflowRequiredRoles({...request.body,outputFormat:request.body.outputFormat || request.body.output_format,referenceImageMode:'vision_model'}) : ['main','image','vision'];
        // Basic-flow direct vision depends on Core's authoritative model capability.
        // Core checks the actual required roles and trusted auth header before any call.
        const td = ['tokendance', 'custom'].includes(request.body?.provider) || action === 'universalApiCheck' || Object.entries(request.body?.modelRoutes || {}).some(([role, route]) => activeRoles.includes(role) && (role !== 'vision' || request.body?.visionMode !== 'none' && !(action==='createJob' && request.body?.pipelineMode==='vanilla' && request.body?.taskName!=='plot')) && ['tokendance', 'custom'].includes(route?.accessProvider));
        if (td) await requireSession(auth, request);
        const principal = await writePrincipal(config, auth, request, response, nowSeconds, randomBytes);
        const body = action === 'createJob'
          ? normalizeCreateJobBody(request.body)
          : action === 'providerAccountCatalog'
            ? normalizeProviderAccountCatalogBody(request.body)
            : { ...request.body };
        return relay(
          response,
          await backend.call(
            {
              ...body,
              userId: principal.userId,
              userEmail: principal.userEmail,
            },
            context,
            { ...(!principal.guestOwner ? { authUserId: principal.userId } : {}), ...(action === 'finalizeReferenceUpload' ? { timeoutMs: 40_000 } : {}), ...(action === 'providerAccountCatalog' && request.body.mode === 'catalog' ? { timeoutMs: 60_000 } : {}) },
          ),
        );
      }

      if (action === 'refineImage') {
        const td = ['tokendance', 'custom'].includes(request.body?.provider) || action === 'universalApiCheck' || Object.entries(request.body?.modelRoutes || {}).some(([role, route]) => (role !== 'vision' || request.body?.visionMode !== 'none') && ['tokendance', 'custom'].includes(route?.accessProvider));
        if (td) await requireSession(auth, request);
        const principal = await writePrincipal(config, auth, request, response, nowSeconds, randomBytes);
        const source = normalizeRefineSource(request.body, {
          backendMode: backend.mode,
          bucket: config.oss.bucket,
          publicEndpoint: config.oss.publicEndpoint,
        });
        if (source.jobId) {
          const sourceJob = await backend.call({ action: 'getJob', jobId: source.jobId }, context);
          if (
            sourceJob.status < 200 ||
            sourceJob.status >= 300 ||
            Number(sourceJob.data?.code || 0) !== 0
          ) {
            return relay(response, sourceJob);
          }
          if (!authorizeJobOwner(sourceJob.data?.job, principal)) return forbidden(response);
        }
        const body = {
          ...request.body,
          ...source.payload,
          ...(hasModelRoutes(request.body)
            ? {}
            : {
                mainModelName: normalizeModelName(request.body?.provider, request.body?.mainModelName),
                imageModelName: normalizeModelName(request.body?.provider, request.body?.imageModelName),
              }),
          userId: principal.userId,
          userEmail: principal.userEmail,
        };
        if (source.objectKey) delete body.sourceImageUrl;
        if (source.uploaded) {
          delete body.sourceImageUrl;
          delete body.sourceImageObjectKey;
        } else delete body.sourceImageUpload;
        return relay(response, await backend.call(body, context, td ? { authUserId: principal.userId } : {}));
      }

      if (action === 'journalFigureExport') {
        const principal = await writePrincipal(config, auth, request, response, nowSeconds, randomBytes);
        const result = await backend.call({action:'getJob',jobId:request.body.jobId},context);
        if (result.status < 200 || result.status >= 300 || Number(result.data?.code || 0) !== 0) return relay(response,result);
        if (!authorizeJobOwner(result.data?.job,principal)) return forbidden(response);
        return relay(response,await backend.call({action:'journalFigureExport',jobId:request.body.jobId,candidateId:request.body.candidateId,format:request.body.format,flattenWhite:request.body.flattenWhite,download:request.body.download,userId:principal.userId},context));
      }

      if (action === 'getJob') {
        const session = await auth.optionalSession(request);
        const result = await backend.call(request.body, context);
        if (
          result.status < 200 ||
          result.status >= 300 ||
          Number(result.data?.code || 0) !== 0
        ) {
          return relay(response, result);
        }
        const guest = readGuestIdentity({
          cookieHeader: request.get('cookie'),
          config: config.guestCookie,
          nowSeconds: nowSeconds(),
        });
        if (guest?.setCookie) response.append('Set-Cookie', guest.setCookie);
        if (
          !authorizeJobOwner(result.data?.job, {
            userId: session?.user?.id,
            email: session?.user?.email,
            guestOwner: guest?.owner,
            isAdmin: isAdminUser(config, session?.user),
          })
        ) {
          return forbidden(response);
        }
        return relay(response, result);
      }

      if (action === 'myJobs') {
        const session = await requireSession(auth, request);
        return relay(
          response,
          await backend.call(
            {
              action: 'userJobs',
              userId: String(session.user.id || ''),
              limit: request.body?.limit || 50,
              offset: request.body?.offset || 0,
            },
            context,
            { authUserId: String(session.user.id || '') },
          ),
        );
      }

      return response.status(400).json({ code: 400, error: `Unknown gateway action: ${action}` });
    }),
  );

  app.use((error, _request, response, next) => {
    if (error?.type === 'entity.too.large') {
      return response.status(413).json({ code: 413, error: 'Request body too large' });
    }
    if (error?.type === 'entity.parse.failed') {
      return response.status(400).json({ code: 400, error: 'Invalid JSON body' });
    }
    if (response.headersSent) return next(error);
    const status = boundedStatus(error?.status || error?.statusCode || 500);
    const publicError = publicErrorMessage(error, status);
    logger.error?.('request failed', {
      status,
      code: error?.code || 'REQUEST_FAILED',
      error: redactErrorForLog(error),
    });
    return response.status(status).json({ code: status, error: publicError });
  });

  return app;
}

async function runOnce(operations, key, operation) {
  const existing = operations.get(key);
  if (existing) return existing;
  const pending = Promise.resolve().then(operation);
  operations.set(key, pending);
  try {
    return await pending;
  } finally {
    if (operations.get(key) === pending) operations.delete(key);
  }
}

function asyncRoute(handler) {
  return (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);
}

function relay(response, result) {
  return response.status(boundedStatus(result?.status || 502)).json(result?.data || {});
}

async function relayModelRegistry(request, response, result) {
  // Only the public capability catalog uses this path. Do not compress account,
  // credential, authorization or task responses, or cache them alongside it.
  response.set('Cache-Control', 'no-store');
  response.vary('Accept-Encoding');
  const data = result?.data;
  if (result?.status !== 200 || data?.code !== 0 || !data.providers
    || typeof data.providers !== 'object' || Array.isArray(data.providers)
    || request.acceptsEncodings('gzip', 'identity') !== 'gzip') return relay(response, result);
  const json = Buffer.from(JSON.stringify(data));
  if (json.length < 1024) return relay(response, result);
  const compressed = await gzipAsync(json);
  if (compressed.length >= json.length) return relay(response, result);
  return response.status(200).type('application/json').set('Content-Encoding', 'gzip').send(compressed);
}

function maintenanceResponse(response, config) {
  response.set('Retry-After', String(config.maintenance.retryAfterSeconds));
  return response.status(503).json({ code: 503, error: 'MAINTENANCE_MODE' });
}

function requestContext(request) {
  return {
    clientIp: safeHeader(request.ip, 128),
    userAgent: safeHeader(request.get('user-agent'), 512),
  };
}

function safeHeader(value, maxLength) {
  return String(value || '').replace(/[\r\n]/g, '').trim().slice(0, maxLength);
}

async function writePrincipal(config, auth, request, response, nowSeconds, randomBytes) {
  const session = await auth.optionalSession(request);
  if (session?.user) {
    return {
      userId: String(session.user.id || ''),
      userEmail: String(session.user.email || ''),
      guestOwner: '',
      isAdmin: isAdminUser(config, session.user),
    };
  }
  const guest = resolveGuestIdentity({
    cookieHeader: request.get('cookie'),
    config: config.guestCookie,
    nowSeconds: nowSeconds(),
    randomBytes,
  });
  if (guest.setCookie) response.append('Set-Cookie', guest.setCookie);
  return { userId: guest.owner, userEmail: '', guestOwner: guest.owner, isAdmin: false };
}

async function requireSession(auth, request) {
  const session = await auth.optionalSession(request);
  if (!session?.user) {
    const error = new Error('请先登录后再使用任务记录。');
    error.status = 401;
    throw error;
  }
  return session;
}

async function requireAdmin(config, auth, request) {
  const session = await auth.optionalSession(request);
  if (isAdminUser(config, session?.user)) return session;
  const error = new Error(session?.user ? 'Forbidden' : '请先登录管理员账号。');
  error.status = session?.user ? 403 : 401;
  throw error;
}

function isAdminUser(config, user) {
  const userId = String(user?.id || '').trim();
  return Boolean(userId && config.adminUserIds.has(userId));
}

function forbidden(response) {
  return response.status(403).json({ code: 403, error: 'Forbidden' });
}

function normalizeCreateJobBody(body) {
  if (hasModelRoutes(body)) return { ...body };
  return {
    ...body,
    mainModelName: normalizeModelName(body?.provider, body?.mainModelName),
    imageModelName: normalizeModelName(body?.provider, body?.imageModelName),
  };
}

function hasModelRoutes(body) {
  return body?.modelRoutes !== undefined && body?.modelRoutes !== null;
}

function normalizeFeedbackBody(body) {
  return {
    action: 'submitFeedback',
    message: body?.message,
    category: body?.category,
    jobId: body?.jobId,
    platform: body?.platform,
    clientVersion: body?.clientVersion,
    contact: body?.contact,
  };
}

function normalizeProviderAccountCatalogBody(body) {
  if (body?.mode === 'catalog') {
    const provider = typeof body.provider === 'string' ? body.provider : '';
    const key = typeof body.apiKeys?.[provider] === 'string' ? body.apiKeys[provider] : '';
    return { action:'providerAccountCatalog', mode:'catalog', provider,
      apiKeys: { [provider]: key }, continuation:body.continuation, region:body.region, workspaceId:body.workspaceId,
      privateModels:body.privateModels === true,
      ...(provider==='ark' ? {catalogCredentials:{accessKeyId:body.catalogCredentials?.accessKeyId,secretAccessKey:body.catalogCredentials?.secretAccessKey,sessionToken:body.catalogCredentials?.sessionToken}} : provider==='sensenova' ? {catalogCredentials:{token:body.catalogCredentials?.token}} : {}),
      // Preserve forbidden fields so Core rejects a mixed metadata/inference request.
      ...(body.probes !== undefined ? {probes:body.probes} : {}),
      ...(body.confirmPaidImageProbe !== undefined ? {confirmPaidImageProbe:body.confirmPaidImageProbe} : {}),
    };
  }
  const arkKey = typeof body?.apiKeys?.ark === 'string' ? body.apiKeys.ark : undefined;
  return {
    action: 'providerAccountCatalog',
    provider: body?.provider,
    apiKeys: arkKey === undefined ? {} : { ark: arkKey },
    probes: body?.probes,
    confirmPaidImageProbe: body?.confirmPaidImageProbe,
  };
}

function normalizeOptimizeInputsBody(body) {
  return {
    action: 'optimizeInputs',
    target: body?.target,
    ...(body?.materialFiles !== undefined ? { materialFiles: body.materialFiles } : {}),
    inputs: {
      methodContent: body?.inputs?.methodContent,
      caption: body?.inputs?.caption,
      negativePrompt: body?.inputs?.negativePrompt,
      ...(body?.target === 'editInstruction' ? { editInstruction: body?.inputs?.editInstruction } : {}),
    },
    mainRoute: {
      accessProvider: body?.mainRoute?.accessProvider,
      modelId: body?.mainRoute?.modelId,
      ...(body?.mainRoute?.accessProvider === 'custom' ? {custom: body.mainRoute.custom} : {}),
    },
    apiKey: body?.apiKey,
    ...(body?.providerRegions ? { providerRegions: { minimax: body.providerRegions.minimax } } : {}),
  };
}

function normalizeModelName(provider, model) {
  if (provider === 'gemini' && model === 'gemini-3.1-flash-image-preview') {
    return 'gemini-3.1-flash-image';
  }
  return model;
}

function normalizedEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function boundedStatus(value) {
  const status = Number(value);
  return Number.isInteger(status) && status >= 100 && status <= 599 ? status : 500;
}

function safeMessage(error) {
  return String(error?.message || error || 'Internal server error');
}

function publicErrorMessage(error, status) {
  if (status < 500) return safeMessage(error);
  if (['BACKEND_UNAVAILABLE', 'BACKEND_TIMEOUT', 'ADMIN_API_DISABLED'].includes(error?.code)) {
    return error.code;
  }
  return 'Internal server error';
}

export const maintenanceActions = new Set(MAINTENANCE_ACTIONS);
