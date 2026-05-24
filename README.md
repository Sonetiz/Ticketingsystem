# Ticketsystem

A modern ITSM ticketing system built with NestJS, Next.js, PostgreSQL, Redis, Prisma, BullMQ, and Docker Compose.

The project now includes the core support portal, management portal, requester-facing flows, several ITSM modules, operational health endpoints, and production-hardening groundwork. It is functional for local and demo use, but a few security, email, attachment scanning, and deployment items remain before a production rollout.

## Current Status

- Core ticketing, RBAC, support portal, management portal, requester portal, Docker Compose, database migrations, and seed data are implemented.
- Ticket search, dashboard queues, unassigned ticket queue, knowledge base creation, and asset create/edit flows are available in the UI.
- SLA calculations use database rules, business hours, holidays, response/resolution targets, on-hold pausing, breach events, and notifications.
- Realtime ticket-detail updates, notifications, approvals, service catalog requests, CSAT, worklogs, change management, problem management, saved views, and reports are present.
- Health, readiness, liveness, metrics, Sentry setup, correlation IDs, Dockerfiles, CI, dependency automation, and documentation are in place.
- Production blockers still remain around webhook authentication, Microsoft ID token verification, login throttling/lockout, production secret validation, backup automation, real IMAP/Graph connectors, and malware scanning.

## Features

- **Ticket lifecycle management**: create, assign, reassign, merge, split, link, tag, hold/unhold, bulk update, bulk close, and magic-link status access.
- **Queue views**: active, mine, team, unassigned, on-hold, overdue, SLA breached, recent, and all tickets with search, filters, pagination, and row selection.
- **Ticket detail workspace**: editable metadata, watchers, linked tickets, attachments, worklogs, canned responses, realtime refresh, assignment actions, and status updates.
- **RBAC and authentication**: server-side permissions, session auth, API-token auth, route guards, password reset, password change, SSO/LDAP scaffolding, and management-only admin areas.
- **Knowledge base**: searchable articles with UI creation, category, slug, public flag, and sanitised content.
- **Asset management**: asset list plus create/edit UI with type, identifier, and JSON metadata.
- **Service catalog**: browse catalog items and request services, creating linked tickets.
- **Approvals**: approval queues and approve/reject workflows, including email-link support.
- **SLA engine**: database-backed SLA rules, business hours, holidays, response and resolution targets, on-hold pausing, breach detection, and breach notifications.
- **Notifications**: template-backed in-app and email notification plumbing with unread count and notification page.
- **Reports and projects**: project CRUD/detail pages, ticket progress, report charts, date-range controls, CSV export, and drill-down links.
- **ITSM modules**: CSAT surveys, requester portal, worklogs, change records, freeze windows, problem records, known-error database, recurring tasks, and saved ticket views.
- **Search**: global search across tickets, knowledge base, assets, and users, backed by PostgreSQL full-text search with partial ticket matching fallback.
- **Integrations**: mock email and Teams adapters, webhook endpoints, inbound reply matching, and skeletons for IMAP, Microsoft Graph email, and Teams Graph/Bot Framework.
- **Operations**: Docker Compose stack, health/readiness/liveness endpoints, Prometheus metrics, Sentry setup, pino request correlation, upload retention cleanup, CI, Dependabot, Husky, license scanning, changelog, and release notes.

## Architecture

```
frontend/            Next.js 14 App Router
backend/             NestJS REST API, WebSocket gateway, BullMQ worker, Prisma
shared/              Shared TypeScript types and Zod schemas
docker-compose.yml   PostgreSQL, Redis, MailHog, backend, worker, frontend
```

```mermaid
flowchart TB
  subgraph clients [Clients]
    Portal[Support Portal]
    Manage[Management Portal]
    Public[Public Status / CSAT]
  end
  subgraph backend [Backend]
    API[NestJS API]
    Worker[BullMQ Worker]
    WS[WebSocket Gateway]
  end
  subgraph data [Data Layer]
    PG[(PostgreSQL)]
    Redis[(Redis)]
    Disk[Upload Storage]
  end
  Portal --> API
  Manage --> API
  Public --> API
  Portal --> WS
  API --> PG
  API --> Redis
  Worker --> PG
  Worker --> Redis
  API --> Disk
```

## Production Deployment

The deployment path is defined, but the application should not be treated as production-ready until the open blocker items in `TODO.md` are closed.

### Prerequisites

- Docker (or Kubernetes) with PostgreSQL 16+, Redis 7+
- TLS termination via reverse proxy (nginx, Traefik, or Caddy)
- Secrets manager or environment injection for `SESSION_SECRET`, `DATABASE_URL`, `REDIS_URL`

### Deploy steps

1. Copy `.env.example` to `.env` and set production secrets (never use dev defaults).
2. Run database migrations: `pnpm --filter backend db:migrate:deploy`
3. Build images: `docker compose -f docker-compose.yml build`
4. Start the stack without MailHog for production-like environments; use real SMTP/IMAP or Microsoft Graph connectors once implemented.
5. Verify health: `GET /health`, `GET /ready`, `GET /live`
6. Verify metrics: `GET /metrics` (Prometheus scrape target)

### Runbook

| Task | Command / endpoint |
|------|-------------------|
| Check API health | `curl /health` |
| Check readiness | `curl /ready` |
| View queue depth | Prometheus `queue_depth` metric |
| Manual SLA run | Worker cron runs every minute |
| Attachment cleanup | Worker cron daily at 03:00 UTC |

### Rollback

1. Deploy previous container image tag.
2. If a migration is incompatible, restore DB from backup taken before deploy.
3. Run `prisma migrate resolve` only when directed by migration docs.

### Backup & restore

- **Database**: `pg_dump -Fc $DATABASE_URL > backup.dump` (daily; retain 30 days minimum).
- **Uploads**: snapshot the `uploads` volume alongside DB backups.
- **Restore**: `pg_restore -d $DATABASE_URL backup.dump` then restore uploads volume.

### Secret rotation

- `SESSION_SECRET`: rotate during maintenance window; all users re-login.
- `ATTACHMENT_SIGNING_SECRET`: rotate invalidates existing download links.
- `MAGIC_LINK_SECRET`: rotate invalidates outstanding magic links.
- API tokens: revoke via management portal and re-issue.

## Local Development

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

For the full Docker stack:

```bash
cp .env.example .env
docker compose up --build
```

### 5. Access the application

| Surface | URL | Credentials |
|---------|-----|-------------|
| Home | http://localhost:3000 | — |
| Support Portal | http://localhost:3000/portal/login | agent@ticketsystem.local / password123 |
| Management Portal | http://localhost:3000/manage/login | admin@ticketsystem.local / password123 |
| API Docs (Swagger) | http://localhost:3001/api/docs | — |
| MailHog UI | http://localhost:8025 | — |

The frontend uses the Next.js `/api` proxy in Docker, with the backend reachable as `http://backend:3001/api` inside the Compose network.

### Troubleshooting: ticket creation fails after seed

If creating tickets returns a 500 error immediately after seeding, reset the ticket number sequence:

```bash
cd backend && npx prisma db execute --stdin <<'SQL'
SELECT setval('"Ticket_number_seq"', (SELECT COALESCE(MAX(number), 1) FROM "Ticket"), true);
SQL
```

This is fixed automatically in newer seeds; the command above repairs existing databases.

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
- `GET /api/search?q=` — global search (tickets, KB, assets, users)
- `GET/POST/PATCH/DELETE /api/knowledge-base` — knowledge base CRUD
- `GET/POST/PATCH/DELETE /api/assets` — asset CRUD
- `GET/POST /api/approvals` — approval workflow
- `GET /api/catalog` — service catalog browse
- `POST /api/catalog/:id/request` — request a catalog service (creates ticket)
- `GET/POST /api/saved-views` — saved ticket list views
- `GET/POST /api/csat/:token` — public CSAT survey
- `GET/POST /api/tickets/:id/worklog` — time tracking
- `GET/POST /api/changes` — change management
- `GET /api/problems/known-errors` — known error database
- `GET /health`, `/ready`, `/live`, `/metrics` — ops endpoints (no `/api` prefix)

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
| `attachmentsRetention` | Daily at 03:00 | Purge attachments on old closed tickets |

Some queue infrastructure still needs production follow-through: full BullMQ processors, dead-letter handling verification, distributed locks for multi-worker deployments, queue-depth monitoring, and worker-heartbeat alerting.

## Seed Data

The seed script creates:

- Users: admin, agent, requester (password: `password123`)
- Teams: Hotline (default), Security, Infrastructure, Network, Application
- Statuses, priorities, SLA rules
- Sample tickets including on-hold and overdue
- VM Migration project with template
- Recurring tasks (certificate renewal, backup verification)
- Integration settings, notification templates, KB article
- Service catalog, assets, approvals, CSAT, changes, problems, and other ITSM sample data where applicable

## Security Notes

- All RBAC checks enforced server-side via `PermissionsGuard`
- CSRF protection on state-changing endpoints
- Magic links are HMAC-signed and rate-limited
- Attachments served via signed URLs with expiry
- Passwords hashed with bcrypt (cost 12)
- Management portal requires `super_admin` or `system_admin` role

Known security work remaining before production:

- Authenticate inbound email and Teams webhooks with HMAC signatures or shared secrets.
- Verify Microsoft ID tokens using JWKS, issuer, and audience checks.
- Add strict login throttling, failed-attempt tracking, and account lockout.
- Refuse production startup when required signing secrets are missing.
- Disable seed default credentials in production and remove visible login defaults.
- Move CSRF storage away from `localStorage`.
- Disable or protect Swagger in production.
- Add malware scanning before attachments are marked clean.

## Assumptions

- Single-tenant deployment (one organization per instance)
- Attachments currently use local disk; S3/Azure Blob storage remains planned for multi-replica production
- SSO/OIDC and LDAP architecture exists, but production IdP hardening remains open
- Microsoft Graph email and Teams implementations are still skeletons
- Business hours and holidays are used by SLA calculation; management UI coverage is still incomplete

## Planned Next Steps

### Production Blockers

- Secure inbound webhooks for email and Teams.
- Replace Microsoft ID token base64 parsing with full JWKS verification.
- Add login throttling, failed-attempt counters, and account lockout.
- Enforce production secret validation and prevent production seeds with default credentials.
- Automate and document Postgres plus uploads backup/restore.
- Add reverse-proxy/TLS configuration and trust-proxy handling.
- Implement real IMAP inbound and Microsoft Graph email send/receive.
- Add attachment malware scanning.

### High-Priority Hardening

- Finish BullMQ processors, retry/dead-letter handling, worker locks, and queue monitoring.
- Wire outbound ticket email sending end-to-end and persist inbound email attachments.
- Implement real Teams Graph/Bot Framework messaging.
- Add S3 or Azure Blob storage for attachments.
- Make audit logs immutable and define retention/erasure policies.
- Add broader backend unit, integration, E2E, and performance tests.
- Add production Docker overlays, container healthchecks, non-root containers, and migration deploy entrypoints.

### Product Follow-Up

- Add the management UI for custom fields.
- Scope dashboard counts to the current user's visibility.
- Improve audit coverage for user creation, login success/failure, settings changes, and sensitive payload redaction.
- Add notification preferences, digest emails, optional web push, and DND/mute settings.
- Externalise UI strings and make date formatting locale/timezone aware.
- Convert display-heavy portal pages to server components where it reduces client-side complexity.

## License

Proprietary — internal use. See [LICENSE](LICENSE).
