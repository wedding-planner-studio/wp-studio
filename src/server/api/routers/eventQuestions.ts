import { z } from 'zod';
import { createTRPCRouter, enforcePermission, privateProcedure } from '@/server/api/trpc';
import { EventQuestionsService } from '@/server/services/events-questions/event-questions.service';
import {
  EventQuestionsCreateSchema,
  EventQuestionsUpdateSchema,
} from '@/server/services/events-questions/schema/event-questions-write.schema';
import { EventQuestionsListSchema } from '@/server/services/events-questions/schema/event-questions-read.schema';

export const eventQuestionsRouter = createTRPCRouter({
  getAll: privateProcedure
    .use(enforcePermission('eventQuestions', 'read'))
    .input(EventQuestionsListSchema)
    .query(async ({ ctx, input }) => {
      const eventQuestionsService = new EventQuestionsService({
        db: ctx.db,
        auth: ctx.auth,
      });
      return eventQuestionsService.list(input);
    }),

  update: privateProcedure
    .use(enforcePermission('eventQuestions', 'update'))
    .input(EventQuestionsUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const eventQuestionsService = new EventQuestionsService({
        db: ctx.db,
        auth: ctx.auth,
      });
      return eventQuestionsService.update(input);
    }),

  setInactive: privateProcedure
    .use(enforcePermission('eventQuestions', 'delete'))
    .input(
      z.object({
        questionId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { questionId } = input;
      const eventQuestionsService = new EventQuestionsService({
        db: ctx.db,
        auth: ctx.auth,
      });
      return eventQuestionsService.setInactive(questionId);
    }),
  create: privateProcedure
    .use(enforcePermission('eventQuestions', 'create'))
    .input(EventQuestionsCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const eventQuestionsService = new EventQuestionsService({
        db: ctx.db,
        auth: ctx.auth,
      });
      return eventQuestionsService.create(input);
    }),
});
