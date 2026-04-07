# Environment Variables

## Root

- `API_PORT`
- `WS_PORT`
- `FRONTEND_PORT`
- `TIMESCALE_PORT`
- `REDIS_PORT`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`

Root variables are used primarily by Docker Compose and shared deployment scripts.

## API

- `PORT`
- `HEALTH_PORT`
- `POSTGRES_HOST`
- `POSTGRES_PORT`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `REDIS_HOST`
- `REDIS_PORT`
- `CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SECRET`
- `ADMIN_SECRET`

## Engine

- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_URL`
- `POSTGRES_HOST`
- `POSTGRES_PORT`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `HEALTH_PORT`
- `WITH_SNAPSHOT`
- `SNAPSHOT_FILE`

## Persistence

- `POSTGRES_HOST`
- `POSTGRES_PORT`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_URL`
- `HEALTH_PORT`

## WebSocket Gateway

- `PORT`
- `HEALTH_PORT`
- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_URL`

## Market Maker

- `API_BASE_URL`
- `HEALTH_PORT`
- `ADMIN_SECRET`

## Notes

- Prefer keeping real secrets in deployment-specific secret stores or VPS environment management rather than committed files.
- Use the service-local `.env.example` files as the contract for new contributors and deployments.
