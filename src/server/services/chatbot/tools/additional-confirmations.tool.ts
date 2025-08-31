import { GuestTool } from './tool';

export class AdditionalConfirmationsTool extends GuestTool<{
  confirmationQuestionId: string;
  guestId: string;
  guestResponse: string;
  mappedToOptionId: string;
}> {
  isReadOnly = false;
  name = 'additional_confirmations';
  description =
    'Map guest responses to additional confirmations. This tool should be used when a guest has responded to a confirmation question, and you need to map their response to an additional confirmation.';
  input_schema = {
    type: 'object' as const,
    properties: {
      eventId: {
        type: 'string',
        description: 'The CUID of the event to get additional confirmations for.',
      },
      confirmationQuestionId: {
        type: 'string',
        description: 'The CUID of the confirmation question to get additional confirmations for.',
      },
      guestId: {
        type: 'string',
        description: 'The CUID of the guest to get additional confirmations for.',
      },
      guestResponse: {
        type: 'string',
        description: 'The raw response to the confirmation question.',
      },
      mappedToOptionId: {
        type: 'string',
        description:
          'The CUID of the option to map the guest response to. From the list of options, try to find the option that best matches the guest response.',
      },
    },
    required: ['eventId', 'confirmationQuestionId', 'guestId', 'guestResponse', 'mappedToOptionId'],
  };

  async _execute(
    eventId: string,
    guestId: string,
    input: {
      confirmationQuestionId: string;
      guestResponse: string;
      mappedToOptionId: string;
      guestId: string;
    }
  ): Promise<string> {
    const { confirmationQuestionId, guestResponse, mappedToOptionId } = input;
    const confirmationQuestion = await this.db.eventRequiredGuestConfirmation.findUnique({
      where: {
        id: confirmationQuestionId,
      },
      include: {
        options: true,
      },
    });
    if (!confirmationQuestion) {
      return `Confirmation question not found: ${confirmationQuestionId}. Make sure to use the correct confirmation question CUID.`;
    }
    const correctlyMappedOption = confirmationQuestion.options.find(
      option => option.id === mappedToOptionId
    );
    await this.db.guestConfirmationResponse.upsert({
      where: {
        guestId_eventRequiredGuestConfirmationId: {
          guestId,
          eventRequiredGuestConfirmationId: confirmationQuestionId,
        },
      },
      update: {
        selectedOptionId: correctlyMappedOption ? correctlyMappedOption.id : null,
        customResponse: guestResponse,
      },
      create: {
        guestId,
        eventRequiredGuestConfirmationId: confirmationQuestionId,
        selectedOptionId: correctlyMappedOption ? correctlyMappedOption.id : null,
        customResponse: guestResponse,
      },
    });
    const { guestName } = this.getGuestMetadata(eventId, input);
    return `Guest ${guestName} has confirmed ${guestResponse} for ${confirmationQuestion.label}${correctlyMappedOption ? ` mapped to ${correctlyMappedOption.label}` : '.'}`;
  }

  async simulate(
    eventId: string,
    guestId: string,
    input: {
      confirmationQuestionId: string;
      guestResponse: string;
      mappedToOptionId: string;
      guestId: string;
    }
  ): Promise<string> {
    const { confirmationQuestionId, guestResponse, mappedToOptionId } = input;
    const confirmationQuestion = await this.db.eventRequiredGuestConfirmation.findUnique({
      where: {
        id: confirmationQuestionId,
      },
      include: {
        options: true,
      },
    });
    if (!confirmationQuestion) {
      return `Confirmation question not found: ${confirmationQuestionId}. Make sure to use the correct confirmation question CUID.`;
    }
    const correctlyMappedOption = confirmationQuestion.options.find(
      option => option.id === mappedToOptionId
    );
    const { guestName } = this.getGuestMetadata(eventId, input);
    return `Guest ${guestName} has confirmed ${guestResponse} for ${confirmationQuestion.label}${correctlyMappedOption ? ` mapped to ${correctlyMappedOption.label}` : '.'}`;
  }
}
