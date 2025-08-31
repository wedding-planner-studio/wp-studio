-- AlterTable
ALTER TABLE "Feature" ADD COLUMN     "featureFlagId" TEXT;

-- CreateIndex
CREATE INDEX "Feature_featureFlagId_idx" ON "Feature"("featureFlagId");

-- AddForeignKey
ALTER TABLE "Feature" ADD CONSTRAINT "Feature_featureFlagId_fkey" FOREIGN KEY ("featureFlagId") REFERENCES "FeatureFlag"("id") ON DELETE SET NULL ON UPDATE CASCADE;
