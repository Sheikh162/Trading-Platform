# Real-Time Trading Platform

A full-stack trading platform built as a microservices-based capstone project. It simulates the core workflow of a centralized exchange: authenticated users can deposit funds, place orders, see live order book and trade updates, and track wallet, portfolio, and order history from persisted backend state.

## What This Project Demonstrates

- A matching engine with price-time-priority order execution
- A microservices architecture with clear service boundaries
- Real-time market data fanout over WebSockets
- Persistent account, order, fill, and wallet ledger data in PostgreSQL/TimescaleDB
- A modern trading-style frontend built with Next.js
- End-to-end local orchestration with Docker Compose

This is not a production exchange. It is a strong engineering-focused simulation designed to showcase distributed backend design, real-time systems, and full-stack integration.

## Architecture

The system is split into six services:

- `frontend`: Next.js app for dashboard, wallet, portfolio, markets, and trade UI
- `api`: Express API gateway for authenticated user actions and read endpoints
- `engine`: in-memory matching engine and orderbook manager
- `ws`: WebSocket fanout service for ticker, depth, and trade streams
- `db-worker`: async persistence worker consuming engine events and writing to Postgres
- `mm`: simple market-maker bot to seed liquidity for demo purposes

Core data flow:

1. A user action hits the `api` service.
2. The API sends a message to the `engine` through Redis.
3. The engine matches or places the order in memory.
4. The engine emits:
   - direct response messages back to the API
   - market-data updates for WebSocket subscribers
   - persistence events for the DB worker
5. The `db-worker` writes orders, trade fills, wallet ledger entries, and balance changes to Postgres.
6. The frontend reads current state from the API and subscribes to live market streams through `ws`.

![Architecture Diagram](frontend/public/architecture.jpg)

## Tech Stack

- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS, Radix UI, Lightweight Charts
- Backend: Node.js, Express, TypeScript
- Real-time: WebSockets, Redis Pub/Sub, Redis queues
- Database: PostgreSQL + TimescaleDB
- Auth: Clerk
- Infra: Docker, Docker Compose, pnpm workspaces
- Testing: Vitest

## Current Features

### Trading Engine

- Multiple market support
- Price-time-priority matching
- Partial fills
- Order cancellation
- In-memory orderbook restore from persisted open orders on startup
- Real-time ticker, trade, and depth event publishing

### Persistent Data Model

- Users
- Balances by asset
- Markets and assets
- Orders with open / partially filled / filled / cancelled states
- Trade fills
- Wallet ledger entries
- Deposits and withdrawals

### Frontend

- Markets page with live-backed market summaries
- Trade page with:
  - order entry
  - live orderbook depth
  - live ticker updates
  - chart data
  - user order history
- Wallet page with deposit/withdraw actions and transaction history
- Portfolio page with holdings and allocation
- Dashboard page with balance, PnL summary, and recent activity

## What Is Real vs Simulated

Real in this project:

- Order matching
- Balance locking/unlocking
- Open order persistence
- Trade persistence
- Portfolio/wallet/order history reads from DB
- Real-time market data streaming

Simulated or simplified:

- Deposits and withdrawals are manual/demo actions, not real banking rails
- The market maker is a demo bot, not a serious strategy
- The engine keeps the live orderbook in memory
- Risk checks and exchange-grade security controls are intentionally simplified

## Local Development

### Prerequisites

- Docker
- Docker Compose
- Node.js 20+
- `pnpm` via `corepack enable`

### 1. Clone and Configure

```bash
git clone https://github.com/sheikh162/trading-platform.git
cd trading-platform
cp .env.example .env
cp api/.env.example api/.env
cp db/.env.example db/.env
cp engine/.env.example engine/.env
cp frontend/.env.example frontend/.env
cp mm/.env.example mm/.env
cp ws/.env.example ws/.env
```

Fill in your Clerk keys in the relevant `.env` files before running the full app.

### 2. Build Containers

```bash
docker compose build
```

### 3. Start Infrastructure and Apply Schema

```bash
docker compose up -d timescaledb redis
docker compose run --rm db-seed
```

### 4. Start the Full Stack

```bash
docker compose up -d
```

### 5. Open the App

- Frontend: `http://localhost:3002`
- API: `http://localhost:3000`
- WebSocket service: `ws://localhost:3001`

### Stop Everything

```bash
docker compose down
```

## Useful Local Commands

If you are running services outside Docker:

```bash
pnpm run dev
```

Targeted checks:

```bash
pnpm -C db build
pnpm -C engine test --run
pnpm -C api build
pnpm -C frontend lint
pnpm -C frontend build
```

## Demo Flow

The best demo sequence is:

1. Sign up / sign in
2. Open `/wallet`
3. Deposit demo funds
4. Go to `/trade/BTC_USDT`
5. Place a buy or sell order
6. Watch live depth and ticker updates
7. Revisit:
   - `/wallet`
   - `/portfolio`
   - `/dashboard`
   - the trade page order panel

If the market is empty, start the market-maker service so the book has liquidity.

## Design Decisions

### Why separate `engine` and `db-worker`?

The engine is optimized for fast in-memory order handling. Persistence is handled asynchronously by a dedicated worker so order matching logic stays isolated from slower DB writes.

### Why Redis in the middle?

Redis is used for:

- request/response messaging between API and engine
- pub/sub for real-time market streams
- queue-based event delivery to the DB worker

This keeps service boundaries simple while still demonstrating asynchronous backend design.

### Why TimescaleDB?

Trade and candle data are time-series shaped. TimescaleDB is a good fit for storing fills/trades and generating chart-friendly data efficiently.

## Known Limitations

- The engine orderbook remains in memory during runtime
- Deposits and withdrawals are simulated
- No advanced risk engine, rate limiting, or admin tooling yet
- No production-grade observability stack
- Some service-level READMEs are still catching up to the latest architecture

## Resume Value

This project is intended to be a strong resume capstone because it combines:

- distributed systems thinking
- real-time data streaming
- backend state consistency problems
- matching engine logic
- full-stack product implementation
- Dockerized local deployment

## Future Improvements

Reasonable next steps for this project:

- request validation at API boundaries
- integration tests for deposit -> order -> fill -> cancel flows
- private real-time order status updates over WebSocket
- cleaner service-level docs
- lightweight admin/ops monitoring page

## Repository Structure

```text
api/        Express API gateway
db/         DB worker, migrations, seeding, materialized view refresh logic
engine/     Matching engine and orderbook
frontend/   Next.js client app
mm/         Demo market-maker bot
ws/         WebSocket fanout service
```

## License

[MIT](LICENSE)
