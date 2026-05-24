# AI Feedback Triage — solution notes

This document complements [`README.md`](README.md) with architecture and design choices for reviewers.

## Hexagonal boundaries

- **Domain / use case**: `FeedbackService` owns triage orchestration (persist + analysis cache + upstream AI port). It stays free of HTTP and framework types.
- **Ports**: repository (`IFeedbackRepository`), analysis adapter, logger — expressed as small interfaces on the server side and resolved from `getApplicationContainer()`.
- **Adapters**: `FeedbackDao` (parameterized SQL), OpenAI + mock analysis, Pino/noop loggers. Swapping AI or storage does not require changing route handlers.
- **Driving adapters**: Next.js `app/api/**` routes stay thin; they delegate to controllers wrapped by `withFeedbackApiEnvelope` for cross-cutting concerns.

**Pattern note**: Classic ports/adapters + explicit DI via a container keeps the API stable while allowing mock AI in CI and OpenAI in prod. A single God-module API route would be simpler but would entangle transport, policy, and persistence; the extra structure pays off when tests mock only the service ports.

## HTTP contract

- Successful JSON bodies for feedback use the shared DTOs in `src/shared/api/feedback.contract.ts` (no server imports from UI).
- **`POST /api/feedback`** supports optional **`Idempotency-Key`**: Postgres maps it to `feedback.id` (`feedback_idempotency` migration). Replays return the stored row with **`201`** + **`Idempotent-Replayed: true`**; first successful body wins semantics match common payment APIs even when later retries change JSON.
- Errors return `{ error: ApiErrorBody }` with `code`, `message`, optional `details` (`field` + `message`), `requestId`, and sometimes `retryAfterMs`, aligned with `error-codes.ts` for consistent UI mapping.

## Client layer

- Browser fetches use `NEXT_PUBLIC_API_BASE_URL` when set (trimmed, no trailing slash); otherwise same-origin `window.location.origin` on the client and `""` during SSR (list/detail pages are client-driven after hydration).
- `ApiClientError` parses the envelope so UI can show category-specific copy and optional validation fields.

## React UI

- **Context + hooks** (`FeedbackListProvider`, `FeedbackSubmitProvider`, `FeedbackDetailProvider`) isolate data fetching from presentational components and avoid prop drilling.
- **`useSearchParams`** for the list requires a **`<Suspense>`** boundary (see `src/app/feedback/page.tsx`) per Next.js App Router rules.
- **Error boundaries** wrap each surface so a single panel failure does not blank the entire app shell.

## Performance / complexity

- List filters and pagination are **O(1)** per user action (single GET + URL update). Tag deduplication in `TagList` is **O(n)** on the small tag arrays returned by analysis.
- DAO list query uses indexed filters where applicable; total count + page query stay linear in result width, not per-row N+1.

## Tests

- **Vitest** covers pure utilities (`sanitize`, idempotency key schema, `categoryForError`, `error-serializer`) with fast node environment and `@/` alias via `vitest.config.mts`. Run **`npm run test:coverage`** for terminal **statement/branch/function/line %** plus **`coverage/index.html`**.
- **Newman** exercises the live HTTP stack (CORS preflight incl. **`Idempotency-Key`**, create + replay, **pagination seed loop** parameterized by **`pagSeedTarget`**, list page 1 + page 2, detail, invalid id). Requires Postgres + permissive **`RATE_LIMIT_POST_MAX`** versus the scripted POST bursts (defaults described in **`README.md` / `.env.example`**).

