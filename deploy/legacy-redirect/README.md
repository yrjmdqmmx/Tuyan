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

The `pages` job in `deploy-hangzhou.yml` publishes this same site (checked by
`check-site.sh`) after each production deploy, so a release keeps the redirect in
place instead of republishing the full web app. The manual `Deploy GitHub Pages`
workflow (`deploy-pages.yml`) still builds the full app; do not dispatch it while
the legacy domain is retired.
