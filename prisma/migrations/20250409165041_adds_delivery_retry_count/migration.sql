-- AlterTable
ALTER TABLE "MessageDelivery" ADD COLUMN     "retryCount" INTEGER NOT NULL DEFAULT 0;
