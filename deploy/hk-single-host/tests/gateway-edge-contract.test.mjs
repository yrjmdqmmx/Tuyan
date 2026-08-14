import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
const compose = readFileSync(new URL('compose.yaml', root), 'utf8');
const firewall = readFileSync(new URL('scripts/install-worker-firewall.sh', root), 'utf8');

test('gateway uses a dedicated routable edge for loopback publishing with fail-closed egress', () => {
  assert.match(compose, /auth-gateway:[\s\S]*networks:[\s\S]*backend:[\s\S]*ipv4_address:\s*172\.28\.0\.10[\s\S]*edge:[\s\S]*ipv4_address:\s*172\.31\.0\.10/);
  assert.match(compose, /edge:\s*\n\s+driver:\s*bridge/);
  assert.doesNotMatch(compose, /edge:\s*\n\s+internal:\s*true/);
  assert.match(firewall, /172\.31\.0\.10\/32/);
  assert.match(firewall, /--ctstate ESTABLISHED,RELATED -j ACCEPT/);
  assert.match(firewall, /--ctstate NEW -j REJECT/);
});
