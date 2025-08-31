-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "phoneNumber" TEXT;

-- CreateIndex
CREATE INDEX "Organization_phoneNumber_idx" ON "Organization"("phoneNumber");
