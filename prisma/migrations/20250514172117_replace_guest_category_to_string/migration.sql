/*
  Warnings:

  - The `category` column on the `Guest` table would be replaced with a TEXT column.

*/

-- Drop Index
DROP INDEX "Guest_category_idx";

-- AlterTable
ALTER TABLE "Guest" ALTER COLUMN "category" TYPE TEXT USING "category"::TEXT;

-- CreateIndex
CREATE INDEX "Guest_category_idx" ON "Guest"("category");
