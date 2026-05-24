AI Feedback Triage — Next.js (TypeScript, App Router, Tailwind), PostgreSQL via Docker Compose, optional OpenAI analysis with a mock adapter for local dev and tests.

## Requirements

- **Node.js** 20.19+ (recommended; matches toolchain expectations)
- **Docker** / Docker Compose (for Postgres)

## Setup

```bash
npm ci
cp .env.example .env
npm run docker:up
npm run db:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For **automated checks**, see **[Testing](#testing)** (Vitest unit + Newman API suite).

## App routes

| Path | Purpose |
|------|---------|
| `/` | Submit feedback (client form + AI triage) |
| `/feedback` | Paginated list with sentiment + tag filters (URL-driven) |
| `/feedback/[id]` | Detail view for one record |

## Configuration highlights

- **`DATABASE_URL`** — Postgres connection (see `.env.example`).
- **`AI_PROVIDER`** — `mock` (default) or `openai` (requires `OPENAI_API_KEY`).
- **`CORS_ALLOWED_ORIGINS`** — Comma-separated allowlist; preflight + actual responses use it.
- **`RATE_LIMIT_*`** — Separate caps for read vs write traffic inside the API envelope.
- **`API_KEY`** — When non-empty, requests must send matching `x-api-key` or receive `401`.
- **`NEXT_PUBLIC_API_BASE_URL`** — Optional absolute API root for browser fetches (useful behind another origin). When unset, the UI uses same-origin `/api/...`.

## Idempotent submissions (`POST /api/feedback`)

- Send optional **`Idempotency-Key`** (16–255 printable ASCII chars). The UI generates a UUID client-side **per submission attempt**, reuses it on retries/network errors for the same click, and generates a fresh key **after success** (“Submit another”).
- The first completion **persists `(key → feedback row)`** in Postgres (`feedback_idempotency` table from migration `003_*`). Subsequent requests **with the same key** skip creating a duplicate row (first record wins even if JSON body differs) and reuse the mapped row.
- Replay responses reuse **HTTP 201** and the same JSON DTO plus header **`Idempotent-Replayed: true`** (`Access-Control-Expose-Headers` includes this for browsers).
- Omit the header entirely for purely anonymous fire-and-forget posts (still subject to POST rate limiting).

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | ESLint |
| `npm run test` / `npm run test:unit` | Vitest (unit, no coverage) |
| `npm run test:coverage` | Vitest with **coverage** (% in terminal + HTML under `coverage/`) |
| `npm run test:watch` | Vitest watch (no coverage) |
| `npm run test:watch:coverage` | Vitest watch with coverage |
| `npm run test:integration` | Newman — **requires** `npm run dev` (or `start`) on `baseUrl` |
| `npm run db:migrate` | Apply SQL migrations (loads `.env` / `.env.local` for `DATABASE_URL`) |
| `npm run docker:up` | Start Postgres (`docker compose up -d`) |
| `npm run docker:down` | Stop Postgres (`docker compose down`) |

## Testing

### Unit tests (Vitest)

Fast checks for shared schemas, sanitization, and error serialization (**no Postgres or browser required**):

```bash
npm run test              # single run (no coverage table)
npm run test:coverage     # terminal % totals + ./coverage/index.html
```

Development loop: **`npm run test:watch`** or **`npm run test:watch:coverage`**.

### API tests (Postman / Newman)

End-to-end HTTP checks against **`/api/feedback`** and related routes ([`postman/feedback.postman_collection.json`](postman/feedback.postman_collection.json), environment **[`postman/local.postman_environment.json`](postman/local.postman_environment.json)** defaults to **`baseUrl`: `http://localhost:3000`**).

1. **Start dependencies**: `npm run docker:up`, then **`npm run db:migrate`** (all SQL applies, including idempotency if present).
2. **Run the server** so Newman can reach the API (**`npm run dev`** matches the bundled Postman **`baseUrl`**; or **`npm run start`** after **`npm run build`**, then set **`baseUrl`** in Postman/Newman accordingly).
3. **Run Newman** (CLI uses the npm script wired to **`newman`** + the environment file):

   ```bash
   npm run test:integration
   ```

   Equivalent manual command:

   ```bash
   newman run postman/feedback.postman_collection.json -e postman/local.postman_environment.json
   ```

4. **`API_KEY`**: If set in `.env`, add the same value under **`apiKey`** in `postman/local.postman_environment.json` (or override with Newman **`--env-var apiKey=...`**).
5. **Pagination seed & rate limits**: The collection **`POST /api/feedback (seed pagination)`** loops (**`pagSeedTarget`** rows, default **35**) via **`postman.setNextRequest`**, each with distinct `text` (no **`Idempotency-Key`**), then verifies list **page 1 / page 2** at **`pageSize=5`**. Expect roughly **`2 + pagSeedTarget`** write-tier POSTs in a burst; **`.env.example`** sets **`RATE_LIMIT_POST_MAX=120`**—raise **`RATE_LIMIT_POST_MAX`** or **`pagSeedTarget`** together, or lower both for tighter limits. In Postman Desktop, **`pagSeedCount`** stays **`0`** in the exported file; adjust **`pagSeedTarget`** under collection variables.

## Architecture doc

See [`SOLUTION.md`](SOLUTION.md) for ports/adapters, HTTP error contract, and UI data-flow notes.

## Learn more

- [Next.js documentation](https://nextjs.org/docs)
