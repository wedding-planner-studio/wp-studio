import { TRPCError } from '@trpc/server';
import { BaseService } from '../base-service';
import { CreateVenueParams, UpdateVenueParams } from './schema/venue-write.schema';

export class VenuesService extends BaseService {
  async getByEventId(eventId: string) {
    return this.db.venue.findMany({
      where: { eventId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Create a venue
   * @param params - CreateVenueParams
   * @returns - Created venue
   */
  async create(params: CreateVenueParams) {
    const { eventId, ...data } = params;
    const venue = await this.db.venue.create({
      data: {
        eventId,
        name: data.name,
        address: data.address,
        purpose: data.purpose,
      },
    });

    // Invalidate the event cache
    await this.redis.del(`chatbot:eventId:${eventId}`);

    return venue;
  }

  /**
   * Update a venue
   * @param params - UpdateVenueParams
   * @returns - Updated venue
   */
  async update(params: UpdateVenueParams) {
    const { id, ...data } = params;

    const venue = await this.db.venue.update({
      where: { id },
      data,
    });

    // Invalidate the event cache
    await this.redis.del(`chatbot:eventId:${venue.eventId}`);

    return venue;
  }

  /**
   * Delete a venue
   * @param id - Venue ID
   */
  async delete(id: string) {
    const venue = await this.db.venue.findUnique({
      where: { id },
    });

    if (!venue) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Venue not found' });
    }

    await this.db.venue.delete({
      where: { id },
    });

    // Invalidate the event cache
    await this.redis.del(`chatbot:eventId:${venue.eventId}`);
  }
}
