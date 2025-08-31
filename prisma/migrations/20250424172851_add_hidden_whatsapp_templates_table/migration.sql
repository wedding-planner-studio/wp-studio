-- CreateTable
CREATE TABLE "HiddenWhatsappTemplates" (
    "id" TEXT NOT NULL,
    "templateSid" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HiddenWhatsappTemplates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HiddenWhatsappTemplates_templateSid_key" ON "HiddenWhatsappTemplates"("templateSid");

-- CreateIndex
CREATE INDEX "HiddenWhatsappTemplates_organizationId_templateSid_idx" ON "HiddenWhatsappTemplates"("organizationId", "templateSid");

-- AddForeignKey
ALTER TABLE "HiddenWhatsappTemplates" ADD CONSTRAINT "HiddenWhatsappTemplates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
