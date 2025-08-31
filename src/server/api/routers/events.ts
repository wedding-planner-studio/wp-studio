import { z } from 'zod';
import { createTRPCRouter, enforcePermission, privateProcedure } from '@/server/api/trpc';
import { EventsService } from '@/server/services/events/events.service';
import {
  EventInputSchema,
  EventUpdateSchema,
  EventDuplicateSchema,
} from '@/server/services/events/schema/event-write.schema';
import { ListEventsSchema } from '@/server/services/events/schema/event-read.schema';

export const eventsRouter = createTRPCRouter({
  getAll: privateProcedure
    .use(enforcePermission('events', 'read'))
    .input(ListEventsSchema)
    .query(async ({ ctx, input }) => {
      const eventsService = new EventsService({ db: ctx.db, auth: ctx.auth });
      return eventsService.listEvents(input);
    }),

  getById: privateProcedure
    .use(enforcePermission('events', 'read'))
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const eventsService = new EventsService({ db: ctx.db, auth: ctx.auth });
      return eventsService.getById(input.id);
    }),
  quickStats: privateProcedure
    .use(enforcePermission('events', 'read'))
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const eventsService = new EventsService({ db: ctx.db, auth: ctx.auth });
      return eventsService.getQuickStats(input.id);
    }),
  setInactive: privateProcedure
    .use(enforcePermission('events', 'delete'))
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const eventsService = new EventsService({ db: ctx.db, auth: ctx.auth });
      return eventsService.setInactive(input.id);
    }),
  create: privateProcedure
    .use(enforcePermission('events', 'create'))
    .input(EventInputSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.$transaction(async tx => {
        const eventsService = new EventsService({ db: tx, auth: ctx.auth });
        return eventsService.create(input);
      });
    }),
  createFromDuplicate: privateProcedure
    .use(enforcePermission('events', 'create'))
    .input(EventDuplicateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.$transaction(async tx => {
        const eventsService = new EventsService({ db: tx, auth: ctx.auth });
        return eventsService.createFromDuplicate(input);
      });
    }),
  update: privateProcedure
    .use(enforcePermission('events', 'update'))
    .input(EventUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const eventsService = new EventsService({ db: ctx.db, auth: ctx.auth });
      return eventsService.update(input);
    }),
  getCustomGuestCategories: privateProcedure
    .use(enforcePermission('events', 'read'))
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      const eventsService = new EventsService({ db: ctx.db, auth: ctx.auth });
      return eventsService.getCustomGuestCategories(input.eventId);
    }),
  createCustomGuestCategory: privateProcedure
    .use(enforcePermission('events', 'update'))
    .input(
      z.object({
        eventId: z.string(),
        name: z.string().min(1).max(100),
        color: z.string().min(1).max(100).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const eventsService = new EventsService({ db: ctx.db, auth: ctx.auth });
      return eventsService.createCustomGuestCategory(input.eventId, input.name, input.color);
    }),
  createRequiredGuestConfirmation: privateProcedure
    .use(enforcePermission('events', 'update'))
    .input(
      z.object({
        eventId: z.string(),
        label: z.string(),
        bestWayToAsk: z.string().optional(),
        options: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const eventsService = new EventsService({ db: ctx.db, auth: ctx.auth });
      return eventsService.createRequiredGuestConfirmation(
        input.eventId,
        input.label,
        input.bestWayToAsk,
        input.options
      );
    }),
});
