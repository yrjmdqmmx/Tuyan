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
COPY apps/laf-functions/paperbanana-api.ts apps/laf-functions/paperbanana-api.ts
COPY packages/benchmark-core packages/benchmark-core
RUN pnpm --filter @paperbanana/paperbanana-api build
RUN pnpm --filter @paperbanana/benchmark-worker build
RUN pnpm --filter @paperbanana/benchmark-worker deploy --prod --legacy /opt/benchmark-worker
RUN cp apps/paperbanana-api/dist/image-runtime.mjs /opt/benchmark-worker/dist/image-runtime.mjs
RUN printf '%s' "$PAPERBANANA_CODE_SHA" | grep -Eq '^[0-9a-f]{40}$' && printf '{"codeSha":"%s"}\n' "$PAPERBANANA_CODE_SHA" > /opt/benchmark-worker/build-provenance.json && chmod 0444 /opt/benchmark-worker/build-provenance.json

FROM node:24-bookworm-slim AS runtime

ARG PAPERBANANA_BENCH_CJK_FONT_VERSION=1:20220127+repack1-1
ENV NODE_ENV=production
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends fontconfig "fonts-noto-cjk=${PAPERBANANA_BENCH_CJK_FONT_VERSION}" && rm -rf /var/lib/apt/lists/*
COPY --from=build --chown=node:node /opt/benchmark-worker/ ./
RUN fc-match 'Noto Sans CJK SC' | grep -q 'NotoSansCJK' && node dist/calibration-snapshot.mjs
USER node
CMD ["node", "dist/worker.mjs"]
