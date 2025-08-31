import { z } from 'zod';

export const ListEventsSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(50).default(20),
  search: z.string().optional(),
  includeInactive: z.boolean().optional().default(false),
});

export type ListEventsParams = z.infer<typeof ListEventsSchema>;
