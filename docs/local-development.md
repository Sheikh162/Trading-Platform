# Local Development

## Prerequisites

- Node.js 20+
- `pnpm` via `corepack enable`
- Docker

## First-Time Setup

```bash
cp .env.example .env
cp services/api/.env.example services/api/.env
cp services/persistence/.env.example services/persistence/.env
cp services/engine/.env.example services/engine/.env
cp services/ws-gateway/.env.example services/ws-gateway/.env
cp services/market-maker/.env.example services/market-maker/.env
cp apps/frontend/.env.example apps/frontend/.env
pnpm install
```

## Start Development Mode

```bash
pnpm dev
```

This starts:

- Dockerized `redis`
- Dockerized `timescaledb`
- shared workspace packages in watch mode
- host-run backend services
- host-run frontend

## Useful Commands

```bash
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm db:seed
pnpm infra:down
```

## Local Service Endpoints

- Frontend: `http://localhost:3002`
- API: `http://localhost:3000`
- WebSocket gateway: `ws://localhost:3001`
- API health: `http://localhost:3000/healthz`
- API readiness: `http://localhost:3000/readyz`
