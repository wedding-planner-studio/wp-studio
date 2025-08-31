/*
  Warnings:

  - You are about to drop the column `category` on the `Feature` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Feature_category_idx";

-- AlterTable
ALTER TABLE "Feature" DROP COLUMN "category";

-- DropEnum
DROP TYPE "FeatureCategory";
