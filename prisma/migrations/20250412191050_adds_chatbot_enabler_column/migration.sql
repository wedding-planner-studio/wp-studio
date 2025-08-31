/*
  Warnings:

  - You are about to drop the column `venueConfirmedAt` on the `Event` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Event" DROP COLUMN "venueConfirmedAt",
ADD COLUMN     "hasChatbotEnabled" BOOLEAN NOT NULL DEFAULT true;
