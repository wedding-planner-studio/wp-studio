import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, privateProcedure } from '@/server/api/trpc';
import { RequestStatus } from '@prisma/client';

export const guestRequestsRouter = createTRPCRouter({
  countPending: privateProcedure
    .input(z.object({ eventId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const count = await ctx.db.guestRequest.count({
        where: { eventId: input.eventId, status: RequestStatus.PENDING },
      });
      return count;
    }),

  /**
   * Lists guest requests for a specific event.
   * Requires authenticated user (planner).
   */
  listByEvent: privateProcedure
    .input(
      z.object({
        eventId: z.string().cuid(),
        status: z.nativeEnum(RequestStatus).optional(), // Optional filter by status
      })
    )
    .query(async ({ ctx, input }) => {
      // TODO: Add authorization check - ensure user has access to this event
      // This might involve checking if ctx.session.user.organizationId matches event.organizationId
      // or if the user is explicitly linked to the event.

      const requests = await ctx.db.guestRequest.findMany({
        where: {
          eventId: input.eventId,
          status: input.status, // Filter by status if provided
        },
        include: {
          notes: {
            include: {
              createdByUser: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          guest: true,
          resolvedByUser: {
            // Include resolver details
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc', // Show newest requests first
        },
      });

      return requests;
    }),

  /**
   * Updates the status of a guest request to RESOLVED.
   * Requires authenticated user (planner).
   */
  updateStatus: privateProcedure
    .input(
      z.object({
        requestId: z.string().cuid(),
        // Note: We only allow setting to RESOLVED via this specific mutation for now.
        // status: z.literal(RequestStatus.RESOLVED),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.auth.userId;

      // 1. Find the request and verify the event context (for auth check)
      const request = await ctx.db.guestRequest.findUnique({
        where: { id: input.requestId },
        select: { eventId: true }, // Select eventId for potential auth checks
      });

      if (!request) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Guest request not found.',
        });
      }

      // TODO: Add proper authorization check here.
      // Ensure ctx.session.user has permission to manage requests for request.eventId

      // 2. Update the request
      const updatedRequest = await ctx.db.guestRequest.update({
        where: { id: input.requestId },
        data: {
          status: RequestStatus.RESOLVED,
          resolvedAt: new Date(),
          resolvedByUserId: userId,
        },
      });

      return updatedRequest;
    }),

  createNote: privateProcedure
    .input(
      z.object({
        requestId: z.string().cuid(),
        note: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.auth.userId;

      const note = await ctx.db.guestRequestNote.create({
        data: {
          guestRequestId: input.requestId,
          note: input.note,
          createdByUserId: userId,
        },
      });

      return note;
    }),

  /**
   * Reopens a resolved guest request by setting its status back to PENDING
   */
  reopenRequest: privateProcedure
    .input(
      z.object({
        requestId: z.string().cuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Find the request and verify it exists
      const request = await ctx.db.guestRequest.findUnique({
        where: { id: input.requestId },
        select: {
          eventId: true,
          status: true,
        },
      });

      if (!request) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Guest request not found.',
        });
      }

      // 2. Update the request status to PENDING
      const updatedRequest = await ctx.db.guestRequest.update({
        where: { id: input.requestId },
        data: {
          status: RequestStatus.PENDING,
          resolvedAt: null,
          resolvedByUserId: null,
        },
      });

      return updatedRequest;
    }),

  /**
   * Dismisses a guest request and adds a note explaining why
   */
  dismissRequest: privateProcedure
    .input(
      z.object({
        requestId: z.string().cuid(),
        note: z.string().min(1, 'Please provide a reason for dismissing this request'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.auth.userId;

      // Start a transaction to update both the request and add the note
      const result = await ctx.db.$transaction(async tx => {
        // 1. Update the request status
        const updatedRequest = await tx.guestRequest.update({
          where: { id: input.requestId },
          data: {
            status: RequestStatus.IGNORED,
            resolvedAt: new Date(),
            resolvedByUserId: userId,
          },
        });

        // 2. Add the dismissal note
        const note = await tx.guestRequestNote.create({
          data: {
            guestRequestId: input.requestId,
            note: `[Dismissed] ${input.note}`,
            createdByUserId: userId,
          },
        });

        return { updatedRequest, note };
      });

      return result;
    }),
});
