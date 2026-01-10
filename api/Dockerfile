# ---- Build stage ----
    FROM node:20-alpine AS builder
    WORKDIR /app
    
    # Install dependencies (dev included for build)
    COPY package*.json ./
    RUN npm ci
    
    # Copy source and build
    COPY tsconfig*.json ./
    COPY src ./src
    RUN npm run build
    
    # ---- Run stage ----
    FROM node:20-alpine AS runner
    WORKDIR /app
    ENV NODE_ENV=production
    
    # Install only prod dependencies
    COPY package*.json ./
    RUN npm ci --omit=dev
    
    # Copy built files from builder
    COPY --from=builder /app/dist ./dist
    
    # API is hardcoded to port 3000 in src/index.ts
    EXPOSE 3000
    # Start the API server
    CMD ["node", "dist/index.js"]
    
    