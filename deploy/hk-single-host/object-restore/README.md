# OSS offline object restore

This tool restores **existing** manifest/checksum bundles to an explicitly selected OSS bucket. Its current purpose is integrity-checked recovery of archived objects. It is not a service deployment or a source-platform rollback tool. The source-platform exporter has been removed.

Run locally with Node 24: `npm ci --omit=dev`, `npm test`, then `node target-import.mjs --help`.

An actual restore writes data and requires separate operator authorization. Use an **empty target bucket**: verification compares the **entire bucket**, not a subset, and reports extra/missing objects. Never use a production bucket as an experiment. Provide credentials through the approved environment, never command arguments or logs.

Required environment: `OSS_REGION`, `OSS_ACCESS_KEY_ID`, `OSS_ACCESS_KEY_SECRET`, `PAPERBANANA_BUCKET`, `OSS_INTERNAL_ENDPOINT` (official HTTPS internal endpoint). `MIGRATION_CONCURRENCY` remains this offline bundle tool's concurrency option, default 4; it is not a running service setting.

After approval: `node target-import.mjs --bundle /absolute/path/to/existing-bundle`. Before uploading, the importer checks object keys, relative paths, duplicate entries, sizes and SHA-256 hashes. It preserves settable metadata, verifies uploaded bytes and paginates the whole bucket. It does not modify MongoDB or publish a service.

Current architecture and daily Mongo backups: [host operations](../README.md). Original migration provenance remains in Git history; no old-platform account, SDK or runtime is needed by this restore tool.
