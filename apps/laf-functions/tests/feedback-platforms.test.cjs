const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const sourcePath = path.resolve(__dirname, '../paperbanana-api.ts');
const source = fs.readFileSync(sourcePath, 'utf8');

const typeMatch = source.match(/type FeedbackPlatform = ([^\n]+)/);
assert.ok(typeMatch, 'FeedbackPlatform type must exist.');
assert.ok(typeMatch[1].includes("'ios'"), 'FeedbackPlatform must include ios.');

const setMatch = source.match(/const allowedFeedbackPlatforms = new Set<FeedbackPlatform>\(\[([\s\S]*?)\]\)/);
assert.ok(setMatch, 'allowedFeedbackPlatforms set must exist.');

for (const platform of ['web', 'miniprogram', 'android', 'ios', 'windows', 'macos', 'harmony']) {
  assert.ok(
    setMatch[1].includes(`'${platform}'`),
    `allowedFeedbackPlatforms must include ${platform}.`,
  );
}

console.log('feedback platform policy ok');
