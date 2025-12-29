## Wallet Service

### Endpoints

- `GET /v1/balance`
- `GET /v1/transactions`
- `POST /v1/transactions`
- `POST /v1/transactions/credit`
- `POST /v1/transactions/debit`

All transaction POST endpoints require an `Idempotency-Key` header. Swagger UI auto-generates one if you leave it blank.

### Worker

- `bun --filter @app/wallet run worker:consumer`

### Migrations

- Docker (container paths): `bun --filter @app/wallet run migrate`
- The migrate script expects `/app/...` paths and is intended for containers.
- Local `psql` (use these files):
  - `services/wallet/migrations/001_create_wallets.sql`
  - `services/wallet/migrations/002_add_idempotency_key.sql`
