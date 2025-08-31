-- DropIndex
DROP INDEX "ChatSession_isActive_idx";

-- AlterTable
ALTER TABLE "ChatSession" ADD COLUMN     "isTestSession" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "ChatSession_guestId_eventId_isActive_isTestSession_idx" ON "ChatSession"("guestId", "eventId", "isActive", "isTestSession");
