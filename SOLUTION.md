# AI Feedback Triage — solution notes

This document complements [`README.md`](README.md) with architecture, trade-offs, and operational guidance for reviewers.

## Architecture overview

```text
Browser (React / App Router)
  → fetch JSON (/api/feedback)
  → withFeedbackApiEnvelope (CORS, rate limit, request ID, API key, logging, errors)
  → FeedbackControllers (Zod + sanitize)
  → FeedbackService (use case)
  → Ports: IFeedbackRepository | IAnalysisPort | IAnalysisCache | ILogger
  → Adapters: FeedbackDao (pg) | OpenAI / Mock | In-memory cache | Pino
  → PostgreSQL
```

- **Driving adapters**: Next.js `src/app/api/**` routes delegate to controllers; no business logic in route files.
- **Application core**: `FeedbackService` orchestrates idempotency lookup, analysis cache, AI call, and persistence.
- **Driven adapters**: DAO and OpenAI/mock implement ports; wired only in `src/server/container.ts` (composition root).
- **Shared contract**: `src/shared/api/feedback.contract.ts` and `src/shared/validation/*` are consumed by UI and server without importing server code into React.

## Technology choices

| Choice | Rationale |
|--------|-----------|
| **Next.js 15 (App Router)** | Single deploy for UI + API; `src/server` stays framework-agnostic for tests. |
| **TypeScript** | End-to-end types from DB row → domain → HTTP DTO. |
| **PostgreSQL** | Relational fit for filters, pagination, idempotency mapping, and constraints. |
| **node-pg + DAO** | Explicit SQL and parameterized queries; clear DAO layer vs hiding SQL behind an ORM. |
| **OpenAI (`gpt-4o-mini`)** | Official Node SDK, JSON mode, good cost/latency for triage; **mock adapter** for CI and offline dev. |
| **Zod** | Single validation story for env, AI output, HTTP bodies, and client-side pre-checks. |
| **Vitest + Newman** | Fast unit tests for pure logic; Newman proves the real HTTP + DB stack. |

### Why PostgreSQL (relational) vs document store

Feedback rows are **tabular** (scalar filters on `sentiment`, array membership/ILIKE on `tags`, sort by `created_at`, stable numeric `id`). Postgres gives:

- CHECK constraints and indexes (GIN on `tags`, partial index on `email`)
- ACID for idempotency insert + feedback insert in one transaction
- Simple pagination (`LIMIT`/`OFFSET` + `COUNT`) without application-side joins

A document DB would work for v1, but filtering and idempotency mapping are natural SQL problems; Postgres avoids duplicating query logic in application code.

### Why OpenAI over Anthropic

Assignment allows either; OpenAI was chosen for **JSON response mode**, wide SDK documentation, and team familiarity. The `IAnalysisPort` interface means an Anthropic adapter could be added without changing controllers or the UI contract.

## AI design

### Call pattern

Analysis runs **synchronously inside `POST /api/feedback`** (assignment requirement). Flow:

1. Optional idempotency short-circuit (Postgres `feedback_idempotency`)
2. In-memory cache lookup keyed by hash of normalized feedback text
3. `IAnalysisPort.analyze(text)` if cache miss
4. Persist row + analysis columns

**Production evolution:** enqueue a job (SQS/RQ/BullMQ), return `202 Accepted` with `jobId`, poll `GET /api/feedback/jobs/:id` or use webhooks. Idempotency table and DTO stay the same; only the controller/service timing changes.

### Prompting and safety

- System prompt requests **JSON only** with bounded fields (`summary`, `sentiment`, `tags`, `priority`, `nextAction`).
- User content is wrapped in a small envelope (`user_feedback_plaintext_payload`) — not echoed back in logs.
- **Zod** validates model output (`feedbackAnalysisSchema`); malformed JSON or invalid enums become `502 UPSTREAM_ERROR`.
- Logs record **model name, duration, outcome** — not raw feedback text or full prompts.

### Caching and retries (both implemented)

| Mechanism | Purpose |
|-----------|---------|
| **In-memory analysis cache** (`InMemoryAnalysisCacheAdapter`) | Duplicate text avoids repeat OpenAI cost/latency. Trade-off: per-process only; use Redis in multi-instance deploys. |
| **OpenAI retries** (`OpenAIAnalysisAdapter`, up to 3 attempts) | Handles transient 429/5xx/connection errors with backoff. Trade-off: longer tail latency on failures; bounded by attempt cap. |

Assignment asked for **one**; both were implemented because cache optimizes steady-state cost while retries improve reliability — document as complementary, not redundant.

## HTTP contract

- Success bodies use `FeedbackDto` / `PaginatedFeedbackListDto` from `feedback.contract.ts`.
- **`POST /api/feedback`**: optional `Idempotency-Key` (16–255 printable ASCII). Replays return **201** + header `Idempotent-Replayed: true` with the first stored row.
- Errors: `{ error: { code, message, details?, requestId, retryAfterMs? } }` with stable `code` values in `error-codes.ts` for UI categories (validation, auth, rate limit, upstream, server).

## Client layer

- `NEXT_PUBLIC_API_BASE_URL` when set; otherwise same-origin on the client.
- `ApiClientError` + `categoryForError` drive `ErrorAlert` and field-level messages.
- React **context providers** per surface (submit, list, detail) avoid prop drilling.
- **Error boundaries** isolate panel failures; list route uses `<Suspense>` for `useSearchParams`.

## Data model highlights

- `id BIGSERIAL` starting at **1**; invalid ids rejected before DB (`400 INVALID_ID`).
- `email` optional, **not unique** (feedback domain); partial index on non-null email for lookup.
- Analysis stored as columns on `feedback` (flat DTO in API rather than nested JSON blob — simpler queries and filters).

## Testing strategy

| Layer | Tool | Scenarios |
|-------|------|-----------|
| AI adapter | Vitest + mocked OpenAI SDK | Valid JSON, malformed JSON, Zod failure, retry on 429 |
| Controllers | Vitest + mocked `FeedbackService` | 400 bad JSON, 201 create, 400 invalid id, 404 not found, list filters |
| Shared validation | Vitest | Sanitize, idempotency key schema, error serializer |
| UI | Vitest + RTL (jsdom) | Submit panel: disabled empty submit, submit handler, field errors, loading |
| HTTP E2E | Newman + Postgres | CORS, CRUD, idempotency replay, pagination seed, invalid id |

Run: `npm run test` or `npm run test:coverage` (terminal % + `coverage/index.html`).

## Operational runbook

### AI rate limits or timeouts

1. Check logs for `openai_analysis_finished` with `outcome: error` and `failure_kind: openai_rate_limit` or `openai_connection_timeout`.
2. Confirm `AI_PROVIDER=openai` and valid `OPENAI_API_KEY`.
3. For demos, switch `AI_PROVIDER=mock` or rely on **analysis cache** for repeated text.
4. Tune retry behavior or lower concurrency; in production add queue + worker and circuit breaker.
5. Return path to users: `502 UPSTREAM_ERROR` with `requestId` for support correlation.

### Database connection exhaustion or connectivity

1. Symptom: `500`/`503`, logs `feedback_dao_query_failed`, Postgres errors in stderr.
2. Verify `docker compose ps`, `DATABASE_URL`, and `npm run db:migrate`.
3. Check pool size in `pg-pool.ts` (default cap); reduce parallel Newman seeds or raise Postgres `max_connections`.
4. Ensure connections are released (DAO uses pool per query; idempotency path uses transaction with `finally release`).
5. Long-term: PgBouncer, connection limits per instance, health check on `/api` route.

### API abuse / 429 from this app

- Logs: `http_error` with `RATE_LIMIT_EXCEEDED`.
- Raise `RATE_LIMIT_POST_MAX` / `RATE_LIMIT_MAX_REQUESTS` in `.env` or tune Newman `pagSeedTarget`.
- Production: Redis-backed rate limiting keyed by IP + API key.

## Optional features not implemented

- **Free-text search** across `text`/`summary`: omitted for v1; would add `ILIKE` or `tsvector` with documented trade-offs (index size vs fuzzy match).
- **Video demo**: deliver separately per assignment instructions.

## Pattern note

Hexagonal layout + composition root trades a few extra files for **testability and swap-friendly adapters**. A single Next route file would be faster to write but couples HTTP policy, OpenAI, and SQL — harder to mock in unit tests and harder to explain in an interview walkthrough.
