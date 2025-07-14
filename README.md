# Real-Time Cryptocurrency Exchange Platform

## Overview
A full-stack cryptocurrency exchange platform featuring real-time order matching, live market data, and a professional trading interface. The system mimics platforms like Binance, with microservices for API, trading engine, WebSocket server, database, and a modern frontend.

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
```bash
cd engine
npm install
npm run build
npm start
```

#### WebSocket Service
```bash
cd ws
npm install
npm run build
npm start
```

#### Database Service
```bash
cd db
npm install
npm run build
npm start
# (Optional) Seed DB:
npm run seed:db
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
# or for production:
npm run build && npm start
```

### 5. Access the Platform
- **Frontend:** [http://localhost:3000](http://localhost:3000)
- **API:** [http://localhost:PORT] (set in API service)
- **WebSocket:** [ws://localhost:PORT] (set in ws service)

---

## Troubleshooting
- Ensure all services can connect to Redis and TimescaleDB (check ports and credentials).
- If ports are in use, update them in the respective service configs.
- Check logs for errors: `docker logs <container>` or service terminal output.
- For CORS or proxy issues, verify frontend API/WebSocket URLs.

---

## Project Structure
- `api/` - REST API (Express.js)
- `engine/` - Trading engine and order book
- `ws/` - WebSocket server for real-time updates
- `db/` - Database utilities and cron jobs
- `frontend/` - Next.js trading UI
- `docker/` - Docker Compose setup

---

## Contributing
Pull requests and issues are welcome!

---

## License
MIT (or specify your license) 

# Deployment Checklist

- [x] All sensitive data (passwords, API keys) are loaded from environment variables (e.g., `process.env.DB_PASSWORD`).
- [x] All debug statements (`console.log`, etc.) are removed or commented out.
- [x] All TODOs and FIXMEs are reviewed.
- [x] `.gitignore` is present in the root and subprojects.
- [x] LICENSE file is present.
- [x] All dependencies are up to date and unused ones removed.
- [x] All tests pass.

## Environment Variables

Set the following environment variables in your deployment environment:

```
DB_PASSWORD=your_database_password
# Add other variables as needed
```

## For more details, see subproject READMEs. 