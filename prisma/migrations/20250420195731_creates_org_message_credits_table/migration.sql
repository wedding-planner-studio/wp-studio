-- CreateTable
CREATE TABLE "OrganizationMessageCredits" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "credits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "relatedMessageSid" TEXT,

    CONSTRAINT "OrganizationMessageCredits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrganizationMessageCredits_organizationId_idx" ON "OrganizationMessageCredits"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationMessageCredits_relatedMessageSid_idx" ON "OrganizationMessageCredits"("relatedMessageSid");

-- AddForeignKey
ALTER TABLE "OrganizationMessageCredits" ADD CONSTRAINT "OrganizationMessageCredits_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
