# Legacy domain redirect (www.paperbanana.asia)

Static site published to GitHub Pages (custom domain `www.paperbanana.asia`) so the
legacy domain stops serving a duplicate of the Tuyan web app and points to
`https://tuyansci.cn` instead.

- Every page: inline `location.replace()` to the same path/query/hash on tuyansci.cn,
  `<meta http-equiv="refresh">` no-JS fallback, `rel=canonical` to the tuyansci.cn URL,
  no `noindex` (so Google consolidates signals onto the canonical).
- Known public paths are real files (200); any other path is served by `404.html`,
  which redirects to the same path on tuyansci.cn.
- `robots.txt` allows everything so crawlers can see the canonical/redirect.
- `api.paperbanana.asia` is unaffected (separate DNS, HK nginx).

Regenerate with `python3 deploy/legacy-redirect/generate.py`; publish with the
`Deploy Legacy Domain Redirect` workflow (manual dispatch).

Note: the `pages` job in `deploy-hangzhou.yml` (on `codex/hangzhou-production`)
republishes the full web app to the same Pages site after each production deploy,
which would overwrite this redirect site.
