# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate
WORKDIR /app

FROM base AS deps
# Copy lockfile and all workspace package.jsons for a deterministic install.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/db/package.json ./packages/db/
COPY packages/otel/package.json ./packages/otel/
COPY packages/billing-core/package.json ./packages/billing-core/
COPY services/api-gateway/package.json ./services/api-gateway/
COPY services/billing-engine/package.json ./services/billing-engine/
COPY services/webhook-dispatcher/package.json ./services/webhook-dispatcher/
COPY services/canary/package.json ./services/canary/
COPY services/web/package.json ./services/web/
COPY scripts/package.json ./scripts/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY services/web/ ./services/web/
WORKDIR /app/services/web
RUN pnpm build

FROM build AS runtime
ENV NODE_ENV=production
ENV PORT=5173
ENV API_URL=http://api-gateway:4000
EXPOSE 5173
WORKDIR /app/services/web
CMD ["node", "server.mjs"]
