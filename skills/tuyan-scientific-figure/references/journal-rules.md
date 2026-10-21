# Versioned journal rules

Read the public `tuyan://journals/index/v1` resource to discover journal IDs, current version, archived versions, source dates and scope enums. Read `tuyan://journals/<exact-version>` for full journal records and their sources. Offline, the identical records are under `journals.archives` in `offline-snapshot.v1.json`.

These records are a dated curation of official sources, not a guarantee that a publisher has not changed its requirements. Keep source URLs, verifiedOn, applicability, requirement level, operation-specific AI policy and conflicts. Recheck authoritative sources when the task requires current submission advice. An unknown policy is neither a verified prohibition nor permission.

A local selection has exactly:

```json
{"journalId":"nature","version":"2026-10-19.v11","stage":"initial","purpose":"main","contentType":"schematic","rasterKind":"color","widthMm":89}
```

This is a scope example, not an eligibility claim. Use the actual journal, stage (`initial`, `revision`, `production`), purpose (`main`, `supplementary`, `graphical_abstract`, `toc`, `cover`), content type (`schematic`, `data`, `primary`, `illustration`), raster kind (`color`, `grayscale`, `lineart`) and final width. Never infer primary-image provenance merely from a figure type.

Add `--journal-selection <selection.json>` to `prepare-knowledge.mjs`. The selection stays local. `knowledge-used.json` records the selected journal snapshot, applicable rules, policy issues and content hash. Exact saved versions remain resolvable; never substitute current rules for an old selection. If the online knowledge and installed runtime differ, update the complete Skill first.

Planning, rendering and review must retain applicable requirements. Check final physical size, pixel dimensions/resolution, text/font metrics, labels, color, format and required disclosures against the final exported files. Generation, generative refinement, non-generative editing and evaluation are different operations. Primary research images require a suitable evidence-preserving workflow; generative transformation cannot retain their evidentiary status.

The local helper separates verified policy restrictions, pending/conflicting evidence and manual checks. Website-specific capability messages describe their original scope; do not claim that a local renderer supports a feature just because a journal permits it. Statistical correctness, scientific fidelity and publisher acceptance remain separate from format checks. Upscaling, DPI metadata changes and file conversion do not establish compliance.
