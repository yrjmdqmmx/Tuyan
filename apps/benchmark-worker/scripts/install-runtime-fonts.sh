#!/bin/sh
set -eu

# Slim has no OS CA bundle. Bootstrap HTTPS from Node's bundled Mozilla roots;
# Debian Release/package signatures remain required. Install the OS bundle below.
node --input-type=module <<'JS'
import { readFileSync, writeFileSync } from 'node:fs';
import { rootCertificates } from 'node:tls';
const mirrors = [process.env.PAPERBANANA_BENCH_DEBIAN_MIRROR, process.env.PAPERBANANA_BENCH_DEBIAN_SECURITY_MIRROR];
for (const mirror of mirrors) {
  const url = new URL(mirror);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || /\s/.test(mirror)) {
    throw new Error('Benchmark Debian mirrors must be HTTPS URLs without credentials');
  }
}
const sources = '/etc/apt/sources.list.d/debian.sources';
const original = readFileSync(sources, 'utf8');
if (!original.includes('http://deb.debian.org/debian\n') || !original.includes('http://deb.debian.org/debian-security\n')) {
  throw new Error('Unexpected base image apt sources; review before building');
}
writeFileSync('/tmp/benchmark-bootstrap-ca.pem', rootCertificates.join('\n') + '\n');
writeFileSync(sources, original
  .replaceAll('http://deb.debian.org/debian-security\n', mirrors[1].replace(/\/$/, '') + '\n')
  .replaceAll('http://deb.debian.org/debian\n', mirrors[0].replace(/\/$/, '') + '\n'));
JS
apt-get -o Acquire::https::CaInfo=/tmp/benchmark-bootstrap-ca.pem \
  -o Acquire::https::Timeout=30 -o Acquire::Retries=3 -o APT::Update::Error-Mode=any update
DEBIAN_FRONTEND=noninteractive apt-get -o Acquire::https::CaInfo=/tmp/benchmark-bootstrap-ca.pem \
  -o Acquire::https::Timeout=30 -o Acquire::Retries=3 install -y --no-install-recommends \
  ca-certificates fontconfig "fonts-noto-cjk=${PAPERBANANA_BENCH_CJK_FONT_VERSION}"
rm -rf /var/lib/apt/lists/* /tmp/benchmark-bootstrap-ca.pem
