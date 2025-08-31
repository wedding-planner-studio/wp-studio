-- CreateEnum
CREATE TYPE "FeatureCategory" AS ENUM ('CORE', 'ADVANCED', 'CHATBOT', 'RSVP', 'INTEGRATION');

-- CreateTable
CREATE TABLE "Feature" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "FeatureCategory" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LimitType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "defaultValue" INTEGER NOT NULL DEFAULT 0,
    "unit" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LimitType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationFeature" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "configuration" JSONB,
    "enabledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enabledBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationLimit" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "limitTypeId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "setBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationUsage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "limitTypeId" TEXT NOT NULL,
    "currentValue" INTEGER NOT NULL DEFAULT 0,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Feature_name_key" ON "Feature"("name");

-- CreateIndex
CREATE INDEX "Feature_category_idx" ON "Feature"("category");

-- CreateIndex
CREATE INDEX "Feature_isActive_idx" ON "Feature"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "LimitType_name_key" ON "LimitType"("name");

-- CreateIndex
CREATE INDEX "LimitType_isActive_idx" ON "LimitType"("isActive");

-- CreateIndex
CREATE INDEX "OrganizationFeature_organizationId_idx" ON "OrganizationFeature"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationFeature_featureId_idx" ON "OrganizationFeature"("featureId");

-- CreateIndex
CREATE INDEX "OrganizationFeature_isEnabled_idx" ON "OrganizationFeature"("isEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationFeature_organizationId_featureId_key" ON "OrganizationFeature"("organizationId", "featureId");

-- CreateIndex
CREATE INDEX "OrganizationLimit_organizationId_idx" ON "OrganizationLimit"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationLimit_limitTypeId_idx" ON "OrganizationLimit"("limitTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationLimit_organizationId_limitTypeId_key" ON "OrganizationLimit"("organizationId", "limitTypeId");

-- CreateIndex
CREATE INDEX "OrganizationUsage_organizationId_idx" ON "OrganizationUsage"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationUsage_limitTypeId_idx" ON "OrganizationUsage"("limitTypeId");

-- CreateIndex
CREATE INDEX "OrganizationUsage_periodStart_periodEnd_idx" ON "OrganizationUsage"("periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationUsage_organizationId_limitTypeId_periodStart_key" ON "OrganizationUsage"("organizationId", "limitTypeId", "periodStart");

-- AddForeignKey
ALTER TABLE "OrganizationFeature" ADD CONSTRAINT "OrganizationFeature_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationFeature" ADD CONSTRAINT "OrganizationFeature_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "Feature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationLimit" ADD CONSTRAINT "OrganizationLimit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationLimit" ADD CONSTRAINT "OrganizationLimit_limitTypeId_fkey" FOREIGN KEY ("limitTypeId") REFERENCES "LimitType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationUsage" ADD CONSTRAINT "OrganizationUsage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationUsage" ADD CONSTRAINT "OrganizationUsage_limitTypeId_fkey" FOREIGN KEY ("limitTypeId") REFERENCES "LimitType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
