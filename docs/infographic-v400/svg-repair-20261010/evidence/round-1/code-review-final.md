# Task 1 final independent review — P1 closure

Date: 2026-10-10. Worktree: `/Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009`.

Reviewed final source: all **18** entries in `task-1-final-code-hashes.json` independently matched the working files. `diagram-topology.ts` SHA-256: `2caedee383fff3dea0d1524f4d48409a5798e4c6aac6222fd7a827bd1ad8188c`. Earlier findings and first-wave results remain in `task-1-review.md` and `task-1-review-followup.md`; neither was overwritten.

## Verdict

**Both P1 findings are closed for this final freeze. Scoped spec/code review passes with no remaining identified blocker.** This clears the code-review gate for controller-owned real-provider acceptance. It does not certify real model semantics, the live outputs, native-provider behavior, Linux production or deployment.

The initial label-association fix remains effective. The follow-up now constrains accepted root/scalar rendering values rather than only blocking particular attribute names: exact zero-origin viewBox, supported dimensions, a bounded uniform font scale, compiler-derived node dimensions/strokes/radii, consistent label positions, supported primitive syntax, actual straight-edge rounded-rectangle ports, and outward first/last path segments. The new checks are confined to the typed compiler route. No weakening of the original strict SVG renderer was found.

## Independent final execution

A single targeted in-memory Node/tsx assertion script independently regenerated original workflow/state graphs and the generic reverse/parallel/self-loop graph, performed the seven tamper mutations below, and completed with **exit 0**. No full suite, model calls or artifact writes were performed by that script.

| Mutation on normal workflow SVG | Final checker result |
|---|---|
| Swap yes/no x/y only, preserve IDs and labels | Rejected: `ambiguous_or_wrong_edge_label_position:e2`, `:e5` |
| Add `stroke-dasharray="0 10000"` to `edge_e2` | Rejected: `unexpected_attribute:edge_e2` |
| Add `dx="-300"` to `edgeLabel_e2` | Rejected: `unexpected_attribute:edgeLabel_e2` |
| Append white `rect id="arrow_fake"` | Rejected: `unexpected_element_or_order:arrow_fake`, `element_count_mismatch` |
| Change viewBox origin to `10000 10000` | Rejected: `invalid_viewbox` |
| Change `node_n0` stroke-width to `10000` | Rejected: `unsupported_stroke_width:node_n0`, `node_outside_canvas:n0` |
| Change `node_n0` rx to `10000` | Rejected: `unsupported_corner_radius:n0`, `wrong_endpoint:e0` |

The shifted-origin source was also sent to the actual programmatic renderer again. It still produces the original fully transparent counterexample (all RGBA channels min=max=0, PNG SHA-256 `d86a081d1e2c466ff76e6aa2426d0035b8cae313785b674aa0a6277cefdc37b8`), and the geometry inspector now correctly rejects it. Thus closure is based on the same render-visible failure, not a different string fixture.

Normal graphs were independently recompiled and rasterized from original saved methodologies:

| Graph/output | Result | Relations | Font px | PNG bytes |
|---|---|---:|---:|---:|
| Workflow at actual 1K composite-panel viewport | Pass | 7 | 14.662 | 17,289 |
| Workflow at actual 2K composite-panel viewport | Pass | 7 | 29.686 | 37,822 |
| State transitions, 1K | Pass | 7 | 19.6 | 21,160 |
| State transitions, 2K | Pass | 7 | 39.2 | 48,979 |
| Generic Alpha/Beta parallel events, return and self-loop | Pass | 4 | — | 13,316 |

These normal cases show that rejection does not simply disable all generated diagrams or the required reverse/parallel/self-loop support. They do not establish that every graph within the node/edge count limits fits every canvas; explicit unsupported layout remains an allowed outcome.

## Producer evidence and scope checks

- Inspected final regression source and `review-followup-fix-tests.log`: **15/15**, zero failures. This is implementer-run geometry/runtime suite evidence; it is separate from the reviewer’s targeted execution above.
- Inspected `followup-fix-check-build-exits.json`: Core typecheck and build each report exit **0**, with exact pnpm command arrays. The reviewer did not rerun these commands or the controller's full Core suite.
- Read the updated `task-1-report.md`, including its preserved first-wave/follow-up history. It now accurately identifies why the scalar/root fix was necessary and maintains explicit mock/model/provider limits.
- Independently rehashed **237** protected strict-renderer/assets and Mini Program paths against the controller baseline again: **all matched**.
- Prior reviewed version binding, immutable topology, storage-preservation sequencing, independent semantic audit, composition viewport/data preservation and public-error behavior remain as described in the original report; the final patch introduces no identified regression in those inspected paths.
- No product edits, paid calls, credential reads, shared matrix regeneration, commits, pushes or deployment were performed. The reviewer wrote only this final report during this pass.

## Acceptance limits retained

Local geometry establishes consistency within the compiler's supported primitive vocabulary. It does not prove that original prose was interpreted correctly; the actual model must still independently compare required relationships, events and nodes against the original methodology/caption. Rendered edge crossings and typography still require visual judgment. A changed SVG requires its own actual version-bound review. Controller-owned live Core/provider validation and its explicit quality result remain outstanding.
