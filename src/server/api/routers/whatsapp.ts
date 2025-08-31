import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, enforcePermission, privateProcedure } from '@/server/api/trpc';
import { UserRole } from '@prisma/client';
import { WhatsappService } from '@/server/services/whatsapp/whatsapp-service';
import { createWhatsAppTemplateSchema } from '@/server/services/whatsapp/schema/whatsapp-write.schema';
import { ChatSessionHandler } from '@/server/services/chatbot/chat-session-handler';
import { GuestsService } from '@/server/services/guests/guests.service';

export const whatsappRouter = createTRPCRouter({
  getTemplates: privateProcedure
    .use(enforcePermission('whatsapp', 'read'))
    .query(async ({ ctx }) => {
      const whatsappService = new WhatsappService({ db: ctx.db, auth: ctx.auth });
      return whatsappService.fetchTemplates();
    }),
  getTemplateById: privateProcedure
    .use(enforcePermission('whatsapp', 'read'))
    .input(z.object({ id: z.string(), ignoreCache: z.boolean().optional() }))
    .query(async ({ input, ctx }) => {
      const { id, ignoreCache } = input;
      const whatsappService = new WhatsappService({ db: ctx.db, auth: ctx.auth });
      return whatsappService.fetchTemplateById(id, ignoreCache);
    }),
  getMessagesForGuest: privateProcedure
    .use(enforcePermission('whatsapp', 'read'))
    .input(
      z.object({
        guestId: z.string(),
        eventId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { guestId, eventId } = input;
      const guestsService = new GuestsService({ db: ctx.db, auth: ctx.auth });
      return guestsService.getMessagesForGuest(guestId, eventId);
    }),
  replyToSession: privateProcedure
    .use(enforcePermission('chatbot', 'update'))
    .input(z.object({ sessionId: z.string(), message: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { sessionId, message } = input;
      const guestsService = new GuestsService({ db: ctx.db, auth: ctx.auth });
      return guestsService.replyToSession(sessionId, message);
    }),
  toggleChatbotEnabled: privateProcedure
    .use(enforcePermission('chatbot', 'update'))
    .input(
      z.object({
        eventId: z.string(),
        enabled: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { eventId, enabled } = input;

        // Check if user has access to this event
        let include = {};
        if (ctx.auth.role === UserRole.EVENT_MANAGER) {
          include = {
            managedEvents: {
              where: {
                eventId,
              },
            },
          };
        }

        const user = await ctx.db.user.findUnique({
          where: { id: ctx.auth.userId },
          include,
        });

        if (!user?.organizationId) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'User not associated with an organization',
          });
        }

        // Update the event's chatbot status
        const updatedEvent = await ctx.db.event.update({
          where: {
            id: eventId,
            organizationId: user.organizationId,
          },
          data: {
            hasChatbotEnabled: enabled,
          },
          select: {
            id: true,
            name: true,
            hasChatbotEnabled: true,
          },
        });

        return updatedEvent;
      } catch (error) {
        console.error('Error toggling chatbot status:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update chatbot status',
          cause: error,
        });
      }
    }),
  testChatbot: privateProcedure
    .use(enforcePermission('chatbot', 'read'))
    .input(
      z.object({
        guestId: z.string(),
        eventId: z.string(),
        message: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { guestId, eventId, message } = input;
      try {
        //
        let include = {};
        if (ctx.auth.role === UserRole.EVENT_MANAGER) {
          include = {
            managedEvents: {
              where: {
                eventId,
              },
            },
          };
        }
        const user = await ctx.db.user.findUnique({
          where: { id: ctx.auth.userId },
          include,
        });

        if (!user?.organizationId) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'User not associated with an organization',
          });
        }

        // Get the guest details
        const guest = await ctx.db.guest.findUnique({
          where: { id: guestId, event: { organizationId: user.organizationId } },
        });

        // Initialize chatbot service
        const chatSessionHandler = new ChatSessionHandler({
          db: ctx.db,
          isTestSession: true,
          organizationId: user.organizationId,
        });
        const response = await chatSessionHandler.handleIncomingMessage({
          From: guest?.phone ?? 'Unknown',
          Body: message,
        });

        return response;
      } catch (error) {
        console.error('Error in chatbot test:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to process chatbot message',
          cause: error,
        });
      }
    }),
  closeSessionForUser: privateProcedure
    .use(enforcePermission('chatbot', 'update'))
    .input(z.object({ phoneNumber: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { phoneNumber } = input;
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.auth.userId },
        select: {
          organizationId: true,
        },
      });
      if (!user?.organizationId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User not associated with an organization',
        });
      }
      // Only for test sessions. Real sessions are closed through Upstash Cronjob
      const chatSessionHandler = new ChatSessionHandler({
        db: ctx.db,
        isTestSession: true,
        organizationId: user.organizationId,
      });
      await chatSessionHandler.closeSessionForUser(phoneNumber);
    }),
  createTemplate: privateProcedure
    .use(enforcePermission('whatsapp', 'create'))
    .input(createWhatsAppTemplateSchema)
    .mutation(async ({ input, ctx }) => {
      const whatsappService = new WhatsappService({ db: ctx.db, auth: ctx.auth });
      return whatsappService.createTemplate(input);
    }),
  deleteTemplate: privateProcedure
    .use(enforcePermission('whatsapp', 'delete'))
    .input(
      z.object({
        contentSid: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const whatsappService = new WhatsappService({ db: ctx.db, auth: ctx.auth });
      return whatsappService.deleteTemplate(input.contentSid);
    }),
});
