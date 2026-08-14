#!/usr/bin/env node

import { pathToFileURL } from 'node:url';

import { redactSensitiveText, validatePositiveInteger } from './common.mjs';
import { exportSourceBucket } from './source-export-lib.mjs';

const USAGE = `Usage: node source-export.mjs --output <new-bundle-directory>

Runs only inside an existing Laf runtime/pod. Required environment:
  PAPERBANANA_BUCKET

Optional environment:
  MIGRATION_CONCURRENCY          default: 4
  MIGRATION_MAX_OBJECT_BYTES     default: 5368709120
  MIGRATION_SIGNED_URL_TTL       default: 900
`;

function parseArguments(argv) {
  if (argv.includes('--help') || argv.includes('-h')) return { help: true };
  if (argv.length !== 2 || argv[0] !== '--output' || !argv[1]) throw new Error(USAGE.trim());
  return { outputDir: argv[1] };
}

function integerEnvironment(name, fallback) {
  if (process.env[name] === undefined) return fallback;
  const value = Number(process.env[name]);
  return validatePositiveInteger(value, name);
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(USAGE);
    return;
  }
  const bucketName = process.env.PAPERBANANA_BUCKET;
  if (!bucketName) throw new Error('Missing required environment variable: PAPERBANANA_BUCKET');

  const imported = await import('@lafjs/cloud');
  const cloud = imported.default || imported.cloud || imported;
  if (typeof cloud?.storage?.bucket !== 'function') {
    throw new Error('The Laf runtime does not provide cloud.storage.bucket');
  }
  await exportSourceBucket({
    bucket: cloud.storage.bucket(bucketName),
    outputDir: options.outputDir,
    concurrency: integerEnvironment('MIGRATION_CONCURRENCY', 4),
    maxObjectBytes: integerEnvironment('MIGRATION_MAX_OBJECT_BYTES', 5 * 1024 * 1024 * 1024),
    signedUrlExpiresSeconds: integerEnvironment('MIGRATION_SIGNED_URL_TTL', 900),
  });
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main().catch((error) => {
    process.stderr.write(`Source export failed: ${redactSensitiveText(error)}\n`);
    process.exitCode = 1;
  });
}

export { main };
