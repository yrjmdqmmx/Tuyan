# PaperBananaBench local Retriever

The Retriever is optional. Ask before the first download in a workspace. Skipping it or any failure only disables few-shot retrieval; the rest of the figure workflow continues.

## Pinned upstream

- Repository: `https://huggingface.co/datasets/dwzhu/PaperBananaBench`
- Revision: `a876264bcd1e826a0320f805f8fb1cd705cf510f`
- File: `PaperBananaBench.zip`
- Bytes: `265846711`
- SHA-256: `a980d23954c0cb47017cdaa8a9029dbea3598791fd269a457482033821927e37`
- Selected corpus: 306 records: 240 plot records (`ref_0` through `ref_239`) plus 66 fixed diagram IDs.
- Upstream license status: a dataset license is not currently declared. Tell the user before downloading and do not infer reuse rights.

## Download after consent

Run from the user's workspace and keep the archive local:

```bash
tuyan_dataset_dir="./.tuyan/cache/paperbanana-bench/a876264bcd1e826a0320f805f8fb1cd705cf510f"
mkdir -p "$tuyan_dataset_dir"
curl --fail --location --output "$tuyan_dataset_dir/PaperBananaBench.zip" \
  "https://huggingface.co/datasets/dwzhu/PaperBananaBench/resolve/a876264bcd1e826a0320f805f8fb1cd705cf510f/PaperBananaBench.zip"
node <skill-root>/scripts/verify-paperbanana-bench.mjs \
  "$tuyan_dataset_dir/PaperBananaBench.zip"
```

The verifier checks byte length, archive SHA-256, the two JSON sources, and the exact 306-record selection. Do not extract or use an archive that fails any check.

For local few-shot retrieval, save a concise query in a local file and choose the useful result count:

```bash
node <skill-root>/scripts/retrieve-paperbanana-bench.mjs \
  "$tuyan_dataset_dir/PaperBananaBench.zip" \
  --task diagram \
  --query-file ./tuyan-output/<timestamp>-<slug>/retrieval-query.txt \
  --limit 4
```

Use `--task plot` for `data_stat`. The script verifies the pinned archive before ranking and never makes a network request.

## Status handling

- User declines: `skipped`.
- Network/download failure: `download-failed`.
- Size, SHA, JSON, count, or ID mismatch: `validation-failed`.
- Complete verification: `enabled`, with the pinned revision in `manifest.json`.

On a later run, compare the MCP dataset Resource with this snapshot. If it advertises a version update, tell the user and ask before downloading the new bytes. Never replace the pinned local corpus silently.
