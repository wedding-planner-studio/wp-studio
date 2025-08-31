-- CreateTable
CREATE TABLE "TwilioCredentials" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "subAccountSid" TEXT NOT NULL,
    "encryptedAuthToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TwilioCredentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TwilioCredentials_organizationId_key" ON "TwilioCredentials"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "TwilioCredentials_subAccountSid_key" ON "TwilioCredentials"("subAccountSid");

-- CreateIndex
CREATE INDEX "TwilioCredentials_organizationId_idx" ON "TwilioCredentials"("organizationId");

-- AddForeignKey
ALTER TABLE "TwilioCredentials" ADD CONSTRAINT "TwilioCredentials_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
