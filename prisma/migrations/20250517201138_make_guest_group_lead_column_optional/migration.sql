-- DropForeignKey
ALTER TABLE "GuestGroup" DROP CONSTRAINT "GuestGroup_leadGuestId_fkey";

-- DropIndex
DROP INDEX "GuestGroup_eventId_leadGuestId_key";

-- AlterTable
ALTER TABLE "GuestGroup" ALTER COLUMN "leadGuestId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "GuestGroup" ADD CONSTRAINT "GuestGroup_leadGuestId_fkey" FOREIGN KEY ("leadGuestId") REFERENCES "Guest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
