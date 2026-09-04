FROM node:24-alpine

WORKDIR /app

RUN corepack enable

# Build from the repository root:
#   docker build -f apps/auth-gateway/Dockerfile -t paperbanana-auth-gateway .
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/auth-gateway/package.json apps/auth-gateway/package.json
COPY packages/tuyan-knowledge/package.json packages/tuyan-knowledge/package.json

RUN pnpm install --filter @paperbanana/auth-gateway --prod --frozen-lockfile

COPY --chown=node:node apps/auth-gateway apps/auth-gateway
COPY --chown=node:node packages/tuyan-knowledge packages/tuyan-knowledge

WORKDIR /app/apps/auth-gateway

ENV NODE_ENV=production
ENV PORT=3005
EXPOSE 3005

USER node

CMD ["node", "src/server.js"]
