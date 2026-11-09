# Actual figure generation completion

Spec: user's six-part request in this conversation, 2026-10-10. Existing worktree and every prior change must be preserved. Local implementation only; no deployment/commit. Mini Program remains paused. Do not change schematic SVG review algorithms. Provider calls require chosen route and cost scope; programmatic tests do not depend on that answer.

## Global constraints

Stable type IDs; never fabricate numeric inputs, statistical significance or evidence. Immutable user data drives fixed renderers. PNG and SVG share one figure scene, SVG has editable text and vector data marks. Class/type, variants, analytical methods have separate implementation and validation states. Reference license gates stay. No broad overwrites. User approval between development batches is not required.

## Task 1: Candidate data types

Implement all currently candidate data types: network, euler, sankey, chord, radar, qq, streamgraph, cumulative_incidence, matrix_link_overlay, parallel_coordinates, treemap, circle_packing, alluvial, point_map, choropleth, enrichment, gene_track, protein_domain, motif_logo, genome_circos, synteny, phylogenetic, dendrogram.

Owned files: packages/figure-taxonomy/src/plot.js, index.js (validation only), capabilities.js, new specialist renderer/schema/fixture modules in that package; scripts/figures candidate QA scripts; corresponding package tests. Do not touch worker, runtime handler, UI, shared task types, catalog.js except ask controller for integration.

Use dedicated input/option contracts and actionable validation, real calculations and vector Matplotlib marks. Inputs: use existing figureData rows/units/options and figureAnalysis; new nested fields must live in options and have deterministic validation. User-provided precomputed quantities allowed where scientifically meaningful, but clearly document which are calculated vs supplied. Implement necessary Q-Q quantiles, competing risk Aalen-Johansen, hierarchy area allocation, linkage from explicit observations or validated supplied linkage, sequence frequency/information. No network access or new hidden analytical assumptions in renderers. Bound time/memory. Existing 40 types retain behavior; fix obvious scientific error if needed and document.

Render code must produce fig (and optionally ax) for existing worker; do not save files or embed rasters. All numerics, glyph geometry and outcome checks real; produce fig._tuyan_validation JSON-serializable object with typeId, computations and meaningful numeric checks. SVG-specific image rejection will be handled by controller.

Dedicated schemas export stable fields/help/example body so frontend and fixtures reuse them; complete synthetic examples for each type, including options. Test invalid/missing/boundary inputs. Use supported explicit base variants (e.g. 2-set Euler, rooted length tree) with precise limits; do not silently call unimplemented variants supported. Preserve analysis metadata and state supplied vs calculated. Keep capability states conservative until actual render tests pass; send controller ready IDs and exact evidence. No subagents, no commit. Browse primary scientific/docs sources when resolving unfamiliar algorithms.

Run actual Python renders for all 23 using /Users/a1-6/.cache/tuyan-figure-qa/bin/python if available (locate existing runtime otherwise); retain sample outputs and numeric checks under docs/infographic-v400/completion/evidence/candidates. Coordinate interface with controller, who implements worker dual outputs and composition independently. Full report to task-1-report path, brief return with counts/tests/concerns.

## Task 2: Same-scene PNG/SVG and runtime integration

Controller: worker creates same Matplotlib scene and saves both PNG and SVG; reject image SVG tags, keep svg.fonttype none, numeric metadata and output hashes. Core saves requested SVG plus PNG review raster and dataValidation; restore/download formats accurate, preserve legacy PNG. Composite renderer generates independent validated subpanels, uses program for data, vector generator for schematic, assembles true vectors with unique IDs and panel labels, rasterizes final SVG to PNG. No model-generated numeric subpanel. Respect version/hash review and unknown-call protection.

## Task 3: Frontend input, format, capability and recovery

After Task 1 schema stabilizes: dedicated instructions and JSON structured options for complex inputs, shared examples clearly synthetic and opt-in. PNG/SVG both selectable for supported types; input draft saved per type and panel, task restore includes format/data/options. Candidate status only revised after actual outputs/tests. Variant and analysis support explicit.

## Task 4: End-to-end matrix, visual artifacts and model transport

Per type and format record inputs, missing/boundary checks, reference matching/actual pixel transport, planning/rendering/review. Programmatic all data types output both formats plus actual opening and numerical checks; schematic 27x2 mocked transport distinct from real-model generation. Representative and full real runs depend on user's channel/cost scope. Complete reports and residual gates, do not claim image generation quality from mocks. Independent task review and final review required.
