#!/bin/bash

# ==========================================
# TRADING PLATFORM LAUNCHER
# ==========================================

# 1. Kill old processes to prevent EADDRINUSE errors
echo "🧹 Cleaning up old ports (3000, 3001, 3002)..."
npx kill-port 3000 3001 3002 2>/dev/null

# 2. Ensure Docker Infrastructure is UP
echo "🐳 Starting Database and Redis..."
docker-compose up -d redis timescaledb
sleep 5 # Give DB time to wake up

# 3. Define the Project Root
ROOT_DIR="$HOME/Mini-Project/trading-platform"
cd $ROOT_DIR

# ==========================================
# 4. Launch Services in New Terminals
# ==========================================

# Database Worker
gnome-terminal --tab --title="DB Worker" -- bash -c "
cd $ROOT_DIR/db;
export POSTGRES_USER=postgres;
export POSTGRES_PASSWORD=mysecurepassword123;
export POSTGRES_DB=my_database;
export POSTGRES_HOST=localhost;
export REDIS_HOST=localhost;
echo '🚀 Building and Starting DB...';
npm install && npm run build && npm run db:seed && npm run start;
exec bash"

# Engine
gnome-terminal --tab --title="Engine" -- bash -c "
cd $ROOT_DIR/engine;
export REDIS_HOST=localhost;
export REDIS_PORT=6379;
echo 'Creating snapshot...';
echo '{\"orderbooks\": [], \"balances\": []}' > snapshot.json;
echo '🚀 Building and Starting Engine...';
npm install && npm run build && npm run start;
exec bash"

# API
gnome-terminal --tab --title="API" -- bash -c "
cd $ROOT_DIR/api;
export PORT=3000;
export POSTGRES_USER=postgres;
export POSTGRES_PASSWORD=mysecurepassword123;
export POSTGRES_DB=my_database;
export POSTGRES_HOST=localhost;
export REDIS_HOST=localhost;
export ADMIN_SECRET=mySuperSecret123;
echo '🚀 Building and Starting API...';
npm install && npm run build && npm run start;
exec bash"

# WebSocket Server
gnome-terminal --tab --title="WebSocket" -- bash -c "
cd $ROOT_DIR/ws;
export PORT=3001;
export REDIS_HOST=localhost;
export REDIS_PORT=6379;
echo '🚀 Building and Starting WS Server...';
npm install && npm run build && npm run start;
exec bash"

# Frontend
gnome-terminal --tab --title="Frontend" -- bash -c "
cd $ROOT_DIR/frontend;
export NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1;
export NEXT_PUBLIC_WS_URL=ws://localhost:3001;
echo '🚀 Starting Frontend...';
npm install && npm run dev;
exec bash"

# Market Maker Bot (Delayed start to let API wake up)
gnome-terminal --tab --title="Market Maker" -- bash -c "
cd $ROOT_DIR/mm;
export API_BASE_URL=http://localhost:3000;
export ADMIN_SECRET=mySuperSecret123;
echo '⏳ Waiting 10s for API to be ready...';
sleep 10;
echo '🚀 Building and Starting Market Maker...';
npm install && npm run build && npm run start;
exec bash"

echo "✅ All services launched! Check the new terminal tabs."
