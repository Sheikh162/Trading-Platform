# Market Maker Service

This service is a demo liquidity bot used to keep the orderbook active during local runs and demos. It is intentionally simple and exists to make the trading interface easier to demonstrate.

For system context, see the [root README](../README.md).

## Responsibilities

- fetch current open orders for the configured bot users
- cancel stale or randomly selected orders
- place new buy and sell orders around a generated reference price
- keep demo markets liquid enough for UI and engine testing

## Notes

- this is not a production market-making strategy
- balances for bot users are seeded through DB migrations
- it depends on the API and engine being available

## Main File

- `src/index.ts`: full bot loop

## Run Locally

```bash
pnpm -C mm build
pnpm -C mm start
```

Development mode:

```bash
pnpm -C mm dev
```
