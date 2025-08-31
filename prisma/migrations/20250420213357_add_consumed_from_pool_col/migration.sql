-- CreateEnum
CREATE TYPE "MessageCreditPool" AS ENUM ('ALLOWANCE', 'PURCHASED');

-- AlterTable
ALTER TABLE "OrganizationMessageCredits" ADD COLUMN     "consumedFromPool" "MessageCreditPool",
ALTER COLUMN "type" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "OrganizationMessageCredits_organizationId_type_createdAt_idx" ON "OrganizationMessageCredits"("organizationId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "OrganizationMessageCredits_organizationId_type_consumedFrom_idx" ON "OrganizationMessageCredits"("organizationId", "type", "consumedFromPool", "createdAt");
