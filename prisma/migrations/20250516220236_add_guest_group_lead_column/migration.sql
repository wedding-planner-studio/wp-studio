/*
  Warnings:

  - A unique constraint covering the columns `[leadGuestId]` on the table `GuestGroup` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[eventId,leadGuestId]` on the table `GuestGroup` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `eventId` to the `GuestGroup` table without a default value. This is not possible if the table is not empty.
  - Added the required column `leadGuestId` to the `GuestGroup` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "GuestGroup" ADD COLUMN     "eventId" TEXT NOT NULL,
ADD COLUMN     "leadGuestId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "GuestGroup_leadGuestId_key" ON "GuestGroup"("leadGuestId");

-- CreateIndex
CREATE INDEX "GuestGroup_eventId_idx" ON "GuestGroup"("eventId");

-- CreateIndex
CREATE INDEX "GuestGroup_leadGuestId_idx" ON "GuestGroup"("leadGuestId");

-- CreateIndex
CREATE UNIQUE INDEX "GuestGroup_eventId_leadGuestId_key" ON "GuestGroup"("eventId", "leadGuestId");

-- AddForeignKey
ALTER TABLE "GuestGroup" ADD CONSTRAINT "GuestGroup_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestGroup" ADD CONSTRAINT "GuestGroup_leadGuestId_fkey" FOREIGN KEY ("leadGuestId") REFERENCES "Guest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
