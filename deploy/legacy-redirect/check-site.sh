#!/usr/bin/env bash
# Verify the static legacy-domain redirect site before it is published to GitHub Pages.
# Shared by deploy-legacy-redirect.yml and the `pages` job of deploy-hangzhou.yml so both
# publish exactly the same artifact and neither can put the full web app back on
# www.paperbanana.asia.
set -eu
d="${1:-deploy/legacy-redirect/site}"
for f in index.html 404.html about.html privacy-policy.html terms-of-service.html \
         changelog/index.html leaderboard/index.html leaderboard/methodology/index.html \
         robots.txt .nojekyll CNAME; do
  test -f "$d/$f" || { echo "legacy redirect site is missing $f" >&2; exit 1; }
done
grep -qx 'www.paperbanana.asia' "$d/CNAME"
grep -q 'rel="canonical" href="https://tuyansci.cn/"' "$d/index.html"
! grep -qi 'disallow' "$d/robots.txt"
# The redirect site is static HTML only; a bundled app would ship JS/CSS assets.
if [ -d "$d/assets" ]; then echo "legacy redirect site must not contain a web app bundle" >&2; exit 1; fi
echo "legacy redirect site OK: $d"
