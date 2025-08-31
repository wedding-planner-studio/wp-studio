-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isGloballyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlagOrgWhitelist" (
    "id" TEXT NOT NULL,
    "featureFlagId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeatureFlagOrgWhitelist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlagOrgBlacklist" (
    "id" TEXT NOT NULL,
    "featureFlagId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeatureFlagOrgBlacklist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_name_key" ON "FeatureFlag"("name");

-- CreateIndex
CREATE INDEX "FeatureFlag_name_idx" ON "FeatureFlag"("name");

-- CreateIndex
CREATE INDEX "FeatureFlag_isGloballyEnabled_idx" ON "FeatureFlag"("isGloballyEnabled");

-- CreateIndex
CREATE INDEX "FeatureFlagOrgWhitelist_featureFlagId_idx" ON "FeatureFlagOrgWhitelist"("featureFlagId");

-- CreateIndex
CREATE INDEX "FeatureFlagOrgWhitelist_organizationId_idx" ON "FeatureFlagOrgWhitelist"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlagOrgWhitelist_featureFlagId_organizationId_key" ON "FeatureFlagOrgWhitelist"("featureFlagId", "organizationId");

-- CreateIndex
CREATE INDEX "FeatureFlagOrgBlacklist_featureFlagId_idx" ON "FeatureFlagOrgBlacklist"("featureFlagId");

-- CreateIndex
CREATE INDEX "FeatureFlagOrgBlacklist_organizationId_idx" ON "FeatureFlagOrgBlacklist"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlagOrgBlacklist_featureFlagId_organizationId_key" ON "FeatureFlagOrgBlacklist"("featureFlagId", "organizationId");

-- AddForeignKey
ALTER TABLE "FeatureFlagOrgWhitelist" ADD CONSTRAINT "FeatureFlagOrgWhitelist_featureFlagId_fkey" FOREIGN KEY ("featureFlagId") REFERENCES "FeatureFlag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureFlagOrgWhitelist" ADD CONSTRAINT "FeatureFlagOrgWhitelist_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureFlagOrgBlacklist" ADD CONSTRAINT "FeatureFlagOrgBlacklist_featureFlagId_fkey" FOREIGN KEY ("featureFlagId") REFERENCES "FeatureFlag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureFlagOrgBlacklist" ADD CONSTRAINT "FeatureFlagOrgBlacklist_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
