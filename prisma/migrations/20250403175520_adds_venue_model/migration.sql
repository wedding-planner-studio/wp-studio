/*
  Warnings:

  - You are about to drop the column `location` on the `Event` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "VenuePurpose" AS ENUM ('MAIN', 'RELIGIOUS', 'RECEPTION', 'COCKTAIL', 'AFTER_PARTY', 'PHOTO_SESSION', 'REHEARSAL_DINNER', 'OTHER');

-- AlterTable
ALTER TABLE "Event" DROP COLUMN "location";

-- CreateTable
CREATE TABLE "Venue" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NULL,
    "purpose" "VenuePurpose" NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Venue_eventId_idx" ON "Venue"("eventId");

-- AddForeignKey
ALTER TABLE "Venue" ADD CONSTRAINT "Venue_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
