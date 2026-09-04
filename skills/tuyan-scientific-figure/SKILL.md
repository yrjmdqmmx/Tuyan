---
name: tuyan-scientific-figure
description: Create, refine, or evaluate 科研图示 and scientific figures with local FigureSpec, optional PaperBananaBench retrieval, image-tool or code rendering, qualitative critique, and reproducible local outputs.
---

# Tuyan scientific figure workflow

Use this workflow for scientific diagrams and quantitative plots. Keep the user's research material and every generated artifact on the user's machine.

## Privacy boundary

Never send any paper, image, prompt, credential, API key, FigureSpec, draft, or output to the Tuyan MCP. The MCP is anonymous public knowledge only. It accepts five enum fields and returns templates, rules, schemas, and version metadata. Generation uses only capabilities already available to the current agent.

Do not sign in to Tuyan, create a remote job, set a cookie, upload research content, or ask Tuyan for a provider key. Do not persist user content outside the local working directory.

## 1. Classify the request

Choose one operation and one visual category:

- `create`: make a new figure.
- `refine`: change an existing figure while preserving everything outside the requested scope.
- `evaluate`: inspect and record issues without changing the figure unless the user separately requests a refinement.
- `method_framework`: research method modules, contributions, and information flow.
- `workflow`: ordered steps, decisions, inputs, and outputs.
- `system_architecture`: components, layers, interfaces, and data or control flow.
- `mechanism`: entities, causal processes, and mechanism chains.
- `comparison`: aligned dimensions across methods, conditions, or outcomes.
- `timeline`: chronological events, phases, or milestones.
- `data_stat`: quantitative charts rendered from data with code.
- `concept_map`: classification, dependency, containment, or semantic relationships.

Use `png` unless the user requests `svg`. Default to `1K` and `16:9`; explicit user requirements win. A bitmap must never be renamed or wrapped and presented as SVG.

## 2. Load public workflow knowledge

If the Tuyan MCP is configured, call only `tuyan.get_workflow_bundle` with exactly:

```json
{
  "operation": "create",
  "visualCategory": "method_framework",
  "outputFormat": "png",
  "locale": "zh-CN",
  "knowledgeMajor": 1
}
```

Substitute only enum values. Never add free text. Read schemas through the declared `tuyan://` Resources when needed. If the MCP is unavailable, continue with [references/offline-snapshot.v1.json](references/offline-snapshot.v1.json). Record the knowledge version and hash used.

## 3. Offer the optional local Retriever

On the first relevant use in a workspace, ask the user before any PaperBananaBench download. Explain that the fixed upstream revision currently has no declared dataset license. Follow [references/paperbanana-bench.md](references/paperbanana-bench.md) only after consent.

If the user skips the download, set Retriever status to `skipped` and continue. If download or validation fails, set it to `download-failed` or `validation-failed`, disable Retriever for this run, and continue. Never make Retriever availability a prerequisite for FigureSpec, generation, evaluation, or export.

When Retriever is enabled, write a short local query file and run `scripts/retrieve-paperbanana-bench.mjs` against the verified archive. Use task `plot` for `data_stat` and `diagram` for the other categories. Choose the result limit based on the task; do not enforce a fixed count. Inspect the ranked results locally, then record each selected record ID and why it was used.

## 4. Create the local work directory and FigureSpec

Create `./tuyan-output/<timestamp>-<slug>/`. Store source notes or source-file references under `sources/`, selected case references under `references/`, and the exact prompts under `prompts/`. Do not copy source material unless the user needs a self-contained package.

Write `figure-spec.json` before generation or evaluation. Conform to `tuyan://schemas/figure-spec/v1`. Preserve exact scientific terminology, entity relationships, directionality, units, and requested labels. For `refine`, explicitly list target changes and non-target elements to preserve.

## 5. Execute locally

For every category except `data_stat`, use an image generation or image editing capability already available to the agent. Save each draft locally. If the requested format is SVG but the tool only returns a bitmap, return PNG and state that true SVG is unavailable.

If there is no image generation capability, set the FigureSpec renderer to `spec-only`, complete and save FigureSpec, then clearly stop. Do not pretend that an image exists.

For `data_stat`, save source data, plotting code, PNG, and true SVG. Render from code, not an image model. Verify every number, unit, coordinate or axis range, tick, and legend mapping against the local source. Keep the data and code sufficient to reproduce both outputs.

For `refine`, prefer a localized edit. After every edit, record the target changes achieved and the non-target preservation result.

## 6. Critique and stop

Inspect each draft against the FigureSpec and category checks. Write one qualitative record per round under `critiques/` using `tuyan://schemas/critique-record/v1`. Cite visible evidence and a concrete correction; do not invent a numeric score.

The agent decides the number of references and critique rounds. Stop when there is no material issue, when the required capability is unavailable, or after two consecutive rounds with no improvement. Preserve every retained draft, prompt, and critique record.

## 7. Finalize the reproducibility bundle

Keep the final PNG or true SVG under `final/`. Run:

```bash
node <skill-root>/scripts/finalize-output-bundle.mjs \
  ./tuyan-output/<timestamp>-<slug> \
  --retriever-status skipped
```

Use the actual Retriever status. This writes `manifest.json` with the FigureSpec SHA-256, knowledge version/hash, Retriever state, and every local file SHA-256. Review the manifest before reporting paths to the user.

For installation and MCP client configuration, read [references/client-installation.md](references/client-installation.md).
