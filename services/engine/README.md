# Engine Service

This service is the in-memory matching engine. It owns live orderbooks, matches buy and sell orders using price-time priority, manages balance locks during runtime, and publishes market events.

For full architecture and system-level behavior, see the [root README](../../README.md).

## Responsibilities

- maintain live orderbooks per market
- process create/cancel/depth/balance commands from the API
- enforce basic balance locking before order placement
- execute trades and partial fills
- publish ticker, trade, and depth updates
- emit persistence events for the DB worker
- restore balances and open orders from Postgres on startup

## Main Components

- `src/trade/Engine.ts`: orchestration and command handling
- `src/trade/Orderbook.ts`: per-market book and matching logic
- `src/RedisManager.ts`: Redis queue/pub-sub integration
- `src/index.ts`: service entrypoint and startup hydration
- `src/tests/`: engine and orderbook tests

## Run Locally

```bash
pnpm -C engine build
pnpm -C engine start
```

Development mode:

```bash
pnpm -C engine dev
```

Run tests:

```bash
pnpm -C engine test --run
```
