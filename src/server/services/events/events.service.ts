import { BaseService } from '../base-service';
import { TRPCError } from '@trpc/server';
import { Prisma, EventStatus, QuestionStatus, VenuePurpose } from '@prisma/client';
import {
  EventDuplicateParams,
  EventInputParams,
  EventUpdateParams,
} from './schema/event-write.schema';

import { defaultQuestions } from '@/server/api/constants/defaultQuestions';
import { ListEventsParams } from './schema/event-read.schema';
export class EventsService extends BaseService {
  /**
   * Get an event by ID
   * @param id - Event ID
   * @returns - Event
   */
  async getById(id: string) {
    const { organizationId } = await this.getOrgFromUserSession();

    // Get the event and verify organization access
    const event = await this.db.event.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        venues: true, // Include venues in the response
        requiredGuestConfirmation: {
          include: {
            options: true,
          },
        },
      },
    });

    if (!event) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Event not found or access denied',
      });
    }

    return event;
  }

  async getQuickStats(id: string) {
    const { organizationId } = await this.getOrgFromUserSession();

    const event = await this.db.event.findFirst({
      where: { id, organizationId },
      include: {
        _count: {
          select: {
            guests: true,
            venues: true,
            questions: true,
          },
        },
      },
    });

    if (!event) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Event not found or access denied',
      });
    }

    const totalManagers = await this.db.eventsAllowedToManage.count({
      where: {
        eventId: event.id,
      },
    });

    return {
      totalGuests: event._count.guests,
      totalVenueCapacity: event._count.venues,
      totalQuestions: event._count.questions,
      totalManagers,
    };
  }

  /**
   * Create an event
   * @param params - EventInputParams
   * @returns - Created event
   */
  async create(params: EventInputParams) {
    const { organizationId } = await this.getOrgFromUserSession();

    const { venue, ...eventData } = params;

    // Create the event
    const event = await this.db.event.create({
      data: {
        ...eventData,
        organizationId,
      },
    });

    // Create a venue if provided
    if (venue && venue.name && venue.address) {
      await this.db.venue.create({
        data: {
          name: venue.name,
          address: venue.address,
          purpose: venue.purpose || VenuePurpose.MAIN,
          eventId: event.id,
        },
      });
    }

    // Create default questions for the event
    await this.db.eventQuestion.createMany({
      data: defaultQuestions.map(q => ({
        eventId: event.id,
        question: q.question,
        answer: q.answer,
        category: q.category,
        status: QuestionStatus.ACTIVE,
      })),
    });

    return event;
  }

  /**
   * Create an event from a duplicate
   * @param params - EventDuplicateParams
   * @returns - Created event
   */
  async createFromDuplicate(params: EventDuplicateParams) {
    const { organizationId } = await this.getOrgFromUserSession();

    const { guestList: includeGuests, questions: includeQuestions, shareAccess } = params.options;

    const event = await this.db.event.findFirst({
      where: { id: params.cloneFromId, organizationId },
      include: {
        questions: includeQuestions,
        guests: includeGuests,
      },
    });

    if (!event) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Event not found or access denied',
      });
    }

    const { id, guests, questions, createdAt, updatedAt, ...eventData } = event;
    const { venue, ...eventInput } = params.eventInput ?? {};

    const newEvent = await this.db.event.create({
      data: {
        ...eventData,
        ...eventInput,
        organizationId,
      },
    });

    if (includeGuests) {
      await this.db.guest.createMany({
        data: guests.map(g => {
          const { id, createdAt, updatedAt, ...guestData } = g;
          return { ...guestData, eventId: newEvent.id };
        }),
      });
    }

    if (includeQuestions) {
      await this.db.eventQuestion.createMany({
        data: questions.map(q => {
          const { id, createdAt, updatedAt, ...questionData } = q;
          return { ...questionData, eventId: newEvent.id };
        }),
      });
    }

    if (shareAccess) {
      const managers = await this.db.eventsAllowedToManage.findMany({
        where: {
          eventId: params.cloneFromId,
        },
        select: {
          userId: true,
        },
      });

      await this.db.eventsAllowedToManage.createMany({
        data: managers.map(m => ({ ...m, eventId: newEvent.id })),
      });
    }

    return newEvent;
  }

  /**
   * Update an event
   * @param params - EventUpdateParams
   * @returns - Updated event
   */
  async update(params: EventUpdateParams) {
    const { organizationId } = await this.getOrgFromUserSession();

    // Find the event and verify organization access
    const existingEvent = await this.db.event.findFirst({
      where: {
        id: params.id,
        organizationId,
      },
    });

    if (!existingEvent) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Event not found or access denied',
      });
    }
    const { venue, ...eventData } = params.data;
    // Update the event
    const updatedEvent = await this.db.event.update({
      where: { id: params.id },
      data: eventData,
    });

    // Invalidate the event cache
    await this.redis.del(`chatbot:eventId:${params.id}`);

    // Create a venue if provided and none exists
    if (venue && venue.name && venue.address) {
      const existingVenues = await this.db.venue.findMany({
        where: { eventId: params.id },
      });

      if (existingVenues.length === 0) {
        await this.db.venue.create({
          data: {
            name: venue.name,
            address: venue.address,
            purpose: venue.purpose || VenuePurpose.MAIN,
            eventId: params.id,
          },
        });
      }
    }

    return updatedEvent;
  }

  async setInactive(id: string) {
    this.throwIfNotOrgAdmin();
    return this.update({ id, data: { status: EventStatus.INACTIVE } });
  }

  /**
   * List events with pagination and search
   * @param params - ListEventsParams
   * @returns - List of events with pagination metadata
   */
  async listEvents(params: ListEventsParams) {
    const { page, limit, search, includeInactive } = params;
    const skip = (page - 1) * limit;

    // Get the organization ID from the authenticated user
    const user = await this.db.user.findFirst({
      where: { id: this.auth.userId },
      select: { organizationId: true },
    });

    if (!user?.organizationId) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'User not associated with an organization',
      });
    }

    // Build the where clause
    const where: Prisma.EventWhereInput = {
      organizationId: user.organizationId,
      // Only include active events by default
      ...(includeInactive ? {} : { status: EventStatus.ACTIVE }),
      ...(search
        ? {
            OR: [
              {
                name: {
                  contains: search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
              {
                person1: {
                  contains: search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
              {
                person2: {
                  contains: search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
              {
                venues: {
                  some: {
                    name: {
                      contains: search,
                      mode: Prisma.QueryMode.insensitive,
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    if (this.auth.role === 'EVENT_MANAGER') {
      where.eventManagers = {
        some: {
          userId: this.auth.userId,
        },
      };
    }

    // Get events with pagination
    const [events, total] = await Promise.all([
      this.db.event.findMany({
        where,
        orderBy: { date: 'asc' },
        skip,
        take: limit,
        include: {
          guests: {
            where: {
              NOT: {
                status: 'INACTIVE',
              },
            },
            select: {
              status: true,
            },
          },
          venues: true,
        },
      }),
      this.db.event.count({ where }),
    ]);

    // Calculate RSVP percentages for each event
    const eventsWithStats = events.map(event => {
      const totalActiveGuests = event.guests.length;
      const confirmedGuests = event.guests.filter(g => g.status === 'CONFIRMED').length;
      const declinedGuests = event.guests.filter(g => g.status === 'DECLINED').length;
      const respondedGuests = confirmedGuests + declinedGuests;

      const rsvpPercentage =
        totalActiveGuests > 0 ? Math.round((respondedGuests / totalActiveGuests) * 100) : 0;

      // Remove the guests array from the response
      const { guests, ...eventWithoutGuests } = event;

      return {
        ...eventWithoutGuests,
        rsvpPercentage,
      };
    });

    return {
      events: eventsWithStats,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get custom guest categories for an event
   * @param eventId - Event ID
   * @returns - List of custom guest categories
   */
  async getCustomGuestCategories(eventId: string) {
    const { organizationId } = await this.getOrgFromUserSession();

    // Verify event belongs to organization
    const event = await this.db.event.findFirst({
      where: {
        id: eventId,
        organizationId,
      },
    });

    if (!event) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Event not found or access denied',
      });
    }

    // Get custom guest categories
    const categories = await this.db.customGuestCategory.findMany({
      where: {
        eventId,
      },
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        name: true,
        color: true,
      },
    });

    if (categories.length === 0) {
      return [
        { id: 'family', name: 'Family', color: '#4299e1' },
        { id: 'friend', name: 'Friend', color: '#9f7aea' },
        { id: 'work', name: 'Work', color: '#ed8936' },
      ];
    }

    return categories;
  }

  /**
   * Create a custom guest category
   * @param eventId - Event ID
   * @param name - Category name
   * @param color - Category color
   * @returns - Created custom guest category
   */
  async createCustomGuestCategory(eventId: string, name: string, color?: string) {
    const { organizationId } = await this.getOrgFromUserSession();

    // Verify event belongs to organization
    const event = await this.db.event.findFirst({
      where: {
        id: eventId,
        organizationId,
      },
    });

    if (!event) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Event not found or access denied',
      });
    }

    // Check if category already exists
    const existingCategory = await this.db.customGuestCategory.findFirst({
      where: {
        eventId,
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
    });

    if (existingCategory) {
      if (color && color !== existingCategory.color) {
        await this.db.customGuestCategory.update({
          where: { id: existingCategory.id },
          data: { color },
        });
      }
      return existingCategory;
    }

    // Create new category
    const category = await this.db.customGuestCategory.create({
      data: {
        eventId,
        name,
        color,
      },
    });

    return category;
  }

  /**
   * Create a required guest confirmation
   * @param eventId - Event ID
   * @param label - Confirmation label
   * @returns - Created required guest confirmation
   */
  async createRequiredGuestConfirmation(
    eventId: string,
    label: string,
    bestWayToAsk?: string,
    options?: string[]
  ) {
    this.throwIfNotOrgAdmin();
    const confirmation = await this.db.eventRequiredGuestConfirmation.create({
      data: { eventId, label, bestWayToAsk: bestWayToAsk ?? '' },
    });

    if (options) {
      const deduplicatedOptions = new Set(options);
      await this.db.eventRequiredGuestConfirmationOption.createMany({
        data: Array.from(deduplicatedOptions).map(option => ({
          eventRequiredGuestConfirmationId: confirmation.id,
          label: option,
        })),
      });
    }
    await this.redis.del(`chatbot:eventId:${eventId}`);
    return confirmation;
  }
}
