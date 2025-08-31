import { z } from 'zod';

export const EventQuestionsListSchema = z.object({
  eventId: z.string(),
});

export type EventQuestionsListParams = z.infer<typeof EventQuestionsListSchema>;
