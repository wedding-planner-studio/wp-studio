-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "sentById" TEXT;

-- CreateIndex
CREATE INDEX "ChatMessage_sentById_idx" ON "ChatMessage"("sentById");

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
