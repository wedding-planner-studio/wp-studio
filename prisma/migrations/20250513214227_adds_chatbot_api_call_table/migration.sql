-- CreateTable
CREATE TABLE "ChatbotApiCall" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "stopReason" TEXT,
    "stopSequence" TEXT,
    "inputTokens" INTEGER NOT NULL,
    "cacheCreationTokens" INTEGER NOT NULL,
    "cacheReadTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatbotApiCall_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatbotApiCall_sessionId_idx" ON "ChatbotApiCall"("sessionId");

-- CreateIndex
CREATE INDEX "ChatbotApiCall_messageId_idx" ON "ChatbotApiCall"("messageId");

-- CreateIndex
CREATE INDEX "ChatbotApiCall_model_idx" ON "ChatbotApiCall"("model");

-- CreateIndex
CREATE INDEX "ChatbotApiCall_stopReason_idx" ON "ChatbotApiCall"("stopReason");

-- AddForeignKey
ALTER TABLE "ChatbotApiCall" ADD CONSTRAINT "ChatbotApiCall_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
