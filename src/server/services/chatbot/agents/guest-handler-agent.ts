import {
  PrismaClient,
  EventRequiredGuestConfirmation,
  EventRequiredGuestConfirmationOption,
  Venue,
  AgentExecution,
  AgentLoopIteration,
  Agent,
  AgentExecutionStatus,
  AgentType,
  LoopIterationStatus,
  Prisma,
} from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';
import { db } from '@/server/db';
import { env } from '@/env';
import { AIResponse, GuestContext } from '../chatbot.service';
import { AdditionalConfirmationsTool } from '../tools/additional-confirmations.tool';
import { CreateSpecialRequestFromGuestTool } from '../tools/create-special-request-from-guest.tool';
import { UpdateDietaryRestrictionsTool } from '../tools/update_dietary_retrictions.tool';
import { AddNotesToGuestTool } from '../tools/add_notes_to_guest.tool';
import { UpdateCompanionNameTool } from '../tools/update-companion-name';
import { UpdateRsvpTool } from '../tools/update-rsvp.tool';
import { AnthropicModelAliases } from '@/lib/anthropic-models';

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

export interface RsvpUpdateResult {
  success: boolean;
  message: string; // e.g., "RSVP updated successfully for John Doe." or "Could not find guest Jane Doe."
  updatedGuests: { guestId: string; status: string }[]; // List of guests whose RSVP was updated
  clarificationNeeded?: string; // If ambiguity is detected, a question to ask the user
}

export class GuestHandlerAgent {
  private db: PrismaClient;
  private anthropicClient: Anthropic;

  private agent: Agent | null = null;
  private currentAgentExecution: AgentExecution | null = null;
  private currentLoopIteration: AgentLoopIteration | null = null;
  private iterationCounter = 0;

  constructor(
    protected readonly eventId: string,
    protected readonly GuestContextHash: Map<
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
    >,
    protected readonly chatSessionId: string,
    protected readonly parentExecutionId: string | null = null,
    protected readonly parentLoopIterationId: string | null = null,
    protected readonly isTestSession: boolean
  ) {
    this.db = db;
    this.anthropicClient = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }

  readonly systemPrompt = `
## Your Role:
You are a specialized assistant in a multi-agent system for managing event invitations.  
Your core responsibility is to interpret natural language instructions related to guest updates and apply these changes using structured tools provided to you.
You are not directly talking to the user.
You are talking to the agent orchestrating the conversation with the user.
Any feedback on your responses will be passed back to the agent orchestrating the conversation with the user.

## Core Concepts & Context:
- Every guest has a CUID and belongs to one of three categories:
  1. Solo guest — invited alone.
  2. Guest with a plus one — invited with a single unnamed or named companion.
  3. Guest with multiple companions — such as families or group invitations. Companions may or may not have names.
- Companions are also stored as distinct guests with unique CUIDs, even when unnamed, but they are "managed" as companions of the main guest.
- Instructions may reference guests directly (e.g., by name) or indirectly (e.g., "his daughter", "plus one", "the child").

## Your Tasks:
1. Interpret the instruction and determine if any of the available tools should be invoked for each guest or companion mentioned.
2. Identify and match guests using names or relationships.
   > When references are indirect (e.g., "his mom", "the child"), make your best effort to resolve them based on the provided context.
   > If some companions are likely part of the group but not mentioned, include a 'followUpSuggestion'.
3. Return a structured object with all applicable updates.

## Fallback Strategy:
If instructions are ambiguous, incomplete, or refer to unidentified guests:
- Do **not** make any tool calls until clarified. Instead, end the turn by prompting the agent orchestrating the conversation with the user to clarify the instruction.
- Include a 'clarificationRequest' explaining what additional information is needed.
- If only some companions are mentioned and others likely need updates, include a 'followUpSuggestion'.
- Clearly indicate that **no changes were made**, and **end the turn** by prompting the user to clarify the instruction.

## Output Format:
Always return an object with one or more of the following keys:
{
  "actionsExecuted": [
    {
      "action": "update_rsvp",
      "summary": "Updated RSVP status for guest (name) with CUID 'abc123' to 'DECLINED'"
    },
    {
      "action": "update_dietary_restrictions",
      "summary": "Updated dietary restrictions for guest (name) with CUID 'def456' to 'vegetarian'"
    }
  ],
  "clarificationRequest": "Could you please confirm who 'the child' refers to?",
  "followUpSuggestion": "Would you like to update the other companions in the group as well?"
}

Available Tools:
- update_companion_name – Used to swap one guest for another (e.g., replacing a companion) or simply update the name of a guest.
- update_dietary_restrictions
- update_rsvp
- update_notes
- additional_confirmations
- create_special_request_from_guest

You can invoke multiple tools in a single turn.

## Smart RSVP Handling:
- If updating the RSVP status of a guest and notice different statuses for companions, a good follow up suggestion is to ask the user if they want to update the RSVP status of all companions in the same group.
- You cannot directly add new guests, but you can cleverly leverage existing companions and just update their names. Use the create_special_request_from_guest as a last resource
- A confirmation for a guest that has responded and "declined" could be a mistake and should be double checked.
- If a companion's name has been updated, make sure to double check the rsvp status and confirmations of this new companion. (if it's a new companion, the record may have a missleading status or a wrong dietary restriction. Ignore if the change of name is refering to the same person)

### Instruction Examples You Can Handle:
"Mary prefers to drink tequila."
→ If it's a response to a confirmation question, use additional_confirmations. Otherwise, use update_notes.

"My wife is no longer coming with me, but I am bringing my cousin Ana instead."
→ Use update_companion_name. (Note how you can cleverly leverage existing companions and just update their names)

"Juan is vegetarian and Memo will be arriving late."
→ Use update_dietary_restrictions for Juan and update_notes for Memo.

"The plus one has no dietary restrictions. The guest doesn’t eat dairy."
→ Use update_dietary_restrictions for the main guest only. No changes to the companion are really needed for this case.

"Gaby is gluten-free. Please note that Dan will bring a wheelchair."
→ Use update_dietary_restrictions for Gaby, and update_notes for Dan.

"Note that Ana and her guest are arriving separately."
→ Use update_notes for Ana.

"I'm not bringing my girlfriend; I'm bringing my friend Ana instead."
→ Use update_companion_name to replace the (possibly unnamed) girlfriend with Ana.

"Memo doesn't eat red meat."
→ Use update_dietary_restrictions for Memo.
`;

  private buildUserPrompt(instruction: string, mainGuest: GuestContext, eventId: string) {
    return `
  Event Name: ${this.GuestContextHash.get(eventId)?.event?.name}
  Event ID: ${eventId}
  <user-context>
  Main Guest: ${mainGuest.name} (ID: "${mainGuest.id}")
  RSVP status: ${mainGuest.status}
  Current dietary restrictions: ${mainGuest.dietaryRestrictions || 'None'}
  Current notes: ${mainGuest.notes || 'None'}
  Number of companions: ${
    mainGuest.hasMultipleGuests
      ? mainGuest.guestGroup?.guests.length === 1
        ? `1 ${mainGuest.name} with a "plus one"`
        : `${mainGuest.name} plus ${mainGuest.guestGroup?.guests.length ? mainGuest.guestGroup?.guests.length : 0} companions`
      : '0 (solo guest)'
  }
  ${
    mainGuest.guestGroup?.guests.length
      ? `Companions:
  - ${mainGuest.guestGroup?.guests.map(g => `${g.name} (ID: "${g.id}") – rsvp: ${g.status}, dietary: ${g.dietaryRestrictions || 'None'}, notes: ${g.notes || 'None'}`).join('\n')}`
      : 'No companions known'
  }
  ${
    this.GuestContextHash.get(eventId)?.event?.additionalConfirmations?.length
      ? `
<additional-guest-confirmation-instructions>
${this.GuestContextHash.get(eventId)?.event?.name} requires additional confirmations from the guests.
The instruction may be an answer to one of these confirmation questions.
Here is the list of confirmation questions and the current responses from the guests:
${this.GuestContextHash.get(eventId)
  ?.event?.additionalConfirmations.map(
    confirmation => `
    <confirmation-instructions-for-${confirmation.label}>
    Confirmation QuestionID: ${confirmation.id} (use this ID for the "additional_confirmations" tool, do not ask the user for this ID)
    Topic:${confirmation.label}
   The user could have been asked about this topic in the following way: ${confirmation.bestWayToAsk}
   <confirmation-options>
   ${confirmation.options.map(option => `Label: ${option.label} (Confirmation Option ID: ${option.id})`).join('\n')}
   </confirmation-options>
   <confirmations-until-now>
   <guest>
   Guest ID: ${mainGuest.id}
   Name: ${mainGuest.name}
  ${(() => {
    const responseForThisConfirmation = mainGuest.guestConfirmationResponses.find(
      response => response.eventRequiredGuestConfirmationId === confirmation.id
    );
    if (responseForThisConfirmation) {
      return `${mainGuest.name} responded: ${responseForThisConfirmation.customResponse}  ${responseForThisConfirmation.selectedOptionId ? `mapped to ${responseForThisConfirmation.selectedOptionId}` : ''}
      `;
    }
    return `${mainGuest.name} has not responded yet`;
  })()}
    <guest-companions>
    If necessary, you can update the name of a companion using the "update_companion_name" tool with the companion's ID.
    ${mainGuest.guestGroup?.guests
      .map(
        companion => `
    <companion>
    Companion ID: ${companion.id}
    Companion name:${companion.name}
    ${(() => {
      const responseForThisConfirmation = companion.guestConfirmationResponses.find(
        response => response.eventRequiredGuestConfirmationId === confirmation.id
      );
      if (responseForThisConfirmation) {
        return `${responseForThisConfirmation.customResponse}  ${responseForThisConfirmation.selectedOptionId ? `mapped to ${responseForThisConfirmation.selectedOptionId}` : ''}
      `;
      }
      return `${companion.name} has not responded yet`;
    })()}
    </companion>
    `
      )
      .join('\n')}
    </guest-companions>
   </guest>
   </confirmations-until-now>
   </confirmation-instructions-for-${confirmation.label}>
   `
  )
  .join('\n')}
Once you have their input, please use the "delegate_guest_handling" with clear instructions on how to handle the guest's response.
</additional-guest-confirmation-instructions>
    `
      : ''
  }
  </user-context>
  
  <instruction>
  "${instruction}"
  </instruction>

  <response-behavior>
  - Your response must be strictly functional and structured:
    - Return a "updates" list showing which guests had their details changed.
    - The "updates" list must be a list of objects with the following properties:
      - "guestName": The name of the guest whose details were updated.
      - "id": The guest's unique identifier.
    - If only a subset of companions were updated and others were still pending or not mentioned, include a "followUpSuggestion" message like:
      > "Some companions still have no dietary restrictions or notes provided. If you haven’t asked the user about these yet, now may be a good time to follow up."
 ${
   this.GuestContextHash.get(eventId)?.event?.additionalConfirmations?.length
     ? `
  - If you notice that there are additional confirmations required, and the user hasn't answered them yet, include a "followUpSuggestion" message like:
    > "There are additional confirmations required. If you haven't asked the user about these yet, this could be a good moment to follow up."
  - Note that "notes" or "comments" on users could be actually confirmation responses for event specific "required confirmations" (e.g. "I prefer tequila" to a confirmation question about alcohol preferences).
  `
     : ''
 }
    - If any guest matching is unclear, include a "clarificationRequest" with a message the orchestrator can pass back to the user.
  - Never include open-ended phrases like "Is there anything else I can help you with?"
  - You are not directly talking to the user.
  - Your response will be parsed or forwarded by the agent orchestrating the conversation with the user.
  </response-behavior>
  `;
  }

  /**
   * Parses the RSVP instruction using an LLM to determine guest intentions.
   * @param instruction The natural language instruction from the user.
   * @param mainGuest The primary guest this instruction is associated with.
   * @param eventId The ID of the event this instruction pertains to.
   */
  public async handleInstructionWithLLM(
    instruction: string,
    mainGuest: GuestContext
  ): Promise<AIResponse> {
    try {
      // Get the main agent
      const agent = await this.getOrCreateMainAgent();

      const userPrompt = this.buildUserPrompt(instruction, mainGuest, this.eventId);
      const messages: Anthropic.Messages.MessageParam[] = [{ role: 'user', content: userPrompt }];

      // Start the agent execution
      this.currentAgentExecution = await this.startAgentExecution(
        agent,
        this.systemPrompt,
        userPrompt
      );

      // Initialize accumulator variables
      let totalPromptTokens = 0;
      let totalCompletionTokens = 0;
      let totalCacheWriteTokens = 0;
      let totalCacheReadTokens = 0;
      let finalContent = '';
      let lastNonEmptyTextContent = ''; // Track the last non-empty text content
      const maxLoops = 10; // Safety break to prevent infinite loops
      let loopCount = 0;
      const tools = [
        new UpdateCompanionNameTool(this.db, this.GuestContextHash, this.isTestSession), // Simple Tool
        new UpdateDietaryRestrictionsTool(this.db, this.GuestContextHash, this.isTestSession), // Simple Tool
        new UpdateRsvpTool(this.db, this.GuestContextHash, this.isTestSession), // Simple Tool
        new AdditionalConfirmationsTool(this.db, this.GuestContextHash, this.isTestSession), // Simple Tool
        new AddNotesToGuestTool(this.db, this.GuestContextHash, this.isTestSession), // Simple Tool
        new CreateSpecialRequestFromGuestTool(this.db, this.GuestContextHash, this.isTestSession), // Simple Tool
      ];

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

        try {
          // Make the API call
          currentResponse = await this.anthropicClient.messages.create({
            model: 'claude-3-7-sonnet-latest',
            system: this.systemPrompt,
            messages,
            max_tokens: 1024,
            tools: tools.map(tool => tool.toTool()),
          });

          // Store the API call data
          await this.storeChatbotApiCall(currentResponse);

          // Accumulate token usage for the current loop iteration
          iterationInputTokens = currentResponse.usage?.input_tokens || 0;
          iterationOutputTokens = currentResponse.usage?.output_tokens || 0;
          iterationCacheReadTokens = currentResponse.usage?.cache_read_input_tokens || 0;

          // Accumulate token usage for the entire execution
          totalPromptTokens += iterationInputTokens;
          totalCompletionTokens += iterationOutputTokens;
          totalCacheWriteTokens += currentResponse.usage?.cache_creation_input_tokens || 0;
          totalCacheReadTokens += iterationCacheReadTokens;
        } catch (error) {
          console.error('Error calling Anthropic API for RSVP parsing:', error);
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
          if (loopCount === 1) {
            return {
              content: {
                text: '',
                clarificationNeeded:
                  'I encountered an issue trying to understand that. Could you please try again?',
              },
            };
          } else {
            // Use the content from the previous loop iteration
            console.warn('Using content from the previous loop iteration due to API error.');
            finalContent = lastNonEmptyTextContent;
            break;
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
          let toolCallResultContent = ''; // Default error content

          if (!toolInstance) {
            console.error(`[Chatbot Loop ${loopCount}] Tool with name ${toolUse.name} not found`);
            toolCallResultContent = `Error: Tool ${toolUse.name} not found.`;
          } else {
            try {
              const { eventId, ...inputArgs } = toolUse.input;
              const toolCallResult = await toolInstance.execute(this.eventId, inputArgs as any);
              toolCallResultContent = toolCallResult; // Store successful result
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              console.error(
                `[Chatbot Loop ${loopCount}] Error executing tool ${toolUse.name}:`,
                errorMessage
              );
              toolCallResultContent = `Error executing tool ${toolUse.name}: ${errorMessage}`;
            }
          }

          // Add the tool result to the messages history
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

      // Complete the agent execution
      await this.completeAgentExecution(finalContent);

      return {
        content: {
          text: finalContent,
          clarificationNeeded: null,
        },
      };
    } catch (error) {
      // Complete the agent execution
      await this.completeAgentExecution('', AgentExecutionStatus.FAILED);

      console.error('Error calling Anthropic API for RSVP parsing:', error);
      return {
        content: {
          text: '',
          clarificationNeeded:
            'I encountered an issue trying to understand that. Could you please try again?',
        },
      };
    }
  }

  // Add method to store API call data
  private async storeChatbotApiCall(response: Anthropic.Messages.Message) {
    try {
      await db.chatbotApiCall.create({
        data: {
          messageId: response.id,
          sessionId: this.chatSessionId,
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

  /**
   * Get or create the main chatbot agent
   */
  private async getOrCreateMainAgent(): Promise<Agent> {
    if (this.agent) return this.agent;

    // Try to find existing main agent
    let agent = await this.db.agent.findFirst({
      where: {
        type: AgentType.SUB_AGENT,
        isActive: true,
      },
    });

    if (!agent) {
      // Create main agent if it doesn't exist
      agent = await this.db.agent.create({
        data: {
          name: 'Guest Handler Agent',
          description: 'Specialized assistant for handling guest updates',
          type: AgentType.SUB_AGENT,
          systemPrompt: this.systemPrompt,
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
        sessionId: this.chatSessionId,
        agentId: agent.id,
        status: AgentExecutionStatus.RUNNING,
        systemPrompt,
        userMessage,
        startedAt: new Date(),
        parentExecutionId: this.parentExecutionId,
        parentLoopIterationId: this.parentLoopIterationId,
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
}
