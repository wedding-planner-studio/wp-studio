import { z } from 'zod';
import { createTRPCRouter, privateProcedure, enforcePermission } from '@/server/api/trpc';
import { TRPCError } from '@trpc/server';
import { EventStatus, GuestStatus, UserRole } from '@prisma/client';

export const agentDebuggerRouter = createTRPCRouter({
  // Get all chat sessions for debugging
  getChatSessions: privateProcedure
    .use(enforcePermission('chatbot', 'read'))
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
        search: z.string().optional(),
        isTestSession: z.boolean().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { limit, cursor, search, isTestSession, isActive } = input;

      // Build where clause based on user role
      let whereClause: any = {};

      // If user is not SUDO, restrict to their organization
      if (ctx.auth.role !== UserRole.SUDO) {
        const user = await ctx.db.user.findUnique({
          where: { id: ctx.auth.userId },
          select: { organizationId: true },
        });

        if (!user?.organizationId) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'User not associated with an organization',
          });
        }

        whereClause.organizationId = user.organizationId;
      }

      // Add optional filters
      if (isTestSession !== undefined) {
        whereClause.isTestSession = isTestSession;
      }
      if (isActive !== undefined) {
        whereClause.isActive = isActive;
      }

      // Add comprehensive search filter
      if (search) {
        // First, get phone numbers of guests that match the search term
        const matchingGuestPhones = await ctx.db.guest.findMany({
          where: {
            name: { contains: search, mode: 'insensitive' },
          },
          select: { phone: true },
        });

        const guestPhoneNumbers = matchingGuestPhones
          .map(guest => guest.phone)
          .filter(phone => phone !== null);

        const searchConditions = [
          // Search by phone number
          { phoneNumber: { contains: search, mode: 'insensitive' } },

          // Search by organization name
          { organization: { name: { contains: search, mode: 'insensitive' } } },

          // Search by event name
          { event: { name: { contains: search, mode: 'insensitive' } } },

          // Search in message content
          {
            messages: {
              some: {
                content: { contains: search, mode: 'insensitive' },
              },
            },
          },
        ];

        // Add guest phone number search if we found matching guests
        if (guestPhoneNumbers.length > 0) {
          (searchConditions as any[]).push({
            phoneNumber: { in: guestPhoneNumbers },
          });
        }

        whereClause.OR = searchConditions;
      }

      // Add cursor-based pagination
      if (cursor) {
        whereClause.id = { lt: cursor };
      }

      const sessions = await ctx.db.chatSession.findMany({
        where: whereClause,
        include: {
          organization: {
            select: { id: true, name: true },
          },
          event: {
            select: { id: true, name: true },
          },
          _count: {
            select: {
              messages: true,
              agentExecutions: true,
            },
          },
        },
        orderBy: { lastMessageAt: 'desc' },
        take: limit + 1, // Take one extra to determine if there are more
      });

      let nextCursor: string | undefined = undefined;
      if (sessions.length > limit) {
        const nextItem = sessions.pop(); // Remove the extra item
        nextCursor = nextItem!.id;
      }

      return {
        sessions,
        nextCursor,
      };
    }),
  // Get Session's "Name" by guest phone number
  getGuestsByPhoneNumbers: privateProcedure
    .use(enforcePermission('chatbot', 'read'))
    .input(z.object({ phoneNumber: z.array(z.string()) }))
    .query(async ({ ctx, input }) => {
      const { phoneNumber } = input;
      const guests = await ctx.db.guest.findMany({
        where: {
          phone: { in: phoneNumber },
          isPrimaryGuest: true,
          status: {
            not: GuestStatus.INACTIVE,
          },
          event: {
            status: EventStatus.ACTIVE,
          },
        },
        include: {
          event: {
            select: {
              organizationId: true,
              name: true,
            },
          },
        },
      });
      // Will return a list of guests with their name, phone, and organizationId
      return guests.map(guest => ({
        id: guest.id,
        name: guest.name,
        phone: guest.phone,
        eventName: guest.event.name,
        organizationId: guest.event.organizationId,
      }));
    }),
  // Get detailed session data for debugging
  getSessionDetails: privateProcedure
    .use(enforcePermission('chatbot', 'read'))
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { sessionId } = input;

      // Build where clause based on user role
      let whereClause: any = { id: sessionId };

      // If user is not SUDO, restrict to their organization
      if (ctx.auth.role !== UserRole.SUDO) {
        const user = await ctx.db.user.findUnique({
          where: { id: ctx.auth.userId },
          select: { organizationId: true },
        });

        if (!user?.organizationId) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'User not associated with an organization',
          });
        }

        whereClause.organizationId = user.organizationId;
      }

      const session = await ctx.db.chatSession.findUnique({
        where: whereClause,
        include: {
          organization: {
            select: { id: true, name: true },
          },
          event: {
            select: { id: true, name: true },
          },
          messages: {
            include: {
              sentBy: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
              agentExecution: {
                include: {
                  agent: {
                    select: { id: true, name: true, type: true },
                  },
                  loopIterations: {
                    include: {
                      apiCalls: {
                        select: {
                          id: true,
                          messageId: true,
                          model: true,
                          inputTokens: true,
                          cacheCreationTokens: true,
                          cacheReadTokens: true,
                          outputTokens: true,
                          estimatedCost: true,
                          responseTimeMs: true,
                          createdAt: true,
                        },
                      },
                    },
                    orderBy: { iterationNumber: 'asc' },
                  },
                  subExecutions: {
                    include: {
                      agent: {
                        select: { id: true, name: true, type: true },
                      },
                      loopIterations: {
                        include: {
                          apiCalls: {
                            select: {
                              id: true,
                              messageId: true,
                              model: true,
                              inputTokens: true,
                              cacheCreationTokens: true,
                              cacheReadTokens: true,
                              outputTokens: true,
                              estimatedCost: true,
                              responseTimeMs: true,
                              createdAt: true,
                            },
                          },
                        },
                        orderBy: { iterationNumber: 'asc' },
                      },
                      // Include nested sub-executions (in case there are multiple levels)
                      subExecutions: {
                        include: {
                          agent: {
                            select: { id: true, name: true, type: true },
                          },
                          loopIterations: {
                            include: {
                              apiCalls: {
                                select: {
                                  id: true,
                                  messageId: true,
                                  model: true,
                                  inputTokens: true,
                                  cacheCreationTokens: true,
                                  cacheReadTokens: true,
                                  outputTokens: true,
                                  estimatedCost: true,
                                  responseTimeMs: true,
                                  createdAt: true,
                                },
                              },
                            },
                            orderBy: { iterationNumber: 'asc' },
                          },
                        },
                        orderBy: { startedAt: 'asc' },
                      },
                    },
                    orderBy: { startedAt: 'asc' },
                  },
                },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Chat session not found',
        });
      }

      return session;
    }),

  // Get agent execution details
  getAgentExecutionDetails: privateProcedure
    .use(enforcePermission('chatbot', 'read'))
    .input(z.object({ executionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { executionId } = input;

      const execution = await ctx.db.agentExecution.findUnique({
        where: { id: executionId },
        include: {
          agent: true,
          session: {
            include: {
              organization: {
                select: { id: true, name: true },
              },
              event: {
                select: { id: true, name: true },
              },
            },
          },
          loopIterations: {
            include: {
              apiCalls: true,
            },
            orderBy: { iterationNumber: 'asc' },
          },
          apiCalls: {
            orderBy: { createdAt: 'asc' },
          },
          subExecutions: {
            include: {
              agent: {
                select: { id: true, name: true, type: true },
              },
              loopIterations: {
                include: {
                  apiCalls: true,
                },
                orderBy: { iterationNumber: 'asc' },
              },
            },
          },
          parentExecution: {
            include: {
              agent: {
                select: { id: true, name: true, type: true },
              },
            },
          },
        },
      });

      if (!execution) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Agent execution not found',
        });
      }

      // Check permissions - if user is not SUDO, verify they have access to this execution's organization
      if (ctx.auth.role !== UserRole.SUDO) {
        const user = await ctx.db.user.findUnique({
          where: { id: ctx.auth.userId },
          select: { organizationId: true },
        });

        if (!user?.organizationId || execution.session.organizationId !== user.organizationId) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Access denied to this agent execution',
          });
        }
      }

      return execution;
    }),

  // Get system status/stats for the debugger
  getSystemStatus: privateProcedure
    .use(enforcePermission('chatbot', 'read'))
    .query(async ({ ctx }) => {
      // Build where clause based on user role
      let whereClause: any = {};

      // If user is not SUDO, restrict to their organization
      if (ctx.auth.role !== UserRole.SUDO) {
        const user = await ctx.db.user.findUnique({
          where: { id: ctx.auth.userId },
          select: { organizationId: true },
        });

        if (!user?.organizationId) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'User not associated with an organization',
          });
        }

        whereClause.organizationId = user.organizationId;
      }

      // Get counts and stats
      const [
        totalSessions,
        activeSessions,
        testSessions,
        totalMessages,
        totalExecutions,
        recentApiCalls,
      ] = await Promise.all([
        ctx.db.chatSession.count({ where: whereClause }),
        ctx.db.chatSession.count({ where: { ...whereClause, isActive: true } }),
        ctx.db.chatSession.count({ where: { ...whereClause, isTestSession: true } }),
        ctx.db.chatMessage.count({
          where: {
            session: whereClause,
          },
        }),
        ctx.db.agentExecution.count({
          where: {
            session: whereClause,
          },
        }),
        ctx.db.chatbotApiCall.count({
          where: {
            session: whereClause,
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
        }),
      ]);

      // Get token usage stats for the last 24 hours
      const tokenStats = await ctx.db.chatbotApiCall.aggregate({
        where: {
          session: whereClause,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
        _sum: {
          inputTokens: true,
          cacheCreationTokens: true,
          cacheReadTokens: true,
          outputTokens: true,
          estimatedCost: true,
        },
      });

      return {
        totalSessions,
        activeSessions,
        testSessions,
        totalMessages,
        totalExecutions,
        recentApiCalls,
        tokenStats: {
          inputTokens: tokenStats._sum.inputTokens || 0,
          cacheCreationTokens: tokenStats._sum.cacheCreationTokens || 0,
          cacheReadTokens: tokenStats._sum.cacheReadTokens || 0,
          outputTokens: tokenStats._sum.outputTokens || 0,
          totalCost: tokenStats._sum.estimatedCost || 0,
        },
      };
    }),
});
