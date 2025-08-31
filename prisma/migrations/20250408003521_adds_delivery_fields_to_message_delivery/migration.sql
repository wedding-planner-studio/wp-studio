/*
  Warnings:

  - A unique constraint covering the columns `[messageSid]` on the table `MessageDelivery` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MessageDeliveryStatus" ADD VALUE 'QUEUED';
ALTER TYPE "MessageDeliveryStatus" ADD VALUE 'SENT';
ALTER TYPE "MessageDeliveryStatus" ADD VALUE 'READ';

-- AlterTable
ALTER TABLE "MessageDelivery" ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "queuedAt" TIMESTAMP(3),
ADD COLUMN     "readAt" TIMESTAMP(3),
ADD COLUMN     "sentAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "MessageDelivery_messageSid_key" ON "MessageDelivery"("messageSid");
