-- CreateTable
CREATE TABLE "EventsAllowedToManage" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventsAllowedToManage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventsAllowedToManage_eventId_idx" ON "EventsAllowedToManage"("eventId");

-- CreateIndex
CREATE INDEX "EventsAllowedToManage_userId_idx" ON "EventsAllowedToManage"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EventsAllowedToManage_eventId_userId_key" ON "EventsAllowedToManage"("eventId", "userId");

-- AddForeignKey
ALTER TABLE "EventsAllowedToManage" ADD CONSTRAINT "EventsAllowedToManage_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventsAllowedToManage" ADD CONSTRAINT "EventsAllowedToManage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
