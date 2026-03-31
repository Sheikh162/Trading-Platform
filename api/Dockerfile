FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY api/package.json ./api/package.json

RUN pnpm install --filter api... --frozen-lockfile

COPY api/tsconfig*.json ./api/
COPY api/src ./api/src

RUN pnpm --filter api run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY api/package.json ./api/package.json

RUN pnpm install --filter api --prod --frozen-lockfile

COPY --from=builder /app/api/dist ./api/dist

WORKDIR /app/api
EXPOSE 3000
CMD ["node", "dist/index.js"]
