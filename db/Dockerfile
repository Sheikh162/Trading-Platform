# ---- Build stage ----
    FROM node:20-alpine AS builder
    WORKDIR /app
    
    # Install deps (with devDependencies for TypeScript build)
    COPY package*.json ./
    RUN npm ci
    
    # Copy sources & build
    COPY tsconfig*.json ./
    COPY src ./src
    RUN npm run build
    
    # ---- Run stage ----
    FROM node:20-alpine AS runner
    WORKDIR /app
    ENV NODE_ENV=production
    
    # Install only production dependencies
    COPY package*.json ./
    RUN npm ci --omit=dev
    
    # Copy built files
    COPY --from=builder /app/dist ./dist
    
    # Default command
    CMD ["sh", "-c", "node dist/index.js & node dist/cron.js"]
    # CMD ["node", "dist/index.js"]
    
    # dont use docker for db for production, good for dev environment though