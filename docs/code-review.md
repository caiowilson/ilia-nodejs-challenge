# Code Review Checklist

Use this as a lightweight checklist in every PR (feature/release/hotfix).

## General

- Scope is minimal and matches the PR title/description.
- Risky changes are called out (migrations, breaking API changes, behavior changes).
- Error handling and logs are appropriate (no secrets in logs).
- Docs updated when behavior/config changes (README/service README/OpenAPI specs).

## Users service

- Auth endpoints validate inputs (schema) and return consistent error shapes.
- DB writes are wrapped in a transaction when needed.
- Outbox publishing remains idempotent and doesn’t mass-update unrelated rows.

## Wallet service

- Readiness gating is consistent (status, headers, body).
- Idempotency-Key handling is correct and bounded.
- Pagination is stable and indexed (avoid duplicates/skips).

## Testing

- `bun run lint`, `bun run typecheck`, and `bun run test` are green.
- New env tunables have deterministic unit tests (avoid real timers where possible).

