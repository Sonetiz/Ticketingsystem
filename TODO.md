# Production Readiness TODOs

Generated from the support-portal audit and the full production-readiness audit.
Severity: **C** = production blocker, **H** = high, **M** = medium, **L** = low.

Status updated after the Production hardening + ITSM expansion pass on 2026-05-24.
Items marked complete have code, migrations, and/or UI in the current tree. Items left open either were not in the implemented batch or still need production-level follow-up.

---

## Critical (blockers — fix before any production deploy)

### Security & auth
- [x] **(C)** Fix IDOR in `RbacService.canAccessTicket`: require assignee / requester / watcher / team match, or `ticket.read.all` permission. Single-ticket detail currently bypasses the list-view scoping.
- [ ] **(C)** Authenticate `POST /integrations/email/webhook` and `POST /integrations/teams/webhook` with HMAC signature or shared secret; reject unsigned requests.
- [ ] **(C)** Verify Microsoft `id_token` cryptographically (JWKS, issuer, audience) in `AuthService.decodeIdToken` instead of base64-decoding the payload.
- [ ] **(C)** Apply `ThrottlerGuard` with a strict policy to `POST /auth/login`. Add per-email / per-IP failed-attempt counter and account lockout.
- [ ] **(C)** Replace dev secret fallbacks (`'dev-magic-secret'`, `'dev-attachment-secret'`) with startup validation that refuses to boot if `MAGIC_LINK_SECRET` or `ATTACHMENT_SIGNING_SECRET` is missing in production.
- [ ] **(C)** Refuse to run the seed (or skip the default `password123` accounts) when `NODE_ENV=production`.
- [ ] **(C)** Remove default-credential pre-fill from `frontend/src/app/portal/login/page.tsx`.
- [x] **(C)** Add frontend route guard that redirects unauthenticated users from `/portal/*` and `/manage/*` to login.

### Operational
- [x] **(C)** Add `/health`, `/ready`, `/live` endpoints via `@nestjs/terminus` with DB + Redis checks; expose `/metrics` for Prometheus.
- [x] **(C)** Fix worker container command: `docker-compose.yml` runs `node dist/main.js worker`; correct entry is `node dist/worker.js`.
- [x] **(C)** Add CI pipeline (GitHub Actions or equivalent): install → lint → typecheck → test → build, required on every PR.
- [ ] **(C)** Document and script a Postgres backup strategy (`pg_dump` / PITR); back up the uploads volume; document restore procedure.
- [ ] **(C)** Add TLS / reverse-proxy config (Traefik, nginx, or Caddy). Set `app.set('trust proxy', 1)` so rate limits and secure cookies behave behind a load balancer.
- [x] **(C)** Add global `onError` handling on all `useQuery` calls and `onError` on all mutations. Failed loads currently show "Loading…" forever; failed mutations are silent.

### Email integration
- [ ] **(C)** Implement IMAP inbound (`ImapEmailConnector.fetchInbound`) using the already-installed `mailparser`. Currently returns `[]`.
- [ ] **(C)** Implement Microsoft Graph email send/receive in `GraphEmailConnector` (currently a stub that logs "not implemented").

### Attachments
- [ ] **(C)** Integrate a virus scanner (ClamAV or hosted) and run it before marking `scanStatus = 'clean'`. Currently hardcoded clean on every upload.

### Frontend wiring
- [x] **(C)** Dashboard "SLA Breached" card links to `/portal/tickets?slaBreached=true`, but the list view ignores the param. Either wire the filter or change the link.

---

## High priority

### Auth & accounts
- [x] **(H)** Implement password reset flow (request, secure token, email, reset page).
- [x] **(H)** Add "change my password" UI and endpoint.
- [ ] **(H)** Add MFA enrollment + challenge (TOTP at minimum).
- [x] **(H)** Wire `CombinedAuthGuard` / `ApiTokenAuthGuard` onto the API; honour per-token `permissions` (currently ignored — tokens get the user's full role permissions).
- [ ] **(H)** Per-API-token rate limiting.
- [ ] **(H)** Move CSRF token out of `localStorage` (XSS-exfiltratable). Use an in-memory store hydrated from a one-shot endpoint, or a separate httpOnly cookie.
- [ ] **(H)** Disable Swagger in production (or gate behind admin auth). Currently always exposed at `/api/docs`.

### ITSM workflow features
- [x] **(H)** Wire `NotificationsService.notifyTicketAssignee` into `TicketsService.assign`. Add hooks for status change, comment, mention, SLA breach.
- [x] **(H)** Have notifications render from the seeded `NotificationTemplate` rows instead of hardcoded strings.
- [x] **(H)** Make the SLA engine read `SlaRule` rows from the DB instead of using the hardcoded priority→hours map in `calculateSlaTarget`.
- [x] **(H)** Honour `BusinessHours` and `Holiday` models in SLA calculations.
- [x] **(H)** Pause the SLA clock while a ticket is on hold (exclude on-hold tickets from breach evaluation or extend `dueAt`).
- [x] **(H)** Send notification on SLA breach; set `SlaBreachEvent.notified = true`.
- [ ] **(H)** Implement BullMQ processors for the seven registered queues, or delete the queues. Currently dead infrastructure.
- [ ] **(H)** Add retry policy + dead-letter queue for failed notifications and jobs. _Partial: retry/backoff is configured; verify/finish DLQ handling before closing._
- [ ] **(H)** Add distributed lock (Redis) before running cron jobs so multiple worker replicas don't double-fire.

### Email
- [ ] **(H)** Wire `MessagesController.sendEmail` to `EmailDispatchService.sendOutbound`. Currently only logs.
- [x] **(H)** Sanitise HTML on inbound and outbound email bodies before storage/display.
- [ ] **(H)** Extract and persist inbound email attachments (the connector interface includes them; dispatch ignores them).
- [ ] **(H)** Handle bounces / NDRs / complaints; document SPF / DKIM / DMARC requirements.

### Teams
- [ ] **(H)** Read the Teams connector type from config/DB instead of hardcoding the mock in `TeamsDispatchService` constructor.
- [ ] **(H)** Implement `GraphTeamsConnector` for real channel messaging.

### Attachments
- [x] **(H)** Enforce file size limit and MIME / extension allow-list on `FileInterceptor('file')` for both authenticated and magic-link upload paths.
- [ ] **(H)** Add S3 / Azure Blob storage driver (local disk breaks multi-replica deploys).

### Data & retention
- [ ] **(H)** Make audit log immutable (DB trigger or table-level revoke) so updates/deletes are denied.
- [ ] **(H)** Implement GDPR data-subject erasure flow (anonymise user; export user data).
- [ ] **(H)** Define and enforce retention policies for tickets, audit logs, sessions, magic links, notifications, attachments.

### Search & validation
- [x] **(H)** Add Postgres full-text search (tsvector + GIN index) on ticket title / description / messages, or stand up an external search engine.
- [x] **(H)** Add XSS input sanitisation on ticket descriptions, messages, and KB content.

### Observability
- [x] **(H)** Wire Sentry (or equivalent APM) for backend errors.
- [x] **(H)** Configure pino `genReqId` so every log line and audit entry has a correlation ID.
- [ ] **(H)** Add monitoring/alerting for BullMQ queue depth, worker heartbeat, DB connectivity.

### Containers & deploy
- [ ] **(H)** Add `prisma migrate deploy` as an entrypoint / init step in the backend container. Document rollback story.
- [ ] **(H)** Add `HEALTHCHECK` directives in backend, worker, and frontend Dockerfiles; set `depends_on: condition: service_healthy` in compose.
- [ ] **(H)** Run containers as non-root user.
- [x] **(H)** Add `.dockerignore` (currently missing — likely copies `node_modules`, `.next`, `uploads` into image context).
- [ ] **(H)** Provide a separate production compose / overlay without MailHog, with secrets via Docker/K8s secrets, with no public Postgres/Redis ports, and with shared storage for uploads.
- [ ] **(H)** Replace `pnpm install --frozen-lockfile || pnpm install` fallback in Dockerfiles — fail the build on lockfile drift.

### Testing
- [ ] **(H)** Expand backend unit-test coverage (currently 3 spec files): auth, tickets, attachments, integrations, RBAC.
- [ ] **(H)** Add critical-path E2E tests (login, create ticket, RBAC enforcement, hold/resolve).
- [ ] **(H)** Add load/performance baseline (k6 or Artillery) before exposing to production traffic.

### Frontend — ticket detail
- [x] **(H)** Add "Assign to me" one-click button on ticket detail (`POST /tickets/:id/assign`).
- [x] **(H)** Add assignee picker and team picker (currently display-only).
- [x] **(H)** Add priority picker, due-date picker, edit title/description on ticket detail.
- [x] **(H)** Add watchers panel (add/remove); backend endpoint already exists.
- [x] **(H)** Add merge / split / link UI; backend endpoints already exist.
- [x] **(H)** Add attachment upload + list on ticket detail.
- [x] **(H)** Show related / linked tickets (`linksFrom` / `linksTo` returned by `findOne` are not displayed).
- [x] **(H)** Add error / empty / loading states and toast feedback on every page (replace `alert(...)`).
- [x] **(H)** Real-time updates for the active ticket — at minimum a `refetchInterval`; ideally SSE or WebSocket so agents don't stomp on each other.

### Frontend — tickets list
- [x] **(H)** Add search box wired to `?q=`.
- [x] **(H)** Add filter bar for `status`, `priority`, `assigneeId`, `assignedTeamId`, `slaBreached`, `overdue`.
- [x] **(H)** Add pagination controls using `PaginatedResult.total / page / totalPages` (currently hardcoded `limit=50`).
- [x] **(H)** Add row selection + bulk reassign, bulk status change, bulk close.

### Frontend — missing pages
- [x] **(H)** Add `/portal/notifications` page; show unread badge in sidebar.
- [x] **(H)** Add `/portal/knowledge-base` page (backend API already exists).
- [x] **(H)** Add `/portal/assets` page (backend API already exists).
- [x] **(H)** Add `/portal/profile` page (`getMe` already implemented in `lib/api.ts`, never called).
- [x] **(H)** Add global search header that hits `/tickets?q=`.

### Frontend — accessibility & responsiveness
- [x] **(H)** Make sidebar collapsible / drawer on mobile (currently fixed `w-64`).
- [x] **(H)** Wrap tables in `overflow-x-auto` containers.
- [x] **(H)** Add proper modal dialog semantics: `role="dialog"`, `aria-modal`, labelled title, focus trap, Escape to close, focus return on close, `aria-label` on the `×` button.

---

## Medium priority

### ITSM modules (schema scaffolding exists, no API/UI)
- [x] **(M)** Approvals workflow: API + `/portal/approvals` queue + email approve/reject links.
- [x] **(M)** Service catalog browse and "request this service" intake flow.
- [x] **(M)** Incident parent/child UI (use existing `parentTicketId`).
- [x] **(M)** Saved views: API + UI on the tickets list (model exists).
- [x] **(M)** CSAT post-resolve survey + score reporting (`CsatSurvey` model exists).
- [x] **(M)** Self-service requester portal (today only the magic-link status page).
- [ ] **(M)** Custom fields editor in the management portal. _Partial: schema/custom field APIs exist; no `/manage/custom-fields` UI is present yet._
- [x] **(M)** Time tracking / worklog API and UI on ticket detail.
- [x] **(M)** Change management module (change record, CAB approval, change calendar, freeze windows).
- [x] **(M)** Problem management module (problem record, root cause, known-error DB).

### Backend hardening
- [ ] **(M)** Replace inline body types in `management.controller.ts` with validated DTOs.
- [ ] **(M)** Add machine-readable error `code` field across responses.
- [ ] **(M)** Version the API (`/api/v1`).
- [ ] **(M)** Add granular `RequirePermission('manage.*')` checks on the management controller instead of only `ManagePortalGuard`.
- [ ] **(M)** Filter non-public messages in ticket detail responses for requester-scoped access (only the magic-link path filters today).
- [ ] **(M)** Scope dashboard counts to the calling user's visibility (currently counts all tickets globally).
- [ ] **(M)** Paginate `GET /manage/users` (currently returns all).
- [ ] **(M)** Standardise soft-delete: either add `deletedAt` everywhere or document hard-delete exceptions; add soft-delete endpoint for tickets.
- [ ] **(M)** Validate exactly one default team exists (currently hardcoded `isDefault: true` lookup).
- [x] **(M)** Track response-time SLA separately from resolution SLA.
- [ ] **(M)** Audit `createUser`, local login success/failure, settings changes; redact passwords/tokens/email bodies from audit payloads.
- [ ] **(M)** Add CSV / JSON export on audit logs with date filters.
- [ ] **(M)** Make MagicLinks one-time-use (set / check `usedAt`).
- [ ] **(M)** Rotate session and CSRF token when a user's roles change.
- [x] **(M)** Enforce password complexity on user create / password change.
- [ ] **(M)** Add notification preferences (per channel, mute, DND, digest).
- [ ] **(M)** Cache statuses / priorities / teams in Redis to cut DB load on lookups.
- [ ] **(M)** Batch updates in the SLA evaluation loop instead of per-ticket sequential queries. _Still open: SLA evaluation remains mostly per-ticket._
- [ ] **(M)** Add web push channel (optional) and digest emails (scheduled job).

### Frontend ergonomics
- [x] **(M)** Add a toast notification system (e.g. `sonner`); replace `alert('Magic link copied to clipboard')`.
- [x] **(M)** Persist dark-mode preference (localStorage or user profile); respect `prefers-color-scheme` on first load.
- [x] **(M)** Add dark-mode-safe colour pairs in `lib/utils.ts` for `statusColors` / `priorityColors`.
- [x] **(M)** Add skeleton loaders instead of plain "Loading…" text.
- [x] **(M)** Add tags / labels editor on ticket detail.
- [x] **(M)** Add canned-response inserter in the reply composer (`GET /extras/canned-responses` exists).
- [x] **(M)** Add ticket template picker on `/portal/tickets/new` (`GET /extras/ticket-templates` exists).
- [x] **(M)** Add category / service / impact / urgency fields on the create-ticket form.
- [x] **(M)** Add project CRUD on `/portal/projects` (currently read-only); add project detail + ticket list.
- [x] **(M)** Reports: date-range picker, CSV export, charts, drill-down links; add loading + error states.
- [x] **(M)** Recurring tasks: delete, duplicate, run-now buttons; mutation error feedback.
- [x] **(M)** "Sign out everywhere" action (global session revocation).
- [x] **(M)** Configure React Query `staleTime` / `gcTime` per query type; tune retry behaviour.
- [ ] **(M)** Convert pure-display portal pages to server components where viable. _Still open: most portal pages remain client components due React Query/interactivity._

### i18n & timezones
- [ ] **(M)** Externalise UI strings (e.g. `next-intl`).
- [ ] **(M)** Locale-aware `formatDate` (currently hardcoded `en-US`).
- [ ] **(M)** Use the `BusinessHours.timezone` field when displaying and calculating SLA dates.

### Infra & docs
- [x] **(M)** Add `LOG_LEVEL` env var; use plain Logger pino config in the worker (not `pinoHttp`).
- [x] **(M)** Tighten Helmet CSP for API responses; ensure no conflict with Swagger UI when enabled.
- [x] **(M)** Pre-commit hooks (husky) and Renovate / Dependabot for dependency updates.
- [x] **(M)** License scanning (FOSSA / SBOM / `license-checker`) in CI.
- [x] **(M)** Add a `LICENSE` file (README currently says "Private — internal use" with no notice).
- [x] **(M)** Expand README into a production deployment guide with architecture diagram, runbook, rollback, restore, secret rotation.
- [x] **(M)** Adopt semver tagging + `CHANGELOG.md` + release notes (currently static `1.0.0` everywhere).
- [x] **(M)** Set minimum coverage thresholds in CI; provide a test DB service for E2E.
- [x] **(M)** Pass `NEXT_PUBLIC_API_URL` at frontend image build time, or switch to a runtime proxy configuration.
- [x] **(M)** Define upload lifecycle / retention / cleanup job for closed and deleted tickets.

---

## Low priority

- [ ] **(L)** Tighten cookie `sameSite` to `'strict'` for the management portal.
- [ ] **(L)** Add CSRF protection on `POST /auth/logout` (cookie-authenticated).
- [ ] **(L)** Optional message-read auditing for sensitive tickets.
- [ ] **(L)** Add composite DB indexes for common ticket filter combinations.
- [ ] **(L)** Consider Redis-backed session store at scale (currently Postgres `Session` table — fine for now).
- [ ] **(L)** Remove unused dependencies: `connect-redis`, `express-session` in `backend/package.json`.
- [ ] **(L)** Skip link + visible focus rings in the portal sidebar for keyboard navigation.
- [ ] **(L)** Larger touch targets (44px minimum) on small action buttons ("Edit", "Pause").
- [ ] **(L)** Code-split heavy components (reports page, recurring modal) via `dynamic()`.
- [ ] **(L)** Typing indicators / presence on shared ticket detail (optional collaboration nicety).
- [ ] **(L)** Sync Swagger API version string with package version on release.
- [ ] **(L)** Document magic-link reusability behaviour explicitly if intentional.
- [ ] **(L)** Format check (`prettier --check`) in CI.
- [ ] **(L)** Bind attachment signature to user/session for private attachments.

---

## Quick wins (under ~1 hour each)

These are independent items you could cherry-pick to make immediate visible progress:

- [ ] Remove default credentials from `portal/login/page.tsx`.
- [ ] Disable Swagger when `NODE_ENV=production`.
- [ ] Add `@Throttle` on `POST /auth/login`.
- [x] Fix the worker container command in `docker-compose.yml`.
- [x] Fix the SLA Breached dashboard link / list filter wiring.
- [x] Add `.dockerignore`.
- [x] Add "Assign to me" button on the ticket detail page.
- [x] Wrap the tickets table in `overflow-x-auto`.
- [x] Persist dark-mode preference in localStorage.
- [x] Add a toast system and replace the `alert(...)` call.
- [ ] Run seed only when `NODE_ENV !== 'production'`.
