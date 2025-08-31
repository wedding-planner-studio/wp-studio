import { z } from 'zod';

export const GuestsListSchema = z.object({
  eventId: z.string(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).default(20),
  search: z.string().optional(),
  includeInactive: z.boolean().optional().default(false),
  rsvpStatus: z.enum(['CONFIRMED', 'PENDING', 'DECLINED']).optional(),
  includeAdditionalGuests: z.boolean().optional().default(false),
});

export const GuestsByIdsSchema = z.object({
  eventId: z.string(),
  guestIds: z.array(z.string()),
});

export const CheckPhoneNumbersSchema = z.object({
  eventId: z.string(),
  phoneNumbers: z.array(z.string()),
});

export type GuestsListParams = z.infer<typeof GuestsListSchema>;
export type GuestsByIdsParams = z.infer<typeof GuestsByIdsSchema>;
export type CheckPhoneNumbersParams = z.infer<typeof CheckPhoneNumbersSchema>;
