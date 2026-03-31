FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY engine/package.json ./engine/package.json

RUN pnpm install --filter engine... --frozen-lockfile

COPY engine/tsconfig.json ./engine/tsconfig.json
COPY engine/src ./engine/src

RUN pnpm --filter engine run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY engine/package.json ./engine/package.json

RUN pnpm install --filter engine --prod --frozen-lockfile

COPY --from=builder /app/engine/dist ./engine/dist

WORKDIR /app/engine
CMD ["node", "dist/index.js"]
