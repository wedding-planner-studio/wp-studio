-- CreateTable
CREATE TABLE "CustomGuestCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "eventId" TEXT NOT NULL,

    CONSTRAINT "CustomGuestCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomGuestCategory_eventId_name_idx" ON "CustomGuestCategory"("eventId", "name");

-- AddForeignKey
ALTER TABLE "CustomGuestCategory" ADD CONSTRAINT "CustomGuestCategory_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
