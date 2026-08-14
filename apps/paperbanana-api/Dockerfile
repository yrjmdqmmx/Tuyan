FROM node:24-bookworm-slim AS build

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/paperbanana-api/package.json apps/paperbanana-api/package.json
RUN pnpm install --filter @paperbanana/paperbanana-api... --frozen-lockfile

COPY apps/paperbanana-api apps/paperbanana-api
COPY apps/laf-functions/paperbanana-api.ts apps/laf-functions/paperbanana-api.ts
RUN pnpm --filter @paperbanana/paperbanana-api build
RUN pnpm --filter @paperbanana/paperbanana-api deploy --prod --legacy /opt/paperbanana-api

FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /opt/paperbanana-api/ ./
USER node
EXPOSE 3000
CMD ["node", "dist/server.cjs"]
