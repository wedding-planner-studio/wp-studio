import { z } from 'zod';
import { createTRPCRouter, enforcePermission, privateProcedure } from '@/server/api/trpc';
import {
  CheckPhoneNumbersSchema,
  GuestsListSchema,
} from '@/server/services/guests/schema/guests-read.schema';
import { GuestsService } from '@/server/services/guests/guests.service';
import {
  GuestUpdateSchema,
  GuestInputSchema,
  BulkGuestInputSchema,
} from '@/server/services/guests/schema/guest-write.schema';
import { GuestsByIdsSchema } from '@/server/services/guests/schema/guests-read.schema';
import { UpdatesLogsService } from '@/server/services/updates-logs/updates-logs.service';

export const guestsRouter = createTRPCRouter({
  getAll: privateProcedure
    .use(enforcePermission('guests', 'read'))
    .input(GuestsListSchema)
    .query(async ({ ctx, input }) => {
      const guestsService = new GuestsService({
        db: ctx.db,
        auth: ctx.auth,
      });
      return guestsService.list(input);
    }),
  getPartyDetails: privateProcedure
    .use(enforcePermission('guests', 'read'))
    .input(
      z.object({
        groupId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const guestsService = new GuestsService({
        db: ctx.db,
        auth: ctx.auth,
      });
      return guestsService.getPartyDetails(input.groupId);
    }),
  getConfirmationResponses: privateProcedure
    .use(enforcePermission('guests', 'read'))
    .input(z.object({ guestId: z.string() }))
    .query(async ({ ctx, input }) => {
      const guestsService = new GuestsService({
        db: ctx.db,
        auth: ctx.auth,
      });
      return guestsService.getConfirmationResponses(input.guestId);
    }),
  create: privateProcedure
    .use(enforcePermission('guests', 'create'))
    .input(GuestInputSchema)
    .mutation(async ({ ctx, input }) => {
      const guestsService = new GuestsService({
        db: ctx.db,
        auth: ctx.auth,
      });
      return guestsService.create(input);
    }),

  update: privateProcedure
    .use(enforcePermission('guests', 'update'))
    .input(GuestUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const guestsService = new GuestsService({
        db: ctx.db,
        auth: ctx.auth,
      });
      return guestsService.update(input);
    }),

  delete: privateProcedure
    .use(enforcePermission('guests', 'delete'))
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const guestsService = new GuestsService({
        db: ctx.db,
        auth: ctx.auth,
      });
      return guestsService.delete(input.id);
    }),

  getById: privateProcedure
    .use(enforcePermission('guests', 'read'))
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const guestsService = new GuestsService({
        db: ctx.db,
        auth: ctx.auth,
      });
      return guestsService.getById(input.id);
    }),

  bulkUpload: privateProcedure.input(BulkGuestInputSchema).mutation(async ({ ctx, input }) => {
    const guestsService = new GuestsService({
      db: ctx.db,
      auth: ctx.auth,
    });
    return guestsService.bulkUpload(input);
  }),
  checkPhoneNumbers: privateProcedure
    .input(CheckPhoneNumbersSchema)
    .mutation(async ({ ctx, input }) => {
      const guestsService = new GuestsService({
        db: ctx.db,
        auth: ctx.auth,
      });
      return guestsService.checkPhoneNumbers(input);
    }),
  getByIds: privateProcedure.input(GuestsByIdsSchema).query(async ({ ctx, input }) => {
    const guestsService = new GuestsService({
      db: ctx.db,
      auth: ctx.auth,
    });
    return guestsService.getByIds(input);
  }),
  getEventUpdatesLogs: privateProcedure
    .input(
      z.object({
        eventId: z.string(),
        limit: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const updatesLogsService = new UpdatesLogsService({
        db: ctx.db,
        auth: ctx.auth,
      });
      return updatesLogsService.getEventUpdatesLogs(input.eventId, input.limit);
    }),
});
