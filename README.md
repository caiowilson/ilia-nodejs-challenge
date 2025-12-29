# Project/Challenge

## Docs

- Architecture: `docs/architecture/README.md`
- API specs: `docs/api/ms-users.yaml`, `docs/api/ms-transactions.yaml`

## Requirements

- Bun `1.1.38` (matches Docker images)
- Docker + Docker Compose (for local infra)

## Common scripts

- `bun run up`: build/start all Docker services + workers + migrations
- `bun run down`: stop/clean Docker services
- `bun run migrate`: run users + wallet migrations (via compose)
- `bun run dev`: run users + wallet services locally
- `bun run dev:users` / `bun run dev:wallet`: run a single service locally
- `bun run test`: run service tests
- `bun run lint`: run Biome checks
- `bun run fmt`: format with Biome
- `bun run typecheck`: run TypeScript checks

## Quickstart (Docker)

1) Create env:
```
cp .env.example .env
```
2) One command (services + workers + migrations + consolidated Swagger UI):
```
bun run up
```
   Or manually with Docker Compose:
```
docker compose up --build users-migrate wallet-migrate users wallet users-worker wallet-worker rabbitmq users-db wallet-db docs
```
3) Stop/clean:
```
bun run down
```
   Or manually with Docker Compose:
```
docker compose down --remove-orphans
```

## Local (no Docker)

1) Start Postgres and RabbitMQ locally, then set:
```
USERS_DATABASE_URL=postgres://...
WALLET_DATABASE_URL=postgres://...
RABBITMQ_URL=amqp://...
JWT_PRIVATE_KEY=ILIACHALLENGE
```
2) Apply migrations (local `psql`):
```
psql "$USERS_DATABASE_URL" -f services/users/migrations/001_create_users.sql
psql "$USERS_DATABASE_URL" -f services/users/migrations/002_create_outbox.sql
psql "$USERS_DATABASE_URL" -f services/users/migrations/003_split_name.sql
psql "$WALLET_DATABASE_URL" -f services/wallet/migrations/001_create_wallets.sql
psql "$WALLET_DATABASE_URL" -f services/wallet/migrations/002_add_idempotency_key.sql
```
   Note: `bun run migrate` uses Docker Compose and the migrate scripts assume container paths.
3) Start apps + workers:
```
bun run dev:users
bun run dev:wallet
bun --filter @app/users run worker:publisher
bun --filter @app/wallet run worker:consumer
```

## One-command Docker (all services + workers + migrations)

This starts DBs, RabbitMQ, runs migrations, and brings up services + workers:
```
bun run up
```
Or manually with Docker Compose:
```
docker compose up --build users-migrate wallet-migrate users wallet users-worker wallet-worker rabbitmq users-db wallet-db
```

## API docs

- Users OpenAPI/Swagger UI: `http://localhost:3002/docs` (spec at `/openapi.json`)
- Wallet OpenAPI/Swagger UI: `http://localhost:3001/docs` (spec at `/openapi.json`)
- Hoppscotch: import the OpenAPI URL for each service (e.g., `http://localhost:3002/openapi.json`)
- Consolidated Swagger UI (default in compose): `http://localhost:8080` (preloaded with Users + Wallet specs)
- Hoppscotch (optional): configure an environment with `{{users}}` and `{{wallet}}` pointing to the two OpenAPI URLs for quick testing.
- Note: the first wallet transaction after user creation can briefly return `WALLET_PROVISIONING` while the wallet worker initializes the user balance. Retry after a few seconds.
- Note: wallet credit/debit requests require an `Idempotency-Key` header to ensure safe retries.

## Releases

- Commit style: Conventional Commits (e.g., `feat: ...`, `fix: ...`, `chore: ...`)
- Generate changelog + tag: `bun run release` (uses `standard-version`)
