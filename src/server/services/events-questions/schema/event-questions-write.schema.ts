import { QuestionCategory, QuestionStatus } from '@prisma/client';
import { z } from 'zod';

export const EventQuestionsCreateSchema = z.object({
  eventId: z.string(),
  question: z.string(),
  answer: z.string().optional(),
  category: z.nativeEnum(QuestionCategory).optional(),
});

export const EventQuestionsUpdateSchema = EventQuestionsCreateSchema.partial().extend({
  questionId: z.string(),
  status: z.nativeEnum(QuestionStatus).optional(),
});

export type EventQuestionsUpdateParams = z.infer<typeof EventQuestionsUpdateSchema>;

export type EventQuestionsCreateParams = z.infer<typeof EventQuestionsCreateSchema>;
