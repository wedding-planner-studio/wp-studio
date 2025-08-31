-- AlterTable
ALTER TABLE "ChatSession" ADD COLUMN     "organizationId" TEXT;

-- CreateIndex
CREATE INDEX "ChatSession_organizationId_idx" ON "ChatSession"("organizationId");

-- AddForeignKey
ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
