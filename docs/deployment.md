# Deployment

## Production Split

- Frontend: deploy `apps/frontend` separately, for example on Vercel
- Backend: deploy Compose-managed backend services from this repo onto your VPS

## Compose Files

- `infra/compose/base.yml`: shared infrastructure and common service wiring
- `infra/compose/prod.yml`: production-facing backend services, healthchecks, and optional frontend profile

## Backend Deployment

```bash
cp .env.example .env
cp services/api/.env.example services/api/.env
cp services/persistence/.env.example services/persistence/.env
cp services/engine/.env.example services/engine/.env
cp services/ws-gateway/.env.example services/ws-gateway/.env
cp services/market-maker/.env.example services/market-maker/.env
pnpm compose:backend:up
```

This brings up:

- `redis`
- `timescaledb`
- `engine`
- `db-seed`
- `db-worker`
- `db-cron`
- `api`
- `ws-gateway`
- `market-maker`

## Full Local Compose Demo

```bash
pnpm compose:full:up
```

## Shutdown

```bash
pnpm compose:down
```

## Suggested Production Topology

- `app.<your-domain>` -> Vercel-hosted `apps/frontend`
- `api.<your-domain>` -> Azure VPS reverse proxy to `api`
- `ws.<your-domain>` -> Azure VPS reverse proxy to `ws-gateway`
- Redis and TimescaleDB stay private to the VPS network
