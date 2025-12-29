# Improvements Backlog

yeah I know, sorry. I can't stop.

Note: the items below are suggested improvements — they are not required for the
project to function right now. They represent recommended changes to improve
reliability, maintainability, or performance; treat them as optional guidance and
prioritize as needed.

This repo is already in a good place (clear architecture docs, Swagger UI per-service, integration tests, outbox + consumer retry ladder). The items below are targeted improvements I noticed while reviewing the codebase.

## Effort scale

- XS
- S
- M
- L
- XL

Priority tags:

- P0: should do next
- P1: good improvements / maturity
- P2: optional / nice-to-have

## XS

### 1) Remove tracked `.env` (or explicitly justify keeping it)

**Effort:** XS
**Priority:** P0

**Why:** `.env` is present in the repo root even though it is ignored in `.gitignore`. If it’s tracked, it can drift from `.env.example` and **encourage** committing env secrets later. Taking into account that it's a challenge and the `.env.example` is basically the same, it is not a huge concern.

#### Planned steps

1. Confirm whether `.env` is tracked in git history.
2. If tracked: remove it from git and keep `.env.example` as the template.
3. Add a short note in `README.md` about copying `.env.example` to `.env`.

### 2) Speed up Docker builds with a root `.dockerignore`

**Effort:** XS
**Priority:** P1

**Why:** Docker build contexts use `context: .` and there’s no `.dockerignore`, so local `node_modules/` (and other artifacts) can balloon build time and image layer churn.

#### Planned steps

1. Add a root `.dockerignore` excluding `node_modules/`, `.git/`, `coverage/`, logs, etc.
2. Keep required inputs included (e.g. `bun.lock`, `package.json`, `services/**`).
3. Verify `docker compose build` still works.

### 3) Add restart policies (and optionally healthchecks) in `docker-compose.yml`

**Effort:** XS
**Priority:** P1

**Why:** Workers can exit if dependencies aren’t ready yet (DB/broker startup). Without `restart: on-failure`/`unless-stopped`, they can remain down.

#### Planned steps

1. Add `restart: on-failure` (or `unless-stopped`) to `users-worker` and `wallet-worker` (and optionally to HTTP services).
2. (Optional) Add healthchecks for Postgres/RabbitMQ and change `depends_on` to `service_healthy` where supported.
3. Verify one-command `docker compose up ...` remains stable on cold start.

### 4) Harden Idempotency-Key behavior (payload validation + replay semantics)

**Effort:** XS
**Priority:** P1

**Why:** Idempotency keys are enforced and documented, but payload mismatches are not detected. This can return a transaction created by a different payload under the same key.

**Problem / recommendation (payload validation):**
The current idempotency behavior returns an existing transaction when the same
`Idempotency-Key` is provided, but it does not validate that the request payload
matches the original request that created that transaction. This can cause a
client to receive a transaction that was created by a different payload under
the same key, which distorts behavior and can be abused.

Recommended approaches:

- Store a small, stable fingerprint (e.g. a SHA256 or BLAKE3 hash) of the
 canonicalized request body together with the idempotency record. On repeat
 requests, compare the incoming body hash with the stored hash and return
 `409 Conflict` if they differ.
- If you don't want to persist this in the main DB, consider a volatile store
 (Redis) or a short-lived DB column (e.g. `idempotency_hash` with a TTL
 cleanup policy). The simplest option is to add a column to the idempotency
 table and keep it ephemeral via a background GC migration.
- When mismatched, return `409` and include a helpful error body that explains
 the conflict and suggests the client generate a new idempotency key.

#### Planned steps

1. Add idempotency hash storage (DB column or Redis) and hashing helper used by the service.
2. Validate on repeat requests and return `409` when payloads differ.
3. Document the behavior in `README.md` and OpenAPI for the endpoint.

**In-memory option (low-effort):**
If you prefer to avoid adding another service or immediate DB churn, a simple
in-process LRU cache with TTL is a valid, low-cost approach. Compute a fixed-size
fingerprint (SHA‑256) of the canonicalized request body and store it in a bounded
LRU with a short TTL (e.g. 1–24 hours). This avoids persisting payloads, uses
minimal memory (tens of MB for large caches), and requires no extra infra.

Note: this is recorded as a suggested improvement only; no code changes are being
made now.

**Redis option (cross-instance, persistence):**
If you later need cross-instance consistency, add Redis as the shared TTL store
(`SET idempotency:<key> <hash> EX <seconds>`). Redis is ideal for short‑lived
idempotency keys because it provides atomic operations and automatic expiry.

If you're worried about a Redis instance getting swamped or needing "cold"
storage, prefer configuring Redis persistence (RDB snapshots and/or AOF) and
appropriate eviction policies (`maxmemory` + `maxmemory-policy`) rather than
forcing a separate disk-only fallback. Another pattern is write-through: keep
the authoritative copy in the primary DB and use Redis as a fast cache with TTL;
on Redis failure the DB still provides correctness (at slightly higher latency).

Note: adding Redis is an operational decision (extra infra) and should be done
only if cross-instance guarantees are required.

## S

### 5) Fix migrations to work outside Docker

**Effort:** S
**Priority:** P0

**Why:** `services/users/src/migrate.sh` and `services/wallet/src/migrate.sh` reference `/app/...`, so `bun --filter ... run migrate` won’t work when running locally (non-Docker).

#### Planned steps

1. Update both scripts to reference migration SQL via a path relative to the script location (no hard-coded `/app`).
2. Ensure both scripts still work in Docker (same container paths) and locally (developer machine).
3. Update `README.md` and service READMEs to clarify the two supported migration flows (Docker vs local).

### 6) Keep Bun versions aligned across README and Docker (and CI if added)

**Effort:** S
**Priority:** P1

**Why:** Bun version should stay consistent between docs and Docker images (currently 1.1.38).

#### Planned steps

1. When upgrading Bun, update `README.md` and both service Dockerfiles together.
2. If CI is added later, pin it to the same version.
3. (Optional) Add a small “tooling versions” section to `README.md` to keep this consistent.

### 7) Add DB indexes for the hot paths

**Effort:** S
**Priority:** P1

**Why:** Listing uses `WHERE user_id = $1 ORDER BY created_at DESC LIMIT ...`. Current index is `transactions(user_id)` only.

#### Planned steps

1. Add an index like `transactions(user_id, created_at DESC)` (and optionally include `id`).
2. Confirm queries use the index (optional: explain/analyze in dev).
3. Document the index rationale in a short migration comment or ADR note.

### 8) Improve rate-limit behavior (headers + docs)

**Effort:** S
**Priority:** P1

**Why:** Rate limiting is enabled via env toggles, but clients benefit from standard rate-limit response headers and clear retry guidance.

#### Planned steps

1. Configure `@fastify/rate-limit` to emit standard headers (limit/remaining/reset) and ensure 429 responses include `Retry-After` when applicable.
2. Ensure rate-limit error bodies match the service-wide `ErrorResponse` shape (`{ code, message }`) for consistency.
3. Document defaults + env overrides in `README.md`, `services/users/README.md`, and `services/wallet/README.md`.

### 9) Make wallet readiness Retry-After configurable

**Effort:** S
**Priority:** P2

**Why:** Wallet readiness gating uses a fixed `Retry-After: 2`, which is fine for the challenge but may not reflect real startup/provisioning times.

#### Planned steps

1. Add `WALLET_READY_RETRY_SECONDS` (default `2`) and use it for both the `Retry-After` header and the response body message if needed.
2. Ensure *all* gated code paths use the same helper (to keep headers/body consistent).
3. Keep “missing JWT” fast-fail behavior (401) and ensure error bodies remain consistent across endpoints.
4. Update OpenAPI (where appropriate) and tests to allow overriding the retry interval via env.

## M

### 10) Improve transaction pagination correctness

**Effort:** M
**Priority:** P1

**Why:** `/v1/transactions` paginates by `created_at` only. If multiple rows share the same timestamp, pagination can skip/duplicate items.

#### Planned steps

1. Switch cursor to a stable tuple (e.g. `created_at + id`) and order by `(created_at, id)`.
2. Update query to filter by the tuple cursor.
3. Update OpenAPI docs and add/adjust a test covering cursor stability.

### 11) Make consumer retry controls configurable + improve failure logging

**Effort:** M
**Priority:** P1

**Why:** Wallet provisioning retries are currently hard-coded to 3 tiers/attempts via `nextRetryQueue()`, which makes tuning harder without code changes. Also, more explicit logs on retries/DLQ improve debuggability.

#### Planned steps

1. Make retry tiers configurable (e.g. `RETRY_TTLS_MS=10000,30000,120000` or `MAX_RETRIES` + `RETRY_TTL_*`) and validate on startup.
2. Ensure retry requeue preserves headers and message persistence (already done) and keep DLQ bindings explicit in topology.
3. Log attempt number, chosen retry queue, and include the error when retrying; log a clear reason when routing to DLQ.
4. Add a unit test that `nextRetryQueue()` behavior matches configured tiers (or tier list parsing).

### 12) Tighten config validation and startup behavior

**Effort:** M
**Priority:** P2

**Why:** Config parsing currently falls back to defaults (including `JWT_PRIVATE_KEY`). That’s correct for the challenge constraints, but risky if deployed beyond the challenge.

#### Planned steps

1. Add env validation (minimal: check required vars for the current process role).
2. Keep “challenge defaults” behind an explicit opt-in flag (e.g. `ALLOW_INSECURE_DEFAULTS=true`) or only for tests.
3. Fail fast with a clear error message when required env vars are missing.

**Config parsing robustness (example: retry TTL MS):**
Human errors in env values (for example, setting `RETRY_TTL_MS=NaN` or an empty
string) can cause obscure runtime failures. Document and implement defensive
parsing rules:

- Parse numeric envs with explicit checks (`Number.isFinite()` / `Number()` +
 `isNaN` guard) and provide a clear, actionable startup error if validation
 fails (instead of crashing later with an unclear exception).
- Prefer configurable defaults and bounds (e.g. `OUTBOX_POLL_INTERVAL_MS` must
 be an integer between `100` and `86_400_000`). If the value is invalid,
 either fall back to a safe default and log a warning, or fail fast with a
 helpful message explaining the expected format.
- Consider using a small config-validation library (Zod, Joi, or `convict`) so
 validation and defaults are centralized and tests can assert behavior.

Example (conceptual):

1. Read raw env: `const raw = process.env.OUTBOX_POLL_INTERVAL_MS`.
2. Parse: `const n = Number(raw)`; if `!Number.isFinite(n)` → error: `Invalid
  OUTBOX_POLL_INTERVAL_MS: expected integer ms`.
3. Coerce/validate bounds and use default if desired.

Add a short note in `README.md` about common env pitfalls and how the services
validate config on startup.

### 13) Minimal metrics / observability (optional)

**Effort:** M
**Priority:** P2

**Why:** The repo already has good structured request logs; a few counters for async flows make it easier to detect “stuck outbox” / “retry storms” / “DLQ growing”.

#### Planned steps

1. Add structured log fields for key counters (published count, publish failures, retry count, DLQ count) and keep them stable for parsing.
2. (Optional) Expose Prometheus-style metrics on `/metrics` (per process) if you want a concrete scrape target.
3. Document what to monitor and how to interpret DLQ/retry ladder behavior.

### 14) Docker hardening

**Effort:** M
**Priority:** P2

#### Planned steps

1. Run containers as a non-root user where possible.
2. Add `HEALTHCHECK` to service images (if you prefer image-level health over compose-level).
3. Consider multi-stage builds to slim the runtime image (optional for this challenge).

## L

### 15) Make the Users outbox publisher safer under failure

**Effort:** L
**Priority:** P0

**Why:** `services/users/src/worker.ts` currently:

- Calls `waitForConfirms()` once per message (slow under load / can hammer RabbitMQ at high throughput).
- On any publish failure, increments `attempts` / sets `last_error` for *all* `pending` outbox rows (not just those picked up in the failed batch).
- Uses `setInterval` without awaiting, so publish cycles can overlap when a batch takes longer than the interval.

- Problem observed after delivery: when a publish in a batch fails, the worker currently
 updates `attempts` / `last_error` for *all* pending outbox rows rather than only the
 rows selected for the failed batch. This obscures which messages actually failed,
 distorts retry/failed metrics, and makes debugging harder. The fix is to restrict
 updates to the IDs locked for the batch (for example `UPDATE outbox SET attempts=... WHERE id = ANY($1::uuid[])`),
 or perform the attempts/last_error update inside the same transaction that selects/locks
 the batch so only those rows are affected.

#### Planned steps

1. Change the loop to publish all messages in the batch then call `waitForConfirms()` once per batch.
2. Track the selected outbox row IDs and, on failure, only update `attempts` / `last_error` for those IDs.
3. Replace `setInterval` with an async loop (publish → sleep) to prevent overlapping runs; add exponential backoff (with a cap) on repeated failures.
4. Add env tunables like `OUTBOX_POLL_INTERVAL_MS` (already present) and `OUTBOX_BATCH_LIMIT`, and document reasonable defaults.
5. Add unit tests for “unknown event type → status=failed + last_error” and “attempts updated only for selected rows”.

### 16) Separate external auth (JWT) from internal auth (event HMAC) + TLS to RabbitMQ (non key-pair strategy)

**Effort:** L
**Priority:** P1
**Status:** Proposed

**Context**

- Challenge constraints (from the docs): external JWT must be HS256 and the shared secret must be provided via `JWT_PRIVATE_KEY=ILIACHALLENGE`.
- The repo already defines `INTERNAL_JWT_PRIVATE_KEY` but does not use it in code today.
- Users → Wallet is async via RabbitMQ; currently the event payload is trusted if it arrives on the queue.

**Problem**

- With a shared HS256 secret, any component that knows the secret can mint “valid” user tokens; you can’t fully eliminate this blast radius under the challenge constraint.
- RabbitMQ transport and message-level authenticity are separate concerns:
  - If the broker connection is plain AMQP, traffic can be observed/modified on-path (inside the docker network, in CI, etc).
  - Even with broker ACLs, if a credential leaks (or another container can publish), the Wallet consumer has no cryptographic way to reject forged/tampered events.

**Options considered**

1. Asymmetric signatures (Ed25519/RS256) per service (private/public key pairs).
2. mTLS / service mesh (strong identity; more infra).
3. Shared-secret HMAC signatures on messages (selected).
4. Rely only on RabbitMQ ACLs (useful baseline, but not sufficient alone).

**Decision (proposal)**

1. **External auth:** Keep HS256 (challenge requirement), but tighten the JWT contract.
   - On sign (Users): include/standardize `typ=access`, `iss=users-service`, `aud=["users-service","wallet-service"]`, plus `iat` and `jti`.
   - On verify (Users + Wallet): require those claims (don’t just “accept any JWT that verifies”).
   - Code pointers: token issuance is in `services/users/src/routes/auth.ts`; verification hooks are in `services/users/src/plugins/jwt.ts` and `services/wallet/src/plugins/jwt.ts`.
2. **Internal auth:** Add message-level authenticity for Users → Wallet events using HMAC-SHA256 with `INTERNAL_JWT_PRIVATE_KEY`.
   - Users worker (`services/users/src/worker.ts`) signs the exact bytes it publishes (avoid JSON canonicalization issues) and sets headers like:
     - `x-signature-alg: hmac-sha256`
     - `x-signature: <base64>`
     - `x-signature-ts: <unix ms>` (optional, but useful for debugging / replay windows)
     - `x-key-id: internal-v1` (rotation hook)
   - Wallet worker (`services/wallet/src/worker.ts`) verifies signature *before* parsing JSON. Missing/invalid signature is treated as a poison message → DLQ.
   - Suggested signing input (deterministic, low-footgun): `HMAC(key, messageId + "." + ts + "." + rawBodyBytes)`.
   - Use constant-time comparison (`timingSafeEqual`) on verify.
   - Note on real-life retries: if you enforce a timestamp window, keep it larger than the max retry delay (today the retry ladder is up to 120s) so legitimate replays via retry queues don’t get rejected.
3. **Transport hardening:** Prefer TLS for broker connections.
   - Use `amqps://...` and validate the broker cert with a CA bundle mounted into the containers.
   - Update the readiness TCP probe defaults so `amqps` uses port `5671` (today the health check defaults `amqps` to 5672).

**Rationale**

- Establishes two distinct systems as required by the challenge: user-facing JWT vs internal message authentication.
- HMAC is the fastest “real” integrity check to add without introducing new infra; it materially reduces the risk of forged events.
- Tightened JWT claims reduce token confusion and make the auth contract explicit (issuer/audience/type), while staying within HS256 constraints.
- TLS protects credentials and message content over the wire (defense in depth with HMAC).

**Consequences / trade-offs**

- HMAC uses a shared secret: any holder can forge events. This is still a major improvement vs “no signature”, and it’s a good stepping stone toward per-service key pairs later.
- Requires managing an additional secret (`INTERNAL_JWT_PRIVATE_KEY`) and rotating it deliberately.
- TLS adds some config overhead (cert generation/mounts), but can be done incrementally (dev first, then CI).

#### Planned steps

1. Define the header contract (`x-signature*`) and what bytes are signed; document it in `docs/architecture/decisions.md` or as a short ADR note.
2. Implement signing in `services/users/src/worker.ts` and verification in `services/wallet/src/worker.ts` (nack→DLQ on failure).
3. Tighten external JWT sign + verify in `services/users/src/routes/auth.ts`, `services/users/src/plugins/jwt.ts`, `services/wallet/src/plugins/jwt.ts`.
4. Add tests:
   - Unit test: signature verify success/failure.
   - Integration test: register→wallet flow still works with the new claims and headers.
5. (Optional) Add RabbitMQ TLS support in `docker-compose.yml` + docs, and fix the readiness port mapping for `amqps`.

## XL

### 17) Reduce duplication between services (shared “common” module)

**Effort:** XL
**Priority:** P2

**Why:** Users and Wallet duplicate several chunks (health TCP check, Swagger setup, error handler patterns, config parsing).

#### Planned steps

1. Decide whether to keep duplication (explicitness) or extract shared utilities.
2. If extracting: add a `packages/common` workspace and move shared code behind stable APIs.
3. Update both services to import shared helpers; keep service-specific behavior local.

## Docs additions (documentation-only)

Note: the following are documentation suggestions only — no code changes will be
made right now. They summarize discussions and recommended approaches so the
team can decide later.

- **Cursor pagination / tiebreaker:** Use a deterministic tuple for cursors
 (e.g. `created_at, id`) so pagination is stable when multiple rows share the
 same sort key. Document the lexicographic comparison pattern and include an
 example SQL snippet.

- **Cursor encoding & security:** Base64 is obfuscation only. Recommend
 documenting the cursor format (JSON tuple) and options for production:
  - lightweight: base64url only (suitable for internal/demo use)
  - signing: HMAC (detect tampering) — recommended minimal hardening
  - encryption: AES/GCM (confidentiality) — only if you must hide values
 Note: prefer doing signing/encryption in the application (rotatable keys,
 easier libs) rather than adding DB-side crypto unless there is a clear need.

- **Postgres / pgcrypto / BLAKE3 notes:** PostgreSQL includes `pgcrypto` for
 HMAC and symmetric encryption. BLAKE3 is not available by default (would
 require a custom extension). Document the tradeoffs and suggest computing
 modern hashes (BLAKE3) or HMAC in the app layer unless an extension is
 justified.

- **Idempotency payload validation:** Store a fixed-size fingerprint (SHA‑256
 or similar) of the canonicalized request body and compare on repeat requests;
 return `409 Conflict` on mismatch. Describe DB vs Redis vs in-process cache
 options and retention/cleanup strategies.

- **TTL / cleanup:** Postgres has no per-row TTL; document practical options:
 external cron deletes, `pg_cron`, partitioning, or Redis TTL. Recommend a
 small retention window (1–7 days) and note partitioning only for very high
 volume scenarios.

- **In-memory LRU suggestion:** For low-cost idempotency guarantees (no extra
 infra), document an in-process LRU with TTL (bounded size + TTL e.g. 1–24h).
 Note tradeoffs: lost on restart and not shared across instances.

- **Redis option & persistence:** If cross-instance consistency is required,
 use Redis with TTL. Prefer configuring Redis persistence (RDB/AOF) and
 eviction policies; consider write-through patterns (DB authoritative + Redis
 cache) to avoid correctness gaps in Redis failures.

These notes are intentionally concise — say if you want any of them expanded
into a full ADR/migration plan or sample snippets to include in the docs.
