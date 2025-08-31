/*
  Warnings:

  - You are about to drop the column `bulkMessageId` on the `MediaFile` table. All the data in the column will be lost.
  - Added the required column `addedById` to the `MediaFile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `MediaFile` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "MediaFile" DROP CONSTRAINT "MediaFile_bulkMessageId_fkey";

-- DropIndex
DROP INDEX "MediaFile_bulkMessageId_idx";

-- AlterTable
ALTER TABLE "MediaFile" DROP COLUMN "bulkMessageId",
ADD COLUMN     "addedById" TEXT NOT NULL,
ADD COLUMN     "organizationId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "MediaFile_organizationId_idx" ON "MediaFile"("organizationId");

-- CreateIndex
CREATE INDEX "MediaFile_addedById_idx" ON "MediaFile"("addedById");

-- AddForeignKey
ALTER TABLE "MediaFile" ADD CONSTRAINT "MediaFile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaFile" ADD CONSTRAINT "MediaFile_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
