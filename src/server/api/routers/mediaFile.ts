import { z } from 'zod';
import { createTRPCRouter, enforcePermission, privateProcedure } from '@/server/api/trpc';
import { TRPCError } from '@trpc/server';

export const mediaFilesRouter = createTRPCRouter({
  getOrganizationMediaFiles: privateProcedure
    .use(enforcePermission('media', 'read'))
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = await ctx.db.user.findFirstOrThrow({
        where: { id: ctx.auth.userId },
        select: { organizationId: true },
      });
      if (!organizationId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User is not associated with an organization',
        });
      }
      const mediaFiles = await ctx.db.mediaFile.findMany({
        where: {
          organizationId,
          eventId: input.eventId,
          deletedAt: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      return mediaFiles;
    }),
  deleteMediaFile: privateProcedure
    .use(enforcePermission('media', 'delete'))
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = await ctx.db.user.findFirstOrThrow({
        where: { id: ctx.auth.userId },
        select: { organizationId: true },
      });

      if (!organizationId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User is not associated with an organization',
        });
      }

      // Verify the media file belongs to the user's organization
      const mediaFile = await ctx.db.mediaFile.findFirst({
        where: {
          id: input.id,
          organizationId,
        },
      });

      if (!mediaFile) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Media file not found',
        });
      }

      return ctx.db.mediaFile.update({
        where: {
          id: input.id,
        },
        data: {
          deletedAt: new Date(),
        },
      });
    }),
});
