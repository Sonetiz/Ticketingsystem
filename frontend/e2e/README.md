# Smoke Test Suite

Playwright smoke tests that drive the real Next.js + NestJS stack.  
They cover every major user flow end-to-end and are designed to be re-run periodically during development to catch regressions quickly.

---

## Prerequisites

1. **Docker Compose stack must be running** with all services healthy:

   ```bash
   docker compose up -d
   ```

2. **Database must be seeded** (only needed once, or after a fresh `db:reset`):

   ```bash
   docker compose exec backend ts-node /app/prisma/seed.ts
   ```

   The seed creates the following accounts (all password `password123`):
   - `admin@ticketsystem.local` – Super Admin
   - `agent@ticketsystem.local` – Agent
   - `user@example.com` – Requester

3. **Playwright browsers must be installed** (one-time):

   ```bash
   pnpm smoke:install
   ```

   Or equivalently:

   ```bash
   pnpm --filter frontend exec playwright install chromium
   ```

---

## Running the suite

### All tests (from the repo root)

```bash
pnpm smoke
```

### Headed mode (watch the browser)

```bash
pnpm smoke:headed
```

### Interactive UI mode

```bash
pnpm smoke:ui
```

### Only one domain

Use Playwright's `--grep` flag to run a single describe block:

```bash
# From the repo root
BASE_URL=http://localhost:3000 pnpm --filter frontend exec playwright test --grep "Tickets"
BASE_URL=http://localhost:3000 pnpm --filter frontend exec playwright test --grep "Knowledge Base"
BASE_URL=http://localhost:3000 pnpm --filter frontend exec playwright test --grep "Assets"
BASE_URL=http://localhost:3000 pnpm --filter frontend exec playwright test --grep "Software"
BASE_URL=http://localhost:3000 pnpm --filter frontend exec playwright test --grep "Global search"
BASE_URL=http://localhost:3000 pnpm --filter frontend exec playwright test --grep "Authentication"
```

---

## Environment variables

| Variable   | Default                    | Purpose                                                   |
|------------|----------------------------|-----------------------------------------------------------|
| `BASE_URL` | `http://localhost:3000`    | URL of the running Next.js frontend                       |
| `API_URL`  | `http://localhost:3001/api`| URL of the NestJS backend API (used by cleanup helpers)   |

When `BASE_URL` is set, the built-in `webServer` launcher is disabled – the suite assumes the stack is already running.

---

## File structure

```
e2e/
├── fixtures/
│   ├── auth.setup.ts      # Playwright "setup" project – logs in all roles once
│   ├── api.ts             # Raw fetch helper for cleanup DELETE calls
│   └── data.ts            # uid() generator + seed-data lookup helpers
├── .auth/                 # Auto-generated storage state files (git-ignored)
│   ├── admin.json
│   ├── agent.json
│   └── requester.json
├── smoke.spec.ts              # Public landing pages (legacy, no auth needed)
├── auth.spec.ts               # Login / logout / access control
├── tickets.spec.ts            # Ticket CRUD, assign-to-me CSRF fix
├── search.spec.ts             # Global FTS regression guard
├── knowledge-base.spec.ts     # KB article create / list
├── assets.spec.ts             # Asset CRUD, relationships, software, CSV import
├── software.spec.ts           # Software license management
├── changes-problems.spec.ts   # Problem list / detail / linked assets
├── approvals-catalog.spec.ts  # Approvals + Service Catalog smoke loads
├── notifications-profile.spec.ts # Notification + profile pages
├── reports.spec.ts            # Reports page charts and KPIs
├── manage-users.spec.ts       # User/employee management
├── manage-meta.spec.ts        # All other /manage/* pages
└── public-magic-link.spec.ts  # Public status page (unauthenticated)
```

---

## Auth caching

The `fixtures/auth.setup.ts` project runs first and saves authenticated browser storage state to `e2e/.auth/`. Each spec file declares which state it needs via `test.use({ storageState: ADMIN_STATE })` or similar, so no spec re-does the login flow.

The `.auth/` directory is git-ignored.

---

## Cleanup

Tests that create entities (tickets, KB articles, assets, users, software licenses) clean up after themselves via `afterAll` hooks that call `DELETE` on the backend API. This keeps repeated runs idempotent.

---

## Debugging failures

1. **Screenshots**: On failure, Playwright saves a screenshot to `playwright-report/`. Run with `--headed` to watch in real time.

2. **Traces**: On first retry the full trace is saved. Open it with:
   ```bash
   pnpm --filter frontend exec playwright show-trace playwright-report/<trace>.zip
   ```

3. **Single test**: Use `--grep` or `.only` on a specific test.

4. **Check the backend logs**: Failures may be caused by a backend error:
   ```bash
   docker compose logs backend --tail 50
   ```
