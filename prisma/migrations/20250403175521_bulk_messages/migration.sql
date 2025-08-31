-- CreateEnum
CREATE TYPE "BulkMessageStatus" AS ENUM ('CREATED', 'SENDING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "MessageDeliveryStatus" AS ENUM ('PENDING', 'FAILED', 'DELIVERED');

-- CreateTable
CREATE TABLE "BulkMessage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "templateSid" TEXT NOT NULL,
    "templateName" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "status" "BulkMessageStatus" NOT NULL DEFAULT 'CREATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "BulkMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageDelivery" (
    "id" TEXT NOT NULL,
    "bulkMessageId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "status" "MessageDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "messageSid" TEXT,
    "errorMessage" TEXT,
    "variables" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BulkMessage_eventId_idx" ON "BulkMessage"("eventId");

-- CreateIndex
CREATE INDEX "BulkMessage_status_idx" ON "BulkMessage"("status");

-- CreateIndex
CREATE INDEX "BulkMessage_createdById_idx" ON "BulkMessage"("createdById");

-- CreateIndex
CREATE INDEX "MessageDelivery_bulkMessageId_idx" ON "MessageDelivery"("bulkMessageId");

-- CreateIndex
CREATE INDEX "MessageDelivery_guestId_idx" ON "MessageDelivery"("guestId");

-- CreateIndex
CREATE INDEX "MessageDelivery_status_idx" ON "MessageDelivery"("status");

-- AddForeignKey
ALTER TABLE "BulkMessage" ADD CONSTRAINT "BulkMessage_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulkMessage" ADD CONSTRAINT "BulkMessage_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageDelivery" ADD CONSTRAINT "MessageDelivery_bulkMessageId_fkey" FOREIGN KEY ("bulkMessageId") REFERENCES "BulkMessage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageDelivery" ADD CONSTRAINT "MessageDelivery_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
