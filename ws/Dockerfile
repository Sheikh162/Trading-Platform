FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY ws/package.json ./ws/package.json

RUN pnpm install --filter ws... --frozen-lockfile

COPY ws/tsconfig.json ./ws/tsconfig.json
COPY ws/src ./ws/src

RUN pnpm --filter ws run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY ws/package.json ./ws/package.json

RUN pnpm install --filter ws --prod --frozen-lockfile

COPY --from=builder /app/ws/dist ./ws/dist

WORKDIR /app/ws
EXPOSE 3001
CMD ["node", "dist/index.js"]
