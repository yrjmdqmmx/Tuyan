#!/usr/bin/env python3
"""Generate the legacy www.paperbanana.asia redirect site (static, no build step)."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent / "site"
TARGET = "https://tuyansci.cn"
PAGES = {
    "index.html": "/",
    "about.html": "/about.html",
    "privacy-policy.html": "/privacy-policy.html",
    "terms-of-service.html": "/terms-of-service.html",
    "changelog/index.html": "/changelog/",
    "leaderboard/index.html": "/leaderboard/",
    "leaderboard/methodology/index.html": "/leaderboard/methodology/",
}

TEMPLATE = """<!doctype html>
<html lang="zh-CN">
<head>
<script>location.replace('{target}' + location.pathname + location.search + location.hash);</script>
<meta charset="utf-8">
<title>图研 Tuyan 已迁移到 tuyansci.cn</title>
<link rel="canonical" href="{canonical}">
<meta http-equiv="refresh" content="0; url={canonical}">
<meta name="viewport" content="width=device-width, initial-scale=1">{extra}
</head>
<body>
<p>图研已迁移到 <a href="{canonical}">tuyansci.cn</a>。</p>
</body>
</html>
"""

# 404.html: canonical is static fallback to the homepage, then rewritten to the same path in JS.
EXTRA_404 = """
<script>(function(){{var l=document.querySelector('link[rel=canonical]');if(l)l.href='{target}'+location.pathname;}})();</script>""".format(target=TARGET)


def write(rel: str, canonical: str, extra: str = "") -> None:
    p = ROOT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(TEMPLATE.format(target=TARGET, canonical=canonical, extra=extra), encoding="utf-8")


def main() -> None:
    for rel, path in PAGES.items():
        write(rel, TARGET + path)
    write("404.html", TARGET + "/", EXTRA_404)
    (ROOT / "robots.txt").write_text("User-agent: *\nAllow: /\n", encoding="utf-8")
    (ROOT / ".nojekyll").write_text("", encoding="utf-8")
    (ROOT / "CNAME").write_text("www.paperbanana.asia\n", encoding="utf-8")


if __name__ == "__main__":
    main()
