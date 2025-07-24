# Real-Time Trading Platform

## Overview
A full-stack trading platform featuring real-time order matching, live market data, and a professional trading interface. The system mimics platforms like Binance, with microservices for API, trading engine, WebSocket server, database, and a modern frontend.

## Features
- Microservices architecture (API, Engine, WebSocket, DB, Frontend)
- Real-time order matching engine (price-time priority)
- Redis-based message queuing for high-performance order processing
- TimescaleDB for time-series market data
- WebSocket server for live market data and trade notifications
- Professional trading UI with real-time charts and order book
- Docker Compose for easy local deployment

## Tech Stack
- **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS, TradingView Charts
- **Backend:** Node.js, Express.js, TypeScript, Redis, TimescaleDB
- **Real-time:** WebSocket, Redis Pub/Sub
- **Infrastructure:** Docker, Docker Compose
- **Testing:** Vitest

---

## Local Setup

### Prerequisites
- [Docker](https://www.docker.com/get-started) & [Docker Compose](https://docs.docker.com/compose/)
- Node.js (v18+) and npm (for manual setup)

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd <project-root>
```

### 2. Environment Variables
- By default, Docker Compose sets up TimescaleDB and Redis with the following credentials (see `docker/docker-compose.yml`):
  - **TimescaleDB**
    - DB: `my_database`
    - User: `your_user`
    - Password: `your_password`
  - **Redis**
    - Port: `6379`
- If you add `.env` files for services, ensure they match these credentials.

### 3. Start Services with Docker Compose
From the `docker/` directory:
```bash
cd docker
# Start TimescaleDB and Redis
docker-compose up -d
```

### 4. Install & Run Each Service
For each service (`api/`, `engine/`, `ws/`, `db/`, `frontend/`):

#### API Service
```bash
cd api
npm install
npm run build
npm start
```

#### Engine Service
```