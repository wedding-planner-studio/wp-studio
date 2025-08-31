# Chatbot Messaging Infrastructure Schema

This document breaks down the essential Prisma schema models required to run the chatbot messaging infrastructure. The goal is to provide a clear understanding of the core tables and their relationships, enabling the replication of this service for a separate application.

The analysis is based on `prisma/schema.prisma` and its usage across the following services:

- `@chatbot.service.ts`
- `@chat-session-handler.ts`
- `@guest-handler-agent.ts`
- `@twilio.ts`

## Core Architectural Concepts

The infrastructure is built on four key pillars:

1.  **Multi-Tenant Configuration**: The system is designed to serve multiple `Organization` entities, each with its own isolated configuration, particularly for third-party services like Twilio.
2.  **Stateful Conversation Management**: Every conversation is tracked as a `ChatSession`, which contains a chronological history of `ChatMessage`s. This provides the context necessary for the AI to have meaningful interactions.
3.  **Agentic AI Framework**: The AI's logic is structured into `Agent`s. An `AgentExecution` tracks a single, complete run of an agent in response to a user message. This execution can contain multiple `AgentLoopIteration`s, which represent the thought process or tool usage steps of the agent. This is crucial for building complex, multi-step AI workflows.
4.  **Analytics & Debugging**: Every single API call made to the underlying Large Language Model (LLM) is logged in the `ChatbotApiCall` table. This provides an invaluable resource for debugging agent behavior, tracking costs, and analyzing performance.

## Schema Breakdown

The tables can be divided into two main categories:

- **Core Messaging & AI Infrastructure**: These are the tables that form the backbone of the messaging and AI processing system. They are generic and can be used in almost any application.
- **Business Logic & Context**: These tables provide the specific context for the chatbot. In the current application, this is centered around events and guests. **For a new application, these tables would be replaced with your own domain-specific models (e.g., `Product`, `Customer`, `Order`).**

---

### 1. Core Messaging & AI Infrastructure Models

These models are essential for the chatbot to function, regardless of the application's specific domain.

#### `TwilioCredentials`

This model stores the credentials required to interact with the Twilio API for sending and receiving messages (specifically WhatsApp). It's designed to be per-organization, allowing for a multi-tenant setup where each client brings their own Twilio account.

```prisma
// Stores encrypted Twilio credentials for each organization.
// Essential for the transport layer (sending/receiving messages).
model TwilioCredentials {
  id                 String       @id @default(cuid())
  organizationId     String       @unique // Each org has one set of credentials.
  organization       Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  subAccountSid      String
  encryptedAuthToken String // API token is encrypted for security.
  createdAt          DateTime     @default(now())
  updatedAt          DateTime     @updatedAt
}
```

#### `ChatSession`

This is the central model for a conversation. It links a phone number to an organization and contains all associated messages and agent executions. It tracks the session's state, such as its activity and timing, to handle conversation timeouts and buffered replies.

```prisma
// Represents a single conversation with a user (identified by phone number).
// It acts as a container for messages and AI agent executions.
model ChatSession {
  id             String           @id @default(cuid())
  phoneNumber    String?          // The user's phone number.
  organizationId String?          // The organization this session belongs to.
  organization   Organization?    @relation(fields: [organizationId], references: [id])
  isActive       Boolean          @default(true) // Sessions can be closed.
  isTestSession  Boolean          @default(false) // For internal testing.
  startedAt      DateTime         @default(now())
  lastMessageAt  DateTime         @default(now()) // Used for session timeout logic.
  nextReplyAt    DateTime?        // Used to buffer replies and prevent race conditions.

  // Relations to other core models
  messages        ChatMessage[]
  agentExecutions AgentExecution[]
  apiCalls        ChatbotApiCall[]

  // Example relation to business logic (can be adapted)
  guestId        String?
  guest          Guest?           @relation(fields: [guestId], references: [id])
  eventId        String?
  event          Event?           @relation(fields: [eventId], references: [id])
}
```

#### `ChatMessage`

This model stores a single message within a `ChatSession`. It tracks the direction (inbound/outbound), content, and metadata from Twilio. It can also be linked to the specific `AgentExecution` that generated an outbound message.

```prisma
// Represents a single message within a ChatSession.
model ChatMessage {
  id               String           @id @default(cuid())
  sessionId        String
  session          ChatSession      @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  direction        MessageDirection // INBOUND or OUTBOUND
  content          String           @db.Text
  twilioMessageSid String?          // For tracking with Twilio.

  // Link to the agent execution that generated this message.
  agentExecutionId String?
  agentExecution   AgentExecution? @relation("ExecutionMessages", fields: [agentExecutionId], references: [id])

  // ... other metadata fields
}

enum MessageDirection {
  INBOUND // Message from guest to system
  OUTBOUND // Message from system to guest
}
```

#### `Agent`

This model defines the configuration and behavior of an AI agent. It stores the system prompt, the model to be used (e.g., `claude-3-5-sonnet-latest`), and other parameters like `maxTokens` and `temperature`. This allows for creating multiple specialized agents for different tasks.

```prisma
// Defines a configurable AI agent.
model Agent {
  id           String         @id @default(cuid())
  name         String
  type         AgentType      @default(MAIN) // e.g., MAIN, SUB_AGENT
  systemPrompt String         @db.Text
  model        String         // e.g., "claude-3-5-sonnet-latest"
  maxTokens    Int?
  temperature  Float?

  // Relation to all executions of this agent
  executions   AgentExecution[]
}
```

#### `AgentExecution`

This table records a single, end-to-end run of an `Agent`. It's triggered by a user message and captures the entire process, including the final response and performance metrics. It supports hierarchical executions, allowing a main agent to delegate tasks to sub-agents.

```prisma
// Records a single run of an agent to fulfill a request.
// This is the parent container for loop iterations and API calls for one task.
model AgentExecution {
  id                String                @id @default(cuid())
  sessionId         String
  session           ChatSession           @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  agentId           String
  agent             Agent                 @relation(fields: [agentId], references: [id])
  status            AgentExecutionStatus  // e.g., RUNNING, COMPLETED, FAILED
  userMessage       String?               @db.Text // The message that triggered this execution.
  finalResponse     String?               @db.Text // The agent's final answer.

  // Hierarchical relations for sub-agents
  parentExecutionId   String?
  parentExecution     AgentExecution?       @relation("SubExecutions", fields: [parentExecutionId], references: [id])
  subExecutions       AgentExecution[]      @relation("SubExecutions")
  parentLoopIterationId String?
  parentLoopIteration AgentLoopIteration?   @relation("SubExecutionsInLoop", fields: [parentLoopIterationId], references: [id])

  // Performance and cost metrics
  inputTokens       Int                   @default(0)
  outputTokens      Int                   @default(0)
  executionTimeMs   Int?

  // Relations
  loopIterations    AgentLoopIteration[]
  apiCalls          ChatbotApiCall[]      @relation("ExecutionApiCalls")
  messages          ChatMessage[]         @relation("ExecutionMessages")
}
```

#### `AgentLoopIteration`

This model captures a single step or "thought" within an `AgentExecution`. An agent might loop multiple times to use different tools or refine its answer. Each loop is recorded here, providing a detailed trace of the agent's reasoning process.

```prisma
// Records a single step or "loop" within an agent's execution.
// Crucial for debugging multi-step tasks and tool usage.
model AgentLoopIteration {
  id              String              @id @default(cuid())
  executionId     String
  execution       AgentExecution      @relation(fields: [executionId], references: [id], onDelete: Cascade)
  iterationNumber Int                 // The sequence number of this step (1, 2, 3...).
  status          LoopIterationStatus // e.g., RUNNING, COMPLETED

  // The inputs and outputs of this specific step
  inputPrompt     String              @db.Text
  outputContent   String?             @db.Text
  toolCalls       Json?               // Records any tools the agent decided to call.
  toolResults     Json?               // Records the results of those tool calls.

  // Relations
  apiCalls        ChatbotApiCall[]    @relation("IterationApiCalls")
}
```

#### `ChatbotApiCall`

This table provides the most granular level of logging. It records every single API call to the LLM provider (Anthropic). It includes the exact model, token counts, and cost, which is essential for debugging, performance tuning, and financial tracking.

```prisma
// Logs every individual API call to the LLM provider for deep debugging and cost tracking.
model ChatbotApiCall {
  id                  String      @id @default(cuid())
  messageId           String      // The provider's message ID (e.g., from Anthropic).
  sessionId           String
  session             ChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  model               String      // The exact model used for this call.

  // Token and cost breakdown for this specific call
  inputTokens         Int
  outputTokens        Int
  cacheCreationTokens Int
  cacheReadTokens     Int
  estimatedCost       Float?
  responseTimeMs      Int?

  // Links back to the agent execution and iteration for precise tracing
  agentExecutionId    String?
  agentExecution      AgentExecution? @relation("ExecutionApiCalls", fields: [agentExecutionId], references: [id])
  loopIterationId     String?
  loopIteration       AgentLoopIteration? @relation("IterationApiCalls", fields: [loopIterationId], references: [id])
}
```

---

### 2. Business Logic & Context Models

These models are specific to the current event management application. When building a new service, you should replace these with your own domain models. The key takeaway is that the core infrastructure (like `ChatSession`) needs to be linked to your primary business entities.

#### `Organization`

The top-level model for multi-tenancy. All other data is scoped to an organization.

- **Role**: Tenant/Client Account.
- **Links To**: `TwilioCredentials`, `ChatSession`, `User`, `Event`.

#### `Event`

The primary context for conversations. The chatbot answers questions about a specific event.

- **Role**: Primary Subject Matter.
- **Links To**: `Organization`, `Guest`, `ChatSession`.

#### `Guest`

The end-user the chatbot is communicating with. A `ChatSession` is typically initiated by and associated with a `Guest`.

- **Role**: End-User / Contact.
- **Links To**: `Event`, `ChatSession`.

#### `User`

Represents an internal user of the system (like an event manager or admin), not the end-user guest.

- **Role**: Internal Application User.

## Conclusion & Adaptation for a New Application

To implement a similar messaging infrastructure, you should:

1.  **Copy the Core Models**: The models in the "Core Messaging & AI Infrastructure" section can be used as a robust foundation.
2.  **Define Your Business Models**: Determine what your primary business entities are. For an e-commerce site, this might be `Customer`, `Product`, and `Order`. For a support bot, it might be `Client` and `Ticket`.
3.  **Link Core to Business**: Update the relations in the core models to point to your new business models. For example, `ChatSession` should be linked to your `Customer` model instead of the `Guest` model. The `Agent`'s system prompt would then be populated with context from your `Product` or `Order` tables instead of `Event`.

This schema provides a powerful, scalable, and highly debuggable foundation for building complex, agent-based conversational AI applications.
