FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY services/persistence/package.json ./services/persistence/package.json
COPY packages/config/package.json ./packages/config/package.json
COPY packages/logger/package.json ./packages/logger/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json

RUN pnpm install --filter @trading-platform/persistence... --frozen-lockfile

COPY services/persistence/tsconfig.json ./services/persistence/tsconfig.json
COPY services/persistence/src ./services/persistence/src
COPY services/persistence/migrations ./services/persistence/migrations
COPY packages/config/tsconfig.json ./packages/config/tsconfig.json
COPY packages/config/src ./packages/config/src
COPY packages/logger/tsconfig.json ./packages/logger/tsconfig.json
COPY packages/logger/src ./packages/logger/src
COPY packages/shared-types/tsconfig.json ./packages/shared-types/tsconfig.json
COPY packages/shared-types/src ./packages/shared-types/src

RUN pnpm --filter @trading-platform/persistence... run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
LABEL org.opencontainers.image.title="trading-platform-persistence"

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY services/persistence/package.json ./services/persistence/package.json
COPY packages/config/package.json ./packages/config/package.json
COPY packages/logger/package.json ./packages/logger/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json

RUN pnpm install --filter @trading-platform/persistence --prod --frozen-lockfile

COPY --chown=node:node --from=builder /app/services/persistence/dist ./services/persistence/dist
COPY --chown=node:node --from=builder /app/services/persistence/migrations ./services/persistence/migrations
COPY --chown=node:node --from=builder /app/packages/config/dist ./packages/config/dist
COPY --chown=node:node --from=builder /app/packages/logger/dist ./packages/logger/dist
COPY --chown=node:node --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist

WORKDIR /app/services/persistence
USER node
CMD ["node", "dist/index.js"]
