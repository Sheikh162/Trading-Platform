FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY services/market-maker/package.json ./services/market-maker/package.json
COPY packages/logger/package.json ./packages/logger/package.json

RUN pnpm install --filter @trading-platform/market-maker... --frozen-lockfile

COPY services/market-maker/tsconfig.json ./services/market-maker/tsconfig.json
COPY services/market-maker/src ./services/market-maker/src
COPY packages/logger/tsconfig.json ./packages/logger/tsconfig.json
COPY packages/logger/src ./packages/logger/src

RUN pnpm --filter @trading-platform/market-maker... run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
LABEL org.opencontainers.image.title="trading-platform-market-maker"

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY services/market-maker/package.json ./services/market-maker/package.json
COPY packages/logger/package.json ./packages/logger/package.json

RUN pnpm install --filter @trading-platform/market-maker --prod --frozen-lockfile

COPY --chown=node:node --from=builder /app/services/market-maker/dist ./services/market-maker/dist
COPY --chown=node:node --from=builder /app/packages/logger/dist ./packages/logger/dist

WORKDIR /app/services/market-maker
USER node
CMD ["node", "dist/index.js"]
