-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'RESOLVED', 'IGNORED');

-- CreateTable
CREATE TABLE "GuestRequest" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "requestText" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "resolvedByUserId" TEXT,

    CONSTRAINT "GuestRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GuestRequest_eventId_idx" ON "GuestRequest"("eventId");

-- CreateIndex
CREATE INDEX "GuestRequest_guestId_idx" ON "GuestRequest"("guestId");

-- CreateIndex
CREATE INDEX "GuestRequest_status_idx" ON "GuestRequest"("status");

-- CreateIndex
CREATE INDEX "GuestRequest_resolvedByUserId_idx" ON "GuestRequest"("resolvedByUserId");

-- AddForeignKey
ALTER TABLE "GuestRequest" ADD CONSTRAINT "GuestRequest_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestRequest" ADD CONSTRAINT "GuestRequest_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestRequest" ADD CONSTRAINT "GuestRequest_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
