# Frozen card sources

`model-card-sources.json.gz` contains UTF-8 source text keyed by commit and original
repository path. It stores only the dependency graphs loaded by the historical
card tests for `8c456709` and `d1fe6ff6`, including their static catalogs. Gzip is
lossless; `manifest.json` exposes each original byte count and SHA-256 for review.
No product or Core execution source is added to this archive.

Tests read this archive directly and need neither Git nor a sibling checkout.
Execution tests instead use the existing complete frozen execution output plus
`../fixtures/execution-inputs-8c456709.json` for the original public metadata and
three OpenRouter defaults. They execute current code against those fixed inputs.

Maintenance commands (read-only Git, no network):

```sh
node scripts/freeze-audit-sources.mjs --check
node scripts/freeze-execution-capability.mjs --check
node scripts/report-changed-tests.mjs --check
```

With history, the first two regenerate from `git show` and compare all source
bytes or execution values. Without the required commits they print `SKIP` and
exit successfully; tests still check committed artifacts. The ledger always
checks its frozen inventory, reviewed file hashes, review rows/counts and Markdown,
and additionally recomputes the complete changed-file inventory and diff hashes
when both historical revisions exist. Without history, discovering newly changed
pre-existing files outside the frozen inventory requires a full-history check.

Omit `--check` only to deliberately regenerate artifacts with full history.
