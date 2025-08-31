-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ORG_ADMIN', 'ORG_MEMBER', 'EVENT_MANAGER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'EVENT_MANAGER';

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");
