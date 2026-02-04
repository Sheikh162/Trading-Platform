# ---- Build stage ----
FROM node:20-alpine AS builder
WORKDIR /app

# 1. Install pnpm
RUN npm install -g pnpm

# 2. Copy package files
COPY package.json pnpm-lock.yaml ./

# 3. Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY tsconfig.json ./
COPY src ./src
RUN pnpm run build

# ---- Run stage ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# 1. Install pnpm
RUN npm install -g pnpm

# 2. Copy package files
COPY package.json pnpm-lock.yaml ./

# 3. Install only prod dependencies
RUN pnpm install --prod

# Copy built files
COPY --from=builder /app/dist ./dist

# Default command (will be overridden by docker-compose)
CMD ["node", "dist/index.js"]
