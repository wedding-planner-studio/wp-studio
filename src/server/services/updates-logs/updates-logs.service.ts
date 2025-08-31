import { normalizePhone } from '@/lib/utils/utils';
import { BaseService } from '../base-service';

export class UpdatesLogsService extends BaseService {
  /**
   * Get the updates logs for a given phone number
   * @param phoneNumber - The phone number to get the updates logs for
   * @returns The updates logs for the given phone number
   */
  async getUpdatesLogs(phoneNumber: string) {
    const logs = await this.db.chatMessage.findMany({
      where: {
        session: {
          phoneNumber: normalizePhone(phoneNumber, 'MX', false),
        },
        toolCalls: {
          not: {
            isEmpty: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        createdAt: true,
        toolCalls: true,
      },
    });

    return logs;
  }

  /**
   * Get all update logs for an event
   * @param eventId - The event ID to get updates logs for
   * @param limit - Maximum number of logs to return (optional)
   * @returns Update logs for all guests in the event
   */
  async getEventUpdatesLogs(eventId: string, limit?: number) {
    // Get the organization ID from the authenticated user
    const { organizationId } = await this.getOrgFromUserSession();

    // Verify the event belongs to the user's organization
    const event = await this.db.event.findFirst({
      where: {
        id: eventId,
        organizationId,
      },
    });

    if (!event) {
      throw new Error('Event not found or access denied');
    }

    // First, get all guests for this event to extract their phone numbers
    const guests = await this.db.guest.findMany({
      where: {
        eventId,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        status: true,
      },
    });

    if (guests.length === 0) {
      return [];
    }

    // Normalize all phone numbers
    const phoneNumbers = guests.map(guest => normalizePhone(guest.phone ?? '', 'MX', false));
    // Fetch all chat messages with tool calls for these phone numbers
    const logs = await this.db.chatMessage.findMany({
      where: {
        session: {
          phoneNumber: {
            in: phoneNumbers,
          },
        },
        toolCalls: {
          not: {
            isEmpty: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      select: {
        id: true,
        createdAt: true,
        toolCalls: true,
        session: {
          select: {
            phoneNumber: true,
            guest: {
              select: {
                id: true,
                name: true,
                phone: true,
                status: true,
              },
            },
          },
        },
      },
    });

    return logs.filter(log => Array.isArray(log.toolCalls) && log.toolCalls.length > 0);
  }
}
