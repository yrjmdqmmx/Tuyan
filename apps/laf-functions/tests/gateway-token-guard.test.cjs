const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const sourcePath = path.resolve(__dirname, '../paperbanana-api.ts');
const source = fs.readFileSync(sourcePath, 'utf8');

// The public Laf endpoint must enforce the auth-gateway trust boundary so that
// direct callers cannot read/write another user's data with a forged userId.
assert.ok(
  source.includes('PAPERBANANA_GATEWAY_TOKEN'),
  'Laf backend must validate the shared PAPERBANANA_GATEWAY_TOKEN.',
);

assert.ok(
  source.includes('function requireTrustedCaller'),
  'Laf backend must define requireTrustedCaller as the gateway/IDOR guard.',
);

assert.ok(
  source.includes('function isValidGatewayToken') && source.includes("body?.gatewayToken === expected"),
  'requireTrustedCaller must compare the body gatewayToken against the env secret.',
);

// Every identity-scoped action must be guarded.
const guardedActions = [
  'createJob',
  'refineImage',
  'submitFeedback',
  'userJobs',
  'getJob',
  'prepareReferenceUpload',
];
const setMatch = source.match(/const identityScopedActions = new Set\(\[([\s\S]*?)\]\)/);
assert.ok(setMatch, 'identityScopedActions set must exist.');
for (const action of guardedActions) {
  assert.ok(
    setMatch[1].includes(`'${action}'`),
    `identityScopedActions must include ${action}.`,
  );
}

assert.ok(
  /if \(identityScopedActions\.has\(action\)\) \{\s*const denied = requireTrustedCaller\(body\)\s*if \(denied\) return denied/.test(source),
  'Dispatch must reject identity-scoped actions that fail requireTrustedCaller.',
);

const clientIpMatch = source.match(/function getClientIp\(ctx: FunctionContext\) \{([\s\S]*?)\n\}/);
assert.ok(clientIpMatch, 'getClientIp must exist.');
assert.ok(
  clientIpMatch[1].includes("ctx.headers?.['x-paperbanana-client-ip']"),
  'Laf compatibility must accept the gateway-authenticated client IP header.',
);
assert.ok(
  clientIpMatch[1].indexOf("ctx.headers?.['x-paperbanana-client-ip']") <
    clientIpMatch[1].indexOf("ctx.headers?.['x-forwarded-for']"),
  'The authenticated client IP must take precedence over legacy forwarding headers.',
);

// Admin actions must keep their own ADMIN_TOKEN gate (must NOT be downgraded to
// the gateway token), so they stay callable directly with ADMIN_TOKEN.
for (const adminAction of ['adminJobs', 'adminFeedback', 'importReferences', 'evaluateJob', 'pingPlotWorker']) {
  assert.ok(
    !setMatch[1].includes(`'${adminAction}'`),
    `${adminAction} must not be in identityScopedActions (stays ADMIN_TOKEN-gated).`,
  );
}

console.log('gateway-token-guard policy ok');
