-- CreateTable
CREATE TABLE "EventRequiredGuestConfirmation" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventRequiredGuestConfirmation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventRequiredGuestConfirmation_eventId_idx" ON "EventRequiredGuestConfirmation"("eventId");

-- AddForeignKey
ALTER TABLE "EventRequiredGuestConfirmation" ADD CONSTRAINT "EventRequiredGuestConfirmation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
