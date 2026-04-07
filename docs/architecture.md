# Architecture

## Repository Shape

- `apps/frontend`: Next.js frontend
- `services/api`: HTTP API gateway
- `services/engine`: in-memory matching engine
- `services/ws-gateway`: Redis-backed market data fanout over WebSockets
- `services/persistence`: DB worker, seed job, and materialized-view refresh job
- `services/market-maker`: demo liquidity bot
- `packages/shared-types`: cross-service message contracts
- `packages/config`: shared environment parsing
- `packages/logger`: shared structured logging
- `infra/compose`: deployment manifests

## Runtime Topology

- `frontend` talks to `api` over HTTP and `ws-gateway` over WebSockets
- `api` publishes engine commands through Redis
- `engine` owns live orderbooks and emits DB and market-data events
- `persistence` consumes DB events and writes to TimescaleDB/Postgres
- `ws-gateway` fans market data to browser clients
- `market-maker` uses the API to keep the demo market liquid

## Deployment Model

- Development: host-run services plus Dockerized Redis and TimescaleDB
- Production backend: Docker Compose on a single VPS
- Production frontend: separate deployment target such as Vercel
