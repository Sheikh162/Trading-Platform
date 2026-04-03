# WebSocket Service

This service fans out live market updates to connected frontend clients. It bridges Redis pub/sub channels and browser WebSocket subscriptions.

For full architecture and setup, see the [root README](../README.md).

## Responsibilities

- accept browser WebSocket connections
- manage per-user subscriptions
- subscribe to Redis channels on demand
- broadcast live ticker, trade, and depth messages to connected clients
- clean up subscriptions when users disconnect

## Main Components

- `src/index.ts`: WebSocket server entrypoint
- `src/UserManager.ts`: connection lifecycle management
- `src/SubscriptionManager.ts`: Redis-backed subscription routing
- `src/User.ts`: user connection wrapper

## Run Locally

```bash
pnpm -C ws build
pnpm -C ws start
```

Development mode:

```bash
pnpm -C ws dev
```
