ARG PAPERBANANA_CODE_SHA=unreleased
FROM node:24-bookworm-slim AS build
ARG PAPERBANANA_CODE_SHA

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/benchmark-worker/package.json apps/benchmark-worker/package.json
COPY apps/paperbanana-api/package.json apps/paperbanana-api/package.json
COPY packages/benchmark-core/package.json packages/benchmark-core/package.json
RUN pnpm install --filter @paperbanana/benchmark-worker... --filter @paperbanana/paperbanana-api... --frozen-lockfile

COPY apps/benchmark-worker apps/benchmark-worker
COPY apps/paperbanana-api apps/paperbanana-api
COPY packages/benchmark-core packages/benchmark-core
COPY packages/api/src packages/api/src
COPY packages/types/src packages/types/src
RUN pnpm --filter @paperbanana/paperbanana-api build
RUN pnpm --filter @paperbanana/benchmark-worker build
RUN pnpm --filter @paperbanana/benchmark-worker deploy --prod --legacy /opt/benchmark-worker
RUN cp apps/paperbanana-api/dist/image-runtime.mjs /opt/benchmark-worker/dist/image-runtime.mjs
RUN printf '%s' "$PAPERBANANA_CODE_SHA" | grep -Eq '^[0-9a-f]{40}$' && printf '{"codeSha":"%s"}\n' "$PAPERBANANA_CODE_SHA" > /opt/benchmark-worker/build-provenance.json && chmod 0444 /opt/benchmark-worker/build-provenance.json

FROM node:24-bookworm-slim AS runtime

ARG PAPERBANANA_BENCH_CJK_FONT_VERSION=1:20220127+repack1-1
ARG PAPERBANANA_BENCH_DEBIAN_MIRROR=https://deb.debian.org/debian
ARG PAPERBANANA_BENCH_DEBIAN_SECURITY_MIRROR=https://deb.debian.org/debian-security
ENV NODE_ENV=production
WORKDIR /app
COPY apps/benchmark-worker/scripts/install-runtime-fonts.sh /tmp/install-runtime-fonts.sh
RUN sh /tmp/install-runtime-fonts.sh && rm /tmp/install-runtime-fonts.sh
COPY --from=build --chown=node:node /opt/benchmark-worker/ ./
RUN fc-match 'Noto Sans CJK SC' | grep -q 'NotoSansCJK' && node dist/calibration-snapshot.mjs
USER node
CMD ["node", "dist/worker.mjs"]
