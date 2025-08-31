-- CreateTable
CREATE TABLE "GuestConfirmationResponse" (
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "id" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "eventRequiredGuestConfirmationId" TEXT NOT NULL,
    "selectedOptionId" TEXT,
    "customResponse" TEXT,

    CONSTRAINT "GuestConfirmationResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GuestConfirmationResponse_guestId_idx" ON "GuestConfirmationResponse"("guestId");

-- CreateIndex
CREATE INDEX "GuestConfirmationResponse_eventRequiredGuestConfirmationId_idx" ON "GuestConfirmationResponse"("eventRequiredGuestConfirmationId");

-- CreateIndex
CREATE INDEX "GuestConfirmationResponse_selectedOptionId_idx" ON "GuestConfirmationResponse"("selectedOptionId");

-- CreateIndex
CREATE UNIQUE INDEX "GuestConfirmationResponse_guestId_eventRequiredGuestConfirm_key" ON "GuestConfirmationResponse"("guestId", "eventRequiredGuestConfirmationId");

-- AddForeignKey
ALTER TABLE "GuestConfirmationResponse" ADD CONSTRAINT "GuestConfirmationResponse_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestConfirmationResponse" ADD CONSTRAINT "GuestConfirmationResponse_eventRequiredGuestConfirmationId_fkey" FOREIGN KEY ("eventRequiredGuestConfirmationId") REFERENCES "EventRequiredGuestConfirmation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestConfirmationResponse" ADD CONSTRAINT "GuestConfirmationResponse_selectedOptionId_fkey" FOREIGN KEY ("selectedOptionId") REFERENCES "EventRequiredGuestConfirmationOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
