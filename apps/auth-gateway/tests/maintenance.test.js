import assert from 'node:assert/strict';
import test from 'node:test';

import { createMaintenanceCheck } from '../src/maintenance.js';

test('maintenance reads the environment and marker file dynamically on every request', () => {
  const env = {};
  let markerExists = false;
  const check = createMaintenanceCheck({
    env,
    markerFile: '/opt/paperbanana/maintenance',
    existsSync(path) {
      assert.equal(path, '/opt/paperbanana/maintenance');
      return markerExists;
    },
  });

  assert.equal(check(), false);
  env.PAPERBANANA_MAINTENANCE_MODE = 'true';
  assert.equal(check(), true);
  env.PAPERBANANA_MAINTENANCE_MODE = 'false';
  markerExists = true;
  assert.equal(check(), true);
  markerExists = false;
  assert.equal(check(), false);
});
