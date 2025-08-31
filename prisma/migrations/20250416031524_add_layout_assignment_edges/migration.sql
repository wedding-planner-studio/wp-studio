-- CreateEnum
CREATE TYPE "ElementCornerStyle" AS ENUM ('STRAIGHT', 'ROUNDED');

-- AlterTable
ALTER TABLE "LayoutElement" ADD COLUMN     "cornerStyle" "ElementCornerStyle" DEFAULT 'STRAIGHT';
