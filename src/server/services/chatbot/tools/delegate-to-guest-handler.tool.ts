import { PrismaClient } from '@prisma/client';
import { GuestHandlerAgent } from '../agents/guest-handler-agent';
import { AIResponse } from '../chatbot.service';
import { GuestTool, GuestContextHash } from './tool';

// RSVP agent delegation
export class GuestHandlerAgentDelegationTool extends GuestTool<
  {
    instructionInNaturalLanguage: string;
  },
  AIResponse
> {
  isReadOnly = false;
  name = 'delegate_guest_handling';
  description =
    'Handles any task related to guest handling, including for main guests and/or their companions. Use this tool for any instruction related to updating dietary restrictions, or to notes for either the guest and/or their companions.';
  input_schema = {
    type: 'object' as const,
    properties: {
      eventId: {
        type: 'string',
        description:
          'The unique ID of the event for which the guest handling is being updated. This is critical.',
      },
      instructionInNaturalLanguage: {
        type: 'string',
        description:
          'The natural language instruction from the user regarding the guest handling changes (e.g., "Update the dietary restrictions of the guest to vegetarian.", "Update the notes of the guest to "arriving late".)',
      },
    },
    required: ['eventId', 'instructionInNaturalLanguage'],
  };

  constructor(
    protected readonly db: PrismaClient,
    protected readonly GuestContextHash: GuestContextHash,
    protected readonly isTestMode: boolean,
    protected readonly chatSessionId: string,
    protected readonly parentExecutionId: string | null = null,
    protected readonly parentLoopIterationId: string | null = null,
    protected readonly isLastTool = false
  ) {
    super(db, GuestContextHash, isTestMode, isLastTool);
  }

  async _execute(
    eventId: string,
    _guestId: string,
    input: { instructionInNaturalLanguage: '' }
  ): Promise<AIResponse> {
    const guestHandlerAgent = new GuestHandlerAgent(
      eventId,
      this.GuestContextHash,
      this.chatSessionId,
      this.parentExecutionId,
      this.parentLoopIterationId,
      this.isTestMode
    );
    const result = await guestHandlerAgent.handleInstructionWithLLM(
      input.instructionInNaturalLanguage,
      this.GuestContextHash.get(eventId)!.guest
    );
    return result;
  }

  /**
   * Since this tool is for "delegation", we don't need to simulate it
   * @param eventId
   * @param guestId
   * @param input
   * @returns
   */
  async simulate(
    eventId: string,
    guestId: string,
    input: { instructionInNaturalLanguage: '' }
  ): Promise<AIResponse> {
    return this._execute(eventId, guestId, input);
  }
}
