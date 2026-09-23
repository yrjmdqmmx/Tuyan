import { packModelCatalog } from './lib/pack-model-catalog.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { EXTENDED_MODEL_CHANNELS, STATIC_MODEL_REGISTRY, STATIC_MODEL_REGISTRY_VERSION } from '../apps/web/src/lib/staticModelCatalog.js';
const require = createRequire(new URL('../apps/miniprogram/package.json', import.meta.url));
const ts = require('typescript');
const root = new URL('../', import.meta.url);
const source = readFileSync(new URL('packages/api/src/reference-upload.ts', root), 'utf8');
const generated = '// Generated from packages/api/src/reference-upload.ts.\n';
const inlineSource = source.replace(/^import .*universal-api.js'\n/m, '');
const policyModule = ts.transpileModule(inlineSource, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ES2020 } }).outputText;
const { referenceSubmissionPolicy, REFERENCE_UPLOAD_PLATFORM } = await import('data:text/javascript;base64,' + Buffer.from(policyModule).toString('base64'));
const models = Object.entries(STATIC_MODEL_REGISTRY).flatMap(([provider, registry]) => registry.models.flatMap(model => {
  if (model.selectable === false) return [];
  const workflows = [
    ...(model.roles.includes('vision') || model.roles.includes('main') && model.capabilities?.referenceImages ? ['generation'] : []),
    ...(model.roles.includes('image') && model.capabilities?.imageEditing ? ['refine'] : []),
  ];
  return workflows.map(workflow => ({
    provider, model: model.id, workflow, protocol: model.protocol,
    policy: referenceSubmissionPolicy(provider, model.id, workflow),
    channelGuide: EXTENDED_MODEL_CHANNELS[provider]?.guideUrl || null,
    reviewScope: 'Policy mapping; consult the dated audit for individually confirmed fields. Not an entitlement or successful inference check.',
  }));
}));
const inputPolicyLiteral = /const auditedInputPolicy: Record<string, Partial<ReferenceSubmissionPolicy>> = (.*)\n/.exec(inlineSource)?.[1]
const miniSource = inlineSource.replace(inputPolicyLiteral, "require('./audited-input-policy.js')").replace('universalReferencePolicy(route)', "{ ...referenceSubmissionPolicy('custom', route.modelId, workflow), maxCount: 0, note: '通用 API 配置与提交请使用网页版；小程序支持查看和恢复已有任务。' }");
const outputs = {
  'apps/miniprogram/miniprogram/utils/audited-input-policy.js': generated + "module.exports = require('./unpack-model-catalog.js').unpackModelCatalog(" + JSON.stringify(packModelCatalog(JSON.parse(inputPolicyLiteral))) + ')\n',
  'apps/web/src/lib/referenceUploadPolicy.js': generated + ts.transpileModule(source.replace('./universal-api.js', './universalContract.js'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ES2020 } }).outputText,
  'apps/miniprogram/miniprogram/utils/reference-upload-policy.ts': generated + miniSource,
  'apps/miniprogram/miniprogram/utils/reference-upload-policy.js': ts.transpileModule(generated + miniSource, { compilerOptions: { target: ts.ScriptTarget.ES2019, module: ts.ModuleKind.CommonJS, alwaysStrict: true } }).outputText,
  'docs/reference-upload/model-matrix.json': JSON.stringify({
    checkedAt: '2026-09-10', registryVersion: STATIC_MODEL_REGISTRY_VERSION,
    scope: 'Static selectable image consumers. Application ceilings are not undocumented vendor maxima. OpenRouter is dynamic and uses the unconfirmed fallback plus its live catalog.',
    platform: REFERENCE_UPLOAD_PLATFORM, models,
  }, null, 2) + '\n',
};
const backendPath = new URL('apps/laf-functions/paperbanana-api.ts', root);
const backend = readFileSync(backendPath, 'utf8');
const start = '// BEGIN SHARED REFERENCE UPLOAD POLICY', end = '// END SHARED REFERENCE UPLOAD POLICY';
const block = `${start}\n${inlineSource}\n${end}`;
outputs['apps/laf-functions/paperbanana-api.ts'] = backend.includes(start)
  ? backend.slice(0, backend.indexOf(start)) + block + backend.slice(backend.indexOf(end) + end.length)
  : backend.replace('declare const require: any', `${block}\n\ndeclare const require: any`);
for (const [path, text] of Object.entries(outputs)) {
  const url = new URL(path, root);
  if (process.argv.includes('--check')) {
    if (readFileSync(url, 'utf8') !== text) throw new Error(`Reference upload policy drift: ${path}`);
  } else writeFileSync(url, text);
}
