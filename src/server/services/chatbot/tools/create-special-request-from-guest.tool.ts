import { GuestTool } from './tool';

export class CreateSpecialRequestFromGuestTool extends GuestTool<{
  specialRequest: string;
  guestId: string;
}> {
  isReadOnly = false;
  name = 'create_special_request_from_guest';
  description =
    'When the guest has a special request that is not covered by the existing questions or other tools, this tool can be used to create a new special request to be manually reviewed and attended to by the event team.';
  input_schema = {
    type: 'object' as const,
    properties: {
      eventId: {
        type: 'string',
        description: 'The CUID of the event to create the special request for.',
      },
      guestId: {
        type: 'string',
        description: 'The CUID of the guest to create the special request for.',
      },
      specialRequest: { type: 'string', description: 'The special request from the guest.' },
    },
    required: ['eventId', 'guestId', 'specialRequest'],
  };

  async _execute(
    _eventId: string,
    guestId: string,
    input: { specialRequest: string; guestId: string }
  ): Promise<string> {
    const guest = await this.db.guest.findUnique({
      where: { id: guestId },
    });

    if (!guest) {
      throw new Error('Guest not found');
    }

    await this.db.guestRequest.create({
      data: {
        guestId,
        eventId: guest.eventId,
        requestText: input.specialRequest,
      },
    });

    return `"${input.specialRequest}" from ${guest.name} noted! We'll let the hosts know and get back to you as soon as possible.`;
  }

  async simulate(
    _eventId: string,
    _guestId: string,
    input: { specialRequest: string; guestId: string }
  ): Promise<string> {
    const { guestName } = this.getGuestMetadata(_eventId, input);
    return `"${input.specialRequest}" from ${guestName} noted! We'll let the hosts know and get back to you as soon as possible.`;
  }
}
