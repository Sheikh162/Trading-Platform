# # ---- Install deps ----
#     FROM node:20-alpine AS deps
#     WORKDIR /app
#     COPY package*.json ./
#     RUN npm ci
    
#     # ---- Build ----
#     FROM node:20-alpine AS builder
#     WORKDIR /app
#     COPY --from=deps /app/node_modules ./node_modules
#     COPY . .
#     # Build Next.js (app dir)
#     RUN npm run build
    
#     # ---- Run ----
#     FROM node:20-alpine AS runner
#     WORKDIR /app
#     ENV NODE_ENV=production
#     ENV PORT=3000
#     ENV HOST=0.0.0.0
    
#     # copy minimal runtime files
#     COPY --from=builder /app/.next ./.next
#     #COPY --from=builder /app/public ./public
#     COPY --from=builder /app/package*.json ./
#     COPY --from=deps    /app/node_modules ./node_modules
#     COPY --from=builder /app/next.config.mjs ./next.config.mjs
    
#     EXPOSE 3000
#     # ensure binding to 0.0.0.0
#     CMD ["npm", "run", "start", "--", "-p", "3000", "-H", "0.0.0.0"]
    

# ---- Build stage ----
FROM node:20-alpine AS builder
WORKDIR /app

# Install deps (with devDependencies for build)
COPY package*.json ./
RUN npm ci

# Copy all source and build Next.js app
COPY . .
RUN npm run build

# ---- Run stage ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install only production deps
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built Next.js output from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/package.json ./package.json


# Expose Next.js default port, conventional default for Next.js, just for docs
EXPOSE 3000  

# Run Next.js
CMD ["npm", "start"]
