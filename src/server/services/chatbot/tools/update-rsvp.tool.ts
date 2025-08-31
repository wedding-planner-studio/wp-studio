import { GuestTool } from './tool';

export class UpdateRsvpTool extends GuestTool<{
  guestId: string;
  status: 'CONFIRMED' | 'PENDING' | 'DECLINED';
}> {
  isReadOnly = false;
  name = 'update_rsvp';
  description =
    "Update a guest's RSVP status. This tool should be used when a guest wants to confirm or change their attendance status. It updates the guest record in the database with their new RSVP status. Use this when a guest explicitly indicates they want to RSVP or change their existing RSVP. Valid statuses are CONFIRMED, PENDING, and DECLINED.";
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
      status: {
        type: 'string',
        enum: ['CONFIRMED', 'PENDING', 'DECLINED'],
        description:
          'The new RSVP status (CONFIRMED, PENDING, DECLINED). Use PENDING when the guest is unsure about their attendance.',
      },
    },
    required: ['eventId', 'guestId', 'status'],
  };

  async _execute(
    eventId: string,
    guestId: string,
    input: {
      status: 'CONFIRMED' | 'PENDING' | 'DECLINED';
      guestId: string;
    }
  ): Promise<string> {
    console.log(
      `[UpdateRsvpTool] Updating RSVP status for guest ${guestId} to ${input.status} for event ${eventId}`
    );
    await this.db.guest.update({
      where: { id: guestId, eventId },
      data: {
        status: input.status,
      },
    });
    const { guestName } = this.getGuestMetadata(eventId, input);
    return `Guest ${guestName} updated to ${input.status} for event ${this.GuestContextHash.get(eventId)?.event.name}`;
  }

  async simulate(
    eventId: string,
    _guestId: string,
    input: { status: 'CONFIRMED' | 'PENDING' | 'DECLINED'; guestId: string }
  ): Promise<string> {
    const { guestName } = this.getGuestMetadata(eventId, input);
    return `Guest ${guestName} updated to ${input.status} for event ${this.GuestContextHash.get(eventId)?.event.name}`;
  }
}
