-- CreateTable
CREATE TABLE "GuestRequestNote" (
    "id" TEXT NOT NULL,
    "guestRequestId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdByUserId" TEXT,

    CONSTRAINT "GuestRequestNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GuestRequestNote_guestRequestId_idx" ON "GuestRequestNote"("guestRequestId");

-- CreateIndex
CREATE INDEX "GuestRequestNote_createdByUserId_idx" ON "GuestRequestNote"("createdByUserId");

-- AddForeignKey
ALTER TABLE "GuestRequestNote" ADD CONSTRAINT "GuestRequestNote_guestRequestId_fkey" FOREIGN KEY ("guestRequestId") REFERENCES "GuestRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestRequestNote" ADD CONSTRAINT "GuestRequestNote_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
