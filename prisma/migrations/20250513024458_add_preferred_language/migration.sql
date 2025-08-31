-- CreateEnum
CREATE TYPE "GuestLanguage" AS ENUM ('ENGLISH', 'SPANISH', 'GERMAN', 'FRENCH', 'ITALIAN', 'PORTUGUESE');

-- AlterTable
ALTER TABLE "Guest" ADD COLUMN     "preferredLanguage" "GuestLanguage" NOT NULL DEFAULT 'SPANISH';
