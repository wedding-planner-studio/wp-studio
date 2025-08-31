/*
  Warnings:

  - A unique constraint covering the columns `[eventId,label]` on the table `EventRequiredGuestConfirmation` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "EventRequiredGuestConfirmationOption" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "eventRequiredGuestConfirmationId" TEXT NOT NULL,

    CONSTRAINT "EventRequiredGuestConfirmationOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventRequiredGuestConfirmationOption_eventRequiredGuestConf_idx" ON "EventRequiredGuestConfirmationOption"("eventRequiredGuestConfirmationId");

-- CreateIndex
CREATE UNIQUE INDEX "EventRequiredGuestConfirmationOption_eventRequiredGuestConf_key" ON "EventRequiredGuestConfirmationOption"("eventRequiredGuestConfirmationId", "label");

-- CreateIndex
CREATE UNIQUE INDEX "EventRequiredGuestConfirmation_eventId_label_key" ON "EventRequiredGuestConfirmation"("eventId", "label");

-- AddForeignKey
ALTER TABLE "EventRequiredGuestConfirmationOption" ADD CONSTRAINT "EventRequiredGuestConfirmationOption_eventRequiredGuestCon_fkey" FOREIGN KEY ("eventRequiredGuestConfirmationId") REFERENCES "EventRequiredGuestConfirmation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
