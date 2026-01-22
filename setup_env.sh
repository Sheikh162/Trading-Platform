#!/bin/bash

# ==========================================
# Configuration Variables
# ==========================================
PG_PASSWORD="mysecurepassword123"
PG_USER="postgres"
PG_DB="my_database"
ADMIN_SECRET="supersecretadmin123"

# ==========================================
# 1. Root .env (For Docker Compose ports)
# ==========================================
echo "Writing root .env..."
cat > .env <<EOF
API_PORT=3000
WS_PORT=3001
FRONTEND_PORT=3002
REDIS_PORT=6379
TIMESCALE_PORT=5432

POSTGRES_DB=${PG_DB}
POSTGRES_USER=${PG_USER}
POSTGRES_PASSWORD=${PG_PASSWORD}
EOF

# ==========================================
# 2. Database Service (db/.env)
# ==========================================
echo "Writing db/.env..."
cat > db/.env <<EOF
# Connects to the TimescaleDB container
POSTGRES_HOST=timescaledb
POSTGRES_PORT=5432
POSTGRES_DB=${PG_DB}
POSTGRES_USER=${PG_USER}
POSTGRES_PASSWORD=${PG_PASSWORD}

# Connects to the Redis container
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_URL=redis://redis:6379
EOF

# ==========================================
# 3. API Service (api/.env)
# ==========================================
echo "Writing api/.env..."
cat > api/.env <<EOF
PORT=3000

# Database Connection (Docker-to-Docker)
POSTGRES_HOST=timescaledb
POSTGRES_PORT=5432
POSTGRES_DB=${PG_DB}
POSTGRES_USER=${PG_USER}
POSTGRES_PASSWORD=${PG_PASSWORD}

# Redis Connection (Docker-to-Docker)
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_URL=redis://redis:6379

# Secrets
ADMIN_SECRET=${ADMIN_SECRET}
CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
EOF

# ==========================================
# 4. Engine Service (engine/.env)
# ==========================================
echo "Writing engine/.env..."
cat > engine/.env <<EOF
# Redis Connection
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_URL=redis://redis:6379

# Engine Snapshot Config
WITH_SNAPSHOT=true
SNAPSHOT_FILE=./snapshot.json
EOF

# ==========================================
# 5. WebSocket Service (ws/.env)
# ==========================================
echo "Writing ws/.env..."
cat > ws/.env <<EOF
PORT=3001
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_URL=redis://redis:6379
EOF

# ==========================================
# 6. Market Maker (mm/.env)
# ==========================================
echo "Writing mm/.env..."
cat > mm/.env <<EOF
# MM runs inside Docker, so it calls the API container directly
API_BASE_URL=http://api:3000
ADMIN_SECRET=${ADMIN_SECRET}
EOF

# ==========================================
# 7. Frontend (frontend/.env)
# ==========================================
echo "Writing frontend/.env..."
cat > frontend/.env <<EOF
# Frontend runs in the browser, so it must access localhost (host machine)
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:3001/
PORT=3002

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
EOF

echo "All .env files have been generated successfully!"
echo "Don't forget to fill in the CLERK keys in api/.env and frontend/.env before running."
