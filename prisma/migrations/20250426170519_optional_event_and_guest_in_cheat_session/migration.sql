-- DropForeignKey
ALTER TABLE "ChatSession" DROP CONSTRAINT "ChatSession_eventId_fkey";

-- DropForeignKey
ALTER TABLE "ChatSession" DROP CONSTRAINT "ChatSession_guestId_fkey";

-- AlterTable
ALTER TABLE "ChatSession" ALTER COLUMN "guestId" DROP NOT NULL,
ALTER COLUMN "eventId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
