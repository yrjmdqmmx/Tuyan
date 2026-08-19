import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createJobRequest,
  abortReferenceUploadRequest,
  finalizeReferenceUploadRequest,
  formatClientPlatform,
  getJobRequest,
  modelRegistryRequest,
  referenceLibraryRequest,
  refineImageRequest,
  userJobsRequest,
} from './jobs.js';

function mockJsonFetch(handler) {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    const payload = await handler(url, options, calls.length - 1);
    return {
      ok: payload.ok ?? true,
      status: payload.status || 200,
      text: async () => JSON.stringify(payload.body ?? payload),
    };
  };
  return {
    calls,
    restore() {
      globalThis.fetch = originalFetch;
    },
  };
}

test('createJobRequest sends retrieval and task fields to gateway/Laf', async () => {
  const fetchMock = mockJsonFetch(() => ({ body: { code: 0, jobId: 'job-1', status: 'queued' } }));
  try {
    const result = await createJobRequest('https://gateway.example', { backendMode: 'gateway' }, {
      configurationMode: 'advanced',
      provider: 'bailian',
      apiKeys: { bailian: 'key' },
      taskName: 'diagram',
      methodContent: 'A sufficiently long method section for testing.',
      caption: 'Figure 1',
      infographicCategory: '方法框架图',
      outputFormat: 'png',
      mainModelName: 'qwen-plus',
      imageGenModelName: 'wanx2.1-t2i-plus',
      referenceVisionModelName: 'qwen-vl-plus',
      referenceImageMode: 'auto',
      referenceImages: [],
      pipelineMode: 'demo_full',
      retrievalSetting: 'manual',
      manualReferenceIds: ['diagram-001', 'diagram-002'],
      aspectRatio: '16:9',
      numCandidates: 2,
      maxCriticRounds: 1,
    });

    assert.deepEqual(result, { id: 'job-1', status: 'queued' });
    const body = JSON.parse(fetchMock.calls[0].options.body);
    assert.equal(body.action, 'createJob');
    assert.equal(body.clientPlatform, 'web');
    assert.equal(body.taskName, 'diagram');
    assert.equal(body.pipelineMode, 'full');
    assert.equal(body.retrievalSetting, 'manual');
    assert.deepEqual(body.manualReferenceIds, ['diagram-001', 'diagram-002']);
  } finally {
    fetchMock.restore();
  }
});

test('getJobRequest normalizes PaperBanana parity fields', async () => {
  const fetchMock = mockJsonFetch(() => ({
    body: {
      code: 0,
      job: {
        _id: 'job-2',
        client_platform: 'miniprogram',
        status: 'succeeded',
        taskName: 'diagram',
        retrievalSetting: 'auto',
        retrievedReferenceIds: ['ref-a'],
        retrievedReferences: [{ id: 'ref-a', title: 'Reference A', imageUrl: 'https://example.com/ref.png' }],
        criticMode: 'image',
        imageRefineMode: 'direct-edit',
        imageRefineReason: 'Image model accepts a source image.',
        refineMode: 'direct-edit',
        refineReason: 'Refine used source pixels.',
        stages: [
          { id: 'stage-1', candidateId: 0, type: 'planner', title: 'Planner', text: 'plan' },
          { id: 'stage-2', candidateId: 0, type: 'critic', round: 1, text: 'revise spacing' },
        ],
        resultImages: [{ filename: 'candidate.png', url: 'data:image/png;base64,AAAA', candidateId: 0, objectKey: 'jobs/job-2/result/candidate.png' }],
      },
    },
  }));
  try {
    const job = await getJobRequest('https://laf.example/paperbanana-api', { backendMode: 'laf' }, 'job-2');
    assert.equal(job.client_platform, 'miniprogram');
    assert.equal(job.task_name, 'diagram');
    assert.equal(job.retrieval_setting, 'auto');
    assert.deepEqual(job.retrieved_reference_ids, ['ref-a']);
    assert.equal(job.retrieved_references[0].id, 'ref-a');
    assert.equal(job.critic_mode, 'image');
    assert.equal(job.image_refine_mode, 'direct-edit');
    assert.equal(job.image_refine_reason, 'Image model accepts a source image.');
    assert.equal(job.refine_mode, 'direct-edit');
    assert.equal(job.refine_reason, 'Refine used source pixels.');
    assert.equal(job.stages.length, 2);
    assert.equal(job.stages[1].type, 'critic');
    assert.equal(job.result_images[0].object_key, 'jobs/job-2/result/candidate.png');
  } finally {
    fetchMock.restore();
  }
});

test('refineImageRequest sends image edit payload to gateway/Laf', async () => {
  const fetchMock = mockJsonFetch(() => ({ body: {
    code: 0,
    jobId: 'refine-1',
    status: 'queued',
    refineCapability: { mode: 'direct-edit', directEdit: true, reason: 'Model accepts the source image.' },
  } }));
  try {
    const result = await refineImageRequest('https://gateway.example', { backendMode: 'gateway' }, {
      provider: 'openai',
      apiKeys: { openai: 'key' },
      imageModelName: 'gpt-image-1',
      sourceImageUrl: 'https://example.com/source.png',
      editInstruction: 'Make the labels larger.',
      aspectRatio: '16:9',
      imageSize: '2K',
    });

    assert.deepEqual(result, {
      id: 'refine-1',
      status: 'queued',
      refineCapability: { mode: 'direct-edit', directEdit: true, reason: 'Model accepts the source image.' },
    });
    const body = JSON.parse(fetchMock.calls[0].options.body);
    assert.equal(body.action, 'refineImage');
    assert.equal(body.clientPlatform, 'web');
    assert.equal(body.sourceImageUrl, 'https://example.com/source.png');
    assert.equal(body.editInstruction, 'Make the labels larger.');
  } finally {
    fetchMock.restore();
  }
});

test('referenceLibraryRequest preserves English search copy and Chinese display copy', async () => {
  const fetchMock = mockJsonFetch(() => ({
    body: {
      code: 0,
      references: [{
        id: 'ref_1',
        title: 'English searchable title',
        summary: 'English searchable summary',
        titleZh: '中文标题',
        introZh: '中文简介',
        shortIntroZh: '中文短介绍',
        detailZh: '中文详细说明，展示具体的数据和视觉关系。',
        visualCategory: '方法框架图',
        researchDomain: '计算机视觉',
        keywords: ['数据流', '视觉模块'],
        corpusVersion: 'zh-CN.v2',
      }],
      totalItems: '306',
      totalPages: '26',
      page: '2',
      pageSize: '12',
      facets: {
        visualCategories: [{ value: '方法框架图', count: '66' }],
        researchDomains: [{ value: '计算机视觉', count: '42' }],
      },
      corpusVersion: 'zh-CN.v2',
    },
  }));
  try {
    const result = await referenceLibraryRequest(
      'https://gateway.example',
      { backendMode: 'gateway' },
      {
        scope: 'bench', page: 2, pageSize: 12, query: 'vision',
        visualCategory: '方法框架图', researchDomain: '计算机视觉', taskName: 'diagram',
      },
    );
    assert.deepEqual(result.references[0], {
      id: 'ref_1',
      task_name: 'diagram',
      title: 'English searchable title',
      summary: 'English searchable summary',
      titleZh: '中文标题',
      introZh: '中文简介',
      shortIntroZh: '中文短介绍',
      detailZh: '中文详细说明，展示具体的数据和视觉关系。',
      visualCategory: '方法框架图',
      researchDomain: '计算机视觉',
      keywords: ['数据流', '视觉模块'],
      corpusVersion: 'zh-CN.v2',
      image_url: '',
      image_object_key: '',
      source: 'paperbanana-bench',
    });
    assert.deepEqual(result, {
      references: [result.references[0]],
      totalItems: 306,
      totalPages: 26,
      page: 2,
      pageSize: 12,
      facets: {
        visualCategories: [{ value: '方法框架图', count: 66 }],
        researchDomains: [{ value: '计算机视觉', count: 42 }],
      },
      corpusVersion: 'zh-CN.v2',
    });
    assert.deepEqual(JSON.parse(fetchMock.calls[0].options.body), {
      action: 'referenceLibrary',
      scope: 'bench',
      page: 2,
      pageSize: 12,
      query: 'vision',
      visualCategory: '方法框架图',
      researchDomain: '计算机视觉',
      taskName: 'diagram',
    });
  } finally {
    fetchMock.restore();
  }
});

test('referenceLibraryRequest normalizes legacy reference-only responses with default pagination', async () => {
  const fetchMock = mockJsonFetch(() => ({ body: { code: 0, references: [{ id: 'ref_1' }] } }));
  try {
    const result = await referenceLibraryRequest(
      'https://gateway.example',
      { backendMode: 'gateway' },
      { taskName: 'plot', limit: 24 },
    );
    assert.equal(result.totalItems, 1);
    assert.equal(result.totalPages, 1);
    assert.equal(result.page, 1);
    assert.equal(result.pageSize, 24);
    assert.deepEqual(result.facets, { visualCategories: [], researchDomains: [] });
    assert.equal(result.corpusVersion, '');
    assert.deepEqual(JSON.parse(fetchMock.calls[0].options.body), {
      action: 'referenceLibrary', taskName: 'plot', query: '', limit: 24,
    });
  } finally {
    fetchMock.restore();
  }
});

test('referenceLibraryRequest defaults new callers to the cross-task bench scope', async () => {
  const fetchMock = mockJsonFetch(() => ({ body: {
    code: 0, references: [], totalItems: 306, totalPages: 26, page: 1, pageSize: 12,
    facets: { visualCategories: [], researchDomains: [] }, corpusVersion: 'zh-CN.v2',
  } }));
  try {
    const result = await referenceLibraryRequest('https://gateway.example', { backendMode: 'gateway' });
    const queried = await referenceLibraryRequest(
      'https://gateway.example',
      { backendMode: 'gateway' },
      { query: 'cell' },
    );
    assert.equal(result.totalItems, 306);
    assert.equal(result.pageSize, 12);
    assert.equal(queried.totalItems, 306);
    assert.deepEqual(JSON.parse(fetchMock.calls[0].options.body), { action: 'referenceLibrary' });
    assert.deepEqual(JSON.parse(fetchMock.calls[1].options.body), { action: 'referenceLibrary', query: 'cell' });
  } finally {
    fetchMock.restore();
  }
});

test('referenceLibraryRequest forwards AbortSignal without serializing it', async () => {
  const fetchMock = mockJsonFetch(() => ({ body: { code: 0, references: [] } }));
  const controller = new AbortController();
  try {
    await referenceLibraryRequest('https://gateway.example', { backendMode: 'gateway' }, {
      scope: 'bench', page: 1, pageSize: 12, signal: controller.signal,
    });
    assert.equal(fetchMock.calls[0].options.signal, controller.signal);
    assert.equal('signal' in JSON.parse(fetchMock.calls[0].options.body), false);
  } finally {
    fetchMock.restore();
  }
});

test('reference upload lifecycle explicitly finalizes successful PUTs and aborts failed ones', async () => {
  const fetchMock = mockJsonFetch(() => ({ body: { code: 0, ok: true } }));
  const uploads = [{
    objectKey: 'references/user-1/reference.png',
    uploadToken: 'signed-token',
    mimeType: 'image/png',
    size: 123,
  }];
  try {
    await finalizeReferenceUploadRequest('https://gateway.example', { backendMode: 'gateway' }, uploads);
    await abortReferenceUploadRequest('https://gateway.example', { backendMode: 'gateway' }, uploads);
    assert.deepEqual(
      fetchMock.calls.map((call) => JSON.parse(call.options.body)),
      [
        { action: 'finalizeReferenceUpload', uploads },
        { action: 'abortReferenceUpload', uploads },
      ],
    );
  } finally {
    fetchMock.restore();
  }
});

test('formatClientPlatform translates the complete canonical enum without guessing missing history', () => {
  assert.deepEqual(
    ['web', 'miniprogram', 'android', 'ios', 'windows', 'macos', 'harmony'].map(formatClientPlatform),
    ['Web 网页', '微信小程序', 'Android', 'iOS', 'Windows', 'macOS', 'HarmonyOS'],
  );
  assert.equal(formatClientPlatform(''), '未记录');
  assert.equal(formatClientPlatform(undefined), '未记录');
  assert.equal(formatClientPlatform('mobile'), '未记录');
});

test('userJobsRequest trusts the freshly signed list response without N+1 detail requests', async () => {
  const fetchMock = mockJsonFetch(() => ({
    body: {
      code: 0,
      jobs: [{
        _id: 'job-list-1',
        status: 'succeeded',
        resultImages: [{ filename: 'job-list-1/candidate.png', storage: 'bucket', url: 'https://oss.example/signed' }],
      }],
    },
  }));
  try {
    const result = await userJobsRequest('https://gateway.example', { backendMode: 'gateway' });
    assert.equal(fetchMock.calls.length, 1);
    assert.equal(result.jobs[0].result_images[0].url, 'https://oss.example/signed');
  } finally {
    fetchMock.restore();
  }
});

test('modelRegistryRequest reads the server-authoritative model roles and defaults', async () => {
  const fetchMock = mockJsonFetch(() => ({
    body: {
      code: 0,
      registryVersion: '2026-08-19',
      providers: {
        gemini: {
          defaults: { main: 'gemini-3.7-flash', image: 'gemini-3.1-flash-image', vision: 'gemini-3.7-flash' },
          models: [{ id: 'gemini-3.7-flash', label: 'Gemini 3.7 Flash', roles: ['main', 'vision'], capabilities: { referenceImages: true }, protocol: 'gemini-generate-content', availabilityNotes: 'Stable' }],
        },
      },
    },
  }));
  try {
    const registry = await modelRegistryRequest('https://gateway.example', { backendMode: 'gateway' });
    assert.equal(JSON.parse(fetchMock.calls[0].options.body).action, 'modelRegistry');
    assert.equal(registry.providers.gemini.defaults.main, 'gemini-3.7-flash');
    assert.deepEqual(registry.providers.gemini.models[0].roles, ['main', 'vision']);
  } finally {
    fetchMock.restore();
  }
});
