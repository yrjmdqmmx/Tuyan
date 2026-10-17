# SVG review raster runtime

`src/svg-review.ts` returns the unchanged complete SVG, its UTF-8 SHA-256, an
actual resvg PNG, PNG SHA-256, dimensions, code diagnostics and font provenance.
Successful rendering does **not** certify visual quality, completeness of the
scientific content, text placement, readability, or the absence of overlap.

The worker parses XML with `saxes@6.0.0`, accepts a bounded static SVG subset,
and renders with `@resvg/resvg-wasm@2.6.2`. SVG namespace, ordinary groups, defs,
internal use/gradient/marker references and basic CSS are supported. At most two
clip-path attribute or nested SVG/symbol viewport uses (including expanded references) are supported; CSS clipping
is rejected. Filters, masks, patterns, blending/isolation and nontrivial opacity
are rejected because tiny inputs can allocate large intermediate WASM canvases.
Use ordinary groups, geometry, gradients and leaf fill-opacity/stroke-opacity.
Marker reference chains have maximum depth two; many independent ordinary arrow
markers remain supported. Expanded attribute/geometry content is limited to two
million characters.
DTD/entities, XML processing instructions, foreign namespaces/elements, scripts,
events, animation, links, image/feImage (including data URLs), external references,
CSS at-rules/escapes/variables and resource-producing CSS functions are rejected.
Malformed XML is rejected; the module does not repair or rewrite source. XML 1.0
and UTF-8 only. Embedded raster figures must use the PNG workflow.

Limits: 5 MiB UTF-8 source, 4096 px maximum edge, 8 million pixels, 20,000 source
elements, depth 64, 50,000 expanded elements, 100,000 text code units and 32 font
families. Each worker has a 15-second wall deadline; waiting for capacity has a
separate 15-second deadline. At most two workers run and twelve requests wait.
Workers are terminated before releasing capacity. V8 heap/stack limits supplement
these bounds. Each WASM instance additionally has a **VM-enforced 256 MiB linear
memory maximum**. `wasm-memory.cjs` verifies the exact upstream 2.6.2 binary SHA-256
(`22bf6e9f9a100d972da0411a69c5ba504367fc1fa87b3b64e3f35e53926d2d70`), validates its
single unshared wasm32 memory definition (23 initial pages), and adds a 4096-page
maximum to an in-memory copy of the memory section before compilation. The disk
dependency, code section, SVG and raster are unchanged. A changed binary or memory
layout fails closed pending a fresh audit; memory imports are forbidden. WASM
allocation/stack traps and worker heap exhaustion fail with
`SVG_REVIEW_RESOURCE_LIMIT`, never a partial raster or silently removed effect.

The linear-memory cap is not a total-process RSS cap: JavaScript objects, font
buffers, compiled code, PNG transfer buffers and worker overhead are additional.
The service container remains responsible for OS process memory isolation. Tests
verify the cap with actual WebAssembly memory.grow, force a real resvg allocation
failure under a lower test budget, and render 8MP Chinese/scientific content under
the production cap. Resource cases run in separate child processes with a heap
limit, RSS watchdog and execution timeout.

Fonts are original unmodified upstream binaries under SIL Open Font License 1.1;
each license and an immutable upstream URL/SHA-256 are included in `fonts/`.
Files are checksum-verified before use. No system font lookup or runtime download
is used. Noto Sans Regular supplies Latin, Greek and common scientific symbols;
Noto Sans CJK SC Regular and Noto Sans Math Regular supply fallback glyphs. A
Unicode cmap lookup rejects unsupported text rather than silently dropping it or
rendering a missing-glyph box. These are not complete Unicode coverage or arbitrary
font support. Only regular faces are bundled. Requested Arial/Times/custom/generic
families can map to these fonts, so exact typography is not promised; diagnostics
identify unsupported named families and bold/italic requests. Text converted to
paths has no editable text or glyph-coverage guarantee.

`manifest.json` pins upstream files and their checksums. Renderer/font versions are
returned with each result so a future font update is an explicit raster change.
Hashes are reproducible within the pinned runtime; SVG and PNG hashes are separate
and the SVG is never rewritten after hashing. PNGs may differ across renderer
versions, so persist the returned artifact rather than reconstructing it later.

`pnpm deploy --prod --legacy` includes this asset directory. Production starts with
`WORKDIR=/app`; local source and bundled fixtures run from the API package or the
repository root. Those paths are preferred because the legacy esbuild configuration
replaces `import.meta.url` for unrelated benchmark code. Unbundled TS also supports
module-relative assets. Missing assets/fonts fail explicitly. The Dockerfile runs
`node assets/svg-review/smoke.cjs` against the packaged CJS renderer; it verifies
that real Chinese and scientific text changes the output pixels, and also renders
a 4000 by 2000 (8MP) figure under the WASM memory cap.

Upstream references: [resvg WASM font interface](https://github.com/thx/resvg-js/blob/main/wasm-binding.ts),
[saxes XML parser](https://github.com/lddubeau/saxes), [Noto CJK](https://github.com/notofonts/noto-cjk),
[Noto Sans](https://github.com/notofonts/noto-fonts), [Noto Math](https://github.com/notofonts/math).
Memory limit encoding and growth semantics follow the [WebAssembly memory types](https://webassembly.github.io/spec/core/binary/types.html#memory-types)
and [memory.grow instruction](https://webassembly.github.io/spec/core/exec/instructions.html#exec-memory-grow).
