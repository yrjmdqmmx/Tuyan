import { open } from 'node:fs/promises';
import { opsCount, opsNumber, opsTimestamp, projectCounts, JOB_STATES, FAILURE_CATEGORIES,
  FAILURE_STAGES, REQUEST_STATES, parseOpsQuery } from '../../../packages/api/src/ops-read-contract.mjs';

const missing = () => ({ available: false, reason: 'source_unavailable' });
const sum = values => values.every(value => value !== null) ? values.reduce((a, b) => a + b, 0) : null;
const numbers = (source, keys) => Object.fromEntries(keys.map(key => [key, opsNumber(source?.[key])]));

export async function readHostSnapshot(path, nowMs = Date.now()) {
  if (!path) return { available: false, reason: 'not_configured' };
  let file;
  try {
    file = await open(path, 'r');
    const stat = await file.stat();
    if (!stat.isFile() || stat.size > 16 * 1024) throw new Error();
    const buffer = Buffer.alloc(16 * 1024 + 1);
    const { bytesRead } = await file.read(buffer, 0, buffer.length, 0);
    if (bytesRead > 16 * 1024) throw new Error();
    const record = JSON.parse(buffer.subarray(0, bytesRead).toString('utf8'));
    const sampledAt = opsTimestamp(record.sampledAt), ageMs = nowMs - Date.parse(sampledAt);
    if (record.version !== 1 || record.node !== 'hz' || !sampledAt || ageMs < -60_000) throw new Error();
    const host = record.host;
    const disk = numbers(host?.rootDiskBytes, ['total', 'available']);
    if (!disk.total || disk.available === null || disk.available > disk.total) throw new Error();
    return { available: true, source: 'existing_host_observer', node: 'hz', sampledAt,
      stale: ageMs > 5 * 60_000, ageSeconds: Math.max(0, ageMs / 1000),
      rootDiskBytes: disk, rootDiskAvailableRatio: disk.available / disk.total,
      lowDiskSpace: disk.available / disk.total < 0.1,
      cpuCount: opsCount(host?.cpuCount),
      loadAverage: Array.isArray(host?.loadAverage) ? host.loadAverage.slice(0, 3).map(opsNumber) : null,
      memoryBytes: numbers(host?.memoryBytes, ['MemTotal', 'MemAvailable', 'SwapTotal', 'SwapFree']),
      rootInodes: numbers(host?.rootInodes, ['total', 'available']) };
  } catch { return missing(); }
  finally { await file?.close(); }
}

function coreHealth(raw, nowMs) {
  const sampledAt = opsTimestamp(raw?.sampledAt);
  if (!sampledAt || raw.version !== 1) return missing();
  const ageSeconds = (nowMs - Date.parse(sampledAt)) / 1000;
  if (ageSeconds < -60) return missing();
  return { available: true, sampledAt, stale: ageSeconds > 60, ageSeconds: Math.max(0, ageSeconds),
    codeSha: /^[a-f0-9]{40}$/.test(raw.codeSha || '') ? raw.codeSha : null,
    process: { uptimeSeconds: opsNumber(raw.process?.uptimeSeconds),
      memoryBytes: numbers(raw.process?.memoryBytes, ['rss', 'heapUsed', 'heapTotal']),
      eventLoop: numbers(raw.process?.eventLoop, ['utilization', 'p95Ms', 'maxMs']) },
    database: { sampledAt: opsTimestamp(raw.database?.sampledAt),
      server: raw.database?.server?.available === true ? { available: true,
        ...numbers(raw.database.server, ['uptimeSeconds', 'residentMiB', 'cacheBytes', 'cacheMaxBytes', 'queuedReaders', 'queuedWriters']) } : missing(),
      jobs: raw.database?.jobs?.available === true ? { available: true,
        states: Object.fromEntries(['queued', 'running', 'awaiting_provider'].map(key => [key,
          { count: opsCount(raw.database.jobs.states?.[key]?.count), oldestAgeSeconds: opsNumber(raw.database.jobs.states?.[key]?.oldestAgeSeconds) }])) } : missing() } };
}

export function createOpsService({ accounts, coreRead, hostSnapshotFile, nowMs = Date.now }) {
  const cache = new Map(); // At most one completed result per operation.
  let active = 0;
  async function collect(kind, window) {
    const sampledAt = new Date(nowMs()).toISOString();
    const envelope = { schemaVersion: 1, operation: kind, sampledAt, timezone: 'Asia/Shanghai' };
    if (kind === 'health') {
      const [core, host] = await Promise.all([
        Promise.resolve().then(() => coreRead('health', {})).then(raw => coreHealth(raw, nowMs())).catch(missing),
        readHostSnapshot(hostSnapshotFile, nowMs()),
      ]);
      return { ...envelope, core, host, definitions: { health: 'Partial observations, not proof that every dependency or external provider is healthy', host: 'Host measurements come only from the existing observer; container disk is not host disk' } };
    }
    const result = { ...envelope, window: { ...window, interval: '[from,to)', field: 'createdAt' } };
    const rawPromise = Promise.resolve().then(() => coreRead(kind, window));
    if (kind === 'overview') {
      const [users, tasks] = await Promise.all([
        Promise.resolve().then(() => accounts.overview(window)).then(raw => {
          const total = opsCount(raw.total), registered = opsCount(raw.registered), asOf = opsTimestamp(raw.asOf);
          return total === null || registered === null || !asOf ? missing() : { available: true, sampledAt: asOf, retainedAccounts: total, registrationsInWindow: registered };
        }).catch(missing),
        rawPromise.then(raw => {
          const counts = projectCounts(raw.counts, JOB_STATES), total = sum(Object.values(counts));
          if (total === null || !opsTimestamp(raw.sampledAt)) return missing();
          const ended = counts.succeeded + counts.failed;
          return { available: true, sampledAt: opsTimestamp(raw.sampledAt), total, counts, successRate: ended ? counts.succeeded / ended : null };
        }).catch(missing),
      ]);
      return { ...result, users, tasks, definitions: {
        users: 'Retained account documents; registrations use createdAt. Not DAU or lifetime signups.',
        tasks: 'Retained Core jobs created in the window, with their current status; deleted jobs and workspace-only records are not included.',
        successRate: 'succeeded / (succeeded + failed); null when no ended jobs. Not provider billing or revenue.',
        consistency: 'Sources sampled separately; not a cross-database transactional snapshot.',
      } };
    }
    const failures = await rawPromise.then(raw => {
      const categories = projectCounts(raw.categories, FAILURE_CATEGORIES), stages = projectCounts(raw.stages, FAILURE_STAGES);
      const requestStates = projectCounts(raw.requestStates, REQUEST_STATES), total = sum(Object.values(categories));
      if (total === null || sum(Object.values(stages)) !== total || sum(Object.values(requestStates)) !== total || !opsTimestamp(raw.sampledAt)) return missing();
      return { available: true, sampledAt: opsTimestamp(raw.sampledAt), total, categories, stages, requestStates };
    }).catch(missing);
    return { ...result, failures, definitions: { failures: 'Retained failed Core jobs created in the window, grouped by structured classification. Unknown includes unclassified/legacy errors. No free-text error details.' } };
  }
  return async (kind, input) => {
    const query = parseOpsQuery(kind, input, nowMs()), key = JSON.stringify(query), cached = cache.get(kind);
    if (cached?.key === key && cached.expires > nowMs()) return structuredClone(cached.value);
    if (active >= 4) throw Object.assign(new Error('Operations reader busy; retry later'), { status: 503 });
    active++;
    try {
      const value = await collect(kind, query);
      cache.set(kind, { key, value, expires: nowMs() + 15_000 });
      return structuredClone(value);
    } finally { active--; }
  };
}
