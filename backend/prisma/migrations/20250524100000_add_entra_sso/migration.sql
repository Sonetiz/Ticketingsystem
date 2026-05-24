-- AlterTable
ALTER TABLE "User" ADD COLUMN "entraOid" TEXT,
ADD COLUMN "authProvider" TEXT NOT NULL DEFAULT 'local';

-- CreateIndex
CREATE UNIQUE INDEX "User_entraOid_key" ON "User"("entraOid");
