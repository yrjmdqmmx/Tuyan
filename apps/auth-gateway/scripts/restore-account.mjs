import fs from 'node:fs';
import { MongoClient } from 'mongodb';
import { inspectAccountRestoration, restoreAccountIdentity } from '../src/account-restoration.js';

// Run the bundled operator in a one-off container with the root password file
// mounted read-only. Never print the URI, password, email, IDs or stored content.
const [mode, userFingerprint, expectedReviewSha256] = process.argv.slice(2);
if (!['inspect', 'restore'].includes(mode)) throw new Error('Usage: restore-account inspect|restore fingerprint [review-sha256]');
if (mode === 'restore' && process.env.PAPERBANANA_RESTORATION_QUIESCED !== 'true') throw new Error('RESTORATION_REQUIRES_STOPPED_CORE_AND_GATEWAY');
const password = fs.readFileSync('/run/secrets/mongo_root_password', 'utf8').trim();
const client = new MongoClient(`mongodb://paperbanana_root:${encodeURIComponent(password)}@mongodb:27017/?authSource=admin&replicaSet=rs0`);
try {
  await client.connect();
  const options = { client, authDb: client.db('paperbanana_auth'), businessDb: client.db('paperbanana_business'), userFingerprint, expectedReviewSha256 };
  const result = mode === 'inspect' ? (await inspectAccountRestoration(options)).summary : await restoreAccountIdentity(options);
  console.log(JSON.stringify(result));
} catch (error) { console.error(/^RESTORATION_[A-Z_]+$/.test(error.message) ? error.message : 'RESTORATION_OPERATOR_FAILED'); process.exitCode = 1; }
finally { await client.close(); }
