# Prioritized Next TODOs

Derived from `TODO.md` and the ITSM feature gap analysis canvas.

This list is intentionally reordered by delivery risk:

1. Security and production trust-boundary fixes.
2. Production operations and reliability fixes.
3. Functionality gaps versus comparable IT ticketing and ITSM systems.

Severity:

- **P0**: Blocks any production deployment.
- **P1**: High-risk or high-value gap; schedule next.
- **P2**: Important maturity work after P0/P1 are under control.
- **P3**: Polish, scale, or optional enhancement.

---

## 1. Security Fixes

### P0 - Production Blockers

- [ ] **(P0)** Authenticate `POST /api/integrations/email/webhook` and `POST /api/integrations/teams/webhook` with HMAC signatures or shared secrets; reject unsigned and replayed requests.
- [ ] **(P0)** Replace Microsoft `id_token` payload decoding with full OIDC validation: JWKS signature verification, issuer, audience, expiry, nonce/state handling.
- [ ] **(P0)** Add strict login throttling to `POST /api/auth/login`, including per-IP and per-email failed-attempt counters plus temporary account lockout.
- [ ] **(P0)** Refuse production startup when `MAGIC_LINK_SECRET`, `ATTACHMENT_SIGNING_SECRET`, `SESSION_SECRET`, or other required signing secrets are missing or set to dev defaults.
- [ ] **(P0)** Prevent production seeding of default users and `password123`; make seed no-op or fail when `NODE_ENV=production`.
- [ ] **(P0)** Remove default-credential prefill from portal and management login screens.
- [ ] **(P0)** Add malware scanning for uploads before marking attachments as clean; support ClamAV or a hosted scanner.
- [ ] **(P0)** Add a tested backup and restore path for PostgreSQL and uploads, including scripted `pg_dump`/restore and restore validation.
- [ ] **(P0)** Add TLS/reverse-proxy configuration and set Express `trust proxy` correctly so secure cookies, IP logging, and throttling work behind a proxy.

### P1 - Auth, Session, and API Hardening

- [ ] **(P1)** Move CSRF token storage away from `localStorage`; use an in-memory token hydrated by a one-shot endpoint or a safer cookie/token pattern.
- [ ] **(P1)** Add per-API-token rate limiting and abuse tracking.
- [ ] **(P1)** Disable Swagger in production or gate `/api/docs` behind admin authentication.
- [ ] **(P1)** Add MFA enrollment and challenge flow, starting with TOTP.
- [ ] **(P1)** Make magic links one-time-use by setting and checking `usedAt`.
- [ ] **(P1)** Bind private attachment signatures to user/session or permission context.
- [ ] **(P1)** Filter non-public ticket messages for requester-scoped ticket detail access, not only magic-link access.
- [ ] **(P1)** Add granular `RequirePermission('manage.*')` checks inside management controllers instead of relying only on broad management access.
- [ ] **(P1)** Rotate session and CSRF tokens when a user's roles or permissions change.
- [ ] **(P1)** Make audit logs immutable through a DB trigger, table-level permissions, or append-only audit design.

### P2 - Compliance and Data Governance

- [ ] **(P2)** Implement GDPR-style data subject export and erasure/anonymisation.
- [ ] **(P2)** Define and enforce retention policies for tickets, audit logs, sessions, magic links, notifications, and attachments.
- [ ] **(P2)** Audit user creation, local login success/failure, settings changes, token lifecycle events, and permission changes.
- [ ] **(P2)** Redact passwords, tokens, email bodies, and other secrets from audit payloads.
- [ ] **(P2)** Add CSV/JSON audit export with date, actor, entity, and action filters.
- [ ] **(P2)** Add message-read auditing for sensitive tickets.
- [ ] **(P2)** Tighten cookie `sameSite` to `strict` for management portal flows where compatible.
- [ ] **(P2)** Add CSRF protection to `POST /api/auth/logout`.

---

## 2. Production Operations and Reliability

### P0 - Deployment Baseline

- [ ] **(P0)** Add a production Compose override or equivalent deployment overlay without MailHog, without public Postgres/Redis ports, and with externally supplied secrets.
- [ ] **(P0)** Add `prisma migrate deploy` as a release/init step for container deployments.
- [ ] **(P0)** Add Docker `HEALTHCHECK` directives for backend, worker, and frontend.
- [ ] **(P0)** Run backend, worker, and frontend containers as non-root users.
- [ ] **(P0)** Replace `pnpm install --frozen-lockfile || pnpm install` in Dockerfiles with a hard failure on lockfile drift.

### P1 - Worker and Queue Reliability

- [ ] **(P1)** Implement the registered BullMQ processors or remove unused queues.
- [ ] **(P1)** Finish retry and dead-letter queue handling for failed notifications, email dispatch, recurring jobs, and SLA jobs.
- [ ] **(P1)** Add Redis distributed locks around cron-style workers so multiple worker replicas do not double-run scheduled work.
- [ ] **(P1)** Add monitoring and alerting for queue depth, worker heartbeat, failed jobs, DB connectivity, and Redis connectivity.
- [ ] **(P1)** Batch SLA evaluation updates instead of processing tickets mostly sequentially.

### P2 - Storage and Scale

- [ ] **(P2)** Add S3 or Azure Blob storage driver for uploads so multi-replica deployments do not depend on local disk.
- [ ] **(P2)** Add Redis caching for statuses, priorities, teams, and other hot lookup data.
- [ ] **(P2)** Add composite DB indexes for common ticket filter combinations.
- [ ] **(P2)** Paginate `GET /api/manage/users`.
- [ ] **(P2)** Standardise soft-delete behavior across major models and add a soft-delete endpoint for tickets.
- [ ] **(P2)** Remove unused dependencies such as `connect-redis` and `express-session` if they remain unused.

### P2 - Test and Release Confidence

- [ ] **(P2)** Expand backend unit coverage for auth, tickets, attachments, integrations, RBAC, SLA, and search.
- [ ] **(P2)** Add critical-path E2E tests: login, create ticket, assign ticket, RBAC enforcement, hold/unhold, resolve/close, attachment upload, KB create, asset edit.
- [ ] **(P2)** Add load/performance baseline with k6 or Artillery before production traffic.
- [ ] **(P2)** Add `prettier --check` to CI.
- [ ] **(P2)** Sync Swagger API version with package/release version.

---

## 3. Functionality Gaps

### P1 - Real Communication Channels

- [ ] **(P1)** Implement production IMAP inbound email using `mailparser`; persist incoming messages as ticket messages.
- [ ] **(P1)** Implement Microsoft Graph email send/receive.
- [ ] **(P1)** Wire `MessagesController.sendEmail` to `EmailDispatchService.sendOutbound`.
- [ ] **(P1)** Extract and persist inbound email attachments.
- [ ] **(P1)** Handle bounces, NDRs, and complaints; document SPF, DKIM, and DMARC requirements.
- [ ] **(P1)** Read Teams connector type from config/DB instead of hardcoding the mock connector.
- [ ] **(P1)** Implement real Microsoft Teams Graph/Bot Framework messaging.
- [ ] **(P2)** Add Slack or generic chat intake as an optional channel.
- [ ] **(P2)** Add conversation continuity across portal, email, Teams, and requester views.

### P1 - CMDB and Asset Management Depth

- [ ] **(P1)** Link assets/configuration items to tickets, problems, and changes.
- [ ] **(P1)** Add asset ownership, assignee, location, status, warranty, purchase, lifecycle, and retirement fields.
- [ ] **(P1)** Add asset relationship model for dependencies between services, hardware, software, and infrastructure.
- [ ] **(P1)** Show asset context directly in ticket detail, change detail, and problem detail.
- [ ] **(P1)** Add asset import from CSV.
- [ ] **(P2)** Add inventory discovery/import integrations for Intune, Jamf, Azure, AWS, or network scanners.
- [ ] **(P2)** Add software/license tracking and software-to-device relationships.
- [ ] **(P2)** Add impact analysis for changes and incidents based on linked assets/services.
- [ ] **(P2)** Add asset audit trail and lifecycle history.

### P1 - Workflow Automation Engine

- [ ] **(P1)** Add admin-configurable automation rules with conditions and actions.
- [ ] **(P1)** Support trigger events: ticket created, message added, status changed, SLA approaching, SLA breached, approval decided, asset linked.
- [ ] **(P1)** Support scheduled rules for aging queues, stale tickets, review reminders, and escalation warnings.
- [ ] **(P1)** Add actions: assign, set team, set priority, set status, add tag, send notification, create approval, call webhook.
- [ ] **(P1)** Add macros for common agent actions and canned multi-step updates.
- [ ] **(P2)** Add low-risk change auto-approval rules.
- [ ] **(P2)** Add rule execution history and dry-run testing.

### P1 - Major Incident and On-Call Operations

- [ ] **(P1)** Add major incident flag/workspace with incident commander, severity, affected services, timeline, and stakeholder updates.
- [ ] **(P1)** Add on-call schedules, escalation policies, and responder assignment.
- [ ] **(P1)** Add post-incident review workflow with action items, owners, due dates, and linked problems/changes.
- [ ] **(P2)** Add broadcast status updates to requesters and stakeholders.
- [ ] **(P2)** Add incident templates and runbooks.

### P1 - Knowledge Base and Self-Service Maturity

- [ ] **(P1)** Add public help center routes for searchable public KB articles.
- [ ] **(P1)** Add rich text editor with image and attachment support for KB articles.
- [ ] **(P1)** Add KB article edit/update UI, not just create/list.
- [ ] **(P1)** Add article lifecycle states: draft, internal, public, archived.
- [ ] **(P1)** Add article version history and rollback.
- [ ] **(P1)** Add review/approval workflow for publishing articles.
- [ ] **(P2)** Add scheduled publish/unpublish and review interval reminders.
- [ ] **(P2)** Add multilingual articles and locale-aware public help center.
- [ ] **(P2)** Suggest relevant KB articles during ticket creation and reply composition.
- [ ] **(P2)** Track article usefulness, deflection, and stale-content signals.

### P1 - Custom Fields and Request Forms

- [ ] **(P1)** Add management UI for custom fields.
- [ ] **(P1)** Allow custom fields on ticket create/edit forms by category, service, or request type.
- [ ] **(P1)** Add custom field validation, required flags, select options, internal-only fields, and requester-visible fields.
- [ ] **(P1)** Include custom fields in ticket search, filters, saved views, exports, and automation rules.
- [ ] **(P2)** Add dynamic service catalog forms with conditional fields.

### P2 - Reporting and Analytics

- [ ] **(P2)** Add SLA trend dashboards: breach rate, near-breach tickets, response/resolution performance by team and priority.
- [ ] **(P2)** Add queue aging dashboards and backlog trends.
- [ ] **(P2)** Add MTTA, MTTR, reopen rate, first-contact resolution, and assignment churn metrics.
- [ ] **(P2)** Add CSAT trends by category, team, agent, and service.
- [ ] **(P2)** Add agent utilization and worklog-based capacity reporting.
- [ ] **(P2)** Add scheduled reports by email.
- [ ] **(P3)** Add custom dashboard builder.

### P2 - Search Maturity

- [ ] **(P2)** Index attachments for full-text search where file type allows.
- [ ] **(P2)** Improve ranking across tickets, messages, KB, assets, users, changes, and problems.
- [ ] **(P2)** Add semantic search or synonym support for KB and ticket deflection.
- [ ] **(P2)** Add advanced search syntax and saved advanced searches.
- [ ] **(P3)** Add typo tolerance and highlighting in search results.

### P2 - Change and Problem Management Depth

- [ ] **(P2)** Link changes and problems to affected assets/services.
- [ ] **(P2)** Add change risk scoring from impacted services, CI relationships, schedule, and change type.
- [ ] **(P2)** Add CAB calendar polish: conflict detection, freeze-window warnings, approval status, implementation window.
- [ ] **(P2)** Add problem RCA templates, workaround lifecycle, known-error publishing, and linked incident grouping.
- [ ] **(P2)** Add change/problem templates and required-field policies.

### P2 - Requester and Portal Experience

- [ ] **(P2)** Add requester ticket history and request tracking beyond magic-link status.
- [ ] **(P2)** Add portal notifications for requesters.
- [ ] **(P2)** Add requester-visible-only field/message filtering consistently.
- [ ] **(P2)** Add satisfaction follow-up loops beyond initial CSAT submission.
- [ ] **(P3)** Add larger touch targets and stronger mobile ergonomics for requester and portal workflows.

### P2 - AI and Assistive Features

- [ ] **(P2)** Add AI-assisted ticket categorisation, priority suggestion, and duplicate detection.
- [ ] **(P2)** Add agent summary generation for long tickets.
- [ ] **(P2)** Add draft reply suggestions grounded in KB and ticket history.
- [ ] **(P2)** Add KB draft generation from resolved tickets.
- [ ] **(P3)** Add virtual agent/chatbot for common self-service workflows.

### P2 - Notifications and Preferences

- [ ] **(P2)** Add notification preferences by channel, event type, quiet hours, and digest frequency.
- [ ] **(P2)** Add digest emails and optional web push notifications.
- [ ] **(P2)** Add mute/watch controls per ticket and saved view.

### P3 - Frontend and Internationalisation Polish

- [ ] **(P3)** Externalise UI strings with an i18n framework such as `next-intl`.
- [ ] **(P3)** Make `formatDate` locale-aware.
- [ ] **(P3)** Use `BusinessHours.timezone` consistently when displaying SLA dates and deadlines.
- [ ] **(P3)** Convert pure-display portal pages to server components where it reduces client-side complexity.
- [ ] **(P3)** Add visible skip links and stronger focus rings in portal navigation.
- [ ] **(P3)** Code-split heavy pages such as reports and recurring task modals.
- [ ] **(P3)** Add typing indicators or presence on shared ticket detail.

---

## Suggested Implementation Order

1. **Close P0 security and production trust-boundary tasks.**
2. **Harden the Docker/worker/backup deployment path.**
3. **Make email and Teams channels production-real.**
4. **Deepen CMDB/assets and link assets into tickets, changes, and problems.**
5. **Build the workflow automation engine.**
6. **Mature self-service, KB publishing, custom fields, and request forms.**
7. **Add major incident/on-call operations and reporting maturity.**
8. **Layer on AI assistance, semantic search, and broader omnichannel support.**
