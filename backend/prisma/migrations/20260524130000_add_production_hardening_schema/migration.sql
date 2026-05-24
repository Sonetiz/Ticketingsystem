-- Add schema changes introduced by the production hardening implementation.
-- This migration is intentionally additive/idempotent so it can repair databases
-- that already applied the earlier FTS-only hardening migration.

ALTER TABLE "Ticket"
  ADD COLUMN IF NOT EXISTS "slaPausedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "slaPausedMs" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "responseSlaAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PasswordResetToken_userId_fkey'
  ) THEN
    ALTER TABLE "PasswordResetToken"
      ADD CONSTRAINT "PasswordResetToken_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ServiceCatalogItem" (
  "id" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "formSchema" JSONB NOT NULL DEFAULT '[]',
  "icon" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServiceCatalogItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ServiceCatalogItem_serviceId_idx" ON "ServiceCatalogItem"("serviceId");
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ServiceCatalogItem_serviceId_fkey'
  ) THEN
    ALTER TABLE "ServiceCatalogItem"
      ADD CONSTRAINT "ServiceCatalogItem_serviceId_fkey"
      FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "ChangeRequest"
  ADD COLUMN IF NOT EXISTS "impact" TEXT NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS "implementationPlan" TEXT,
  ADD COLUMN IF NOT EXISTS "scheduledStart" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "scheduledEnd" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS "freezeWindowAck" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "ChangeRequest" ADD COLUMN IF NOT EXISTS "scheduledAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "FreezeWindow" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL,
  "reason" TEXT,
  "scope" TEXT NOT NULL DEFAULT 'global',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FreezeWindow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProblemRecord" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "rootCause" TEXT,
  "workaround" TEXT,
  "isKnownError" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'open',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProblemRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProblemRecord_ticketId_key" ON "ProblemRecord"("ticketId");
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProblemRecord_ticketId_fkey'
  ) THEN
    ALTER TABLE "ProblemRecord"
      ADD CONSTRAINT "ProblemRecord_ticketId_fkey"
      FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "WorklogEntry" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "endedAt" TIMESTAMP(3),
  "durationSeconds" INTEGER,
  "billable" BOOLEAN NOT NULL DEFAULT false,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorklogEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "WorklogEntry_ticketId_idx" ON "WorklogEntry"("ticketId");
CREATE INDEX IF NOT EXISTS "WorklogEntry_userId_idx" ON "WorklogEntry"("userId");
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'WorklogEntry_ticketId_fkey'
  ) THEN
    ALTER TABLE "WorklogEntry"
      ADD CONSTRAINT "WorklogEntry_ticketId_fkey"
      FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'WorklogEntry_userId_fkey'
  ) THEN
    ALTER TABLE "WorklogEntry"
      ADD CONSTRAINT "WorklogEntry_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "ApprovalRequest"
  ADD COLUMN IF NOT EXISTS "title" TEXT NOT NULL DEFAULT 'Approval request',
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "approvalType" TEXT NOT NULL DEFAULT 'any',
  ADD COLUMN IF NOT EXISTS "dueAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "requesterId" TEXT,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "ApprovalRequest_status_idx" ON "ApprovalRequest"("status");

CREATE TABLE IF NOT EXISTS "ApprovalRequestApprover" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "decision" TEXT,
  "comment" TEXT,
  "decidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApprovalRequestApprover_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ApprovalRequestApprover_requestId_userId_key" ON "ApprovalRequestApprover"("requestId", "userId");
CREATE INDEX IF NOT EXISTS "ApprovalRequestApprover_requestId_idx" ON "ApprovalRequestApprover"("requestId");
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ApprovalRequestApprover_requestId_fkey'
  ) THEN
    ALTER TABLE "ApprovalRequestApprover"
      ADD CONSTRAINT "ApprovalRequestApprover_requestId_fkey"
      FOREIGN KEY ("requestId") REFERENCES "ApprovalRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ApprovalRequestApprover_userId_fkey'
  ) THEN
    ALTER TABLE "ApprovalRequestApprover"
      ADD CONSTRAINT "ApprovalRequestApprover_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ApprovalDecisionToken" (
  "id" TEXT NOT NULL,
  "approverId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApprovalDecisionToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ApprovalDecisionToken_tokenHash_key" ON "ApprovalDecisionToken"("tokenHash");

ALTER TABLE "CsatSurvey" ADD COLUMN IF NOT EXISTS "tokenHash" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "CsatSurvey_tokenHash_key" ON "CsatSurvey"("tokenHash");

ALTER TABLE "SavedView" ADD COLUMN IF NOT EXISTS "scope" TEXT NOT NULL DEFAULT 'user';
