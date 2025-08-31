/*
  Warnings:

  - A unique constraint covering the columns `[organizationId,relatedMessageSid]` on the table `OrganizationMessageCredits` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "OrganizationPlan" AS ENUM ('LITE', 'PRO', 'ELITE', 'SINGLE');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "plan" "OrganizationPlan" NOT NULL DEFAULT 'LITE';

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMessageCredits_organizationId_relatedMessageSid_key" ON "OrganizationMessageCredits"("organizationId", "relatedMessageSid");
