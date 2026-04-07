# API Service

This service is the HTTP gateway for the trading platform. It handles authenticated user actions, exposes read APIs for market and account data, and forwards engine-bound commands through Redis.

For full architecture, setup, and demo flow, see the [root README](../../README.md).

## Responsibilities

- accept authenticated order requests
- expose wallet, portfolio, markets, ticker, trade, depth, and kline endpoints
- read persisted account and market state from Postgres
- send command messages to the matching engine through Redis
- receive asynchronous engine responses for request/response workflows

## Main Routes

- `POST /api/v1/order`
- `DELETE /api/v1/order`
- `GET /api/v1/order/open`
- `GET /api/v1/order/history`
- `GET /api/v1/order/balance`
- `GET /api/v1/wallet/balances`
- `GET /api/v1/wallet/transactions`
- `GET /api/v1/wallet/summary`
- `POST /api/v1/wallet/deposits`
- `POST /api/v1/wallet/withdrawals`
- `GET /api/v1/portfolio`
- `GET /api/v1/markets`
- `GET /api/v1/depth`
- `GET /api/v1/klines`
- `GET /api/v1/tickers`
- `GET /api/v1/trades`

## Important Files

- `src/index.ts`: Express app wiring
- `src/RedisManager.ts`: Redis request/response messaging
- `src/db.ts`: Postgres pool and transaction helpers
- `src/middleware.ts`: auth and request context setup
- `src/routes/`: route handlers

## Run Locally

```bash
pnpm -C api build
pnpm -C api start
```

Development mode:

```bash
pnpm -C api dev
```
