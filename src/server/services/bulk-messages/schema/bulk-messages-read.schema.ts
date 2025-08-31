import { z } from 'zod';

export const ListBulkMessagesSchema = z.object({
  eventId: z.string(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(50).default(20),
  search: z.string().optional(),
  status: z.enum(['CREATED', 'SENDING', 'COMPLETED']).optional(),
});

export const GetDeliveryStatsByIdsSchema = z.object({
  ids: z.array(z.string()),
});

export type ListBulkMessagesParams = z.infer<typeof ListBulkMessagesSchema>;
export type GetDeliveryStatsByIdsParams = z.infer<typeof GetDeliveryStatsByIdsSchema>;
