# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Global search endpoint (`GET /api/search`) with RBAC-scoped results
- Knowledge base CRUD at `/api/knowledge-base`
- Assets CRUD at `/api/assets`
- Approvals workflow with email token-based decisions
- Service catalog with ticket request intake
- Saved views CRUD for ticket list filters
- CSAT surveys on ticket resolution with public token endpoints
- Worklog time tracking on tickets
- Change management (change requests, freeze windows, calendar)
- Problem management with known-errors list
- Postgres full-text search indexes on tickets, messages, and KB articles
- Attachment upload validation (size, MIME sniffing) and retention cron
- Sentry integration, Helmet CSP, health/metrics route prefix exclusion
- CI pipeline, Dependabot, Husky pre-commit hooks

### Changed
- Messages sanitize HTML on create and emit realtime + notification events
- BullMQ queues use exponential backoff retry policy
- Worker runs attachment retention purge daily

## [1.0.0] - 2025-05-22

### Added
- Initial ITSM ticketing system release
- Support portal, management portal, and public magic-link status page
- RBAC, SLA engine, recurring tasks, projects, reports
