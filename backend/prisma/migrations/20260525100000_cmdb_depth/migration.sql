-- AlterTable User: employee fields
ALTER TABLE "User" ADD COLUMN "jobTitle" TEXT;
ALTER TABLE "User" ADD COLUMN "department" TEXT;
ALTER TABLE "User" ADD COLUMN "location" TEXT;
ALTER TABLE "User" ADD COLUMN "phone" TEXT;
ALTER TABLE "User" ADD COLUMN "employeeNumber" TEXT;
ALTER TABLE "User" ADD COLUMN "managerId" TEXT;

CREATE UNIQUE INDEX "User_employeeNumber_key" ON "User"("employeeNumber");
CREATE INDEX "User_department_idx" ON "User"("department");
CREATE INDEX "User_managerId_idx" ON "User"("managerId");

ALTER TABLE "User" ADD CONSTRAINT "User_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable Asset: CMDB fields
ALTER TABLE "Asset" ADD COLUMN "ownerId" TEXT;
ALTER TABLE "Asset" ADD COLUMN "primaryUserId" TEXT;
ALTER TABLE "Asset" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'in_use';
ALTER TABLE "Asset" ADD COLUMN "lifecycleStage" TEXT NOT NULL DEFAULT 'deployed';
ALTER TABLE "Asset" ADD COLUMN "location" TEXT;
ALTER TABLE "Asset" ADD COLUMN "vendor" TEXT;
ALTER TABLE "Asset" ADD COLUMN "model" TEXT;
ALTER TABLE "Asset" ADD COLUMN "serialNumber" TEXT;
ALTER TABLE "Asset" ADD COLUMN "cost" DECIMAL(12,2);
ALTER TABLE "Asset" ADD COLUMN "purchaseDate" TIMESTAMP(3);
ALTER TABLE "Asset" ADD COLUMN "purchaseOrder" TEXT;
ALTER TABLE "Asset" ADD COLUMN "warrantyEndsAt" TIMESTAMP(3);
ALTER TABLE "Asset" ADD COLUMN "retiredAt" TIMESTAMP(3);
ALTER TABLE "Asset" ADD COLUMN "notes" TEXT;

CREATE INDEX "Asset_ownerId_idx" ON "Asset"("ownerId");
CREATE INDEX "Asset_primaryUserId_idx" ON "Asset"("primaryUserId");
CREATE INDEX "Asset_status_idx" ON "Asset"("status");
CREATE INDEX "Asset_lifecycleStage_idx" ON "Asset"("lifecycleStage");
CREATE INDEX "Asset_serialNumber_idx" ON "Asset"("serialNumber");

ALTER TABLE "Asset" ADD CONSTRAINT "Asset_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_primaryUserId_fkey" FOREIGN KEY ("primaryUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable AssetRelationship
CREATE TABLE "AssetRelationship" (
    "id" TEXT NOT NULL,
    "parentAssetId" TEXT NOT NULL,
    "childAssetId" TEXT NOT NULL,
    "relationType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetRelationship_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AssetRelationship_parentAssetId_childAssetId_relationType_key" ON "AssetRelationship"("parentAssetId", "childAssetId", "relationType");
CREATE INDEX "AssetRelationship_parentAssetId_idx" ON "AssetRelationship"("parentAssetId");
CREATE INDEX "AssetRelationship_childAssetId_idx" ON "AssetRelationship"("childAssetId");

ALTER TABLE "AssetRelationship" ADD CONSTRAINT "AssetRelationship_parentAssetId_fkey" FOREIGN KEY ("parentAssetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssetRelationship" ADD CONSTRAINT "AssetRelationship_childAssetId_fkey" FOREIGN KEY ("childAssetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable TicketAsset
CREATE TABLE "TicketAsset" (
    "ticketId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "relation" TEXT NOT NULL DEFAULT 'affected',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketAsset_pkey" PRIMARY KEY ("ticketId","assetId")
);

CREATE INDEX "TicketAsset_assetId_idx" ON "TicketAsset"("assetId");

ALTER TABLE "TicketAsset" ADD CONSTRAINT "TicketAsset_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicketAsset" ADD CONSTRAINT "TicketAsset_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable ChangeAsset
CREATE TABLE "ChangeAsset" (
    "changeRequestId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "relation" TEXT NOT NULL DEFAULT 'impacted',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChangeAsset_pkey" PRIMARY KEY ("changeRequestId","assetId")
);

CREATE INDEX "ChangeAsset_assetId_idx" ON "ChangeAsset"("assetId");

ALTER TABLE "ChangeAsset" ADD CONSTRAINT "ChangeAsset_changeRequestId_fkey" FOREIGN KEY ("changeRequestId") REFERENCES "ChangeRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChangeAsset" ADD CONSTRAINT "ChangeAsset_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable ProblemAsset
CREATE TABLE "ProblemAsset" (
    "problemRecordId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "relation" TEXT NOT NULL DEFAULT 'affected',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProblemAsset_pkey" PRIMARY KEY ("problemRecordId","assetId")
);

CREATE INDEX "ProblemAsset_assetId_idx" ON "ProblemAsset"("assetId");

ALTER TABLE "ProblemAsset" ADD CONSTRAINT "ProblemAsset_problemRecordId_fkey" FOREIGN KEY ("problemRecordId") REFERENCES "ProblemRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProblemAsset" ADD CONSTRAINT "ProblemAsset_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable SoftwareLicense
CREATE TABLE "SoftwareLicense" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vendor" TEXT,
    "licenseKey" TEXT,
    "seatsTotal" INTEGER NOT NULL DEFAULT 1,
    "purchaseDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "renewalCost" DECIMAL(12,2),
    "notes" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SoftwareLicense_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SoftwareLicense_name_idx" ON "SoftwareLicense"("name");

-- CreateTable AssetSoftware
CREATE TABLE "AssetSoftware" (
    "assetId" TEXT NOT NULL,
    "softwareLicenseId" TEXT NOT NULL,
    "seatsUsed" INTEGER NOT NULL DEFAULT 1,
    "version" TEXT,
    "installedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetSoftware_pkey" PRIMARY KEY ("assetId","softwareLicenseId")
);

CREATE INDEX "AssetSoftware_softwareLicenseId_idx" ON "AssetSoftware"("softwareLicenseId");

ALTER TABLE "AssetSoftware" ADD CONSTRAINT "AssetSoftware_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssetSoftware" ADD CONSTRAINT "AssetSoftware_softwareLicenseId_fkey" FOREIGN KEY ("softwareLicenseId") REFERENCES "SoftwareLicense"("id") ON DELETE CASCADE ON UPDATE CASCADE;
