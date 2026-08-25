ARG PAPERBANANA_CODE_SHA=unreleased
FROM node:24-bookworm-slim AS build
ARG PAPERBANANA_CODE_SHA

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/paperbanana-api/package.json apps/paperbanana-api/package.json
COPY packages/benchmark-core/package.json packages/benchmark-core/package.json
RUN pnpm install --filter @paperbanana/paperbanana-api... --frozen-lockfile

COPY apps/paperbanana-api apps/paperbanana-api
COPY apps/laf-functions/paperbanana-api.ts apps/laf-functions/paperbanana-api.ts
COPY packages/benchmark-core packages/benchmark-core
RUN pnpm --filter @paperbanana/paperbanana-api build
RUN pnpm --filter @paperbanana/paperbanana-api deploy --prod --legacy /opt/paperbanana-api
RUN printf '%s' "$PAPERBANANA_CODE_SHA" | grep -Eq '^[0-9a-f]{40}$' && printf '{"codeSha":"%s"}\n' "$PAPERBANANA_CODE_SHA" > /opt/paperbanana-api/build-provenance.json && chmod 0444 /opt/paperbanana-api/build-provenance.json

FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /opt/paperbanana-api/ ./
RUN node -e 'const sharp=require("sharp");const input=Buffer.from("UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAdQuFr1q/+BiOh/AAA=","base64");const magic=Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);sharp(input).png().toBuffer().then((output)=>{if(!output.subarray(0,8).equals(magic))process.exit(1)}).catch(()=>process.exit(1))'
USER node
EXPOSE 3000
CMD ["node", "dist/server.cjs"]
