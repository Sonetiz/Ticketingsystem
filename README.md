# ITSM Ticketing System

A modern, modular IT support ticketing system built with NestJS, Next.js, PostgreSQL, Redis, and BullMQ.

## Features

- **Ticket lifecycle management** — create, assign, reassign, merge, split, link, tag, hold/unhold
- **Three web surfaces** — public status page (magic links), support portal, admins-only management portal
- **RBAC** — role-based access with server-side permission enforcement
- **Team delegation** — assign tickets to teams or individuals with queue views
- **Internal vs public messaging** — internal notes never exposed to requesters
- **Email connector** — pluggable IMAP/Mock/Graph skeleton with inbound reply matching
- **Microsoft Teams connector** — mock adapter with Graph skeleton for production
- **SLA & priority escalation** — automated progressive priority based on due dates
- **Recurring tasks** — RRULE-based automatic ticket generation
- **Projects** — group tickets with progress tracking and bulk template creation
- **Reports** — open by team, period stats, SLA breaches, workload by agent
- **Audit logging** — full timeline of all important actions
- **ITSM extras (stubbed)** — knowledge base, canned responses, assets, custom fields, CSAT

## Architecture

```
frontend/     Next.js 14 (App Router) — /portal, /manage, /status
backend/      NestJS REST API + BullMQ worker
shared/       Shared TypeScript types and Zod schemas
docker-compose.yml   PostgreSQL, Redis, MailHog, backend, worker, frontend
```

## Quick Start (Local Development)

### Prerequisites

- Node.js 20+
- pnpm 9+ (or use `npx pnpm`)
- Docker & Docker Compose (for PostgreSQL, Redis, MailHog)

### 1. Start infrastructure

```bash
docker compose up -d postgres redis mailhog
```

### 2. Install dependencies

```bash
cp .env.example .env
npx pnpm install
```

### 3. Database setup

```bash
npx pnpm db:migrate
npx pnpm db:seed
```

### 4. Start development servers

```bash
# Terminal 1 — API
npx pnpm dev:backend

# Terminal 2 — Background worker
npx pnpm dev:worker

# Terminal 3 — Frontend
npx pnpm dev:frontend
```

Or run all at once:

```bash
npx pnpm dev
```

### 5. Access the application

| Surface | URL | Credentials |
|---------|-----|-------------|
| Home | http://localhost:3000 | — |
| Support Portal | http://localhost:3000/portal/login | agent@ticketsystem.local / password123 |
| Management Portal | http://localhost:3000/manage/login | admin@ticketsystem.local / password123 |
| API Docs (Swagger) | http://localhost:3001/api/docs | — |
| MailHog UI | http://localhost:8025 | — |

### Troubleshooting: ticket creation fails after seed

If creating tickets returns a 500 error immediately after seeding, reset the ticket number sequence:

```bash
cd backend && npx prisma db execute --stdin <<'SQL'
SELECT setval('"Ticket_number_seq"', (SELECT COALESCE(MAX(number), 1) FROM "Ticket"), true);
SQL
```

This is fixed automatically in newer seeds; the command above repairs existing databases.

## Docker Compose (Full Stack)

```bash
cp .env.example .env
docker compose up --build
```

## Environment Variables

See [`.env.example`](.env.example) for all configuration options.

Key variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://ticketsystem:ticketsystem@localhost:5432/ticketsystem` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `SESSION_SECRET` | Session cookie signing secret | (change in production) |
| `EMAIL_CONNECTOR` | `mock`, `imap`, or `graph` | `mock` |
| `TEAMS_CONNECTOR` | `mock` or `graph` | `mock` |
| `SSO_ENABLED` | Enable Microsoft Entra ID SSO | `false` |
| `AZURE_AD_*` | Entra ID app registration credentials | see `.env.example` |
| `SMTP_HOST` / `SMTP_PORT` | Outbound email (MailHog in dev) | `localhost:1025` |

## Commands

```bash
npx pnpm build              # Build all packages
npx pnpm test               # Run backend + frontend tests
npx pnpm db:migrate         # Run Prisma migrations
npx pnpm db:seed            # Seed example data
npx pnpm db:studio          # Open Prisma Studio
npx pnpm lint               # Lint all packages
```

### Backend tests

```bash
cd backend
npx pnpm test               # Unit tests
npx pnpm test:e2e           # Integration tests (requires DB)
```

### Frontend tests

```bash
cd frontend
npx pnpm test:unit          # Vitest unit tests
npx pnpm test               # Playwright smoke tests
```

## API Documentation

REST API is documented via Swagger at `/api/docs` when the backend is running.

Key endpoint groups:

- `POST /api/auth/login` — authenticate
- `GET /api/tickets` — list/filter tickets
- `POST /api/tickets` — create ticket
- `POST /api/tickets/:id/hold` — put on hold
- `POST /api/tickets/:id/messages` — add reply/note
- `GET /api/public/tickets/:token` — public status page
- `GET /api/manage/*` — management portal (admin only)
- `POST /api/integrations/email/webhook` — inbound email
- `POST /api/integrations/teams/webhook` — inbound Teams message

## Connector Runbook

### Email (Development)

Uses Mock connector with MailHog. Outbound emails appear at http://localhost:8025.

Test inbound email via webhook:

```bash
curl -X POST http://localhost:3001/api/integrations/email/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "messageId": "<test-123@local>",
    "from": "user@example.com",
    "to": ["support@ticketsystem.local"],
    "cc": [],
    "references": [],
    "subject": "Help with VPN",
    "bodyText": "VPN is not connecting"
  }'
```

Reply matching uses `In-Reply-To`, `References` headers, or `[#TICKET-N]` in subject.

### Email (Production)

Set `EMAIL_CONNECTOR=imap` and configure IMAP/SMTP credentials. Microsoft Graph connector is available as a skeleton in `backend/src/integrations/email/`.

### Microsoft Teams

Set `TEAMS_CONNECTOR=mock` for development. Post to webhook:

```bash
curl -X POST http://localhost:3001/api/integrations/teams/webhook \
  -H "Content-Type: application/json" \
  -d '{"body": "Need firewall rule change", "fromUserId": "user1"}'
```

Graph/Bot Framework integration skeleton is in `backend/src/integrations/teams/`.

## Background Jobs

The worker process (`pnpm dev:worker`) runs:

| Job | Schedule | Purpose |
|-----|----------|---------|
| `sla.evaluate` | Every minute | Priority escalation, SLA breach detection |
| `hold.release` | Every minute | Auto-release expired holds |
| `recurring.scan` | Every 5 minutes | Generate recurring tickets |
| `email.poll` | Every 5 minutes | Poll IMAP inbox (non-mock) |

## Seed Data

The seed script creates:

- Users: admin, agent, requester (password: `password123`)
- Teams: Hotline (default), Security, Infrastructure, Network, Application
- Statuses, priorities, SLA rules
- Sample tickets including on-hold and overdue
- VM Migration project with template
- Recurring tasks (certificate renewal, backup verification)
- Integration settings, notification templates, KB article

## Security Notes

- All RBAC checks enforced server-side via `PermissionsGuard`
- CSRF protection on state-changing endpoints
- Magic links are HMAC-signed and rate-limited
- Attachments served via signed URLs with expiry
- Passwords hashed with bcrypt (cost 12)
- Management portal requires `super_admin` or `system_admin` role

## Assumptions

- Single-tenant deployment (one organization per instance)
- Attachments stored on local disk (S3 driver interface stubbed)
- SSO/OIDC ready architecture but no IdP wired up
- Microsoft Graph/Teams is skeleton only for first cut
- Business hours/holiday SLA calculation uses configurable tables (stub UI)

## License

Private — internal use.
