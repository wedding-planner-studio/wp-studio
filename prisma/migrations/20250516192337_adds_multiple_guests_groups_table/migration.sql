-- AlterTable
ALTER TABLE "Guest" ADD COLUMN     "guestGroupId" TEXT,
ADD COLUMN     "hasMultipleGuests" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPrimaryGuest" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "GuestGroup" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuestGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Guest_guestGroupId_idx" ON "Guest"("guestGroupId");

-- AddForeignKey
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_guestGroupId_fkey" FOREIGN KEY ("guestGroupId") REFERENCES "GuestGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
