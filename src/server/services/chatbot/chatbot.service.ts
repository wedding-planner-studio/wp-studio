import {
  Guest,
  Venue,
  MessageDirection,
  MessageDeliveryStatus,
  Prisma,
  ChatSession,
  EventRequiredGuestConfirmation,
  EventRequiredGuestConfirmationOption,
  GuestAssignment,
  GuestGroup,
  GuestConfirmationResponse,
  Agent,
  AgentExecution,
  AgentLoopIteration,
  AgentType,
  AgentExecutionStatus,
  LoopIterationStatus,
} from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';
import { db } from '@/server/db';

import { UnauthedService, UnauthedServiceOptions } from '../unauthed-service';
import { env } from '@/env';
import { TwilioService, WhatsAppTemplate } from '../twilio';
import { GetEventDetailsTool } from './tools/get_event_details.tool';
import { GuestHandlerAgentDelegationTool } from './tools/delegate-to-guest-handler.tool';
import { MessageParam } from '@anthropic-ai/sdk/resources/messages/messages.mjs';
import { AnthropicModelAliases } from '@/lib/anthropic-models';

export type GuestContext = Guest & {
  assignment: GuestAssignment | null;
  guestGroup:
    | (GuestGroup & {
        guests: (Guest & { guestConfirmationResponses: GuestConfirmationResponse[] })[];
        _count: { guests: number };
      })
    | null;
  guestConfirmationResponses: GuestConfirmationResponse[];
};

export interface EventContext {
  eventId: string;
  eventName: string;
  date: Date;
  startTime: string;
  endTime: string;
  timezone: string;
  persons: [string, string];
  venues: Venue[];
  hasChatbotEnabled: boolean;
  requiredGuestConfirmation:
    | (EventRequiredGuestConfirmation & { options: EventRequiredGuestConfirmationOption[] })[]
    | null;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface AIResponse {
  content: {
    text: string;
    clarificationNeeded?: string | null;
  };
}

// Cache breakpoints used (MAX 4):
// - General event details
// - rsvp status per event
// - Last user's conversation's message
// - Tool definitions

// ChatbotService class
export class ChatbotService extends UnauthedService {
  // Dependencies
  private anthropicClient: Anthropic;

  // Configuration
  private maxTokens = 1024;

  private get baseSystemPrompt(): string {
    return `You are a warm, helpful AI event assistant representing a team of professional wedding and event planners.
You are speaking to a guest of one or more events.
<Your Goals>
1. To provide accurate, helpful information about the event to guests.
2. To help the event hosts effectively manage their event's guest's RSVPs. Proactively ask if the user would like to confirm their attendance status if they or any of their companions have pending RSVPs.
3. To help the event hosts effectively manage their event's guest's special needs, like noting dietary restrictions, or special requests for a specific event.
4. Some events may require additional confirmations from the guests. Proactively ask the user for their input on these topics only if the event requires it.
</Your Goals>

<Your Tone>
You always sound friendly, professional, and conversational. You respect guest privacy, and you're careful to use the correct details per event.
You are context-aware: a guest may be invited to multiple events by the same organizers, and each event may have different requirements.
You are proactive when appropriate —if a guest has pending RSVPs or missing confirmations, you ask about them naturally during the conversation without being pushy.
You understand how to use tools internally to retrieve or update event-specific information but never show tool names or technical identifiers in your replies.
</Your Tone>

<Your Capabilities>
- You have access to all the information about the event, venues, and each guest's information and RSVP status for each event.
- However, you may need to use the "get_event_details" tool to get the information you need if the user's question is not answered by the information you have access to already.
- Anything related to managing a guest's (or any of their companion's) confirmations, dietary restrictions, notes, changing companion's names, or special requests should be delegated to the "delegate_guest_handling" tool.
- Even if a guest has a special request for a *specific event* that should be reviewed by the event hosts, you should use the "delegate_guest_handling" tool to create the special request.
- How to call: "delegate_guest_handling": 
    Even though it's a natural language instruction, you should be very specific regarding the event the user is interacting with, the type of update, and the guests involved.
    If it's a reponse to a confirmation, include the confirmation information in the instruction.
</Your Capabilities>

<Your Instructions>
${this.systemInstructions}
</Your Instructions>

Remember you are representing the event hosts. You are their friendly, trusted voice. Be welcoming, professional, and supportive, making the guest feel personally taken care of.
`;
  }

  private get systemInstructions(): string {
    return this.guests.length > 1
      ? this.multiEventBaseSystemInstructions
      : this.singleGuestSyStemInstructions;
  }

  private readonly multiEventBaseSystemInstructions = `
**Important:** The user you are chatting with may be invited to multiple events hosted by the same organization. Information for each event is provided in separate blocks below (e.g., <event-details-for-EVENT_NAME>). Pay close attention to the context of the user's questions to determine which event they are referring to.

Guidelines:
1.  Be friendly, concise, and helpful, but responses should be short and to the point with a warm conversational tone.
2.  Only answer questions related to the events the user is invited to, using the specific information provided for each event.
3.  **Retrieving information about an event:** If you need specific details (like venue address or a specific FAQ answer) for an event that aren't in the initial summary:
    * If the question may apply to multiple events, before calling the tool, you can proactively call the tool for each event the guest is invited to and see if the user's question applies to any of them.
    * Events could be related to each other, however, even for events with the same hosts, they have different requirements and unique CUIDs. You can use these to identify the event the user is referring to. Make sure to use the correct CUID for the event.
    * If the question is about a specific event, you can call the tool for that event and get the specific details you need.
    * The tool will return a string with the event details.
    * The tool will also return a list of questions and answers for the event.
4.  Personalize responses using the guest's name when possible (guest details might be aggregated if they are invited to multiple events).
5.  For venue information, provide clear details about location and timing *for the relevant event*.
6.  You can answer questions about event details and guest-specific information (like RSVP status for a particular event).
7.  For guest privacy reasons, do not share information about guests other than the user asking the question.
8.  Do not include explanations or reasoning in your messages. Only reply with the message the user should see.
9.  If the user has a special request for a *specific event* that should be reviewed by the event hosts, use the "delegate_guest_handling" tool. Double-check the request details and the target event with the user before creating it.
10. **Proactively handling RSVP updates:** If you notice the user has pending RSVPs for *multiple* events (check the \`<relevant-context-about-user>\` sections provided in the user prompt), proactively ask if they would like to confirm their attendance status (e.g., Attending/Not Attending) for all those events at once. If they agree and provide a status, you should then make *separate* \`delegate_guest_handling\` tool calls for *each* event requiring an update, using the correct \`<event-id>\` for each call.
11. **Handling RSVP Updates:** For any RSVP-related tasks (confirming attendance, declining, modifying attendance for the main guest and/or their companions), use the "delegate_guest_handling" tool. This specialized tool handles all RSVP updates, including complex scenarios with multiple companions. When using this tool:
    * If multiple events are involved, you must specify which event the RSVP update is for.
    * Pass the user's natural language instruction about their RSVP intentions directly to the tool.
    * The tool will interpret the instruction and update the appropriate guest records.
12. **Handling Name Discrepancies:** Review the guest names listed in the \`<relevant-context-about-user>\` sections for each event invitation associated with this phone number.
    *   Treat minor variations like nicknames (e.g., 'Joseph' vs. 'Joe'), middle initials, or slight spelling differences as likely the same person and proceed normally.
    *   However, if you find *significantly* different names (e.g., 'Jane Doe' on one event, 'John Smith' on another), it might indicate an issue with the records.
    *   In this case, *before proceeding with requests that might depend on identity*, politely inform the user: "I notice a couple of different names associated with this number in our records (like 'Jane Doe' and 'John Smith'). To ensure I'm assisting correctly, could you please confirm your name for me?"
    *   Once the user provides clarification, use *that name* when addressing them in the conversation. Continue assisting with *all* events they are invited to, regardless of the name originally listed for that specific event record. Do *not* attempt to correct the stored records yourself.
13. **Tool Usage:**
    *   Each event has a unique <event-id>. This ID is **critical** for using tools correctly.
    *   When calling *any* tool (like the RSVP delegation tool, changing additional guest details, creating a special request), you **MUST** provide the correct \`<event-id>\` as a string for the event the user is interacting with as the **first argument** in the tool's input. For example, to delegate RSVP processing, the input should look like: \`[EVENT_ID, { instructionInNaturalLanguage: "User's RSVP instruction" }]\`.
    *   If the user's request is ambiguous about which event they mean (and a tool needs to be called), ask them to clarify which event they are referring to *before* calling the tool.
    *   **Never** mention the \`<event-id>\` in your response to the user; it's for internal use only.
    *  You may call multiple tools in a single response if needed.
  `;

  private readonly singleGuestSyStemInstructions = `
  **Important:** Only answer questions related to the event the user is invited to, using the specific information provided for that event.

  Guidelines:
1.  Be friendly, concise, and helpful, but responses should be short and to the point with a warm conversational tone.
2.  **Retrieving information about an event:** If you don't know an answer for a specific question or event, use the "get_event_details" tool to get all the available information on the event.
    * The tool will return a string with the event details.
    * The tool will also return a list of questions and answers for the event.
3.  If after fetching the event details and still don't have an answer, say so politely.
4.  Personalize responses using the guest's name when possible (guest details might be aggregated if they are invited to multiple events).
5.  For venue information, provide clear details about location and timing *only if the information is available*.
6.  You can answer questions about event details and guest-specific information (like RSVP status).
7.  For guest privacy reasons, do not share information about guests other than the user asking the question.
8.  Do not include explanations or reasoning in your messages. Only reply with the message the user should see.
10. **Proactively handling RSVP updates:** If you notice the user has pending RSVPs for the event (check the \`<relevant-context-about-user>\` sections provided in the user prompt), proactively ask if they would like to confirm their attendance status (e.g., Attending/Not Attending). If they agree and provide a status, you should then delegate the RSVP update to the "delegate_guest_handling" tool.
11. **Handling RSVP Updates:** For any RSVP-related tasks (confirming attendance, declining, modifying attendance for the main guest and/or their companions), use the "delegate_guest_handling" tool. This specialized tool handles all RSVP updates, including complex scenarios with companions. When using this tool:
    * Pass the user's clear and concise natural language instruction about their RSVP intentions directly to the tool.
    * The tool will interpret the instruction and update the appropriate guest records.
12. **Tool Usage:**
    *   The event has a unique <event-id>. This ID is **critical** for using tools correctly. It is provided in the \`<relevant-context-about-user>\` section of the user prompt.
    *   When calling *any* tool (like the RSVP delegation tool, changing additional guest details, creating a special request), you **MUST** provide the correct \`<event-id>\` as a string for the event the user is interacting with as the **first argument** in the tool's input. For example, to delegate RSVP processing, the input should look like: \`[EVENT_ID, { instructionInNaturalLanguage: "User's RSVP instruction" }]\`.
    *   If the user's request is ambiguous, ask them to clarify *before* making a tool call.
    *   **Never** mention the \`<event-id>\`, or references to tools in your response to the user; it's for internal use only.
  `;

  private readonly placeholderUserQuery = `
<information-on-user-query>No explicit user query found in this last message. Please refer to previous messages to understand the user's intent.</information-on-user-query>
  `;

  private testMode: boolean;

  private session: ChatSession;

  private guests: GuestContext[] = [];

  // Agent execution tracking
  private agent: Agent | null = null;
  private currentAgentExecution: AgentExecution | null = null;
  private currentLoopIteration: AgentLoopIteration | null = null;
  private iterationCounter = 0;

  constructor(
    params: UnauthedServiceOptions & {
      guests: GuestContext[];
      session: ChatSession;
      testMode?: boolean;
    }
  ) {
    super(params);
    this.guests = params.guests;
    this.session = params.session;
    this.testMode = params.testMode ?? false;
    // Using a more flexible approach until we install the proper package
    this.anthropicClient = new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Get or create the main chatbot agent
   */
  private async getOrCreateMainAgent(): Promise<Agent> {
    if (this.agent) return this.agent;

    // Try to find existing main agent
    let agent = await this.db.agent.findFirst({
      where: {
        type: AgentType.MAIN,
        isActive: true,
      },
    });

    if (!agent) {
      // Create main agent if it doesn't exist
      agent = await this.db.agent.create({
        data: {
          name: 'Main Chatbot Agent',
          description: 'Primary AI assistant for wedding and event management',
          type: AgentType.MAIN,
          systemPrompt: this.baseSystemPrompt,
          model: AnthropicModelAliases['claude-sonnet-4-0'],
          maxTokens: 500,
          temperature: 0.7,
          isActive: true,
        },
      });
    }

    return agent;
  }

  /**
   * Start a new agent execution
   */
  private async startAgentExecution(
    agent: Agent,
    systemPrompt: string,
    userMessage: string
  ): Promise<AgentExecution> {
    const execution = await this.db.agentExecution.create({
      data: {
        sessionId: this.session.id,
        agentId: agent.id,
        status: AgentExecutionStatus.RUNNING,
        systemPrompt,
        userMessage,
        startedAt: new Date(),
      },
    });

    this.currentAgentExecution = execution;
    this.iterationCounter = 0;
    return execution;
  }

  private async logFailedAgentExecution(
    agent: Agent,
    userMessage: string
  ): Promise<AgentExecution> {
    const execution = await this.db.agentExecution.create({
      data: {
        sessionId: this.session.id,
        agentId: agent.id,
        status: AgentExecutionStatus.FAILED,
        systemPrompt: this.baseSystemPrompt,
        userMessage: userMessage,
        startedAt: new Date(),
      },
    });

    this.currentAgentExecution = execution;
    this.iterationCounter = 0;
    return execution;
  }

  /**
   * Complete the current agent execution
   */
  private async completeAgentExecution(
    finalResponse: string,
    status: AgentExecutionStatus = AgentExecutionStatus.COMPLETED
  ): Promise<void> {
    if (!this.currentAgentExecution) return;

    // Calculate total metrics from all iterations
    const apiCalls = await this.db.chatbotApiCall.findMany({
      where: { agentExecutionId: this.currentAgentExecution.id },
    });

    // Calculate detailed token breakdown
    const tokenBreakdown = apiCalls.reduce(
      (totals, call) => ({
        inputTokens: totals.inputTokens + call.inputTokens,
        cacheCreationTokens: totals.cacheCreationTokens + call.cacheCreationTokens,
        cacheReadTokens: totals.cacheReadTokens + call.cacheReadTokens,
        outputTokens: totals.outputTokens + call.outputTokens,
      }),
      {
        inputTokens: 0,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
        outputTokens: 0,
      }
    );

    const executionTimeMs = Date.now() - this.currentAgentExecution.startedAt.getTime();

    await this.db.agentExecution.update({
      where: { id: this.currentAgentExecution.id },
      data: {
        status,
        finalResponse,
        inputTokens: tokenBreakdown.inputTokens,
        cacheCreationTokens: tokenBreakdown.cacheCreationTokens,
        cacheReadTokens: tokenBreakdown.cacheReadTokens,
        outputTokens: tokenBreakdown.outputTokens,
        executionTimeMs,
        completedAt: new Date(),
      },
    });

    this.currentAgentExecution = null;
  }

  /**
   * Start a new loop iteration
   */
  private async startLoopIteration(
    execution: AgentExecution,
    inputPrompt: string
  ): Promise<AgentLoopIteration> {
    this.iterationCounter++;

    const iteration = await this.db.agentLoopIteration.create({
      data: {
        executionId: execution.id,
        iterationNumber: this.iterationCounter,
        status: LoopIterationStatus.RUNNING,
        inputPrompt,
        startedAt: new Date(),
      },
    });

    this.currentLoopIteration = iteration;
    return iteration;
  }

  /**
   * Complete the current loop iteration
   */
  private async completeLoopIteration(
    iteration: AgentLoopIteration,
    outputContent: string,
    toolCalls?: any,
    toolResults?: any,
    status: LoopIterationStatus = LoopIterationStatus.COMPLETED
  ): Promise<void> {
    if (!iteration) return;

    const iterationTimeMs = Date.now() - iteration.startedAt.getTime();

    await this.db.agentLoopIteration.update({
      where: { id: iteration.id },
      data: {
        status,
        outputContent,
        toolCalls: toolCalls ? JSON.stringify(toolCalls) : Prisma.JsonNull,
        toolResults: toolResults ? JSON.stringify(toolResults) : Prisma.JsonNull,
        iterationTimeMs,
        completedAt: new Date(),
      },
    });

    this.currentLoopIteration = null;
  }

  /**
   * Process an incoming message and generate a response
   * @returns The generated response content
   */
  async processLastMessage(): Promise<{
    message: string;
  }> {
    // Get the main agent
    const agent = await this.getOrCreateMainAgent();

    // Get the last user message for context
    const history = await this.getConversationHistory();

    try {
      // Build context for the response (required for system prompt)
      const eventsContext = await this.getEventsContext();

      // TODO: To Throw ot Not to throw? That is the question, maybe raise an alert
      if (eventsContext.length === 0) {
        await this.logFailedAgentExecution(agent, this.getLastUserMessage(history));
        return {
          message: '',
        };
      }

      // Generate AI response with agent execution context
      const aiResponse = await this.generateResponse(eventsContext, history);

      // Record the response
      const savedResponse = await this.db.chatMessage.create({
        data: {
          sessionId: this.session.id,
          direction: MessageDirection.OUTBOUND,
          content: aiResponse.content.text,
          agentExecutionId: this.currentAgentExecution?.id,
        },
      });

      // Complete agent execution successfully
      await this.completeAgentExecution(aiResponse.content.text);

      // Return the response content
      return {
        message: savedResponse.content,
      };
    } catch (error) {
      // Mark execution as failed
      await this.completeAgentExecution('', AgentExecutionStatus.FAILED);
      throw error;
    }
  }

  /**
   * Get event context including venues and basic questions
   */
  async getEventsContext(): Promise<EventContext[]> {
    // Fetch event details including venues
    const events = await this.db.event.findMany({
      where: {
        id: {
          in: this.guests.map(guest => guest.eventId),
        },
        hasChatbotEnabled: true,
      },
      include: {
        venues: true,
        requiredGuestConfirmation: {
          include: {
            options: true,
          },
        },
      },
    });

    if (events.length === 0) {
      throw new Error(`Unable to find event for session ${this.session.id}`);
    }

    return events.map(event => ({
      eventId: event.id,
      eventName: event.name,
      date: event.date,
      startTime: event.startTime || '',
      endTime: event.endTime || '',
      timezone: event.timezone || '',
      persons: [event.person1, event.person2],
      venues: event.venues,
      hasChatbotEnabled: event.hasChatbotEnabled,
      requiredGuestConfirmation: event.requiredGuestConfirmation ?? [],
    }));
  }

  /**
   * Get conversation history for a specific session
   */
  async getConversationHistory(limit = 20): Promise<Message[]> {
    const messages = await this.db.chatMessage.findMany({
      where: { sessionId: this.session.id },
      orderBy: { createdAt: 'asc' },
    });

    const businessInitiatedMessages = await this.getBusinessInitiatedMessages();

    // Convert chat messages to common format
    const chatMessages: Message[] = messages
      .filter(msg => !!msg.content)
      .map(msg => ({
        role: msg.direction === MessageDirection.INBOUND ? 'user' : 'assistant',
        content: msg.content,
        timestamp: msg.createdAt,
      }));

    // Merge both arrays and sort by timestamp
    const allMessages = [...chatMessages, ...businessInitiatedMessages].sort((a, b) => {
      const timestampA = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp);
      const timestampB = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp);
      return timestampA.getTime() - timestampB.getTime();
    });

    // Take only the last 'limit' messages if needed
    return allMessages.slice(-limit);
  }

  /**
   * Get business-initiated messages for a guest
   */
  async getBusinessInitiatedMessages(): Promise<Message[]> {
    const messages = await this.db.messageDelivery.findMany({
      where: {
        guestId: {
          in: this.guests.map(guest => guest.id),
        },
        status: {
          in: [
            MessageDeliveryStatus.SENT,
            MessageDeliveryStatus.DELIVERED,
            MessageDeliveryStatus.READ,
          ],
        },
      },
      orderBy: {
        sentAt: 'asc',
      },
      include: {
        bulkMessage: true,
        guest: true,
      },
    });

    type MessageDeliveryWithDetails = Prisma.MessageDeliveryGetPayload<{
      include: { bulkMessage: true; guest: true };
    }> & { variables: Record<string, string> | null };

    const tempaltesHash = new Map<string, WhatsAppTemplate>();
    const twilioService = new TwilioService({
      organizationId: this.session.organizationId!,
      db: this.db,
    });

    const formatMessageContent = async (
      templateSid: string | null | undefined,
      variables: Record<string, string> | null,
      guest: Guest
    ): Promise<string> => {
      if (!templateSid) return '';

      try {
        let template: WhatsAppTemplate;
        if (tempaltesHash.has(templateSid)) {
          template = tempaltesHash.get(templateSid)!;
        } else {
          template = await twilioService.fetchWhatsAppTemplateById(templateSid);
          tempaltesHash.set(templateSid, template);
        }

        let templateText = template.description ?? '';

        // Split the text by variable placeholders and process each part
        const parts = templateText.split(/{{(\d+)}}/);
        return parts
          .map((part, index) => {
            // Even indices are regular text
            if (index % 2 === 0) return part;

            // Odd indices are variables
            const varValue = variables?.[part];
            if (!varValue) return `{{${part}}}`;

            // If using guest variable (e.g., {{guest.name}})
            if (varValue.startsWith('{{')) {
              const guestVarMatch = varValue.match(/{{guest\.(\w+)}}/);
              if (guestVarMatch && guestVarMatch[1]) {
                const guestField = guestVarMatch[1] as keyof Guest;
                const guestValue = guest[guestField];
                return guestValue?.toString() ?? `{{${part}}}`;
              }
              return varValue;
            }

            // For regular values, return the variable value
            return varValue;
          })
          .join('');
      } catch (error) {
        console.error(`Error processing template ${templateSid}:`, error);
        return '';
      }
    };

    const messagePromises = (messages as MessageDeliveryWithDetails[]).map(async msg => ({
      role: 'assistant' as const,
      content: await formatMessageContent(msg.bulkMessage?.templateSid, msg.variables, msg.guest),
      timestamp: msg.sentAt!,
    }));

    const resolvedMessages = await Promise.all(messagePromises);

    return resolvedMessages;
  }

  /**
   * Generate a response using Anthropic's API
   * @param contexts - The event contexts
   * @param history - The conversation history. This should include the user's last message.
   * @returns The AI response
   */
  async generateResponse(contexts: EventContext[], history: Message[]): Promise<AIResponse> {
    // Get the main agent
    const agent = await this.getOrCreateMainAgent();

    // Create initial messages format for Anthropic
    const messages: Anthropic.Messages.MessageParam[] = [];

    // Add the history messages
    for (const msg of history) {
      if (!msg?.content) continue;
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    // Cache conversation history if it's longer than 4 messages
    const useCacheControl = messages.length > 2;

    // Use User's last message as the query if no explicit query is given
    let lastUserMessageFound = false;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]?.role === 'user') {
        const content = messages[i]?.content;
        if (typeof content === 'string' && content.length > 0) {
          // Replace the user message with the full prompt structure
          messages[i] = {
            role: 'user',
            content: [this.buildUserPrompt(content, useCacheControl)],
          };
          lastUserMessageFound = true;
          break;
        }
      }
    }
    if (!lastUserMessageFound) {
      // If no user message was found, add a placeholder message
      messages.push({
        role: 'user',
        content: [this.buildUserPrompt(this.placeholderUserQuery)], // Cache-control not worth it for this
      });
    }

    // Guest-Context Mapping
    const GuestContextMapper = new Map<
      string, // <-- Event ID
      {
        guest: GuestContext;
        event: {
          name: string;
          hosts: string;
          additionalConfirmations: (EventRequiredGuestConfirmation & {
            options: EventRequiredGuestConfirmationOption[];
          })[];
        };
      }
    >();
    contexts.forEach(context => {
      this.guests.forEach(guest => {
        if (guest.eventId === context.eventId) {
          GuestContextMapper.set(context.eventId, {
            guest,
            event: {
              name: context.eventName,
              hosts: context.persons.join(' & '),
              additionalConfirmations: context.requiredGuestConfirmation ?? [],
            },
          });
        }
      });
    });

    // Initialize accumulator variables
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    let totalCacheWriteTokens = 0;
    let totalCacheReadTokens = 0;
    let finalContent = '';
    let lastNonEmptyTextContent = ''; // Track the last non-empty text content
    const maxLoops = 10; // Safety break to prevent infinite loops
    let loopCount = 0;

    // Build the system prompt once
    const systemPrompt = this.buildSystemPrompt(contexts);
    // Start the agent execution
    this.currentAgentExecution = await this.startAgentExecution(
      agent,
      this.stringifySystemPrompt(systemPrompt),
      this.getLastUserMessage(messages)
    );

    // Loop for handling potential sequences of tool calls
    while (loopCount < maxLoops) {
      loopCount++;

      // Start loop iteration tracking
      let currentIteration: AgentLoopIteration | null = null;
      if (this.currentAgentExecution) {
        const inputPrompt =
          messages.length > 0 ? JSON.stringify(messages[messages.length - 1]) : 'Initial prompt';
        currentIteration = await this.startLoopIteration(this.currentAgentExecution, inputPrompt);
      }

      let currentResponse: Anthropic.Messages.Message;
      let iterationInputTokens = 0;
      let iterationOutputTokens = 0;
      let iterationCacheReadTokens = 0;

      // Define tools
      const tools = [
        new GetEventDetailsTool(db, GuestContextMapper, this.testMode), // Simple Tool
        new GuestHandlerAgentDelegationTool(
          db,
          GuestContextMapper,
          this.testMode,
          this.session.id!,
          this.currentAgentExecution.id,
          this.currentLoopIteration?.id
        ), // Agent
      ];
      try {
        // Make the API call
        currentResponse = await this.anthropicClient.messages.create({
          model: AnthropicModelAliases['claude-sonnet-4-0'],
          system: systemPrompt,
          messages,
          max_tokens: this.maxTokens,
          tools: tools.map(tool => tool.toTool()),
        });

        // Store the API call data with iteration context
        await this.storeChatbotApiCall(currentResponse);

        // Accumulate token usage
        iterationInputTokens = currentResponse.usage?.input_tokens || 0;
        iterationOutputTokens = currentResponse.usage?.output_tokens || 0;
        iterationCacheReadTokens = currentResponse.usage?.cache_read_input_tokens || 0;

        totalPromptTokens += iterationInputTokens;
        totalCompletionTokens += iterationOutputTokens;
        totalCacheWriteTokens += currentResponse.usage?.cache_creation_input_tokens || 0;
        totalCacheReadTokens += iterationCacheReadTokens;
      } catch (error) {
        console.error(`[Chatbot Loop ${loopCount}] Error calling Anthropic API:`, error);

        // Complete iteration with error status
        if (currentIteration) {
          await this.completeLoopIteration(
            currentIteration,
            '',
            null,
            null,
            LoopIterationStatus.FAILED
          );
        }

        // If the first call fails, return an error message
        if (loopCount === 1) {
          return {
            content: {
              text: 'Al parecer hubo un error al generar la respuesta. Favor de contactar a los anfitriones del evento para obtener la información que necesita.',
              clarificationNeeded: null,
            },
          };
        } else {
          // If a follow-up call fails, use the content from the *previous* successful response
          console.warn('Using content from the previous loop iteration due to API error.');
          finalContent = lastNonEmptyTextContent;
          break; // Exit loop and return previous content
        }
      }

      // Process the response content
      const toolCallsInResponse: Anthropic.Messages.ToolUseBlock[] = [];
      let textContentInResponse = '';
      const assistantMessageContent: Anthropic.Messages.MessageParam['content'] = [];

      // Handle empty content array
      if (!currentResponse.content || currentResponse.content.length === 0) {
        console.warn(`[Chatbot Loop ${loopCount}] Empty content array in response`);

        // If this is after a tool call and we have previous non-empty text content, use that
        if (loopCount > 1 && lastNonEmptyTextContent) {
          finalContent = lastNonEmptyTextContent;
          break; // Exit the loop
        }

        // If this is the first loop with empty content, provide a default message
        if (loopCount === 1) {
          finalContent =
            'Lo siento, hubo un problema al generar una respuesta. Por favor, intenta tu pregunta de nuevo.';
          break;
        }

        // For any other cases of empty content, continue to next iteration
        continue;
      }

      for (const contentBlock of currentResponse.content) {
        if (contentBlock.type === 'text') {
          textContentInResponse += contentBlock.text;
          assistantMessageContent.push(contentBlock);

          // If this text content is not empty, update our tracked last non-empty text
          if (contentBlock.text.trim()) {
            lastNonEmptyTextContent = contentBlock.text.trim();
          }
        } else if (contentBlock.type === 'tool_use') {
          toolCallsInResponse.push(contentBlock);
          assistantMessageContent.push(contentBlock);
        }
      }

      // Add the full assistant response (text + tool calls) to messages history
      if (assistantMessageContent.length > 0) {
        messages.push({ role: 'assistant', content: assistantMessageContent });
      }

      // If there are no tool calls, we are done
      if (toolCallsInResponse.length === 0) {
        finalContent = textContentInResponse.replace(/\(Note:.*?\)$/i, '').trim();

        // Complete iteration successfully (no tool calls)
        if (currentIteration) {
          await this.completeLoopIteration(currentIteration, textContentInResponse, null, null);
        }

        break; // Exit the loop
      }

      // --- Handle Tool Calls ---
      const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
      for (const toolCall of toolCallsInResponse) {
        const toolUse = toolCall as unknown as {
          type: string;
          id: string;
          name: string;
          input: {
            eventId: string;
            [key: string]: string | number; // Assuming other inputs are string/number
          };
        };

        const toolInstance = tools.find(tool => tool.name === toolUse.name);
        let toolCallResultContent = '';

        if (!toolInstance) {
          console.error(`[Chatbot Loop ${loopCount}] Tool with name ${toolUse.name} not found`);
          toolCallResultContent = `Error: Tool ${toolUse.name} not found.`;
        } else {
          try {
            const { eventId, ...inputArgs } = toolUse.input;
            const toolCallResult = await toolInstance.execute(eventId, inputArgs as any);
            toolCallResultContent =
              typeof toolCallResult === 'string'
                ? toolCallResult
                : `${toolCallResult.content.text}${toolCallResult.content.clarificationNeeded ? `\n\nClarification Needed: ${toolCallResult.content.clarificationNeeded}` : ''}`;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(
              `[Chatbot Loop ${loopCount}] Error executing tool ${toolUse.name}:`,
              errorMessage
            );
            toolCallResultContent = `Error executing tool ${toolUse.name}: ${errorMessage}`;
          }
        }

        // Add the tool result block to the list for the next API call
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: toolCallResultContent,
        });
      }

      // Add all tool results to the messages history for the next loop iteration
      if (toolResults.length > 0) {
        messages.push({ role: 'user', content: toolResults });
      }

      // Complete iteration with tool calls
      if (currentIteration) {
        await this.completeLoopIteration(
          currentIteration,
          textContentInResponse,
          toolCallsInResponse.length > 0 ? JSON.stringify(toolCallsInResponse) : null,
          toolResults.length > 0 ? JSON.stringify(toolResults) : null
        );
      }

      // If we've reached max loops, stop and use the last text content we got
      if (loopCount >= maxLoops) {
        console.warn(`[Chatbot Loop ${loopCount}] Max tool call loops (${maxLoops}) reached.`);
        finalContent =
          textContentInResponse.replace(/\(Note:.*?\)$/i, '').trim() ||
          'Maximum tool processing depth reached. Please try rephrasing your request.';
        break;
      }
    } // End of while loop

    // Final check - if we have no final content but we do have last non-empty text, use that
    if (!finalContent && lastNonEmptyTextContent) {
      finalContent = lastNonEmptyTextContent;
    }

    // Return the final accumulated results
    return {
      content: {
        text: finalContent,
        clarificationNeeded: null,
      },
    };
  }

  /**
   * Build the general system prompt + specific event context (per event)
   * and the User's RSVP status for each event.
   * - General system prompt + general event context is Cached as 1 block
   * - Guest + RSVP context is Cached as another block
   */
  private buildSystemPrompt(contexts: EventContext[]): Anthropic.Messages.TextBlockParam[] {
    const systemPrompt: Anthropic.Messages.TextBlockParam[] = [
      {
        type: 'text',
        text: this.baseSystemPrompt,
      },
    ];
    const eventsDetailsMapper = new Map<string, Record<string, string>>();
    contexts.forEach((context, index) => {
      const {
        eventId,
        eventName,
        date,
        startTime,
        endTime,
        timezone,
        persons,
        venues,
        requiredGuestConfirmation,
      } = context;

      // Map eventId to event details
      eventsDetailsMapper.set(eventId, {
        eventName,
        hosts: persons.join(' & '),
      });

      // Format event date and time using the event's timezone
      let formattedDateTime = '';
      try {
        // Create a date formatter with the event's timezone
        const dateOptions: Intl.DateTimeFormatOptions = {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: timezone || 'UTC',
        };

        const formattedDate = new Intl.DateTimeFormat('en-US', dateOptions).format(date);

        // Add formatted time if available
        let timeInfo = '';
        if (startTime) {
          if (endTime) {
            timeInfo = ` from ${this.formatTime(startTime)} to ${this.formatTime(endTime)} ${timezone}`;
          } else {
            timeInfo = ` at ${this.formatTime(startTime)} ${timezone}`;
          }
        }

        formattedDateTime = `${formattedDate}${timeInfo}`;
      } catch (error) {
        console.error('Error formatting date and time:', error);
        formattedDateTime = date.toDateString();
      }

      // Format venue information in a structured way
      const venueInfo = venues
        .map(venue => {
          const venuePurpose = this.formatVenuePurpose(venue.purpose);
          return `${venuePurpose}: ${venue.name}${venue.address ? `\n   Address: ${venue.address}` : ''}`;
        })
        .join('\n\n');

      // Construct the context-rich prompt
      let eventDetails = `
<event-details-for-${eventName} id="${eventId}">
ID:${eventId}
Note: The event ID is used to identify the event for tool calls. Not relevant for the user, so never mention it in the response.
<tool-call-instructions>
Use ${eventId} for tool calls related to ${eventName}. E.g. if the user asks about anything related specifically to ${eventName}, use the "get_event_details" tool with ${eventId} as the first argument.
</tool-call-instructions>
<general-event-details>
Event name: ${eventName}
Date and Time: ${formattedDateTime}
Hosts: ${persons[0]} & ${persons[1]}
</general-event-details>
<venues-details>
${venueInfo}
</venues-details>
</event-details-for-${eventName} id="${eventId}">
`;
      if (requiredGuestConfirmation?.length && requiredGuestConfirmation.length > 0) {
        eventDetails += `
<additional-guest-confirmation-instructions>
${eventName} (ID: ${eventId}) requires additional confirmations from the guests. Proactively ask the user for their input on these topics. If the user has already responded to a confirmation or specifically not attending the event, you can skip asking about it again.
${requiredGuestConfirmation
  .map(
    confirmation => `
    <confirmation-instructions-for-${confirmation.label}>
    Topic:${confirmation.label}
   A good way to ask about this topic is this example:
   ${confirmation.bestWayToAsk}
   <confirmation-options>
   ${confirmation.options.map(option => option.label).join(', ')}
   </confirmation-options>
   <confirmations-until-now>
   ${this.guests
     .filter(guest => guest.eventId === eventId)
     .map(
       guest => `
   <guest>
   Name: ${guest.name} (RSVP:${guest.status})
  ${(() => {
    const responseForThisConfirmation = guest.guestConfirmationResponses.find(
      response => response.eventRequiredGuestConfirmationId === confirmation.id
    );
    if (responseForThisConfirmation) {
      return `${guest.name} responded: "${responseForThisConfirmation.customResponse}"  ${responseForThisConfirmation.selectedOptionId ? `mapped to ${confirmation.options.find(option => option.id === responseForThisConfirmation.selectedOptionId)?.label}` : ''}
      `;
    }
    return `${guest.name} has not responded yet`;
  })()}
    <guest-companions>
    ${guest.guestGroup?.guests
      .map(
        companion => `
    <companion>
    Companion name:${companion.name} (RSVP:${companion.status})
    ${(() => {
      const responseForThisConfirmation = companion.guestConfirmationResponses.find(
        response => response.eventRequiredGuestConfirmationId === confirmation.id
      );
      if (responseForThisConfirmation) {
        return `"${responseForThisConfirmation.customResponse}"  ${responseForThisConfirmation.selectedOptionId ? `mapped to ${confirmation.options.find(option => option.id === responseForThisConfirmation.selectedOptionId)?.label}` : ''}
      `;
      }
      return `${companion.name} has not responded yet`;
    })()}
      ${companion.dietaryRestrictions ? `Dietary Restrictions: ${companion.dietaryRestrictions}` : ''}
      ${companion.notes ? `Notes: ${companion.notes}` : ''}
    </companion>
    `
      )
      .join('\n')}
    </guest-companions>
   </guest>
   `
     )
     .join('\n')}
   </confirmations-until-now>
   </confirmation-instructions-for-${confirmation.label}>
   `
  )
  .join('\n')}
Once you have their input, please use the "delegate_guest_handling" with clear instructions on how to handle the guest's response.
Please note that the user may have companions with dietary restrictions or notes. Consider these notes when deciding how to handle the guest's response.
If there's already a note or dietary restrictions, specific questions about the companion's response may not necessary.
</additional-guest-confirmation-instructions>
`;
      }

      const eventDetailsBlock: Anthropic.Messages.TextBlockParam = {
        type: 'text',
        text: eventDetails,
      };
      if (index === contexts.length - 1) {
        eventDetailsBlock.cache_control = { type: 'ephemeral' };
      }
      systemPrompt.push(eventDetailsBlock);
    });

    // Engance RSVP for each guest
    const rsvpEnhancement = `
    <rsvp-status-per-event>
    Use the following information to determine the RSVP status of ${this.guests.length > 1 ? 'each guest' : 'the guest'}:
    ${this.guests.map(
      guest => `
      <event-${guest.eventId}-${eventsDetailsMapper.get(guest.eventId)?.eventName}>
        <context-about-${guest.name}-specific-${eventsDetailsMapper.get(guest.eventId)?.eventName}>
          "${guest.name}" is how ${eventsDetailsMapper.get(guest.eventId)?.hosts ?? 'the hosts'} refer to the guest you are speaking to.
          RSVP Status: ${guest.status}
          ${guest.inviter ? `Invited by: ${guest.inviter}` : 'No inviter specified'}
        </context-about-${guest.name}-specific-${eventsDetailsMapper.get(guest.eventId)?.eventName}>
        <context-about-${guest.name}-and-their-companions>
          ${guest.hasMultipleGuests ? `${guest.name} is allowed to bring ${guest.guestGroup?._count.guests} guests to the event.` : `${guest.name}'s invitation is for him/herself only.`}
          ${
            guest.hasMultipleGuests
              ? `
          ${guest.name} may decide to bring a different companions to the event (up to ${guest.guestGroup?._count.guests} guests). If they do, they can opt to specify the name of their companion(s).
          As a last resort, ${guest.name} may decide to cancel some or all of their companions. If they do, please double check that they are not just asking to change their plus one name. Most of the time, they will prefer to bring a different plus one to the event.
        `
              : ''
          }
              ${
                guest.hasMultipleGuests
                  ? `
              <companions-for-${guest.name}>
              If any of ${guest.name}'s companions have not yet RSVPed, please confirm with ${guest.name} whether they will be attending the event.
              Note that some names may appear as "Guest 1" or "Invitado 1" or similar. This is normal, they are not the actual names of the guests, if applicable you could ask ${guest.name} to confirm the name of the companion they are asking about.
              ${guest.guestGroup?.guests.map(companion => `${companion.name} (${companion.status})`).join('\n')}
              <companions-for-${guest.name}-dietary-restrictions>
              ${guest.guestGroup?.guests.map(companion => `${companion.name} (${companion.dietaryRestrictions ?? 'No dietary restrictions'})`).join('\n')}
              </companions-for-${guest.name}-dietary-restrictions>
              </companions-for-${guest.name}>
              `
                  : ''
              }

        </context-about-${guest.name}-and-their-companions>
      </event-${guest.eventId}-${eventsDetailsMapper.get(guest.eventId)?.eventName}>
    `
    )}
    </rsvp-status-per-event>
    `;
    systemPrompt.push({
      type: 'text',
      text: rsvpEnhancement,
      cache_control: { type: 'ephemeral' },
    });

    return systemPrompt;
  }

  /**
   * Format time string from 24-hour format to 12-hour format
   */
  private formatTime(timeString: string): string {
    if (!timeString || !timeString.includes(':')) {
      return timeString;
    }

    try {
      const parts = timeString.split(':');
      if (parts.length < 2) {
        return timeString;
      }

      // We've checked parts.length above, so these should be safe
      const hourString = parts[0] || '0';
      const minuteString = parts[1] || '00';

      const hours = parseInt(hourString, 10);
      const minutes = parseInt(minuteString, 10);

      if (isNaN(hours) || isNaN(minutes)) {
        return timeString;
      }

      const period = hours >= 12 ? 'PM' : 'AM';
      const formattedHours = hours % 12 || 12; // Convert 0 to 12 for 12 AM

      return `${formattedHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    } catch (error) {
      console.error('Error formatting time:', error);
      return timeString;
    }
  }

  /**
   * Format venue purpose to be more human-readable
   */
  private formatVenuePurpose(purpose: string): string {
    // Convert ENUM_STYLE_VALUE to "Title Case Description"
    const formatted = purpose
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, char => char.toUpperCase());

    return formatted;
  }

  async closeSessionForUser(guestId: string): Promise<void> {
    await this.db.chatSession.updateMany({
      where: { guestId },
      data: { isActive: false },
    });
  }

  private buildUserPrompt(query: string, useCacheControl = false) {
    const prompt = `
    <user-question>
    ${query}
    </user-question>

    <instructions>
    - Do not expose XML tags in the response messages.
    - Do not include explanations or reasoning in your messages. Only reply with the message the user should see in plain natural language.
    - Use "delegate_guest_handling" tool to update anything related to RSVPs, confirmations or any guest related requests.
    - When the user's message is a clear confirmation of their attendance or a response to an additional confirmation question, it's not necessary to confirm before using the "delegate_guest_handling" tool.
    </instructions>

    <proactive-confirmation-instructions>
    - If the user has pending RSVPs for one or multiple events, proactively ask if they would like to confirm their attendance status for all those events at once.
    - If you notice that the user has companions with pending RSVPs, proactively ask if they would like to confirm their attendance status for those companions as well. Note that some names may appear as "Guest 1", "Invitado 1" or similar. This is normal, they are not the actual names of the guests (please refer to them as "additional guests" or similar rather than "Guest 1"). If applicable you could ask the user to confirm the name of the companion they are asking about.
    - If the event requires additional confirmations from the guests, proactively ask if they would like to confirm their response for that. If they provide a repsonse, you should make a \`additional_confirmations\` tool call, using the correct \`<event-id>\` for the call.
    </proactive-confirmation-instructions>

    <order-of-operations>
    To avoid overwhelming the user with too many options, and to keep the conversation flowing and short, follow this order of operations:
    1. First, check if the user's query is a request for information about an event. If so, provide the information requested.
    2. If the user's query is not about an event, check if they have any pending RSVPs for any events (theirselves or their companions).
    3. If they do, proactively ask if they would like to confirm their attendance or a specific companion's attendance.
    4. If their RSVPs are confirmed, check if there is any additional confirmation needed for the event.
    5. If there is no additional confirmation needed, you can let the user know that you can also help with:
      - Noting any dietary restrictions
      - Answering questions about the event
    Avoid asking too many questions at once. Instead, based on the context of the conversation, ask one or two questions at a time following the order of operations above.
    If you note you are being repetitive, but still need to ask the question, you can ask it in a different way or just let the user know they can reply whenever they are ready.
    </order-of-operations>
    `;
    const content: Anthropic.Messages.TextBlockParam = {
      type: 'text',
      text: prompt,
      cache_control: useCacheControl ? { type: 'ephemeral' } : undefined,
    };
    return content;
  }

  async generateResponseForUnknownGuest(query: string): Promise<AIResponse> {
    // Call Anthropic API
    let response: Anthropic.Messages.Message;
    try {
      response = await this.anthropicClient.messages.create({
        model: AnthropicModelAliases['claude-3-5-haiku-latest'],
        system:
          'Eres un asistente útil para eventos especiales (boda, cumpleaños, etc.). Sin embargo, no has podido identificar al invitado. Por lo tanto, solo necesitas instruir al usuario para que contacte a los anfitriones del evento y obtenga la información que necesita. Mantén tu respuesta breve y directa. No incluyas ningún otro texto aparte de la instrucción. Indica claramente que no puedes identificar al invitado mediante el número de teléfono y que esa es la razón por la cual no puedes responder a la pregunta. Un buen ejemplo de respuesta sería: "Lo siento, no reconozco este número de teléfono. Si eres un invitado, por favor asegúrate de usar el número que proporcionaste durante el registro."',
        messages: [
          {
            role: 'user',
            content: `Soy un invitado intentando contactar a los anfitriones del evento. Tengo la siguiente pregunta: ${query}`,
          },
        ],
        max_tokens: 80,
      });
    } catch (error) {
      console.error('Error calling Anthropic API:', error);
      return {
        content: {
          text: 'Lo siento, no pude generar una respuesta debido a un error técnico.',
          clarificationNeeded: null,
        },
      };
    }

    // Extract text content from the response
    let textContent = '';
    try {
      textContent = response.content
        .filter(content => content.type === 'text')
        .map(content => content.text)
        .join('');
    } catch (error) {
      console.error('Error extracting text from response:', error);
      textContent = "I'm sorry, I couldn't generate a proper response.";
    }

    return {
      content: {
        text: textContent,
        clarificationNeeded: null,
      },
    };
  }

  // method to store API call data
  private async storeChatbotApiCall(response: Anthropic.Messages.Message) {
    try {
      await this.db.chatbotApiCall.create({
        data: {
          messageId: response.id,
          sessionId: this.session.id,
          type: response.type,
          role: response.role,
          model: response.model,
          content: response.content ? JSON.stringify(response.content) : '',
          stopReason: response.stop_reason,
          stopSequence: response.stop_sequence,
          inputTokens: response.usage?.input_tokens ?? 0,
          cacheCreationTokens: response.usage?.cache_creation_input_tokens ?? 0,
          cacheReadTokens: response.usage?.cache_read_input_tokens ?? 0,
          outputTokens: response.usage?.output_tokens ?? 0,
          // Add agent execution context if available
          agentExecutionId: this.currentAgentExecution?.id,
          loopIterationId: this.currentLoopIteration?.id,
        },
      });
    } catch (error) {
      console.error('Error storing chatbot API call metadata:', error);
      // Non-blocking - we don't want to fail the main flow if this storage fails
    }
  }

  private getLastUserMessage(messages: MessageParam[]): string {
    const consecutiveUserMessages: string[] = [];

    // Collect consecutive user messages from the end
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message?.role === 'user') {
        // Handle both string and array content
        let messageText = '';
        if (typeof message.content === 'string') {
          messageText = message.content;
        } else if (Array.isArray(message.content)) {
          // Extract text from content blocks
          messageText = message.content
            .filter(block => block.type === 'text')
            .map(block => block.text)
            .join(' ');
        }

        if (messageText.trim()) {
          consecutiveUserMessages.unshift(messageText); // Add to beginning
        }
      } else {
        break;
      }
    }

    return consecutiveUserMessages.join(' '); // Join with space or '\n'
  }

  private stringifySystemPrompt(systemPrompt: Anthropic.Messages.TextBlockParam[]): string {
    return systemPrompt.map(prompt => prompt.text).join('\n');
  }
}
