# Contributing

## Workflow

1. Install dependencies with `pnpm install`.
2. Copy the required `.env.example` files before running services.
3. Use `pnpm dev` for local development.
4. Run `pnpm build`, `pnpm lint`, `pnpm typecheck`, and `pnpm test` before opening a PR.

## Pull Requests

- Keep changes scoped to one concern.
- Update docs when runtime behavior, env vars, or deployment steps change.
- Include verification notes in the PR description.

## Repository Conventions

- `apps/` contains user-facing applications.
- `services/` contains independently deployable backend services.
- `packages/` contains shared workspace libraries.
- `infra/` contains deployment and orchestration assets.
- `docs/` contains operator and contributor documentation.
