-- CreateEnum
CREATE TYPE "AgentType" AS ENUM ('MAIN', 'SUB_AGENT', 'TOOL_AGENT');

-- CreateEnum
CREATE TYPE "AgentExecutionStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LoopIterationStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "agentExecutionId" TEXT;

-- AlterTable
ALTER TABLE "ChatbotApiCall" ADD COLUMN     "agentExecutionId" TEXT,
ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "estimatedCost" DOUBLE PRECISION,
ADD COLUMN     "loopIterationId" TEXT,
ADD COLUMN     "responseTimeMs" INTEGER;

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "AgentType" NOT NULL DEFAULT 'MAIN',
    "systemPrompt" TEXT NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'claude-3-5-sonnet-latest',
    "maxTokens" INTEGER DEFAULT 4096,
    "temperature" DOUBLE PRECISION DEFAULT 0.7,
    "configuration" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentExecution" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "parentExecutionId" TEXT,
    "parentLoopIterationId" TEXT,
    "status" "AgentExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "systemPrompt" TEXT NOT NULL,
    "userMessage" TEXT,
    "finalResponse" TEXT,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "cacheCreationTokens" INTEGER NOT NULL DEFAULT 0,
    "cacheReadTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "executionTimeMs" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentLoopIteration" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "iterationNumber" INTEGER NOT NULL,
    "status" "LoopIterationStatus" NOT NULL DEFAULT 'PENDING',
    "inputPrompt" TEXT NOT NULL,
    "outputContent" TEXT,
    "reasoning" TEXT,
    "toolCalls" JSONB,
    "toolResults" JSONB,
    "iterationTimeMs" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentLoopIteration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Agent_name_idx" ON "Agent"("name");

-- CreateIndex
CREATE INDEX "Agent_type_idx" ON "Agent"("type");

-- CreateIndex
CREATE INDEX "Agent_isActive_idx" ON "Agent"("isActive");

-- CreateIndex
CREATE INDEX "AgentExecution_sessionId_idx" ON "AgentExecution"("sessionId");

-- CreateIndex
CREATE INDEX "AgentExecution_agentId_idx" ON "AgentExecution"("agentId");

-- CreateIndex
CREATE INDEX "AgentExecution_parentExecutionId_idx" ON "AgentExecution"("parentExecutionId");

-- CreateIndex
CREATE INDEX "AgentExecution_status_idx" ON "AgentExecution"("status");

-- CreateIndex
CREATE INDEX "AgentExecution_startedAt_idx" ON "AgentExecution"("startedAt");

-- CreateIndex
CREATE INDEX "AgentLoopIteration_executionId_idx" ON "AgentLoopIteration"("executionId");

-- CreateIndex
CREATE INDEX "AgentLoopIteration_iterationNumber_idx" ON "AgentLoopIteration"("iterationNumber");

-- CreateIndex
CREATE INDEX "AgentLoopIteration_status_idx" ON "AgentLoopIteration"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AgentLoopIteration_executionId_iterationNumber_key" ON "AgentLoopIteration"("executionId", "iterationNumber");

-- CreateIndex
CREATE INDEX "ChatMessage_agentExecutionId_idx" ON "ChatMessage"("agentExecutionId");

-- CreateIndex
CREATE INDEX "ChatbotApiCall_agentExecutionId_idx" ON "ChatbotApiCall"("agentExecutionId");

-- CreateIndex
CREATE INDEX "ChatbotApiCall_loopIterationId_idx" ON "ChatbotApiCall"("loopIterationId");

-- CreateIndex
CREATE INDEX "ChatbotApiCall_createdAt_idx" ON "ChatbotApiCall"("createdAt");

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_agentExecutionId_fkey" FOREIGN KEY ("agentExecutionId") REFERENCES "AgentExecution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatbotApiCall" ADD CONSTRAINT "ChatbotApiCall_agentExecutionId_fkey" FOREIGN KEY ("agentExecutionId") REFERENCES "AgentExecution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatbotApiCall" ADD CONSTRAINT "ChatbotApiCall_loopIterationId_fkey" FOREIGN KEY ("loopIterationId") REFERENCES "AgentLoopIteration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentExecution" ADD CONSTRAINT "AgentExecution_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentExecution" ADD CONSTRAINT "AgentExecution_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentExecution" ADD CONSTRAINT "AgentExecution_parentExecutionId_fkey" FOREIGN KEY ("parentExecutionId") REFERENCES "AgentExecution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentExecution" ADD CONSTRAINT "AgentExecution_parentLoopIterationId_fkey" FOREIGN KEY ("parentLoopIterationId") REFERENCES "AgentLoopIteration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentLoopIteration" ADD CONSTRAINT "AgentLoopIteration_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "AgentExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
