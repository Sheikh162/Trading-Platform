FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY services/api/package.json ./services/api/package.json
COPY packages/config/package.json ./packages/config/package.json
COPY packages/logger/package.json ./packages/logger/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json

RUN pnpm install --filter @trading-platform/api... --frozen-lockfile

COPY services/api/tsconfig*.json ./services/api/
COPY services/api/src ./services/api/src
COPY packages/config/tsconfig.json ./packages/config/tsconfig.json
COPY packages/config/src ./packages/config/src
COPY packages/logger/tsconfig.json ./packages/logger/tsconfig.json
COPY packages/logger/src ./packages/logger/src
COPY packages/shared-types/tsconfig.json ./packages/shared-types/tsconfig.json
COPY packages/shared-types/src ./packages/shared-types/src

RUN pnpm --filter @trading-platform/api... run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
LABEL org.opencontainers.image.title="trading-platform-api"

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY services/api/package.json ./services/api/package.json
COPY packages/config/package.json ./packages/config/package.json
COPY packages/logger/package.json ./packages/logger/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json

RUN pnpm install --filter @trading-platform/api --prod --frozen-lockfile

COPY --chown=node:node --from=builder /app/services/api/dist ./services/api/dist
COPY --chown=node:node --from=builder /app/packages/config/dist ./packages/config/dist
COPY --chown=node:node --from=builder /app/packages/logger/dist ./packages/logger/dist
COPY --chown=node:node --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist

WORKDIR /app/services/api
EXPOSE 3000
USER node
CMD ["node", "dist/index.js"]
