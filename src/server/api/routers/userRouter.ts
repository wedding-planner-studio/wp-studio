import { createTRPCRouter, privateProcedure, publicProcedure } from '@/server/api/trpc';
import { SlackNotification } from '@/server/services/notifications';
import { waitlistEntryTemplate } from '@/server/services/notifications/slack/templates/waitlist-entry';
import { UsersService } from '@/server/services/users/users.service';
import { UserStatus } from '@prisma/client';
import { z } from 'zod';

export const userRouter = createTRPCRouter({
  get: privateProcedure.query(async ({ ctx }) => {
    const usersService = new UsersService({ db: ctx.db, auth: ctx.auth });
    return usersService.getUser(ctx.auth.userId);
  }),
  hasAccessToEvent: privateProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      const usersService = new UsersService({ db: ctx.db, auth: ctx.auth });
      return usersService.hasAccessToEvent(ctx.auth.userId, input.eventId);
    }),

  // New procedure for waitlist submissions
  joinWaitlist: publicProcedure
    .input(
      z.object({
        email: z.string().email().optional(),
        name: z.string().min(1),
        phone: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Check if email already exists in waitlist
        let waitlistEntry;
        if (input.email) {
          const existingEntry = await ctx.db.waitlist.findUnique({
            where: { email: input.email },
          });

          if (existingEntry) {
            // Return success but indicate entry already exists
            return {
              success: true,
              data: existingEntry,
              alreadyExists: true,
            };
          }
        }

        // Create new entry if email doesn't exist or is empty
        waitlistEntry = await ctx.db.waitlist.create({
          data: {
            email: input.email ?? '',
            name: input.name,
            phone: input.phone,
          },
        });

        // await new SlackNotification(
        //   waitlistEntryTemplate(
        //     `${waitlistEntry.name} (${waitlistEntry.email})`,
        //     waitlistEntry.phone ?? undefined
        //   )
        // ).send();
        return { success: true, data: waitlistEntry };
      } catch (error) {
        console.error(error);
        throw new Error('Failed to join waitlist');
      }
    }),
});
