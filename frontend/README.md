# Frontend Service

This service is the user-facing trading client built with Next.js. It provides the dashboard, markets view, trade screen, wallet page, and portfolio page.

For full architecture, setup, and demo flow, see the [root README](../README.md).

## Responsibilities

- render the trading UI
- fetch persisted account and market data from the API
- subscribe to live market streams through the WebSocket service
- allow authenticated users to deposit, withdraw, and place/cancel orders

## Main Areas

- `src/app/dashboard`: account summary and recent activity
- `src/app/markets`: market listing
- `src/app/trade/[market]`: trade screen
- `src/app/wallet`: wallet actions and transaction history
- `src/app/portfolio`: holdings view
- `src/components/depth`: orderbook UI
- `src/lib/httpClient.ts`: public/proxied API calls
- `src/lib/serverApi.ts`: server-side API fetch helper
- `src/lib/SignalingManager.ts`: WebSocket subscription management

## Run Locally

```bash
pnpm -C frontend dev
```

Checks:

```bash
pnpm -C frontend lint
pnpm -C frontend build
```
