import { createApp } from './app.js';
import { createAuthRuntime } from './auth.js';
import { createBackendClient } from './backend-client.js';
import { loadGatewayConfig } from './config.js';
import { createMaintenanceCheck } from './maintenance.js';

export async function startGateway({
  env = process.env,
  signals = process,
  logger = console,
  createAuthRuntimeImpl = createAuthRuntime,
  createBackendClientImpl = createBackendClient,
  createMaintenanceCheckImpl = createMaintenanceCheck,
  createAppImpl = createApp,
  listenImpl = listen,
} = {}) {
  // The complete environment is validated before MongoClient construction.
  const config = loadGatewayConfig(env);
  const auth = await createAuthRuntimeImpl(config);
  let server;
  try {
    const backend = createBackendClientImpl({
      ...config.backend,
      gatewayToken: config.gatewayToken,
      adminToken: config.adminToken,
      adminTransportToken: config.adminTransportToken,
    });
    const isMaintenance = createMaintenanceCheckImpl(config.maintenance);
    const app = createAppImpl({ config, auth, backend, isMaintenance, logger });
    server = await listenImpl(app, config.port, config.listenHost);
  } catch (error) {
    await auth.close().catch(() => {});
    throw error;
  }

  let stopPromise;
  let resolveStopped;
  const stopped = new Promise((resolve) => { resolveStopped = resolve; });
  const onSignal = (signal) => {
    stop(signal).catch((error) => {
      logger.error?.('gateway shutdown failed', { signal, error: String(error?.message || error) });
    });
  };

  async function stop(signal = 'manual') {
    if (stopPromise) return stopPromise;
    stopPromise = (async () => {
      signals.off?.('SIGTERM', onSignal);
      signals.off?.('SIGINT', onSignal);
      let shutdownError;
      try {
        await closeServer(server);
      } catch (error) {
        shutdownError = error;
      }
      try {
        await auth.close();
      } catch (error) {
        shutdownError ||= error;
      } finally {
        resolveStopped();
      }
      if (shutdownError) throw shutdownError;
      logger.info?.('gateway stopped', { signal });
    })();
    return stopPromise;
  }

  signals.once?.('SIGTERM', onSignal);
  signals.once?.('SIGINT', onSignal);
  logger.info?.('PaperBanana auth gateway listening', { port: config.port });
  return { config, server, stop, stopped };
}

function listen(app, port, host) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, host);
    server.once('listening', () => resolve(server));
    server.once('error', reject);
  });
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error && error.code !== 'ERR_SERVER_NOT_RUNNING') reject(error);
      else resolve();
    });
  });
}
