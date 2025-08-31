-- CreateEnum
CREATE TYPE "QuestionCategory" AS ENUM ('GENERAL', 'VENUE', 'DRESS_CODE', 'FOOD', 'SCHEDULE', 'GIFTS', 'OTHER');

-- CreateEnum
CREATE TYPE "QuestionStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "GuestStatus" AS ENUM ('CONFIRMED', 'PENDING', 'DECLINED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "GuestCategory" AS ENUM ('FAMILY', 'FRIEND', 'WORK');

-- CreateEnum
CREATE TYPE "GuestPriority" AS ENUM ('P1', 'P2', 'P3');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "attributes" JSONB,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "attributes" JSONB,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "organizationId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" VARCHAR(5),
    "endTime" VARCHAR(5),
    "location" TEXT NOT NULL,
    "timezone" VARCHAR(50) DEFAULT 'America/Mexico_City',
    "person1" TEXT NOT NULL,
    "person2" TEXT NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "hasPlusOne" BOOLEAN NOT NULL DEFAULT false,
    "plusOneName" TEXT,
    "status" "GuestStatus" NOT NULL DEFAULT 'PENDING',
    "table" TEXT,
    "dietaryRestrictions" TEXT,
    "notes" TEXT,
    "category" "GuestCategory" NOT NULL,
    "priority" "GuestPriority" NOT NULL,
    "inviter" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "eventId" TEXT NOT NULL,

    CONSTRAINT "Guest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventQuestion" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" "QuestionCategory" NOT NULL,
    "status" "QuestionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "eventId" TEXT NOT NULL,

    CONSTRAINT "EventQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Organization_name_idx" ON "Organization"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

-- CreateIndex
CREATE INDEX "Event_organizationId_idx" ON "Event"("organizationId");

-- CreateIndex
CREATE INDEX "Guest_eventId_idx" ON "Guest"("eventId");

-- CreateIndex
CREATE INDEX "Guest_status_idx" ON "Guest"("status");

-- CreateIndex
CREATE INDEX "Guest_category_idx" ON "Guest"("category");

-- CreateIndex
CREATE INDEX "Guest_priority_idx" ON "Guest"("priority");

-- CreateIndex
CREATE INDEX "EventQuestion_eventId_idx" ON "EventQuestion"("eventId");

-- CreateIndex
CREATE INDEX "EventQuestion_category_idx" ON "EventQuestion"("category");

-- CreateIndex
CREATE INDEX "EventQuestion_status_idx" ON "EventQuestion"("status");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventQuestion" ADD CONSTRAINT "EventQuestion_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
