// Preload for isolated integration tests. No process can open an external TCP
// connection, even if a fixture accidentally falls back to a real HTTP client.
import net from 'node:net';
import { syncBuiltinESMExports } from 'node:module';
const local = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);
const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  const input = Array.isArray(args[0]) ? args[0] : args;
  const options = typeof input[0] === 'object' ? input[0] : { port: input[0], host: typeof input[1] === 'string' ? input[1] : 'localhost' };
  if (options.path || !local.has(options.host || 'localhost')) throw new Error('OFFLINE_TEST_EXTERNAL_CONNECTION_BLOCKED');
  return connect.apply(this, args);
};
const originalFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (!local.has(url.hostname)) throw new Error('OFFLINE_TEST_EXTERNAL_FETCH_BLOCKED');
  return originalFetch(input, init);
};
syncBuiltinESMExports();
