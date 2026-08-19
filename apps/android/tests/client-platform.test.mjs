import assert from 'node:assert/strict';

import { CLIENT_PLATFORM, formatClientPlatform } from '../src/client-platform.ts';

assert.equal(CLIENT_PLATFORM, 'android');
assert.equal(formatClientPlatform('web'), 'Web 网页');
assert.equal(formatClientPlatform('android'), 'Android');
assert.equal(formatClientPlatform(''), '未记录');
assert.equal(formatClientPlatform('unknown-platform'), '未记录');

console.log('client-platform.test.mjs passed');
