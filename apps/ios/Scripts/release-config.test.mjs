import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const project = readFileSync(new URL('../paperbanana.xcodeproj/project.pbxproj', import.meta.url), 'utf8');

test('Build 5 remains version 1.0 and declares iPhone only', () => {
  const appBuilds = [...project.matchAll(/CURRENT_PROJECT_VERSION = 5;/g)];
  const phoneFamilies = [...project.matchAll(/TARGETED_DEVICE_FAMILY = 1;/g)];
  assert.equal(appBuilds.length, 2);
  assert.equal(phoneFamilies.length, 2);
  assert.doesNotMatch(project, /TARGETED_DEVICE_FAMILY = "1,2";/);
});
