import { Guest } from '@prisma/client';
import { GuestTool } from './tool';

export class GetEventDetailsTool extends GuestTool<{}> {
  isReadOnly = true;
  name = 'get_event_details';
  description =
    'Get the details of a specific event based on the event CUID. This tool will return all relevant information about the event, very useful for guests to get the details of the event they are attending and to answer questions about the event.';
  input_schema = {
    type: 'object' as const,
    properties: {
      eventId: { type: 'string', description: 'The CUID of the event to get the details for.' },
    },
    required: ['eventId'],
  };

  async _execute(eventId: string, guestId: string, input: {}): Promise<string> {
    const guest = await this.db.guest.findUnique({
      where: { id: guestId },
      include: {
        event: {
          include: {
            questions: { where: { status: 'ACTIVE' } },
          },
        },
      },
    });
    if (!guest?.event) {
      return 'Could not find information about this guest';
    }
    // Format relevant FAQs in a clear Q&A format
    const faqInfo =
      guest.event.questions.length > 0
        ? guest.event.questions.map(q => `Q: ${q.question}\nA: ${q.answer}`).join('\n\n')
        : 'No specific FAQ information available for this query.';

    return `
    <event-details-${eventId}>
    <relevant-questions-and-answers>
    ${faqInfo}
    </relevant-questions-and-answers>
    ${this.buildUserContext(guest)}
    </event-details-${eventId}>
    `;
  }

  async simulate(eventId: string, _guestId: string, input: { eventId: string }): Promise<string> {
    return `Event ${input.eventId} details fetched successfully.`;
  }

  private buildUserContext(guest: Guest): string {
    return `
      <relevant-context-about-guest-specific-for-this-event>
      Name: ${guest.name}
      Phone: ${guest.phone}
      RSVP status: ${guest.status}
      ${guest.table ? `Assigned table: ${guest.table}` : 'No info regarding table assignment'}
      ${guest.dietaryRestrictions ? `Dietary restrictions: ${guest.dietaryRestrictions}` : 'No dietary restrictions specified'}
      ${guest.notes ? `Notes about the user: ${guest.notes}` : 'No notes about the user'}
      ${guest.category ? `Category assigned to the user: ${guest.category}` : 'No category specified'}
      ${guest.inviter ? `Invited by: ${guest.inviter}` : 'No inviter specified'}
      </relevant-context-about-guest-specific-for-this-event>
        `;
  }
}
