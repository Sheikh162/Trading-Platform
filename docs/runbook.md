# Runbook

## Health Endpoints

- `api`: `/healthz`, `/readyz`
- `ws-gateway`: `/healthz`, `/readyz`
- `engine`: `http://<host>:8082/healthz`, `http://<host>:8082/readyz`
- `db-worker`: `http://<host>:8083/healthz`, `http://<host>:8083/readyz`
- `db-cron`: `http://<host>:8084/healthz`, `http://<host>:8084/readyz`
- `market-maker`: `http://<host>:8085/healthz`, `http://<host>:8085/readyz`

## Common Checks

```bash
docker compose --env-file .env -f infra/compose/base.yml -f infra/compose/prod.yml ps
docker compose --env-file .env -f infra/compose/base.yml -f infra/compose/prod.yml logs api
docker compose --env-file .env -f infra/compose/base.yml -f infra/compose/prod.yml logs engine
docker compose --env-file .env -f infra/compose/base.yml -f infra/compose/prod.yml logs db-worker
```

## Roll Forward

```bash
git pull
pnpm compose:backend:up
```

## Roll Back

1. Checkout the previous known-good commit.
2. Re-run `pnpm compose:backend:up`.
3. Confirm service readiness with `docker compose ... ps` and the health endpoints.

## Failure Modes

- If `api` readiness fails, check TimescaleDB credentials and Redis connectivity first.
- If `ws-gateway` readiness fails, check Redis reachability and active subscriptions.
- If `engine` readiness fails, check Redis availability and database hydration on startup.
- If `db-worker` readiness fails, check both Postgres and Redis, then inspect queue-processing logs.
