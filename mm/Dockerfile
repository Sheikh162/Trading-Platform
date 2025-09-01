# ---- Build stage ----
    FROM node:20-alpine AS builder
    WORKDIR /app
    
    # Copy package files first (better layer caching)
    COPY package*.json ./
    
    # Install all deps (including devDependencies)
    RUN npm ci
    
    # Copy tsconfig and source code
    COPY tsconfig*.json ./
    COPY src ./src
    
    # Compile TypeScript → JavaScript (dist)
    RUN npx tsc -p tsconfig.json
    
    
    # ---- Run stage ----
    FROM node:20-alpine AS runner
    WORKDIR /app
    
    ENV NODE_ENV=production
    
    # Copy package files for runtime deps
    COPY package*.json ./
    
    # Install ONLY production deps
    RUN npm ci --omit=dev
    
    # Copy built JS files from builder
    COPY --from=builder /app/dist ./dist
    
    # Worker service entrypoint
    CMD ["node", "dist/index.js"]
    



# # ---- Build stage ----
#     FROM ${BASE_IMAGE} AS builder
#     WORKDIR ${WORKDIR}
    
#     # Install dependencies
#     COPY package*.json ./
#     RUN npm ci
    
#     # If TypeScript or build tool
#     ${BUILD_SPECIFIC_STEPS}
    
#     # ---- Run stage ----
#     FROM ${BASE_IMAGE} AS runner
#     WORKDIR ${WORKDIR}
#     ENV NODE_ENV=production
    
#     COPY package*.json ./
#     RUN npm ci --omit=dev
    
#     # Copy compiled output (if multi-stage)
#     ${COPY_DIST}
    
#     # Expose port if needed
#     ${EXPOSE}
    
#     # Start command
#     CMD [${CMD_ARRAY}]
    