-- CreateEnum
CREATE TYPE "LayoutElementType" AS ENUM ('TABLE', 'DANCEFLOOR', 'DJ_BOOTH', 'ENTRANCE', 'WALL', 'BAR', 'STAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "TableShape" AS ENUM ('CIRCLE', 'RECTANGLE', 'SQUARE');

-- CreateTable
CREATE TABLE "Layout" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Layout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LayoutElement" (
    "id" TEXT NOT NULL,
    "layoutId" TEXT NOT NULL,
    "type" "LayoutElementType" NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "rotation" DOUBLE PRECISION DEFAULT 0,
    "label" TEXT,
    "shape" "TableShape",
    "numberOfSeats" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LayoutElement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestAssignment" (
    "id" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "layoutElementId" TEXT NOT NULL,
    "seatIndex" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuestAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Layout_eventId_key" ON "Layout"("eventId");

-- CreateIndex
CREATE INDEX "Layout_eventId_idx" ON "Layout"("eventId");

-- CreateIndex
CREATE INDEX "LayoutElement_layoutId_idx" ON "LayoutElement"("layoutId");

-- CreateIndex
CREATE UNIQUE INDEX "GuestAssignment_guestId_key" ON "GuestAssignment"("guestId");

-- CreateIndex
CREATE INDEX "GuestAssignment_layoutElementId_idx" ON "GuestAssignment"("layoutElementId");

-- AddForeignKey
ALTER TABLE "Layout" ADD CONSTRAINT "Layout_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LayoutElement" ADD CONSTRAINT "LayoutElement_layoutId_fkey" FOREIGN KEY ("layoutId") REFERENCES "Layout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestAssignment" ADD CONSTRAINT "GuestAssignment_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestAssignment" ADD CONSTRAINT "GuestAssignment_layoutElementId_fkey" FOREIGN KEY ("layoutElementId") REFERENCES "LayoutElement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
