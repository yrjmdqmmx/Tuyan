import { createHash, timingSafeEqual } from 'node:crypto';

import cors from 'cors';
import express from 'express';

import { readGuestIdentity, resolveGuestIdentity } from './guest-identity.js';
import { authorizeJobOwner, normalizeRefineSource } from './ownership.js';

const ADMIN_BACKEND_ACTIONS = new Set([
  'adminJobs',
  'adminFeedback',
  'importReferences',
  'evaluateJob',
  'pingPlotWorker',
  'initDatabase',
]);
const ADMIN_MUTATING_ACTIONS = new Set(['importReferences', 'evaluateJob', 'initDatabase']);
const MAINTENANCE_ACTIONS = new Set([
  'createJob',
  'refineImage',
  'prepareReferenceUpload',
  'submitFeedback',
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
}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);

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
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Token'],
    }),
  );

  app.all('/api/auth/*', auth.handler);
  app.use(express.json({ limit: '1mb' }));
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
    const backendStatus = backend.cachedStatus();
    return {
      code: 0,
      ok: true,
      runtime: 'gateway',
      auth: auth.cachedStatus(),
      backend: backendStatus,
      // One-release compatibility alias. This now describes whichever backend
      // is selected and can therefore report mode=node.
      laf: backendStatus,
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
        auth: authStatus,
        backend: backendStatus,
        laf: backendStatus,
      });
    }),
  );

  app.post(
    '/api/account/delete',
    asyncRoute(async (request, response) => {
      if (isMaintenance()) return maintenanceResponse(response, config);
      const session = await requireSession(auth, request);
      const sessionEmail = normalizedEmail(session.user.email);
      const requestedEmail = normalizedEmail(request.body?.email);
      const password = String(request.body?.password || '');
      if (!requestedEmail || !password) {
        return response.status(400).json({ code: 400, error: 'email and password are required' });
      }
      if (sessionEmail !== requestedEmail) {
        return response.status(403).json({ code: 403, error: 'EMAIL_MISMATCH' });
      }

      let passwordValid = false;
      try {
        passwordValid = await auth.verifyPassword({
          email: session.user.email,
          password,
          headers: request.headers,
        });
      } catch {
        passwordValid = false;
      }
      if (!passwordValid) {
        return response.status(401).json({ code: 401, error: 'INVALID_PASSWORD' });
      }

      const cleanup = await backend.call(
        {
          action: 'deleteAccount',
          userId: String(session.user.id || ''),
          userEmail: String(session.user.email || ''),
        },
        requestContext(request),
      );
      if (
        cleanup.status < 200 ||
        cleanup.status >= 300 ||
        Number(cleanup.data?.code) !== 0 ||
        cleanup.data?.ok !== true
      ) {
        return relay(response, cleanup);
      }

      await auth.clearSessionCookie(request, response);
      await auth.deleteUser(String(session.user.id || ''));
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
      if (action === 'adminStatus') {
        const session = await auth.optionalSession(request);
        return response.status(200).json({ code: 0, isAdmin: isAdminUser(config, session?.user) });
      }

      if (action === 'adminUsers') {
        await requireAdmin(config, auth, request);
        return response.status(200).json({ code: 0, ...(await auth.listUsers(request.body)) });
      }

      if (ADMIN_BACKEND_ACTIONS.has(action)) {
        await requireAdmin(config, auth, request);
        return relay(
          response,
          await backend.call(request.body, context, { adminAction: true }),
        );
      }

      if (action === 'modelCapability' || action === 'referenceLibrary') {
        return relay(response, await backend.call(request.body, context));
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

      if (action === 'createJob' || action === 'prepareReferenceUpload') {
        const principal = await writePrincipal(config, auth, request, response, nowSeconds, randomBytes);
        const body = action === 'createJob' ? normalizeCreateJobBody(request.body) : { ...request.body };
        return relay(
          response,
          await backend.call(
            {
              ...body,
              userId: principal.userId,
              userEmail: principal.userEmail,
            },
            context,
          ),
        );
      }

      if (action === 'refineImage') {
        const principal = await writePrincipal(config, auth, request, response, nowSeconds, randomBytes);
        const source = normalizeRefineSource(request.body, {
          backendMode: backend.mode,
          bucket: config.oss.bucket,
          publicEndpoint: config.oss.publicEndpoint,
          allowLegacyExternalUrl: config.oss.allowLegacyExternalRefineUrl,
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
          mainModelName: normalizeModelName(request.body?.provider, request.body?.mainModelName),
          imageModelName: normalizeModelName(request.body?.provider, request.body?.imageModelName),
          userId: principal.userId,
          userEmail: principal.userEmail,
        };
        if (source.objectKey) delete body.sourceImageUrl;
        return relay(response, await backend.call(body, context));
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
            },
            context,
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
    const publicError = error?.code || safeMessage(error);
    logger.error?.('request failed', { status, code: error?.code || 'REQUEST_FAILED' });
    return response.status(status).json({ code: status, error: publicError });
  });

  return app;
}

function asyncRoute(handler) {
  return (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);
}

function relay(response, result) {
  return response.status(boundedStatus(result?.status || 502)).json(result?.data || {});
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
  if (tokensMatch(String(request.body?.adminToken || ''), config.adminToken)) return session;
  const error = new Error(session?.user ? 'Forbidden' : '请先登录管理员账号。');
  error.status = session?.user ? 403 : 401;
  throw error;
}

function isAdminUser(config, user) {
  const email = normalizedEmail(user?.email);
  return Boolean(email && config.adminEmails.has(email));
}

function tokensMatch(actual, expected) {
  if (!actual || !expected) return false;
  const left = createHash('sha256').update(actual).digest();
  const right = createHash('sha256').update(expected).digest();
  return timingSafeEqual(left, right);
}

function forbidden(response) {
  return response.status(403).json({ code: 403, error: 'Forbidden' });
}

function normalizeCreateJobBody(body) {
  return {
    ...body,
    mainModelName: normalizeModelName(body?.provider, body?.mainModelName),
    imageModelName: normalizeModelName(body?.provider, body?.imageModelName),
  };
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

export const maintenanceActions = new Set(MAINTENANCE_ACTIONS);
