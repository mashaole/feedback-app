Feedback app — Next.js (TypeScript, App Router, Tailwind), PostgreSQL via Docker Compose.

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

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | ESLint |
| `npm run test` / `npm run test:unit` | Vitest (unit) |
| `npm run test:watch` | Vitest watch |
| `npm run test:integration` | Newman (Postman collection) |
| `npm run db:migrate` | Apply SQL migrations |
| `npm run docker:up` | Start Postgres (`docker compose up -d`) |
| `npm run docker:down` | Stop Postgres (`docker compose down`) |

Edit the UI starting from [`src/app/page.tsx`](src/app/page.tsx).

## Learn more

- [Next.js documentation](https://nextjs.org/docs)
- [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app)
