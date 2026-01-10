# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files first (better cache for deps)
COPY package*.json ./

# Install all deps (including dev for build)
RUN npm ci

# Copy source and config
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript → dist/
RUN npm run build

# Stage 2: Runner
FROM node:20-alpine AS runner
WORKDIR /app

# Copy only package files again
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy built JS from builder
COPY --from=builder /app/dist ./dist

# # Expose port (Express default 3000, adjust if needed)
# EXPOSE 3000

# Run app with env variable
CMD ["sh", "-c", "WITH_SNAPSHOT=true node dist/index.js"]
