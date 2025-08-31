import { GuestTool } from './tool';

export class UpdateDietaryRestrictionsTool extends GuestTool<{
  dietaryRestrictions: string;
  guestId: string;
}> {
  isReadOnly = false;
  name = 'update_dietary_restrictions';
  description =
    "Update a guest's dietary restrictions. This tool should be used when a guest wants to update their dietary restrictions. Please confirm with the user before using this tool.";
  input_schema = {
    type: 'object' as const,
    properties: {
      eventId: {
        type: 'string',
        description: 'The CUID of the event',
      },
      guestId: {
        type: 'string',
        description: 'The CUID of the guest',
      },
      dietaryRestrictions: {
        type: 'string',
        description: 'The new dietary restrictions.',
      },
    },
    required: ['eventId', 'guestId', 'dietaryRestrictions'],
  };

  async _execute(
    eventId: string,
    guestId: string,
    input: { dietaryRestrictions: string; guestId: string }
  ): Promise<string> {
    await this.db.guest.update({
      where: { id: guestId },
      data: { dietaryRestrictions: input.dietaryRestrictions },
    });

    const { guestName } = this.getGuestMetadata(eventId, input);
    return `Guest ${guestName}'s dietary restrictions updated to ${input.dietaryRestrictions}`;
  }

  async simulate(
    eventId: string,
    _guestId: string,
    input: { dietaryRestrictions: string; guestId: string }
  ): Promise<string> {
    const { guestName } = this.getGuestMetadata(eventId, input);
    return `Guest ${guestName}'s dietary restrictions updated to ${input.dietaryRestrictions}`;
  }
}
