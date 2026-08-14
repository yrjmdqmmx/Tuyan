# PaperBanana whole-bucket object migration

This directory contains two deliberately separate roles:

- `source-export.mjs` runs inside an existing Laf runtime/pod and obtains the source bucket through `@lafjs/cloud`.
- `target-import.mjs` runs on the Hong Kong host and talks to Alibaba OSS only through the configured internal endpoint.

Neither command accepts credentials on the command line, prints credentials, or prints signed URLs. Provision required environment variables through the existing runtime/secret mechanism, not shell history. Do not copy a target `node_modules` directory into Laf.

## Safety contract

The exporter lists the whole bucket from an empty marker. It has no prefix or database-derived mode. It follows every explicit marker until `IsTruncated`/`isTruncated` is false and aborts if pagination stalls. Every object is streamed with a hard byte bound, hashed with SHA-256, and stored beneath `objects/` using a collision-safe base64url encoding of the complete key. `manifest.jsonl` records the exact key, relative file, actual size, SHA-256, Content-Type, settable headers, ETag, Last-Modified, and the source of metadata. `export-summary.json` binds the manifest hash and object/page/byte counts.

The importer validates the complete manifest and all local sizes/hashes before the first upload. It rejects malformed or traversal-like keys, unexpected paths, symlinks, duplicates, unapproved metadata, count mismatches, and unsupported SDK interfaces. It uploads each exact key, then checks destination size and Content-Type and streams every object back to verify SHA-256. Finally it paginates the entire target bucket and requires an exact key/count match. Start with an empty target bucket; unrelated target objects intentionally make verification fail.

The default per-object ceiling is 5 GiB. If the source contains a larger valid object, set `MIGRATION_MAX_OBJECT_BYTES` to a deliberate larger safe-integer byte value before export. A failed export removes only its uniquely named partial directory. It never overwrites an existing final bundle directory.

## 1. Verify tooling

On a normal checkout, tests need only Node 20 or newer:

```sh
cd deploy/hk-single-host/migration
npm test
```

On the target host, install the locked production dependency before import:

```sh
cd /opt/paperbanana/release/deploy/hk-single-host/migration
npm ci --omit=dev
node target-import.mjs --help
```

## 2. Export inside the Laf runtime/pod

Copy only `common.mjs`, `source-export-lib.mjs`, and `source-export.mjs` into a writable working directory in the existing Laf runtime/pod. The runtime must already provide `@lafjs/cloud` and `PAPERBANANA_BUCKET`. Optional variables are `MIGRATION_CONCURRENCY`, `MIGRATION_MAX_OBJECT_BYTES`, and `MIGRATION_SIGNED_URL_TTL`.

After stopping new writes and draining queued/running jobs, run:

```sh
node source-export.mjs --output /tmp/paperbanana-objects-final
```

Retain `manifest.jsonl` and `export-summary.json` with the `objects/` tree. Transfer the bundle as one archive and verify the archive checksum using the operator's normal secure transfer procedure. Do not edit the manifest or summary.

## 3. Import on the Hong Kong host

Use an empty private target bucket. The target process requires these existing secret/runtime variables:

- `OSS_REGION`
- `OSS_ACCESS_KEY_ID`
- `OSS_ACCESS_KEY_SECRET`
- `PAPERBANANA_BUCKET`
- `OSS_INTERNAL_ENDPOINT` (must be HTTPS on `oss-*-internal.aliyuncs.com`)

`MIGRATION_CONCURRENCY` is optional and defaults to 4. Run:

```sh
node target-import.mjs --bundle /opt/paperbanana/migration/paperbanana-objects-final
```

Success output reports manifest, upload, verification, target pagination, object, and byte counts without secrets or URLs. Preserve the source bundle and keep Laf read-only for rollback until the separate database checks, application smoke tests, and cutover approval are complete.
