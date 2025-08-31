import { GuestTool } from './tool';

export class UpdateCompanionNameTool extends GuestTool<{
  companionName: string;
  guestId: string;
}> {
  isReadOnly = false;
  name = 'update_companion_name';
  description =
    "Update a guest's companion's name. This tool should be used when a guest wants to update any of their companion's name. This tool can be used to 'replace' one guest with another guest by changing the companion's name. Please confirm with the user before using this tool.";
  input_schema = {
    type: 'object' as const,
    properties: {
      eventId: {
        type: 'string',
        description: 'The CUID of the event',
      },
      companionName: {
        type: 'string',
        description: 'The new companion name.',
      },
      guestId: {
        type: 'string',
        description:
          'The CUID of the companion. Note that this is the companion, not the main guest.',
      },
    },
    required: ['eventId', 'companionName', 'guestId'],
  };

  async _execute(
    eventId: string,
    guestId: string,
    input: {
      companionName: string;
      guestId: string;
    }
  ): Promise<string> {
    const guest = await this.db.guest.update({
      where: { id: guestId, isPrimaryGuest: false, eventId },
      data: {
        name: input.companionName,
      },
      select: {
        name: true,
      },
    });

    return `Companion name updated to ${guest.name}`;
  }

  async simulate(
    _eventId: string,
    _guestId: string,
    input: { companionName: string; guestId: string }
  ): Promise<string> {
    return `Companion name updated to ${input.companionName}`;
  }
}
