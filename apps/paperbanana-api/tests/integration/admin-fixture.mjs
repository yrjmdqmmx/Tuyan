import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { MongoClient, ObjectId } from 'mongodb';
import { createAuthRuntime } from '../../../auth-gateway/src/auth.js';
import { createApp as createGateway } from '../../../auth-gateway/src/app.js';
import { createBackendClient } from '../../../auth-gateway/src/backend-client.js';
import { createServer } from '../../src/server.ts';
import { createAdminOperations } from '../../src/admin-operations.ts';
import { createMongoBenchmarkRepository } from '../../src/benchmark-repository.ts';
import { createBenchmarkService } from '../../src/benchmark-service.ts';
import { STATIC_MODEL_REGISTRY } from '../../../web/src/lib/staticModelCatalog.js';

const listen = (server) => new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`)));
const close = (server) => new Promise((resolve) => { server.closeAllConnections?.(); server.close(resolve); });
export async function startAdminFixture(uri, webBase = 'http://127.0.0.1:5194') {
  if (!uri || !/^mongodb:\/\/(127\.0\.0\.1|localhost):/.test(uri)) throw new Error('Disposable loopback Mongo URI required');
  const suffix = randomUUID().replaceAll('-', ''), client = new MongoClient(uri);
  await client.connect();
  const authDb = client.db(`admin_auth_${suffix}`), db = client.db(`admin_jobs_${suffix}`), benchmarkDb = client.db(`admin_bench_${suffix}`);
  const logger = { info() {}, warn() {}, error() {} }, date = new Date(), day = 86400000;
  let gatewayApp, auth, core;
  const gateway = http.createServer((req, res) => gatewayApp(req, res)), apiBase = await listen(gateway);
  const config = { mongoUri: uri, mongoDbName: authDb.databaseName, authBaseUrl: apiBase,
    authSecret: 'local-admin-fixture-secret-never-a-production-credential', frontendOrigins: [webBase, apiBase],
    production: false, cookieSameSite: 'lax', trustProxy: false, adminUserIds: new Set(),
    authEmail: { deliveryEnabled: false, requireVerification: false, verificationCallbackUrl: webBase + '/account/email-verified.html' },
    guestCookie: { name: 'admin_fixture_guest', secret: 'local-fixture-guest-secret-32-bytes-long', ttlSeconds: 86400, secure: false },
    backend: { mode: 'node' }, maintenance: { retryAfterSeconds: 30 }, oss: { bucket: 'fixture', publicEndpoint: 'https://fixture.invalid', allowLegacyExternalRefineUrl: false },
  };
  const cleanup = async () => {
    await close(gateway); if (core) await close(core); if (auth) await auth.close();
    await Promise.all([authDb.dropDatabase(), db.dropDatabase(), benchmarkDb.dropDatabase()]); await client.close();
  };
  try {
    auth = await createAuthRuntime(config, { logger });
    const admin = await auth.webHandler(new Request(apiBase + '/api/auth/sign-up/email', { method: 'POST', headers: { 'content-type': 'application/json', origin: webBase }, body: JSON.stringify({ email: 'admin@example.test', password: 'fixture-admin-password', name: '运营管理员' }) }));
    const adminResult = await authDb.collection('user').findOne({ email: 'admin@example.test' });
    if (!admin.ok || !adminResult?._id) throw new Error('Fixture admin signup failed');
    const adminId = String(adminResult._id); config.adminUserIds.add(adminId);
    const identities = Array.from({ length: 46 }, (_, i) => new ObjectId());
    const userRows = identities.map((_id, i) => ({ _id, email: `researcher${i}@example.test`, name: `研究用户 ${String(i).padStart(2, '0')}`, emailVerified: i % 3 !== 0, createdAt: new Date(+date - i * day), updatedAt: date }));
    await authDb.collection('user').insertMany(userRows);
    await authDb.collection('account').insertMany(identities.flatMap((id, i) => [{ _id: new ObjectId(), userId: id, providerId: 'credential', accountId: String(id), password: 'CREDENTIAL_CANARY_DO_NOT_RETURN', createdAt: date }, ...(i % 4 === 0 ? [{ _id: new ObjectId(), userId: String(id), providerId: 'github', accountId: `provider-${i}`, accessToken: 'OAUTH_CANARY_DO_NOT_RETURN', refreshToken: 'REFRESH_CANARY_DO_NOT_RETURN', createdAt: date }] : [])]));
    await authDb.collection('session').insertMany(identities.map((id, i) => ({ _id: new ObjectId(), userId: i % 2 ? id : String(id), token: `SESSION_CANARY_${i}_DO_NOT_RETURN`, createdAt: new Date(+date - 3600000), updatedAt: date, expiresAt: new Date(+date + (i % 2 ? -1 : 1) * day), ipAddress: '192.0.2.1', userAgent: 'private-fixture-agent' })));
    await authDb.collection('accountDeletionOperations').insertOne({ _id: String(identities[4]), userId: String(identities[4]), status: 'review_required', phase: 'business', createdAt: date, updatedAt: date });
    await db.collection('paperbanana_account_deletions').insertOne({ _id: `user:${identities[4]}`, contractVersion: 3, status: 'review_required' });
    const jobRows = Array.from({ length: 67 }, (_, i) => ({
      _id: `task-${String(i).padStart(3, '0')}`, userId: String(identities[i % identities.length]), userEmail: `researcher${i % identities.length}@example.test`,
      taskName: i === 0 ? '肿瘤微环境机制图' : `科研图示任务 ${String(i).padStart(2, '0')}`, caption: `图 ${i + 1}：实验流程与对照比较`, methodContent: '收集样本 → 建立模型 → 对照评估。apiKeys: { openai: "SECRET_MAP_CANARY" }',
      status: ['succeeded', 'failed', 'running', 'queued', 'reserved'][i % 5], jobType: i % 3 ? 'generate' : 'refine', provider: 'bailian',
      mainModelName: 'qwen-max', imageModelName: i % 2 ? 'wan-image' : 'nano-banana', referenceVisionModelName: 'qwen-vl',
      clientPlatform: 'web', configurationMode: 'advanced', infographicCategory: '方法框架图', outputFormat: 'svg', retrievalSetting: 'auto',
      referenceImageMode: 'auto', referenceImageModeUsed: 'none', referenceImages: [], criticMode: 'text', pipelineMode: 'planner_critic', aspectRatio: '16:9', imageSize: '1K', numCandidates: 1, maxCriticRounds: 0,
      modelRoutes: { main: { accessProvider: 'bailian', modelId: 'qwen-max' }, image: { accessProvider: 'bailian', modelId: i % 2 ? 'wan-image' : 'nano-banana' }, vision: { accessProvider: 'bailian', modelId: 'qwen-vl' } },
      createdAt: new Date(+date - i * day / 3), updatedAt: new Date(+date - i * day / 3), startedAt: i % 5 < 3 ? new Date(+date - i * day / 3 + 1000) : null,
      completedAt: i % 5 < 2 ? new Date(+date - i * day / 3 + 1000 + (i + 1) * 3200) : null,
      resultImages: i % 5 === 0 ? [{ filename: 'fixture-result.svg', url: apiBase + '/fixture-result.svg', mimeType: 'image/svg+xml' }] : [],
      error: i % 5 === 1 ? 'Provider timed out; token=ERROR_SECRET_CANARY' : '', errorCode: i % 5 === 1 ? 'PROVIDER_TIMEOUT' : '',
      logs: ['queued', 'authorization: Bearer LOG_SECRET_CANARY'], stages: [{ title: '规划与生成', text: '样本、模型与评估按顺序排列。', type: 'planner' }], apiKeys: { bailian: 'JOB_KEY_CANARY_DO_NOT_RETURN' },
    }));
    Object.assign(jobRows[0], {
      jobType: 'generate', retrievalSetting: 'none', referenceImageModeUsed: 'main_model',
      referenceImages: [{ filename: 'fixture-reference.svg', url: apiBase + '/fixture-result.svg?reference', mimeType: 'image/svg+xml' }],
      stages: [
        { title: '规划', type: 'planner', text: '根据样本与模型组织流程。', candidateId: 0, round: 0, startedAt: date, completedAt: new Date(+date + 150), durationMs: 150 },
        { title: '生成', type: 'generator', text: '生成流程示意图。', image: { filename: 'fixture-stage.svg', url: apiBase + '/fixture-result.svg?stage', mimeType: 'image/svg+xml' } },
        { title: '评审', type: 'critic', text: '检查对照组与评估节点。', criticSuggestion: '放大对照组标签。token=STAGE_SECRET_CANARY', candidate_id: 0, round: 1, duration_ms: 0 },
        { title: '完成', type: 'complete', text: '结果已保存。' },
      ],
    });
    // Older stored jobs have no routing object or configuration. Public defaults
    // must not turn missing history into claims about how this task ran.
    for (const field of ['clientPlatform', 'configurationMode', 'infographicCategory', 'outputFormat', 'retrievalSetting', 'referenceImageMode', 'referenceImageModeUsed', 'referenceImages', 'criticMode', 'pipelineMode', 'aspectRatio', 'imageSize', 'numCandidates', 'maxCriticRounds', 'stages', 'modelRoutes']) delete jobRows[66][field];
    delete jobRows[65].modelRoutes;
    await db.collection('paperbanana_jobs').insertMany(jobRows);
    await db.collection('paperbanana_feedback').insertMany(identities.slice(0, 31).map((id, i) => ({ _id: `feedback-${i}`, id: `feedback-${i}`, userId: String(id), userEmail: `researcher${i}@example.test`, jobId: `task-${String(i).padStart(3, '0')}`, contact: i === 0 ? 'wechat:research-lab-0086' : `contact-${i}@example.test`, message: `用户反馈 ${i}：希望改进标注位置。`, category: 'suggestion', status: 'new', platform: 'web', createdAt: new Date(+date - i * 3600000), clientIp: '192.0.2.2' })));
    const promptRows = Array.from({ length: 54 }, (_, i) => ({ _id: `submission-${i}`, submissionId: `submission-${i}`, userId: String(identities[i % identities.length]), status: ['pending', 'grouped', 'candidate', 'approved_for_next_suite', 'merged', 'rejected'][i % 6], prompt: i === 0 ? '绘制 CRISPR 基因编辑实验流程，标注对照组与检测节点。' : `社区评估题 ${String(i).padStart(2, '0')}：绘制科研方法图，体现关键步骤。`, capability: i % 2 ? '方法流程' : '机制通路', requiredElements: '实验组、对照组、检测结果', forbiddenResults: '不添加未经提供的实验结论', notes: '由社区用户提交', normalizedHash: `hash-${i}`, clientIp: '192.0.2.3', createdAt: new Date(+date - i * 3600000), updatedAt: new Date(+date - i * 3600000), ...(i % 6 === 3 ? { decidedBy: adminId, decidedAt: date, decisionNotes: '历史审核记录' } : {}) }));
    await benchmarkDb.collection('paperbanana_benchmark_prompt_submissions').insertMany(promptRows);
    await benchmarkDb.collection('paperbanana_benchmark_prompt_digests').insertOne({ _id: 'digest-1', digestId: 'digest-1', sourceSubmissionIds: ['submission-0', 'submission-1'], createdAt: date, candidates: [{ candidateId: 'candidate-1', sourceSubmissionIds: ['submission-0', 'submission-1'], normalizedPrompt: '归并后的流程图候选', capability: '机制通路', mergeReason: '相同实验步骤归并' }] });
    await benchmarkDb.collection('paperbanana_benchmark_suites').insertOne({ _id: 'immutable-suite', version: 'fixture-v1', prompts: ['original'] });
    const legacy = async ({ body }) => {
      if (body.action === 'getJob') return { code: 0, job: await db.collection('paperbanana_jobs').findOne({ _id: body.jobId }) };
      const fixture = { health: { code: 0, ok: true }, modelRegistry: { code: 0, registryVersion: 'fixture-v15', providerRegionContractVersion: 1, providers: STATIC_MODEL_REGISTRY }, referenceLibrary: { code: 0, references: [], total: 0 }, featuredTemplates: { code: 0, templates: [] }, userJobs: { code: 0, jobs: [] }, modelCapability: { code: 0, status: 'supported', supported: true } }[body.action];
      return fixture || { code: 400, error: 'Fixture does not execute provider or publication actions' };
    };
    const operations = createAdminOperations({ db, benchmarkDb, publicJob: (id) => legacy({ body: { action: 'getJob', jobId: id } }) }); await operations.ensureIndexes();
    const benchmark = createBenchmarkService({ repository: createMongoBenchmarkRepository(benchmarkDb), signEvidence: async () => '', verifyEvidence: async () => {} });
    core = createServer({ handler: legacy, readinessProbe: async () => ({ ready: true }), healthSnapshot: () => ({ ready: true }), config: { gatewayToken: 'fixture-gateway', adminToken: 'fixture-admin', adminTransportToken: 'fixture-transport', serviceName: 'fixture', version: 'test' }, logger, adminOperations: operations, benchmarkService: benchmark });
    const coreBase = await listen(core);
    const backend = createBackendClient({ mode: 'node', url: coreBase + '/paperbanana-api', timeoutMs: 10000, gatewayToken: 'fixture-gateway', adminToken: 'fixture-admin', adminTransportToken: 'fixture-transport' });
    gatewayApp = createGateway({ config, auth, backend, isMaintenance: () => false, logger });
    gatewayApp.get('/fixture-result.svg', (_req, res) => res.type('image/svg+xml').send('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="360"><rect width="800" height="360" fill="#f7f8f0"/><g fill="#d9e9df" stroke="#31674e"><rect x="70" y="115" width="170" height="120" rx="18"/><rect x="320" y="115" width="170" height="120" rx="18"/><rect x="570" y="115" width="170" height="120" rx="18"/></g><g fill="#254c38" font-family="sans-serif" font-size="25" text-anchor="middle"><text x="155" y="183">Sample</text><text x="405" y="183">Model</text><text x="655" y="183">Evaluate</text></g><path d="M245 175h65m185 0h65" stroke="#31674e" stroke-width="4"/></svg>'));
    return { apiBase, coreBase, adminId, identities: identities.map(String), db, authDb, benchmarkDb, operations, auth, cleanup, webBase };
  } catch (error) { await cleanup(); throw error; }
}
