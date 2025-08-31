import { z } from 'zod';
import { createTRPCRouter, enforcePermission, privateProcedure } from '@/server/api/trpc';
import {
  CreateVenueSchema,
  UpdateVenueSchema,
} from '@/server/services/venues/schema/venue-write.schema';
import { VenuesService } from '@/server/services/venues/venues.service';

export const venuesRouter = createTRPCRouter({
  // Get all venues for an event
  getByEventId: privateProcedure
    .use(enforcePermission('venues', 'read'))
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      const venuesService = new VenuesService({
        db: ctx.db,
        auth: ctx.auth,
      });
      return venuesService.getByEventId(input.eventId);
    }),

  // Create a new venue
  create: privateProcedure
    .use(enforcePermission('venues', 'create'))
    .input(CreateVenueSchema)
    .mutation(async ({ ctx, input }) => {
      const venuesService = new VenuesService({
        db: ctx.db,
        auth: ctx.auth,
      });
      return venuesService.create(input);
    }),

  // Update an existing venue
  update: privateProcedure
    .use(enforcePermission('venues', 'update'))
    .input(UpdateVenueSchema)
    .mutation(async ({ ctx, input }) => {
      const venuesService = new VenuesService({
        db: ctx.db,
        auth: ctx.auth,
      });
      return venuesService.update(input);
    }),

  // Delete a venue
  delete: privateProcedure
    .use(enforcePermission('venues', 'delete'))
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const venuesService = new VenuesService({
        db: ctx.db,
        auth: ctx.auth,
      });
      return venuesService.delete(input.id);
    }),
});
