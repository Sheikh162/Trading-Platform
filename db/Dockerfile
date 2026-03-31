FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY db/package.json ./db/package.json

RUN pnpm install --filter db... --frozen-lockfile

COPY db/tsconfig.json ./db/tsconfig.json
COPY db/src ./db/src

RUN pnpm --filter db run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY db/package.json ./db/package.json

RUN pnpm install --filter db --prod --frozen-lockfile

COPY --from=builder /app/db/dist ./db/dist

WORKDIR /app/db
CMD ["node", "dist/index.js"]
