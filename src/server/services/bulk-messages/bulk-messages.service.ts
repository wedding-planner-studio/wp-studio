import { TRPCError } from '@trpc/server';
import { BaseService } from '../base-service';
import {
  GetDeliveryStatsByIdsParams,
  ListBulkMessagesParams,
} from './schema/bulk-messages-read.schema';
import { BulkMessageStatus, Prisma, MessageDeliveryStatus } from '@prisma/client';
import { SendBulkMessageParams } from './schema/bulk-messages-write.schema';
import { QstashService } from '../qstash';
import { UPSTASH_BULK_MESSAGE_URL } from '@/lib/constants';

export class BulkMessagesService extends BaseService {
  /**
   * Get delivery stats by bulk message IDs
   * @param ids - Array of bulk message IDs
   * @returns Map of bulk message ID to delivery stats
   */
  async getDeliveryStatsByIds(params: GetDeliveryStatsByIdsParams) {
    const { ids } = params;
    const deliveries = await this.db.messageDelivery.findMany({
      where: { bulkMessageId: { in: ids } },
    });
    // Hash by bulkMessageId
    const deliveryStats = new Map<
      string,
      {
        total: number;
        pending: number;
        delivered: number;
        failed: number;
        sent: number;
      }
    >();
    deliveries.forEach(delivery => {
      const bulkMessageId = delivery.bulkMessageId;
      if (!deliveryStats.has(bulkMessageId)) {
        deliveryStats.set(bulkMessageId, {
          total: 0,
          pending: 0,
          delivered: 0,
          failed: 0,
          sent: 0,
        });
      }
      deliveryStats.get(bulkMessageId)!.total++;
      switch (delivery.status) {
        case MessageDeliveryStatus.PENDING:
        case MessageDeliveryStatus.QUEUED:
          deliveryStats.get(bulkMessageId)!.pending++;
          break;
        case MessageDeliveryStatus.DELIVERED:
        case MessageDeliveryStatus.READ:
          deliveryStats.get(bulkMessageId)!.delivered++;
          break;
        case MessageDeliveryStatus.FAILED:
          deliveryStats.get(bulkMessageId)!.failed++;
          break;
        case MessageDeliveryStatus.SENT:
          deliveryStats.get(bulkMessageId)!.sent++;
          break;
      }
    });
    return deliveryStats;
  }

  /**
   * Get a bulk message by ID
   * @param id - The ID of the bulk message
   * @returns The bulk message
   */
  async getById(id: string) {
    const { organizationId } = await this.getOrgFromUserSession();

    // Get the bulk message and verify access in a single query
    const bulkMessage = await this.db.bulkMessage.findFirst({
      where: {
        id,
        event: {
          organizationId,
        },
      },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            date: true,
          },
        },
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        deliveries: {
          include: {
            guest: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!bulkMessage) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Bulk message not found or access denied',
      });
    }

    // Get delivery stats
    const stats = {
      total: bulkMessage.deliveries.length,
      pending: 0,
      delivered: 0,
      failed: 0,
      sent: 0,
    };

    bulkMessage.deliveries.forEach(delivery => {
      switch (delivery.status) {
        case MessageDeliveryStatus.PENDING:
        case MessageDeliveryStatus.QUEUED:
          stats.pending++;
          break;
        case MessageDeliveryStatus.DELIVERED:
        case MessageDeliveryStatus.READ:
          stats.delivered++;
          break;
        case MessageDeliveryStatus.FAILED:
          stats.failed++;
          break;
        case MessageDeliveryStatus.SENT:
          stats.sent++;
          break;
      }
    });

    return {
      ...bulkMessage,
      stats,
    };
  }

  /**
   * Get a delivery by ID
   * @param id - The ID of the delivery
   * @returns The delivery
   */
  async getDeliveryById(id: string) {
    const { organizationId } = await this.getOrgFromUserSession();
    const delivery = await this.db.messageDelivery.findFirst({
      where: { id, bulkMessage: { event: { organizationId } } },
    });
    return delivery;
  }

  /**
   * List all bulk messages for an event
   * @param params - The parameters for the list
   * @returns The list of bulk messages
   */
  async list(params: ListBulkMessagesParams) {
    const { page, limit, search, status, eventId } = params;
    const skip = (page - 1) * limit;

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
    const where: Prisma.BulkMessageWhereInput = {
      eventId,
      // Filter by status if provided
      ...(status ? { status } : {}),
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
                templateName: {
                  contains: search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            ],
          }
        : {}),
    };

    // Get bulk messages with pagination
    const [messages, total] = await Promise.all([
      this.db.bulkMessage.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: limit,
        include: {
          createdBy: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          _count: {
            select: {
              deliveries: true,
            },
          },
        },
      }),
      this.db.bulkMessage.count({ where }),
    ]);

    // Get stats for the bulk messages
    const stats = await this.db.bulkMessage.groupBy({
      by: ['status'],
      where: { eventId },
      _count: true,
    });

    // Format stats
    const messageStats = {
      total,
      created: 0,
      sending: 0,
      completed: 0,
    };

    stats.forEach(stat => {
      switch (stat.status) {
        case BulkMessageStatus.CREATED:
          messageStats.created = stat._count;
          break;
        case BulkMessageStatus.SENDING:
          messageStats.sending = stat._count;
          break;
        case BulkMessageStatus.COMPLETED:
          messageStats.completed = stat._count;
          break;
      }
    });

    return {
      messages,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      stats: messageStats,
    };
  }

  async sendBulkMessage(params: SendBulkMessageParams) {
    // Get the organization ID and user
    const { organizationId } = await this.getOrgFromUserSession();

    // Verify event belongs to user's organization
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

    // Create bulk message record first
    const bulkMessage = await this.db.bulkMessage.create({
      data: {
        name: params.name,
        templateSid: params.templateSid,
        templateName: params.templateName,
        eventId: params.eventId,
        status: BulkMessageStatus.CREATED,
        createdById: this.auth.userId,
        deliveries: {
          createMany: {
            data: params.guestIds.map(guestId => ({
              guestId,
              status: MessageDeliveryStatus.PENDING,
              variables: params.variables ?? {},
            })),
          },
        },
      },
      include: {
        deliveries: {
          include: {
            guest: true,
          },
        },
      },
    });

    // Queue all messages at once in QStash with staggered delays
    try {
      const qstashService = new QstashService();
      const results = await qstashService.addToQueue({
        url: UPSTASH_BULK_MESSAGE_URL,
        payload: bulkMessage.deliveries,
        templateName: params.templateName,
        templateSid: params.templateSid,
        formatter: delivery => ({
          guestId: delivery.guest.id,
          phone: delivery.guest.phone,
          variables: delivery.variables,
          deliveryId: delivery.id,
          bulkMessageId: bulkMessage.id,
        }),
      });

      // Update all deliveries with their QStash message IDs
      await Promise.all(
        results.map((result, index) => {
          const deliveryId = bulkMessage.deliveries[index]?.id;
          if (!deliveryId) return Promise.resolve();

          return this.db.messageDelivery.update({
            where: { id: deliveryId },
            data: {
              messageSid: (result as { messageId: string }).messageId,
              status: MessageDeliveryStatus.QUEUED,
              queuedAt: new Date(),
            },
          });
        })
      );
    } catch (error) {
      console.error('Failed to queue bulk messages:', error);
      // Mark all deliveries as failed
      await this.db.messageDelivery.updateMany({
        where: { bulkMessageId: bulkMessage.id },
        data: {
          status: MessageDeliveryStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : 'Failed to queue messages',
        },
      });
    }

    return {
      success: true,
      message: 'Bulk message created and messages queued',
      bulkMessageId: bulkMessage.id,
      totalRecipients: params.guestIds.length,
    };
  }

  /**
   * Retry a message delivery
   * @param bulkMessageId - The ID of the bulk message
   * @param deliveryId - The ID of the delivery to retry
   */
  async retryMessageDelivery(bulkMessageId: string, deliveryId: string) {
    const delivery = await this.db.messageDelivery.findFirst({
      where: {
        id: deliveryId,
        bulkMessageId,
        status: {
          in: [MessageDeliveryStatus.PENDING, MessageDeliveryStatus.FAILED],
        },
      },
      include: {
        guest: true,
        bulkMessage: true,
      },
    });

    if (delivery) {
      if (delivery.retryCount >= delivery.bulkMessage.maxRetries) {
        await this.db.messageDelivery.update({
          where: { id: delivery.id },
          data: {
            status: MessageDeliveryStatus.FAILED,
            errorMessage: `${delivery.errorMessage ?? 'Unknown error'}. Failed after ${delivery.retryCount} retries`,
          },
        });
        return;
      }
      const qstashService = new QstashService();
      const [result] = await qstashService.addToQueue({
        url: UPSTASH_BULK_MESSAGE_URL,
        payload: [delivery],
        templateName: delivery.bulkMessage.templateName,
        templateSid: delivery.bulkMessage.templateSid,
        formatter: delivery => ({
          guestId: delivery.guest.id,
          phone: delivery.guest.phone,
          variables: delivery.variables,
          deliveryId: delivery.id,
        }),
      });
      await this.db.messageDelivery.update({
        where: { id: delivery.id },
        data: {
          messageSid: (result as { messageId: string }).messageId,
          status: MessageDeliveryStatus.QUEUED,
          queuedAt: new Date(),
          retryCount: {
            increment: 1,
          },
        },
      });
    }
  }

  /**
   * Retry multiple message deliveries
   * @param deliveryIds - Array of delivery IDs to retry
   */
  async retryDeliveries(deliveryIds: string[]) {
    const deliveries = await this.db.messageDelivery.findMany({
      where: {
        id: { in: deliveryIds },
        OR: [{ status: MessageDeliveryStatus.FAILED }, { status: MessageDeliveryStatus.PENDING }],
      },
      include: {
        bulkMessage: true,
      },
    });

    // Process each delivery in parallel
    await Promise.all(
      deliveries.map(delivery => this.retryMessageDelivery(delivery.bulkMessage.id, delivery.id))
    );

    return {
      success: true,
      retriedCount: deliveries.length,
    };
  }
}
