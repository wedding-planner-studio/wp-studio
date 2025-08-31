import { GuestStatus, Prisma, MessageDirection, Guest, ChatSession } from '@prisma/client';
import { BaseService } from '../base-service';
import {
  CheckPhoneNumbersParams,
  GuestsByIdsParams,
  GuestsListParams,
} from './schema/guests-read.schema';
import { TRPCError } from '@trpc/server';
import {
  BulkGuestInputParams,
  GuestInputParams,
  GuestUpdateParams,
  SingleGuestForBulkUploadInputParams,
} from './schema/guest-write.schema';
import { normalizePhone } from '@/lib/utils';
import { WhatsappService } from '../whatsapp/whatsapp-service';
import cuid from 'cuid';
import { TwilioService } from '../twilio';
import { env } from '@/env';

export class GuestsService extends BaseService {
  /**
   * Create a guest
   * @param params - GuestInputParams
   * @returns - Created guest
   */
  async create(params: GuestInputParams) {
    // Get the organization ID from the authenticated user
    const { organizationId } = await this.getOrgFromUserSession();

    // Verify the event belongs to the user's organization
    const event = await this.db.event.findFirst({
      where: {
        id: params.eventId,
        organizationId,
      },
    });

    if (!event) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Event not found or access denied',
      });
    }

    // Check if a guest with the same phone number already exists in this event
    const existingGuest = await this.db.guest.findFirst({
      where: {
        eventId: params.eventId,
        phone: params.phone,
      },
    });

    if (existingGuest) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'A guest with this phone number already exists in this event',
      });
    }

    const { numberOfGuests, additionalGuestNames, ...rest } = params;
    // Create the guest
    const guest = await this.db.guest.create({
      data: {
        ...rest,
        isPrimaryGuest: true,
        hasMultipleGuests: numberOfGuests > 1,
        phone: normalizePhone(params.phone ?? ''),
      },
    });

    if (numberOfGuests > 1) {
      const group = await this.db.guestGroup.create({
        data: {
          event: {
            connect: {
              id: params.eventId,
            },
          },
          leadGuest: {
            connect: {
              id: guest.id,
            },
          },
          guests: {
            connect: {
              id: guest.id,
            },
          },
        },
      });

      const names = additionalGuestNames?.split(',').map(name => name.trim()) ?? [];
      const additionalGuests = new Array(numberOfGuests - 1).fill(null).map((_, index) => ({
        isPrimaryGuest: false,
        name: names[index] ?? `Guest ${index + 1}`,
        eventId: params.eventId,
        preferredLanguage: guest.preferredLanguage,
        priority: guest.priority,
        guestGroupId: group.id,
      }));
      await this.db.guest.createMany({
        data: additionalGuests,
      });
    }

    // Invalidate the event cache
    await this.redis.del(`chatbot:eventId:${params.eventId}`);

    return guest;
  }

  async getPartyDetails(groupId: string) {
    const { organizationId } = await this.getOrgFromUserSession();

    const group = await this.db.guestGroup.findFirst({
      where: {
        id: groupId,
        event: {
          organizationId,
        },
      },
      include: {
        guests: {
          where: {
            isPrimaryGuest: false,
            status: {
              not: GuestStatus.INACTIVE,
            },
          },
        },
        leadGuest: true,
      },
    });

    const guests = group?.guests ?? [];
    if (group?.leadGuest) {
      guests.push(group.leadGuest);
    }
    return guests.sort((a, b) => a.name.localeCompare(b.name));
  }
  /**
   * Get guests by IDs
   * @param params - GuestsByIdsParams
   * @returns - Guests
   */
  async getByIds(params: GuestsByIdsParams) {
    // Get the organization ID from the authenticated user
    const { organizationId } = await this.getOrgFromUserSession();

    // Verify the event belongs to the user's organization
    const event = await this.db.event.findFirst({
      where: {
        id: params.eventId,
        organizationId,
      },
    });

    if (!event) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Event not found or access denied',
      });
    }

    // Get all requested guests
    const guests = await this.db.guest.findMany({
      where: {
        id: { in: params.guestIds },
        eventId: params.eventId,
      },
      orderBy: { name: 'asc' },
    });

    return guests;
  }
  /**
   * Get a guest by ID
   * @param id - Guest ID
   * @returns - Guest
   */
  async getById(id: string) {
    // Get the organization ID from the authenticated user
    const { organizationId } = await this.getOrgFromUserSession();

    // Get the guest and verify access in a single query
    const guest = await this.db.guest.findFirst({
      where: {
        id,
        event: {
          organizationId,
        },
      },
      include: {
        guestConfirmationResponses: {
          include: {
            selectedOption: true,
          },
        },
        event: {
          select: {
            id: true,
            name: true,
            date: true,
          },
        },
        guestGroup: {
          include: {
            leadGuest: true,
            _count: {
              select: {
                guests: true,
              },
            },
          },
        },
      },
    });

    if (!guest) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Guest not found or access denied',
      });
    }

    return guest;
  }

  /**
   * List guests with pagination and search
   * @param params - GuestsListParams
   * @returns - List of guests with pagination metadata
   */
  async list(params: GuestsListParams) {
    const { page, limit, search, includeInactive, rsvpStatus, eventId, includeAdditionalGuests } =
      params;
    const skip = (page - 1) * limit;

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
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Event not found or access denied',
      });
    }

    // Build the where clause
    const where: Prisma.GuestWhereInput = {
      eventId,
      ...(includeAdditionalGuests ? {} : { isPrimaryGuest: true }),
      // Only include non-inactive guests by default
      ...(includeInactive
        ? {}
        : {
            NOT: {
              status: GuestStatus.INACTIVE,
            },
          }),
      // Filter by RSVP status if provided
      ...(rsvpStatus ? { status: rsvpStatus } : {}),
      // Search in relevant fields
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
                phone: {
                  contains: search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
              {
                table: {
                  contains: search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
              {
                notes: {
                  contains: search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            ],
          }
        : {}),
    };

    // Get guests with pagination
    const [guests, total, layoutElements] = await Promise.all([
      this.db.guest.findMany({
        where,
        orderBy: [{ name: 'asc' }, { status: 'asc' }, { priority: 'asc' }],
        skip,
        take: limit,
        include: {
          guestConfirmationResponses: {
            include: {
              selectedOption: true,
            },
          },
          assignment: true,
          guestGroup: {
            include: {
              leadGuest: true,
              _count: {
                select: {
                  guests: {
                    where: {
                      status: {
                        not: GuestStatus.INACTIVE,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.db.guest.count({ where }),
      this.db.layoutElement.findMany({
        where: {
          layout: {
            eventId,
          },
        },
      }),
    ]);

    // Hashtable to map layoutElementId to label
    const layoutElementMap = new Map(layoutElements.map(el => [el.id, el.label]));

    // Update guest.table with the layoutElement.label
    guests.forEach(guest => {
      const assignment = guest.assignment;
      if (assignment) {
        guest.table = layoutElementMap.get(assignment.layoutElementId) ?? guest.table;
      }
    });

    // Get RSVP stats for the event (excluding inactive guests)
    const stats = await this.db.guest.groupBy({
      by: ['status'],
      where: {
        eventId,
        NOT: {
          status: GuestStatus.INACTIVE,
        },
      },
      _count: true,
    });

    // Format stats into a more usable structure
    const rsvpStats = {
      total: total,
      confirmed: 0,
      pending: 0,
      declined: 0,
    };

    stats.forEach(stat => {
      switch (stat.status) {
        case GuestStatus.CONFIRMED:
          rsvpStats.confirmed = stat._count;
          break;
        case GuestStatus.PENDING:
          rsvpStats.pending = stat._count;
          break;
        case GuestStatus.DECLINED:
          rsvpStats.declined = stat._count;
          break;
      }
    });

    return {
      guests,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      stats: rsvpStats,
    };
  }

  /**
   * Update a guest
   * @param params - GuestInputParams
   * @returns - Updated guest
   */
  async update(params: GuestUpdateParams & { id: string }) {
    const { id, numberOfGuests, additionalGuestNames, ...updateData } = params;
    // Get the organization ID from the authenticated user
    const { organizationId } = await this.getOrgFromUserSession();

    // Get the current guest and verify access
    const currentGuest = await this.db.guest.findFirst({
      where: {
        id,
        event: {
          organizationId,
        },
      },
      include: {
        leadingGuestGroup: true,
        event: {
          select: {
            organizationId: true,
          },
        },
      },
    });

    if (!currentGuest) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Guest not found or access denied',
      });
    }

    // If phone number is being updated, check for duplicates
    if (updateData.phone) {
      const normalizedPhone = normalizePhone(updateData.phone);
      const existingGuest = await this.db.guest.findFirst({
        where: {
          eventId: currentGuest.eventId,
          phone: normalizedPhone,
          NOT: {
            id: currentGuest.id,
          },
        },
      });

      if (existingGuest) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A guest with this phone number already exists in this event',
        });
      }
      updateData.phone = normalizedPhone;
    }

    // Handle deletion of a main guest
    if (updateData.status === GuestStatus.INACTIVE) {
      console.log('deleting main guest', currentGuest.leadingGuestGroup?.id);
      // Delete all guests in the group
      console.log({
        where: { guestGroupId: currentGuest.leadingGuestGroup?.id },
        data: { status: GuestStatus.INACTIVE },
      });
      // await this.db.guest.updateMany({
      //   where: { guestGroupId: currentGuest.leadingGuestGroup?.id },
      //   data: { status: GuestStatus.INACTIVE },
      // });
    }

    let groupId: string | null = null;
    if (typeof numberOfGuests === 'number' && currentGuest.isPrimaryGuest) {
      // Number of guests must always be greater than 0
      if (numberOfGuests <= 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Number of guests must be greater than 0',
        });
      }
      if (!currentGuest.leadingGuestGroup?.id) {
        if (!currentGuest.hasMultipleGuests) {
          Object.assign(updateData, {
            hasMultipleGuests: true,
          });
          Object.assign(updateData, {
            hasMultipleGuests: true,
          });
          const newGroup = await this.db.guestGroup.create({
            data: {
              eventId: currentGuest.eventId,
              leadGuestId: currentGuest.id,
              guests: {
                connect: { id: currentGuest.id },
              },
            },
          });
          currentGuest.leadingGuestGroup = newGroup;
        } else {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'This guest is part of a group and cannot be updated individually',
          });
        }
      }
      const group = (await this.getPartyDetails(currentGuest.leadingGuestGroup.id)).filter(
        g => !g.isPrimaryGuest // Primary guest comes in the response, we don't need to include it
      );
      console.log('HERE: group', group);
      // Only if guests count in group is different than numberOfGuests, we need to add or remove guests from the group
      if (group.length !== numberOfGuests) {
        // Handle [INVALID] scenario where a guest is removed from a group
        if (numberOfGuests < group.length) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot remove guests from a group',
          });
        }
        // Handle scenario where a guest is added to a group
        if (numberOfGuests > group.length) {
          Object.assign(updateData, {
            hasMultipleGuests: true,
          });
          // Map Guest Names
          const guestNames = additionalGuestNames?.split(',').map(name => name.trim()) ?? [];
          // Update existing guests names if necessary
          for (let i = 0; i < group.length; i++) {
            const guest = group[i];
            if (guest && guest.name !== guestNames[i]) {
              await this.db.guest.update({
                where: { id: guest.id },
                data: { name: guestNames[i] ?? `Guest ${i + 1}` },
              });
            }
          }
          // Create new guests:
          // Number of guests is 1 more than the group length because we already have the primary guest, so we need to subtract 1
          const newGuests = new Array(numberOfGuests - 1 - group.length).fill(null).map((_, i) => {
            return {
              eventId: currentGuest.eventId,
              guestGroupId: currentGuest.leadingGuestGroup?.id,
              isPrimaryGuest: false,
              name: guestNames[group.length + i] ?? `Guest ${group.length + i + 1}`,
              status: GuestStatus.PENDING,
              inviter: currentGuest.inviter,
              preferredLanguage: currentGuest.preferredLanguage,
              priority: currentGuest.priority,
            };
          });
          await this.db.guest.createMany({
            data: newGuests,
          });
        }
      }
    }

    // Update the guest
    const updatedGuest = await this.db.guest.update({
      where: { id },
      data: updateData,
    });

    // Invalidate the event cache
    await this.redis.del(`chatbot:eventId:${currentGuest.eventId}`);

    return updatedGuest;
  }

  /**
   * Delete a guest
   * @param id - Guest ID
   * @returns - Deleted guest
   */
  async delete(id: string) {
    const deletedGuest = await this.update({ id, status: GuestStatus.INACTIVE });
    // Invalidate the event seat-assignment
    await this.db.guestAssignment.deleteMany({
      where: {
        guestId: id,
      },
    });
    return deletedGuest;
  }

  /**
   * Check if phone numbers already exist in the event
   * @param params - CheckPhoneNumbersParams
   * @returns - List of existing phone numbers
   */
  async checkPhoneNumbers(params: CheckPhoneNumbersParams) {
    // Get the organization ID from the authenticated user
    const { organizationId } = await this.getOrgFromUserSession();

    // Verify the event belongs to the user's organization
    const event = await this.db.event.findFirst({
      where: {
        id: params.eventId,
        organizationId,
      },
    });

    if (!event) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Event not found or access denied',
      });
    }

    // Normalize phone numbers
    const normalizedPhoneNumbers = params.phoneNumbers.map(phone =>
      normalizePhone(phone, 'MX', false)
    );
    // Find existing phone numbers
    const existingGuests = await this.db.guest.findMany({
      where: {
        eventId: params.eventId,
        phone: { in: normalizedPhoneNumbers },
        NOT: { status: GuestStatus.INACTIVE },
      },
      select: { phone: true },
    });

    return {
      phones: existingGuests.map(g => g.phone),
    };
  }

  /**
   * Bulk upload guests
   * @param params - BulkGuestInputParams
   * @returns - List of created guests
   */
  async bulkUpload(params: BulkGuestInputParams) {
    const { organizationId } = await this.getOrgFromUserSession();

    // Verify the event belongs to the user's organization
    const event = await this.db.event.findFirst({
      where: {
        id: params.eventId,
        organizationId,
      },
    });

    if (!event) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Event not found or access denied',
      });
    }

    // Check for duplicate phone numbers within the input data
    const phoneNumbers = params.guests.map(g => normalizePhone(g.phone, 'MX', false));
    const duplicatesInInput = phoneNumbers.filter(
      (phone, index) => phoneNumbers.indexOf(phone) !== index
    );
    if (duplicatesInInput.length > 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Duplicate phone numbers found in upload data: ${duplicatesInInput.join(', ')}`,
      });
    }

    // Check for existing phone numbers in the database
    const existingGuests = await this.db.guest.findMany({
      where: {
        eventId: params.eventId,
        phone: { in: phoneNumbers },
        NOT: { status: GuestStatus.INACTIVE },
      },
      select: { phone: true },
    });

    if (existingGuests.length > 0) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: `The following phone numbers already exist in this event: ${existingGuests
          .map(g => g.phone)
          .join(', ')}`,
      });
    }

    // Validate phone number format
    const phoneRegex = /^\+[1-9]\d{10,12}$/;
    const invalidPhones = params.guests.filter(
      guest => !phoneRegex.test(normalizePhone(guest.phone, 'MX', false))
    );
    if (invalidPhones.length > 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Invalid phone numbers found: ${invalidPhones.map(g => g.phone).join(', ')}`,
      });
    }

    try {
      // For large batches, use asynchronous processing with QStash
      return await this.processBulkUploadAsync(params, organizationId);
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to process bulk upload',
        cause: error,
      });
    }
  }

  /**
   * Process bulk upload asynchronously
   * @param params - BulkGuestInputParams
   * @param organizationId - Organization ID
   * @returns - Processed bulk upload
   */
  private async processBulkUploadAsync(params: BulkGuestInputParams, organizationId: string) {
    const { QstashService } = await import('../qstash');
    const { UPSTASH_BULK_GUEST_UPLOAD_URL } = await import('@/lib/constants');

    const qstashService = new QstashService();
    const batchId = cuid();
    const batchSize = 20;
    const batches: SingleGuestForBulkUploadInputParams[][] = [];

    // Split guests into batches of 20
    for (let i = 0; i < params.guests.length; i += batchSize) {
      batches.push(params.guests.slice(i, i + batchSize));
    }

    // Queue all batches with QStash
    const queuePromises = batches.map((batch, index) => {
      const payload = {
        eventId: params.eventId,
        organizationId,
        batchId,
        batchIndex: index,
        totalBatches: batches.length,
        guests: batch.map((guest: SingleGuestForBulkUploadInputParams) => ({
          name: guest.name,
          phone: guest.phone,
          category: guest.category,
          priority: guest.priority,
          numberOfGuests: guest.numberOfGuests,
          additionalGuestNames: guest.additionalGuestNames,
          status: guest.status,
          table: guest.table,
          dietaryRestrictions: guest.dietaryRestrictions,
          notes: guest.notes,
          inviter: guest.inviter,
          preferredLanguage: guest.preferredLanguage,
        })),
      };

      return qstashService.scheduleMessage(
        UPSTASH_BULK_GUEST_UPLOAD_URL,
        payload,
        index * 2, // Stagger batches by 2 seconds each
        `bulk-upload-${batchId}-${index}`
      );
    });

    await Promise.all(queuePromises);

    return {
      success: true,
      batchId,
      totalBatches: batches.length,
      totalGuests: params.guests.reduce((total, guest) => total + guest.numberOfGuests, 0),
      isAsync: true,
      message:
        'Bulk upload has been queued for processing. You can check the status using the batch ID.',
    };
  }

  async replyToSession(sessionId: string, message: string) {
    if (!message.length) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Message cannot be empty',
      });
    }

    const { organizationId } = await this.getOrgFromUserSession();
    const session = await this.db.chatSession.findFirst({
      where: { id: sessionId, organizationId },
    });
    if (!session) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Session not found or access denied',
      });
    }

    if (session.isTestSession) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot reply to a test session',
      });
    }

    if (!session.isActive) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot reply to an inactive session',
      });
    }

    if (!session.phoneNumber) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid chat session configuration',
      });
    }

    if (session.nextReplyAt && session.nextReplyAt > new Date()) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot reply to a session before the next reply time',
      });
    }

    const { phoneNumber } = session;

    const twilioService = new TwilioService({ db: this.db, organizationId });
    if (env.SESSION_REPLY_ENABLED) {
      await twilioService.sendWhatsAppMessage({
        to: phoneNumber,
        body: message,
      });
    }

    await this.db.chatMessage.create({
      data: {
        sessionId,
        direction: MessageDirection.OUTBOUND,
        content: message,
        sentById: this.auth.userId,
      },
    });
    await this.db.chatSession.update({
      where: { id: sessionId },
      data: {
        lastMessageAt: new Date(),
      },
    });

    return message;
  }

  async getMessagesForGuest(guestId: string, eventId: string) {
    const { organizationId } = await this.getOrgFromUserSession();
    // Get the guest to ensure they exist and belong to the event
    const guest = await this.db.guest.findFirst({
      where: {
        id: guestId,
        eventId,
        event: { organizationId },
      },
      select: {
        phone: true,
      },
    });
    if (!guest) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Guest not found or not associated with this event',
      });
    }

    if (!guest.phone) {
      return { messages: [], session: null };
    }

    // 1. Get all chat messages from all sessions for this guest
    const chatMessages = await this.db.chatMessage.findMany({
      where: {
        session: {
          isTestSession: false,
          phoneNumber: normalizePhone(guest.phone, 'MX', false),
          organizationId,
        },
      },
      include: {
        session: true,
        sentBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // 2. Get all message deliveries for this guest
    const messageDeliveries = await this.db.messageDelivery.findMany({
      where: {
        guestId,
        bulkMessage: {
          eventId,
        },
      },
      include: {
        bulkMessage: {
          select: {
            id: true,
            name: true,
            templateName: true,
            templateSid: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Fetch all templates used in the messages to get their content
    const templateSids = [...new Set(messageDeliveries.map(d => d.bulkMessage.templateSid))];
    const templateData: Record<
      string,
      {
        content?: string;
        mediaUrls?: string[];
        hasMedia?: boolean;
      }
    > = {};

    // For each templateSid, try to fetch template details
    const whatsappService = new WhatsappService({ db: this.db, auth: this.auth });
    for (const sid of templateSids) {
      try {
        const template = await whatsappService.fetchTemplateById(sid);
        templateData[sid] = {
          content: template.description || '',
          mediaUrls: template.media || [],
          hasMedia: template.media ? template.media.length > 0 : false,
        };
      } catch (error) {
        console.error(`Error fetching template data for SID ${sid}:`, error);
        templateData[sid] = { content: 'Template content unavailable' };
      }
    }

    let currentActiveSession: ChatSession | null = null;

    // 3. Transform and merge both types of messages
    const formattedChatMessages = chatMessages.map(msg => {
      const session = msg.session;
      if (session.isActive && !session.isTestSession) {
        if (currentActiveSession) {
          if (session.lastMessageAt > currentActiveSession.lastMessageAt) {
            currentActiveSession = session;
          }
        } else {
          currentActiveSession = session;
        }
      }
      return {
        id: msg.id,
        type: 'chat',
        content: msg.content,
        direction: msg.direction,
        timestamp: msg.createdAt,
        sessionId: msg.sessionId,
        isTestMessage: msg.session.isTestSession,
        twilioMessageSid: msg.twilioMessageSid,
        contentType: msg.contentType,
        sentBy:
          msg.direction === MessageDirection.OUTBOUND && msg.sentBy
            ? `${msg.sentBy.firstName} ${msg.sentBy.lastName}`
            : '',
      };
    });

    const formattedDeliveries = messageDeliveries.map(delivery => {
      // Get the template data
      const template = templateData[delivery.bulkMessage.templateSid] || {
        content: 'Template content unavailable',
      };

      // Replace variables in the template content if available
      let filledContent = template.content || delivery.bulkMessage.templateName;
      const variables = delivery.variables as Record<string, string> | null;

      if (variables && template.content) {
        filledContent = Object.entries(variables).reduce((result, [key, value]) => {
          const pattern = new RegExp(`\\{${key}\\}`, 'g');
          return result.replace(pattern, value || '');
        }, template.content);
      }

      return {
        id: delivery.id,
        type: 'template',
        // Content is either the filled template or the template name as fallback
        content: filledContent,
        templateContent: template.content,
        templateVariables: delivery.variables,
        direction: MessageDirection.OUTBOUND, // Templates are always outbound
        timestamp: delivery.sentAt || delivery.createdAt, // Use sentAt if available, otherwise createdAt
        status: delivery.status,
        bulkMessageName: delivery.bulkMessage.name,
        bulkMessageId: delivery.bulkMessageId,
        twilioMessageSid: delivery.messageSid,
        hasMedia: template.hasMedia,
        mediaUrls: template.mediaUrls,
        contentType: 'template',
      };
    });

    // 4. Combine and sort all messages by timestamp
    const allMessages = [...formattedChatMessages, ...formattedDeliveries].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );
    return { messages: allMessages, session: currentActiveSession };
  }

  /**
   * Get additional confirmation responses for a guest
   * @param guestId - Guest ID
   * @returns Additional confirmation responses
   */
  async getConfirmationResponses(guestId: string) {
    const { organizationId } = await this.getOrgFromUserSession();
    const additionalConfirmationResponses = await this.db.guestConfirmationResponse.findMany({
      where: {
        guestId,
        guest: {
          event: {
            organizationId,
          },
        },
      },
      include: {
        selectedOption: true,
      },
    });
    return additionalConfirmationResponses;
  }
}
