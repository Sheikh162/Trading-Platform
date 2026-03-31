FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY mm/package.json ./mm/package.json

RUN pnpm install --filter mm... --frozen-lockfile

COPY mm/tsconfig.json ./mm/tsconfig.json
COPY mm/src ./mm/src

RUN pnpm --filter mm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY mm/package.json ./mm/package.json

RUN pnpm install --filter mm --prod --frozen-lockfile

COPY --from=builder /app/mm/dist ./mm/dist

WORKDIR /app/mm
CMD ["node", "dist/index.js"]
