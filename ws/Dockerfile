# ---- Build stage ----
    FROM node:20-alpine AS builder
    WORKDIR /app
    
    # Install dependencies (including dev)
    COPY package*.json ./
    RUN npm ci
    
    # Copy TS config + source code
    COPY tsconfig*.json ./
    COPY src ./src
    
    # Build TypeScript → dist
    RUN npm run build
    
    # ---- Run stage ----
    FROM node:20-alpine AS runner
    WORKDIR /app
    ENV NODE_ENV=production
    
    # Install only production dependencies
    COPY package*.json ./
    RUN npm ci --omit=dev
    
    # Copy compiled dist only (not TS source)
    COPY --from=builder /app/dist ./dist
    
    # WS server binds 3001 in src/index.ts
    EXPOSE 3001
    # Start server
    CMD ["node", "dist/index.js"]
    


    