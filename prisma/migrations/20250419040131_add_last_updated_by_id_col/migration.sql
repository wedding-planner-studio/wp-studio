-- AlterTable
ALTER TABLE "Layout" ADD COLUMN     "lastUpdatedById" TEXT;

-- CreateIndex
CREATE INDEX "Layout_lastUpdatedById_idx" ON "Layout"("lastUpdatedById");

-- AddForeignKey
ALTER TABLE "Layout" ADD CONSTRAINT "Layout_lastUpdatedById_fkey" FOREIGN KEY ("lastUpdatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
