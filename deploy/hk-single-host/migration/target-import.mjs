#!/usr/bin/env node

import { pathToFileURL } from 'node:url';

import { redactSensitiveText, validatePositiveInteger } from './common.mjs';
import { importTargetBundle, validateInternalEndpoint } from './target-import-lib.mjs';

const USAGE = `Usage: node target-import.mjs --bundle <export-bundle-directory>

Runs only on the Hong Kong target host. Required environment:
  OSS_REGION
  OSS_ACCESS_KEY_ID
  OSS_ACCESS_KEY_SECRET
  PAPERBANANA_BUCKET
  OSS_INTERNAL_ENDPOINT

Optional environment:
  MIGRATION_CONCURRENCY          default: 4
`;

let redactionSecrets = [];

function parseArguments(argv) {
  if (argv.includes('--help') || argv.includes('-h')) return { help: true };
  if (argv.length !== 2 || argv[0] !== '--bundle' || !argv[1]) throw new Error(USAGE.trim());
  return { bundleDir: argv[1] };
}

function requiredEnvironment(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(USAGE);
    return;
  }
  const accessKeyId = requiredEnvironment('OSS_ACCESS_KEY_ID');
  const accessKeySecret = requiredEnvironment('OSS_ACCESS_KEY_SECRET');
  redactionSecrets = [accessKeyId, accessKeySecret];
  const config = {
    region: requiredEnvironment('OSS_REGION'),
    accessKeyId,
    accessKeySecret,
    bucket: requiredEnvironment('PAPERBANANA_BUCKET'),
    endpoint: validateInternalEndpoint(requiredEnvironment('OSS_INTERNAL_ENDPOINT')),
    secure: true,
    authorizationV4: true,
    cname: false,
    sldEnable: false,
  };
  const imported = await import('ali-oss');
  const OSS = imported.default || imported;
  const client = new OSS(config);
  const concurrency = process.env.MIGRATION_CONCURRENCY === undefined
    ? 4
    : validatePositiveInteger(Number(process.env.MIGRATION_CONCURRENCY), 'MIGRATION_CONCURRENCY');
  await importTargetBundle({ bundleDir: options.bundleDir, client, concurrency });
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main().catch((error) => {
    process.stderr.write(`Target import failed: ${redactSensitiveText(error, redactionSecrets)}\n`);
    process.exitCode = 1;
  });
}

export { main };
