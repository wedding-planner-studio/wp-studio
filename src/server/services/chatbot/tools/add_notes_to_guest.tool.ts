import { GuestTool } from './tool';

export class AddNotesToGuestTool extends GuestTool<{
  notes: string;
  guestId: string;
}> {
  isReadOnly = false;
  name = 'add_notes_to_guest';
  description =
    'Add notes to a guest. This tool should be used when a guest wants to add notes to their profile. Useful when the user mentions something about a guest that is not covered by other tools.';
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
      notes: {
        type: 'string',
        description: 'The notes to add to the guest',
      },
    },
    required: ['eventId', 'guestId', 'notes'],
  };

  async _execute(eventId: string, guestId: string, input: { notes: string }): Promise<string> {
    const guest = await this.db.guest.update({
      where: { id: guestId, eventId },
      data: { notes: input.notes },
      select: {
        name: true,
        notes: true,
      },
    });

    return `Guest ${guest.name}'s notes updated to ${input.notes}`;
  }

  async simulate(
    eventId: string,
    _guestId: string,
    input: { notes: string; guestId: string }
  ): Promise<string> {
    const { guestName } = this.getGuestMetadata(eventId, input);
    return `Guest ${guestName}'s notes updated to ${input.notes}`;
  }
}
