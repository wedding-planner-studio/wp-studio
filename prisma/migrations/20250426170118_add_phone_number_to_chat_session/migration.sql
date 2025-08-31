-- DropIndex
DROP INDEX "ChatSession_organizationId_idx";

-- AlterTable
ALTER TABLE "ChatSession" ADD COLUMN     "phoneNumber" TEXT;

-- CreateIndex
CREATE INDEX "ChatSession_organizationId_phoneNumber_isActive_isTestSessi_idx" ON "ChatSession"("organizationId", "phoneNumber", "isActive", "isTestSession");
