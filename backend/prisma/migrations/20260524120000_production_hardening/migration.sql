-- Production hardening: full-text search vectors and indexes

ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "searchVector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(description,'')), 'B')
  ) STORED;

CREATE INDEX IF NOT EXISTS ticket_search_idx ON "Ticket" USING GIN ("searchVector");

ALTER TABLE "TicketMessage" ADD COLUMN IF NOT EXISTS "searchVector" tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(body,''))) STORED;

CREATE INDEX IF NOT EXISTS message_search_idx ON "TicketMessage" USING GIN ("searchVector");

ALTER TABLE "KnowledgeArticle" ADD COLUMN IF NOT EXISTS "searchVector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(content,'')), 'B')
  ) STORED;

CREATE INDEX IF NOT EXISTS kb_search_idx ON "KnowledgeArticle" USING GIN ("searchVector");

-- Composite indexes for common ticket filters
CREATE INDEX IF NOT EXISTS ticket_status_priority_idx ON "Ticket" ("status", "priority") WHERE "deletedAt" IS NULL;
CREATE INDEX IF NOT EXISTS ticket_assignee_status_idx ON "Ticket" ("assigneeId", "status") WHERE "deletedAt" IS NULL;
CREATE INDEX IF NOT EXISTS ticket_team_status_idx ON "Ticket" ("assignedTeamId", "status") WHERE "deletedAt" IS NULL;
