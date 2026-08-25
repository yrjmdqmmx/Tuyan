ARG PAPERBANANA_CODE_SHA=unreleased
FROM node:24-bookworm-slim AS build

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

FROM node:24-bookworm-slim AS runtime

ARG PAPERBANANA_CODE_SHA
ENV NODE_ENV=production
ENV PAPERBANANA_CODE_SHA=$PAPERBANANA_CODE_SHA
WORKDIR /app
COPY --from=build --chown=node:node /opt/benchmark-worker/ ./
USER node
CMD ["node", "dist/worker.mjs"]
