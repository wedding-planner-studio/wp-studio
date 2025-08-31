-- CreateEnum
CREATE TYPE "MessageCreditType" AS ENUM ('TOP_UP', 'CONSUMPTION');

-- AlterTable
ALTER TABLE "OrganizationMessageCredits" ADD COLUMN     "type" "MessageCreditType" NOT NULL DEFAULT 'TOP_UP';
