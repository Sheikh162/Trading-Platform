FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY services/engine/package.json ./services/engine/package.json
COPY packages/config/package.json ./packages/config/package.json
COPY packages/logger/package.json ./packages/logger/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json

RUN pnpm install --filter @trading-platform/engine... --frozen-lockfile

COPY services/engine/tsconfig.json ./services/engine/tsconfig.json
COPY services/engine/src ./services/engine/src
COPY packages/config/tsconfig.json ./packages/config/tsconfig.json
COPY packages/config/src ./packages/config/src
COPY packages/logger/tsconfig.json ./packages/logger/tsconfig.json
COPY packages/logger/src ./packages/logger/src
COPY packages/shared-types/tsconfig.json ./packages/shared-types/tsconfig.json
COPY packages/shared-types/src ./packages/shared-types/src

RUN pnpm --filter @trading-platform/engine... run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY services/engine/package.json ./services/engine/package.json
COPY packages/config/package.json ./packages/config/package.json
COPY packages/logger/package.json ./packages/logger/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json

RUN pnpm install --filter @trading-platform/engine --prod --frozen-lockfile

COPY --from=builder /app/services/engine/dist ./services/engine/dist
COPY --from=builder /app/packages/config/dist ./packages/config/dist
COPY --from=builder /app/packages/logger/dist ./packages/logger/dist
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist

WORKDIR /app/services/engine
CMD ["node", "dist/index.js"]
