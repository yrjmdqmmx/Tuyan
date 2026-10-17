# Isolated UI tests

For investigations, run one exact test name per fresh process group on macOS/Linux:

```sh
python3 scripts/test-one.py tests/journal-bookshelf.test.mjs \
  'reduced motion preserves filters and returns focus to the originating book' \
  --output /tmp/tuyan-test-evidence --label reduced-motion
```

The external monitor samples the entire child process group, stops it above 600 MiB RSS, after 10 seconds, or after 128 KiB of output, and cleans up on interruption. V8 old-space is separately capped at 384 MiB. Logs and peak-memory measurements go to the chosen evidence directory. Sampling can overshoot briefly; this is not a sandbox or a substitute for finding a leak. A zero exit with `tests 0` is not evidence that a test ran: use an exact existing name and inspect its summary.

Do not compare live DOM objects with `assert.equal(element, null)` or `assert.equal(document.activeElement, element)`. A failed Node assertion can recursively inspect React Fiber objects and build enormous diagnostic strings. Instead assert a boolean with a concise message, or compare a bounded attribute/text value. This preserves the assertion while keeping failure reporting small. In particular, never put DOM-object equality inside a retrying `waitFor` callback.

The October 16 journal regression was an obsolete exclusion: `humanities search...` expected PLOS ONE to be absent, despite its new cross-disciplinary humanities tag. The safe diagnostic identified the exact button and test line; updating that expectation and independently checking the primary-category exclusion fixed the failure. Do not remove the journal's correct tag to satisfy the old test. The separate historical/refinement failures required opening a book before asserting its details; their business assertions remain unchanged.
