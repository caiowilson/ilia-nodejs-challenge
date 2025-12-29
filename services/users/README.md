## Users Service

### Endpoints

- `POST /v1/auth/register`
- `POST /v1/auth/login`
- `GET /v1/users/me`

Register requires `firstName`, `lastName`, `email`, and `password`.

### Worker

- `bun --filter @app/users run worker:publisher`

### Migrations

- Docker (container paths): `bun --filter @app/users run migrate`
- The migrate script expects `/app/...` paths and is intended for containers.
- Local `psql` (use these files):
  - `services/users/migrations/001_create_users.sql`
  - `services/users/migrations/002_create_outbox.sql`
  - `services/users/migrations/003_split_name.sql`
